const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("🔍 Querying Google API for available models...");

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error("❌ API Error:", json.error.message);
        return;
      }
      
      console.log("\n✅ AVAILABLE MODELS (Use one of these names):");
      console.log("---------------------------------------------");
      
      const models = json.models || [];
      const generateModels = models.filter(m => 
        m.supportedGenerationMethods.includes("generateContent")
      );

      generateModels.forEach(m => {
        // Strip 'models/' prefix for easier reading
        const name = m.name.replace('models/', '');
        console.log(`• ${name}`);
      });
      
      console.log("---------------------------------------------");
    } catch (e) {
      console.error("Failed to parse response:", e);
    }
  });
}).on('error', (e) => {
  console.error("Network error:", e);
});