import { detectPaymentPlatform } from "./platform";
import { acquirePaymentLock, createPaymentKey, releasePaymentLock } from "./guards";
import { runAndroidPayment } from "./handlers/android";
import { runIOSPayment } from "./handlers/ios";
import { runWebPayment } from "./handlers/web";
import { verifyPayment } from "./verify";
import type {
  PaymentExecutionResult,
  PaymentPrepareResult,
  StartPaymentParams,
} from "./types";

let isPaymentLoading = false;

export async function startPayment(params: StartPaymentParams) {
  const lockKey = createPaymentKey({
    userId: params.userId,
    productId: params.productId,
  });

  if (isPaymentLoading) {
    return {
      ok: false,
      reason: "PAYMENT_IN_PROGRESS",
    };
  }

  if (!acquirePaymentLock(lockKey)) {
    return {
      ok: false,
      reason: "DUPLICATE_PAYMENT_BLOCKED",
    };
  }

  isPaymentLoading = true;

  try {
    const platform = detectPaymentPlatform();
    const prepared = await preparePayment({
      ...params,
      platform,
    });

    let executionResult: PaymentExecutionResult;

    switch (platform) {
      case "android":
        executionResult = await runAndroidPayment(prepared, params);
        break;

      case "ios":
        executionResult = await runIOSPayment(prepared, params);
        break;

      case "web":
      default:
        executionResult = await runWebPayment(prepared, params);
        break;
    }

    // Web은 redirect 기반이면 여기 verify를 바로 안 태울 수도 있음
    // Android는 즉시 verify 가능
    // iOS는 향후 native callback 연결 후 verify
    const shouldVerifyNow =
      executionResult.platform === "android" ||
      (executionResult.platform === "web" && !!executionResult.sessionId);

    if (shouldVerifyNow) {
      const verified = await verifyPayment({
        platform: executionResult.platform,
        orderId: executionResult.orderId,
        productId: params.productId,
        purchaseToken: executionResult.purchaseToken,
        transactionId: executionResult.transactionId,
        sessionId: executionResult.sessionId,
      });

      return {
        ok: true,
        platform,
        prepared,
        executionResult,
        verified,
      };
    }

    return {
      ok: true,
      platform,
      prepared,
      executionResult,
    };
  } catch (error: any) {
    return {
      ok: false,
      error,
      message: error?.message || "Payment failed",
    };
  } finally {
    isPaymentLoading = false;
    releasePaymentLock(lockKey);
  }
}

async function preparePayment(
  params: StartPaymentParams & { platform: "android" | "ios" | "web" }
): Promise<PaymentPrepareResult> {
  const res = await fetch("/api/payment/prepare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform: params.platform,
      productId: params.productId,
      userId: params.userId,
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata ?? {},
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to prepare payment");
  }

  const data = await res.json();

  return {
    orderId: data.orderId,
    productId: params.productId,
    platform: params.platform,
  };
}
