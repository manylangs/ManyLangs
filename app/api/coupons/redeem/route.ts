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
    return NextResponse.json(
      { error: "invalid coupon" },
      { status: 404 }
    );
  }

  if (coupon.used) {
    return NextResponse.json(
      { error: "coupon already used" },
      { status: 400 }
    );
  }

  // ✅ 쿠폰 사용 처리
  coupon.used = true;
  coupon.usedBy = userId;
  coupon.usedAt = Date.now();

  // ⏱ TEST용: 라이선스 10분
  const licenseExpiresAt =
    Date.now() + 1000 * 60 * 10;

  return NextResponse.json({
    success: true,
    licensed: true,
    expiresAt: licenseExpiresAt,
  });
}
