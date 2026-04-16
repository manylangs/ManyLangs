export interface StartPaymentParams {
  productId: string;
  userId: string;
  amount?: number;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentPrepareResult {
  orderId: string;
  productId: string;
  platform: "android" | "ios" | "web";
}

export interface PaymentExecutionResult {
  platform: "android" | "ios" | "web";
  orderId: string;
  purchaseToken?: string;     // Android
  transactionId?: string;     // iOS / Web
  sessionId?: string;         // Web
  raw?: any;
}

export interface VerifyPaymentPayload {
  platform: "android" | "ios" | "web";
  orderId: string;
  productId: string;
  purchaseToken?: string;
  transactionId?: string;
  sessionId?: string;
  receiptData?: string;
}

declare global {
  interface Window {
    AndroidBridge?: {
      purchase?: (payload: string) => Promise<string> | string;
    };
    webkit?: {
      messageHandlers?: {
        purchase?: {
          postMessage?: (payload: any) => void;
        };
      };
    };
    Stripe?: any;
  }
}
