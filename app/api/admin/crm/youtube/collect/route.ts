import { NextRequest, NextResponse } from "next/server";
import { collectYouTubeTeachers, youtubeConfigs } from "@/src/services/collectors/youtube_teacher_collector";

export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({
    languages: youtubeConfigs.map((c) => ({
      language: c.language,
      label: c.label,
      flag: c.flag,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const language: string = (body.language ?? "all").toLowerCase().trim();

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
    }

    const validLanguages = [...youtubeConfigs.map((c) => c.language), "all"];
    if (!validLanguages.includes(language)) {
      return NextResponse.json({ error: `Invalid language: ${language}` }, { status: 400 });
    }

    const result = await collectYouTubeTeachers(language);
    return NextResponse.json({ success: true, language, ...result });
  } catch (err: any) {
    console.error("[YOUTUBE COLLECT POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
