// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IRedeemLoopVoucher} from "./interfaces/IRedeemLoopVoucher.sol";
import {MerchantVault} from "./MerchantVault.sol";
import {StoreTerminalRegistry} from "./StoreTerminalRegistry.sol";

/// @notice ERC-20 voucher where 1 token equals 1 complete goods/services redemption right.
contract RedeemLoopERC20Voucher is ERC20, AccessControl, Pausable, EIP712, ReentrancyGuard, IRedeemLoopVoucher {
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bytes32 public constant REDEEM_AUTHORIZATION_TYPEHASH = keccak256(
        "RedeemAuthorization(address user,address voucherToken,uint256 tokenId,uint256 amount,bytes32 merchantId,bytes32 storeId,bytes32 terminalId,bytes32 termsHash,uint8 redemptionMode,uint256 nonce,uint256 deadline)"
    );

    bytes32 public immutable override merchantId;
    bytes32 public immutable override termsHash;
    uint256 public immutable maxSupply;
    StoreTerminalRegistry public immutable terminalRegistry;

    address public override merchantVault;
    bool public mintingSealed;
    RedemptionMode public redemptionMode;
    mapping(address user => mapping(uint256 nonce => bool used)) public usedNonces;

    error RedeemLoopZeroAddress();
    error RedeemLoopZeroId();
    error RedeemLoopInvalidAmount();
    error RedeemLoopMintingSealed();
    error RedeemLoopMaxSupplyExceeded();
    error RedeemLoopDeadlineExpired();
    error RedeemLoopNonceUsed();
    error RedeemLoopInvalidSignature();
    error RedeemLoopWrongVoucherToken();
    error RedeemLoopInvalidTokenId();
    error RedeemLoopWrongMerchant();
    error RedeemLoopWrongTerms();
    error RedeemLoopWrongMode();
    error RedeemLoopUnauthorizedTerminal();

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 merchantId_,
        bytes32 termsHash_,
        address merchantVault_,
        StoreTerminalRegistry terminalRegistry_,
        uint256 maxSupply_,
        RedemptionMode redemptionMode_,
        address admin
    ) ERC20(name_, symbol_) EIP712("RedeemLoopRedemption", "1") {
        if (admin == address(0) || merchantVault_ == address(0) || address(terminalRegistry_) == address(0)) {
            revert RedeemLoopZeroAddress();
        }
        if (merchantId_ == bytes32(0) || termsHash_ == bytes32(0)) revert RedeemLoopZeroId();
        if (maxSupply_ == 0) revert RedeemLoopInvalidAmount();
        if (redemptionMode_ != RedemptionMode.BURN && redemptionMode_ != RedemptionMode.COLLECT) {
            revert RedeemLoopWrongMode();
        }

        merchantId = merchantId_;
        termsHash = termsHash_;
        merchantVault = merchantVault_;
        terminalRegistry = terminalRegistry_;
        maxSupply = maxSupply_;
        redemptionMode = redemptionMode_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function mint(address to, uint256 amount, bytes32 campaignId) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert RedeemLoopZeroAddress();
        if (amount == 0) revert RedeemLoopInvalidAmount();
        if (mintingSealed) revert RedeemLoopMintingSealed();
        if (totalSupply() + amount > maxSupply) revert RedeemLoopMaxSupplyExceeded();

        _mint(to, amount);
        emit VoucherIssued(address(this), to, 0, amount, campaignId);
    }

    function sealMinting() external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintingSealed = true;
        emit MintingSealed(address(this));
    }

    function collectWithAuthorization(RedeemAuthorization calldata authorization, bytes calldata signature)
        external
        override
        nonReentrant
        whenNotPaused
        returns (bytes32 redemptionId)
    {
        redemptionId = _consumeAuthorization(authorization, signature, RedemptionMode.COLLECT);
        _transfer(authorization.user, merchantVault, authorization.amount);
        MerchantVault(merchantVault).recordCollection(address(this), authorization.amount);

        emit VoucherRedeemed(
            redemptionId,
            authorization.user,
            address(this),
            0,
            authorization.amount,
            uint8(RedemptionMode.COLLECT),
            merchantVault,
            authorization.storeId,
            authorization.termsHash
        );
    }

    function burnWithAuthorization(RedeemAuthorization calldata authorization, bytes calldata signature)
        external
        override
        nonReentrant
        whenNotPaused
        returns (bytes32 redemptionId)
    {
        redemptionId = _consumeAuthorization(authorization, signature, RedemptionMode.BURN);
        _burn(authorization.user, authorization.amount);

        emit VoucherRedeemed(
            redemptionId,
            authorization.user,
            address(this),
            0,
            authorization.amount,
            uint8(RedemptionMode.BURN),
            address(0),
            authorization.storeId,
            authorization.termsHash
        );
    }

    function setMerchantVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newVault == address(0)) revert RedeemLoopZeroAddress();
        merchantVault = newVault;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function hashAuthorization(RedeemAuthorization calldata authorization) external pure returns (bytes32) {
        return _hashAuthorization(authorization);
    }

    function authorizationDigest(RedeemAuthorization calldata authorization) external view returns (bytes32) {
        return _hashTypedDataV4(_hashAuthorization(authorization));
    }

    function _consumeAuthorization(
        RedeemAuthorization calldata authorization,
        bytes calldata signature,
        RedemptionMode expectedMode
    ) private returns (bytes32 redemptionId) {
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > authorization.deadline) revert RedeemLoopDeadlineExpired();
        if (authorization.user == address(0)) revert RedeemLoopZeroAddress();
        if (authorization.voucherToken != address(this)) revert RedeemLoopWrongVoucherToken();
        if (authorization.tokenId != 0) revert RedeemLoopInvalidTokenId();
        if (authorization.amount == 0) revert RedeemLoopInvalidAmount();
        if (authorization.merchantId != merchantId) revert RedeemLoopWrongMerchant();
        if (authorization.termsHash != termsHash) revert RedeemLoopWrongTerms();
        if (authorization.redemptionMode != uint8(expectedMode) || redemptionMode != expectedMode) {
            revert RedeemLoopWrongMode();
        }
        if (usedNonces[authorization.user][authorization.nonce]) revert RedeemLoopNonceUsed();
        if (!terminalRegistry.isTerminalAuthorized(
                authorization.merchantId, authorization.storeId, authorization.terminalId
            )) revert RedeemLoopUnauthorizedTerminal();

        address signer = _hashTypedDataV4(_hashAuthorization(authorization)).recover(signature);
        if (signer != authorization.user) revert RedeemLoopInvalidSignature();

        usedNonces[authorization.user][authorization.nonce] = true;
        redemptionId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                authorization.user,
                authorization.nonce,
                authorization.storeId,
                authorization.terminalId,
                authorization.amount
            )
        );
    }

    function _hashAuthorization(RedeemAuthorization calldata authorization) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                REDEEM_AUTHORIZATION_TYPEHASH,
                authorization.user,
                authorization.voucherToken,
                authorization.tokenId,
                authorization.amount,
                authorization.merchantId,
                authorization.storeId,
                authorization.terminalId,
                authorization.termsHash,
                authorization.redemptionMode,
                authorization.nonce,
                authorization.deadline
            )
        );
    }
}
