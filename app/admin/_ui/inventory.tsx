"use client";

import { useState, useCallback } from "react";
import type { FilamentSpool, StoreItem, InventoryAdjustment } from "@/lib/admin/inventory";

type Props = {
  filamentSpools: FilamentSpool[];
  storeItems: StoreItem[];
  adjustments: InventoryAdjustment[];
  shopProducts: Array<{ id: number; name: string }>;
  filamentColors: string[];
};

type Tab = "filament" | "store" | "log";

export function InventoryPanel({
  filamentSpools: initialFilament,
  storeItems: initialStore,
  adjustments: initialLog,
  shopProducts,
  filamentColors,
}: Props) {
  const [tab, setTab] = useState<Tab>("filament");
  const [filamentSpools, setFilamentSpools] = useState(initialFilament);
  const [storeItems, setStoreItems] = useState(initialStore);
  const [adjustments, setAdjustments] = useState(initialLog);

  const refreshAll = useCallback(async () => {
    const res = await fetch("/api/admin/inventory");
    if (res.ok) {
      const data = await res.json();
      setFilamentSpools(data.filamentSpools);
      setStoreItems(data.storeItems);
      setAdjustments(data.adjustments);
    }
  }, []);

  return (
    <div className="ad-wrap">
      <p className="ad-kicker">Parent dashboard · admin only</p>
      <h1>Inventory</h1>
      <p className="ad-lead">
        Track filament spools and shop item stock. Adjust quantities as items are used or restocked.
      </p>

      <div className="ad-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "filament"}
          onClick={() => setTab("filament")}
          className={tab === "filament" ? "active" : ""}
        >
          🎨 Filament Spools {filamentSpools.length > 0 && `(${filamentSpools.length})`}
        </button>
        <button
          role="tab"
          aria-selected={tab === "store"}
          onClick={() => setTab("store")}
          className={tab === "store" ? "active" : ""}
        >
          📦 Store Items {storeItems.length > 0 && `(${storeItems.length})`}
        </button>
        <button
          role="tab"
          aria-selected={tab === "log"}
          onClick={() => setTab("log")}
          className={tab === "log" ? "active" : ""}
        >
          📋 Activity Log
        </button>
      </div>

      {tab === "filament" && (
        <FilamentTab
          spools={filamentSpools}
          colors={filamentColors}
          onUpdate={refreshAll}
        />
      )}
      {tab === "store" && (
        <StoreItemTab
          items={storeItems}
          products={shopProducts}
          onUpdate={refreshAll}
        />
      )}
      {tab === "log" && <AdjustmentLog adjustments={adjustments} />}
    </div>
  );
}

