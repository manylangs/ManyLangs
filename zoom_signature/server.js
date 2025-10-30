import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const { ZOOM_SDK_KEY, ZOOM_SDK_SECRET } = process.env;

function generateSignature(meetingNumber, role) {
  const timestamp = new Date().getTime() - 30000;
  const msg = Buffer.from(
    `${ZOOM_SDK_KEY}${meetingNumber}${timestamp}${role}`
  ).toString("base64");
  const hash = crypto
    .createHmac("sha256", ZOOM_SDK_SECRET)
    .update(msg)
    .digest("base64");
  const signature = Buffer.from(
    `${ZOOM_SDK_KEY}.${meetingNumber}.${timestamp}.${role}.${hash}`
  ).toString("base64");
  return signature;
}

app.post("/zoom-signature", (req, res) => {
  const { meetingNumber, role } = req.body || {};
  if (!meetingNumber)
    return res.status(400).json({ error: "meetingNumber required" });
  try {
    const signature = generateSignature(
      String(meetingNumber),
      Number(role || 0)
    );
    res.json({ signature, sdkKey: ZOOM_SDK_KEY });
  } catch (e) {
    res.status(500).json({ error: "signature_error", detail: String(e) });
  }
});
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

app.listen(4242, () =>
  console.log("✅ Zoom signature server running on http://localhost:4242")
);
