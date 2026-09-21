const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require('nodemailer');
const logger = require('firebase-functions/logger');
const { GoogleGenAI } = require("@google/genai");
const { RING_SPEC_SCHEMA, SYSTEM_INSTRUCTION, sanitiseSpec } = require("./ring-schema");
const { pickModelChain } = require("./model-picker");
const {
  extractWithFailover,
  describeAttempts,
} = require("./resilient-extract");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

// --- Configuration Setup (Reads from .env/.env.yaml) ---
const transporter = nodemailer.createTransport({
    // IMPORTANT: Check your .env/.env.yaml for MAIL_USER and MAIL_PASS
    service: 'gmail', 
    auth: {
        user: process.env.MAIL_USER, 
        pass: process.env.MAIL_PASS 
    }
});

exports.requestDemo = onCall(async (request) => {
    // request.data is the payload sent from the client
    const data = request.data; 

    // 1. Basic Input Validation
    if (!data.email || !data.fullName || !data.company) {
        logger.error("Demo request validation failed: Missing fields.", { data });
        return { 
            status: 'error', 
            message: 'Missing required fields: email, full name, or company.'
        };
    }

    // 2. Email Content Construction
    const emailHtml = `
        <h3>New Demo Request for Wireframe Studio</h3>
        <p><strong>From:</strong> ${data.fullName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Company:</strong> ${data.company}</p>
        <p><strong>Website:</strong> ${data.website || 'N/A'}</p>
        <p><strong>Team Size:</strong> ${data.teamSize}</p>
        <p><strong>Use Case:</strong> ${data.useCase}</p>
        <p><strong>Demo Preparation Notes:</strong></p>
        <p style="white-space: pre-wrap; padding: 10px; border: 1px solid #ccc;">${data.message}</p>
        <hr>
        <p>Submitted by: ${request.auth ? `User ID ${request.auth.uid}` : 'Public User'}</p>
    `;

    // 3. Define Mail Options
    const mailOptions = {
        from: `Wireframe Demo Bot <${process.env.MAIL_USER}>`, 
        to: 'animeshmittal1911@gmail.com', // <-- DOUBLE-CHECK THIS EMAIL ADDRESS
        subject: `[DEMO REQUEST] New Lead: ${data.company}`,
        html: emailHtml,
    };

    // 4. Send the Email
    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Demo request successfully emailed from ${data.email}`, { structured: true });
        
        return { status: 'success', message: 'Request received.' };
    } catch (error) {
        // Log the actual Nodemailer error for debugging in the Cloud Console
        logger.error("Error sending demo request email (Nodemailer error):", error.message);

        return { status: 'error', message: 'Failed to process request due to internal error.' };
    }
});

/**
 * Turns a customer's description into a ring spec the CAD engine can build.
 *
 * Structured output (responseSchema) means the model physically cannot return
 * markdown-fenced or malformed JSON, so the old "strip ``` and hope" parsing is
 * gone. The model itself is discovered at runtime — see model-picker.js.
 *
 * One model answering 503 is not a failure of this endpoint. `gemini-3.8-flash`
 * is the most contended model on the platform and refuses work under load in
 * about three seconds; before A8 that single refusal dropped the customer to a
 * regex parser. The request is now retried once and then walked down the
 * ranked chain the picker already computes. What comes back says which model
 * actually answered, so the card cannot claim 3.8 over a spec 3.6 produced.
 */
exports.extractRingSpec = onCall(
  { secrets: [geminiApiKey], timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    // Signed-in only: this call costs money on every invocation.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to generate a design.");
    }

    const prompt = String(request.data?.prompt || "").trim();
    if (!prompt) {
      throw new HttpsError("invalid-argument", "A description is required.");
    }
    if (prompt.length > 2000) {
      throw new HttpsError("invalid-argument", "Description is too long.");
    }

    const started = Date.now();
    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

    // The ranked chain, not just its head. pickModel already computed six
    // models that pass the policy and discarded five of them; A8 keeps them,
    // because that list is a failover chain we were already paying for.
    let chain;
    try {
      chain = await pickModelChain(ai, logger, "extract");
    } catch (err) {
      logger.error("Model discovery failed", {
        metric: "spec_extraction_outcome",
        outcome: "parser_fallback",
        reason: "discovery",
        uid: request.auth.uid,
        attempts: 0,
        durationMs: Date.now() - started,
        error: err?.message,
        errorName: err?.name,
      });
      throw new HttpsError("unavailable", "Design interpretation is temporarily unavailable.");
    }

    const firstChoice = chain[0];

    const result = await extractWithFailover({
      chain,
      generate: (model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RING_SPEC_SCHEMA,
            temperature: 0.4,
          },
        }),
      parse: (response) => sanitiseSpec(JSON.parse(response.text)),
    });

    const durationMs = Date.now() - started;

    if (result.ok) {
      const failedOver = result.model !== firstChoice;
      // `model` is the model that ACTUALLY answered, not the one we asked
      // first. It used to be the latter, so a spec produced by 3.6 was
      // labelled 3.8 all the way to the customer's card.
      logger.info("Ring spec extracted", {
        metric: "spec_extraction_outcome",
        outcome: "model",
        reason: "ok",
        uid: request.auth.uid,
        model: result.model,
        firstChoice,
        failedOver,
        attempts: result.attempts,
        attemptChain: describeAttempts(result.attemptLog),
        durationMs,
        gemShape: result.spec.gemShape,
        setting: result.spec.setting,
      });

      if (failedOver) {
        // Worth a warning of its own: the customer saw nothing, but the
        // first-choice model was refusing work for the length of a request.
        logger.warn("Spec extraction failed over to a lower-ranked model", {
          uid: request.auth.uid,
          firstChoice,
          answeredBy: result.model,
          attemptChain: describeAttempts(result.attemptLog),
        });
      }

      return {
        spec: result.spec,
        model: result.model,
        source: "ai",
        firstChoice,
        failedOver,
        attempts: result.attempts,
      };
    }

    // Every terminal path below ends with the client running its regex
    // parser. Saying so in one countable field is the whole point: the
    // parser-fallback rate is now a log query, not something discovered in
    // nine months.
    //
    //   metric="spec_extraction_outcome"
    //   parser-fallback rate = count(outcome="parser_fallback") / count(all)
    //
    // `fatal` is counted as a fallback too, because that is what the customer
    // gets. `reason` is what separates our bug from Google's queue.
    const err = result.error;
    logger.error("Ring spec extraction failed", {
      metric: "spec_extraction_outcome",
      outcome: "parser_fallback",
      reason: result.outcome,
      uid: request.auth.uid,
      firstChoice,
      chain: chain.slice(0, 8),
      attempts: result.attempts,
      attemptChain: describeAttempts(result.attemptLog),
      durationMs,
      // NOT `message`. firebase-functions' logger takes its own message as
      // the first argument and writes it to that key, so a structured field
      // called `message` is overwritten by "Ring spec extraction failed" and
      // the real reason never reaches Cloud Logging.
      error: err?.message,
      errorName: err?.name,
      errorStatus: err?.status ?? err?.code ?? null,
    });

    // The client falls back to its own parser, so fail explicitly rather than
    // returning silent defaults that look like a successful interpretation.
    // A schema violation is ours and stays "internal"; a chain that every
    // model refused is "unavailable", which is what actually happened.
    if (result.outcome === "fatal") {
      throw new HttpsError("internal", "Could not interpret that description.");
    }
    throw new HttpsError(
      "unavailable",
      "Every design model is busy right now. Showing a basic reading of your description.",
    );
  }
);
