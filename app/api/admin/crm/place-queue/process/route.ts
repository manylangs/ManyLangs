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
    let detailsTotal = 0;
    let websiteTotal = 0;
    let emailTotal = 0;

    while (true) {
      const result = await run(
        "/api/admin/crm/place-queue/details"
      );

      const processed = result?.processed || 0;

      detailsTotal += processed;

      if (processed === 0) {
        break;
      }
    }

    while (true) {
      const result = await run(
        "/api/admin/crm/place-queue/website"
      );

      const processed = result?.processed || 0;

      websiteTotal += processed;

      if (processed === 0) {
        break;
      }
    }

    while (true) {
      const result = await run(
        "/api/admin/crm/place-queue/extract-email"
      );

      const processed = result?.processed || 0;

      emailTotal += processed;

      if (processed === 0) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      detailsProcessed: detailsTotal,
      websiteProcessed: websiteTotal,
      emailProcessed: emailTotal,
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