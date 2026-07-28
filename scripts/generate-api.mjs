import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "src/api/generated/openapi.ts");
const snapshot = resolve(root, "openapi.snapshot.json");
const snapshotAlt = resolve(root, "src/api/generated/openapi.snapshot.json");
// Только явно заданный URL. Раньше по умолчанию брался localhost:8000, и
// случайно запущенный устаревший dev-сервер молча побеждал свежий снапшот —
// типы генерировались из старой схемы. Снапшот выгружается из кода бэкенда
// (medix-core/scripts/export_openapi.py) и проверяется в CI, поэтому он
// и есть источник истины.
const live = process.env.VITE_OPENAPI_URL ?? null;

// Локальный CLI + spawn без shell. Через `npx` с shell:true аргументы
// склеиваются в строку без кавычек, и путь проекта с пробелами
// ("OneDrive - Engineering College LA") рвётся на первом пробеле — из-за
// этого генерация молча не работала и openapi.ts оставался заглушкой.
const cli = resolve(root, "node_modules/openapi-typescript/bin/cli.js");

mkdirSync(dirname(out), { recursive: true });

function run(source, { quiet = false } = {}) {
  const result = spawnSync(process.execPath, [cli, source, "-o", out], {
    cwd: root,
    stdio: quiet ? "pipe" : "inherit",
  });
  return result.status === 0;
}

if (!existsSync(cli)) {
  console.error(
    "openapi-typescript не найден в node_modules — выполните `npm ci`.",
  );
  process.exit(1);
}

if (live) {
  console.log(`Источник: ${live} (VITE_OPENAPI_URL)`);
  if (!run(live)) process.exit(1);
} else {
  const snap = existsSync(snapshot)
    ? snapshot
    : existsSync(snapshotAlt)
      ? snapshotAlt
      : null;
  if (!snap) {
    console.error(
      "Нет openapi.snapshot.json — скопируйте medix-core/openapi.json " +
        "или укажите VITE_OPENAPI_URL.",
    );
    process.exit(1);
  }
  console.log(`Источник: ${snap}`);
  if (!run(snap)) process.exit(1);
}

console.log(`Wrote ${out}`);
