import type {
  BroadcastedInput,
  BroadcastedResponse,
  CheckBalanceInput,
  CheckBalanceResponse,
  ConnectWalletInput,
  CreateBindingInput,
  CreateEntitlementInput,
  CreateMerchantInput,
  CreateMerchantVaultInput,
  CreatePaymentIntentInput,
  CreateSettlementProofInput,
  CreateWebhookEndpointInput,
  EvmSettlementRecheckInput,
  EvmSettlementRecheckResponse,
  ListBindingsInput,
  ListWebhookDeliveriesInput,
  ListWebhookEventsInput,
  ListMerchantVaultsInput,
  MerchantVault,
  ReceivingAddressRecord,
  RedeemLoopMerchant,
  ReplayWebhookDeliveryInput,
  SelectAssetInput,
  SetReceivingAddressInput,
  SettlementProofResponse,
  SettlementRecheckResponse,
  TestWebhookEndpointResponse,
  TransferRequestInput,
  TransferRequestResponse,
  UpdateEntitlementInput,
  VerifyMerchantDomainInput,
  VerifyMerchantVaultSignatureInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEvent,
} from "./types.js";
import type { Entitlement, RedeemLoopPaymentIntent, RedemptionBinding } from "@redeemloop/core";

export class RedeemLoopClient {
  constructor(private readonly baseUrl: string, private readonly apiKey?: string) {}

