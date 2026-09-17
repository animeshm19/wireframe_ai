const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require('nodemailer');
const logger = require('firebase-functions/logger');
const { GoogleGenAI } = require("@google/genai");
const { RING_SPEC_SCHEMA, SYSTEM_INSTRUCTION, sanitiseSpec } = require("./ring-schema");
const { pickModel } = require("./model-picker");

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

    let model;
    try {
      model = await pickModel(ai, logger);
    } catch (err) {
      logger.error("Model discovery failed", { message: err.message });
      throw new HttpsError("unavailable", "Design interpretation is temporarily unavailable.");
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RING_SPEC_SCHEMA,
          temperature: 0.4,
        },
      });

      const spec = sanitiseSpec(JSON.parse(response.text));
      logger.info("Ring spec extracted", {
        uid: request.auth.uid,
        model,
        durationMs: Date.now() - started,
        gemShape: spec.gemShape,
        setting: spec.setting,
      });

      return { spec, model, source: "ai" };
    } catch (err) {
      logger.error("Ring spec extraction failed", {
        uid: request.auth.uid,
        model,
        durationMs: Date.now() - started,
        message: err?.message,
      });
      // The client falls back to its own parser, so fail explicitly rather than
      // returning silent defaults that look like a successful interpretation.
      throw new HttpsError("internal", "Could not interpret that description.");
    }
  }
);
