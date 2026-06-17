// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Merchant-scoped registry of stores and POS terminals allowed to redeem vouchers.
contract StoreTerminalRegistry is AccessControl, Pausable {
    bytes32 public constant TERMINAL_ADMIN_ROLE = keccak256("TERMINAL_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct Terminal {
        bool authorized;
        address operator;
        uint64 authorizedAt;
    }

    mapping(bytes32 terminalKey => Terminal terminal) private _terminals;

    event TerminalAuthorized(
        bytes32 indexed merchantId, bytes32 indexed storeId, bytes32 indexed terminalId, address operator
    );
    event TerminalRevoked(bytes32 indexed merchantId, bytes32 indexed storeId, bytes32 indexed terminalId);

    error RedeemLoopZeroId();
    error RedeemLoopZeroAddress();

    constructor(address admin) {
        if (admin == address(0)) revert RedeemLoopZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TERMINAL_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function authorizeTerminal(bytes32 merchantId, bytes32 storeId, bytes32 terminalId, address operator)
        external
        onlyRole(TERMINAL_ADMIN_ROLE)
        whenNotPaused
    {
        if (merchantId == bytes32(0) || storeId == bytes32(0) || terminalId == bytes32(0)) {
            revert RedeemLoopZeroId();
        }
        if (operator == address(0)) revert RedeemLoopZeroAddress();

        _terminals[_terminalKey(merchantId, storeId, terminalId)] =
            Terminal({authorized: true, operator: operator, authorizedAt: uint64(block.timestamp)});

        emit TerminalAuthorized(merchantId, storeId, terminalId, operator);
    }

    function revokeTerminal(bytes32 merchantId, bytes32 storeId, bytes32 terminalId)
        external
        onlyRole(TERMINAL_ADMIN_ROLE)
    {
        delete _terminals[_terminalKey(merchantId, storeId, terminalId)];
        emit TerminalRevoked(merchantId, storeId, terminalId);
    }

    function isTerminalAuthorized(bytes32 merchantId, bytes32 storeId, bytes32 terminalId)
        external
        view
        returns (bool)
    {
        if (paused()) return false;
        return _terminals[_terminalKey(merchantId, storeId, terminalId)].authorized;
    }

    function terminalOperator(bytes32 merchantId, bytes32 storeId, bytes32 terminalId) external view returns (address) {
        return _terminals[_terminalKey(merchantId, storeId, terminalId)].operator;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _terminalKey(bytes32 merchantId, bytes32 storeId, bytes32 terminalId) private pure returns (bytes32) {
        return keccak256(abi.encode(merchantId, storeId, terminalId));
    }
}
