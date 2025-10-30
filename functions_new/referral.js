const functions = require('firebase-functions');
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();

// ✅ 새 유저가 가입하면 초대 코드 생성
exports.createReferralCode = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const ref = db.collection('users').doc(user.uid);
  const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  await ref.set({ referral_code: referralCode }, { merge: true });
  console.log(`🎁 Referral code created for ${user.uid}: ${referralCode}`);
});

// ✅ 추천 코드가 입력될 때 보상 처리
exports.applyReferralReward = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { code } = data;
  const db = admin.firestore();
  const inviterSnap = await db.collection('users').where('referral_code', '==', code).limit(1).get();

  if (inviterSnap.empty) throw new functions.https.HttpsError('not-found', 'Invalid referral code');

  const inviter = inviterSnap.docs[0];
  const invitedId = context.auth.uid;

  await inviter.ref.set({
    referral_count: admin.firestore.FieldValue.increment(1)
  }, { merge: true });

  await db.collection('users').doc(invitedId).set({
    referred_by: code,
    referral_bonus: true
  }, { merge: true });

  console.log(`🤝 ${invitedId} used referral code of ${inviter.id}`);
  return { success: true };
});
