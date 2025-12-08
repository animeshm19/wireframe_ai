// cad-worker/test-trigger.js
const { Firestore } = require("@google-cloud/firestore");
require('dotenv').config();

const firestore = new Firestore();

async function test() {
  console.log("🔥 Creating a fake job to wake up the worker...");
  
  try {
    const res = await firestore.collection("designJobs").add({
      prompt: "TEST_TRIGGER: Silver ring",
      status: "queued",
      ownerUid: "TEST_USER",
      createdAt: Date.now()
    });
    console.log(`✅ Job created with ID: ${res.id}`);
    console.log("👉 Check your 'node index.js' terminal now. Did it react?");
  } catch (e) {
    console.error("❌ Failed to write to Firestore:", e);
    console.log("💡 Check your service-account.json and GOOGLE_APPLICATION_CREDENTIALS in .env");
  }
}

test();