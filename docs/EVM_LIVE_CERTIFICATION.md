# EVM Live Certification Runbook

## English

RedeemLoop v0.4.4 adds a live EVM certification console and merchant-facing wallet error taxonomy for Ethereum, BNB Smart Chain, Polygon PoS, and Arbitrum One.

This runbook is for pilot certification. It does not claim every wallet is production-certified until the exact wallet/network flow is executed with a funded wallet, a real voucher ERC-20 contract, and production-grade RPC endpoints.

### Certification Console

Run the API and POS console, then open:

```text
http://localhost:3000/evm-live-certification
```

The console supports:

- ETH/BSC/POL/ARB chain selection.
- Live voucher ERC-20 contract and merchant vault input.
- Asset Binding seeding for a selected chain.
- Injected EIP-1193 wallet payment through the React Pay Button.
- Structured payment events for wallet connection, transaction submission, broadcast, settlement recheck, and completion.
- `EVM_RPC_URLS` diagnostics without exposing full RPC secrets.

### Required Live Inputs

For each chain, prepare:

- A real ERC-20 voucher contract address.
- A merchant receiving address on the same chain.
- A funded payer wallet that holds the voucher amount and enough native gas.
- A working RPC URL in `EVM_RPC_URLS`.

Example:

```bash
EVM_RPC_URLS='{"1":"https://eth.example","56":"https://bsc.example","137":"https://polygon.example","42161":"https://arb.example"}'
EVM_MIN_CONFIRMATIONS=2
```

### Pass Criteria

A chain/wallet pair is pilot-certified only when:

- Wallet provider is detected.
- Wallet account connection succeeds.
- Wallet switches or adds the selected chain.
- ERC-20 `transfer(merchantVault, requiredAmount)` is submitted.
- RedeemLoop records the broadcast txid.
- `POST /v1/settlement/evm/recheck/:intentId` verifies the receipt through the configured RPC.
- PaymentIntent reaches `paid`.
- Commerce/webhook mark-as-paid path is observable or explicitly deferred for that certification run.
- `pnpm --silent beta:evidence:evm -- ... --out evidence/evm-wallet-certification.json` produces the release evidence artifact from the final transaction receipt.

### Wallet Error Codes

`@redeemloop/adapters` now normalizes common EIP-1193 errors:

| Code | Meaning |
| --- | --- |
| `wallet_missing` | No injected EVM wallet provider was found. |
| `wallet_request_rejected` | Customer rejected a connection or chain prompt. |
| `wallet_request_pending` | Wallet already has a pending prompt. |
| `wallet_unauthorized` | Site is not authorized for the wallet account. |
| `wallet_chain_unsupported` | Wallet does not recognize the target chain. |
| `wallet_chain_switch_failed` | Wallet could not switch chains. |
| `wallet_chain_add_failed` | Wallet could not add the target chain. |
| `wallet_account_mismatch` | Connected wallet account differs from the PaymentIntent payer. |
| `wallet_insufficient_funds` | Wallet lacks voucher balance or native gas. |
| `wallet_transaction_rejected` | Customer rejected the transaction. |
| `wallet_transaction_failed` | Wallet could not submit the transaction. |
| `wallet_invalid_response` | Wallet returned an invalid transaction hash or response. |

React Pay Button exposes `onEvent`, and the script widget emits DOM events including `redeemloop:wallet_connected`, `redeemloop:wallet_tx`, `redeemloop:broadcasted`, `redeemloop:paid`, and `redeemloop:error`.

### RPC Diagnostics

Use:

```http
GET /v1/diagnostics/evm-rpc
```

The response reports per-chain status, source, origin, latest block, and latency. Full RPC URLs are not returned because many providers embed API keys in the path or query.

### AiFund Pay Reference

`pay.aifund.com` remains a product/UX reference for wallet selection and payment flow. RedeemLoop should not hard-depend on it until its HTTPS certificate and exact integration behavior are production-certified.

## 中文

RedeemLoop v0.4.4 新增 EVM live certification console，以及面向商户的钱包错误分类，覆盖 Ethereum、BNB Smart Chain、Polygon PoS 和 Arbitrum One。

