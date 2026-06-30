# RedeemLoop Beta Operator Runbook

## English

This runbook is the release-operator checklist for turning the current alpha/pilot build into the first public beta. It does not replace the beta gates. It tells the operator which real-world actions must happen before those gates can pass.

### Release Rule

Do not publish a beta tag while any required evidence artifact is missing, dry-run, placeholder, or inconsistent with the funded EVM transaction.

The first beta claim is limited to:

- EVM ERC-20 voucher payment for one certified transaction.
- Merchant vault receipt confirmation.
- PaymentIntent-based settlement record.
- WooCommerce mark-as-paid for the same certified payment.
- Public sandbox and beta readiness tooling.

Do not claim production-certified Shopify, Bitcoin Rune, Fractal, inscription, or NFT settlement unless separate live evidence is added.

### Required Inputs

| Input | Why It Is Needed | Safe Handling |
|-------|------------------|---------------|
| `REDEEMLOOP_EVM_RPC_URLS` GitHub secret | Read-only RPC receipt checks for EVM evidence | Secret already exists in the repository preflight |
| `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` GitHub secret | Calls the RedeemLoop commerce confirmation API for WooCommerce evidence | Use a merchant-scoped key, not an admin or personal key |
| Test ERC-20 voucher token | Asset being tendered | Use a controlled test voucher asset |
| Payer wallet with voucher balance and gas | Sends the funded voucher transfer | Never paste private keys into GitHub, scripts, or issue comments |
| Merchant vault address | Receives the voucher asset | Must match the PaymentIntent receiving vault |
| WooCommerce test order | Receives mark-as-paid certification | Use a safe test order only |
| PaymentIntent ID | Links wallet and commerce evidence | Must be identical across EVM and WooCommerce evidence |
| Transaction hash | Proves the funded transfer | Must be identical across EVM and WooCommerce evidence |

### Step 1: Set the Commerce Secret

In GitHub:

1. Open `RedeemLoopProtocol/redeemloop-protocol`.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add repository secret `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY`.
4. Use the merchant-scoped RedeemLoop API key for the certification deployment.
5. Do not use a personal GitHub token, wallet secret, private key, WooCommerce consumer secret, or admin key.

Confirm with:

```bash
pnpm beta:release:preflight -- \
  --manifest evidence/beta-evidence.manifest.json \
  --github \
  --repo RedeemLoopProtocol/redeemloop-protocol
```

Expected result: `github.secret.REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` passes. Funded EVM, WooCommerce, and release-note checks may still fail until later steps.

### Step 2: Run the Funded EVM Payment

Use a hosted payment page, React pay button, widget, or the EVM live certification console. Broadcast exactly one real ERC-20 voucher transfer into the merchant vault.

Record these fields immediately:

- `chain_id`
- `wallet_name`
- `wallet_version`
- `payment_intent_id`
- `tx_hash`
- `payer_address`
- `merchant_vault_address`
- `voucher_token_contract`
- `raw_amount`

Do not continue if the payment was simulated, reverted, sent to the wrong vault, sent with the wrong token, or paid with the wrong amount.

### Step 3: Generate EVM Evidence

In GitHub:

1. Go to `Actions`.
2. Open **Beta EVM Wallet Certification Evidence**.
3. Click `Run workflow`.
4. Enter the recorded funded-transfer fields.
5. Run the workflow.
6. Note the completed workflow run ID.
7. Download the artifact into the local evidence folder:

```bash
pnpm beta:evidence:download -- \
  --evm-run-id <evm_workflow_run_id>
```

Local fallback:

```bash
pnpm --silent beta:evidence:evm -- \
  --chain-id <chain_id> \
  --rpc-url <read_only_rpc_url> \
  --wallet-name "<wallet_name>" \
  --wallet-version "<wallet_version>" \
  --intent-id <payment_intent_id> \
  --tx-hash <tx_hash> \
  --from <payer_address> \
  --to <merchant_vault_address> \
  --contract <voucher_token_contract> \
  --amount <raw_amount> \
  --out evidence/evm-wallet-certification.json
```

