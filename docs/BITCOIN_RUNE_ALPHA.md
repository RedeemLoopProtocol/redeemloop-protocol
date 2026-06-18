# RedeemLoop Bitcoin Rune Wallet/Indexer Beta

## English

RedeemLoop v0.4.1 upgrades the v0.4.0 Bitcoin Rune interface alpha into a wallet/indexer beta adapter surface.

What is now implemented:

- UniSat wallet adapter factory: `createUniSatRuneWalletAdapter(window.unisat)`.
- UniSat direct Rune transfer path through the wallet-native `sendRunes(address, runeid, amount, { feeRate })` method.
- UniSat PSBT signing path with explicit hex PSBT semantics.
- Xverse wallet adapter factory for Sats Connect `request`.
- Xverse direct Rune transfer path through `runes_transfer`.
- Xverse PSBT signing path with explicit base64 PSBT semantics and optional `signInputs`.
- Xverse API-backed Rune indexer adapter for balance, UTXO, and activity-based transfer proof lookup.
- Mock Rune indexer for deterministic adapter tests.
- Existing API `transfer.bitcoin.psbtBase64` fixture boundary for server-side PaymentIntent integration tests.

What remains intentionally out of scope:

- Rune etching.
- Ordinal inscription.
- NFT minting.
- Custody.
- Token pricing.
- Secondary market routing.
- RedeemLoop-owned production Rune PSBT engine.

### Practical Usability Status

v0.4.1 is no longer just a static adapter fixture. A merchant integration can now call real wallet transfer methods:

```ts
import { createUniSatRuneWalletAdapter } from "@redeemloop/adapters";

const wallet = createUniSatRuneWalletAdapter(window.unisat);
const account = await wallet.connect();
const result = await wallet.requestRuneTransfer?.({
  to: "bc1merchant",
  runeId: "840000:3",
  amount: "10",
  feeRate: 15,
});
```

```ts
import { request } from "sats-connect";
import { createXverseRuneWalletAdapter } from "@redeemloop/adapters";

const wallet = createXverseRuneWalletAdapter(request);
const account = await wallet.connect();
const result = await wallet.requestRuneTransfer?.({
  to: "bc1merchant",
  runeName: "UNCOMMON•GOODS",
  amount: "10",
});
```

Indexer-backed proof lookup is also available:

```ts
import { createXverseRuneIndexerAdapter } from "@redeemloop/adapters";

const indexer = createXverseRuneIndexerAdapter({
  apiKey: process.env.XVERSE_API_KEY!,
  network: "mainnet",
});

const proof = await indexer.getRuneTransferProof({
  intentId: "pi_rune",
  txid: "bitcoin_txid",
  asset: runeAsset,
  from: "bc1payer",
  to: "bc1merchant",
});
```

The remaining caveat is certification, not interface shape: this repository has not been live-tested here with a funded UniSat/Xverse wallet, a real merchant Rune vault, and a real Xverse API key. Until that happens, publish this as beta integration support, not as a fully certified production payment rail.

The legacy `transfer.bitcoin.psbtBase64` response still exists. In v0.4.1 it remains a fixture boundary for adapter integration tests. Real merchant flows should prefer wallet-native transfer methods first, then indexer-backed proof confirmation.

Official integration references used for this adapter surface:

- [UniSat Wallet API](https://docs.unisat.io/developer-support/open-api-documentation/unisat-wallet)
- [Xverse Sats Connect signPsbt](https://docs.xverse.app/sats-connect/bitcoin-methods/signpsbt)
- [Xverse Sats Connect runes_transfer](https://docs.xverse.app/sats-connect/bitcoin-methods/runes_transfer)
- [Xverse Rune API](https://docs.xverse.app/api/runes)

## 中文

RedeemLoop v0.4.1 把 v0.4.0 的 Bitcoin Rune interface alpha 升级为钱包/索引器 beta adapter surface。

当前已实现：

- UniSat 钱包 adapter factory：`createUniSatRuneWalletAdapter(window.unisat)`。
- 通过 UniSat 钱包原生 `sendRunes(address, runeid, amount, { feeRate })` 发起 Rune 转账。
- UniSat PSBT 签名路径，并明确使用 hex PSBT 语义。
- 面向 Sats Connect `request` 的 Xverse 钱包 adapter factory。
- 通过 Xverse `runes_transfer` 发起 Rune 转账。
- Xverse PSBT 签名路径，并明确使用 base64 PSBT 语义和可选 `signInputs`。
- 基于 Xverse API 的 Rune indexer adapter，支持 balance、UTXO 和 activity-based transfer proof 查询。
- 用于确定性测试的 mock Rune indexer。
- 保留现有 API `transfer.bitcoin.psbtBase64` fixture boundary，用于服务端 PaymentIntent 集成测试。

仍然明确不做：

- Rune etching。
- Ordinal inscription。
- NFT minting。
- 托管。
- Token 定价。
- 二级市场路由。
- RedeemLoop 自营生产级 Rune PSBT engine。

### 真实可用度状态

v0.4.1 不再只是静态 adapter fixture。商户集成现在可以调用真实钱包转账方法：

```ts
import { createUniSatRuneWalletAdapter } from "@redeemloop/adapters";

const wallet = createUniSatRuneWalletAdapter(window.unisat);
const account = await wallet.connect();
const result = await wallet.requestRuneTransfer?.({
  to: "bc1merchant",
  runeId: "840000:3",
  amount: "10",
  feeRate: 15,
});
```

```ts
import { request } from "sats-connect";
import { createXverseRuneWalletAdapter } from "@redeemloop/adapters";

const wallet = createXverseRuneWalletAdapter(request);
const account = await wallet.connect();
const result = await wallet.requestRuneTransfer?.({
  to: "bc1merchant",
  runeName: "UNCOMMON•GOODS",
  amount: "10",
});
```

也可以使用 indexer-backed proof lookup：

```ts
import { createXverseRuneIndexerAdapter } from "@redeemloop/adapters";

const indexer = createXverseRuneIndexerAdapter({
  apiKey: process.env.XVERSE_API_KEY!,
  network: "mainnet",
});

const proof = await indexer.getRuneTransferProof({
  intentId: "pi_rune",
  txid: "bitcoin_txid",
  asset: runeAsset,
  from: "bc1payer",
  to: "bc1merchant",
});
```

剩余限制是认证问题，不是接口形态问题：本仓库在当前机器上尚未使用有余额的 UniSat/Xverse 钱包、真实商户 Rune 收券地址和真实 Xverse API key 完成 live test。因此对外应表述为 beta integration support，而不是已完全认证的生产级支付通道。

旧的 `transfer.bitcoin.psbtBase64` 响应仍然保留。在 v0.4.1 中，它仍是 adapter integration test 的 fixture boundary。真实商户流程应优先使用钱包原生转账方法，然后用 indexer-backed proof confirmation 完成收券确认。

本 adapter surface 参考的官方集成文档：

- [UniSat Wallet API](https://docs.unisat.io/developer-support/open-api-documentation/unisat-wallet)
- [Xverse Sats Connect signPsbt](https://docs.xverse.app/sats-connect/bitcoin-methods/signpsbt)
- [Xverse Sats Connect runes_transfer](https://docs.xverse.app/sats-connect/bitcoin-methods/runes_transfer)
- [Xverse Rune API](https://docs.xverse.app/api/runes)
