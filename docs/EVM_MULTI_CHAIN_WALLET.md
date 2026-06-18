# EVM Multi-Chain Wallet Beta

## English

RedeemLoop v0.4.3 adds EVM multi-chain wallet beta support for ERC-20 voucher tender flows. RedeemLoop v0.4.4 adds live certification tooling, merchant-facing wallet error codes, structured React/widget events, and EVM RPC diagnostics.

Supported default chain catalog:

| Network | Chain ID | Alias | Explorer |
| --- | ---: | --- | --- |
| Ethereum Mainnet | `1` | `eth`, `erc20` | `https://etherscan.io` |
| BNB Smart Chain | `56` | `bsc`, `bnb`, `bep20` | `https://bscscan.com` |
| Polygon PoS | `137` | `polygon`, `pol`, `matic` | `https://polygonscan.com` |
| Arbitrum One | `42161` | `arbitrum`, `arb` | `https://arbiscan.io` |

### Wallet Adapter

`@redeemloop/adapters` exposes a zero-dependency EIP-1193 wallet adapter:

```ts
import { createEip1193EvmWalletAdapter } from "@redeemloop/adapters";

const wallet = createEip1193EvmWalletAdapter(window.ethereum);
await wallet.connect({ chainId: 56 });
const txid = await wallet.sendErc20Transfer(transfer.evm);
```

The adapter uses:

- `eth_requestAccounts` to request an account.
- `eth_chainId` to read the active chain.
- `wallet_switchEthereumChain` to switch networks.
- `wallet_addEthereumChain` if the wallet does not know the target network.
- `eth_sendTransaction` to send the ERC-20 `transfer(merchantVault, requiredAmount)` transaction.

Common wallet failures are normalized into stable codes such as `wallet_missing`, `wallet_request_rejected`, `wallet_request_pending`, `wallet_chain_unsupported`, `wallet_account_mismatch`, `wallet_insufficient_funds`, and `wallet_transaction_rejected`.

### React Pay Button

```tsx
<RedeemLoopPayButton
  bindingId="bind_usdt_bsc"
  orderId="ORDER-1001"
  channel="checkout"
  payerAddress="0xPayer"
  autoSendEvmTransaction
  autoRecheckEvmSettlement
  onEvent={(event) => console.log(event.type, event)}
/>
```

`autoSendEvmTransaction` sends the wallet transaction after the API returns `transfer.evm`.
`autoRecheckEvmSettlement` records the txid and calls trusted EVM receipt recheck.
`onEvent` reports `wallet_connected`, `wallet_transaction_submitted`, `transaction_broadcasted`, `settlement_rechecked`, and `payment_complete`.

### Script Widget

```html
<div
  data-redeemloop-pay-button
  data-api-base-url="https://api.example.com"
  data-api-key="merchant-api-key"
  data-binding-id="bind_usdt_bsc"
  data-order-id="ORDER-1001"
  data-payer-address="0xPayer"
  data-auto-send-evm-transaction="true"
  data-auto-recheck-evm-settlement="true"
></div>
<script type="module" src="https://cdn.example.com/redeemloop-widget.js"></script>
```

The script widget emits `redeemloop:wallet_connected`, `redeemloop:wallet_tx`, `redeemloop:broadcasted`, `redeemloop:paid`, and structured `redeemloop:error` events.

### Backend Receipt Recheck

For one-chain deployments, `RPC_URL` is enough:

```bash
RPC_URL=https://bsc.example
EVM_MIN_CONFIRMATIONS=2
```

For multi-chain deployments, use `EVM_RPC_URLS`:

```bash
EVM_RPC_URLS='{"1":"https://eth.example","56":"https://bsc.example","137":"https://polygon.example","42161":"https://arb.example"}'
EVM_MIN_CONFIRMATIONS=2
```

After the wallet returns a txid, RedeemLoop records it through `POST /v1/payment-intents/:intentId/broadcasted`, then calls `POST /v1/settlement/evm/recheck/:intentId`. The API selects the RPC URL by `asset.chainId`, verifies the ERC-20 `Transfer` log, and advances the `PaymentIntent` to `paid` when confirmations are sufficient.

Use `GET /v1/diagnostics/evm-rpc` before pilot runs to verify per-chain RPC status, latest block height, and latency. The response reports RPC source and origin, but does not expose the full RPC URL because provider keys may be embedded in the URL.

### Live Certification

Open `/evm-live-certification` in the local POS console to run a real-wallet certification pass. The runbook is documented in [EVM Live Certification Runbook](EVM_LIVE_CERTIFICATION.md).

### AiFund Pay Reference

`pay.aifund.com` is a useful reference for a zero-dependency `window.ethereum` wallet payment UX. It advertises wallet connect, QR payment, and payment verification across ERC20/BSC/ARB-style rails.

Do not hard-depend on that hosted page until its HTTPS certificate is valid for `pay.aifund.com`. Treat it as product and UX reference, while RedeemLoop keeps its own adapter boundary and receipt verification.

## 中文

