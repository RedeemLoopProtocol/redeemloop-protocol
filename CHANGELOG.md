# Changelog

## v0.1.0 - 2026-06-17

First public source release candidate.

### Added

- Foundry Solidity package for Phase 0.
- ERC-20 voucher with `decimals() = 0`, max supply, mint sealing, pause, and EIP-712 redemption authorization.
- `MerchantVault` with collection recording, quarantine, distribution, rescue, roles, and pause.
- `StoreTerminalRegistry` with merchant/store/terminal authorization.
- Foundry deployment script for local Anvil Phase 0 demo.
- Contract tests for max supply, mint sealing, decimals, collect, burn, nonce replay, expired authorization, unauthorized terminal, wrong terms hash, pause, vault quarantine, and fuzzed amount/nonce.
- Fastify relayer prototype with terminal registration, redemption intents, signature verification, dry-run mode, and transaction submission path.
- Merchant EVM voucher receiving address API and POS setup flow.
- Commerce payment intent and confirmation API for EVM ERC-20 voucher checkout.
- Shopify `orderMarkAsPaid` adapter with dry-run/live request path.
- WooCommerce order `set_paid` adapter with dry-run/live request path.
- HMAC-verified Shopify and WooCommerce mark-as-paid webhook endpoints.
- Next.js POS verifier demo with QR/deep link generation, EVM voucher payment button, commerce order fields, and wallet EIP-712 signing.
- Public release documentation, security notes, contribution guide, and CI workflow.
- Public roadmap updated for EVM commerce vouchers, Bitcoin Rune adapters, Fractal Bitcoin adapters, inscription/NFT adapters, POS QR, live commerce links, mini-program SDK, multi-indexer failover, merchant redistribution console, global rules, and secondary circulation analytics.

### Security

- `pnpm audit --audit-level moderate` passes with no known vulnerabilities.
- Relayer input validation added for chain IDs, signatures, authorization payloads, deadline windows, and integer fields.
- Shopify and WooCommerce webhook signature verification uses base64 HMAC-SHA256 over the raw request body.
- Commerce adapter responses redact platform credentials.
- No private customer data is stored on-chain by the Phase 0 contracts.

### Known Limitations

- Contracts are unaudited.
- Relayer state is in-memory only.
- POS verifier is a local demo, not a production merchant console.
- Shopify/WooCommerce adapters are prototype integrations and default to dry-run.
- No Bitcoin Rune, Fractal Bitcoin, inscription/NFT, marketplace, points, bridge, KYC, inventory, ERC-6909, or ERC-1155 implementation in this release.
