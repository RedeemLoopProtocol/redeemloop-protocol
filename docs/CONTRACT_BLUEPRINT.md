# Contract Blueprint

## 1. Contracts

```text
src/
  RedeemLoopERC20Voucher.sol
  MerchantVault.sol
  TermsRegistry.sol
  MerchantRegistry.sol
  StoreTerminalRegistry.sol
  RedemptionRouter.sol
  CampaignDistributor.sol
  interfaces/
    IRedeemLoopVoucher.sol
```

## 2. RedeemLoopERC20Voucher Storage

```solidity
bytes32 public immutable merchantId;
bytes32 public immutable termsHash;
address public merchantVault;
uint256 public immutable maxSupply;
bool public mintingSealed;
RedemptionMode public redemptionMode;
mapping(address => mapping(uint256 => bool)) public usedNonces;
```

## 3. Functions

```solidity
function mint(address to, uint256 amount, bytes32 campaignId) external onlyRole(MINTER_ROLE);
function sealMinting() external onlyRole(DEFAULT_ADMIN_ROLE);
function collectWithAuthorization(RedeemAuthorization calldata auth, bytes calldata signature) external;
function burnWithAuthorization(RedeemAuthorization calldata auth, bytes calldata signature) external;
function setMerchantVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE);
function pause() external onlyRole(PAUSER_ROLE);
function unpause() external onlyRole(PAUSER_ROLE);
```

## 4. Solidity Interface Draft

See `packages/contracts/src/interfaces/IRedeemLoopVoucher.sol`.

## 5. Important Design Notes

- The token itself should not store private order data.
- `collectWithAuthorization` should work without prior ERC-20 approve.
- The contract should use EIP-712 domain separation.
- Use OpenZeppelin ERC20, AccessControl, Pausable, EIP712, ECDSA.
- Do not make upgradeability mandatory in MVP. Prefer immutable simple contracts first.
