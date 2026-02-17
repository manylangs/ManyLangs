export const PRICE_TO_COUPON_QTY: Record<string, number> = {
  [process.env.STRIPE_PRICE_ID_3 as string]: 2,
  [process.env.STRIPE_PRICE_ID_5 as string]: 4,
  [process.env.STRIPE_PRICE_ID_20 as string]: 20,
  [process.env.STRIPE_PRICE_ID_50 as string]: 60,
  [process.env.STRIPE_PRICE_ID_100 as string]: 150,
};
