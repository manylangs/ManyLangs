import { db } from "@/lib/firebaseAdmin";

/*
license revoke (안전 버전)
*/
export async function revokeLicensesByPaymentIntent(paymentIntentId: string) {

  const couponsSnap = await db
    .collection("coupons")
    .where("paymentIntentId", "==", paymentIntentId)
    .get();

  if (couponsSnap.empty) return;

  const batch = db.batch();
  const now = Date.now();

  for (const doc of couponsSnap.docs) {
    const code = doc.id;

    const licSnap = await db
      .collection("licenses")
      .where("code", "==", code)
      .get();

    licSnap.docs.forEach((licDoc) => {
      batch.update(licDoc.ref, {
        expiresAt: now,
        revoked: true,
        updatedAt: new Date(),
      });
    });
  }

  await batch.commit();
}

/*
🔥 쿠폰 삭제 (핵심)
*/
export async function deleteCouponsByPaymentIntent(paymentIntentId: string) {

  const snap = await db
    .collection("coupons")
    .where("paymentIntentId", "==", paymentIntentId)
    .get();

  if (snap.empty) return;

  const batch = db.batch();

  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}