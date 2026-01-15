import { NextResponse } from "next/server";
import { COUPONS } from "@/lib/coupons";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "missing userId" }, { status: 400 });
  }

  const now = Date.now();

  const list = COUPONS.filter(c => c.ownerId === userId).map(c => ({
    code: c.code,
    status: c.used
      ? "Activated"
      : c.expiresAt < now
      ? "Expired"
      : "Unused",
    expiresAt: c.expiresAt,
  }));

  return NextResponse.json({ coupons: list });
}
