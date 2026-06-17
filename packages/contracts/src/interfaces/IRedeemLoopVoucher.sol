// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @notice Draft interface for RedeemLoop FT-first voucher redemptions.
/// @dev This is a scaffold for implementation, not audited production code.
interface IRedeemLoopVoucher {
    enum RedemptionMode {
        BURN,
        COLLECT,
        LOCK_AND_BURN,
        LOCK_AND_COLLECT
    }

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

    event VoucherIssued(
        address indexed voucherToken, address indexed to, uint256 indexed tokenId, uint256 amount, bytes32 campaignId
    );

    event VoucherRedeemed(
        bytes32 indexed redemptionId,
        address indexed user,
        address indexed voucherToken,
        uint256 tokenId,
        uint256 amount,
        uint8 redemptionMode,
        address settlementTarget,
        bytes32 storeId,
        bytes32 termsHash
    );

    event VoucherReissued(
        address indexed voucherToken,
        address indexed fromVault,
        address indexed to,
        uint256 tokenId,
        uint256 amount,
        bytes32 campaignId
    );

    event MintingSealed(address indexed voucherToken);

    function collectWithAuthorization(RedeemAuthorization calldata authorization, bytes calldata signature)
        external
        returns (bytes32 redemptionId);

    function burnWithAuthorization(RedeemAuthorization calldata authorization, bytes calldata signature)
        external
        returns (bytes32 redemptionId);

    function termsHash() external view returns (bytes32);

    function merchantId() external view returns (bytes32);

    function merchantVault() external view returns (address);
}
