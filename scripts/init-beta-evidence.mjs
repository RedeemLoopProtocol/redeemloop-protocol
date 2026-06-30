#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const evidenceDir = resolve(args.dir);
const files = buildFiles(evidenceDir, args.release);

for (const file of files) {
  await ensureWritable(file.path, args.force);
}

await mkdir(evidenceDir, { recursive: true });
for (const file of files) {
  await mkdir(dirname(file.path), { recursive: true });
  await writeFile(file.path, `${file.content}\n`, "utf8");
}

printSummary(files, args);

function buildFiles(dir, release) {
  const manifestPath = resolve(dir, "beta-evidence.manifest.json");
  const composeSmokePath = resolve(dir, "compose-smoke.json");
  const readinessPath = resolve(dir, "beta-readiness-production.json");
  const evmPath = resolve(dir, "evm-wallet-certification.json");
  const woocommercePath = resolve(dir, "woocommerce-certification.json");
  const shopifyPath = resolve(dir, "shopify-certification.json");
  const releaseNotesPath = resolve(dir, "RELEASE_BETA.md");

  const manifest = {
    version: 1,
    release,
    checkedAt: new Date().toISOString(),
    artifacts: {
      composeSmoke: {
        path: manifestPathFor(composeSmokePath),
        required: true,
        type: "compose-smoke",
      },
      productionReadiness: {
        path: manifestPathFor(readinessPath),
        required: true,
        type: "beta-readiness",
      },
      evmWalletCertification: {
        path: manifestPathFor(evmPath),
        required: true,
        type: "evm-certification",
      },
      woocommerceCertification: {
        path: manifestPathFor(woocommercePath),
        required: true,
        type: "commerce-certification",
      },
      shopifyCertification: {
        path: manifestPathFor(shopifyPath),
        required: false,
        type: "commerce-certification",
      },
      releaseNotes: {
        path: manifestPathFor(releaseNotesPath),
        required: true,
        type: "markdown",
      },
    },
  };

  return [
    {
      path: manifestPath,
      content: json(manifest),
    },
    {
      path: composeSmokePath,
      content: json({
        checkedAt: new Date().toISOString(),
        placeholder: true,
        replaceWith: "corepack pnpm --silent beta:smoke:compose -- --json > evidence/compose-smoke.json",
        checks: [
          {
            name: "api.health",
            status: "fail",
            message: "Placeholder only. Replace with Docker Compose smoke JSON from a Docker-enabled machine.",
          },
        ],
        summary: {
          pass: 0,
          warn: 0,
          fail: 1,
        },
      }),
    },
    {
      path: readinessPath,
      content: json({
        checkedAt: new Date().toISOString(),
        placeholder: true,
        replaceWith: "corepack pnpm --silent beta:check:production -- --json > evidence/beta-readiness-production.json",
        checks: [
          {
            name: "api.health",
            status: "fail",
            message: "Placeholder only. Replace with production readiness JSON from the target deployment.",
          },
        ],
        summary: {
          pass: 0,
          warn: 0,
          fail: 1,
        },
      }),
    },
    {
      path: evmPath,
      content: json({
        placeholder: true,
        replaceWith: "corepack pnpm --silent beta:evidence:evm -- --chain-id <id> --rpc-url <url> --wallet-name <wallet> --wallet-version <version> --intent-id <intent> --tx-hash <hash> --from <payer> --to <merchantVault> --contract <voucherToken> --amount <integer> --out evidence/evm-wallet-certification.json",
        chainId: "",
        walletName: "",
        walletVersion: "",
        intentId: "",
        txHash: "",
        from: "",
        to: "",
        contract: "",
        amount: "",
        receiptStatus: "placeholder",
        confirmations: 0,
        checkedAt: "",
      }),
    },
    {
      path: woocommercePath,
      content: json({
        placeholder: true,
        replaceWith: "corepack pnpm --silent beta:evidence:commerce -- --api-base-url <url> --api-key <key> --provider woocommerce --store-url <store> --order-id <order> --intent-id <intent> --chain-id <id> --merchant-id <merchant> --voucher-token <token> --amount <integer> --receiver <merchantVault> --tx-hash <hash> --out evidence/woocommerce-certification.json",
        provider: "woocommerce",
        storeUrl: "",
        orderId: "",
        intentId: "",
        markPaidStatus: "placeholder",
        dryRun: true,
        checkedAt: "",
      }),
    },
    {
      path: releaseNotesPath,
      content: `# ${release} Beta Release Evidence

BETA_EVIDENCE_PLACEHOLDER

Replace this file with bilingual beta release notes after the compose, production readiness, funded wallet, and commerce certification artifacts are real.
`,
    },
  ];
}

async function ensureWritable(path, force) {
  if (force) return;
  try {
    await access(path);
  } catch {
    return;
  }
  throw new Error(`${manifestPathFor(path)} already exists. Re-run with --force to overwrite.`);
}

function manifestPathFor(path) {
  const rel = relative(process.cwd(), path);
  if (!rel || rel.startsWith("..")) return path;
  return rel.split(sep).join("/");
}

function json(value) {
  return JSON.stringify(value, null, 2);
}

function parseArgs(argv) {
  const parsed = {
    dir: "evidence",
    release: "v0.10.x-beta",
    force: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--dir") parsed.dir = requireNextValue(argv, ++index, arg);
    else if (arg === "--release") parsed.release = requireNextValue(argv, ++index, arg);
    else if (arg === "--force") parsed.force = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop beta evidence scaffold

Usage:
  node scripts/init-beta-evidence.mjs [--dir evidence] [--release v0.10.x-beta] [--force]

Creates a local evidence manifest and intentionally failing placeholder artifacts.
Replace the placeholders with real external certification outputs before publishing a beta release.
`);
}

function printSummary(files, options) {
  console.log(`Created RedeemLoop beta evidence scaffold for ${options.release}:`);
  for (const file of files) {
    console.log(`- ${manifestPathFor(file.path)}`);
  }
  console.log("");
  console.log("Next:");
  console.log(`1. Run Docker Compose smoke on a Docker-enabled machine and replace ${manifestPathFor(resolve(evidenceDir, "compose-smoke.json"))}.`);
  console.log(`2. Run production readiness against the target deployment and replace ${manifestPathFor(resolve(evidenceDir, "beta-readiness-production.json"))}.`);
  console.log("3. Replace the EVM and commerce certification placeholders with real funded-wallet and test-store evidence.");
  console.log(`4. Run: corepack pnpm beta:evidence:check -- --manifest ${manifestPathFor(resolve(evidenceDir, "beta-evidence.manifest.json"))}`);
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}
