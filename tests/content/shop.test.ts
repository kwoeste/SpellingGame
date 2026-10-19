import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_HEX, SHOP_PRODUCTS } from "@/lib/shop/products";

const root = path.resolve(__dirname, "../..");

function legacyProductIds(): number[] {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  return [...html.matchAll(/^\s*id:\s*(\d+),/gm)].map((m) => Number(m[1]));
}

function mediaOf(product: (typeof SHOP_PRODUCTS)[number]): string[] {
  return [
    ...product.images,
    ...Object.values(product.colorImages ?? {}).flat(),
    ...Object.values(product.sizeImages ?? {}).flat(),
    ...Object.values(product.sizeVideos ?? {}),
    ...(product.video ? [product.video] : []),
  ];
}

describe("public shop parity with the static site", () => {
  it("lists every product from the old index.html", () => {
    expect(SHOP_PRODUCTS.map((p) => p.id).sort((a, b) => a - b)).toEqual(legacyProductIds().sort((a, b) => a - b));
  });

  it("only references media that ships in public/", () => {
    for (const product of SHOP_PRODUCTS) {
      for (const src of mediaOf(product)) {
        expect(src.startsWith("/images/"), `${product.name}: ${src}`).toBe(true);
        expect(existsSync(path.join(root, "public", src)), `${product.name}: ${src}`).toBe(true);
      }
    }
  });

  it("offers a swatch for every color and a choice for every size", () => {
    for (const product of SHOP_PRODUCTS) {
      const colors = [...(product.colors ?? []), ...Object.values(product.colorParts ?? {}).flat()];
      expect(colors.length, product.name).toBeGreaterThan(0);
      for (const c of colors) expect(COLOR_HEX[c], `${product.name}: ${c}`).toBeTruthy();
      for (const size of Object.keys(product.sizeImages ?? {})) expect(product.sizes).toContain(size);
    }
  });

  it("keeps the Web3Forms field names the inbox already expects", () => {
    const client = readFileSync(path.join(root, "components/ShopClient.tsx"), "utf8");
    for (const name of ["access_key", "subject", "from_name", "redirect", "order_details", "order_total", "customer_name", "customer_email", "customer_grade", "special_notes"]) {
      expect(client).toContain(`name="${name}"`);
    }
  });
});
