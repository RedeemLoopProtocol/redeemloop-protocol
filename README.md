# RedeemLoop Protocol

RedeemLoop is an FT-first redemption voucher protocol for goods and services.

Core rule:

```text
1 voucher token = 1 complete redemption right for a specific good or service
```

The first public release is a local EVM prototype and foundation for the roadmap in [docs/ROADMAP.md](docs/ROADMAP.md). It proves the smallest closed loop:

```text
ERC-20 voucher -> user EIP-712 signature -> POS relayer -> burn or collect -> MerchantVault -> commerce mark-as-paid
```

RedeemLoop is not a points system, stored-value balance, discount coupon, marketplace, or NFT-first project. Bitcoin Rune, Fractal Bitcoin, inscription/NFT, marketplace, and KYC adapters are intentionally out of scope for `v0.1.0`.

## What Is Included

- `packages/contracts`: Foundry contracts and tests
  - `RedeemLoopERC20Voucher`
  - `MerchantVault`
  - `StoreTerminalRegistry`
  - `IRedeemLoopVoucher`
- `services/api`: Fastify relayer prototype
  - terminal registration
  - merchant EVM voucher receiving address
  - EIP-712 redemption intent creation
  - signature verification
  - dry-run or transaction submission
  - commerce payment intent and confirmation endpoints
  - Shopify `orderMarkAsPaid` dry-run/live adapter
  - WooCommerce `set_paid` dry-run/live adapter
  - Shopify and WooCommerce HMAC-verified mark-as-paid webhook endpoints
- `apps/pos-verifier`: Next.js POS verifier demo
  - terminal setup
  - EVM ERC-20 voucher payment button
  - merchant receiver setup
  - Shopify/WooCommerce/custom order metadata
  - QR/deep link generation
  - wallet signing
  - relayer submission
  - commerce mark-as-paid confirmation
- `docs` and `whitepaper`: protocol design notes and construction docs

## Requirements

- Node.js 22+
- pnpm 10+
- Foundry 1.7+

## Install

```bash
pnpm install
cd packages/contracts
forge install foundry-rs/forge-std --no-git
cd ../..
```

## Verify

Run the full local release gate:

```bash
pnpm verify
pnpm audit --audit-level moderate
```

Individual commands:

```bash
pnpm lint
pnpm test
pnpm build
pnpm contracts:test
```

## Local Anvil Demo

Terminal 1:

```bash
pnpm anvil
```

Terminal 2:

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export DEMO_USER=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
export TERMINAL_OPERATOR=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

forge script packages/contracts/script/DeployPhase0.s.sol:DeployPhase0 \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

The private key above is Anvil's well-known local development key. Never use it on a public network or with real funds.

Terminal 3:

```bash
pnpm api:dev
```

Terminal 4:

```bash
pnpm pos:dev
```

Open `http://localhost:3000`.

Flow:

1. Register the terminal.
2. Paste the deployed voucher token address.
3. Set the merchant receiver address.
4. Enter the commerce provider and order ID.
5. Connect a wallet on Anvil chain `31337`.
6. Click `Pay` to create the EVM voucher payment and commerce intent.
7. Sign the EIP-712 message.
8. Submit it through the relayer.
9. Mark the commerce order as paid.

By default the relayer runs in dry-run mode, which verifies signatures without submitting a transaction. To submit transactions:

```bash
RELAYER_DRY_RUN=false \
RPC_URL=http://127.0.0.1:8545 \
RELAYER_PRIVATE_KEY=0x... \
pnpm api:dev
```

## Contract Model

`RedeemLoopERC20Voucher` is an ERC-20 with:

- `decimals() = 0`
- fixed `maxSupply`
- mint role
- `sealMinting`
- pause control
- immutable `merchantId`
- immutable `termsHash`
- configured `merchantVault`
- configured redemption mode: `BURN` or `COLLECT`
- EIP-712 `collectWithAuthorization`
- EIP-712 `burnWithAuthorization`

`COLLECT` transfers tokens into `MerchantVault`. `BURN` destroys tokens and reduces total supply.

No private customer data is written on-chain. Shipping addresses, phone numbers, names, order notes, and other PII must stay off-chain.

## API Prototype

The relayer exposes:

```http
GET  /health
GET  /v1/config
POST /v1/merchants/:merchantId/receiving-address
GET  /v1/merchants/:merchantId/receiving-address
POST /v1/terminals/register
POST /v1/commerce/payment-intents
POST /v1/commerce/confirm
POST /v1/webhooks/shopify/mark-as-paid
POST /v1/webhooks/woocommerce/mark-as-paid
POST /v1/redemptions/intents
POST /v1/redemptions/submit
```

The relayer never signs for users. It verifies user-signed typed data and either dry-runs the submission or calls the voucher contract with the configured relayer key.

Commerce adapters are dry-run by default. To enable platform writes, set `RELAYER_DRY_RUN=false` and provide the relevant credentials:

```bash
SHOPIFY_SHOP_DOMAIN=your-development-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_WEBHOOK_SECRET=...

WOOCOMMERCE_STORE_URL=https://merchant.example
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
WOOCOMMERCE_WEBHOOK_SECRET=...
```

## Security Status

This is unaudited prototype code for local development and review. Do not deploy to mainnet or handle real redemption inventory before:

- independent smart contract audit
- legal review for the target jurisdiction
- production vault multisig
- persistent database-backed relayer state
- rate limiting and abuse monitoring
- production key management

See [SECURITY.md](SECURITY.md) and [docs/SECURITY_COMPLIANCE.md](docs/SECURITY_COMPLIANCE.md).

## Documentation

- [Construction](docs/CONSTRUCTION.md)
- [Protocol spec](docs/PROTOCOL_SPEC.md)
- [Contract blueprint](docs/CONTRACT_BLUEPRINT.md)
- [API and data model](docs/API_AND_DATA_MODEL.md)
- [Integration guide](docs/INTEGRATION_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)
- [Whitepaper](whitepaper/RedeemLoop_Whitepaper.md)

## Release

Current release target: `v0.1.0`.

Before tagging:

```bash
pnpm verify
pnpm audit --audit-level moderate
```

Then follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

## License

MIT. See [LICENSE](LICENSE).