### Step 4: Certify WooCommerce Mark-as-Paid

Use a safe WooCommerce test order. Confirm settlement through RedeemLoop using the same PaymentIntent and transaction fields from the funded EVM evidence.

In GitHub:

1. Go to `Actions`.
2. Open **Beta WooCommerce Certification Evidence**.
3. Click `Run workflow`.
4. Enter the WooCommerce test order fields and the same settlement identity:
   - `intent_id`
   - `chain_id`
   - `voucher_token`
   - `amount`
   - `receiver`
   - `tx_hash`
5. Run the workflow.
6. Note the completed workflow run ID.
7. Download the artifact into the local evidence folder:

```bash
pnpm beta:evidence:download -- \
  --woocommerce-run-id <woocommerce_workflow_run_id>
```

Do not use dry-run output for beta publication. The validator rejects dry-run evidence.

### Step 5: Validate Private Evidence

Keep private evidence in the ignored `evidence/` directory. If the manifest is missing but some evidence files already exist, restore only missing scaffold files:

```bash
pnpm beta:evidence:init -- --missing-only
```

Download any completed GitHub evidence workflow artifacts into the same folder. The command replaces scaffold placeholders but refuses to overwrite existing non-placeholder evidence unless `--force` is passed:

```bash
pnpm beta:evidence:download -- \
  --compose-run-id <compose_smoke_run_id> \
  --production-run-id <production_readiness_run_id> \
  --evm-run-id <evm_workflow_run_id> \
  --woocommerce-run-id <woocommerce_workflow_run_id>
```

Then validate:

```bash
pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json
pnpm beta:release:preflight -- \
  --manifest evidence/beta-evidence.manifest.json \
  --github \
  --repo RedeemLoopProtocol/redeemloop-protocol
```

Required result:

- Compose smoke evidence passes.
- Production readiness evidence passes.
- EVM wallet certification passes.
- WooCommerce certification passes.
- EVM and WooCommerce evidence describe the same PaymentIntent, chain ID, transaction hash, token, receiver, and amount.
- Commerce secret check passes.

### Step 6: Generate Public Release Evidence Notes

Generate the public-safe bilingual release notes artifact:

```bash
pnpm --silent beta:evidence:summary -- \
  --manifest evidence/beta-evidence.manifest.json \
  --out evidence/RELEASE_BETA.md
```

Review `evidence/RELEASE_BETA.md` before publication. It must not expose API keys, webhook secrets, private keys, full store URLs, full wallet addresses, or unredacted transaction metadata.

### Step 7: Run the Strict Release Gate

Choose the beta tag, then run:

```bash
pnpm beta:version:prepare -- --release v0.10.x-beta.0
pnpm beta:version:prepare -- --release v0.10.x-beta.0 --write
pnpm beta:release:gate -- \
  --manifest evidence/beta-evidence.manifest.json \
  --release v0.10.x-beta.0 \
  --require-version-match
```

Optional GitHub verification: after the version commit is ready, run **Beta Release Gate Evidence** with the chosen release tag and the four required evidence workflow run IDs. Download the `redeemloop-beta-release-gate` artifact and confirm `beta-release-gate.json` has zero failures before publishing.

Only continue if the strict gate passes.

### Step 8: Publish the Beta

1. Commit the version changes.
2. Push the commit and beta tag.
3. Confirm main CI passes.
4. Create a GitHub Release for the beta tag.
5. Paste the public-safe content from `evidence/RELEASE_BETA.md`.
6. Do not upload private evidence artifacts unless they have been manually reviewed and redacted.

## 中文

本文档是发布操作员把当前 alpha/pilot 构建推进到首个公开 beta 的执行清单。它不替代 beta gates，而是说明 gates 通过前必须完成哪些真实外部动作。

### 发布规则

只要任何必需 evidence artifact 仍然缺失、dry-run、placeholder，或与 funded EVM transaction 不一致，就不要发布 beta tag。

