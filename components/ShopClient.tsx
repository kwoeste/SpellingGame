"use client";

import { useMemo, useState } from "react";
import { COLOR_HEX, SHOP_PRODUCTS, thankYouUrl, web3formsKey, type ShopProduct } from "@/lib/shop/products";

type CartItem = {
  product: ShopProduct;
  color?: string;
  size?: string;
  partColors?: Record<string, string>;
};

export function ShopClient({ title = "Pick Your Free Item" }: { title?: string }) {
  const [filter, setFilter] = useState<"all" | "fidget" | "animals" | "toys">("all");
  const [open, setOpen] = useState<ShopProduct | null>(null);
  const [color, setColor] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [partColors, setPartColors] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartItem | null>(null);
  const products = useMemo(
    () => SHOP_PRODUCTS.filter((p) => filter === "all" || p.category === filter),
    [filter],
  );

  function addCurrent() {
    if (!open) return;
    if (cart) {
      alert("Only 1 item per person so everyone gets a chance!");
      return;
    }
    setCart({ product: open, color, size, partColors });
    setOpen(null);
  }

  const details = cart
    ? cart.partColors && Object.keys(cart.partColors).length
      ? `${cart.product.name} (${Object.entries(cart.partColors)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")})`
      : `${cart.product.name}${cart.size ? ` - ${cart.size}` : ""} (${cart.color})`
    : "";

  return (
    <div className="wrap">
      <div className="card" style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <video autoPlay loop muted playsInline style={{ width: 220, borderRadius: 12 }} preload="none">
          <source src="/images/grok-video-6eab7771-10cf-466c-959d-4cc642a092bf.mp4" type="video/mp4" />
        </video>
        <div>
          <h2>Welcome!</h2>
          <p>Hi, I&apos;m Mae! Everything here is <strong>free</strong> — pick a color and send a request.</p>
          <p>One item per person so everyone gets a chance.</p>
          <div className="chips">
            <span className="chip">100% Free</span>
            <span className="chip">1 Item Per Person</span>
            <a className="chip" href="https://www.paypal.com/ncp/payment/XE7MERSN6SRX8" target="_blank" rel="noreferrer">
              Donate
            </a>
          </div>
        </div>
      </div>

      <h2 style={{ textAlign: "center" }}>{title}</h2>
      <div className="chips" style={{ justifyContent: "center", marginBottom: 16 }}>
        {(["all", "fidget", "animals", "toys"] as const).map((key) => (
          <button key={key} className="btn secondary" onClick={() => setFilter(key)}>
            {key}
          </button>
        ))}
      </div>
      <div className="grid cols-2">
        {products.map((product) => (
          <button
            key={product.id}
            className="card"
            onClick={() => {
              setOpen(product);
              setColor("");
              setSize("");
              setPartColors({});
            }}
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: 180, objectFit: "contain" }} />
            <h3>{product.name}</h3>
            <div className="chip">FREE</div>
          </button>
        ))}
      </div>

      {open ? (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>{open.name}</h3>
          <p>{open.description}</p>
          {open.colorParts
            ? Object.entries(open.colorParts).map(([part, colors]) => (
                <div key={part}>
                  <p>{part}</p>
                  <div className="chips">
                    {colors.map((c) => (
                      <button
                        key={c}
                        title={c}
                        onClick={() => setPartColors((prev) => ({ ...prev, [part]: c }))}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: partColors[part] === c ? "3px solid #5a67d8" : "2px solid #e2e8f0",
                          background: COLOR_HEX[c] || "#ccc",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            : (
              <div className="chips">
                {(open.colors ?? []).map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: color === c ? "3px solid #5a67d8" : "2px solid #e2e8f0",
                      background: COLOR_HEX[c] || "#ccc",
                    }}
                  />
                ))}
              </div>
            )}
          {open.sizes ? (
            <div className="chips" style={{ marginTop: 8 }}>
              {open.sizes.map((s) => (
                <button key={s} className={`option ${size === s ? "selected" : ""}`} onClick={() => setSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={addCurrent}>
              Add to request
            </button>
            <button className="btn secondary" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 28 }} id="order-section">
        <h2>Request Your Item</h2>
        <p>{cart ? details : "No items yet. Add one above!"}</p>
        <form action="https://api.web3forms.com/submit" method="POST">
          <input type="hidden" name="access_key" value={web3formsKey()} />
          <input type="hidden" name="subject" value="New Request from MW Design!" />
          <input type="hidden" name="from_name" value="MW Design" />
          <input type="hidden" name="redirect" value={thankYouUrl()} />
          <input type="hidden" name="order_details" value={details} />
          <input type="hidden" name="order_total" value="FREE" />
          <p>
            <label>
              Your Name *
              <input name="customer_name" required style={{ width: "100%", padding: 10 }} />
            </label>
          </p>
          <p>
            <label>
              Email *
              <input name="customer_email" type="email" required style={{ width: "100%", padding: 10 }} />
            </label>
          </p>
          <p>
            <label>
              Notes
              <textarea name="special_notes" rows={3} style={{ width: "100%", padding: 10 }} />
            </label>
          </p>
          <button className="btn" type="submit" disabled={!cart}>
            Send Request
          </button>
        </form>
      </div>
    </div>
  );
}
