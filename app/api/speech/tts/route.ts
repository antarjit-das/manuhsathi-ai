import { NextResponse } from "next/server";
import { buildSpeechText } from "@/lib/speech/tts/cleanTextForSpeech";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.SHUNYALABS_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "SHUNYALABS_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, language, structured } = body;

    // Validate request
    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "Text must be a non-empty string" },
        { status: 400 }
      );
    }

    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Text length must be 4000 characters or less" },
        { status: 400 }
      );
    }

    const validLanguages = ["en", "as", "brx", "ne"];
    if (!language || !validLanguages.includes(language)) {
      return NextResponse.json(
        { error: "Language must be one of: en, as, brx, ne" },
        { status: 400 }
      );
    }

    // Map language to voice
    let selectedVoice = "";
    if (language === "en") {
      selectedVoice = "Nisha";
    } else if (language === "as") {
      selectedVoice = "Anjana";
    } else if (language === "brx") {
      selectedVoice = "Hasina";
    } else if (language === "ne") {
      selectedVoice = "Sapana";
    }

    // Clean text for natural speech
    const speechText = buildSpeechText(text, structured);

    // Setup 120-second timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let shunyaResponse: Response;
    try {
      shunyaResponse = await fetch("https://tts.shunyalabs.ai/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "zero-indic",
          input: speechText,
          voice: selectedVoice,
          language: language,
          response_format: "mp3",
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error("[Shunya TTS Fetch Exception]", fetchErr);
      return NextResponse.json(
        { error: "Failed to connect to Shunya TTS service" },
        { status: 502 }
      );
    }

    clearTimeout(timeoutId);

    if (!shunyaResponse.ok) {
      const errorText = await shunyaResponse.text();
      console.error("[Shunya TTS]", {
        status: shunyaResponse.status,
        body: errorText,
        voice: selectedVoice,
        language: language,
        textLength: speechText.length,
      });

      return NextResponse.json(
        {
          error: "Shunya TTS request failed",
          upstreamStatus: shunyaResponse.status,
          details: errorText,
        },
        { status: 502 }
      );
    }

    // Return the binary response directly as ArrayBuffer
    const audioBuffer = await shunyaResponse.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": shunyaResponse.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Unexpected error in TTS route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
