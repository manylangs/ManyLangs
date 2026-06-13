import { NextRequest, NextResponse } from "next/server";
import { collectYouTubeTeachers } from "@/src/services/collectors/youtube_teacher_collector";

export const maxDuration = 300; // Vercel: allow up to 5 min for large collects

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const language: string = (body.language ?? "all").toLowerCase().trim();

    const valid = ["korean", "english", "spanish", "french", "portuguese", "all"];
    if (!valid.includes(language)) {
      return NextResponse.json({ error: `Invalid language: ${language}` }, { status: 400 });
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
    }

    const result = await collectYouTubeTeachers(language);

    return NextResponse.json({ success: true, language, ...result });
  } catch (err: any) {
    console.error("[YOUTUBE COLLECT POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}