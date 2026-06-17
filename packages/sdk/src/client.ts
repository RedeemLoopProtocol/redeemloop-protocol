import type { Entitlement, RedeemLoopPaymentIntent, RedemptionBinding, VoucherPaymentProof } from "@redeemloop/core";

export class RedeemLoopClient {
  constructor(private readonly baseUrl: string, private readonly apiKey?: string) {}

  async createEntitlement(input: Partial<Entitlement>): Promise<Entitlement> {
    return this.request("/v1/entitlements", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getBinding(bindingId: string): Promise<RedemptionBinding> {
    return this.request(`/v1/bindings/${encodeURIComponent(bindingId)}`);
  }

  async createBinding(input: Partial<RedemptionBinding>): Promise<RedemptionBinding> {
    return this.request("/v1/bindings", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createPaymentIntent(input: Partial<RedeemLoopPaymentIntent>): Promise<RedeemLoopPaymentIntent> {
    return this.request("/v1/payment-intents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getPaymentIntent(intentId: string): Promise<RedeemLoopPaymentIntent> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}`);
  }

  async submitSettlementProof(input: Partial<VoucherPaymentProof>): Promise<VoucherPaymentProof> {
    return this.request("/v1/settlement/proofs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    if (this.apiKey) headers.set("authorization", `Bearer ${this.apiKey}`);
    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`RedeemLoop API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }
}
