# RedeemLoop Integration Guide

## 1. 官网一键植入

```html
<script src="https://cdn.redeemloop.org/widget/v0/redeemloop.js"></script>
<div
  data-rdl-widget="claim"
  data-rdl-merchant="merchant-id"
  data-rdl-campaign="campaign-id"
  data-rdl-token="0xVoucherToken"
  data-rdl-chain-id="8453">
</div>
```

Widget 类型:

```text
claim     领取券
buy       购买券
balance   展示余额
redeem    兑换券
wallet    展示该品牌券包
```

## 2. React

```tsx
<RedeemLoopProvider chainId={8453} merchantId="coca-cola">
  <VoucherBalance token="0xVoucherToken" />
  <ClaimButton campaignId="summer-2026" />
  <RedeemButton sku="coke-bottle" mode="collect" />
</RedeemLoopProvider>
```

## 3. 小程序与 H5

小程序生成 claim link:

```text
https://app.redeemloop.org/claim?merchant=coca-cola&campaign=summer-2026
```

小程序生成 redeem link:

```text
https://app.redeemloop.org/redeem?merchant=coca-cola&store=tokyo-store-001&terminal=pos-07&token=0xVoucherToken&amount=1
```

## 4. 直播带货

直播间发放流程:

```text
创建 campaign
选择 token 来源: mint 或 Merchant Vault
设置 per-wallet limit
生成 QR
用户扫码领取
后台统计领取和后续兑换
```

## 5. 实体店 POS

POS QR:

```text
redeemloop://redeem?chainId=8453&token=0xVoucherToken&amount=1&storeId=tokyo-store-001&terminalId=pos-07&nonce=0x...
```

POS 验券步骤:

1. 检查商品是否匹配 voucher terms。
2. 生成 redeem intent。
3. 用户钱包签名。
4. POS 提交签名给 relayer。
5. relayer 调用链上 `collectWithAuthorization` 或 `burnWithAuthorization`。
6. POS 展示结果。

## 6. 电商 checkout

Phase 0 API 顺序:

```text
POST /v1/merchants/:merchantId/receiving-address
POST /v1/commerce/payment-intents
POST /v1/redemptions/intents
POST /v1/redemptions/submit
POST /v1/commerce/confirm
```

购物车匹配:

```text
cart.sku == voucher.terms.sku
cart.quantity <= voucher.balance
region allowed
not expired
not paused
```

支付结果:

```text
用户用 1 个 ERC-20 voucher 完成商品兑换权支付
relayer 验证 EIP-712 签名并 collect/burn voucher
Shopify 调用 orderMarkAsPaid
WooCommerce 调用 set_paid + processing
不是折扣抵扣, 不是积分补差价
```
