// app/api/iap/verify/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { createCouponsTx } from "@/lib/coupons";

export const runtime = "nodejs";

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// 쿠폰 수량 매핑 (checkout/route.ts 와 동일하게 유지)
const AMOUNT_TO_COUPON_QTY: Record<string, number> = {
  "3": 2,
  "5": 4,
};

// Google Play Developer API로 구매 토큰 검증
async function verifyGooglePurchase(
  purchaseToken: string,
  productId: string
): Promise<boolean> {
  try {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string),
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const client = await auth.getClient();
    const packageName = process.env.ANDROID_PACKAGE_NAME as string; // 예: com.manylangs.app

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;
    const res = await client.request({ url });
    const data = res.data as any;

    // purchaseState 0 = 구매 완료
    return data?.purchaseState === 0;
  } catch (e) {
    console.error("Google IAP verify error:", e);
    return false;
  }
}

export async function POST(req: Request) {
  /* 1. 인증 */
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* 2. Body 파싱 */
  let purchaseToken: string;
  let amount: string;
  let productId: string;

  try {
    const body = await req.json();
    purchaseToken = body.purchaseToken;
    amount = body.amount;
    // Android에서 SKU 이름 그대로 넘어오거나, amount로 매핑
    productId = body.productId ?? `coupon_pack_${amount}`;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!purchaseToken || !amount) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const qty = AMOUNT_TO_COUPON_QTY[amount];
  if (!qty) {
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  }

  /* 3. 중복 처리 방지 (같은 purchaseToken 두 번 처리 안 함) */
  const tokenRef = db.collection("iapPurchases").doc(purchaseToken);
  const tokenSnap = await tokenRef.get();
  if (tokenSnap.exists) {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  /* 4. Google Play 검증 */
  const isValid = await verifyGooglePurchase(purchaseToken, productId);
  if (!isValid) {
    return NextResponse.json({ error: "invalid_purchase" }, { status: 400 });
  }

  /* 5. 쿠폰 발급 (Firestore 트랜잭션) */
  try {
    await db.runTransaction(async (tx) => {
      // 중복 방지 재확인
      const snap = await tx.get(tokenRef);
      if (snap.exists) throw new Error("ALREADY_PROCESSED");

      // 쿠폰 생성
      createCouponsTx(tx, userId, qty, purchaseToken, null);

      // 구매 기록 저장
      tx.set(tokenRef, {
        purchaseToken,
        userId,
        amount,
        productId,
        qty,
        processedAt: serverTimestamp(),
      });
    });
  } catch (e: any) {
    if (e?.message === "ALREADY_PROCESSED") {
      return NextResponse.json({ error: "already_processed" }, { status: 409 });
    }
    return NextResponse.json({ error: "transaction_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, qty }, { status: 200 });
}