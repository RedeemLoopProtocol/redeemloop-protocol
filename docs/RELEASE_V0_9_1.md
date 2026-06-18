# RedeemLoop v0.9.1 Release Notes

## English

RedeemLoop v0.9.1 adds the first official open-source website and a practical scenario model for merchants and developers.

### Added

- `apps/site`, a static Next website designed for GitHub Pages.
- Bilingual website content with an in-page language toggle.
- First-screen scenario model covering:
  - product checkout button,
  - POS QR payment,
  - livestream short-link,
  - merchant operations.
- Readiness status matrix for EVM, WooCommerce, Shopify, Bitcoin Rune, Fractal, inscription, and NFT paths.
- Developer entry section linking the local sandbox path to the existing API/payment apps.
- GitHub Pages deployment workflow at `.github/workflows/pages.yml`.
- `docs/WEBSITE_AND_PAGES.md` with GitHub Pages and optional `redeemloop.aifund.com` custom-domain instructions.
- Root scripts:
  - `pnpm site:dev`
  - `pnpm site:build`

### Status

This release improves public project access and merchant comprehension. It does not change payment production readiness. The website continues to describe EVM as integration beta, hosted payment pages as alpha/pilot infrastructure, and Rune/Fractal/Inscription/NFT paths as pending live certification where applicable.

## 中文

RedeemLoop v0.9.1 新增第一个开源项目官网，并提供面向商户和开发者的应用场景模型。

### 新增

- `apps/site`：用于 GitHub Pages 的静态 Next 官网。
- 中英文双语官网内容，页面内可切换语言。
- 首屏应用场景模型，覆盖：
  - 商品页支付按钮；
  - POS QR 收银；
  - 直播带货短链；
  - 商户运营后台。
- EVM、WooCommerce、Shopify、Bitcoin Rune、Fractal、Inscription、NFT 路径的可用度状态矩阵。
- 开发者入口，把本地 sandbox 路径连接到现有 API/payment apps。
- GitHub Pages 部署 workflow：`.github/workflows/pages.yml`。
- `docs/WEBSITE_AND_PAGES.md`：包含 GitHub Pages 和可选 `redeemloop.aifund.com` 自定义域名说明。
- 根脚本：
  - `pnpm site:dev`
  - `pnpm site:build`

### 状态

该版本提升公开项目入口和商户理解成本，不改变支付生产级可用度。官网继续把 EVM 描述为 integration beta，把 hosted payment pages 描述为 alpha/pilot 基础设施，并对 Rune/Fractal/Inscription/NFT 等路径保留真实认证前的限制说明。
