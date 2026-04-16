import type {
  PaymentPrepareResult,
  PaymentExecutionResult,
  StartPaymentParams,
} from "../types";

export async function runAndroidPayment(
  prepared: PaymentPrepareResult,
  params: StartPaymentParams
): Promise<PaymentExecutionResult> {
  const bridge = window.AndroidBridge;

  if (!bridge || typeof bridge.purchase !== "function") {
    throw new Error("AndroidBridge.purchase is not available");
  }

  const payload = {
    orderId: prepared.orderId,
    productId: params.productId,
    userId: params.userId,
    metadata: params.metadata ?? {},
  };

  const rawResult = await bridge.purchase(JSON.stringify(payload));
  const parsed =
    typeof rawResult === "string" ? safeJsonParse(rawResult) : rawResult;

  return {
    platform: "android",
    orderId: prepared.orderId,
    productId: params.productId,
    purchaseToken: parsed?.purchaseToken,
    transactionId: parsed?.transactionId,
    raw: parsed,
  } as PaymentExecutionResult & { productId: string };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}