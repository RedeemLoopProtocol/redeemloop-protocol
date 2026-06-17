# Roadmap

This roadmap is the public product direction for RedeemLoop after the first EVM prototype.

## Current v0.1.0 Status

Implemented:

- EVM ERC-20 voucher contract foundation.
- Merchant vault collection flow.
- Store/terminal authorization registry.
- EIP-712 `collectWithAuthorization` and `burnWithAuthorization`.
- Basic Fastify relayer prototype.
- Local POS verifier demo.
- EVM ERC-20 voucher payment button in the POS verifier.
- Merchant EVM voucher receiving address endpoint and UI.
- Shopify / WooCommerce mark-as-paid dry-run/live adapter endpoints.
- HMAC-verified Shopify and WooCommerce mark-as-paid webhook endpoints.

Not yet implemented:

- Bitcoin Rune, Fractal Bitcoin, inscription, NFT, live commerce, mini-program, and multi-indexer adapters.

## Phase 0 - EVM Commerce Voucher

- EVM ERC-20 voucher payment button.
- Merchant voucher receiving address.
- Shopify / WooCommerce mark-as-paid webhook.

Goal:

```text
Merchant checkout -> user pays/redeems with ERC-20 voucher -> merchant receives/collects voucher -> commerce platform marks order as paid.
```

## Phase 1 - Bitcoin Rune Payment Adapter

- Bitcoin Rune payment adapter.
- UniSat / Xverse wallet adapter.
- Rune indexer adapter.
- PSBT builder.

Goal:

```text
Bitcoin Rune voucher -> wallet signing -> PSBT payment/redemption -> indexer confirmation -> merchant settlement event.
```

## Phase 2 - Fractal Bitcoin Adapters

- Fractal Bitcoin Rune adapter.
- Fractal inscription adapter.
- Fractal indexer adapter.

Goal:

```text
Fractal Bitcoin voucher assets -> wallet/indexer adapter -> payment or redemption proof -> merchant fulfillment.
```

## Phase 3 - Inscription, POS, Live Commerce, Mini Program

- Inscription / NFT voucher adapter.
- POS QR payment.
- Live commerce short link.
- Mini-program SDK.

Goal:

```text
Voucher redemption works across physical POS, livestream shopping links, mini-program flows, and inscription/NFT voucher formats.
```

## Phase 4 - Resilience, Merchant Operations, Global Rules

- Multi-indexer failover.
- Merchant recycling/distribution console.
- Global voucher rules.
- Secondary circulation analytics.

Goal:

```text
Production-grade merchant operations with indexer redundancy, controlled redistribution, jurisdiction-aware rules, and circulation insights.
```
