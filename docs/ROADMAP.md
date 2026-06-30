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
- Snapshot-backed Postgres persistence with migration boundary for beta deployments.
- Standalone webhook worker process with delivery lease semantics and request timeouts.
- Webhook operations diagnostics for failed, dead-letter, stale `processing`, and worker drain recency.
- Default `/v1` API rate limiting plus CORS and rate-limit readiness diagnostics.
- Beta readiness checker for API health, persistence kind, webhook worker heartbeat, EVM RPC diagnostics, Shopify diagnostics, and optional Docker Compose config.
- Docker Compose smoke command for API, Postgres persistence, worker heartbeat, and console readiness.
- Manual GitHub Actions workflow for Docker Compose smoke evidence when local Docker is unavailable.
- Beta evidence manifest validator for external compose, production readiness, funded EVM, WooCommerce, optional Shopify, and release-note artifacts.
- Beta evidence scaffold for local release evidence folders with intentionally failing placeholders.
- Funded EVM wallet certification evidence generator backed by read-only RPC receipt checks.
- Commerce mark-as-paid certification evidence generator with dry-run rejection in beta validation.
- Final beta release gate for evidence, bilingual release notes, README links, CI/Pages workflow presence, and workspace version consistency.
- Workspace beta version preparation command for release-tag alignment.
- Public-safe bilingual beta release evidence summary generator for GitHub Release notes.
- Public release privacy gate for secret-like text and local filesystem path leakage.
- Active pnpm workspace override checks for beta dependency hygiene.
- Frozen lockfile release gate for package/lockfile publication consistency.
- Compose-smoke evidence workflow release gate to preserve the Docker evidence path before beta publication.
- Production-readiness evidence workflow with secret-backed EVM RPC injection and release-gate coverage.
- Funded EVM wallet and WooCommerce certification evidence workflows with release-gate coverage.
- Release-note path guard for public-safe beta evidence summaries.
- Beta release execution plan that narrows publication to the remaining live evidence and release-note artifacts.
- Read-only beta release preflight that converts evidence and repository secret gaps into operator next actions.
- GitHub Actions beta release preflight workflow for collecting existing evidence artifacts and uploading a preflight report.
- Cross-artifact beta evidence consistency checks tying WooCommerce mark-as-paid evidence to the same funded EVM transaction, PaymentIntent, token, receiver, and amount.
- Bilingual beta operator runbook for the remaining external certification and publication steps.
- Public Markdown release artifact checks that reject full EVM addresses and transaction hashes before beta publication.
- Local GitHub Actions evidence artifact download command with overwrite protection for non-placeholder evidence.
- Beta release preflight workflow reuse of the shared evidence artifact download command.

Current status: v0.10.29 makes the beta release preflight workflow reuse the shared evidence artifact download command, building on v0.10.28 local GitHub Actions evidence artifact download tooling, v0.10.27 public release metadata privacy checks, v0.10.26 bilingual beta operator runbook, v0.10.25 non-destructive beta evidence scaffold recovery, v0.10.24 evidence consistency checks that require WooCommerce mark-as-paid evidence to match the funded EVM transaction evidence, v0.10.23 preflight artifact-download hardening, v0.10.22 GitHub Actions preflight reporting, v0.10.21 read-only local preflight, v0.10.20 release-note path guarding, v0.10.19 manual GitHub Actions workflows for funded EVM wallet and WooCommerce mark-as-paid certification evidence, v0.10.18 production-readiness evidence workflow, v0.10.17 beta release gate check for the compose-smoke evidence workflow, v0.10.16 GitHub Actions-based Docker Compose smoke evidence generation and JSON-safe compose-smoke output, v0.10.15 API rate limits, stricter CORS/rate-limit diagnostics, and safer production environment checks, v0.10.14 frozen lockfile release gate, v0.10.13 pnpm workspace override hygiene, v0.10.12 public release privacy checks, v0.10.11 public-safe bilingual beta release evidence summary generator, v0.10.10 workspace beta version preparation command, v0.10.9 final beta release gate, v0.10.8 commerce mark-as-paid certification evidence generator, v0.10.7 funded EVM wallet certification evidence generator, v0.10.6 safe beta evidence scaffold, v0.10.5 beta evidence manifest validator, v0.10.4 Docker Compose smoke command, v0.10.3 beta readiness evidence command, v0.10.2 webhook operations diagnostics, v0.10.1 standalone webhook worker boundary, and v0.10.0 Postgres snapshot persistence. The remaining publication distance is tracked in [Beta Release Execution Plan](BETA_RELEASE_EXECUTION_PLAN.md): funded-wallet evidence, WooCommerce test-store evidence, commerce certification secret, and generated public beta release notes still need to be produced before production-certified beta claims.

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
Current status: v0.9.0 adds POS QR and livestream short-link hosted payment page alpha on the same PaymentIntent reconciliation model.

## Phase 4

- Multi-indexer failover.
- Merchant circulation and redistribution console.
- Global voucher rules.
- Secondary transfer analytics.

## Boundary

Across all phases, RedeemLoop remains a non-issuing voucher payment gateway. Asset creation, token launch tooling, Rune etching, Ordinal inscription, NFT minting, custody, token pricing, secondary markets, commerce replacement, logistics, tax, and after-sales systems stay outside the core product.
