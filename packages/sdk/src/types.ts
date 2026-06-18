import type {
  BindingStatus,
  ChainNamespace,
  CommerceTarget,
  Entitlement,
  RedeemLoopPaymentIntent,
  RedemptionBinding,
  VoucherAssetDescriptor,
  VoucherPaymentProof,
} from "@redeemloop/core";

export type { Entitlement, RedeemLoopPaymentIntent, RedemptionBinding, VoucherAssetDescriptor, VoucherPaymentProof };

export interface RedeemLoopMerchant {
  merchantId: string;
  name: string;
  status: "active" | "suspended";
  domains: Array<{ domain: string; verified: boolean; verifiedAt?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMerchantInput {
  merchantId?: string;
  name?: string;
}

export interface VerifyMerchantDomainInput {
  domain: string;
}

export interface MerchantVault {
  vaultId: string;
  merchantId: string;
  chainNamespace: ChainNamespace;
  chainId?: number;
  address: string;
  label?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMerchantVaultInput {
  vaultId?: string;
  merchantId: string;
  chainNamespace: ChainNamespace;
  chainId?: number;
  address: string;
  label?: string;
}

export interface VerifyMerchantVaultSignatureInput {
  signature: string;
  message?: string;
}

export interface ListMerchantVaultsInput {
  merchantId?: string;
}

export interface CreateEntitlementInput extends Partial<Entitlement> {
  merchantId: string;
  name: string;
}

export type UpdateEntitlementInput = Partial<Omit<Entitlement, "entitlementId" | "merchantId">>;

export interface CreateBindingInput extends Partial<RedemptionBinding> {
  merchantId: string;
  entitlementId: string;
  acceptedAssets: VoucherAssetDescriptor[];
  merchantVaults: Record<string, string>;
  commerceTargets?: CommerceTarget[];
  status?: BindingStatus;
}

export interface ListBindingsInput {
  merchantId?: string;
  sku?: string;
}

export interface CreatePaymentIntentInput extends Partial<RedeemLoopPaymentIntent> {
  bindingId: string;
  orderId: string;
  assetId?: string;
}

export interface ConnectWalletInput {
  payerAddress: string;
}

export interface SelectAssetInput {
  assetId?: string;
  contract?: string;
  runeId?: string;
  inscriptionId?: string;
}

export interface CheckBalanceInput {
  payerAddress?: string;
  assetId?: string;
  balance?: string;
}

export interface EvmTransferRequest {
  chainNamespace: "eip155";
  chainId: number;
  assetType: "erc20";
  from?: `0x${string}`;
  to: `0x${string}`;
  contract: `0x${string}`;
  amount: string;
  transaction: {
    chainId: number;
    from?: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value: "0x0";
    functionName: "transfer";
    args: [`0x${string}`, string];
  };
}

export interface BitcoinRunePsbtRequest {
  chainNamespace: "bitcoin" | "fractal";
  network: "mainnet" | "testnet" | "signet" | "regtest" | "fractal-mainnet" | "fractal-testnet";
  assetType: "rune";
  runeId: string;
  from: string;
  to: string;
  amount: string;
  feeRate: number;
  psbtBase64: string;
  inputs: Array<{ txid: string; vout: number; value: number; runeAmount: string }>;
  outputs: Array<{ address: string; runeAmount?: string; role: "merchant" | "change" }>;
  estimatedFee: string;
  alpha: true;
}

export interface CheckBalanceResponse extends RedeemLoopPaymentIntent {
  balanceCheck: {
    chainNamespace: "eip155";
    chainId: number;
    assetType: "erc20";
    account: `0x${string}`;
    contract: `0x${string}`;
    requiredAmount: string;
    call: {
      chainId: number;
      to: `0x${string}`;
      data: `0x${string}`;
      functionName: "balanceOf";
      args: [`0x${string}`];
    };
    providedBalance?: string;
    hasSufficientBalance?: boolean;
    shortfall?: string;
  };
}

export interface TransferRequestInput {
  payerAddress?: string;
  assetId?: string;
}

export interface TransferRequestResponse extends RedeemLoopPaymentIntent {
  transfer: {
    to: string;
    asset: VoucherAssetDescriptor;
    amount: string;
    settlementPolicy: RedeemLoopPaymentIntent["settlementPolicy"];
    evm?: EvmTransferRequest;
    bitcoin?: BitcoinRunePsbtRequest;
  };
}

export interface BroadcastedInput {
  txid: string;
}

export interface BroadcastedResponse extends RedeemLoopPaymentIntent {
  txid: string;
}

export interface CreateSettlementProofInput extends Partial<VoucherPaymentProof> {
  intentId: string;
  txid: string;
  from: string;
}

export interface SettlementProofResponse extends VoucherPaymentProof {
  duplicate?: boolean;
  paymentIntent?: RedeemLoopPaymentIntent;
  commerce?: {
    provider: string;
    orderId: string;
    markedPaid: boolean;
    dryRun: boolean;
    idempotencyKey?: string;
    request?: unknown;
  };
}

export interface SettlementRecheckResponse {
  intentId: string;
  status: RedeemLoopPaymentIntent["status"];
  proofs: VoucherPaymentProof[];
}

export interface EvmSettlementRecheckInput {
  txid?: string;
  from?: string;
  minConfirmations?: number;
  proofId?: string;
}

export interface EvmSettlementRecheckResponse extends SettlementProofResponse {
  trusted: true;
}

export interface RuneSettlementRecheckInput {
  txid?: string;
  from?: string;
  confirmations?: number;
}

export interface RuneSettlementRecheckResponse extends SettlementProofResponse {
  trusted: true;
}

export interface EvmRpcDiagnostic {
  chainId: number;
  name: string;
  status: "ok" | "missing" | "error";
  rpcConfigured: boolean;
  rpcSource?: "EVM_RPC_URLS" | "RPC_URL";
  rpcOrigin?: string;
  latestBlockNumber?: string;
  latencyMs?: number;
  error?: string;
}

export interface EvmRpcDiagnosticsResponse {
  checkedAt: string;
  chains: EvmRpcDiagnostic[];
}

export interface WebhookEndpoint {
  id: string;
  merchantId: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookEndpointInput {
  id?: string;
  merchantId: string;
  url: string;
  secret?: string;
  events?: string[];
  active?: boolean;
}

export interface TestWebhookEndpointResponse {
  endpoint: WebhookEndpoint;
  request: {
    method: "POST";
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
}

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed" | "dead_letter";

export interface WebhookEvent {
  eventId: string;
  merchantId: string;
  type: string;
  payload: unknown;
  deliveryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  deliveryId: string;
  eventId: string;
  endpointId: string;
  merchantId: string;
  eventType: string;
  url: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  lastError?: string;
  responseStatus?: number;
  responseBody?: unknown;
  request?: {
    method: "POST";
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ListWebhookEventsInput {
  merchantId?: string;
  type?: string;
}

export interface ListWebhookDeliveriesInput {
  merchantId?: string;
  eventId?: string;
  endpointId?: string;
  status?: WebhookDeliveryStatus;
}

export interface ReplayWebhookDeliveryInput {
  attemptNow?: boolean;
}

export interface ReceivingAddressRecord {
  merchantId: string;
  chainId: number;
  receivingAddress: string;
  updatedAt: string;
}

export interface SetReceivingAddressInput {
  chainId?: number;
  receivingAddress: string;
}
