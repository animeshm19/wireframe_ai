const { Firestore } = require("@google-cloud/firestore");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config(); // Ensure you have dotenv installed if using .env files

// Initialize Services
const firestore = new Firestore();
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

async function processJob(doc) {
  const jobId = doc.id;
  const job = doc.data();

  console.log(`⚡️ Picking up job: ${jobId}`);

  try {
    // 1. Mark as running
    await doc.ref.update({ status: "running", progress: 20 });

    // 2. Call AI
    console.log(`   - Analyzing prompt: "${job.prompt}"`);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: SYSTEM_INSTRUCTION 
    });
    const result = await model.generateContent(job.prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();

    let params;
    try {
      params = JSON.parse(responseText);
      console.log("   - AI Params generated:", JSON.stringify(params));
    } catch (e) {
      console.error("   - JSON Parse Error, using defaults.");
      params = { ringSize: 6, bandWidth: 2.5, metalType: "platinum" };
    }

    // 3. Save result (Frontend will react to this)
    await doc.ref.update({
      status: "done",
      progress: 100,
      spec: params,
      updatedAt: Date.now()
    });

    console.log(`✅ Job ${jobId} complete.`);

  } catch (error) {
    console.error(`❌ Error processing job ${jobId}:`, error);
    await doc.ref.update({ status: "error", error: error.message });
  }
}

// --- Main Listener Loop ---
console.log("Listening for new design jobs...");

const jobsRef = firestore.collection("designJobs");

// Watch for any document where status is 'queued'
const observer = jobsRef.where('status', '==', 'queued').onSnapshot(querySnapshot => {
  querySnapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      processJob(change.doc);
    }
  });
}, err => {
  console.log(`Encountered error: ${err}`);
});

// AIzaSyDhDf0ZaUpK_ezcj6HAA_aoxK_EId0omxk