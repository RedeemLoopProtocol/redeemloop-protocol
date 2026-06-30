#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const checks = [];
const manifestPath = resolve(args.manifest ?? "evidence/beta-evidence.manifest.json");
const manifest = await readManifest(manifestPath, checks);

if (manifest) {
  if (args.release && manifest.release !== args.release) {
    checks.push(fail("release.match", `Manifest release does not match expected release ${args.release}`, manifest.release));
  } else {
    checks.push(pass("release.match", "Release identifier is configured", manifest.release));
  }

  checkEvidenceManifest(manifestPath, checks);
  await checkReleaseNotes(manifest, checks);
}

await checkReadmeGate(checks);
await checkGithubWorkflows(checks);
await checkPnpmSettings(checks);
checkFrozenLockfile(checks);
await checkWorkspaceVersions(args, manifest, checks);

const report = {
  checkedAt: new Date().toISOString(),
  manifestPath,
  release: args.release ?? manifest?.release,
  checks,
  summary: summarizeChecks(checks),
};

if (args.json) console.log(JSON.stringify(report, null, 2));
else printReport(report);

process.exitCode = report.summary.fail > 0 ? 1 : 0;

async function readManifest(path, output) {
  try {
    const manifest = JSON.parse(await readFile(path, "utf8"));
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      output.push(fail("manifest.load", "Manifest must be a JSON object", manifest));
      return undefined;
    }
    output.push(pass("manifest.load", "Manifest loaded", path));
    return manifest;
  } catch (error) {
    output.push(fail("manifest.load", `Manifest could not be loaded: ${path}`, errorMessage(error)));
    return undefined;
  }
}