这份 runbook 用于 pilot certification。在使用真实有资金钱包、真实 voucher ERC-20 合约和生产级 RPC 完成逐链逐钱包测试之前，不能宣称所有钱包已经 production-certified。

### 认证控制台

启动 API 和 POS console 后打开：

```text
http://localhost:3000/evm-live-certification
```

控制台支持：

- ETH/BSC/POL/ARB 链选择。
- 输入真实 voucher ERC-20 合约和商户收券地址。
- 为选中链 seed Asset Binding。
- 通过 React Pay Button 调用注入式 EIP-1193 钱包支付。
- 输出 wallet connected、transaction submitted、broadcasted、settlement recheck、complete 等结构化事件。
- 检查 `EVM_RPC_URLS` 诊断信息，同时不暴露完整 RPC secret。

### 必需真实输入

每条链需要准备：

- 真实 ERC-20 voucher 合约地址。
- 同链商户收券地址。
- 持有足够 voucher 和 gas 的付款钱包。
- `EVM_RPC_URLS` 中配置可用 RPC URL。

示例：

```bash
EVM_RPC_URLS='{"1":"https://eth.example","56":"https://bsc.example","137":"https://polygon.example","42161":"https://arb.example"}'
EVM_MIN_CONFIRMATIONS=2
```

### 通过标准

某个链 / 钱包组合只有在满足以下条件后才能标记为 pilot-certified：

- 检测到钱包 provider。
- 钱包账户连接成功。
- 钱包能切换或添加目标链。
- 成功提交 ERC-20 `transfer(merchantVault, requiredAmount)`。
- RedeemLoop 记录 broadcast txid。
- `POST /v1/settlement/evm/recheck/:intentId` 能通过配置的 RPC 验证 receipt。
- PaymentIntent 到达 `paid`。
- `pnpm --silent beta:evidence:evm -- ... --out evidence/evm-wallet-certification.json` 能从最终 transaction receipt 生成 release evidence artifact。
- commerce/webhook mark-as-paid 路径可观察，或在本次认证中明确标记为 deferred。

### 钱包错误码

`@redeemloop/adapters` 现在会归一化常见 EIP-1193 错误：

| Code | 含义 |
| --- | --- |
| `wallet_missing` | 未检测到注入式 EVM 钱包 provider。 |
| `wallet_request_rejected` | 用户拒绝连接或切链提示。 |
| `wallet_request_pending` | 钱包已有待处理弹窗。 |
| `wallet_unauthorized` | 当前站点未获得钱包账户授权。 |
| `wallet_chain_unsupported` | 钱包不认识目标链。 |
| `wallet_chain_switch_failed` | 钱包切链失败。 |
| `wallet_chain_add_failed` | 钱包添加目标链失败。 |
| `wallet_account_mismatch` | 连接的钱包账户与 PaymentIntent payer 不一致。 |
| `wallet_insufficient_funds` | 钱包缺少 voucher 余额或原生 gas。 |
| `wallet_transaction_rejected` | 用户拒绝交易签名。 |
| `wallet_transaction_failed` | 钱包无法提交交易。 |
| `wallet_invalid_response` | 钱包返回了无效 tx hash 或响应。 |

React Pay Button 暴露 `onEvent`；script widget 会发出 `redeemloop:wallet_connected`、`redeemloop:wallet_tx`、`redeemloop:broadcasted`、`redeemloop:paid` 和 `redeemloop:error` 等 DOM 事件。

### RPC 诊断

使用：

```http
GET /v1/diagnostics/evm-rpc
```

响应会按链返回状态、来源、origin、最新块高和延迟。接口不会返回完整 RPC URL，因为很多 RPC provider 会把 API key 放在 path 或 query 中。

### AiFund Pay 参考

`pay.aifund.com` 仍作为钱包选择和支付流程的产品/UX 参考。在 HTTPS 证书和具体集成行为完成生产认证前，RedeemLoop 不应对它形成生产硬依赖。
