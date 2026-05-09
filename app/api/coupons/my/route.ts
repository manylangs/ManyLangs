import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "missing userId" },
      { status: 400 }
    );
  }

  const now = Date.now();

  const snap = await db
    .collection("coupons")
    .where("ownerId", "==", userId)
    .get();

    const coupons = snap.docs.map(doc => {
    const data = doc.data();

    const used = !!data.used;
    const expiresAt = data.expiresAt ?? null;

    let status: "Unused" | "Activated" | "Expired" = "Unused";

    if (used) {
      status = "Activated";
    } else if (expiresAt && expiresAt < now) {
      status = "Expired";
    }

    return {
      code: data.code,
      status,
      issuedAt: data.issuedAt ?? null,
      expiresAt,
      source: data.source ?? null,
      purchaseToken: data.purchaseToken ?? null,
    };
  });

  return NextResponse.json({ coupons });
}