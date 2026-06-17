# Security and Compliance Notes

## 1. Security Rules

- Never put PII on-chain.
- Every redemption signature must include chainId, verifyingContract, token, merchantId, storeId, terminalId, termsHash, nonce, and deadline.
- Every nonce can be used once only.
- Store terminals must be authorized by merchant.
- Merchant Vault should be multisig-controlled in production.
- Relayer must not be able to create redemptions without user signature.
- Pausing must pause redemption and distribution separately.

## 2. Risk Controls

- Per-terminal daily redemption limit.
- Per-store daily redemption limit.
- Per-wallet campaign claim limit.
- Vault quarantine period before reissue.
- Fraud scoring for repeated redemptions.
- Alert if redemption volume exceeds inventory or channel plan.

## 3. Compliance Boundaries

RedeemLoop should be described as a goods/services redemption entitlement protocol. Avoid language such as:

```text
investment
yield
profit
price appreciation
money
currency
```

Depending on jurisdiction, transferable prepaid vouchers may trigger rules related to prepaid instruments, gift cards, consumer protection, tax, payment services, or virtual assets. Production deployments require legal review.

## 4. China Mainland Caution

If serving mainland China users, avoid public-chain transferable voucher tokens, secondary-market promotion, exchange functions, or RWA investment language. Consider a centralized, non-transferable electronic voucher implementation and obtain local legal advice.

## 5. Japan / US / EU Caution

Long-lived, transferable, purchasable redemption rights may interact with prepaid payment instruments, gift card rules, consumer laws, tax rules, and crypto-asset service provider requirements. Local review is required before launch.
