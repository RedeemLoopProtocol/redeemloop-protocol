# RedeemLoop 协议规格 v0.2

## 1. 核心抽象

RedeemLoop v0.2 的核心抽象：

```text
VoucherAssetDescriptor -> Entitlement -> RedemptionBinding -> PaymentIntent -> SettlementProof -> CommercePaidEvent
```

## 2. 枚举

```ts
export type ChainNamespace = "eip155" | "bitcoin" | "fractal";

export type AssetType =
  | "erc20"
  | "erc6909"
  | "erc1155"
  | "erc721"
  | "rune"
  | "inscription"
  | "brc20_optional";

export type SettlementPolicy = "collect" | "burn" | "escrow";

export type BindingStatus = "draft" | "active" | "paused" | "archived";

export type PaymentIntentStatus =
  | "created"
  | "wallet_connected"
  | "asset_selected"
  | "transfer_requested"
  | "broadcasted"
  | "seen"
  | "confirmed"
  | "paid"
  | "expired"
  | "failed"
  | "cancelled"
  | "manual_review";
```

## 3. VoucherAssetDescriptor

```ts
export interface VoucherAssetDescriptor {
  chainNamespace: ChainNamespace;
  chainId?: number;
  assetType: AssetType;
  assetId: string;
  contract?: `0x${string}`;
  tokenId?: string;
  runeId?: string;
  runeName?: string;
  inscriptionId?: string;
  collectionId?: string;
  ticker?: string;
  decimals?: number;
  divisibility?: number;
  requiredAmount: string;
  termsHash: string;
  metadataUri?: string;
}
```

规则：

- EVM ERC-20 必须有 `chainId`、`contract`、`requiredAmount`。
- ERC-6909 / ERC-1155 / ERC-721 必须有 `tokenId`。
- Rune 必须有 `runeId` 或 `runeName`。
- Inscription 单券必须有 `inscriptionId`；集合型可用 `collectionId`。
- 普通商品 FT 推荐 `decimals = 0` 或 `divisibility = 0`。

## 4. Entitlement

```ts
export interface Entitlement {
  entitlementId: string;
  merchantId: string;
  name: string;
  description?: string;
  quantity: number;
  region?: string;
  validity?: {
    type: "perpetual" | "date_range" | "relative";
    validFrom?: string;
    validUntil?: string;
    durationSeconds?: number;
  };
  termsHash: string;
  termsUri?: string;
}
```

## 5. CommerceTarget

```ts
export interface CommerceTarget {
  platform:
    | "custom"
    | "woocommerce"
    | "shopify"
    | "magento"
    | "shopline"
    | "shoplazza"
    | "bigcommerce"
    | "pos"
    | "miniapp"
    | "livestream";
  storeId: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  entitlementGroupId?: string;
  country?: string;
  channel?: string;
}
```

## 6. RedemptionBinding

```ts
export interface RedemptionBinding {
  bindingId: string;
  merchantId: string;
  entitlementId: string;
  acceptedAssets: VoucherAssetDescriptor[];
  merchantVaults: Record<string, string>;
  settlementPolicy: SettlementPolicy;
  commerceTargets: CommerceTarget[];
  status: BindingStatus;
  termsHash: string;
  createdAt: string;
  updatedAt: string;
}
```

## 7. PaymentIntent

```ts
export interface RedeemLoopPaymentIntent {
  intentId: string;
  bindingId: string;
  merchantId: string;
  storeId?: string;
  channel: "website" | "checkout" | "pos" | "miniapp" | "livestream" | "ad";
  orderId: string;
  skuLines: Array<{ sku: string; quantity: number }>;
  acceptedAssets: VoucherAssetDescriptor[];
  selectedAsset?: VoucherAssetDescriptor;
  payerAddress?: string;
  merchantVault: string;
  settlementPolicy: SettlementPolicy;
  status: PaymentIntentStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
```

## 8. VoucherPaymentProof

```ts
export interface VoucherPaymentProof {
  proofId: string;
  intentId: string;
  chainNamespace: ChainNamespace;
  chainId?: number;
  txid: string;
  blockNumber?: number;
  blockHash?: string;
  confirmations: number;
  from: string;
  to: string;
  assetType: AssetType;
  assetId: string;
  contract?: string;
  tokenId?: string;
  amount: string;
  logIndex?: number;
  outputIndex?: number;
  status: "seen" | "confirmed" | "finalized" | "failed";
  rawProof?: unknown;
}
```

## 9. 状态机

合法迁移：

```text
created -> wallet_connected
wallet_connected -> asset_selected
asset_selected -> transfer_requested
transfer_requested -> broadcasted
broadcasted -> seen
seen -> confirmed
confirmed -> paid
created/wallet_connected/asset_selected/transfer_requested/broadcasted/seen -> expired
任何未完成状态 -> failed
任何未完成状态 -> cancelled
任何异常状态 -> manual_review
```

`paid` 为终态。

## 10. Webhook 事件

```json
{
  "event": "voucher.payment.confirmed",
  "eventId": "evt_...",
  "createdAt": "2026-06-17T00:00:00.000Z",
  "merchantId": "coca-cola",
  "bindingId": "rlb_coke_global_001",
  "intentId": "pi_123",
  "orderId": "ORDER-10086",
  "paymentProof": {
    "chainNamespace": "eip155",
    "chainId": 56,
    "txid": "0x...",
    "from": "0xUser",
    "to": "0xVault",
    "assetType": "erc20",
    "contract": "0xToken",
    "amount": "1",
    "confirmations": 3
  },
  "action": "mark_order_paid"
}
```

## 11. 签名头

```text
X-RedeemLoop-Timestamp: 1780000000
X-RedeemLoop-Nonce: whn_...
X-RedeemLoop-Signature: hex(hmac_sha256(secret, timestamp + "." + nonce + "." + rawBody))
```

## 12. 幂等键

所有外部副作用必须使用幂等键：

```text
mark_paid:{platform}:{storeId}:{orderId}:{intentId}
webhook:{eventId}
proof:{chain}:{txid}:{assetId}:{to}:{amount}
```
