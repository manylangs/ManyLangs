// app/api/coupons/redeem/route.ts

import { NextResponse } from "next/server";
import { COUPONS } from "@/lib/coupons";

type RedeemBody = {
  code: string;
  userId: string;

  // ✅ 새로고침해도 교재명이 안 사라지게 하려면
  // redeem 시점에 "무슨 교재를 열었는지"를 같이 받아서 license에 저장해야 함
  // (클라이언트에서 선택한 값 보내면 됨)
  lang?: string;
  series?: string;
  level?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as RedeemBody;
  const { code, userId, lang, series, level } = body;

  if (!code || !userId) {
    return NextResponse.json({ error: "missing code or userId" }, { status: 400 });
  }

  const coupon = COUPONS.find((c: any) => c.code === code);

  if (!coupon) {
    return NextResponse.json({ error: "invalid coupon" }, { status: 404 });
  }

  if (coupon.used) {
    return NextResponse.json({ error: "coupon already used" }, { status: 400 });
  }

  // ✅ 쿠폰 사용 처리
  coupon.used = true;
  coupon.usedBy = userId;
  coupon.usedAt = Date.now();

  // ⏱ TEST용: 라이선스 10분 (나중에 정책값으로 교체)
  const licenseExpiresAt = Date.now() + 1000 * 60 * 10;

  // ✅ 핵심: "쿠폰"이 아니라 "라이선스"에 교재 식별자 저장
  // - 새로고침해도 교재명이 유지됨
  // - 남은시간 표시도 license.expiresAt 기준으로 가능
  const license = {
    userId,
    source: "coupon" as const,
    code,
    lang: lang ?? null,
    series: series ?? null,
    level: level ?? null,
    expiresAt: licenseExpiresAt,
    issuedAt: Date.now(),
  };

  return NextResponse.json({
    success: true,
    coupon: {
      code: coupon.code,
      used: coupon.used,
      usedAt: coupon.usedAt,
      usedBy: coupon.usedBy,
    },
    license,
  });
}
