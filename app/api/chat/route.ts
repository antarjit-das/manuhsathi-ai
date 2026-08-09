import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { geminiClient } from "@/lib/llm/geminiClient";
import { buildPrompt } from "@/lib/prompt/promptBuilder";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userMessage = body.message;
    const sessionId = body.sessionId;

    if (
      typeof userMessage !== "string" ||
      userMessage.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      return NextResponse.json(
        { error: "Session ID is required." },
        { status: 400 },
      );
    }

    const { data: previousMessages, error: messagesError } =
      await supabaseAdmin
        .from("messages")
        .select("role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Failed to fetch messages:", messagesError);

      return NextResponse.json(
        { error: "Failed to retrieve conversation history." },
        { status: 500 },
      );
    }

    const { error: userMessageError } = await supabaseAdmin
      .from("messages")
      .insert({
        message_id: crypto.randomUUID(),
        session_id: sessionId,
        role: "user",
        content: userMessage.trim(),
      });

    if (userMessageError) {
      console.error("Failed to save user message:", userMessageError);

      return NextResponse.json(
        { error: "Failed to save message." },
        { status: 500 },
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
      conversationHistory: previousMessages ?? [],
    });

    const response = await geminiClient.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const answer = response.text;

    const { error: assistantMessageError } = await supabaseAdmin
      .from("messages")
      .insert({
        message_id: crypto.randomUUID(),
        session_id: sessionId,
        role: "assistant",
        content: answer,
      });

    if (assistantMessageError) {
      console.error(
        "Failed to save assistant message:",
        assistantMessageError,
      );

      return NextResponse.json(
        { error: "Failed to save assistant response." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      answer,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while processing your message." },
      { status: 500 },
    );
  }
}