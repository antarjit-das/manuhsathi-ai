//for sarvam connection
import { SarvamAIClient } from "sarvamai";

const apiKey = process.env.SARVAM_API_KEY;

if (!apiKey) {
  throw new Error("SARVAM_API_KEY is not configured");
}

export const sarvamClient = new SarvamAIClient({
  apiSubscriptionKey: apiKey,
});
