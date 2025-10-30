const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

const stripe = new Stripe("sk_test_XXXXXXXXXXXXXXXXXXXXXXXX", {
  apiVersion: "2024-06-20",
});

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "subscription",
    customer_email: data.email,
    line_items: [{ price: data.priceId, quantity: 1 }],
    success_url: "https://manylangs.studio/success",
    cancel_url: "https://manylangs.studio/cancel",
    metadata: { uid },
  });

  await db.collection("users").doc(uid).set(
    { stripe_session_id: session.id, subscription_status: "pending" },
    { merge: true }
  );

  return { url: session.url };
});

exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = "whsec_XXXXXXXXXXXXXXXXXXXXXXXX";

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook 서명 오류:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.metadata.uid;

    await db.collection("users").doc(uid).set(
      {
        subscription_status: "premium",
        stripe_customer_id: session.customer,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  res.json({ received: true });
});


