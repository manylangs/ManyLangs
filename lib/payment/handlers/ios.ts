import type {
  PaymentPrepareResult,
  PaymentExecutionResult,
  StartPaymentParams,
} from "../types";

export async function runIOSPayment(
  prepared: PaymentPrepareResult,
  params: StartPaymentParams
): Promise<PaymentExecutionResult> {
  const purchaseHandler =
    window.webkit?.messageHandlers?.purchase?.postMessage;

  if (typeof purchaseHandler !== "function") {
    throw new Error("iOS purchase handler is not available");
  }

  const payload = {
    orderId: prepared.orderId,
    productId: params.productId,
    userId: params.userId,
    metadata: params.metadata ?? {},
  };

  purchaseHandler(payload);

  // 현재는 실제 연결 X
  // 이후 네이티브 → JS callback 또는 polling 방식으로 확장
  return {
    platform: "ios",
    orderId: prepared.orderId,
    raw: {
      requested: true,
    },
  };
}
