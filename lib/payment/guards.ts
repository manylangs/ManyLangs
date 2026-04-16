const activePaymentKeys = new Set<string>();

export function createPaymentKey(params: {
  userId: string;
  productId: string;
}) {
  return `${params.userId}:${params.productId}`;
}

export function acquirePaymentLock(key: string): boolean {
  if (activePaymentKeys.has(key)) {
    return false;
  }
  activePaymentKeys.add(key);
  return true;
}

export function releasePaymentLock(key: string) {
  activePaymentKeys.delete(key);
}
