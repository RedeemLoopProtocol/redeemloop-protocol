# RedeemLoop v0.2 施工文档

本文件给 Codex 和开发线程使用。目标是发布 RedeemLoop v0.2：一个非常克制的多链提货券支付协议。

## 0. 非协商原则

必须遵守：

```text
1. RedeemLoop 不发行资产，只绑定资产。
2. RedeemLoop 不做 token 定价引擎，只做外部提货券支付方式。
3. RedeemLoop 不做电商后端，只通知订单已付款。
4. RedeemLoop 不做二级市场。
5. 第一版 EVM ERC-20 先跑通，但 Bitcoin / Fractal / Rune / Inscription 必须在类型和 adapter 边界中一等支持。
```

## 1. v0.2 最小闭环

```text
商户在后台创建 Asset Binding
        ↓
绑定已存在的 ERC-20 / Rune / Inscription / NFT 等资产
        ↓
绑定商品 SKU 或 Entitlement Group
        ↓
生成商品页按钮或结账页支付方式
        ↓
用户连接钱包并检测持券
        ↓
电商创建待付款订单
        ↓
RedeemLoop 创建 PaymentIntent
        ↓
用户把资产转给商户收券地址
        ↓
Settlement Worker 确认到账
        ↓
Commerce Adapter markOrderPaid
```

## 2. 仓库结构

```text
redeemloop-protocol/
  package.json
  pnpm-workspace.yaml
  packages/
    core/
      src/types.ts
      src/validators.ts
      src/state-machine.ts
    sdk/
      src/client.ts
      src/payment-intent.ts
      src/bindings.ts
    react/
      src/RedeemLoopPayButton.tsx
    widget/
      src/index.ts
    adapters/
      src/evm.ts
      src/bitcoin.ts
      src/fractal.ts
      src/wallets.ts
      src/indexers.ts
  services/
    api/
    settlement-worker/
    commerce-bridge/
    indexer-gateway/
  apps/
    merchant-console/
    demo-store/
    pos-verifier/
  examples/
    evm-erc20-voucher/
    bitcoin-rune-binding/
    fractal-rune-binding/
  docs/
```

## 3. Package 初始化

使用 pnpm workspace。

根 package.json 必须至少包含：

```json
{
  "name": "redeemloop-protocol",
  "private": true,
  "license": "MIT",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  }
}
```

## 4. Core 类型优先

先实现 `packages/core/src/types.ts`。

必须包含：

- `VoucherAssetDescriptor`
- `Entitlement`
- `CommerceTarget`
- `RedemptionBinding`
- `RedeemLoopPaymentIntent`
- `VoucherPaymentProof`
- `SettlementPolicy`
- `PaymentIntentStatus`
- `ChainNamespace`
- `AssetType`

核心包不得 import 任何发行器代码。

## 5. PaymentIntent 状态机

状态：

```text
created
wallet_connected
asset_selected
transfer_requested
broadcasted
seen
confirmed
paid
expired
failed
cancelled
manual_review
```

规则：

- 只有 `created/wallet_connected/asset_selected` 可以进入 `transfer_requested`。
- 只有 `transfer_requested/broadcasted` 可以进入 `seen`。
- 只有 `seen` 可以进入 `confirmed`。
- 只有 `confirmed` 可以进入 `paid`。
- 任何未完成状态可以进入 `expired`。
- `paid` 终态不可逆。
- Webhook 必须幂等。

## 6. Merchant Console

Merchant Console 第一版只实现 Asset Binding Wizard。

页面：

```text
/bindings
/bindings/new
/bindings/:id
/vaults
/webhooks
/embed-code
```

Wizard 步骤：

1. 选择资产类型。
2. 填入资产标识。
3. 验证资产可读取。
4. 绑定商品权益。
5. 绑定 SKU / Entitlement Group。
6. 配置商户收券地址。
7. 验证商户收券地址控制权。
8. 配置 settlement policy。
9. 生成嵌入代码。

不得实现发行按钮。

## 7. EVM ERC-20 MVP

第一版运行时只需要完整实现 EVM ERC-20 流程：

```text
balanceOf(user)
build transfer(merchantVault, requiredAmount) wallet transaction request
wallet sends transfer
监听 Transfer event
匹配 PaymentIntent
markOrderPaid
```

要求：

