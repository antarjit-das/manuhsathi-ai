//basically saying to Connect to THIS Gemini project using THIS secret credentials from env

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}

export const geminiClient = new GoogleGenAI({
  apiKey,
});