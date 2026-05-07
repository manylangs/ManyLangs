// app/api/iap/google/verify/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { createCouponsTx } from "@/lib/coupons";

export const runtime = "nodejs";

const serverTimestamp =
  admin.firestore.FieldValue.serverTimestamp;

// Google Play 상품 ↔ 쿠폰 수량
const GOOGLE_PRODUCT_COUPON_QTY: Record<
  string,
  number
> = {
  coupon_pack_2: 2,
  coupon_pack_4: 4,
};

// Google Play purchase 검증
async function verifyGooglePurchase(
  purchaseToken: string,
  productId: string
): Promise<boolean> {
  try {
    const { GoogleAuth } = await import(
      "google-auth-library"
    );

    const auth = new GoogleAuth({
      credentials: JSON.parse(
        process.env
          .GOOGLE_SERVICE_ACCOUNT_JSON as string
      ),
      scopes: [
        "https://www.googleapis.com/auth/androidpublisher",
      ],
    });

    const client = await auth.getClient();

    const packageName =
      process.env.ANDROID_PACKAGE_NAME as string;

    const url =
      `https://androidpublisher.googleapis.com/` +
      `androidpublisher/v3/applications/` +
      `${packageName}/purchases/products/` +
      `${productId}/tokens/${purchaseToken}`;

    const res = await client.request({
      url,
    });

    const data = res.data as any;

    // purchaseState:
    // 0 = purchased
    return data?.purchaseState === 0;

  } catch (e) {
    console.error(
      "[GOOGLE VERIFY ERROR]",
      e
    );

    return false;
  }
}

export async function POST(req: Request) {

  // 1. Clerk 인증
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  // 2. body parsing
  let purchaseToken: string;
  let productId: string;

  try {

    const body = await req.json();

    purchaseToken = body.purchaseToken;
    productId = body.productId;

  } catch {
    return NextResponse.json(
      { error: "invalid_body" },
      { status: 400 }
    );
  }

  // 3. 필수값 체크
  if (!purchaseToken || !productId) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 }
    );
  }

  // 4. 상품 검증
  const qty =
    GOOGLE_PRODUCT_COUPON_QTY[productId];

  if (!qty) {
    return NextResponse.json(
      { error: "invalid_product" },
      { status: 400 }
    );
  }

  // 5. 중복 처리 방지
  const purchaseRef = db
    .collection("iapPurchases")
    .doc(purchaseToken);

  const purchaseSnap =
    await purchaseRef.get();

  if (purchaseSnap.exists) {
    return NextResponse.json(
      { error: "already_processed" },
      { status: 409 }
    );
  }

  // 6. Google Play 검증
  const isValid =
    await verifyGooglePurchase(
      purchaseToken,
      productId
    );

  if (!isValid) {
    return NextResponse.json(
      { error: "invalid_purchase" },
      { status: 400 }
    );
  }

  // 7. 쿠폰 지급 transaction
  try {

    await db.runTransaction(
      async (tx) => {

        // 중복 재확인
        const snap =
          await tx.get(purchaseRef);

        if (snap.exists) {
          throw new Error(
            "ALREADY_PROCESSED"
          );
        }

        // 공통 coupon 지급
        const coupons =
          createCouponsTx(
            tx,
            userId,
            qty,
            purchaseToken,
            null
          );

        // purchase 기록
        tx.set(purchaseRef, {
          provider: "google_play",
          purchaseToken,
          productId,
          qty,
          userId,
          coupons,
          processedAt:
            serverTimestamp(),
        });
      }
    );

  } catch (e: any) {

    console.error(
      "[GOOGLE IAP TX ERROR]",
      e
    );

    if (
      e?.message ===
      "ALREADY_PROCESSED"
    ) {
      return NextResponse.json(
        {
          error: "already_processed",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "transaction_failed" },
      { status: 500 }
    );
  }

  // 8. success
  return NextResponse.json(
    {
      success: true,
      qty,
    },
    { status: 200 }
  );
}