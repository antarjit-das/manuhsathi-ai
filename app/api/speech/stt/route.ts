import { NextResponse } from "next/server";
import { transcribeSpeech } from "@/lib/speech/sarvamStt";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const audio = formData.get("audio");
    const language = formData.get("language");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 },
      );
    }

    const result = await transcribeSpeech(
      audio,
      language === "en-IN" ||
        language === "as-IN" ||
        language === "brx-IN"
        ? language
        : undefined,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sarvam STT error:", error);

    return NextResponse.json(
      {
        error: "Speech recognition failed",
      },
      { status: 500 },
    );
  }
}
