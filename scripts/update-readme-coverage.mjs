import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const coverageSummaryPath = resolve(root, "coverage/coverage-summary.json");
const readmePath = resolve(root, "README.md");

const coverageSummary = JSON.parse(readFileSync(coverageSummaryPath, "utf8"));
const readme = readFileSync(readmePath, "utf8");
const linePct = coverageSummary.total.lines.pct;
const coverageValue = `${linePct.toFixed(1)}%`;

function getBadgeColor(coverage) {
  if (coverage >= 90) return "brightgreen";
  if (coverage >= 80) return "green";
  if (coverage >= 70) return "yellow";
  if (coverage >= 60) return "orange";

  return "red";
}

const color = getBadgeColor(linePct);
const nextBadge = `[![Coverage](https://img.shields.io/badge/coverage-${encodeURIComponent(
  coverageValue,
)}-${color})](#testing)`;

const updated = readme.replace(
  /\[!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-[^)]+\)\]\(#testing\)/,
  nextBadge,
);

if (updated === readme) {
  throw new Error("Coverage badge not found in README.md");
}

writeFileSync(readmePath, updated);
