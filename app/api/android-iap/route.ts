import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      purchaseToken,
      productId,
      uid,
      packageName,
    } = body;

    // ✅ 필수값 체크
    if (!purchaseToken) {
      return NextResponse.json(
        { error: "purchaseToken missing" },
        { status: 400 }
      );
    }

    if (!uid) {
      return NextResponse.json(
        { error: "uid missing" },
        { status: 400 }
      );
    }

    // ✅ 상품 검증
    let couponCount = 0;

    if (productId === "coupon_pack_2") {
      couponCount = 2;
    } else if (productId === "coupon_pack_4") {
      couponCount = 4;
    } else {
      return NextResponse.json(
        { error: "invalid productId" },
        { status: 400 }
      );
    }

    const purchaseRef = db
      .collection("purchases")
      .doc(purchaseToken);

    const userRef = db
      .collection("users")
      .doc(uid);

    // ✅ transaction
    await db.runTransaction(async (tx) => {
      const purchaseSnap = await tx.get(purchaseRef);

      // 🔥 중복 지급 방지
      if (purchaseSnap.exists) {
        throw new Error("ALREADY_PROCESSED");
      }

      const userSnap = await tx.get(userRef);

      const userData = userSnap.data() || {};

      const currentPaidCoupons =
        typeof userData.paidCoupons === "number"
          ? userData.paidCoupons
          : 0;

      // ✅ 유료 쿠폰 증가
      tx.set(
        userRef,
        {
          paidCoupons:
            currentPaidCoupons + couponCount,
        },
        { merge: true }
      );

      // ✅ purchase 저장
      tx.set(purchaseRef, {
        uid,
        provider: "google_play",
        productId,
        couponCount,
        packageName:
          packageName || "com.manylangs.app2",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({
      ok: true,
      couponCount,
    });
  } catch (err: any) {
    console.error("[ANDROID IAP ERROR]", err);

    if (
      err?.message === "ALREADY_PROCESSED"
    ) {
      return NextResponse.json(
        {
          error: "purchase already processed",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "internal error" },
      { status: 500 }
    );
  }
}