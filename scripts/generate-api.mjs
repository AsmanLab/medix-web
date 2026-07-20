import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "src/api/generated/openapi.ts");
const snapshot = resolve(root, "openapi.snapshot.json");
const snapshotAlt = resolve(root, "src/api/generated/openapi.snapshot.json");
const live =
  process.env.VITE_OPENAPI_URL ?? "http://localhost:8000/openapi.json";

mkdirSync(dirname(out), { recursive: true });

function run(source) {
  const result = spawnSync(
    "npx",
    ["openapi-typescript", source, "-o", out],
    { cwd: root, stdio: "inherit", shell: true },
  );
  return result.status === 0;
}

if (!run(live)) {
  console.warn(`Live OpenAPI failed (${live}); trying snapshot…`);
  const snap = existsSync(snapshot)
    ? snapshot
    : existsSync(snapshotAlt)
      ? snapshotAlt
      : null;
  if (!snap) {
    console.error(
      "No openapi.snapshot.json — keep the stub in openapi.ts or add a snapshot.",
    );
    process.exit(1);
  }
  if (!run(snap)) process.exit(1);
}


console.log(`Wrote ${out}`);
