import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/aws/ses";

export async function GET() {
  try {
    await sendEmail(
      "help.manylangs@gmail.com",
      "ManyLangs SES Test",
      "SES connection test successful."
    );

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}