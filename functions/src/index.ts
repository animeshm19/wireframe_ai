import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import axios from "axios";

admin.initializeApp();
setGlobalOptions({ region: "us-central1", memory: "512MiB" });

// 1. Client-facing API to start a job
export const createDesignJob = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in.");

  const prompt = String(req.data?.prompt ?? "").trim();
  const chatId = req.data?.chatId ? String(req.data.chatId) : null;

  if (!prompt) throw new HttpsError("invalid-argument", "Prompt is required.");

  const now = Date.now();
  const ref = await admin.firestore().collection("designJobs").add({
    ownerUid: uid,
    chatId,
    prompt,
    status: "queued",
    progress: 0,
    createdAt: now,
    updatedAt: now,
    logs: [],
  });

  return { jobId: ref.id };
});

// 2. Background Trigger: Dispatches to the CAD Worker
export const onDesignJobCreated = onDocumentCreated("designJobs/{jobId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const jobId = snap.id;
  const job = snap.data() as any;

  // Idempotency: Don't re-run if already running/done
  if (job.status !== "queued") return;

  // Update status to 'dispatching'
  await snap.ref.update({ 
    status: "dispatching", 
    updatedAt: Date.now() 
  });

  const WORKER_URL = process.env.CAD_WORKER_URL || "http://127.0.0.1:8080"; // Set this in your environment config
  const WORKER_SECRET = process.env.CAD_WORKER_SECRET || "local-dev-secret";

  try {
    // Call the worker service
    await axios.post(
      `${WORKER_URL}/generate`,
      { jobId },
      {
        headers: { "x-worker-secret": WORKER_SECRET },
        timeout: 300000, // 5 minutes timeout for heavy CAD
      }
    );
  } catch (error: any) {
    console.error(`Failed to dispatch job ${jobId}:`, error.message);
    await snap.ref.update({
      status: "error",
      error: "Worker dispatch failed: " + error.message,
      updatedAt: Date.now(),
    });
  }
});