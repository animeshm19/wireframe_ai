"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onJobCompleted = exports.onDesignJobCreated = exports.createDesignJob = void 0;
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const tasks_1 = require("@google-cloud/tasks");
// --- DATA CONNECT IMPORT ---
// We import the generated SDK using the new "CadModel" naming convention.
// Ensure you have copied the SDK folder as described in Step 4.
const dataconnect_generated_1 = require("./dataconnect-generated");
admin.initializeApp();
// Set memory to 256MiB as this function is just an orchestrator (lightweight)
(0, v2_1.setGlobalOptions)({ region: "us-central1", memory: "256MiB" });
const tasksClient = new tasks_1.CloudTasksClient();
// --- CONFIGURATION ---
const PROJECT_ID = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
const LOCATION = "us-central1";
const QUEUE_NAME = "cad-generation-queue";
const WORKER_URL = process.env.CAD_WORKER_URL;
const WORKER_SECRET = process.env.CAD_WORKER_SECRET;
// 1. CLIENT API: User starts a job
exports.createDesignJob = (0, https_1.onCall)(async (req) => {
    const uid = req.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Please sign in.");
    const prompt = String(req.data?.prompt ?? "").trim();
    const chatId = req.data?.chatId ? String(req.data.chatId) : null;
    const attachments = req.data?.attachments || [];
    if (!prompt)
        throw new https_1.HttpsError("invalid-argument", "Prompt is required.");
    const now = Date.now();
    // Create the job in Firestore (Hot Storage)
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
// 2. ORCHESTRATOR: Pushes queued jobs to Cloud Tasks
exports.onDesignJobCreated = (0, firestore_1.onDocumentCreated)("designJobs/{jobId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const jobId = snap.id;
    const job = snap.data();
    // Idempotency: Only process if status is 'queued'
    if (job.status !== "queued")
        return;
    if (!WORKER_URL || !PROJECT_ID) {
        console.error("Configuration Error: Missing WORKER_URL or Project ID.");
        await snap.ref.update({ status: "error", error: "System configuration missing." });
        return;
    }
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    const payload = { jobId };
    try {
        // Dispatch to the Worker via Cloud Tasks
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
        await snap.ref.update({
            status: "enqueued",
            updatedAt: Date.now()
        });
        console.log(`Job ${jobId} enqueued successfully.`);
    }
    catch (error) {
        console.error(`Failed to enqueue job ${jobId}:`, error);
        await snap.ref.update({
            status: "error",
            error: "Queue dispatch failed: " + error.message,
            updatedAt: Date.now(),
        });
    }
});
// 3. SYNCER: Saves completed jobs to PostgreSQL (Data Connect)
exports.onJobCompleted = (0, firestore_1.onDocumentUpdated)("designJobs/{jobId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    // Trigger only when status changes to 'done'
    if (before?.status !== "done" && after?.status === "done") {
        const job = after;
        const jobId = event.params.jobId;
        console.log(`Syncing Job ${jobId} to SQL...`);
        try {
            // Use the generated SDK to insert into the 'CadModel' table
            // Note: createdAt/updatedAt are handled automatically by the schema default
            await (0, dataconnect_generated_1.createCadModel)({
                name: `Design ${jobId.slice(0, 8)}`,
                description: job.prompt, // Saving the prompt as the description
                modelData: JSON.stringify(job.spec || {}), // Storing the parametric JSON spec
                isPublic: false,
                ownerId: job.ownerUid,
                projectId: "default-project-id", // Placeholder UUID
                thumbnailUrl: "", // Optional: Add thumbnail logic later
            });
            console.log("SQL Sync Successful");
        }
        catch (err) {
            console.error("SQL Sync Failed:", err);
            // We do NOT throw an error here to prevent infinite retry loops in the trigger
        }
    }
});
