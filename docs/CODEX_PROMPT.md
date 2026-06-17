# CODEX PROMPT - RedeemLoop Phase 0

You are implementing RedeemLoop Protocol Phase 0.

Build only the first closed loop:

```text
ERC20Voucher + MerchantVault + StoreTerminalRegistry + collectWithAuthorization + POS Verifier demo + basic API relayer
```

Do not implement NFT, marketplace, points, bridge, or ERC6909 yet.

## Product requirements

- RedeemLoop is FT-first.
- 1 token = 1 full redemption right.
- ERC20 voucher must use decimals = 0.
- Redemption mode must support BURN and COLLECT.
- In COLLECT mode, redeemed tokens transfer to MerchantVault, not burn.
- MerchantVault can later redistribute tokens, but Phase 0 only needs to receive and expose balance.
- User should redeem with EIP-712 signature, not by paying gas.
- Relayer submits the transaction.

## Technical stack

- Solidity 0.8.25+
- Foundry
- OpenZeppelin Contracts
- TypeScript
- Viem
- Fastify or NestJS
- Next.js for POS demo
- PostgreSQL optional for Phase 0; SQLite or in-memory is acceptable for prototype

## Contracts

Implement:

1. `RedeemLoopERC20Voucher.sol`
2. `MerchantVault.sol`
3. `StoreTerminalRegistry.sol`
4. `interfaces/IRedeemLoopVoucher.sol`

## Required tests

- mint respects maxSupply
- decimals equals 0
- sealMinting blocks future mint
- collectWithAuthorization transfers user tokens to vault
- burnWithAuthorization burns user tokens
- nonce replay fails
- expired authorization fails
- unauthorized terminal fails
- wrong termsHash fails
- paused redemption fails

## Frontend demo

Build POS Verifier:

1. Merchant selects store and terminal.
2. POS creates QR/deep link.
3. User connects wallet.
4. User signs EIP-712 authorization.
5. POS relayer submits.
6. UI shows success with tx hash.

## Acceptance criteria

- `forge test` passes.
- `pnpm test` passes for SDK/API if present.
- Local README has exact startup commands.
- Demo can run against local Anvil.
- No private user data is written on-chain.
