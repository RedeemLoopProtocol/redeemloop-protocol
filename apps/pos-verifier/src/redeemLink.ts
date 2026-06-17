import type { PaymentIntentResponse } from "./types";

export function createPaymentLink(intent: PaymentIntentResponse): string {
  const params = new URLSearchParams({
    intentId: intent.intentId,
    bindingId: intent.bindingId,
    orderId: intent.orderId,
  });

  return `redeemloop://pay?${params.toString()}`;
}

export function shortenHash(value: string, visible = 6): string {
  if (value.length <= visible * 2 + 2) return value;
  return `${value.slice(0, visible + 2)}...${value.slice(-visible)}`;
}
