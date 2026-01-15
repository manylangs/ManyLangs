// app/api/coupons/redeem/route.ts

import { NextResponse } from "next/server";
import { COUPONS } from "@/lib/coupons";

export async function POST(req: Request) {
  const { code, userId } = await req.json();

  if (!code || !userId) {
    return NextResponse.json(
      { error: "missing code or userId" },
      { status: 400 }
    );
  }

  const coupon = COUPONS.find(c => c.code === code);

  if (!coupon) {
    return NextResponse.json({ error: "invalid coupon" }, { status: 404 });
  }

  if (coupon.used) {
    return NextResponse.json(
      { error: "coupon already used" },
      { status: 400 }
    );
  }

  // ✅ 사용 처리 (입력 시점)
  coupon.used = true;
  coupon.usedBy = userId;
  coupon.usedAt = Date.now();

  // ✅ 라이선스 생성 (30일)
  const licenseExpiresAt =
    Date.now() + 1000 * 60 * 60 * 24 * 30;

  return NextResponse.json({
    success: true,
    licensed: true,
    expiresAt: licenseExpiresAt,
  });
}
