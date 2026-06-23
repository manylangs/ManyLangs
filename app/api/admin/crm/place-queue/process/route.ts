import { NextResponse } from "next/server";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://manylangs.studio";

async function run(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return res.json();
}

export async function GET() {
  try {
    const websiteResult = await run(
      "/api/admin/crm/place-queue/website"
    );

    const emailResult = await run(
      "/api/admin/crm/place-queue/extract-email"
    );

    const websiteProcessed =
      websiteResult?.processed || 0;

    const emailProcessed =
      emailResult?.processed || 0;

    const hasMore =
      websiteProcessed > 0 ||
      emailProcessed > 0;

    return NextResponse.json({
      success: true,
      websiteProcessed,
      emailProcessed,
      hasMore,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}