#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REQUIRED_SECRETS = [
  {
    name: "REDEEMLOOP_EVM_RPC_URLS",
    action: "Set REDEEMLOOP_EVM_RPC_URLS before running EVM or production-readiness evidence workflows.",
  },
  {
    name: "REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY",
    action: "Set REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY before running WooCommerce certification evidence.",
  },
];

const ARTIFACT_ACTIONS = {
  composeSmoke: "Run the Beta Compose Smoke Evidence workflow and download compose-smoke.json into evidence/compose-smoke.json.",
  productionReadiness: "Run the Beta Production Readiness Evidence workflow and download beta-readiness-production.json into evidence/beta-readiness-production.json.",
  evmWalletCertification: "Run one real funded ERC-20 voucher transfer, then run the Beta EVM Wallet Certification Evidence workflow.",
  woocommerceCertification: "Prepare a safe WooCommerce test order, confirm settlement, then run the Beta WooCommerce Certification Evidence workflow.",
  shopifyCertification: "Optional: only provide Shopify evidence if the beta release claims Shopify live support.",
  releaseNotes: "After required private evidence passes, run beta:evidence:summary to generate evidence/RELEASE_BETA.md.",
};

const REQUIRED_ARTIFACTS = ["composeSmoke", "productionReadiness", "evmWalletCertification", "woocommerceCertification", "releaseNotes"];
const OPTIONAL_ARTIFACTS = ["shopifyCertification"];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const input = normalizeInput(args);
  const checks = [];
  const nextActions = [];
  const manifest = await readManifest(input.manifest, checks);
  const validation = manifest ? runEvidenceCheck(input.manifest, checks) : undefined;

  if (manifest && validation) {
    collectArtifactChecks(manifest, validation, checks, nextActions);
  }

  collectGithubChecks(input, checks, nextActions);
  collectSecretEnvChecks(input, checks, nextActions);

  const report = {
    checkedAt: new Date().toISOString(),
    manifestPath: input.manifest,
    release: manifest?.release,
    checks,
    nextActions: dedupeActions(nextActions),
    summary: summarizeChecks(checks),
  };

  if (input.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);

  process.exitCode = report.summary.fail > 0 ? 1 : 0;
} catch (error) {
  console.error(`RedeemLoop beta release preflight failed: ${errorMessage(error)}`);
  process.exit(1);
}

async function readManifest(path, output) {
  try {
    const manifest = JSON.parse(await readFile(path, "utf8"));
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      output.push(fail("manifest.load", "Manifest must be a JSON object", undefined));
      return undefined;
    }
    output.push(pass("manifest.load", "Manifest loaded", path));
    return manifest;
  } catch (error) {
    output.push(fail("manifest.load", `Manifest could not be loaded: ${path}`, errorMessage(error)));
    return undefined;
  }
}

