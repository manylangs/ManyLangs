import { NextResponse } from "next/server";
import { extractEmails } from "@/src/services/email_extractor";

export async function POST(req: Request) {
  const body = await req.json();

  const emails = await extractEmails(body.url);

  return NextResponse.json({
    success: true,
    emails,
  });
}
