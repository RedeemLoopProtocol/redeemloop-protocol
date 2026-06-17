# Security Policy

## Status

RedeemLoop `v0.2.0` is unaudited prototype code for local development and public review.

Do not use it with real funds, live customer data, production order flows, or mainnet deployments without independent security and legal review.

## Supported Versions

| Version | Supported |
|---------|-----------|
| `v0.2.x` | Security fixes accepted |

## Reporting a Vulnerability

Use GitHub Security Advisories if enabled for this repository.

If private advisories are not enabled, open a minimal public issue asking for a maintainer security contact. Do not include exploit details, private keys, customer data, or live vulnerable endpoints in a public issue.

## Security Boundaries

Phase 0 includes:

- protocol types, validators, and PaymentIntent state machine
- in-memory Fastify API prototype
- commerce mark-as-paid adapter surface
- local Next.js Phase 0 console
- unaudited EVM example contracts

Phase 0 does not include:

- production wallet/key custody
- production database persistence
- rate limiting
- abuse monitoring
- legal/compliance enforcement
- audited smart contracts
- token issuance or marketplace functionality

## Production Requirements

Before production use:

- complete independent security review
- replace in-memory service state with persistent storage
- enforce API authentication, rate limits, and replay protection
- use multisig-controlled merchant receiving addresses where appropriate
- monitor settlement proof, webhook, and mark-as-paid failures
- obtain jurisdiction-specific legal review
- keep PII off-chain and out of webhook payloads unless strictly required
