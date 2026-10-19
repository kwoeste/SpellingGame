"use client";

import { useEffect, useMemo, useState } from "react";
import { COLOR_HEX, DEFAULT_THANK_YOU_URL, SHOP_PRODUCTS, web3formsKey, type ShopProduct } from "@/lib/shop/products";

type CartItem = {
  product: ShopProduct;
  color?: string;
  size?: string;
  partColors?: Record<string, string>;
};

function swatchStyle(color: string, selected: boolean): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: selected ? "3px solid #5a67d8" : "2px solid #e2e8f0",
    background: COLOR_HEX[color] || "#ccc",
    cursor: "pointer",
  };
}

function describe(item: CartItem): string {
  if (item.partColors && Object.keys(item.partColors).length) {
    return `${item.product.name} (${Object.entries(item.partColors)
      .map(([part, c]) => `${part}: ${c}`)
      .join(", ")})`;
  }
  return `${item.product.name}${item.size ? ` - ${item.size}` : ""} (${item.color})`;
}

function selectionComplete(product: ShopProduct, color: string, size: string, partColors: Record<string, string>): boolean {
  if (product.colorParts) return Object.keys(product.colorParts).every((part) => partColors[part]);
  if (!color) return false;
  return !product.sizes || Boolean(size);
}

function addLabel(product: ShopProduct, ready: boolean): string {
  if (ready) return "Add to request";
  if (product.colorParts) return "Select all colors";
  return product.sizes ? "Select size & color" : "Select a color";
}

