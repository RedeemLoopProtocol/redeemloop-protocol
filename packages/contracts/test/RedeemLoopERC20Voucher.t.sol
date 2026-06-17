// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";

import {IRedeemLoopVoucher} from "../src/interfaces/IRedeemLoopVoucher.sol";
import {MerchantVault} from "../src/MerchantVault.sol";
import {RedeemLoopERC20Voucher} from "../src/RedeemLoopERC20Voucher.sol";
import {StoreTerminalRegistry} from "../src/StoreTerminalRegistry.sol";

contract RedeemLoopERC20VoucherTest is Test {
    bytes32 private constant MERCHANT_ID = keccak256("merchant:coca-cola-japan");
    bytes32 private constant STORE_ID = keccak256("store:tokyo-001");
    bytes32 private constant TERMINAL_ID = keccak256("terminal:pos-07");
    bytes32 private constant TERMS_HASH = keccak256("terms:coke-bottle-2026");
    bytes32 private constant CAMPAIGN_ID = keccak256("campaign:summer-2026");

    uint256 private constant USER_PRIVATE_KEY = 0xA11CE;

    address private user;
    address private relayer = address(0xBEEF);
    address private operator = address(0xC0FFEE);
    address private recipient = address(0xCAFE);

    StoreTerminalRegistry private registry;
    MerchantVault private vault;
    RedeemLoopERC20Voucher private collectVoucher;

    function setUp() public {
        user = vm.addr(USER_PRIVATE_KEY);
        registry = new StoreTerminalRegistry(address(this));
        vault = new MerchantVault(address(this), 1 days);
        collectVoucher = _deployVoucher(IRedeemLoopVoucher.RedemptionMode.COLLECT, 100);
        registry.authorizeTerminal(MERCHANT_ID, STORE_ID, TERMINAL_ID, operator);
        collectVoucher.mint(user, 10, CAMPAIGN_ID);
    }

    function testMintRespectsMaxSupply() public {
        RedeemLoopERC20Voucher voucher = _deployVoucher(IRedeemLoopVoucher.RedemptionMode.COLLECT, 2);
        voucher.mint(user, 2, CAMPAIGN_ID);

        vm.expectRevert(RedeemLoopERC20Voucher.RedeemLoopMaxSupplyExceeded.selector);
        voucher.mint(user, 1, CAMPAIGN_ID);
    }

    function testDecimalsEqualsZero() public view {
        assertEq(collectVoucher.decimals(), 0);
    }

    function testSealMintingBlocksFutureMint() public {
        collectVoucher.sealMinting();

        vm.expectRevert(RedeemLoopERC20Voucher.RedeemLoopMintingSealed.selector);
        collectVoucher.mint(user, 1, CAMPAIGN_ID);
    }

    function testCollectWithAuthorizationTransfersTokensToVault() public {
        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: collectVoucher,
            amount: 2,
            nonce: 1,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: TERMS_HASH
        });

        bytes memory signature = _sign(collectVoucher, authorization);
        vm.prank(relayer);
        bytes32 redemptionId = collectVoucher.collectWithAuthorization(authorization, signature);

        assertTrue(redemptionId != bytes32(0));
        assertEq(collectVoucher.balanceOf(user), 8);
        assertEq(collectVoucher.balanceOf(address(vault)), 2);
        assertEq(collectVoucher.totalSupply(), 10);
        assertTrue(collectVoucher.usedNonces(user, 1));
        assertGt(vault.quarantineUntil(address(collectVoucher)), block.timestamp);
    }

    function testBurnWithAuthorizationBurnsUserTokens() public {
        RedeemLoopERC20Voucher burnVoucher = _deployVoucher(IRedeemLoopVoucher.RedemptionMode.BURN, 100);
        burnVoucher.mint(user, 5, CAMPAIGN_ID);

        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: burnVoucher,
            amount: 3,
            nonce: 2,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.BURN,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: TERMS_HASH
        });

        bytes memory signature = _sign(burnVoucher, authorization);
        vm.prank(relayer);
        burnVoucher.burnWithAuthorization(authorization, signature);

        assertEq(burnVoucher.balanceOf(user), 2);
        assertEq(burnVoucher.totalSupply(), 2);
        assertTrue(burnVoucher.usedNonces(user, 2));
    }

    function testNonceReplayFails() public {
        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: collectVoucher,
            amount: 1,
            nonce: 3,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: TERMS_HASH
        });

        bytes memory signature = _sign(collectVoucher, authorization);
        collectVoucher.collectWithAuthorization(authorization, signature);

        vm.expectRevert(RedeemLoopERC20Voucher.RedeemLoopNonceUsed.selector);
        collectVoucher.collectWithAuthorization(authorization, signature);
    }

    function testExpiredAuthorizationFails() public {
        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: collectVoucher,
            amount: 1,
            nonce: 4,
            deadline: block.timestamp,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: TERMS_HASH
        });

        bytes memory signature = _sign(collectVoucher, authorization);
        vm.warp(block.timestamp + 1);

        vm.expectRevert(RedeemLoopERC20Voucher.RedeemLoopDeadlineExpired.selector);
        collectVoucher.collectWithAuthorization(authorization, signature);
    }

    function testUnauthorizedTerminalFails() public {
        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: collectVoucher,
            amount: 1,
            nonce: 5,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: keccak256("terminal:unknown"),
            termsHash: TERMS_HASH
        });

        bytes memory signature = _sign(collectVoucher, authorization);

        vm.expectRevert(RedeemLoopERC20Voucher.RedeemLoopUnauthorizedTerminal.selector);
        collectVoucher.collectWithAuthorization(authorization, signature);
    }

    function testWrongTermsHashFails() public {
        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: collectVoucher,
            amount: 1,
            nonce: 6,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: keccak256("terms:wrong")
        });

        bytes memory signature = _sign(collectVoucher, authorization);

        vm.expectRevert(RedeemLoopERC20Voucher.RedeemLoopWrongTerms.selector);
        collectVoucher.collectWithAuthorization(authorization, signature);
    }

    function testPausedRedemptionFails() public {
        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: collectVoucher,
            amount: 1,
            nonce: 7,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: TERMS_HASH
        });

        bytes memory signature = _sign(collectVoucher, authorization);
        collectVoucher.pause();

        vm.expectRevert();
        collectVoucher.collectWithAuthorization(authorization, signature);
    }

    function testVaultQuarantineBlocksDistributionUntilElapsed() public {
        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: collectVoucher,
            amount: 1,
            nonce: 8,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: TERMS_HASH
        });

        collectVoucher.collectWithAuthorization(authorization, _sign(collectVoucher, authorization));

        vm.expectRevert();
        vault.distribute(address(collectVoucher), recipient, 1);

        vm.warp(vault.quarantineUntil(address(collectVoucher)));
        vault.distribute(address(collectVoucher), recipient, 1);

        assertEq(collectVoucher.balanceOf(recipient), 1);
    }

    function testFuzzCollectWithAuthorization(uint96 rawAmount, uint256 nonce) public {
        uint256 amount = bound(uint256(rawAmount), 1, 20);
        nonce = bound(nonce, 10_000, type(uint128).max);

        RedeemLoopERC20Voucher voucher = _deployVoucher(IRedeemLoopVoucher.RedemptionMode.COLLECT, amount);
        voucher.mint(user, amount, CAMPAIGN_ID);

        IRedeemLoopVoucher.RedeemAuthorization memory authorization = _authorization({
            voucher: voucher,
            amount: amount,
            nonce: nonce,
            deadline: block.timestamp + 1 hours,
            mode: IRedeemLoopVoucher.RedemptionMode.COLLECT,
            storeId: STORE_ID,
            terminalId: TERMINAL_ID,
            termsHash: TERMS_HASH
        });

        voucher.collectWithAuthorization(authorization, _sign(voucher, authorization));

        assertEq(voucher.balanceOf(user), 0);
        assertEq(voucher.balanceOf(address(vault)), amount);
        assertTrue(voucher.usedNonces(user, nonce));
    }

    function _deployVoucher(IRedeemLoopVoucher.RedemptionMode mode, uint256 maxSupply)
        private
        returns (RedeemLoopERC20Voucher)
    {
        return new RedeemLoopERC20Voucher({
            name_: "Coke Bottle Voucher",
            symbol_: "COKE1",
            merchantId_: MERCHANT_ID,
            termsHash_: TERMS_HASH,
            merchantVault_: address(vault),
            terminalRegistry_: registry,
            maxSupply_: maxSupply,
            redemptionMode_: mode,
            admin: address(this)
        });
    }

    function _authorization(
        RedeemLoopERC20Voucher voucher,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        IRedeemLoopVoucher.RedemptionMode mode,
        bytes32 storeId,
        bytes32 terminalId,
        bytes32 termsHash
    ) private view returns (IRedeemLoopVoucher.RedeemAuthorization memory) {
        return IRedeemLoopVoucher.RedeemAuthorization({
            user: user,
            voucherToken: address(voucher),
            tokenId: 0,
            amount: amount,
            merchantId: MERCHANT_ID,
            storeId: storeId,
            terminalId: terminalId,
            termsHash: termsHash,
            redemptionMode: uint8(mode),
            nonce: nonce,
            deadline: deadline
        });
    }

    function _sign(RedeemLoopERC20Voucher voucher, IRedeemLoopVoucher.RedeemAuthorization memory authorization)
        private
        view
        returns (bytes memory)
    {
        bytes32 digest = voucher.authorizationDigest(authorization);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(USER_PRIVATE_KEY, digest);
        return abi.encodePacked(r, s, v);
    }
}
