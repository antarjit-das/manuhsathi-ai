// STT support for Sarvam.

import { sarvamClient } from "./sarvamClient";

export type SupportedSpeechLanguage =
  | "en-IN"
  | "as-IN"
  | "brx-IN";

export async function transcribeSpeech(
  file: File,
  language?: SupportedSpeechLanguage,
) {
  const response = await sarvamClient.speechToText.transcribe({
    file,
    model: "saaras:v3",
    mode: "transcribe",
    ...(language ? { language_code: language } : {}),
  });

  console.log("Sarvam STT response:", response);

  return {
    transcript: response.transcript,
    languageCode: response.language_code,
    languageProbability: response.language_probability,
    requestId: response.request_id,
  };
}

