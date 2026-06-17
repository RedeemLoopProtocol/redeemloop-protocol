# Security Policy

## Status

RedeemLoop `v0.1.0` is unaudited prototype code for local development and public review.

Do not use it with real funds, live customer data, production redemption inventory, or mainnet deployments without independent review.

## Supported Versions

| Version | Supported |
|---------|-----------|
| `v0.1.x` | Security fixes accepted |

## Reporting a Vulnerability

Use GitHub Security Advisories if enabled for this repository.

If private advisories are not enabled, open a minimal public issue asking for a maintainer security contact. Do not include exploit details, private keys, customer data, or live vulnerable endpoints in a public issue.

## Security Boundaries

Phase 0 includes:

- local Solidity contracts
- local Fastify relayer prototype
- local Next.js POS verifier demo

Phase 0 does not include:

- production wallet/key custody
- production database persistence
- rate limiting
- abuse monitoring
- legal/compliance enforcement
- audited smart contracts

## Production Requirements

Before production use:

- complete a smart contract audit
- use a multisig-controlled merchant vault
- replace in-memory relayer state with persistent storage
- enforce rate limits and replay protection at the service layer
- add operational monitoring and alerting
- obtain jurisdiction-specific legal review
- ensure PII remains off-chain
