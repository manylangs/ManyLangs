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

    console.log(
        "[GOOGLE VERIFY] START VERIFY",
        {
            productId,
            purchaseToken,
        }
    );

    try {

        console.log(
            "[GOOGLE VERIFY] ENV CHECK",
            {
                hasServiceAccount:
                    !!process.env
                        .GOOGLE_SERVICE_ACCOUNT_JSON,
                packageName:
                    process.env
                        .ANDROID_PACKAGE_NAME,
            }
        );

        const { GoogleAuth } =
            await import(
                "google-auth-library"
            );

        const rawServiceAccount =
            process.env
                .GOOGLE_SERVICE_ACCOUNT_JSON;

        console.log(
            "[GOOGLE VERIFY SERVICE ACCOUNT LENGTH]",
            rawServiceAccount?.length
        );

        console.log(
            "[GOOGLE VERIFY SERVICE ACCOUNT START]",
            rawServiceAccount?.slice(0, 50)
        );

        if (!rawServiceAccount) {

            console.error(
                "[GOOGLE VERIFY ERROR] GOOGLE_SERVICE_ACCOUNT_JSON missing"
            );

            return false;
        }

        const credentials =
            JSON.parse(rawServiceAccount);

        if (!rawServiceAccount) {

            console.error(
                "[GOOGLE VERIFY ERROR] GOOGLE_SERVICE_ACCOUNT_JSON missing"
            );

            return false;
        }

        const authClient =
            new GoogleAuth({
                credentials,
                scopes: [
                    "https://www.googleapis.com/auth/androidpublisher",
                ],
            });

        const client =
            await authClient.getClient();

        const packageName =
            process.env
                .ANDROID_PACKAGE_NAME;

        if (!packageName) {

            console.error(
                "[GOOGLE VERIFY ERROR] ANDROID_PACKAGE_NAME missing"
            );

            return false;
        }

        const url =
            `https://androidpublisher.googleapis.com/` +
            `androidpublisher/v3/applications/` +
            `${packageName}/purchases/products/` +
            `${productId}/tokens/${purchaseToken}`;

        console.log(
            "[GOOGLE VERIFY] REQUEST URL",
            url
        );

        const res =
            await client.request({
                url,
            });

        const data =
            res.data as any;

        console.log(
            "[GOOGLE VERIFY RAW DATA]",
            JSON.stringify(data)
        );

        console.log(
            "[GOOGLE VERIFY] RESPONSE",
            data
        );

        // purchaseState:
        // 0 = purchased
        const isPurchased =
            data?.purchaseState === 0;

        console.log(
            "[GOOGLE VERIFY] RESULT",
            {
                isPurchased,
                purchaseState:
                    data?.purchaseState,
                acknowledgementState:
                    data?.acknowledgementState,
            }
        );

        return isPurchased;

    } catch (e: any) {

        console.error(
            "[GOOGLE VERIFY ERROR FULL]",
            JSON.stringify({
                message: e?.message,
                stack: e?.stack,
                response: e?.response?.data,
            })
        );

        return false;
    }
}

