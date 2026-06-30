# RedeemLoop v0.10.7 Release Notes

## English

v0.10.7 adds a read-only EVM certification evidence generator for funded wallet beta runs.

### Added

- `pnpm beta:evidence:evm` reads a transaction receipt from RPC and writes `evm-wallet-certification.json`.
- The command verifies RPC chain ID, successful receipt status, confirmation count, receipt sender, ERC-20 contract, merchant vault receiver, and Transfer amount.
- The beta evidence validator now requires an ERC-20 contract address and validates EVM tx hash, addresses, amount, and confirmations.
- The beta evidence scaffold now points EVM operators at the generator command.

### Verification

- `node --check scripts/create-evm-certification-evidence.mjs`
- `node scripts/create-evm-certification-evidence.mjs --help`
- `corepack pnpm --silent beta:evidence:evm -- --help`
- Local mock RPC evidence generation and manifest validation: 5 pass, 1 optional Shopify warning, 0 fail.
- `corepack pnpm verify`

### Remaining Beta Gap

The generator is not a wallet sender and does not touch private keys. A real funded wallet transfer must happen first, then the generator can turn that receipt into release evidence.

## 中文

v0.10.7 新增只读 EVM certification evidence generator，用于 funded wallet beta run。

### 新增

- `pnpm beta:evidence:evm` 会从 RPC 读取 transaction receipt，并写出 `evm-wallet-certification.json`。
- 命令会校验 RPC chain ID、successful receipt status、confirmation count、receipt sender、ERC-20 contract、商户 vault receiver 和 Transfer amount。
- Beta evidence validator 现在要求 ERC-20 contract address，并校验 EVM tx hash、地址、amount 和 confirmations。
- Beta evidence scaffold 现在会指向 EVM generator 命令。

### 验证

- `node --check scripts/create-evm-certification-evidence.mjs`
- `node scripts/create-evm-certification-evidence.mjs --help`
- `corepack pnpm --silent beta:evidence:evm -- --help`
- 本地 mock RPC evidence generation 与 manifest validation：5 pass、1 个可选 Shopify warning、0 fail。
- `corepack pnpm verify`

### 剩余 Beta 缺口

Generator 不是钱包发送器，也不接触私钥。必须先完成真实 funded wallet transfer，然后再用该 generator 把 receipt 转成 release evidence。
