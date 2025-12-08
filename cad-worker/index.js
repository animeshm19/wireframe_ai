const express = require("express");
const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateRingSTL } = require("./geometry-engine"); 

const app = express();
app.use(express.json());

// Initialize Services
const firestore = new Firestore();
const storage = new Storage();

// Initialize Gemini with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
You are an expert Jewelry CAD Engineer. 
Your job is to interpret natural language requests into precise manufacturing parameters.
Output ONLY valid JSON. No markdown, no prose.

Schema:
{
  "ringSize": number (US standard, default 6.0),
  "bandWidth": number (mm, default 2.5),
  "bandProfile": "round" | "flat" | "comfort" (default "comfort"),
  "gemShape": "round" | "princess" | "oval" (default "round"),
  "gemSize": number (carats, default 1.0),
  "prongCount": 4 | 6 (default 6),
  "metalType": "18k_gold" | "14k_rose" | "platinum" (default "18k_gold")
}
`;

app.post("/generate", async (req, res) => {
  const { jobId } = req.body;
  const secret = req.header("x-worker-secret");

  // Basic Security Check
  if (secret !== process.env.CAD_WORKER_SECRET) {
    console.error("Unauthorized access attempt");
    return res.status(401).send("Unauthorized");
  }

  console.log(`Starting job processing: ${jobId}`);
  
  try {
    // 1. Fetch Job Data
    const jobRef = firestore.collection("designJobs").doc(jobId);
    const jobSnap = await jobRef.get();
    
    if (!jobSnap.exists) {
      console.error(`Job ${jobId} not found`);
      return res.status(404).send("Job not found");
    }
    
    const job = jobSnap.data();
    const uid = job.ownerUid;
    // Use the bucket name from env var
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET; 

    // Update status to Running
    await jobRef.update({ status: "running", progress: 10 });

    // 2. AI AGENT: Interpret Parameters
    console.log("Calling Gemini AI...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_INSTRUCTION });
    const result = await model.generateContent(job.prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    
    let params;
    try {
      params = JSON.parse(responseText);
      console.log("AI Parameters:", params);
    } catch (e) {
      console.error("AI JSON Parse Error. Raw text:", responseText);
      // Fallback defaults to prevent crash
      params = { ringSize: 6, bandWidth: 2.5 }; 
    }

    await jobRef.update({ 
      status: "running", 
      progress: 40,
      spec: params 
    });

    // 3. ENGINEERING: Generate Geometry
    console.log("Generating Geometry...");
    // generateRingSTL comes from your geometry-engine.js file
    const stlBuffer = generateRingSTL(params);
    
    await jobRef.update({ status: "running", progress: 70 });

    // 4. STORAGE: Upload Files
    console.log(`Uploading to bucket: ${bucketName}`);
    const bucket = storage.bucket(bucketName);
    
    const stlPath = `users/${uid}/jobs/${jobId}/model.stl`;
    const jsonPath = `users/${uid}/jobs/${jobId}/specs.json`;

    await Promise.all([
      bucket.file(stlPath).save(stlBuffer, { contentType: "model/stl" }),
      bucket.file(jsonPath).save(JSON.stringify(params, null, 2), { contentType: "application/json" }),
    ]);

    // 5. FINISH
    console.log("Job Complete.");
    await jobRef.update({
      status: "done",
      progress: 100,
      outputs: { stlPath, jsonPath },
      updatedAt: Date.now()
    });

    res.json({ success: true, jobId });

  } catch (e) {
    console.error("Worker Error:", e);
    // Try to update Firestore with the error
    try {
      await firestore.collection("designJobs").doc(jobId).update({
        status: "error",
        error: e.message,
        updatedAt: Date.now()
      });
    } catch (dbError) {
      console.error("Failed to write error to Firestore:", dbError);
    }
    
    res.status(500).json({ error: e.message });
  }
});

// --- THIS WAS MISSING ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`CAD Worker listening on port ${port}`);
});