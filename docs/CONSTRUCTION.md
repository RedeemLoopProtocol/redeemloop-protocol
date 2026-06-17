# RedeemLoop 施工文档

本文给 Codex 或开发团队使用, 目标是把 RedeemLoop 从设计稿落成可运行、可测试、可发布的开源项目。

## 0. 产品判断

RedeemLoop 不是 NFT 提货券项目, 也不是积分系统。第一版必须坚持:

```text
FT-first + 一键植入 + 核销模式可配置 + 现有加密基础设施原生流转
```

第一版主线:

```text
ERC-20 Voucher, decimals = 0
1 token = 1 个完整商品或服务权益
核销时支持 burn 或 collect
collect 后 token 进入 Merchant Vault, 可再次分发
```

## 1. MVP 闭环

第一版只做一个完整闭环:

```text
厂商创建 Voucher
厂商把 token 发给用户
用户在 POS Verifier 扫码兑换
用户签名授权
门店 relayer 提交交易
token 被 burn 或进入 Merchant Vault
POS 显示核销成功
后台看到 redemption event
```

不要在 MVP 做:

- NFT。
- 二级市场。
- 多链桥。
- 积分。
- 复杂 KYC。
- 复杂库存系统。
- 移动 App。

## 2. 仓库初始化

建议使用 pnpm workspace。

```text
redeemloop-protocol/
  package.json
  pnpm-workspace.yaml
  foundry.toml
  docker-compose.yml
  packages/contracts
  packages/sdk
  packages/react
  packages/widget
  apps/merchant-console
  apps/pos-verifier
  apps/demo-store
  services/api
  services/indexer
  services/commerce-bridge
  docs
```

