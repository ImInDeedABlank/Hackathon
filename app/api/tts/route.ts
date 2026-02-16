import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true, message: "Server TTS disabled. Use browser speech synthesis." });
}
