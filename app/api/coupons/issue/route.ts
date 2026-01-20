// app/api/coupons/issue/route.ts

import { NextResponse } from "next/server";
import { createCouponsByPrice } from "@/lib/coupons";

export async function POST(req: Request) {
  try {
    const { userId, price } = await req.json();

    if (!userId || !price) {
      return NextResponse.json(
        { error: "missing userId or price" },
        { status: 400 }
      );
    }

    // 가격 → 쿠폰 발급
    const coupons = createCouponsByPrice(userId, Number(price));

    return NextResponse.json({
      success: true,
      qty: coupons.length,
      coupons: coupons.map(c => c.code), // UI 노출용
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "failed to issue coupons" },
      { status: 500 }
    );
  }
}
