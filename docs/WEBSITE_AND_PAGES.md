# RedeemLoop Website and GitHub Pages Guide

## English

RedeemLoop v0.9.1 adds `apps/site`, a static official website for the open-source project.

The website is not a hosted payment processor. It is a public entry point for:

- protocol positioning and boundaries,
- merchant scenario models,
- readiness status for EVM, Rune, Fractal, inscription/NFT, WooCommerce, and Shopify paths,
- developer quick start links,
- release and documentation discovery.

## Local Development

```bash
pnpm install
pnpm site:dev
```

Open `http://localhost:3001`.

Build a static export:

```bash
pnpm site:build
```

The static output is written to `apps/site/out`.

## GitHub Pages Deployment

The repository includes `.github/workflows/pages.yml`.

Default project-page deployment:

- Website URL: `https://redeemloopprotocol.github.io/redeemloop-protocol/`
- Build base path: `/redeemloop-protocol`
- Artifact path: `apps/site/out`

Required GitHub setting:

1. Open `RedeemLoopProtocol/redeemloop-protocol`.
2. Go to **Settings -> Pages**.
3. Set **Build and deployment / Source** to **GitHub Actions**.
4. Run the **Deploy Website to GitHub Pages** workflow or push to `main`.

This follows GitHub Pages' custom workflow model: build static files, upload them with `actions/upload-pages-artifact`, then deploy with `actions/deploy-pages`.

## Optional AiFund Subdomain

Recommended official website domain:

```text
redeemloop.aifund.com
```

Reserve `pay.aifund.com` for the real customer payment entry after live wallet behavior, HTTPS certificate, RPC configuration, and commerce certification are complete.

To enable a custom subdomain:

1. Verify the domain or subdomain in GitHub organization/account settings when possible.
2. Add a DNS `CNAME` record:

```text
redeemloop.aifund.com -> redeemloopprotocol.github.io
```

3. In the repository, go to **Settings -> Pages -> Custom domain** and enter `redeemloop.aifund.com`.
4. In **Settings -> Secrets and variables -> Actions -> Variables**, add:

```text
REDEEMLOOP_SITE_CUSTOM_DOMAIN=redeemloop.aifund.com
```

5. Re-run the Pages workflow.

When `REDEEMLOOP_SITE_CUSTOM_DOMAIN` is set, the workflow writes `apps/site/out/CNAME` and builds the site at the root path instead of `/redeemloop-protocol`.

## Production Claim Boundary

The website must not claim production payment readiness until the relevant live certification exists.

Current safe wording:

- EVM ERC-20: integration beta.
- POS QR and short-link: pilot APIs with hosted payment page alpha.
- WooCommerce: sandbox plugin.
- Shopify: private-app alpha.
- Bitcoin Rune: adapter beta, pending funded UniSat/Xverse certification.
- Fractal, inscription, and NFT: mocked alpha adapter boundaries.

## 中文

RedeemLoop v0.9.1 新增 `apps/site`，作为开源项目的静态官网。

这个官网不是托管支付处理器。它承担的是公开入口：

- 协议定位和边界；
- 商户应用场景模型；
- EVM、Rune、Fractal、Inscription/NFT、WooCommerce、Shopify 路径的可用度状态；
- 开发者快速开始入口；
- 版本和文档入口。

## 本地开发

```bash
pnpm install
pnpm site:dev
```

打开 `http://localhost:3001`。

构建静态站点：

```bash
pnpm site:build
```

静态输出目录是 `apps/site/out`。

## GitHub Pages 部署

仓库已经包含 `.github/workflows/pages.yml`。

默认项目页部署：

- 官网 URL：`https://redeemloopprotocol.github.io/redeemloop-protocol/`
- 构建 base path：`/redeemloop-protocol`
- 上传目录：`apps/site/out`

需要在 GitHub 里设置：

1. 打开 `RedeemLoopProtocol/redeemloop-protocol`。
2. 进入 **Settings -> Pages**。
3. 把 **Build and deployment / Source** 设置为 **GitHub Actions**。
4. 手动运行 **Deploy Website to GitHub Pages** workflow，或 push 到 `main` 触发。

该流程使用 GitHub Pages 的自定义工作流模型：先构建静态文件，再用 `actions/upload-pages-artifact` 上传，最后用 `actions/deploy-pages` 部署。

## 可选 AiFund 二级域名

推荐官网域名：

```text
redeemloop.aifund.com
```

`pay.aifund.com` 建议保留给真实用户支付入口，等真实钱包行为、HTTPS 证书、RPC 配置和电商认证完成后再使用。

启用自定义二级域名：

1. 尽量先在 GitHub 组织或账号设置中验证域名或子域名。
2. 添加 DNS `CNAME` 记录：

```text
redeemloop.aifund.com -> redeemloopprotocol.github.io
```

3. 进入仓库 **Settings -> Pages -> Custom domain**，填写 `redeemloop.aifund.com`。
4. 进入 **Settings -> Secrets and variables -> Actions -> Variables**，新增：

```text
REDEEMLOOP_SITE_CUSTOM_DOMAIN=redeemloop.aifund.com
```

5. 重新运行 Pages workflow。

设置 `REDEEMLOOP_SITE_CUSTOM_DOMAIN` 后，workflow 会写入 `apps/site/out/CNAME`，并以根路径构建站点，而不是 `/redeemloop-protocol`。

## 生产级声明边界

官网不能在真实认证完成前宣称生产支付可用。

当前安全表述：

- EVM ERC-20：integration beta。
- POS QR 和短链：pilot APIs，hosted payment page alpha。
- WooCommerce：sandbox plugin。
- Shopify：private-app alpha。
- Bitcoin Rune：adapter beta，等待有资金的 UniSat/Xverse 认证。
- Fractal、Inscription、NFT：mocked alpha adapter boundaries。