首个 beta 声明范围只限于：

- 一笔已认证交易的 EVM ERC-20 提货券支付。
- 商户 vault 收券确认。
- 基于 PaymentIntent 的 settlement record。
- 同一笔认证支付对应的 WooCommerce mark-as-paid。
- Public sandbox 和 beta readiness tooling。

不要声明 production-certified Shopify、Bitcoin Rune、Fractal、inscription 或 NFT settlement，除非另有对应 live evidence。

### 必需输入

| 输入 | 用途 | 安全处理 |
|------|------|----------|
| `REDEEMLOOP_EVM_RPC_URLS` GitHub secret | 用只读 RPC 做 EVM receipt check | 该 secret 已在仓库 preflight 中存在 |
| `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` GitHub secret | 调用 RedeemLoop commerce confirmation API 生成 WooCommerce evidence | 使用 merchant-scoped key，不要使用 admin 或个人 key |
| 测试 ERC-20 提货券 token | 被支付的资产 | 使用受控测试提货资产 |
| 有提货券余额和 gas 的付款钱包 | 发起真实提货券转账 | 不要把私钥粘贴到 GitHub、脚本或 issue comment |
| 商户 vault 地址 | 接收提货券资产 | 必须与 PaymentIntent receiving vault 一致 |
| WooCommerce 测试订单 | 用于 mark-as-paid 认证 | 只使用安全测试订单 |
| PaymentIntent ID | 关联钱包 evidence 和 commerce evidence | EVM 与 WooCommerce evidence 必须完全一致 |
| Transaction hash | 证明真实 funded transfer | EVM 与 WooCommerce evidence 必须完全一致 |

### 第 1 步：设置 Commerce Secret

在 GitHub 中：

1. 打开 `RedeemLoopProtocol/redeemloop-protocol`。
2. 进入 `Settings` -> `Secrets and variables` -> `Actions`。
3. 新增 repository secret：`REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY`。
4. 使用认证部署中的 merchant-scoped RedeemLoop API key。
5. 不要使用个人 GitHub token、钱包 secret、私钥、WooCommerce consumer secret 或 admin key。

确认命令：

```bash
pnpm beta:release:preflight -- \
  --manifest evidence/beta-evidence.manifest.json \
  --github \
  --repo RedeemLoopProtocol/redeemloop-protocol
```

期望结果：`github.secret.REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` 通过。后续 funded EVM、WooCommerce 和 release-note 检查在证据补齐前仍可能失败。

### 第 2 步：执行 Funded EVM 支付

使用 hosted payment page、React pay button、widget，或 EVM live certification console。广播一笔真实 ERC-20 提货券转账到商户 vault。

立刻记录这些字段：

- `chain_id`
- `wallet_name`
- `wallet_version`
- `payment_intent_id`
- `tx_hash`
- `payer_address`
- `merchant_vault_address`
- `voucher_token_contract`
- `raw_amount`

如果支付是模拟、reverted、转到错误 vault、使用错误 token，或 amount 不一致，不要继续发布流程。

### 第 3 步：生成 EVM Evidence

在 GitHub 中：

1. 进入 `Actions`。
2. 打开 **Beta EVM Wallet Certification Evidence**。
3. 点击 `Run workflow`。
4. 输入已记录的 funded-transfer 字段。
5. 运行 workflow。
6. 记录已完成 workflow run ID。
7. 把 artifact 下载到本地 evidence 目录：

```bash
pnpm beta:evidence:download -- \
  --evm-run-id <evm_workflow_run_id>
```

本地备用命令：

```bash
pnpm --silent beta:evidence:evm -- \
  --chain-id <chain_id> \
  --rpc-url <read_only_rpc_url> \
  --wallet-name "<wallet_name>" \
  --wallet-version "<wallet_version>" \
  --intent-id <payment_intent_id> \
  --tx-hash <tx_hash> \
  --from <payer_address> \
  --to <merchant_vault_address> \
  --contract <voucher_token_contract> \
  --amount <raw_amount> \
  --out evidence/evm-wallet-certification.json
```

