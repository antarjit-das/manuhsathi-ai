import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function POST() {
  try {
    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .insert({
        session_id: crypto.randomUUID(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create session:", error);

      return NextResponse.json(
        { error: "Failed to create session." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      session,
    });
  } catch (error) {
    console.error("Session API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while creating the session." },
      { status: 500 },
    );
  }
}