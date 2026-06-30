#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const input = normalizeInput(args);
  const packageFiles = await collectWorkspacePackageFiles(input.root);
  const changes = [];

  for (const path of packageFiles) {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    const current = parsed.version;
    if (current !== input.version) {
      changes.push({
        path,
        name: parsed.name,
        from: current,
        to: input.version,
      });
      if (input.write) {
        parsed.version = input.version;
        await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      }
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    root: input.root,
    release: input.release,
    version: input.version,
    mode: input.write ? "write" : "dry-run",
    packageCount: packageFiles.length,
    changes,
    summary: {
      changed: changes.length,
      unchanged: packageFiles.length - changes.length,
    },
  };

  if (input.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
} catch (error) {
  console.error(`RedeemLoop beta version preparation failed: ${errorMessage(error)}`);
  process.exit(1);
}

async function collectWorkspacePackageFiles(root) {
  const files = [join(root, "package.json")];
  for (const folder of ["packages", "apps", "services"]) {
    const folderPath = join(root, folder);
    let entries;
    try {
      entries = await readdir(folderPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) files.push(join(folderPath, entry.name, "package.json"));
    }
  }
  return files;
}

function normalizeInput(raw) {
  const release = raw.release ? requireString(raw.release, "release") : undefined;
  const version = raw.version ? requireString(raw.version, "version") : releaseToPackageVersion(release);
  if (!version) throw new Error("Pass --version or a semver-like --release such as v0.10.9-beta.0");
  if (!isSemverLike(version)) throw new Error("version must be semver-like, for example 0.10.9-beta.0");
  if (release) {
    const derived = releaseToPackageVersion(release);
    if (!derived) throw new Error("release must be semver-like, for example v0.10.9-beta.0");
    if (derived !== version) throw new Error(`release ${release} does not match version ${version}`);
  }
  return {
    root: resolve(raw.root ?? "."),
    release,
    version,
    write: raw.write,
    json: raw.json,
  };
}

function parseArgs(argv) {
  const parsed = {
    help: false,
    json: false,
    write: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--write") parsed.write = true;
    else if (arg === "--root") parsed.root = requireNextValue(argv, ++index, arg);
    else if (arg === "--release") parsed.release = requireNextValue(argv, ++index, arg);
    else if (arg === "--version") parsed.version = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop beta version preparation

Usage:
  node scripts/prepare-beta-version.mjs --release v0.10.9-beta.0 [--write]
  node scripts/prepare-beta-version.mjs --version 0.10.9-beta.0 [--write]

Options:
  --release VERSION   Release tag. Leading "v" is removed for package versions.
  --version VERSION   Package version to apply directly.
  --write             Update package.json files. Without this flag, the command is a dry-run.
  --root PATH         Workspace root. Defaults to the current directory.
  --json              Print JSON output.

Run this after real beta evidence is complete and before beta:release:gate --require-version-match.
`);
}

function printReport(report) {
  console.log(`RedeemLoop beta version preparation (${report.mode})`);
  console.log(`Version: ${report.version}`);
  console.log(`Root: ${report.root}`);
  console.log("");
  if (report.changes.length === 0) {
    console.log("All workspace package versions already match.");
  } else {
    for (const change of report.changes) {
      console.log(`- ${change.path}: ${change.from ?? "<missing>"} -> ${change.to}`);
    }
  }
  console.log("");
  console.log(`Summary: ${report.summary.changed} change(s), ${report.summary.unchanged} unchanged`);
  if (report.mode === "dry-run" && report.changes.length > 0) {
    console.log("Re-run with --write to update package.json files.");
  }
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${fieldName} is required`);
  return value.trim();
}

function releaseToPackageVersion(value) {
  if (!value || typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/^v/, "");
  return isSemverLike(normalized) ? normalized : undefined;
}

function isSemverLike(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