function FilamentTab({
  spools,
  colors,
  onUpdate,
}: {
  spools: FilamentSpool[];
  colors: string[];
  onUpdate: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_filament",
        color: data.get("color"),
        material: data.get("material") || "PLA",
        brand: data.get("brand") || "Bambu",
        gramsTotal: Number(data.get("gramsTotal")) || 1000,
        lowStockThreshold: Number(data.get("lowStockThreshold")) || 100,
        notes: data.get("notes") || undefined,
      }),
    });
    setShowForm(false);
    setLoading(false);
    form.reset();
    await onUpdate();
  };

  const handleAdjust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        targetType: "filament",
        targetId: adjustTarget,
        adjustmentType: data.get("adjustmentType"),
        quantity: Number(data.get("quantity")),
        reason: data.get("reason") || undefined,
      }),
    });
    setAdjustTarget(null);
    setLoading(false);
    form.reset();
    await onUpdate();
  };

  const lowStockSpools = spools.filter((s) => s.lowStock);

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <h2>Filament Spools</h2>
        <button onClick={() => setShowForm(true)} className="ad-btn" disabled={showForm}>
          + Add Spool
        </button>
      </div>

      {lowStockSpools.length > 0 && (
        <div className="ad-alert-banner">
          ⚠️ {lowStockSpools.length} spool{lowStockSpools.length !== 1 ? "s" : ""} low on filament
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="ad-form">
          <div className="ad-form-row">
            <label>
              Color
              <select name="color" required>
                <option value="">Select color...</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Material
              <input name="material" defaultValue="PLA" />
            </label>
            <label>
              Brand
              <input name="brand" defaultValue="Bambu" />
            </label>
          </div>
          <div className="ad-form-row">
            <label>
              Total grams
              <input name="gramsTotal" type="number" defaultValue={1000} />
            </label>
            <label>
              Low stock threshold
              <input name="lowStockThreshold" type="number" defaultValue={100} />
            </label>
            <label>
              Notes
              <input name="notes" placeholder="Optional notes" />
            </label>
          </div>
          <div className="ad-form-actions">
            <button type="submit" className="ad-btn primary" disabled={loading}>
              {loading ? "Saving..." : "Create Spool"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="ad-btn">
              Cancel
            </button>
          </div>
        </form>
      )}

      {adjustTarget && (
        <form onSubmit={handleAdjust} className="ad-form">
          <h3>Adjust: {spools.find((s) => s.id === adjustTarget)?.color}</h3>
          <div className="ad-form-row">
            <label>
              Type
              <select name="adjustmentType" required>
                <option value="use">Use (deduct grams)</option>
                <option value="restock">Restock (add grams)</option>
                <option value="waste">Waste (deduct grams)</option>
                <option value="correction">Correction (set delta)</option>
              </select>
            </label>
            <label>
              Grams
              <input name="quantity" type="number" min={1} required />
            </label>
            <label>
              Reason
              <input name="reason" placeholder="Optional reason" />
            </label>
          </div>
          <div className="ad-form-actions">
            <button type="submit" className="ad-btn primary" disabled={loading}>
              {loading ? "Saving..." : "Record Adjustment"}
            </button>
            <button type="button" onClick={() => setAdjustTarget(null)} className="ad-btn">
              Cancel
            </button>
          </div>
        </form>
      )}

      {spools.length === 0 ? (
        <div className="ad-empty-state">
          <span className="ad-empty-icon">🎨</span>
          <p className="ad-empty-title">No filament spools yet</p>
          <p className="ad-empty-hint">Add your first spool to start tracking filament usage and get low-stock alerts.</p>
        </div>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Material</th>
              <th>Brand</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {spools.map((spool) => (
              <tr key={spool.id} className={spool.lowStock ? "low-stock" : ""}>
                <td>{spool.color}</td>
                <td>{spool.material}</td>
                <td>{spool.brand}</td>
                <td>
                  {spool.gramsLeft}g / {spool.gramsTotal}g
                </td>
                <td>{spool.lowStock ? <span className="ad-tag warning">Low Stock</span> : <span className="ad-tag ok">OK</span>}</td>
                <td>
                  <button
                    onClick={() => setAdjustTarget(spool.id)}
                    className="ad-btn small"
                    disabled={adjustTarget !== null}
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StoreItemTab({
  items,
  products,
  onUpdate,
}: {
  items: StoreItem[];
  products: Array<{ id: number; name: string }>;
  onUpdate: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_store_item",
        productId: Number(data.get("productId")),
        name: data.get("name"),
        variantDesc: data.get("variantDesc") || undefined,
        stockCount: Number(data.get("stockCount")) || 0,
        reorderThreshold: Number(data.get("reorderThreshold")) || 2,
        notes: data.get("notes") || undefined,
      }),
    });
    setShowForm(false);
    setLoading(false);
    form.reset();
    await onUpdate();
  };

  const handleAdjust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        targetType: "store_item",
        targetId: adjustTarget,
        adjustmentType: data.get("adjustmentType"),
        quantity: Number(data.get("quantity")),
        reason: data.get("reason") || undefined,
      }),
    });
    setAdjustTarget(null);
    setLoading(false);
    form.reset();
    await onUpdate();
  };

  const lowStockItems = items.filter((i) => i.lowStock);

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <h2>Store Items</h2>
        <button onClick={() => setShowForm(true)} className="ad-btn" disabled={showForm}>
          + Add Item
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="ad-alert-banner">
          ⚠️ {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} low on stock
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="ad-form">
          <div className="ad-form-row">
            <label>
              Product
              <select name="productId" required>
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Display Name
              <input name="name" required placeholder="e.g. Gary the Snake - Blue" />
            </label>
            <label>
              Variant
              <input name="variantDesc" placeholder="e.g. Blue body, white eyes" />
            </label>
          </div>
          <div className="ad-form-row">
            <label>
              Stock Count
              <input name="stockCount" type="number" defaultValue={0} min={0} />
            </label>
            <label>
              Reorder Threshold
              <input name="reorderThreshold" type="number" defaultValue={2} min={0} />
            </label>
            <label>
              Notes
              <input name="notes" placeholder="Optional notes" />
            </label>
          </div>
          <div className="ad-form-actions">
            <button type="submit" className="ad-btn primary" disabled={loading}>
              {loading ? "Saving..." : "Create Item"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="ad-btn">
              Cancel
            </button>
          </div>
        </form>
      )}

      {adjustTarget && (
        <form onSubmit={handleAdjust} className="ad-form">
          <h3>Adjust: {items.find((i) => i.id === adjustTarget)?.name}</h3>
          <div className="ad-form-row">
            <label>
              Type
              <select name="adjustmentType" required>
                <option value="use">Sold/Used (deduct)</option>
                <option value="restock">Restock (add)</option>
                <option value="add">Add new stock</option>
                <option value="waste">Damaged/Waste (deduct)</option>
                <option value="correction">Correction</option>
              </select>
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" min={1} required />
            </label>
            <label>
              Reason
              <input name="reason" placeholder="Optional reason" />
            </label>
          </div>
          <div className="ad-form-actions">
            <button type="submit" className="ad-btn primary" disabled={loading}>
              {loading ? "Saving..." : "Record Adjustment"}
            </button>
            <button type="button" onClick={() => setAdjustTarget(null)} className="ad-btn">
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="ad-empty-state">
          <span className="ad-empty-icon">📦</span>
          <p className="ad-empty-title">No store items yet</p>
          <p className="ad-empty-hint">Add your first item to track inventory for your shop products.</p>
        </div>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Variant</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.lowStock ? "low-stock" : ""}>
                <td>{item.name}</td>
                <td>{item.variantDesc || "—"}</td>
                <td>{item.stockCount}</td>
                <td>
                  {item.lowStock ? <span className="ad-tag warning">Low Stock</span> : <span className="ad-tag ok">OK</span>}
                </td>
                <td>
                  <button
                    onClick={() => setAdjustTarget(item.id)}
                    className="ad-btn small"
                    disabled={adjustTarget !== null}
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AdjustmentLog({ adjustments }: { adjustments: InventoryAdjustment[] }) {
  return (
    <div className="ad-card">
      <h2>Recent Adjustments</h2>
      {adjustments.length === 0 ? (
        <div className="ad-empty-state">
          <span className="ad-empty-icon">📋</span>
          <p className="ad-empty-title">No activity yet</p>
          <p className="ad-empty-hint">Adjustments will appear here when you use, restock, or correct inventory.</p>
        </div>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Action</th>
              <th>Qty</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((adj) => (
              <tr key={adj.id}>
                <td>{new Date(adj.createdAt).toLocaleString()}</td>
                <td>{adj.targetType === "filament" ? "Filament" : "Store Item"}</td>
                <td>{adj.adjustmentType}</td>
                <td>{adj.quantity}</td>
                <td>{adj.reason || "—"}</td>
                <td>{adj.adjustedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
