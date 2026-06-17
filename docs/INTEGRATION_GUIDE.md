# RedeemLoop 集成指南 v0.2

## 1. 集成思路

RedeemLoop 不是让电商平台支持 token 原生定价，而是让电商平台多一个外部支付方式：

```text
RedeemLoop Voucher
```

商品价格、订单、物流、售后继续由原平台处理。RedeemLoop 只在链上收券确认后通知平台：

```text
这笔订单已使用提货券支付成功。
```

## 2. 厂商接入流程

1. 厂商自己发行或准备链上提货资产。
2. 在 RedeemLoop Console 创建 Asset Binding。
3. 填入资产描述符。
4. 填入商品权益条款。
5. 选择商品 SKU 或权益组。
6. 配置商户收券地址。
7. 验证收券地址控制权。
8. 配置 webhook。
9. 安装商品页按钮、结账页支付方式或 POS QR。

## 3. 商品页按钮

```html
<script src="https://cdn.redeemloop.org/pay/v0/redeemloop-pay.js"></script>
<div
  data-rl-pay-button
  data-binding-id="rlb_coke_global_001"
  data-platform="custom"
  data-store-id="store_001"
  data-product-id="prod_001"
  data-sku="COKE-330ML-JP">
</div>
```

按钮行为：

```text
查询 binding
展示支持的钱包与资产
连接钱包
检测持券
创建 pending order
创建 PaymentIntent
引导转券
等待确认
跳转成功页
```

## 4. React 集成

```tsx
import { RedeemLoopProvider, RedeemLoopPayButton } from '@redeemloop/react';

export default function ProductPage() {
  return (
    <RedeemLoopProvider apiBase="https://api.redeemloop.org">
      <RedeemLoopPayButton
        bindingId="rlb_coke_global_001"
        platform="custom"
        storeId="store_001"
        sku="COKE-330ML-JP"
      />
    </RedeemLoopProvider>
  );
}
```

## 5. 自建商城后端

### 创建待支付订单

```http
POST /v1/payment-intents
Content-Type: application/json

{
  "bindingId": "rlb_coke_global_001",
  "merchantId": "coca-cola",
  "storeId": "tokyo-store-001",
  "channel": "website",
  "orderId": "ORDER-10086",
  "skuLines": [{ "sku": "COKE-330ML-JP", "quantity": 1 }]
}
```

### 接收 webhook

```http
POST /redeemloop/webhook
X-RedeemLoop-Timestamp: ...
X-RedeemLoop-Nonce: ...
X-RedeemLoop-Signature: ...
```

收到 `voucher.payment.confirmed` 或 `voucher.payment.paid` 后，把订单标记为已付款。

## 6. WooCommerce

第一版推荐实现 WooCommerce 原生 payment gateway 插件：

```text
Payment Method: RedeemLoop Voucher
Order status after checkout: pending payment
After settlement: payment_complete
```

插件配置：

- merchantId
- API key
- webhook secret
- default vaults
- binding sync
- confirmation policy

## 7. Shopify

第一版建议使用外部/手动支付桥或商品页按钮模式：

```text
用户创建 pending order
RedeemLoop 收券确认
通过 Shopify adapter 标记订单已付款或进入可履约状态
```

不要把 v0.2 阻塞在平台原生 payment app 审核上。

## 8. POS

POS 或店员手机生成二维码：

```text
redeemloop://pay?intent=pi_123
```

用户扫码后钱包转券。店员屏幕显示：

```text
等待支付
已广播
已看到
已确认
可以交付
```

低价值商品可以配置 seen 即通过；高价值商品等待确认数。

## 9. 直播带货和广告

生成短链：

```text
https://pay.redeemloop.org/i/pi_123
```

用户打开后完成钱包转券。适合直播间、小程序、广告页、KOL 私域流量。

## 10. Fallback：一次性兑换码

若平台无法接入支付方式或 mark paid API，可以临时使用一次性兑换码桥：

```text
用户先在 RedeemLoop 转券
RedeemLoop 生成一次性码
用户在电商 checkout 输入该码
```

该方案只作为 fallback，不作为主推体验。