function checkEvidenceManifest(path, output) {
  const result = spawnSync(process.execPath, ["scripts/check-beta-evidence.mjs", "--manifest", path, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const raw = result.stdout.trim();
  let report;
  try {
    report = raw ? JSON.parse(raw) : undefined;
  } catch {
    output.push(fail("evidence.manifest", "Evidence validator did not return JSON", (result.stderr || result.stdout).trim()));
    return;
  }

  if (result.status === 0 && Number(report?.summary?.fail ?? 0) === 0) {
    output.push(pass("evidence.manifest", "Evidence manifest validator passed", report.summary));
    return;
  }

  output.push(fail("evidence.manifest", "Evidence manifest validator failed", {
    status: result.status,
    summary: report?.summary,
    failures: Array.isArray(report?.checks) ? report.checks.filter((item) => item.status === "fail") : undefined,
    stderr: result.stderr.trim() || undefined,
  }));
}

async function checkReleaseNotes(manifest, output) {
  const artifact = manifest.artifacts?.releaseNotes;
  const path = stringValue(artifact?.path);
  if (!path) {
    output.push(fail("release.notes.path", "Manifest releaseNotes artifact path is required", artifact));
    return;
  }

  let raw;
  try {
    raw = await readFile(resolve(path), "utf8");
  } catch (error) {
    output.push(fail("release.notes.load", "Release notes could not be loaded", errorMessage(error)));
    return;
  }

  const hasEnglish = /(^|\n)## English(\n|$)/.test(raw);
  const hasChinese = /(^|\n)## 中文(\n|$)/.test(raw);
  if (!hasEnglish || !hasChinese) {
    output.push(fail("release.notes.bilingual", "Release notes must contain pure English and Chinese sections", { hasEnglish, hasChinese }));
  } else {
    output.push(pass("release.notes.bilingual", "Release notes contain English and Chinese sections", path));
  }

  if (/BETA_EVIDENCE_PLACEHOLDER|Replace this file|TODO beta|TBD beta/i.test(raw)) {
    output.push(fail("release.notes.placeholder", "Release notes still contain placeholder text", path));
  } else {
    output.push(pass("release.notes.placeholder", "Release notes do not contain beta placeholder markers", path));
  }

  const secretMatches = findSecretLikeText(raw);
  if (secretMatches.length > 0) {
    output.push(fail("release.notes.secrets", "Release notes contain secret-like text that must not be published", secretMatches));
  } else {
    output.push(pass("release.notes.secrets", "Release notes do not contain obvious secret material", path));
  }

  const publicMetadataLeaks = findPublicMetadataLeaks(raw);
  if (publicMetadataLeaks.length > 0) {
    output.push(fail("release.notes.public_metadata", "Release notes contain unredacted public chain metadata", publicMetadataLeaks));
  } else {
    output.push(pass("release.notes.public_metadata", "Release notes do not contain full EVM addresses or transaction hashes", path));
  }
}

async function checkReadmeGate(output) {
  const english = await readText("README.md", output);
  const chinese = await readText("README.zh-CN.md", output);

  if (english && english.includes("docs/BETA_READINESS.md") && english.includes("pnpm beta:check")) {
    output.push(pass("readme.english_beta_gate", "English README links beta readiness checks", undefined));
  } else {
    output.push(fail("readme.english_beta_gate", "English README must link beta readiness checks and mention pnpm beta:check", undefined));
  }

  if (chinese && chinese.includes("docs/BETA_READINESS.md") && chinese.includes("pnpm beta:check")) {
    output.push(pass("readme.chinese_beta_gate", "Chinese README links beta readiness checks", undefined));
  } else {
    output.push(fail("readme.chinese_beta_gate", "Chinese README must link beta readiness checks and mention pnpm beta:check", undefined));
  }
}

async function checkGithubWorkflows(output) {
  const ci = await readText(".github/workflows/ci.yml", output);
  const pages = await readText(".github/workflows/pages.yml", output);
  const composeSmoke = await readText(".github/workflows/beta-compose-smoke.yml", output);
  const productionReadiness = await readText(".github/workflows/beta-production-readiness.yml", output);
  const evmCertification = await readText(".github/workflows/beta-evm-certification.yml", output);
  const commerceCertification = await readText(".github/workflows/beta-commerce-certification.yml", output);
  const releasePreflight = await readText(".github/workflows/beta-release-preflight.yml", output);

  if (ci && ci.includes("pnpm install --frozen-lockfile") && ci.includes("pnpm build") && ci.includes("pnpm test")) {
    output.push(pass("github.ci", "CI workflow covers install, test, and build", undefined));
  } else {
    output.push(fail("github.ci", "CI workflow must cover install, test, and build", undefined));
  }

  if (pages && pages.includes("actions/deploy-pages") && pages.includes("@redeemloop/site build")) {
    output.push(pass("github.pages", "GitHub Pages workflow is present", undefined));
  } else {
    output.push(warn("github.pages", "GitHub Pages workflow was not found or does not build the site", undefined));
  }

  const composeSmokeRequirements = {
    workflowDispatch: composeSmoke?.includes("workflow_dispatch:") ?? false,
    frozenInstall: composeSmoke?.includes("pnpm install --frozen-lockfile") ?? false,
    workspaceBuild: composeSmoke?.includes("pnpm build") ?? false,
    composeSmokeJson: composeSmoke?.includes("pnpm --silent beta:smoke:compose -- --json") ?? false,
    jsonValidation: composeSmoke?.includes("JSON.parse") ?? false,
    artifactUpload: composeSmoke?.includes("actions/upload-artifact") ?? false,
    artifactName: composeSmoke?.includes("redeemloop-compose-smoke-evidence") ?? false,
  };
  if (Object.values(composeSmokeRequirements).every(Boolean)) {
    output.push(pass("github.beta_compose_smoke", "Beta compose-smoke evidence workflow is present", undefined));
  } else {
    output.push(fail("github.beta_compose_smoke", "Beta compose-smoke evidence workflow must build, run smoke, validate JSON, and upload the evidence artifact", composeSmokeRequirements));
  }

  const productionReadinessRequirements = {
    workflowDispatch: productionReadiness?.includes("workflow_dispatch:") ?? false,
    evmRpcSecret: productionReadiness?.includes("secrets.REDEEMLOOP_EVM_RPC_URLS") ?? false,
    frozenInstall: productionReadiness?.includes("pnpm install --frozen-lockfile") ?? false,
    workspaceBuild: productionReadiness?.includes("pnpm build") ?? false,
    composeKeepUp: productionReadiness?.includes("pnpm --silent beta:smoke:compose -- --keep-up --json") ?? false,
    productionCheckJson: productionReadiness?.includes("pnpm --silent beta:check:production -- --json") ?? false,
    jsonValidation: productionReadiness?.includes("JSON.parse") ?? false,
    composeDown: productionReadiness?.includes("docker compose down") ?? false,
    artifactUpload: productionReadiness?.includes("actions/upload-artifact") ?? false,
    artifactName: productionReadiness?.includes("redeemloop-production-readiness-evidence") ?? false,
  };
  if (Object.values(productionReadinessRequirements).every(Boolean)) {
    output.push(pass("github.beta_production_readiness", "Beta production-readiness evidence workflow is present", undefined));
  } else {
    output.push(fail("github.beta_production_readiness", "Beta production-readiness evidence workflow must run compose, collect production readiness JSON, clean up, and upload artifacts", productionReadinessRequirements));
  }

  const evmCertificationRequirements = {
    workflowDispatch: evmCertification?.includes("workflow_dispatch:") ?? false,
    evmRpcSecret: evmCertification?.includes("secrets.REDEEMLOOP_EVM_RPC_URLS") ?? false,
    frozenInstall: evmCertification?.includes("pnpm install --frozen-lockfile") ?? false,
    evidenceCommand: evmCertification?.includes("pnpm --silent beta:evidence:evm") ?? false,
    jsonValidation: evmCertification?.includes("JSON.parse") ?? false,
    artifactUpload: evmCertification?.includes("actions/upload-artifact") ?? false,
    artifactName: evmCertification?.includes("redeemloop-evm-wallet-certification-evidence") ?? false,
  };
  if (Object.values(evmCertificationRequirements).every(Boolean)) {
    output.push(pass("github.beta_evm_certification", "Beta EVM wallet certification workflow is present", undefined));
  } else {
    output.push(fail("github.beta_evm_certification", "Beta EVM wallet certification workflow must collect receipt evidence and upload an artifact", evmCertificationRequirements));
  }

  const commerceCertificationRequirements = {
    workflowDispatch: commerceCertification?.includes("workflow_dispatch:") ?? false,
    apiKeySecret: commerceCertification?.includes("secrets.REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY") ?? false,
    frozenInstall: commerceCertification?.includes("pnpm install --frozen-lockfile") ?? false,
    evidenceCommand: commerceCertification?.includes("pnpm --silent beta:evidence:commerce") ?? false,
    woocommerceProvider: commerceCertification?.includes("--provider woocommerce") ?? false,
    txHashRequired: workflowInputRequired(commerceCertification, "tx_hash"),
    jsonValidation: commerceCertification?.includes("JSON.parse") ?? false,
    artifactUpload: commerceCertification?.includes("actions/upload-artifact") ?? false,
    artifactName: commerceCertification?.includes("redeemloop-woocommerce-certification-evidence") ?? false,
  };
  if (Object.values(commerceCertificationRequirements).every(Boolean)) {
    output.push(pass("github.beta_woocommerce_certification", "Beta WooCommerce certification workflow is present", undefined));
  } else {
    output.push(fail("github.beta_woocommerce_certification", "Beta WooCommerce certification workflow must collect live mark-as-paid evidence and upload an artifact", commerceCertificationRequirements));
  }

  const releasePreflightRequirements = {
    workflowDispatch: releasePreflight?.includes("workflow_dispatch:") ?? false,
    frozenInstall: releasePreflight?.includes("pnpm install --frozen-lockfile") ?? false,
    evidenceInit: releasePreflight?.includes("pnpm --silent beta:evidence:init") ?? false,
    evidenceDownload: releasePreflight?.includes("pnpm --silent beta:evidence:download") ?? false,
    composeRunId: releasePreflight?.includes("--compose-run-id") ?? false,
    productionRunId: releasePreflight?.includes("--production-run-id") ?? false,
    evmRunId: releasePreflight?.includes("--evm-run-id") ?? false,
    woocommerceRunId: releasePreflight?.includes("--woocommerce-run-id") ?? false,
    downloadWarning: releasePreflight?.includes("selected evidence artifacts could not be downloaded") ?? false,
    preflightCommand: releasePreflight?.includes("pnpm --silent beta:release:preflight") ?? false,
    evmSecretEnv: releasePreflight?.includes("REDEEMLOOP_EVM_RPC_URLS=REDEEMLOOP_EVM_RPC_URLS") ?? false,
    commerceSecretEnv: releasePreflight?.includes("REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY=REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY") ?? false,
    jsonValidation: releasePreflight?.includes("JSON.parse") ?? false,
    artifactUpload: releasePreflight?.includes("actions/upload-artifact") ?? false,
    artifactName: releasePreflight?.includes("redeemloop-beta-release-preflight") ?? false,
  };
  if (Object.values(releasePreflightRequirements).every(Boolean)) {
    output.push(pass("github.beta_release_preflight", "Beta release preflight workflow is present", undefined));
  } else {
    output.push(fail("github.beta_release_preflight", "Beta release preflight workflow must initialize evidence, optionally download artifacts, run preflight, and upload a preflight report", releasePreflightRequirements));
  }
}

async function checkPnpmSettings(output) {
  const rootPackage = await readText("package.json", output);
  if (rootPackage) {
    try {
      const parsed = JSON.parse(rootPackage);
      if (parsed.pnpm !== undefined) {
        output.push(fail("pnpm.settings.deprecated_package_field", "Root package.json must not use the deprecated pnpm settings field", undefined));
      } else {
        output.push(pass("pnpm.settings.deprecated_package_field", "Root package.json does not use deprecated pnpm settings", undefined));
      }
    } catch (error) {
      output.push(fail("pnpm.settings.package_json", "Root package.json could not be parsed", errorMessage(error)));
    }
  }

  const workspace = await readText("pnpm-workspace.yaml", output);
  if (!workspace) return;
  const hasOverridesBlock = /(^|\n)overrides:\s*(\n|$)/.test(workspace);
  const hasPostcssOverride = /(^|\n)\s{2}postcss:\s*8\.5\.15\s*(\n|$)/.test(workspace);
  const hasWsOverride = /(^|\n)\s{2}ws:\s*8\.21\.0\s*(\n|$)/.test(workspace);
  if (hasOverridesBlock && hasPostcssOverride && hasWsOverride) {
    output.push(pass("pnpm.settings.workspace_overrides", "Workspace pnpm overrides are configured", undefined));
  } else {
    output.push(fail("pnpm.settings.workspace_overrides", "pnpm-workspace.yaml must configure the required postcss and ws overrides", { hasOverridesBlock, hasPostcssOverride, hasWsOverride }));
  }
}

function checkFrozenLockfile(output) {
  const result = spawnSync("corepack", ["pnpm", "install", "--lockfile-only", "--frozen-lockfile"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status === 0) {
    output.push(pass("pnpm.lockfile.frozen", "pnpm lockfile is in sync with workspace manifests", summaryOutput(result.stdout)));
    return;
  }
  output.push(fail("pnpm.lockfile.frozen", "pnpm frozen lockfile check failed", summaryOutput(result.stderr || result.stdout || result.error?.message || "")));
}

function workflowInputRequired(text, inputName) {
  if (!text) return false;
  const escaped = inputName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)\\s{6}${escaped}:\\n([\\s\\S]*?)(?=\\n\\s{6}[a-zA-Z0-9_]+:|\\npermissions:|\\njobs:|$)`);
  const match = text.match(pattern);
  return Boolean(match && /(^|\n)\s{8}required:\s*true\s*(\n|$)/.test(match[1]));
}

async function checkWorkspaceVersions(args, manifest, output) {
  const packageFiles = ["package.json", ...(await collectPackageJsons("packages")), ...(await collectPackageJsons("apps")), ...(await collectPackageJsons("services"))];
  const packages = [];
  for (const path of packageFiles) {
    try {
      const parsed = JSON.parse(await readFile(path, "utf8"));
      packages.push({ path, name: parsed.name, version: parsed.version });
    } catch (error) {
      output.push(fail("versions.read", `Could not read package file: ${path}`, errorMessage(error)));
    }
  }

  const versions = [...new Set(packages.map((item) => item.version).filter(Boolean))];
  if (versions.length === 1) {
    output.push(pass("versions.workspace_consistent", "Workspace package versions are consistent", versions[0]));
  } else {
    output.push(fail("versions.workspace_consistent", "Workspace package versions must be consistent before beta release", packages));
  }

  const expected = releaseToPackageVersion(args.release ?? manifest?.release);
  if (!expected) {
    output.push(warn("versions.release_match", "Release identifier is not semver-like; package version match was skipped", manifest?.release));
    return;
  }

  const mismatched = packages.filter((item) => item.version !== expected);
  if (mismatched.length === 0) {
    output.push(pass("versions.release_match", "Workspace package versions match the release tag", expected));
  } else if (args.requireVersionMatch) {
    output.push(fail("versions.release_match", "Workspace package versions must match the release tag", { expected, mismatched }));
  } else {
    output.push(warn("versions.release_match", "Workspace package versions do not yet match the release tag", { expected, current: versions, mismatched: mismatched.map((item) => item.path) }));
  }
}

async function collectPackageJsons(root) {
  const output = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    output.push(join(root, entry.name, "package.json"));
  }
  return output;
}

async function readText(path, output) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    output.push(fail(`file.${path}`, `Could not read ${path}`, errorMessage(error)));
    return undefined;
  }
}

function parseArgs(argv) {
  const parsed = {
    json: false,
    help: false,
    requireVersionMatch: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--require-version-match") parsed.requireVersionMatch = true;
    else if (arg === "--manifest") parsed.manifest = requireNextValue(argv, ++index, arg);
    else if (arg === "--release") parsed.release = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop beta release gate

Usage:
  node scripts/beta-release-gate.mjs --manifest evidence/beta-evidence.manifest.json [options]

Options:
  --release VERSION          Require manifest.release to match VERSION.
  --require-version-match    Fail unless all package versions match the release tag without leading "v".
  --json                     Print JSON output.

The gate combines evidence validation, bilingual release-note checks, README/CI/Pages/compose-smoke/
production-readiness/EVM/WooCommerce release-surface checks, pnpm settings and frozen-lockfile checks, and
workspace version consistency before publishing a beta release.
`);
}

function printReport(report) {
  console.log(`RedeemLoop beta release gate: ${report.release ?? "unknown release"}`);
  console.log(`Manifest: ${report.manifestPath}`);
  console.log("");
  for (const item of report.checks) {
    console.log(`[${item.status.toUpperCase()}] ${item.name} - ${item.message}`);
  }
  console.log("");
  console.log(`Summary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail`);
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function releaseToPackageVersion(value) {
  if (!value || typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/^v/, "");
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalized) ? normalized : undefined;
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function summaryOutput(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return undefined;
  const lines = normalized.split(/\r?\n/).filter(Boolean);
  return lines.slice(-6).join("\n");
}

function findSecretLikeText(raw) {
  const patterns = [
    ["pem_private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/gi],
    ["authorization_bearer", /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi],
    ["redeemloop_api_key", /\bREDEEMLOOP_API_KEY\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{8,}/gi],
    ["redeemloop_webhook_secret", /\bREDEEMLOOP_WEBHOOK_SECRET\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{8,}/gi],
    ["shopify_access_token", /\bSHOPIFY_ADMIN_ACCESS_TOKEN\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{8,}/gi],
    ["xverse_api_key", /\bXVERSE_API_KEY\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{8,}/gi],
    ["evm_private_key", /\b(?:EVM_)?PRIVATE_KEY\s*[:=]\s*['"]?(?:0x)?[A-Fa-f0-9]{64}/gi],
    ["webhook_secret_literal", /\bwebhook[_ -]?secret\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{16,}/gi],
    ["woocommerce_secret", /\bcs_[A-Za-z0-9]{20,}/g],
    ["github_token", /\bgh[pousr]_[A-Za-z0-9_]{30,}/g],
  ];
  const matches = [];
  for (const [type, pattern] of patterns) {
    for (const match of raw.matchAll(pattern)) {
      matches.push({ type, sample: redactSecret(match[0]) });
    }
  }
  return matches;
}

function findPublicMetadataLeaks(raw) {
  const patterns = [
    ["evm_tx_hash", /\b0x[0-9a-fA-F]{64}\b/g],
    ["evm_address", /\b0x[0-9a-fA-F]{40}\b/g],
  ];
  const matches = [];
  for (const [type, pattern] of patterns) {
    for (const match of raw.matchAll(pattern)) {
      matches.push({ type, sample: redactSecret(match[0]) });
    }
  }
  return matches;
}

function redactSecret(value) {
  const normalized = String(value).replace(/\s+/g, " ");
  if (normalized.length <= 16) return "***";
  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

function pass(name, message, details) {
  return { name, status: "pass", message, details };
}

function warn(name, message, details) {
  return { name, status: "warn", message, details };
}

function fail(name, message, details) {
  return { name, status: "fail", message, details };
}

function summarizeChecks(items) {
  return {
    pass: items.filter((item) => item.status === "pass").length,
    warn: items.filter((item) => item.status === "warn").length,
    fail: items.filter((item) => item.status === "fail").length,
  };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
