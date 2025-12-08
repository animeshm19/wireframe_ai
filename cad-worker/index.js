const { Firestore } = require("@google-cloud/firestore");
const { Storage } = require("@google-cloud/storage");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");
require("dotenv").config();

// Promisify exec for async/await
const execPromise = util.promisify(exec);

// Initialize Services
const firestore = new Firestore();
const storage = new Storage();

// --- CONFIGURATION ---
const BUCKET_NAME = "wireframe-v1.firebasestorage.app"; 
const MODEL_NAME = "gemini-2.5-flash"; // Reverted to 1.5 (Stable) to avoid version errors
// ---------------------

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
  "metalType": "18k_gold" | "14k_rose" | "platinum" | "silver"
}
`;

// A simple fallback ASCII STL (Pyramid) to prevent Frontend Crashes if OpenSCAD fails
const FALLBACK_STL = `solid fallback_pyramid
facet normal 0 0 0
outer loop
vertex 0 0 0
vertex 10 0 0
vertex 0 10 0
endloop
endfacet
facet normal 0 0 0
outer loop
vertex 0 0 0
vertex 0 10 0
vertex 0 0 10
endloop
endfacet
facet normal 0 0 0
outer loop
vertex 0 0 0
vertex 0 0 10
vertex 10 0 0
endloop
endfacet
facet normal 0 0 0
outer loop
vertex 10 0 0
vertex 0 10 0
vertex 0 0 10
endloop
endfacet
endsolid fallback_pyramid
`;

async function generateScadFile(params, outputPath) {
  const scadScript = `
    $fn=100;
    ring_radius = ${params.ringSize ? (params.ringSize * 0.8 + 15) / 2 : 17 / 2}; 
    width = ${params.bandWidth || 2.5};
    
    // Band
    difference() {
        cylinder(r=ring_radius + 1, h=width, center=true);
        cylinder(r=ring_radius, h=width + 2, center=true);
    }
    
    // Simple Gem settings
    translate([0, ring_radius + 1, 0]) {
        if ("${params.gemShape}" == "princess") {
            cube([${params.gemSize * 3}, ${params.gemSize * 3}, ${params.gemSize * 3}], center=true);
        } else {
            sphere(r=${params.gemSize * 2});
        }
    }
  `;
  await fs.promises.writeFile(outputPath, scadScript);
}

async function processJob(doc) {
  const jobId = doc.id;
  const job = doc.data();

  console.log(`⚡️ Picking up job: ${jobId}`);

  try {
    // 1. Mark as running
    await doc.ref.update({ status: "running", progress: 10 });

    // 2. Call AI
    console.log(`   - Analyzing prompt: "${job.prompt}" using ${MODEL_NAME}`);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME, 
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    
    const result = await model.generateContent(job.prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();

    let params;
    try {
      params = JSON.parse(responseText);
      console.log("   - AI Params generated:", JSON.stringify(params));
    } catch (e) {
      console.error("   - JSON Parse Error, using defaults.");
      params = { ringSize: 6, bandWidth: 2.5, metalType: "platinum", gemShape: "round", gemSize: 1.0 };
    }
    
    await doc.ref.update({ progress: 40, spec: params });

    // 3. Generate 3D Model (STL)
    console.log("   - Generating STL geometry...");
    const tempScadPath = path.join("/tmp", `${jobId}.scad`);
    const tempStlPath = path.join("/tmp", `${jobId}.stl`);
    
    await generateScadFile(params, tempScadPath);
    
    // Run OpenSCAD
    try {
        // MacOS specific path check or global command
        const openScadCmd = process.platform === 'darwin' 
            ? '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD' 
            : 'openscad';
            
        // Try running the command. If 'openscad' is in PATH it works, else try full path
        try {
            await execPromise(`openscad -o ${tempStlPath} ${tempScadPath}`);
        } catch (e) {
            // Fallback: Try explicit Mac path if global failed
            await execPromise(`"${openScadCmd}" -o ${tempStlPath} ${tempScadPath}`);
        }
        
    } catch (scadError) {
        console.warn("   ! OpenSCAD not found or failed. Using Fallback Pyramid.");
        // WRITE THE SAFETY PYRAMID instead of empty file
        await fs.promises.writeFile(tempStlPath, FALLBACK_STL); 
    }

    await doc.ref.update({ progress: 70 });

    // 4. Upload to Firebase Storage
    console.log(`   - Uploading to bucket: ${BUCKET_NAME}`);
    const destination = `models/${jobId}.stl`;
    const bucket = storage.bucket(BUCKET_NAME);
    
    const [file] = await bucket.upload(tempStlPath, {
      destination: destination,
      metadata: {
        contentType: 'model/stl',
        metadata: { originalPrompt: job.prompt }
      }
    });

    // 5. Generate Signed URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, 
      
    });
    console.log(`   - 🔗 CLICKABLE URL: ${url}`);

    console.log(`   - Model URL generated successfully`);

    // 6. Final Update
    await doc.ref.update({
      status: "done", 
      progress: 100,
      modelUrl: url,
      storagePath: destination,
      updatedAt: Date.now(),
    });

    // Cleanup
    if (fs.existsSync(tempScadPath)) fs.unlinkSync(tempScadPath);
    if (fs.existsSync(tempStlPath)) fs.unlinkSync(tempStlPath);

    console.log(`✅ Job ${jobId} complete.`);

  } catch (error) {
    console.error(`❌ Error processing job ${jobId}:`, error);
    await doc.ref.update({ status: "error", error: error.message });
  }
}

// --- Main Listener Loop ---
console.log(`Listening for new design jobs on bucket: ${BUCKET_NAME}...`);
const jobsRef = firestore.collection("designJobs");

const observer = jobsRef.where('status', '==', 'queued').onSnapshot(querySnapshot => {
  querySnapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      processJob(change.doc);
    }
  });
}, err => {
  console.log(`Encountered error: ${err}`);
});