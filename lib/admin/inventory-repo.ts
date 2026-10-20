import { neon } from "@neondatabase/serverless";
import type {
  FilamentSpool,
  StoreItem,
  InventoryAdjustment,
  FilamentInput,
  StoreItemInput,
  AdjustmentInput,
} from "@/lib/admin/inventory";

function connectionString(): string {
  const url = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

export async function listFilamentSpools(): Promise<FilamentSpool[]> {
  const sql = neon(connectionString());
  const rows = await sql`
    SELECT * FROM admin_api.filament_inventory
    ORDER BY color, material
  `;
  return rows.map((row) => ({
    id: row.id as string,
    color: row.color as string,
    material: row.material as string,
    brand: row.brand as string,
    gramsTotal: row.grams_total as number,
    gramsUsed: row.grams_used as number,
    gramsLeft: row.grams_left as number,
    lowStockThreshold: row.low_stock_threshold as number,
    lowStock: row.low_stock as boolean,
    notes: row.notes as string | null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }));
}

export async function listStoreItems(): Promise<StoreItem[]> {
  const sql = neon(connectionString());
  const rows = await sql`
    SELECT * FROM admin_api.store_inventory
    ORDER BY name
  `;
  return rows.map((row) => ({
    id: row.id as string,
    productId: row.product_id as number,
    name: row.name as string,
    variantDesc: row.variant_desc as string | null,
    stockCount: row.stock_count as number,
    reorderThreshold: row.reorder_threshold as number,
    lowStock: row.low_stock as boolean,
    notes: row.notes as string | null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }));
}

export async function listAdjustments(limit = 50): Promise<InventoryAdjustment[]> {
  const sql = neon(connectionString());
  const rows = await sql`
    SELECT * FROM admin_api.inventory_log
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    id: row.id as string,
    targetType: row.target_type as "filament" | "store_item",
    targetId: row.target_id as string,
    adjustmentType: row.adjustment_type as InventoryAdjustment["adjustmentType"],
    quantity: row.quantity as number,
    reason: row.reason as string | null,
    adjustedBy: row.adjusted_by as string,
    createdAt: new Date(row.created_at as string).getTime(),
  }));
}

export async function createFilamentSpool(input: FilamentInput): Promise<FilamentSpool> {
  const sql = neon(connectionString());
  const [row] = await sql`
    INSERT INTO engine.filament_spool (color, material, brand, grams_total, low_stock_threshold, notes)
    VALUES (${input.color}, ${input.material}, ${input.brand}, ${input.gramsTotal}, ${input.lowStockThreshold}, ${input.notes ?? null})
    RETURNING *
  `;
  return {
    id: row.id as string,
    color: row.color as string,
    material: row.material as string,
    brand: row.brand as string,
    gramsTotal: row.grams_total as number,
    gramsUsed: row.grams_used as number,
    gramsLeft: (row.grams_total as number) - (row.grams_used as number),
    lowStockThreshold: row.low_stock_threshold as number,
    lowStock: (row.grams_total as number) - (row.grams_used as number) < (row.low_stock_threshold as number),
    notes: row.notes as string | null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

export async function updateFilamentSpool(id: string, input: Partial<FilamentInput>): Promise<FilamentSpool | null> {
  const sql = neon(connectionString());
  const [row] = await sql`
    UPDATE engine.filament_spool
    SET
      color = COALESCE(${input.color ?? null}, color),
      material = COALESCE(${input.material ?? null}, material),
      brand = COALESCE(${input.brand ?? null}, brand),
      grams_total = COALESCE(${input.gramsTotal ?? null}, grams_total),
      low_stock_threshold = COALESCE(${input.lowStockThreshold ?? null}, low_stock_threshold),
      notes = COALESCE(${input.notes ?? null}, notes),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!row) return null;
  return {
    id: row.id as string,
    color: row.color as string,
    material: row.material as string,
    brand: row.brand as string,
    gramsTotal: row.grams_total as number,
    gramsUsed: row.grams_used as number,
    gramsLeft: (row.grams_total as number) - (row.grams_used as number),
    lowStockThreshold: row.low_stock_threshold as number,
    lowStock: (row.grams_total as number) - (row.grams_used as number) < (row.low_stock_threshold as number),
    notes: row.notes as string | null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

export async function createStoreItem(input: StoreItemInput): Promise<StoreItem> {
  const sql = neon(connectionString());
  const [row] = await sql`
    INSERT INTO engine.store_item (product_id, name, variant_desc, stock_count, reorder_threshold, notes)
    VALUES (${input.productId}, ${input.name}, ${input.variantDesc ?? null}, ${input.stockCount}, ${input.reorderThreshold}, ${input.notes ?? null})
    RETURNING *
  `;
  return {
    id: row.id as string,
    productId: row.product_id as number,
    name: row.name as string,
    variantDesc: row.variant_desc as string | null,
    stockCount: row.stock_count as number,
    reorderThreshold: row.reorder_threshold as number,
    lowStock: (row.stock_count as number) <= (row.reorder_threshold as number),
    notes: row.notes as string | null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

export async function updateStoreItem(id: string, input: Partial<StoreItemInput>): Promise<StoreItem | null> {
  const sql = neon(connectionString());
  const [row] = await sql`
    UPDATE engine.store_item
    SET
      product_id = COALESCE(${input.productId ?? null}, product_id),
      name = COALESCE(${input.name ?? null}, name),
      variant_desc = COALESCE(${input.variantDesc ?? null}, variant_desc),
      stock_count = COALESCE(${input.stockCount ?? null}, stock_count),
      reorder_threshold = COALESCE(${input.reorderThreshold ?? null}, reorder_threshold),
      notes = COALESCE(${input.notes ?? null}, notes),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!row) return null;
  return {
    id: row.id as string,
    productId: row.product_id as number,
    name: row.name as string,
    variantDesc: row.variant_desc as string | null,
    stockCount: row.stock_count as number,
    reorderThreshold: row.reorder_threshold as number,
    lowStock: (row.stock_count as number) <= (row.reorder_threshold as number),
    notes: row.notes as string | null,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

export async function adjustInventory(input: AdjustmentInput, adjustedBy: string): Promise<InventoryAdjustment> {
  const sql = neon(connectionString());

  if (input.targetType === "filament") {
    const delta = input.adjustmentType === "use" || input.adjustmentType === "waste" ? input.quantity : -input.quantity;
    await sql`
      UPDATE engine.filament_spool
      SET grams_used = grams_used + ${delta}, updated_at = now()
      WHERE id = ${input.targetId}
    `;
  } else {
    const delta = input.adjustmentType === "use" || input.adjustmentType === "waste" ? -input.quantity : input.quantity;
    await sql`
      UPDATE engine.store_item
      SET stock_count = stock_count + ${delta}, updated_at = now()
      WHERE id = ${input.targetId}
    `;
  }

  const [row] = await sql`
    INSERT INTO engine.inventory_adjustment (target_type, target_id, adjustment_type, quantity, reason, adjusted_by)
    VALUES (${input.targetType}, ${input.targetId}, ${input.adjustmentType}, ${input.quantity}, ${input.reason ?? null}, ${adjustedBy})
    RETURNING *
  `;

  return {
    id: row.id as string,
    targetType: row.target_type as "filament" | "store_item",
    targetId: row.target_id as string,
    adjustmentType: row.adjustment_type as InventoryAdjustment["adjustmentType"],
    quantity: row.quantity as number,
    reason: row.reason as string | null,
    adjustedBy: row.adjusted_by as string,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}
