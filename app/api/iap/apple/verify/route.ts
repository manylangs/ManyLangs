import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "apple_iap_not_implemented",
    },
    { status: 501 }
  );
}