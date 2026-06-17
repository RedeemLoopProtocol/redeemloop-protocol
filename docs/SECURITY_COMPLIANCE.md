# RedeemLoop 安全与合规说明 v0.2

## 1. 安全目标

RedeemLoop 的安全目标不是保护发行过程，而是保护：

```text
资产绑定正确
商户收券地址正确
用户转券请求正确
链上到账证明正确
订单付款通知正确
Webhook 不被伪造
重复事件不造成重复发货
```

## 2. 核心风险

- 假商户绑定知名品牌资产。
- 商户收券地址被篡改。
- 用户转错资产或转错链。
- 用户转券后订单无法匹配。
- Bitcoin / Fractal 交易被 RBF 替换。
- 单一索引器错误。
- Webhook 被伪造或重放。
- 重复 webhook 导致重复标记付款。
- 订单取消后链上才到账。

## 3. 必做控制

### 商户控制权

- 域名验证。
- 收券地址签名验证。
- 电商插件 API key 验证。

### Binding 安全

- binding 有 draft / active / paused / archived 状态。
- 修改收券地址必须重新验证。
- termsHash 修改必须生成新版本。
- 所有变更写 audit log。

### PaymentIntent 安全

- 必须有过期时间。
- 必须绑定 orderId。
- 必须绑定 bindingId。
- 必须绑定 merchantVault。
- 必须绑定 selectedAsset。
- 不允许 paid 后回滚。

### Webhook 安全

- HMAC 或非对称签名。
- timestamp 防过期。
- nonce 防重放。
- eventId 幂等。
- mark paid 幂等键。

### Indexer 安全

- EVM 交易以日志和区块确认数为准。
- Bitcoin / Fractal 必须保留多 indexer adapter 接口。
- 高价值商品必须配置确认数。
- 低价值商品可配置 seen 通过，但必须标明风险。

## 4. 合规边界

RedeemLoop 不应宣传为：

- 投资工具。
- 收益产品。
- 交易市场。
- 发币平台。
- RWA 发行平台。

RedeemLoop 应宣传为：

```text
多链提货券支付协议
外部提货券支付方式
商品权益绑定和收券确认层
```

厂商自己负责：

- 商品权益条款。
- 消费者保护。
- 退款和售后。
- 税务发票。
- 资产发行合规。
- 是否允许转让。
- 是否允许二级流转。

## 5. 隐私

RedeemLoop 不应把收货地址、电话、姓名等 PII 上链。PaymentIntent 和 webhook 中应只保存必要的订单 ID、商户 ID、资产标识和 tx proof。

## 6. 运营工具

必须提供：

- 暂停 binding。
- 暂停 merchant。
- 手动复核 payment。
- 手动补录 txid。
- 标记误转。
- 导出审计日志。
