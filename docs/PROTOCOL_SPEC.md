# RedeemLoop Protocol Spec v0.1

## 1. Core Thesis

RedeemLoop represents redeemable goods and services as fungible or multi-fungible voucher tokens. The canonical unit is:

```text
1 token = 1 full redemption right
```

A redemption is a business event. The settlement action can be burn, collect, lock-and-burn, or lock-and-collect.

## 2. Token Profiles

### ERC20Voucher

- One contract per voucher class.
- `decimals() = 0`.
- `maxSupply` required.
- `termsHash` required.
- `merchantVault` required.
- Optional mint sealing.
- Recommended for MVP.

### ERC6909VoucherBook

- One contract manages many voucher ids.
- Each id is a fungible voucher class.
- Good for brands with many SKUs.
- Recommended for phase 2.

### ERC1155VoucherBook

- Compatibility layer for existing multi-token tooling.
- Good for SFT batches, expiry dates, and marketplace display.

### NFTVoucher

- Optional only.
- Use for unique, serialized, or collectible rights.

## 3. Redemption Modes

```solidity
enum RedemptionMode {
    BURN,
    COLLECT,
    LOCK_AND_BURN,
    LOCK_AND_COLLECT
}
```

## 4. EIP-712 Authorization

Typed data name: `RedeemLoopRedemption`  
Version: `1`  
Domain fields:

```text
name
version
chainId
verifyingContract
```

Message:

```solidity
struct RedeemAuthorization {
    address user;
    address voucherToken;
    uint256 tokenId;
    uint256 amount;
    bytes32 merchantId;
    bytes32 storeId;
    bytes32 terminalId;
    bytes32 termsHash;
    uint8 redemptionMode;
    uint256 nonce;
    uint256 deadline;
}
```

## 5. Events

```solidity
event VoucherIssued(address indexed voucherToken, address indexed to, uint256 indexed tokenId, uint256 amount, bytes32 campaignId);
event VoucherRedeemed(bytes32 indexed redemptionId, address indexed user, address indexed voucherToken, uint256 tokenId, uint256 amount, uint8 redemptionMode, address settlementTarget, bytes32 storeId, bytes32 termsHash);
event VoucherReissued(address indexed voucherToken, address indexed fromVault, address indexed to, uint256 tokenId, uint256 amount, bytes32 campaignId);
event MintingSealed(address indexed voucherToken);
event TerminalAuthorized(bytes32 indexed merchantId, bytes32 indexed storeId, bytes32 indexed terminalId, address operator);
event TerminalRevoked(bytes32 indexed merchantId, bytes32 indexed storeId, bytes32 indexed terminalId);
```

## 6. Invariants

- `decimals == 0` for ERC20Voucher.
- If `supplyPolicy == FIXED_SEALED`, minting must never resume after seal.
- A nonce can only be consumed once per user.
- A redemption authorization cannot be used after deadline.
- A collect redemption moves tokens to the configured vault.
- A burn redemption reduces total supply.
- PII must not be emitted on-chain.

## 7. Recommended Chain

MVP should target one low-fee EVM L2. Chain selection is a deployment concern; the protocol must remain EVM-compatible.