- 支持 chainId。
- 支持多个 RPC endpoint fallback。
- check-balance API 必须返回 ERC-20 balanceOf calldata，并能基于传入余额判断是否满足 requiredAmount。
- 支持 decimals 检查，推荐 decimals = 0，但不强制阻断。
- 支持用户复制 txid 后手动补录。
- Transfer proof 必须包含 blockNumber、txHash、logIndex、from、to、amount、contract。
- transfer-requested API 必须返回 ERC-20 contract 地址、calldata、chainId、value=0x0，供钱包按钮使用。

## 8. Bitcoin / Fractal 接口

v0.2 必须实现接口和类型，不要求完整生产运行时。

必须包含：

```ts
interface PsbtBuilderAdapter {
  buildTransferPsbt(input: PsbtTransferInput): Promise<PsbtBuildResult>;
}

interface BitcoinWalletAdapter {
  connect(): Promise<WalletAccount>;
  signPsbt(input: { psbtBase64?: string; psbtHex?: string; signInputs?: Record<string, number[]> }): Promise<{
    psbtBase64?: string;
    psbtHex?: string;
    txid?: string;
  }>;
  broadcast?(signedPsbt: string): Promise<string>;
}

interface IndexerAdapter {
  getBalance(address: string, asset: VoucherAssetDescriptor): Promise<AssetBalance>;
  getTransferProof(txid: string, asset: VoucherAssetDescriptor): Promise<VoucherPaymentProof>;
}
```

支持 assetType：

```text
rune
inscription
brc20_optional
```

chainNamespace：

```text
bitcoin
fractal
```

## 9. Commerce Adapter

统一接口：

```ts
interface CommerceAdapter {
  getProductContext(input: ProductContextInput): Promise<ProductContext>;
  createPendingOrder(input: CreatePendingOrderInput): Promise<CommerceOrder>;
  markOrderPaid(input: MarkOrderPaidInput): Promise<void>;
  cancelPendingOrder(input: CancelOrderInput): Promise<void>;
}
```

第一版必须至少实现一个：

```text
demo-store adapter 或 WooCommerce adapter
```

Shopify 第一版只做设计和外部/手动支付桥，不强制完整实现。

## 10. Widget / React

商品页按钮要做：

- 读取 bindingId / productId / sku。
- 查询绑定。
- 展示可接受资产。
- 连接钱包。
- 检测余额。
- 创建 pending order。
- 创建 PaymentIntent。
- 引导用户转券。
- 轮询或订阅支付状态。
- 展示成功/失败。

## 11. Webhook

事件：

```text
voucher.payment.seen
voucher.payment.confirmed
voucher.payment.paid
voucher.payment.failed
voucher.payment.expired
```

签名：

```text
X-RedeemLoop-Timestamp
X-RedeemLoop-Nonce
X-RedeemLoop-Signature
```

签名内容：

```text
timestamp + "." + nonce + "." + rawBody
```

要求：

- 时间窗口默认 5 分钟。
- nonce 防重放。
- markOrderPaid 幂等。

## 12. 数据库表

至少包含：

```text
merchants
merchant_domains
merchant_vaults
entitlements
redemption_bindings
binding_assets
commerce_targets
payment_intents
payment_proofs
webhook_endpoints
webhook_deliveries
audit_logs
```

## 13. 测试要求

单元测试：

- 类型校验。
- binding 创建与暂停。
- PaymentIntent 状态机。
- Webhook 签名。
- 幂等 mark paid。
- EVM transfer proof 匹配。
- 错误资产不匹配。
- 错误商户地址不匹配。
- 过期 intent 不可支付。

E2E：

```text
创建 binding
创建订单
连接 mock wallet
模拟 ERC-20 transfer
settlement worker 确认
webhook mark paid
订单状态更新
```

## 14. Definition of Done

v0.2 可以发布的条件：

```text
1. README、白皮书、边界文档完成。
2. core 类型和状态机完成。
3. API 可以创建 binding 和 PaymentIntent。
4. EVM ERC-20 demo 支付跑通。
5. 至少一个 commerce adapter 能 mark paid。
6. widget 或 React button 能完成 demo。
7. Webhook 签名和幂等完成。
8. Bitcoin / Fractal adapter interface 已定义。
9. 没有发行器入口。
10. 没有 marketplace 入口。
```
