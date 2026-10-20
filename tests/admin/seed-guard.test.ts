import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("demo seed is preview-only", () => {
  const script = readFileSync(path.join(process.cwd(), "scripts/seed-admin-demo.mjs"), "utf8");

  it("refuses production and requires an explicit allow flag", () => {
    expect(script).toMatch(/DEV \/ PREVIEW ONLY/);
    expect(script).toMatch(/VERCEL_ENV === "production"/);
    expect(script).toMatch(/MAE_ALLOW_DEMO_SEED/);
    expect(script).toMatch(/maewoeste\.com/);
  });

  it("is not imported by admin pages or the live load path", () => {
    const load = readFileSync(path.join(process.cwd(), "lib/admin/load.ts"), "utf8");
    const overview = readFileSync(path.join(process.cwd(), "app/admin/page.tsx"), "utf8");
    expect(load).not.toContain("demo-fixture");
    expect(overview).not.toContain("demo-fixture");
    expect(overview).not.toContain("seed-admin-demo");
  });
});
