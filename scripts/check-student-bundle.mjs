import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const forbidden = ["p_mastery", "frustration", "strategy_label", "/api/admin"];
const roots = ["app/study", "app/games", "app/spelling-game", "app/number-match", "components", "public/js"];
const hits = [];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js)$/.test(entry.name)) {
      const text = readFileSync(full, "utf8");
      for (const needle of forbidden) {
        if (text.includes(needle)) hits.push(`${full}: ${needle}`);
      }
    }
  }
}

for (const root of roots) walk(root);
if (hits.length) {
  console.error("Student bundle leaked admin symbols:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("Student bundle check passed.");
