# Bitcoin Rune Real-Usability Plan

## English

This document tracks the path from v0.4.0 alpha to a realistically usable Bitcoin Rune merchant flow.

### Current Status in v0.4.1

Usable for integration development:

- Wallet-native Rune transfers through UniSat `sendRunes`.
- Wallet-native Rune transfers through Xverse Sats Connect `runes_transfer`.
- UniSat PSBT signing with hex PSBT input/output semantics.
- Xverse PSBT signing with base64 PSBT input/output semantics.
- Xverse API-backed balance lookup through `/v2/runes/address/{address}/balance`.
- Xverse API-backed UTXO lookup through `/v1/runes/address/{address}/utxo`.
- Xverse API-backed activity lookup for transfer proof matching.
- Deterministic tests for wallet request payloads and indexer response mapping.

Not yet certified as production-ready:

- No live funded UniSat wallet transfer has been executed in this environment.
- No live funded Xverse wallet transfer has been executed in this environment.
- No real Xverse API key has been used here to certify balance, UTXO, or activity lookup against live merchant addresses.
- The server-side `transfer.bitcoin.psbtBase64` payload remains a fixture boundary, not a production PSBT builder.
- No multi-indexer failover exists yet.

### Merchant Pilot Checklist

Before calling the Rune path production-ready, a pilot merchant must complete all items:

1. Create or provide a merchant-owned Rune receiving address.
2. Bind a real Rune asset descriptor with `runeId` and, for Xverse, `runeName`.
3. Complete one UniSat `sendRunes` transfer from a wallet holding the Rune.
4. Complete one Xverse `runes_transfer` transfer from a wallet holding the Rune.
5. Confirm each txid through `createXverseRuneIndexerAdapter`.
6. Submit the returned `VoucherPaymentProof` to RedeemLoop settlement proof API.
7. Confirm the `PaymentIntent` reaches `paid`.
8. Confirm webhook delivery reaches the merchant commerce system and marks the order paid.
9. Record wallet version, network, Rune ID/name, txid, indexer response height, and webhook delivery ID.

### Next Engineering Milestones

v0.4.2 target:

- Add an API-level Rune settlement recheck endpoint using configured indexer adapters.
- Persist Rune txid submission and proof recheck state.
- Add environment configuration for Xverse API key and network.

v0.4.3 target:

- Add a browser demo page for UniSat/Xverse Rune transfers.
- Add manual live-test runbook with screenshots and exact expected statuses.
- Add merchant-facing error messages for wallet rejection, insufficient balance, indexer lag, and missing transfer proof.

v0.5.0 target:

- Certify a full live Bitcoin Rune pilot flow.
- Add at least one fallback indexer adapter or documented manual-review fallback.
- Promote Rune support from beta integration support to pilot-ready support.

## 中文

本文档用于跟踪 RedeemLoop 从 v0.4.0 alpha 走向真实可用 Bitcoin Rune 商户流程的路径。

### v0.4.1 当前状态

可用于集成开发：

- 通过 UniSat `sendRunes` 发起钱包原生 Rune 转账。
- 通过 Xverse Sats Connect `runes_transfer` 发起钱包原生 Rune 转账。
- UniSat PSBT 签名明确采用 hex PSBT 输入/输出语义。
- Xverse PSBT 签名明确采用 base64 PSBT 输入/输出语义。
- 基于 Xverse API `/v2/runes/address/{address}/balance` 查询余额。
- 基于 Xverse API `/v1/runes/address/{address}/utxo` 查询 UTXO。
- 基于 Xverse API activity 查询匹配 transfer proof。
- 对钱包请求 payload 和 indexer response mapping 做了确定性测试。

尚未认证为生产可用：

- 当前环境没有执行过真实有余额 UniSat 钱包转账。
- 当前环境没有执行过真实有余额 Xverse 钱包转账。
- 当前环境没有使用真实 Xverse API key 对真实商户地址完成 balance、UTXO 或 activity lookup 认证。
- 服务端 `transfer.bitcoin.psbtBase64` 仍是 fixture boundary，不是生产级 PSBT builder。
- 尚未实现多索引器容灾。

### 商户 Pilot Checklist

在把 Rune 路径称为 production-ready 之前，pilot 商户必须完成全部步骤：

1. 创建或提供商户自有 Rune 收券地址。
2. 绑定真实 Rune asset descriptor，包含 `runeId`，并在 Xverse 路径提供 `runeName`。
3. 使用持有该 Rune 的钱包完成一次 UniSat `sendRunes` 转账。
4. 使用持有该 Rune 的钱包完成一次 Xverse `runes_transfer` 转账。
5. 通过 `createXverseRuneIndexerAdapter` 确认每一笔 txid。
6. 把返回的 `VoucherPaymentProof` 提交到 RedeemLoop settlement proof API。
7. 确认 `PaymentIntent` 到达 `paid`。
8. 确认 webhook delivery 到达商户电商系统并把订单标记为已付款。
9. 记录钱包版本、网络、Rune ID/name、txid、indexer response height 和 webhook delivery ID。

### 下一步工程里程碑

v0.4.2 目标：

- 增加 API-level Rune settlement recheck endpoint，使用配置好的 indexer adapters。
- 持久化 Rune txid submission 和 proof recheck 状态。
- 增加 Xverse API key 与 network 的环境配置。

v0.4.3 目标：

- 增加 UniSat/Xverse Rune 转账浏览器 demo 页面。
- 增加手动 live-test runbook，包含截图和精确预期状态。
- 增加面向商户的钱包拒签、余额不足、索引器延迟、缺失 transfer proof 错误提示。

v0.5.0 目标：

- 完成一次完整 live Bitcoin Rune pilot flow 认证。
- 至少增加一个备用 indexer adapter，或提供明确的 manual-review fallback。
- 将 Rune 支持从 beta integration support 提升到 pilot-ready support。
