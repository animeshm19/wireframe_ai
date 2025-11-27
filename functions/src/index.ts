import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

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

export const createDesignJob = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in.");

  const prompt = String(req.data?.prompt ?? "").trim();
  const chatId = req.data?.chatId ? String(req.data.chatId) : null;

  if (!prompt) throw new HttpsError("invalid-argument", "Prompt is required.");
  if (prompt.length > 2000) throw new HttpsError("invalid-argument", "Prompt too long.");

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

export const onDesignJobCreated = onDocumentCreated("designJobs/{jobId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const jobId = snap.id;
  const jobRef = snap.ref;

  // idempotency guard
  const shouldRun = await admin.firestore().runTransaction(async (tx) => {
    const fresh = await tx.get(jobRef);
    const data = fresh.data() as any;
    if (!data) return false;
    if (data.status !== "queued") return false;
    if (data.workerStartedAt) return false;

    tx.set(
      jobRef,
      { status: "running", progress: 20, workerStartedAt: Date.now(), updatedAt: Date.now() },
      { merge: true }
    );
    return true;
  });

  if (!shouldRun) return;

  const job = snap.data() as any;
  const uid = job.ownerUid as string;

  try {
    const stl = cubeAsciiStl(`wireframe-${jobId}`);
    const stlPath = `users/${uid}/jobs/${jobId}/model.stl`;

    await admin.storage().bucket().file(stlPath).save(stl, { contentType: "model/stl" });

    await jobRef.set(
      {
        status: "done",
        progress: 100,
        outputs: { stlPath },
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e: any) {
    await jobRef.set(
      { status: "error", progress: 100, error: String(e?.message ?? e).slice(0, 800), updatedAt: Date.now() },
      { merge: true }
    );
  }
});
