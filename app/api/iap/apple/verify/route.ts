import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { createCouponsTx } from "@/lib/coupons";

export const runtime = "nodejs";

const serverTimestamp =
    admin.firestore.FieldValue.serverTimestamp;

const APPLE_PRODUCT_COUPON_QTY: Record<
    string,
    number
> = {
    coupon_pack_2: 2,
    coupon_pack_4: 4,
};

export async function POST(
    req: Request
) {

    console.log(
        "APPLE VERIFY START"
    );

    // 1. Clerk auth
    const { userId } =
        await auth();

    console.log(
        "APPLE VERIFY USER",
        userId
    );

    if (!userId) {

        return NextResponse.json(
            {
                error: "unauthorized",
            },
            { status: 401 }
        );
    }

    // 2. body parsing
    let transactionId: string;
    let productId: string;

    try {

        const body =
            await req.json();

        console.log(
            "APPLE VERIFY BODY",
            body
        );

        transactionId =
            body.transactionId;

        productId =
            body.productId;

    } catch (e) {

        console.error(
            "APPLE VERIFY BODY ERROR",
            e
        );

        return NextResponse.json(
            {
                error: "invalid_body",
            },
            { status: 400 }
        );
    }

    // 3. required fields
    if (
        !transactionId ||
        !productId
    ) {

        return NextResponse.json(
            {
                error: "missing_fields",
            },
            { status: 400 }
        );
    }

    // 4. product validation
    const qty =
        APPLE_PRODUCT_COUPON_QTY[
        productId
        ];

    console.log(
        "APPLE VERIFY PRODUCT",
        {
            productId,
            qty,
        }
    );

    if (!qty) {

        return NextResponse.json(
            {
                error: "invalid_product",
            },
            { status: 400 }
        );
    }

    // 5. duplicate protection
    const purchaseRef = db
        .collection("iapPurchases")
        .doc(transactionId);

    const purchaseSnap =
        await purchaseRef.get();

    console.log(
        "APPLE VERIFY PURCHASE EXISTS",
        purchaseSnap.exists
    );

    if (purchaseSnap.exists) {

        const existing =
            purchaseSnap.data()!;

        // 다른 유저 차단
        if (
            existing.userId !== userId
        ) {

            return NextResponse.json(
                {
                    error:
                        "transaction_belongs_to_another_user",
                },
                { status: 403 }
            );
        }

        // 같은 유저 safe success
        return NextResponse.json({
            success: true,
            alreadyProcessed: true,
            productId:
                existing.productId,
            qty:
                existing.qty,
            coupons:
                existing.coupons ?? [],
        });
    }

    // 6. coupon transaction
    try {

        let alreadyProcessedInTx =
            false;

        await db.runTransaction(
            async (tx) => {

                const snap =
                    await tx.get(
                        purchaseRef
                    );

                if (snap.exists) {

                    alreadyProcessedInTx =
                        true;

                    return;
                }

                const coupons =
                    await createCouponsTx(
                        tx,
                        userId,
                        qty,
                        null,
                        null,
                        "apple_app_store",
                        transactionId
                    );

                tx.set(
                    purchaseRef,
                    {
                        provider:
                            "apple_app_store",

                        transactionId,

                        productId,

                        qty,

                        userId,

                        coupons,

                        usedCouponCount: 0,

                        refunded: false,

                        refundDetectedAt: null,

                        processedAt:
                            serverTimestamp(),
                    }
                );
            }
        );

        if (
            alreadyProcessedInTx
        ) {

            return NextResponse.json({
                success: true,
                alreadyProcessed: true,
                qty,
            });
        }

    } catch (e) {

        console.error(
            "APPLE VERIFY TX ERROR",
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

    console.log(
        "APPLE VERIFY SUCCESS"
    );

    return NextResponse.json(
        {
            success: true,
            qty,
        },
        { status: 200 }
    );
}