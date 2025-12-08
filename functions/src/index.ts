import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { CloudTasksClient } from "@google-cloud/tasks";

// Data Connect SDK Import
import { createCadModel } from "./dataconnect-generated";

admin.initializeApp();
setGlobalOptions({ region: "us-central1", memory: "256MiB" });

const tasksClient = new CloudTasksClient();

// CONFIGURATION
const PROJECT_ID = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
const LOCATION = "us-central1";
const QUEUE_NAME = "cad-generation-queue";
const WORKER_URL = process.env.CAD_WORKER_URL;
const WORKER_SECRET = process.env.CAD_WORKER_SECRET;

// 1. Client API: User starts a job
export const createDesignJob = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in.");

  const prompt = String(req.data?.prompt ?? "").trim();
  const chatId = req.data?.chatId ? String(req.data.chatId) : null;
  const attachments = req.data?.attachments || [];

  if (!prompt) throw new HttpsError("invalid-argument", "Prompt is required.");

  const now = Date.now();
  const ref = await admin.firestore().collection("designJobs").add({
    ownerUid: uid,
    chatId,
    prompt,
    attachments,
    status: "queued",
    progress: 0,
    createdAt: now,
    updatedAt: now,
    logs: [],
  });

  return { jobId: ref.id };
});

// 2. NEW: Client API to delete a chat history securely
export const deleteChatHistory = onCall(async (req) => {
  const uid = req.auth?.uid;
  const chatId = req.data?.chatId;
  
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in.");
  if (!chatId) throw new HttpsError("invalid-argument", "Chat ID is required.");

  const db = admin.firestore();

  // Find all jobs for this chat owned by this user
  const snapshot = await db.collection("designJobs")
    .where("ownerUid", "==", uid)
    .where("chatId", "==", chatId)
    .get();

  if (snapshot.empty) return { count: 0 };

  // Delete them in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Deleted ${snapshot.size} jobs for chat ${chatId}`);
  return { count: snapshot.size };
});

// 3. Orchestrator
export const onDesignJobCreated = onDocumentCreated("designJobs/{jobId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const jobId = snap.id;
  const job = snap.data() as any;

  if (job.status !== "queued") return;

  if (!WORKER_URL || !PROJECT_ID) {
    console.error("Configuration Error: Missing WORKER_URL or Project ID.");
    await snap.ref.update({ status: "error", error: "System configuration missing." });
    return;
  }

  const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
  const payload = { jobId };

  try {
    await tasksClient.createTask({
      parent: queuePath,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: `${WORKER_URL}/generate`,
          headers: {
            "Content-Type": "application/json",
            "x-worker-secret": WORKER_SECRET || "default-secret",
          },
          body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        },
      },
    });

    await snap.ref.update({ status: "enqueued", updatedAt: Date.now() });

  } catch (error: any) {
    console.error(`Failed to enqueue job ${jobId}:`, error);
    await snap.ref.update({ status: "error", error: "Queue dispatch failed: " + error.message });
  }
});

// 4. Syncer
export const onJobCompleted = onDocumentUpdated("designJobs/{jobId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (before?.status !== "done" && after?.status === "done") {
    const job = after;
    const jobId = event.params.jobId;

    try {
      await createCadModel({
        name: `Design ${jobId.slice(0, 8)}`,
        description: job.prompt,
        modelData: JSON.stringify(job.spec || {}),
        isPublic: false,
        ownerId: job.ownerUid,
        projectId: "default-project-id",
        thumbnailUrl: "",
      });
      console.log("SQL Sync Successful");
    } catch (err) {
      console.error("SQL Sync Failed:", err);
    }
  }
});