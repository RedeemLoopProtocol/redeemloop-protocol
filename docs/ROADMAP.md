# RedeemLoop Roadmap

This roadmap is the public product direction after the v0.2 Phase 0 realignment.

## Phase 0

- EVM ERC-20 voucher payment button.
- Merchant receiving address.
- Shopify / WooCommerce mark-as-paid webhook and adapter surface.
- Asset Binding, Voucher Tender, PaymentIntent, receipt confirmation, and mark-as-paid loop.

## Phase 1

- Bitcoin Rune payment adapter.
- UniSat / Xverse wallet adapter using wallet-native transfer methods.
- Rune indexer adapter, starting with Xverse API-backed balance, UTXO, and activity proof lookup.
- Production PSBT builder remains a later hardening target; v0.4.1 keeps PSBT output as a fixture boundary.

Current status: v0.4.1 provides beta integration support, not live-certified production support.

## Phase 2

- Fractal Bitcoin Rune adapter.
- Fractal inscription adapter.
- Fractal indexer adapter.

## Phase 3

- Inscription / NFT voucher adapter.
- POS QR payment.
- Livestream commerce short links.
- Mini-program SDK.

## Phase 4

- Multi-indexer failover.
- Merchant circulation and redistribution console.
- Global voucher rules.
- Secondary transfer analytics.

## Boundary

Across all phases, RedeemLoop remains a non-issuing voucher payment gateway. Asset creation, token launch tooling, Rune etching, Ordinal inscription, NFT minting, custody, token pricing, secondary markets, commerce replacement, logistics, tax, and after-sales systems stay outside the core product.