RedeemLoop v0.4.3 新增 EVM 多链钱包 beta 支持，用于 ERC-20 提货券支付流程。RedeemLoop v0.4.4 新增 live certification tooling、面向商户的钱包错误码、结构化 React/widget 事件和 EVM RPC 诊断。

默认支持链目录：

| 网络 | Chain ID | Alias | Explorer |
| --- | ---: | --- | --- |
| Ethereum Mainnet | `1` | `eth`, `erc20` | `https://etherscan.io` |
| BNB Smart Chain | `56` | `bsc`, `bnb`, `bep20` | `https://bscscan.com` |
| Polygon PoS | `137` | `polygon`, `pol`, `matic` | `https://polygonscan.com` |
| Arbitrum One | `42161` | `arbitrum`, `arb` | `https://arbiscan.io` |

### 钱包 Adapter

`@redeemloop/adapters` 提供零依赖 EIP-1193 钱包 adapter：

```ts
import { createEip1193EvmWalletAdapter } from "@redeemloop/adapters";

const wallet = createEip1193EvmWalletAdapter(window.ethereum);
await wallet.connect({ chainId: 56 });
const txid = await wallet.sendErc20Transfer(transfer.evm);
```

该 adapter 使用：

- `eth_requestAccounts` 请求账户。
- `eth_chainId` 读取当前链。
- `wallet_switchEthereumChain` 切换网络。
- 钱包未知目标网络时，用 `wallet_addEthereumChain` 添加网络。
- 用 `eth_sendTransaction` 发送 ERC-20 `transfer(merchantVault, requiredAmount)` 交易。

常见钱包失败会被归一化为稳定 code，例如 `wallet_missing`、`wallet_request_rejected`、`wallet_request_pending`、`wallet_chain_unsupported`、`wallet_account_mismatch`、`wallet_insufficient_funds` 和 `wallet_transaction_rejected`。

### React Pay Button

```tsx
<RedeemLoopPayButton
  bindingId="bind_usdt_bsc"
  orderId="ORDER-1001"
  channel="checkout"
  payerAddress="0xPayer"
  autoSendEvmTransaction
  autoRecheckEvmSettlement
  onEvent={(event) => console.log(event.type, event)}
/>
```

`autoSendEvmTransaction` 会在 API 返回 `transfer.evm` 后发起钱包交易。
`autoRecheckEvmSettlement` 会记录 txid，并调用可信 EVM receipt recheck。
`onEvent` 会报告 `wallet_connected`、`wallet_transaction_submitted`、`transaction_broadcasted`、`settlement_rechecked` 和 `payment_complete`。

### Script Widget

```html
<div
  data-redeemloop-pay-button
  data-api-base-url="https://api.example.com"
  data-api-key="merchant-api-key"
  data-binding-id="bind_usdt_bsc"
  data-order-id="ORDER-1001"
  data-payer-address="0xPayer"
  data-auto-send-evm-transaction="true"
  data-auto-recheck-evm-settlement="true"
></div>
<script type="module" src="https://cdn.example.com/redeemloop-widget.js"></script>
```

Script widget 会发出 `redeemloop:wallet_connected`、`redeemloop:wallet_tx`、`redeemloop:broadcasted`、`redeemloop:paid` 和结构化 `redeemloop:error` 事件。

### 后端 Receipt Recheck

单链部署只需要 `RPC_URL`：

```bash
RPC_URL=https://bsc.example
EVM_MIN_CONFIRMATIONS=2
```

多链部署使用 `EVM_RPC_URLS`：

```bash
EVM_RPC_URLS='{"1":"https://eth.example","56":"https://bsc.example","137":"https://polygon.example","42161":"https://arb.example"}'
EVM_MIN_CONFIRMATIONS=2
```

钱包返回 txid 后，RedeemLoop 先通过 `POST /v1/payment-intents/:intentId/broadcasted` 记录 txid，再调用 `POST /v1/settlement/evm/recheck/:intentId`。API 会按 `asset.chainId` 选择 RPC URL，校验 ERC-20 `Transfer` log，并在确认数足够后把 `PaymentIntent` 推进到 `paid`。

Pilot run 前可使用 `GET /v1/diagnostics/evm-rpc` 检查逐链 RPC 状态、最新块高和延迟。响应会返回 RPC source 和 origin，但不会暴露完整 RPC URL，因为 provider key 可能嵌入 URL。

### Live Certification

在本地 POS console 中打开 `/evm-live-certification`，即可运行真实钱包认证流程。Runbook 见 [EVM Live Certification Runbook](EVM_LIVE_CERTIFICATION.md)。

### AiFund Pay 参考

`pay.aifund.com` 可以作为零依赖 `window.ethereum` 钱包支付 UX 参考。它展示了 wallet connect、QR payment，以及 ERC20/BSC/ARB 等路径的 payment verification 思路。

在 `pay.aifund.com` 的 HTTPS 证书对该主机名有效之前，不应把它作为生产硬依赖。RedeemLoop 可以参考其产品和 UX 思路，但仍保留自己的 adapter 边界和 receipt verification。
