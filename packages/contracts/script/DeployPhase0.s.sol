// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";

import {IRedeemLoopVoucher} from "../src/interfaces/IRedeemLoopVoucher.sol";
import {MerchantVault} from "../src/MerchantVault.sol";
import {RedeemLoopERC20Voucher} from "../src/RedeemLoopERC20Voucher.sol";
import {StoreTerminalRegistry} from "../src/StoreTerminalRegistry.sol";

contract DeployPhase0 is Script {
    bytes32 internal constant MERCHANT_ID = keccak256("coca-cola-japan");
    bytes32 internal constant STORE_ID = keccak256("tokyo-store-001");
    bytes32 internal constant TERMINAL_ID = keccak256("pos-07");
    bytes32 internal constant TERMS_HASH = keccak256("coke-bottle-2026");
    bytes32 internal constant CAMPAIGN_ID = keccak256("summer-2026");

    function run()
        external
        returns (StoreTerminalRegistry registry, MerchantVault vault, RedeemLoopERC20Voucher voucher)
    {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address demoUser = vm.envOr("DEMO_USER", deployer);
        address terminalOperator = vm.envOr("TERMINAL_OPERATOR", deployer);

        vm.startBroadcast(deployerPrivateKey);

        registry = new StoreTerminalRegistry(deployer);
        vault = new MerchantVault(deployer, 1 days);
        voucher = new RedeemLoopERC20Voucher({
            name_: "Coke Bottle Voucher",
            symbol_: "COKE1",
            merchantId_: MERCHANT_ID,
            termsHash_: TERMS_HASH,
            merchantVault_: address(vault),
            terminalRegistry_: registry,
            maxSupply_: 100_000,
            redemptionMode_: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            admin: deployer
        });

        registry.authorizeTerminal(MERCHANT_ID, STORE_ID, TERMINAL_ID, terminalOperator);
        voucher.mint(demoUser, 10, CAMPAIGN_ID);

        vm.stopBroadcast();
    }
}
