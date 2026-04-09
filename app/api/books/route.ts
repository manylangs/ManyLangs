import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // 🔐 1. 로그인 체크
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  // 📦 2. 요청 파싱
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid body" },
      { status: 400 }
    );
  }

  const { lang, series, level, chapter } = body;

  if (!lang || !series || !level || !chapter) {
    return NextResponse.json(
      { error: "missing params" },
      { status: 400 }
    );
  }

  const chapterId = String(Number(chapter)).padStart(3, "0");

  try {
    // 📁 3. 서버 내부 파일 경로
    const filePath = join(
      process.cwd(),
      "data",
      "books",
      lang,
      series,
      level,
      `${series}_${chapterId}.json`
    );

    // 📖 4. 파일 읽기
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: "file not found" },
      { status: 404 }
    );
  }
}