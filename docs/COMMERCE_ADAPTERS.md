# Commerce Adapters / 电商适配策略

## 1. 核心原则

RedeemLoop 不要求电商平台支持 token 原生定价。所有平台适配都围绕：

```text
外部支付方式 + 待支付订单 + 收券确认 + 标记已付款
```

## 2. 统一接口

```ts
export interface CommerceAdapter {
  getProductContext(input: ProductContextInput): Promise<ProductContext>;
  createPendingOrder(input: CreatePendingOrderInput): Promise<CommerceOrder>;
  markOrderPaid(input: MarkOrderPaidInput): Promise<void>;
  cancelPendingOrder(input: CancelOrderInput): Promise<void>;
}
```

## 3. 平台优先级

```text
Tier 1: custom demo store, WooCommerce
Tier 2: Shopify external/manual bridge
Tier 3: POS QR
Tier 4: Magento, Shopline, Shoplazza, BigCommerce
Tier 5: miniapp and livestream adapters
```

## 4. WooCommerce

实现为 `WC_Payment_Gateway`：

- checkout 选择 RedeemLoop Voucher。
- 创建 PaymentIntent。
- 前端弹出钱包。
- settlement worker 确认。
- 插件调用订单支付完成。

## 5. Shopify

v0.2 不做复杂平台支付应用，优先：

- 商品页按钮。
- external/manual payment bridge。
- 后台订单 mark paid 或进入 fulfillment-ready 状态。

## 6. POS

POS QR 是最小实体店路径：

- POS 创建 PaymentIntent。
- 二维码展示。
- 用户钱包转券。
- 店员页显示确认状态。
- POS 记录 RedeemLoop Voucher 为外部支付。

## 7. 自建平台

自建平台直接调用 API：

```text
POST /payment-intents
GET /payment-intents/:id
POST /webhook/payment-confirmed
```

## 8. 幂等与错误处理

每个 adapter 必须处理：

- 重复 webhook。
- 订单已取消但链上到账。
- 错误金额。
- 错误资产。
- 错误收券地址。
- 超时。
- 手动复核。
