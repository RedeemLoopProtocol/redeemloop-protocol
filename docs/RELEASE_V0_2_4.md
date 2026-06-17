# RedeemLoop v0.2.4 Release Notes

## English

RedeemLoop v0.2.4 is the WooCommerce Sandbox Plugin release.

This version adds:

- WooCommerce payment gateway plugin at `plugins/woocommerce/redeemloop-voucher-gateway.php`.
- Admin settings for RedeemLoop API Base URL, Merchant ID, API Key, Default Binding ID, Webhook Secret, and widget script URL.
- Checkout `process_payment` flow that creates a PaymentIntent and stores RedeemLoop metadata on the order.
- Order-received widget container using an existing PaymentIntent ID.
- WooCommerce REST webhook endpoint at `/wp-json/redeemloop/v1/woocommerce/mark-paid`.
- RedeemLoop webhook HMAC signature verification in the plugin.
- `@redeemloop/widget` support for `data-intent-id`.

Known limits:

- Sandbox plugin only; not submitted to the WordPress plugin directory.
- Production stores should host a bundled widget script and use HTTPS.
- Shopify remains adapter/API surface only.

## 中文

RedeemLoop v0.2.4 是 WooCommerce Sandbox Plugin 版本。

这一版新增：

- WooCommerce payment gateway 插件：`plugins/woocommerce/redeemloop-voucher-gateway.php`。
- 后台配置 RedeemLoop API Base URL、Merchant ID、API Key、Default Binding ID、Webhook Secret 和 widget script URL。
- checkout `process_payment` 流程会创建 PaymentIntent，并将 RedeemLoop metadata 写入订单。
- order-received 页面通过已有 PaymentIntent ID 展示 widget 容器。
- WooCommerce REST webhook endpoint：`/wp-json/redeemloop/v1/woocommerce/mark-paid`。
- 插件内置 RedeemLoop webhook HMAC 签名校验。
- `@redeemloop/widget` 支持 `data-intent-id`。

已知限制：

- 当前仅为 sandbox 插件，尚未提交 WordPress plugin directory。
- 生产店铺应自行托管打包后的 widget script，并使用 HTTPS。
- Shopify 仍是 adapter/API 表面。
