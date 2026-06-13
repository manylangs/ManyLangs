import { NextResponse } from "next/server";

// POST — 전체 리드 스코어링
export async function POST() {
  try {
    const { execSync } = await import("child_process");

    const result = execSync(
      "python3 src/services/lead_scoring.py",
      { cwd: process.cwd(), encoding: "utf-8" }
    );

    console.log("[SCORE RESULT]", result);

    // 업데이트된 수 파싱
    const match = result.match(/\[SCORED\]\s+(\d+)/);
    const updated = match ? parseInt(match[1]) : 0;

    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    console.error("[LEADS SCORE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
