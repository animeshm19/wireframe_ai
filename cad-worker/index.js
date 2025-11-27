const express = require("express");
const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");

const app = express();
app.use(express.json({ limit: "1mb" }));

const firestore = new Firestore();
const storage = new Storage();

function cubeAsciiStl(name = "cube") {
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

app.get("/", (_req, res) => res.status(200).send("ok"));

app.post("/generate", async (req, res) => {
  try {
    const secret = req.header("x-worker-secret");
    if (!process.env.CAD_WORKER_SECRET || secret !== process.env.CAD_WORKER_SECRET) {
      return res.status(401).send("Unauthorized");
    }

    const jobId = String(req.body?.jobId ?? "");
    if (!jobId) return res.status(400).send("Missing jobId");

    const jobRef = firestore.collection("designJobs").doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) return res.status(404).send("Job not found");

    const job = snap.data();
    const uid = job.ownerUid;

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return res.status(500).send("Missing FIREBASE_STORAGE_BUCKET");

    await jobRef.set({ status: "running", progress: 35, updatedAt: Date.now() }, { merge: true });

    const stl = cubeAsciiStl(`wireframe-${jobId}`);
    const stlPath = `users/${uid}/jobs/${jobId}/model.stl`;

    await storage.bucket(bucketName).file(stlPath).save(stl, { contentType: "model/stl" });

    await jobRef.set(
      { status: "done", progress: 100, outputs: { stlPath }, updatedAt: Date.now() },
      { merge: true }
    );

    res.json({ ok: true, stlPath });
  } catch (e) {
    console.error(e);
    res.status(500).send(String(e?.message ?? e));
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () => console.log("Worker listening on", port));

