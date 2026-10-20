import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Ad blockers (Brave Shields, uBlock, AdBlock with EasyList) hide elements whose classes look like
// ads, e.g. `##.ad-wrap`, `##.ad-card`. The admin dashboard once used an `ad-` prefix and Brave
// blanked every admin page. Keep ad-like class names out of the app.
const AD_LIKE = /(?:className=["'`{][^"'`}]*|^\s*\.|[\s"'`])(ad|ads|advert|banner-ad|sponsor)[-_][a-z]/m;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(p);
    return /\.(tsx|css)$/.test(e.name) ? [p] : [];
  });
}

describe("ad-blocker safe class names", () => {
  it("has no ad-like class prefixes in app/ or components/", () => {
    const offenders: string[] = [];
    for (const file of [...walk(path.join(process.cwd(), "app")), ...walk(path.join(process.cwd(), "components"))]) {
      const src = readFileSync(file, "utf8");
      const m = src.match(AD_LIKE);
      if (m) offenders.push(`${path.relative(process.cwd(), file)}: ${m[0].trim()}`);
    }
    expect(offenders).toEqual([]);
  });
});
