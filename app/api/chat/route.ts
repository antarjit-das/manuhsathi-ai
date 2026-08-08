import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { geminiClient } from "@/lib/llm/geminiClient";
import { buildPrompt } from "@/lib/prompt/promptBuilder";

export async function POST(request: Request) {
  try {
    const body = await request.json();    //reading data from frontend
    const userMessage = body.message;

    if (
      typeof userMessage !== "string" ||
      userMessage.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const { data: schemes, error: schemesError } =
      await supabaseAdmin
        .from("schemes")
        .select(
          `
          name,
          category,
          states_applicable,
          eligibility_summary,
          required_documents,
          application_steps,
          estimated_timeline
          `,
        );

    if (schemesError) {
      console.error("Failed to fetch schemes:", schemesError);

      return NextResponse.json(
        { error: "Failed to retrieve scheme information." },
        { status: 500 },
      );
    }

    const prompt = buildPrompt({
      userMessage: userMessage.trim(),
      schemes: schemes ?? [],
    });

    const response = await geminiClient.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return NextResponse.json({
      answer: response.text,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while processing your message." },
      { status: 500 },
    );
  }
}