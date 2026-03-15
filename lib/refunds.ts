import { db } from "@/lib/firebaseAdmin";

/*
license revoke
paymentIntent 기준
*/
export async function revokeLicensesByPaymentIntent(paymentIntentId: string) {

  const couponsSnap = await db
    .collection("coupons")
    .where("paymentIntentId", "==", paymentIntentId)
    .get();

  if (couponsSnap.empty) return;

  const codes = couponsSnap.docs.map(d => d.id);

  const batch = db.batch();
  const now = Date.now();

  // Firestore IN limit = 10
  const chunkSize = 10;

  for (let i = 0; i < codes.length; i += chunkSize) {

    const chunk = codes.slice(i, i + chunkSize);

    const snap = await db
      .collectionGroup("items")
      .where("code", "in", chunk)
      .get();

    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        expiresAt: now,
        updatedAt: new Date()
      });
    }
  }

  await batch.commit();
}


/*
coupon reset
refund 시 다시 사용 가능하게
*/
export async function resetCouponsByPaymentIntent(paymentIntentId: string) {

  const snapshot = await db
    .collection("coupons")
    .where("paymentIntentId", "==", paymentIntentId)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();

  for (const doc of snapshot.docs) {

    const data = doc.data();

    // 이미 reset된 경우 skip
    if (!data.used) continue;

    batch.update(doc.ref, {
      used: false,
      usedBy: null,
      usedAt: null,
      usedLang: null,
      usedLevel: null,
      usedSeries: null,
      updatedAt: new Date()
    });
  }

  await batch.commit();
}