### 第 4 步：认证 WooCommerce Mark-as-Paid

使用安全 WooCommerce 测试订单。通过 RedeemLoop 确认 settlement，并使用 funded EVM evidence 中同一组 PaymentIntent 和交易字段。

在 GitHub 中：

1. 进入 `Actions`。
2. 打开 **Beta WooCommerce Certification Evidence**。
3. 点击 `Run workflow`。
4. 输入 WooCommerce 测试订单字段，以及同一组 settlement identity：
   - `intent_id`
   - `chain_id`
   - `voucher_token`
   - `amount`
   - `receiver`
   - `tx_hash`
5. 运行 workflow。
6. 记录已完成 workflow run ID。
7. 把 artifact 下载到本地 evidence 目录：

```bash
pnpm beta:evidence:download -- \
  --woocommerce-run-id <woocommerce_workflow_run_id>
```

不要把 dry-run 输出用于 beta 发布。Validator 会拒绝 dry-run evidence。

### 第 5 步：校验私有 Evidence

私有 evidence 保持在被 Git 忽略的 `evidence/` 目录。如果 manifest 丢失但部分 evidence 文件已经存在，只恢复缺失 scaffold：

```bash
pnpm beta:evidence:init -- --missing-only
```

把已完成的 GitHub evidence workflow artifact 下载到同一个目录。该命令会替换 scaffold placeholder；如果目标文件已经是非 placeholder evidence，默认拒绝覆盖，除非显式传入 `--force`：

```bash
pnpm beta:evidence:download -- \
  --compose-run-id <compose_smoke_run_id> \
  --production-run-id <production_readiness_run_id> \
  --evm-run-id <evm_workflow_run_id> \
  --woocommerce-run-id <woocommerce_workflow_run_id>
```

然后校验：

```bash
pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json
pnpm beta:release:preflight -- \
  --manifest evidence/beta-evidence.manifest.json \
  --github \
  --repo RedeemLoopProtocol/redeemloop-protocol
```

必需结果：

- Compose smoke evidence 通过。
- Production readiness evidence 通过。
- EVM wallet certification 通过。
- WooCommerce certification 通过。
- EVM 和 WooCommerce evidence 描述同一条 PaymentIntent、chain ID、transaction hash、token、receiver 和 amount。
- Commerce secret 检查通过。

### 第 6 步：生成公开 Release Evidence Notes

生成公开安全的双语 release notes artifact：

```bash
pnpm --silent beta:evidence:summary -- \
  --manifest evidence/beta-evidence.manifest.json \
  --out evidence/RELEASE_BETA.md
```

发布前检查 `evidence/RELEASE_BETA.md`。它不能暴露 API key、webhook secret、private key、完整店铺 URL、完整钱包地址或未脱敏交易元数据。

### 第 7 步：运行 Strict Release Gate

选择 beta tag，然后运行：

```bash
pnpm beta:version:prepare -- --release v0.10.x-beta.0
pnpm beta:version:prepare -- --release v0.10.x-beta.0 --write
pnpm beta:release:gate -- \
  --manifest evidence/beta-evidence.manifest.json \
  --release v0.10.x-beta.0 \
  --require-version-match
```

可选 GitHub 校验：version commit 准备好后，运行 **Beta Release Gate Evidence**，填入选定 release tag 和四个必需 evidence workflow run IDs。下载 `redeemloop-beta-release-gate` artifact，并确认 `beta-release-gate.json` 没有失败项，再继续发布。

只有 strict gate 通过后，才能继续。

### 第 8 步：发布 Beta

1. 提交 version changes。
2. 推送 commit 和 beta tag。
3. 确认 main CI 通过。
4. 为 beta tag 创建 GitHub Release。
5. 粘贴 `evidence/RELEASE_BETA.md` 中公开安全的内容。
6. 除非已经人工检查并脱敏，不要上传私有 evidence artifacts。
