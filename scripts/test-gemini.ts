// test prepped to fo testing gemini api connection. original location: scripts/test-gemini.ts 
// "test:gemini": "node --env-file=.env.local --import=tsx scripts/test-gemini.ts"

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}

const gemini = new GoogleGenAI({ apiKey });

async function testGemini() {
  const response = await gemini.models.generateContent({
    model: "gemini-3.6-flash",
    contents: "Reply with exactly: Gemini connection successful. muahahaha",
  });

  console.log(response.text);
}

testGemini().catch((error) => {
  console.error("Gemini test failed: blehhhhhhh");
  console.error(error);
  process.exit(1);
});