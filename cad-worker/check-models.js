const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const response = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to get client
    // Actually, we need to access the model manager directly, but the SDK simplifies this:
    console.log("Checking available models...");
    // There isn't a direct "listModels" in the high-level SDK helper, 
    // so we will just try a basic generation to prove access.

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, are you online?");
    console.log("✅ SUCCESS! gemini-1.5-flash is working.");
    console.log("Response:", result.response.text());

  } catch (error) {
    console.error("❌ Model Check Failed:", error.message);
    console.log("Try 'gemini-pro' or 'gemini-1.0-pro' instead.");
  }
}

listModels();