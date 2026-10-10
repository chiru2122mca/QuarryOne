// Reuse accepted browser suites with updated accessible add labels; keep earlier QA snapshots intact.
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
for (const [file, previous, destination] of [
  [
    "verify-production.cjs",
    "verification/v032",
    "verification/stage2/production",
  ],
  [
    "verify-inventory.cjs",
    "verification/v033",
    "verification/stage2/inventory",
  ],
  [
    "verify-home-polish.cjs",
    "verification/dashboard-corrections",
    "verification/stage2/home",
  ],
]) {
  const source = fs
    .readFileSync(`scripts/${file}`, "utf8")
    .replaceAll(previous, destination)
    .replaceAll(
      'name: "+", exact: true',
      'name: "Add Production", exact: true',
    );
  const result = spawnSync(process.execPath, ["-e", source], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