export async function POST(
    req: Request
) {

    console.log(
        "GOOGLE VERIFY START"
    );

    // 1. Clerk 인증
    const { userId } =
        await auth();

    console.log(
        "GOOGLE VERIFY USER",
        userId
    );

    if (!userId) {

        console.error(
            "GOOGLE VERIFY ERROR unauthorized"
        );

        return NextResponse.json(
            {
                error: "unauthorized",
            },
            { status: 401 }
        );
    }

    // 2. body parsing
    let purchaseToken: string;
    let productId: string;

    try {

        const body =
            await req.json();

        console.log(
            "GOOGLE VERIFY BODY",
            body
        );

        purchaseToken =
            body.purchaseToken;

        productId =
            body.productId;

    } catch (e) {

        console.error(
            "GOOGLE VERIFY BODY ERROR",
            e
        );

        return NextResponse.json(
            {
                error: "invalid_body",
            },
            { status: 400 }
        );
    }

    // 3. 필수값 체크
    if (
        !purchaseToken ||
        !productId
    ) {

        console.error(
            "GOOGLE VERIFY MISSING FIELDS",
            {
                purchaseToken,
                productId,
            }
        );

        return NextResponse.json(
            {
                error: "missing_fields",
            },
            { status: 400 }
        );
    }

    // 4. 상품 검증
    const qty =
        GOOGLE_PRODUCT_COUPON_QTY[
        productId
        ];

    console.log(
        "GOOGLE VERIFY PRODUCT",
        {
            productId,
            qty,
        }
    );

    if (!qty) {

        console.error(
            "GOOGLE VERIFY INVALID PRODUCT",
            productId
        );

        return NextResponse.json(
            {
                error: "invalid_product",
            },
            { status: 400 }
        );
    }

    // 5. 중복 처리 방지
    const purchaseRef = db
        .collection("iapPurchases")
        .doc(purchaseToken);

    const purchaseSnap =
        await purchaseRef.get();

    console.log(
        "GOOGLE VERIFY PURCHASE EXISTS",
        purchaseSnap.exists
    );

    if (purchaseSnap.exists) {

        const existing = purchaseSnap.data()!;

        // 다른 userId가 같은 token 재사용 시도 → 차단
        if (existing.userId !== userId) {
            console.error(
                "GOOGLE VERIFY PURCHASE TOKEN USER MISMATCH",
                { existingUserId: existing.userId, requestUserId: userId }
            );
            return NextResponse.json(
                { error: "purchase_token_belongs_to_another_user" },
                { status: 403 }
            );
        }

        // 같은 userId → safe success
        console.log("GOOGLE VERIFY ALREADY_PROCESSED safe success", { purchaseToken, userId });
        return NextResponse.json({
            success: true,
            alreadyProcessed: true,
            productId: existing.productId,
            qty: existing.qty,
            coupons: existing.coupons ?? [],
        });
    }

    // 6. Google Play 검증
    const isValid =
        await verifyGooglePurchase(
            purchaseToken,
            productId
        );

    console.log(
        "GOOGLE VERIFY VALID RESULT",
        isValid
    );

    if (!isValid) {

        console.error(
            "GOOGLE VERIFY INVALID PURCHASE"
        );

        return NextResponse.json(
            {
                error:
                    "invalid_purchase",
            },
            { status: 400 }
        );
    }

    // 7. 쿠폰 지급 transaction
    try {

        console.log(
            "CREATE COUPONS START"
        );

        let alreadyProcessedInTx = false;

        await db.runTransaction(
            async (tx) => {

                // 중복 재확인
                const snap =
                    await tx.get(
                        purchaseRef
                    );

                if (snap.exists) {
                    alreadyProcessedInTx = true;
                    return;
                }

                // 공통 coupon 지급
                const coupons =
                    await createCouponsTx(
                        tx,
                        userId,
                        qty,
                        purchaseToken,
                        null
                    );

                console.log(
                    "CREATE COUPONS RESULT",
                    coupons
                );

                // purchase 기록
                tx.set(
                    purchaseRef,
                    {
                        provider:
                            "google_play",
                        purchaseToken,
                        productId,
                        qty,
                        userId,
                        coupons,
                        processedAt:
                            serverTimestamp(),
                    }
                );
            }
        );

        console.log(
            "CREATE COUPONS SUCCESS"
        );

        if (alreadyProcessedInTx) {
            return NextResponse.json({
                success: true,
                alreadyProcessed: true,
                qty,
            });
        }

    } catch (e: any) {

        console.error(
            "[GOOGLE IAP TX ERROR]",
            e
        );

        return NextResponse.json(
            {
                error:
                    "transaction_failed",
            },
            { status: 500 }
        );
    }

    // 8. success
    console.log(
        "GOOGLE VERIFY SUCCESS"
    );

    return NextResponse.json(
        {
            success: true,
            qty,
        },
        { status: 200 }
    );
}