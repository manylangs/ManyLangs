import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  console.log("IMPORT PLACE:", body);

  return NextResponse.json({
    success: true,
    imported: 1,
  });
}
