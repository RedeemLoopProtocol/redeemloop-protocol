// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Receives collected voucher tokens and enforces a quarantine delay before redistribution.
contract MerchantVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant VOUCHER_RECORDER_ROLE = keccak256("VOUCHER_RECORDER_ROLE");

    uint256 public quarantinePeriod;
    mapping(address voucherToken => uint256 untilTimestamp) public quarantineUntil;

    event VoucherCollectionRecorded(address indexed voucherToken, uint256 amount, uint256 quarantineUntil);
    event VoucherDistributed(address indexed voucherToken, address indexed to, uint256 amount);
    event QuarantinePeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    error RedeemLoopZeroAddress();
    error RedeemLoopInvalidAmount();
    error RedeemLoopUnauthorizedRecorder();
    error RedeemLoopVaultQuarantineActive(uint256 untilTimestamp);

    constructor(address admin, uint256 initialQuarantinePeriod) {
        if (admin == address(0)) revert RedeemLoopZeroAddress();

        quarantinePeriod = initialQuarantinePeriod;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DISTRIBUTOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(VOUCHER_RECORDER_ROLE, admin);
    }

    function recordCollection(address voucherToken, uint256 amount) external whenNotPaused {
        if (voucherToken == address(0)) revert RedeemLoopZeroAddress();
        if (amount == 0) revert RedeemLoopInvalidAmount();
        if (msg.sender != voucherToken && !hasRole(VOUCHER_RECORDER_ROLE, msg.sender)) {
            revert RedeemLoopUnauthorizedRecorder();
        }

        uint256 newQuarantineUntil = block.timestamp + quarantinePeriod;
        if (newQuarantineUntil > quarantineUntil[voucherToken]) {
            quarantineUntil[voucherToken] = newQuarantineUntil;
        }

        emit VoucherCollectionRecorded(voucherToken, amount, quarantineUntil[voucherToken]);
    }

    function distribute(address voucherToken, address to, uint256 amount)
        external
        onlyRole(DISTRIBUTOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (voucherToken == address(0) || to == address(0)) revert RedeemLoopZeroAddress();
        if (amount == 0) revert RedeemLoopInvalidAmount();
        uint256 lockedUntil = quarantineUntil[voucherToken];
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < lockedUntil) revert RedeemLoopVaultQuarantineActive(lockedUntil);

        IERC20(voucherToken).safeTransfer(to, amount);
        emit VoucherDistributed(voucherToken, to, amount);
    }

    function voucherBalance(address voucherToken) external view returns (uint256) {
        return IERC20(voucherToken).balanceOf(address(this));
    }

    function setQuarantinePeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldPeriod = quarantinePeriod;
        quarantinePeriod = newPeriod;
        emit QuarantinePeriodUpdated(oldPeriod, newPeriod);
    }

    function rescueToken(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (token == address(0) || to == address(0)) revert RedeemLoopZeroAddress();
        if (amount == 0) revert RedeemLoopInvalidAmount();

        IERC20(token).safeTransfer(to, amount);
        emit TokenRescued(token, to, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
