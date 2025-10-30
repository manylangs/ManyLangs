import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config(); // ✅ 최상단에서 환경 변수 먼저 불러오기
import speech from "@google-cloud/speech";
import sdk from "microsoft-cognitiveservices-speech-sdk";
import admin from "firebase-admin";

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

// --- Firebase Admin Init ---
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
  console.log("✅ Firebase connected");
} catch (err) {
  console.error("❌ Firebase Init Error:", err.message);
}

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Health Check
app.get("/health", (_, res) => res.json({ ok: true }));

// ✅ Stripe 결제 세션 생성
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "ManyLangs Test Item" },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    });
    res.json({ id: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI Feedback Module Init ---
try {
  const speechClient = new speech.SpeechClient();
  console.log("✅ Google Speech SDK loaded");

  const azureConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_VOICE_KEY,
    process.env.AZURE_REGION
  );
  azureConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
  console.log("✅ Azure Voice SDK loaded");
} catch (err) {
  console.error("❌ AI Module Init Error:", err.message);
}

// --- Compact Feedback Logic (Stateless) ---
function analyzePronunciation(targetSentence, sttResult) {
  const target = targetSentence.toLowerCase().split(" ");
  const spoken = sttResult.toLowerCase().split(" ");
  let matched = 0;

  target.forEach((word, i) => {
    if (spoken[i] && spoken[i] === word) matched++;
  });

  const accuracy = ((matched / target.length) * 100).toFixed(1);
  const toneDeviation = Math.max(0, 100 - accuracy);
  return { accuracy, toneDeviation };
}

app.post("/feedback-test", (req, res) => {
  const result = analyzePronunciation("hello world", "hello word");
  res.json(result);
});

// --- Language Mapping & Auto Routing ---
const languageMap = {
  en: { name: "English", tts: "en-US-JennyNeural", stt: "en-US" },
  es: { name: "Spanish", tts: "es-ES-ElviraNeural", stt: "es-ES" },
  fr: { name: "French", tts: "fr-FR-DeniseNeural", stt: "fr-FR" },
  pt: { name: "Portuguese", tts: "pt-PT-FernandaNeural", stt: "pt-PT" },
  ko: { name: "Korean", tts: "ko-KR-SunHiNeural", stt: "ko-KR" },
  ja: { name: "Japanese", tts: "ja-JP-NanamiNeural", stt: "ja-JP" },
  zh: { name: "Chinese", tts: "zh-CN-XiaoxiaoNeural", stt: "zh-CN" },
};

app.get("/language/:code", (req, res) => {
  const code = req.params.code;
  const lang = languageMap[code];
  if (!lang) return res.status(404).json({ error: "Language not supported" });
  res.json({ code, ...lang });
});

// ✅ 서버 실행 (마지막에만 존재)
app.listen(4242, () => {
  console.log("✅ Stripe server running on http://localhost:4242");
});
