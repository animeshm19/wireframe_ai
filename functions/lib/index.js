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
exports.onDesignJobCreated = exports.createDesignJob = void 0;
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
admin.initializeApp();
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
function cubeAsciiStl(name = "cube") {
    // minimal ASCII STL placeholder (enough to test downloads end-to-end)
    return `solid ${name}
  facet normal 0 0 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid ${name}
`;
}
exports.createDesignJob = (0, https_1.onCall)(async (req) => {
    const uid = req.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Please sign in.");
    const prompt = String(req.data?.prompt ?? "").trim();
    const chatId = req.data?.chatId ? String(req.data.chatId) : null;
    if (!prompt)
        throw new https_1.HttpsError("invalid-argument", "Prompt is required.");
    if (prompt.length > 2000)
        throw new https_1.HttpsError("invalid-argument", "Prompt too long.");
    const now = Date.now();
    const ref = await admin.firestore().collection("designJobs").add({
        ownerUid: uid,
        chatId,
        prompt,
        status: "queued",
        progress: 0,
        createdAt: now,
        updatedAt: now,
    });
    return { jobId: ref.id };
});
exports.onDesignJobCreated = (0, firestore_1.onDocumentCreated)("designJobs/{jobId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const jobId = snap.id;
    const jobRef = snap.ref;
    // idempotency guard
    const shouldRun = await admin.firestore().runTransaction(async (tx) => {
        const fresh = await tx.get(jobRef);
        const data = fresh.data();
        if (!data)
            return false;
        if (data.status !== "queued")
            return false;
        if (data.workerStartedAt)
            return false;
        tx.set(jobRef, { status: "running", progress: 20, workerStartedAt: Date.now(), updatedAt: Date.now() }, { merge: true });
        return true;
    });
    if (!shouldRun)
        return;
    const job = snap.data();
    const uid = job.ownerUid;
    try {
        const stl = cubeAsciiStl(`wireframe-${jobId}`);
        const stlPath = `users/${uid}/jobs/${jobId}/model.stl`;
        await admin.storage().bucket().file(stlPath).save(stl, { contentType: "model/stl" });
        await jobRef.set({
            status: "done",
            progress: 100,
            outputs: { stlPath },
            updatedAt: Date.now(),
        }, { merge: true });
    }
    catch (e) {
        await jobRef.set({ status: "error", progress: 100, error: String(e?.message ?? e).slice(0, 800), updatedAt: Date.now() }, { merge: true });
    }
});