### 根 package.json

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
    "contracts:test": "cd packages/contracts && forge test",
    "contracts:fmt": "cd packages/contracts && forge fmt",
    "contracts:slither": "cd packages/contracts && slither ."
  }
}
```

## 3. 合约施工

### 3.1 合约包依赖

使用:

- Solidity 0.8.25+
- Foundry
- OpenZeppelin Contracts

第一批合约:

```text
RedeemLoopERC20Voucher.sol
MerchantVault.sol
MerchantRegistry.sol
StoreTerminalRegistry.sol
RedemptionRouter.sol
TermsRegistry.sol
CampaignDistributor.sol
```

### 3.2 RedeemLoopERC20Voucher

必须实现:

- ERC-20。
- decimals = 0。
- maxSupply。
- mint role。
- sealMinting。
- pause。
- termsHash。
- merchantId。
- merchantVault。
- redemptionMode。
- collectWithAuthorization。
- burnWithAuthorization。

### 3.3 collectWithAuthorization

EIP-712 typed data:

```solidity
struct RedeemAuthorization {
    address user;
    address voucherToken;
    uint256 tokenId;
    uint256 amount;
    bytes32 merchantId;
    bytes32 storeId;
    bytes32 terminalId;
    bytes32 termsHash;
    uint8 redemptionMode;
    uint256 nonce;
    uint256 deadline;
}
```

验证顺序:

1. `block.timestamp <= deadline`。
2. nonce 未使用。
3. recovered signer == user。
4. token、termsHash、merchantId、mode 匹配。
5. storeId/terminalId 在 StoreTerminalRegistry 中有效。
6. 用户余额足够。
7. 如果 COLLECT: transfer 到 MerchantVault。
8. 如果 BURN: burn。
9. emit VoucherRedeemed。
10. 标记 nonce 已使用。

### 3.4 MerchantVault

MerchantVault 需要:

- 接收 token。
- 记录 quarantine until。
- 只允许授权 distributor 从 vault 发券。
- 支持 rescue 误转 token, 但必须多签/管理员限制。
- 支持 pause。

### 3.5 测试要求

Foundry 测试必须覆盖:

- mint 上限。
- seal 后不能 mint。
- decimals 为 0。
- collect 成功。
- burn 成功。
- nonce 重放失败。
- deadline 过期失败。
- 非授权门店失败。
- 错误 termsHash 失败。
- pause 后失败。
- vault quarantine。
- fuzz amount 和 nonce。

## 4. 后端 API 施工

建议 NestJS 或 Fastify。MVP 可以用 Fastify 提速。

### 4.1 API 模块

```text
AuthModule
MerchantModule
VoucherModule
CampaignModule
TerminalModule
RedemptionModule
RelayerModule
IndexerModule
WebhookModule
```

### 4.2 主要接口

```http
POST /v1/merchants
POST /v1/voucher-classes
POST /v1/campaigns
POST /v1/campaigns/:id/claim-intents
POST /v1/redemptions/intents
POST /v1/redemptions/submit
GET  /v1/wallets/:address/vouchers
GET  /v1/merchants/:id/stats
POST /v1/terminals/register
POST /v1/webhooks/commerce
```

### 4.3 Relayer

Relayer 只负责提交用户签名过的交易, 不能替用户签名。Relayer 必须:

- 校验签名。
- 校验 terminal。
- 限流。
- 防重复提交。
- 保存 tx hash。
- 失败重试。

## 5. 前端施工

### 5.1 packages/sdk

提供 TypeScript SDK:

```ts
createClient(config)
getVoucherBalance(input)
createClaimIntent(input)
claim(input)
createRedeemAuthorization(input)
submitRedemption(input)
getMerchantVouchers(input)
```

### 5.2 packages/react

提供 React 组件:

```tsx
<RedeemLoopProvider />
<ClaimButton />
<BuyButton />
<RedeemButton />
<VoucherBalance />
<VoucherWallet />
```

### 5.3 packages/widget

生成 CDN script 版本:

```html
<script src="https://cdn.redeemloop.org/widget/v0/redeemloop.js"></script>
<div data-rdl-widget="claim" ...></div>
```

Widget 初始化逻辑:

1. 扫描 `[data-rdl-widget]`。
2. 读取 merchant、campaign、token、chainId。
3. 渲染按钮。
4. 连接钱包或 embedded wallet。
5. 调用 SDK。

### 5.4 POS Verifier

页面:

- 门店登录。
- 选择商品。
- 输入 amount。
- 生成 QR。
- 等待用户签名。
- 提交 redemption。
- 展示成功/失败。

## 6. 数据库施工

使用 PostgreSQL。

MVP 表:

```sql
merchants(id, display_name, domain, admin_wallet, default_vault, status, created_at)
voucher_classes(id, merchant_id, chain_id, token_address, profile, symbol, decimals, max_supply, redemption_mode, terms_hash, terms_uri, status)
campaigns(id, merchant_id, voucher_class_id, source_type, source_vault, per_wallet_limit, start_at, end_at, status)
stores(id, merchant_id, region, name, status)
terminals(id, store_id, public_key, operator_wallet, status)
redemptions(id, merchant_id, store_id, terminal_id, user_wallet, token_address, token_id, amount, mode, status, nonce, tx_hash, created_at)
indexer_events(id, chain_id, contract_address, event_name, tx_hash, log_index, payload, created_at)
```

## 7. Indexer 施工

MVP 可用 viem 监听事件。后续可替换 Ponder 或 Subgraph。

监听:

- Transfer。
- VoucherRedeemed。
- VoucherIssued。
- VoucherReissued。
- TerminalAuthorized。
- MintingSealed。

要求:

- 支持断点续扫。
- 支持 reorg 处理。
- event 幂等写入。
- tx hash + log index 唯一。

## 8. CommerceBridge 施工

v0.1.0 先实现 EVM voucher payment button、商户收券地址、Shopify/WooCommerce mark-as-paid dry-run/live adapter。生产版仍需持久化队列、重试、速率限制和平台权限审计。

兑换流程:

```text
cart line item 匹配 terms
用户签名
token collect/burn
Shopify orderMarkAsPaid 或 WooCommerce set_paid
商户按平台订单履约
```

第一版不接物流履约, 只完成支付确认和平台标记已支付。

## 9. 发布要求

每个 PR 必须满足:

- `forge test` 通过。
- TypeScript test 通过。
- lint 通过。
- README 中本地启动命令有效。
- demo 可点击。
- 至少一个 e2e 脚本可运行。

## 10. 第一个 Codex 任务

把 `docs/CODEX_PROMPT.md` 的内容作为首次任务投给 Codex。要求它只完成 Phase 0, 不要扩展范围。
