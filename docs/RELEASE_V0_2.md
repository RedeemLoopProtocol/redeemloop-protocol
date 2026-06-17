# RedeemLoop v0.2 发布说明

## 版本名称

```text
RedeemLoop Protocol v0.2 - Asset Binding Payment Gateway
```

中文：

```text
兑环协议 v0.2 - 非发行型提货资产绑定与支付网关
```

## 相比早期草案的核心变化

- 收敛为“厂商自带资产，RedeemLoop 做绑定与支付”。
- 收敛为“外部支付方式，收券后 mark paid”。
- 结算策略明确为 `collect` 默认，`burn` 可选，`escrow` 预留。
- 从“EVM FT-first”扩展为“EVM + Bitcoin + Fractal 多链资产一等抽象”。
- 从“商品 token 定价”改为“商品本地货币定价，token 是外部提货支付凭证”。
- 明确 Asset Binding Wizard 不是发行器。

## 发布检查清单

- [ ] README 已更新为 v0.2 边界。
- [ ] 白皮书已更新并生成 PDF。
- [ ] CONSTRUCTION.md 已更新。
- [ ] CODEX_PROMPT.md 已更新。
- [ ] BOUNDARY.md 已新增。
- [ ] PROTOCOL_SPEC.md 已对齐 core types。
- [ ] INTEGRATION_GUIDE.md 已对齐外部支付方式。
- [ ] COMMERCE_ADAPTERS.md 已新增。
- [ ] API_AND_DATA_MODEL.md 已更新。
- [ ] SECURITY_COMPLIANCE.md 已更新。
- [ ] 代码骨架包含 core types 和 adapter interfaces。
- [ ] 无发行器代码。
- [ ] 无 marketplace 代码。