function runEvidenceCheck(manifestPath, output) {
  const result = spawnSync(process.execPath, ["scripts/check-beta-evidence.mjs", "--manifest", manifestPath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const raw = result.stdout.trim();
  try {
    const report = raw ? JSON.parse(raw) : undefined;
    if (!report) {
      output.push(fail("evidence.validator", "Evidence validator returned no report", result.stderr.trim() || undefined));
      return undefined;
    }
    output.push(result.status === 0 ? pass("evidence.validator", "Evidence validator passed", report.summary) : fail("evidence.validator", "Evidence validator still has blockers", report.summary));
    return report;
  } catch {
    output.push(fail("evidence.validator", "Evidence validator did not return JSON", (result.stderr || result.stdout).trim()));
    return undefined;
  }
}

function collectArtifactChecks(manifest, validation, output, nextActions) {
  const artifacts = manifest.artifacts && typeof manifest.artifacts === "object" ? manifest.artifacts : {};
  for (const artifactName of REQUIRED_ARTIFACTS) {
    const path = stringValue(artifacts[artifactName]?.path);
    const status = artifactStatus(validation, artifactName);
    if (status.status === "pass") {
      output.push(pass(`preflight.artifact.${artifactName}`, `${artifactName} is ready`, path));
      continue;
    }
    output.push(fail(`preflight.artifact.${artifactName}`, status.message, path));
    nextActions.push(ARTIFACT_ACTIONS[artifactName]);
  }

  for (const artifactName of OPTIONAL_ARTIFACTS) {
    const path = stringValue(artifacts[artifactName]?.path);
    const status = artifactStatus(validation, artifactName);
    if (status.status === "pass") {
      output.push(pass(`preflight.artifact.${artifactName}`, `${artifactName} is ready`, path));
    } else {
      output.push(warn(`preflight.artifact.${artifactName}`, `${artifactName} is optional and not ready`, path));
      nextActions.push(ARTIFACT_ACTIONS[artifactName]);
    }
  }
}

function artifactStatus(validation, artifactName) {
  const exactName = `artifact.${artifactName}`;
  const checks = Array.isArray(validation.checks) ? validation.checks : [];
  const matching = checks.filter((item) => item?.name === exactName || String(item?.name ?? "").startsWith(`${exactName}.`));
  const passCheck = matching.find((item) => item.status === "pass" && item.name === exactName);
  if (passCheck) return { status: "pass", message: passCheck.message };
  const failCheck = matching.find((item) => item.status === "fail");
  if (failCheck) return { status: "fail", message: failCheck.message };
  const warnCheck = matching.find((item) => item.status === "warn");
  if (warnCheck) return { status: "warn", message: warnCheck.message };
  return { status: "fail", message: `${artifactName} was not checked by the evidence validator` };
}

function collectGithubChecks(input, output, nextActions) {
  if (!input.github) {
    output.push(skip("github.secrets", "GitHub secret names were not checked; pass --github to verify them with gh", undefined));
    return;
  }

  const repo = input.repo ?? inferGithubRepo();
  if (!repo) {
    output.push(fail("github.repo", "GitHub repository could not be inferred; pass --repo owner/name", undefined));
    return;
  }
  output.push(pass("github.repo", "GitHub repository selected for secret checks", repo));

  const result = spawnSync("gh", ["secret", "list", "--repo", repo], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    output.push(fail("github.secrets", "Could not list GitHub repository secrets with gh", summaryOutput(result.stderr || result.stdout || result.error?.message || "")));
    return;
  }

  const names = new Set(result.stdout.split(/\r?\n/).map((line) => line.trim().split(/\s+/)[0]).filter(Boolean));
  for (const secret of REQUIRED_SECRETS) {
    if (names.has(secret.name)) {
      output.push(pass(`github.secret.${secret.name}`, "Required repository secret is present", undefined));
    } else {
      output.push(fail(`github.secret.${secret.name}`, "Required repository secret is missing", undefined));
      nextActions.push(secret.action);
    }
  }
}

function collectSecretEnvChecks(input, output, nextActions) {
  for (const mapping of input.secretEnv) {
    const [secretName, envName] = mapping.split("=");
    if (!stringValue(secretName) || !stringValue(envName)) {
      output.push(fail("secret.env.mapping", "Secret environment mapping must use SECRET_NAME=ENV_VAR", mapping));
      continue;
    }
    if (stringValue(process.env[envName])) {
      output.push(pass(`secret.env.${secretName}`, "Required secret environment variable is present", envName));
    } else {
      output.push(fail(`secret.env.${secretName}`, "Required secret environment variable is missing", envName));
      const known = REQUIRED_SECRETS.find((secret) => secret.name === secretName);
      nextActions.push(known?.action ?? `Set ${secretName} before running beta certification workflows.`);
    }
  }
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

function parseArgs(argv) {
  const parsed = {
    github: false,
    json: false,
    help: false,
    secretEnv: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--github") parsed.github = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--manifest") parsed.manifest = requireNextValue(argv, ++index, arg);
    else if (arg === "--repo") parsed.repo = requireNextValue(argv, ++index, arg);
    else if (arg === "--secret-env") parsed.secretEnv.push(requireNextValue(argv, ++index, arg));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function normalizeInput(raw) {
  return {
    manifest: resolve(raw.manifest ?? "evidence/beta-evidence.manifest.json"),
    repo: raw.repo,
    github: raw.github,
    secretEnv: raw.secretEnv,
    json: raw.json,
  };
}

function printHelp() {
  console.log(`RedeemLoop beta release preflight

Usage:
  node scripts/beta-release-preflight.mjs --manifest evidence/beta-evidence.manifest.json [--github] [--repo owner/name] [--secret-env SECRET_NAME=ENV_VAR] [--json]

The preflight summarizes the remaining beta publication blockers from the evidence manifest.
It is read-only: it does not send wallet transactions, call commerce adapters, or read secret values.
Use --github to verify required repository secret names with the GitHub CLI.
Use --secret-env in GitHub Actions to verify that a secret was injected into an environment variable without printing the value.
`);
}

function printReport(report) {
  console.log(`RedeemLoop beta release preflight: ${report.release ?? "unknown release"}`);
  console.log(`Manifest: ${report.manifestPath}`);
  console.log("");
  for (const item of report.checks) {
    console.log(`[${item.status.toUpperCase()}] ${item.name} - ${item.message}`);
  }
  console.log("");
  console.log(`Summary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail, ${report.summary.skip} skip`);
  if (report.nextActions.length > 0) {
    console.log("");
    console.log("Next actions:");
    report.nextActions.forEach((action, index) => {
      console.log(`${index + 1}. ${action}`);
    });
  }
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function dedupeActions(actions) {
  return [...new Set(actions.filter(Boolean))];
}

function summarizeChecks(items) {
  return {
    pass: items.filter((item) => item.status === "pass").length,
    warn: items.filter((item) => item.status === "warn").length,
    fail: items.filter((item) => item.status === "fail").length,
    skip: items.filter((item) => item.status === "skip").length,
  };
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

function skip(name, message, details) {
  return { name, status: "skip", message, details };
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function summaryOutput(value) {
  return String(value).trim().split(/\r?\n/).slice(-12).join("\n");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
