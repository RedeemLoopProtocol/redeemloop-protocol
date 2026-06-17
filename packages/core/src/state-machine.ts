import type { PaymentIntentStatus, RedeemLoopPaymentIntent } from "./types.js";

export const paymentIntentTransitions: Readonly<Record<PaymentIntentStatus, readonly PaymentIntentStatus[]>> = {
  created: ["wallet_connected", "transfer_requested", "expired", "failed", "cancelled", "manual_review"],
  wallet_connected: ["asset_selected", "transfer_requested", "expired", "failed", "cancelled", "manual_review"],
  asset_selected: ["transfer_requested", "expired", "failed", "cancelled", "manual_review"],
  transfer_requested: ["broadcasted", "seen", "expired", "failed", "cancelled", "manual_review"],
  broadcasted: ["seen", "expired", "failed", "cancelled", "manual_review"],
  seen: ["confirmed", "expired", "failed", "cancelled", "manual_review"],
  confirmed: ["paid", "manual_review"],
  paid: [],
  expired: [],
  failed: [],
  cancelled: [],
  manual_review: ["failed", "cancelled", "confirmed", "paid"],
};

export function canTransition(from: PaymentIntentStatus, to: PaymentIntentStatus): boolean {
  return paymentIntentTransitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: PaymentIntentStatus, to: PaymentIntentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid PaymentIntent transition: ${from} -> ${to}`);
  }
}

export function transitionPaymentIntent(
  intent: RedeemLoopPaymentIntent,
  status: PaymentIntentStatus,
  now = new Date(),
): RedeemLoopPaymentIntent {
  assertTransition(intent.status, status);
  return {
    ...intent,
    status,
    updatedAt: now.toISOString(),
  };
}

export function isTerminalPaymentIntentStatus(status: PaymentIntentStatus): boolean {
  return paymentIntentTransitions[status].length === 0;
}

export function isIncompletePaymentIntentStatus(status: PaymentIntentStatus): boolean {
  return !isTerminalPaymentIntentStatus(status) && status !== "confirmed";
}
