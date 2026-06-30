#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const ARTIFACTS = {
  composeSmoke: {
    flag: "compose-run-id",
    artifactName: "redeemloop-compose-smoke-evidence",
    sourceFile: "compose-smoke.json",
    targetFile: "compose-smoke.json",
  },
  productionReadiness: {
    flag: "production-run-id",
    artifactName: "redeemloop-production-readiness-evidence",
    sourceFile: "beta-readiness-production.json",
    targetFile: "beta-readiness-production.json",
  },
  evmWalletCertification: {
    flag: "evm-run-id",
    artifactName: "redeemloop-evm-wallet-certification-evidence",
    sourceFile: "evm-wallet-certification.json",
    targetFile: "evm-wallet-certification.json",
  },
  woocommerceCertification: {
    flag: "woocommerce-run-id",
    artifactName: "redeemloop-woocommerce-certification-evidence",
    sourceFile: "woocommerce-certification.json",
    targetFile: "woocommerce-certification.json",
  },
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const input = normalizeInput(args);
  const selected = selectedArtifacts(input);
  if (selected.length === 0) throw new Error("At least one evidence run ID is required");
  if (!input.repo) throw new Error("GitHub repository could not be inferred; pass --repo OWNER/NAME");
  if (input.force && input.missingOnly) throw new Error("--force and --missing-only cannot be used together");

  await mkdir(input.dir, { recursive: true });
  const tempRoot = await mkdtemp(join(tmpdir(), "redeemloop-evidence-download-"));
  const results = [];

  try {
    for (const item of selected) {
      const result = await downloadArtifact(item, input, tempRoot);
      results.push(result);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  const report = {
    checkedAt: new Date().toISOString(),
    repo: input.repo,
    evidenceDir: publicPath(input.dir),
    results,
    summary: summarizeResults(results),
  };

  if (input.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);

  process.exitCode = report.summary.failed > 0 ? 1 : 0;
} catch (error) {
  console.error(`RedeemLoop beta evidence artifact download failed: ${errorMessage(error)}`);
  process.exit(1);
}

async function downloadArtifact(item, input, tempRoot) {
  const targetPath = resolve(input.dir, item.targetFile);
  const existing = await existingTargetStatus(targetPath);
  if (existing.exists && input.missingOnly) {
    return result(item, targetPath, "skipped", "Target already exists and --missing-only was set");
  }
  if (existing.exists && !existing.placeholder && !input.force) {
    return result(item, targetPath, "failed", "Target already exists and is not a placeholder; pass --force to overwrite");
  }

  const artifactDir = join(tempRoot, item.name);
  await mkdir(artifactDir, { recursive: true });
  const ghResult = spawnSync("gh", ["run", "download", item.runId, "--repo", input.repo, "--name", item.artifactName, "--dir", artifactDir], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (ghResult.status !== 0) {
    return result(item, targetPath, "failed", summaryOutput(ghResult.stderr || ghResult.stdout || ghResult.error?.message || "gh run download failed"));
  }

  const sourcePath = resolve(artifactDir, item.sourceFile);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(sourcePath, "utf8"));
  } catch (error) {
    return result(item, targetPath, "failed", `Downloaded artifact did not contain valid ${item.sourceFile}: ${errorMessage(error)}`);
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  return result(item, targetPath, existing.exists ? "overwritten" : "created", "Downloaded and validated JSON artifact", summarizeArtifact(parsed));
}

async function existingTargetStatus(path) {
  try {
    const raw = await readFile(path, "utf8");
    try {
      const parsed = JSON.parse(raw);
      return { exists: true, placeholder: parsed?.placeholder === true };
    } catch {
      return { exists: true, placeholder: raw.includes("BETA_EVIDENCE_PLACEHOLDER") };
    }
  } catch {
    return { exists: false, placeholder: false };
  }
}

function selectedArtifacts(input) {
  const selected = [];
  for (const [name, definition] of Object.entries(ARTIFACTS)) {
    const runId = input.runIds[name];
    if (!runId) continue;
    selected.push({ ...definition, name, runId });
  }
  return selected;
}

function result(item, targetPath, status, message, details) {
  return {
    artifact: item.name,
    runId: item.runId,
    artifactName: item.artifactName,
    target: publicPath(targetPath),
    status,
    message,
    details,
  };
}

function summarizeArtifact(value) {
  if (value?.summary && typeof value.summary === "object") return value.summary;
  const summary = {};
  for (const key of ["chainId", "intentId", "provider", "orderId", "txHash"]) {
    if (value?.[key] !== undefined) summary[key] = key === "txHash" ? redact(value[key]) : value[key];
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

function parseArgs(argv) {
  const parsed = {
    dir: "evidence",
    repo: undefined,
    runIds: {},
    force: false,
    missingOnly: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--dir") parsed.dir = requireNextValue(argv, ++index, arg);
    else if (arg === "--repo") parsed.repo = requireNextValue(argv, ++index, arg);
    else if (arg === "--force") parsed.force = true;
    else if (arg === "--missing-only") parsed.missingOnly = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--compose-run-id") parsed.runIds.composeSmoke = requireNextValue(argv, ++index, arg);
    else if (arg === "--production-run-id") parsed.runIds.productionReadiness = requireNextValue(argv, ++index, arg);
    else if (arg === "--evm-run-id") parsed.runIds.evmWalletCertification = requireNextValue(argv, ++index, arg);
    else if (arg === "--woocommerce-run-id") parsed.runIds.woocommerceCertification = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function normalizeInput(raw) {
  return {
    dir: resolve(raw.dir),
    repo: raw.repo ?? inferGithubRepo(),
    runIds: raw.runIds,
    force: raw.force,
    missingOnly: raw.missingOnly,
    json: raw.json,
  };
}

function inferGithubRepo() {
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return undefined;
  const remote = result.stdout.trim();
  const httpsMatch = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!httpsMatch) return undefined;
  return `${httpsMatch[1]}/${httpsMatch[2]}`;
}

function printHelp() {
  console.log(`RedeemLoop beta evidence artifact download

Usage:
  node scripts/download-beta-evidence-artifacts.mjs [options]

Options:
  --repo OWNER/NAME          GitHub repository. Defaults to origin remote.
  --dir PATH                 Evidence directory. Defaults to evidence.
  --compose-run-id ID        Download redeemloop-compose-smoke-evidence.
  --production-run-id ID     Download redeemloop-production-readiness-evidence.
  --evm-run-id ID            Download redeemloop-evm-wallet-certification-evidence.
  --woocommerce-run-id ID    Download redeemloop-woocommerce-certification-evidence.
  --force                    Overwrite existing non-placeholder target artifacts.
  --missing-only             Skip artifacts whose target files already exist.
  --json                     Print JSON report.

By default, existing non-placeholder evidence files are not overwritten.
Placeholder files from beta:evidence:init may be replaced.
`);
}

function printReport(report) {
  console.log("RedeemLoop beta evidence artifact download");
  console.log(`Repository: ${report.repo ?? "not configured"}`);
  console.log(`Evidence directory: ${report.evidenceDir}`);
  console.log("");
  for (const item of report.results) {
    console.log(`[${item.status.toUpperCase()}] ${item.artifact} -> ${item.target} - ${item.message}`);
  }
  console.log("");
  console.log(`Summary: ${report.summary.created} created, ${report.summary.overwritten} overwritten, ${report.summary.skipped} skipped, ${report.summary.failed} failed`);
}

function summarizeResults(results) {
  return {
    created: results.filter((item) => item.status === "created").length,
    overwritten: results.filter((item) => item.status === "overwritten").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    failed: results.filter((item) => item.status === "failed").length,
  };
}

function publicPath(path) {
  const rel = relative(process.cwd(), path);
  if (rel && !rel.startsWith("..") && !rel.startsWith(sep)) return rel.split(sep).join("/");
  return basename(path);
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function summaryOutput(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return undefined;
  const lines = normalized.split(/\r?\n/).filter(Boolean);
  return lines.slice(-6).join("\n");
}

function redact(value) {
  const normalized = String(value ?? "");
  if (normalized.length <= 14) return "***";
  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
