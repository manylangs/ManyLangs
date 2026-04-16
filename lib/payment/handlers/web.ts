import type {
  PaymentPrepareResult,
  PaymentExecutionResult,
  StartPaymentParams,
} from "../types";

export async function runWebPayment(
  prepared: PaymentPrepareResult,
  params: StartPaymentParams
): Promise<PaymentExecutionResult> {
  const res = await fetch("/api/payment/stripe/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId: prepared.orderId,
      productId: params.productId,
      userId: params.userId,
      amount: params.amount,
      currency: params.currency,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: params.metadata ?? {},
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create Stripe checkout session");
  }

  const data = await res.json();

  if (data?.url) {
    window.location.href = data.url;
  }

  return {
    platform: "web",
    orderId: prepared.orderId,
    sessionId: data?.sessionId,
    transactionId: data?.paymentIntentId,
    raw: data,
  };
}