  async createMerchant(input: CreateMerchantInput = {}): Promise<RedeemLoopMerchant> {
    return this.request("/v1/merchants", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getMerchant(merchantId: string): Promise<RedeemLoopMerchant> {
    return this.request(`/v1/merchants/${encodeURIComponent(merchantId)}`);
  }

  async verifyMerchantDomain(merchantId: string, input: VerifyMerchantDomainInput): Promise<RedeemLoopMerchant> {
    return this.request(`/v1/merchants/${encodeURIComponent(merchantId)}/domains/verify`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createMerchantVault(input: CreateMerchantVaultInput): Promise<MerchantVault> {
    return this.request("/v1/merchant-vaults", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listMerchantVaults(input: ListMerchantVaultsInput = {}): Promise<MerchantVault[]> {
    return this.request(this.withQuery("/v1/merchant-vaults", input));
  }

  async verifyMerchantVaultSignature(vaultId: string, input: VerifyMerchantVaultSignatureInput): Promise<MerchantVault> {
    return this.request(`/v1/merchant-vaults/${encodeURIComponent(vaultId)}/verify-signature`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createEntitlement(input: CreateEntitlementInput): Promise<Entitlement> {
    return this.request("/v1/entitlements", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getEntitlement(entitlementId: string): Promise<Entitlement> {
    return this.request(`/v1/entitlements/${encodeURIComponent(entitlementId)}`);
  }

  async updateEntitlement(entitlementId: string, input: UpdateEntitlementInput): Promise<Entitlement> {
    return this.request(`/v1/entitlements/${encodeURIComponent(entitlementId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async getBinding(bindingId: string): Promise<RedemptionBinding> {
    return this.request(`/v1/bindings/${encodeURIComponent(bindingId)}`);
  }

  async listBindings(input: ListBindingsInput = {}): Promise<RedemptionBinding[]> {
    return this.request(this.withQuery("/v1/bindings", input));
  }

  async createBinding(input: CreateBindingInput): Promise<RedemptionBinding> {
    return this.request("/v1/bindings", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateBinding(bindingId: string, input: Partial<RedemptionBinding>): Promise<RedemptionBinding> {
    return this.request(`/v1/bindings/${encodeURIComponent(bindingId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async pauseBinding(bindingId: string): Promise<RedemptionBinding> {
    return this.request(`/v1/bindings/${encodeURIComponent(bindingId)}/pause`, { method: "POST" });
  }

  async activateBinding(bindingId: string): Promise<RedemptionBinding> {
    return this.request(`/v1/bindings/${encodeURIComponent(bindingId)}/activate`, { method: "POST" });
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<RedeemLoopPaymentIntent> {
    return this.request("/v1/payment-intents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getPaymentIntent(intentId: string): Promise<RedeemLoopPaymentIntent> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}`);
  }

  async connectWallet(intentId: string, input: ConnectWalletInput): Promise<RedeemLoopPaymentIntent> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}/connect-wallet`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async selectAsset(intentId: string, input: SelectAssetInput): Promise<RedeemLoopPaymentIntent> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}/select-asset`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async checkBalance(intentId: string, input: CheckBalanceInput): Promise<CheckBalanceResponse> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}/check-balance`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async requestTransfer(intentId: string, input: TransferRequestInput = {}): Promise<TransferRequestResponse> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}/transfer-requested`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async markBroadcasted(intentId: string, input: BroadcastedInput): Promise<BroadcastedResponse> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}/broadcasted`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async cancelPaymentIntent(intentId: string): Promise<RedeemLoopPaymentIntent> {
    return this.request(`/v1/payment-intents/${encodeURIComponent(intentId)}/cancel`, { method: "POST" });
  }

  async submitSettlementProof(input: CreateSettlementProofInput): Promise<SettlementProofResponse> {
    return this.request("/v1/settlement/proofs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getSettlementProof(proofId: string): Promise<SettlementProofResponse> {
    return this.request(`/v1/settlement/proofs/${encodeURIComponent(proofId)}`);
  }

  async recheckSettlement(intentId: string): Promise<SettlementRecheckResponse> {
    return this.request(`/v1/settlement/recheck/${encodeURIComponent(intentId)}`, { method: "POST" });
  }

  async recheckEvmSettlement(intentId: string, input: EvmSettlementRecheckInput = {}): Promise<EvmSettlementRecheckResponse> {
    return this.request(`/v1/settlement/evm/recheck/${encodeURIComponent(intentId)}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createWebhookEndpoint(input: CreateWebhookEndpointInput): Promise<WebhookEndpoint> {
    return this.request("/v1/webhook-endpoints", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listWebhookEndpoints(input: { merchantId?: string } = {}): Promise<WebhookEndpoint[]> {
    return this.request(this.withQuery("/v1/webhook-endpoints", input));
  }

  async testWebhookEndpoint(endpointId: string): Promise<TestWebhookEndpointResponse> {
    return this.request(`/v1/webhook-endpoints/${encodeURIComponent(endpointId)}/test`, { method: "POST" });
  }

  async listWebhookEvents(input: ListWebhookEventsInput = {}): Promise<WebhookEvent[]> {
    return this.request(this.withQuery("/v1/webhook-events", input));
  }

  async getWebhookEvent(eventId: string): Promise<WebhookEvent> {
    return this.request(`/v1/webhook-events/${encodeURIComponent(eventId)}`);
  }

  async listWebhookDeliveries(input: ListWebhookDeliveriesInput = {}): Promise<WebhookDelivery[]> {
    return this.request(this.withQuery("/v1/webhook-deliveries", input));
  }

  async getWebhookDelivery(deliveryId: string): Promise<WebhookDelivery> {
    return this.request(`/v1/webhook-deliveries/${encodeURIComponent(deliveryId)}`);
  }

  async attemptWebhookDelivery(deliveryId: string): Promise<WebhookDelivery> {
    return this.request(`/v1/webhook-deliveries/${encodeURIComponent(deliveryId)}/attempt`, { method: "POST" });
  }

  async replayWebhookDelivery(deliveryId: string, input: ReplayWebhookDeliveryInput = {}): Promise<WebhookDelivery> {
    return this.request(`/v1/webhook-deliveries/${encodeURIComponent(deliveryId)}/replay`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async setReceivingAddress(merchantId: string, input: SetReceivingAddressInput): Promise<ReceivingAddressRecord> {
    return this.request(`/v1/merchants/${encodeURIComponent(merchantId)}/receiving-address`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getReceivingAddress(merchantId: string, chainId?: number): Promise<ReceivingAddressRecord> {
    return this.request(this.withQuery(`/v1/merchants/${encodeURIComponent(merchantId)}/receiving-address`, { chainId }));
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body !== undefined) headers.set("content-type", "application/json");
    if (this.apiKey) headers.set("authorization", `Bearer ${this.apiKey}`);
    const res = await fetch(`${this.baseUrl.replace(/\/+$/, "")}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`RedeemLoop API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  private withQuery(path: string, query: object): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        params.set(key, String(value));
      }
    }
    const serialized = params.toString();
    return serialized ? `${path}?${serialized}` : path;
  }
}
