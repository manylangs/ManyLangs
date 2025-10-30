const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.onAuthCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const ref = db.collection('users').doc(user.uid);

  await ref.set({
    subscription_status: 'free',
    free_pronunciation_used: false,
    free_pronunciation_used_at: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`✅ User initialized: ${user.uid}`);
  return true;
});