export function ShopClient({ title = "Pick Your Free Item" }: { title?: string }) {
  const [filter, setFilter] = useState<"all" | "fidget" | "animals" | "toys">("all");
  const [open, setOpen] = useState<ShopProduct | null>(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [partColors, setPartColors] = useState<Record<string, string>>({});
  const [imageIdx, setImageIdx] = useState(0);
  const [cart, setCart] = useState<CartItem | null>(null);
  const [thankYou, setThankYou] = useState(DEFAULT_THANK_YOU_URL);

  useEffect(() => {
    setThankYou(`${window.location.origin}/thank-you`);
  }, []);

  const products = useMemo(() => SHOP_PRODUCTS.filter((p) => filter === "all" || p.category === filter), [filter]);

  const gallery = open
    ? (open.sizeImages && size && open.sizeImages[size]) || (open.colorImages && color && open.colorImages[color]) || open.images
    : [];
  const video = open ? (open.sizeVideos && size && open.sizeVideos[size]) || open.video : undefined;
  const ready = open ? selectionComplete(open, color, size, partColors) : false;

  function openProduct(product: ShopProduct) {
    setOpen(product);
    setColor("");
    setSize("");
    setPartColors({});
    setImageIdx(0);
  }

  function addCurrent() {
    if (!open || !ready) return;
    if (cart) {
      alert("Only 1 item per person so everyone gets a chance! Remove your current item to pick a different one.");
      return;
    }
    setCart({ product: open, color, size, partColors: open.colorParts ? partColors : undefined });
    setOpen(null);
    document.getElementById("order-section")?.scrollIntoView({ behavior: "smooth" });
  }

  const details = cart ? describe(cart) : "";

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
          <button key={key} className={`btn ${filter === key ? "" : "secondary"}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {key}
          </button>
        ))}
      </div>
      <div className="grid cols-2">
        {products.map((product) => (
          <button key={product.id} className="card" onClick={() => openProduct(product)} style={{ textAlign: "left", cursor: "pointer" }}>
            <img src={product.images[0]} alt={product.name} loading="lazy" style={{ width: "100%", height: 180, objectFit: "contain" }} />
            <h3>{product.name}</h3>
            <div className="chip">FREE</div>
          </button>
        ))}
      </div>

      {open ? (
        <div className="card" style={{ marginTop: 20 }} role="dialog" aria-label={open.name}>
          <h3>{open.name}</h3>
          <img
            src={gallery[Math.min(imageIdx, gallery.length - 1)]}
            alt={`${open.name} photo ${imageIdx + 1}`}
            style={{ width: "100%", maxHeight: 360, objectFit: "contain" }}
          />
          {gallery.length > 1 ? (
            <div className="chips" style={{ justifyContent: "center" }}>
              {gallery.map((src, idx) => (
                <button
                  key={src}
                  className={`option ${idx === imageIdx ? "selected" : ""}`}
                  aria-label={`Photo ${idx + 1}`}
                  aria-pressed={idx === imageIdx}
                  onClick={() => setImageIdx(idx)}
                  style={{ padding: 2 }}
                >
                  <img src={src} alt="" style={{ width: 48, height: 48, objectFit: "cover" }} />
                </button>
              ))}
            </div>
          ) : null}
          {video ? <video key={video} src={video} controls muted playsInline style={{ width: "100%", marginTop: 8 }} /> : null}
          <p>{open.description}</p>
          {open.colorParts ? (
            Object.entries(open.colorParts).map(([part, colors]) => (
              <div key={part}>
                <p>
                  {part}: {partColors[part] ?? "choose"}
                </p>
                <div className="chips" role="group" aria-label={`${part} color`}>
                  {colors.map((c) => (
                    <button
                      key={c}
                      title={c}
                      aria-label={c}
                      aria-pressed={partColors[part] === c}
                      onClick={() => setPartColors((prev) => ({ ...prev, [part]: c }))}
                      style={swatchStyle(c, partColors[part] === c)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <>
              <p>Color: {color || "choose"}</p>
              <div className="chips" role="group" aria-label="Color">
                {(open.colors ?? []).map((c) => (
                  <button
                    key={c}
                    title={c}
                    aria-label={c}
                    aria-pressed={color === c}
                    onClick={() => {
                      setColor(c);
                      setImageIdx(0);
                    }}
                    style={swatchStyle(c, color === c)}
                  />
                ))}
              </div>
            </>
          )}
          {open.sizes ? (
            <div className="chips" style={{ marginTop: 8 }} role="group" aria-label="Size">
              {open.sizes.map((s) => (
                <button
                  key={s}
                  className={`option ${size === s ? "selected" : ""}`}
                  aria-pressed={size === s}
                  onClick={() => {
                    setSize(s);
                    setImageIdx(0);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={addCurrent} disabled={!ready}>
              {addLabel(open, ready)}
            </button>
            <button className="btn secondary" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 28 }} id="order-section">
        <h2>Request Your Item</h2>
        <p>Fill out your info and I&apos;ll get started on your free print!</p>
        <h3>Your Item (1 per person)</h3>
        {cart ? (
          <p>
            {details} · <strong>FREE</strong>{" "}
            <button className="btn secondary" onClick={() => setCart(null)} aria-label={`Remove ${cart.product.name}`}>
              Remove
            </button>
          </p>
        ) : (
          <p>No items yet. Add one above!</p>
        )}
        <form action="https://api.web3forms.com/submit" method="POST">
          <input type="hidden" name="access_key" value={web3formsKey()} />
          <input type="hidden" name="subject" value="🎉 New Request from MW Design!" />
          <input type="hidden" name="from_name" value="MW Design" />
          <input type="hidden" name="redirect" value={thankYou} />
          <input type="hidden" name="order_details" value={details} />
          <input type="hidden" name="order_total" value="FREE" />
          <p>
            <label>
              Your Name *
              <input name="customer_name" required placeholder="Enter your name" style={{ width: "100%", padding: 10 }} />
            </label>
          </p>
          <p>
            <label>
              Your Email (or Parent&apos;s Email) *
              <input name="customer_email" type="email" required placeholder="Enter your email" style={{ width: "100%", padding: 10 }} />
            </label>
          </p>
          <p>
            <label>
              Your Grade/Class
              <input name="customer_grade" placeholder="e.g., 3rd Grade - Mrs. Smith" style={{ width: "100%", padding: 10 }} />
            </label>
          </p>
          <p>
            <label>
              Special Notes or Requests
              <textarea name="special_notes" rows={3} placeholder="Any special requests?" style={{ width: "100%", padding: 10 }} />
            </label>
          </p>
          <button className="btn" type="submit" disabled={!cart}>
            Send Request
          </button>
        </form>
        <div style={{ marginTop: 16 }}>
          <h4>💜 Want to Support Mae&apos;s Printing?</h4>
          <p>Everything is free, but donations help buy more filament to keep making cool stuff!</p>
          <a className="btn secondary" href="https://www.paypal.com/ncp/payment/XE7MERSN6SRX8" target="_blank" rel="noreferrer">
            Donate with PayPal
          </a>
        </div>
      </div>
    </div>
  );
}
