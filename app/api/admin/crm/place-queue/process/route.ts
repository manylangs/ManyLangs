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
    const details = await run(
      "/api/admin/crm/place-queue/details"
    );

    const website = await run(
      "/api/admin/crm/place-queue/website"
    );

    const email = await run(
      "/api/admin/crm/place-queue/extract-email"
    );

    return NextResponse.json({
      success: true,
      details,
      website,
      email,
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