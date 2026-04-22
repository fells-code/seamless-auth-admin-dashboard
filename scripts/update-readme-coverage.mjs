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
const coverageBadgePattern =
  /\[!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-[^)]+\)\]\(#testing\)/;

let updated = readme;

if (coverageBadgePattern.test(readme)) {
  updated = readme.replace(coverageBadgePattern, nextBadge);
} else {
  const lines = readme.split("\n");

  if (lines.length > 0 && lines[0].startsWith("[![Publish Docker Image]")) {
    lines.splice(1, 0, nextBadge);
    updated = lines.join("\n");
  } else {
    updated = `${nextBadge}\n\n${readme}`;
  }
}

writeFileSync(readmePath, updated);
