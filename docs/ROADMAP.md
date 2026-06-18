# RedeemLoop Roadmap

This roadmap is the public product direction after the v0.2 Phase 0 realignment.

## Phase 0

- EVM ERC-20 voucher payment button.
- Merchant receiving address.
- Shopify / WooCommerce mark-as-paid webhook and adapter surface.
- Asset Binding, Voucher Tender, PaymentIntent, receipt confirmation, and mark-as-paid loop.
- ETH, BSC, Polygon PoS, and Arbitrum wallet send support through EIP-1193 injected wallets.
- EVM live certification console, wallet error taxonomy, and RPC health diagnostics for pilot runs.
- Phase 0 hardening: vault ownership challenge, PaymentIntent expiration cleanup, audit logs, and webhook drain operations.
- Merchant admin pilot console for vaults, bindings, PaymentIntents, webhooks, deliveries, and audit logs.
- WooCommerce pilot improvements with admin diagnostics and SKU-to-binding mapping.
- Shopify private-app mark-as-paid alpha with Admin API diagnostics and mocked GraphQL tests.

Current status: v0.5.1 provides EVM pilot-certification tooling, Phase 0 hardening, a local merchant operations console, WooCommerce pilot mapping, and Shopify private-app mark-as-paid alpha support. Funded wallet runs and live commerce-store certification are still required before production-certified claims.

## Phase 1

- Bitcoin Rune payment adapter.
- UniSat / Xverse wallet adapter using wallet-native transfer methods.
- Rune indexer adapter, starting with Xverse API-backed balance, UTXO, and activity proof lookup.
- API-level Rune settlement recheck from txid to `VoucherPaymentProof`.
- Multi-indexer failover adapter boundary and manual-review recovery for indexer lag.
- Production PSBT builder remains a later hardening target; v0.4.2 keeps PSBT output as a fixture boundary.

Current status: v0.6.0 provides certification-track hardening, not live-certified production support.

## Phase 2

- Fractal Bitcoin Rune adapter.
- Fractal inscription adapter.
- Fractal indexer adapter.

Current status: v0.7.0 provides mocked alpha adapter boundaries, not live-certified Fractal support.

## Phase 3

- Inscription / NFT voucher adapter.
- POS QR payment.
- Livestream commerce short links.
- Mini-program SDK.

Current status: v0.7.0 provides generic mocked ownership/transfer proof boundaries for inscription, ERC-721, and ERC-1155 voucher assets.
Current status: v0.8.0 adds POS QR and livestream short-link pilot APIs backed by the same PaymentIntent reconciliation model.

## Phase 4

- Multi-indexer failover.
- Merchant circulation and redistribution console.
- Global voucher rules.
- Secondary transfer analytics.

## Boundary

Across all phases, RedeemLoop remains a non-issuing voucher payment gateway. Asset creation, token launch tooling, Rune etching, Ordinal inscription, NFT minting, custody, token pricing, secondary markets, commerce replacement, logistics, tax, and after-sales systems stay outside the core product.
