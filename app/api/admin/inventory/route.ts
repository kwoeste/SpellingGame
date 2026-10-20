import { z } from "zod";
import { adminRead, adminWrite } from "@/lib/auth/admin-api";
import {
  listFilamentSpools,
  listStoreItems,
  listAdjustments,
  createFilamentSpool,
  createStoreItem,
  updateFilamentSpool,
  updateStoreItem,
  adjustInventory,
} from "@/lib/admin/inventory-repo";

const ActionBody = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_filament"),
    color: z.string().min(1).max(100),
    material: z.string().max(50).default("PLA"),
    brand: z.string().max(100).default("Bambu"),
    gramsTotal: z.number().int().min(1).max(10000).default(1000),
    lowStockThreshold: z.number().int().min(0).max(5000).default(100),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("update_filament"),
    id: z.string().uuid(),
    color: z.string().min(1).max(100).optional(),
    material: z.string().max(50).optional(),
    brand: z.string().max(100).optional(),
    gramsTotal: z.number().int().min(1).max(10000).optional(),
    lowStockThreshold: z.number().int().min(0).max(5000).optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("create_store_item"),
    productId: z.number().int().min(1),
    name: z.string().min(1).max(200),
    variantDesc: z.string().max(200).optional(),
    stockCount: z.number().int().min(0).default(0),
    reorderThreshold: z.number().int().min(0).default(2),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("update_store_item"),
    id: z.string().uuid(),
    productId: z.number().int().min(1).optional(),
    name: z.string().min(1).max(200).optional(),
    variantDesc: z.string().max(200).optional(),
    stockCount: z.number().int().min(0).optional(),
    reorderThreshold: z.number().int().min(0).optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("adjust"),
    targetType: z.enum(["filament", "store_item"]),
    targetId: z.string().uuid(),
    adjustmentType: z.enum(["add", "use", "restock", "correction", "waste"]),
    quantity: z.number().int().min(1),
    reason: z.string().max(500).optional(),
  }),
]);

export async function GET(req: Request) {
  return adminRead(req, async () => {
    const [filamentSpools, storeItems, adjustments] = await Promise.all([
      listFilamentSpools(),
      listStoreItems(),
      listAdjustments(50),
    ]);
    return { filamentSpools, storeItems, adjustments };
  });
}

export async function POST(req: Request) {
  return adminWrite(req, async (actor) => {
    const parsed = ActionBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return { status: 400, body: { error: "invalid_request", details: parsed.error.issues } };
    }
    const body = parsed.data;

    switch (body.action) {
      case "create_filament": {
        const spool = await createFilamentSpool({
          color: body.color,
          material: body.material,
          brand: body.brand,
          gramsTotal: body.gramsTotal,
          lowStockThreshold: body.lowStockThreshold,
          notes: body.notes,
        });
        return { body: { spool } };
      }

      case "update_filament": {
        const spool = await updateFilamentSpool(body.id, {
          color: body.color,
          material: body.material,
          brand: body.brand,
          gramsTotal: body.gramsTotal,
          lowStockThreshold: body.lowStockThreshold,
          notes: body.notes,
        });
        if (!spool) return { status: 404, body: { error: "not_found" } };
        return { body: { spool } };
      }

      case "create_store_item": {
        const item = await createStoreItem({
          productId: body.productId,
          name: body.name,
          variantDesc: body.variantDesc,
          stockCount: body.stockCount,
          reorderThreshold: body.reorderThreshold,
          notes: body.notes,
        });
        return { body: { item } };
      }

      case "update_store_item": {
        const item = await updateStoreItem(body.id, {
          productId: body.productId,
          name: body.name,
          variantDesc: body.variantDesc,
          stockCount: body.stockCount,
          reorderThreshold: body.reorderThreshold,
          notes: body.notes,
        });
        if (!item) return { status: 404, body: { error: "not_found" } };
        return { body: { item } };
      }

      case "adjust": {
        const adjustment = await adjustInventory(
          {
            targetType: body.targetType,
            targetId: body.targetId,
            adjustmentType: body.adjustmentType,
            quantity: body.quantity,
            reason: body.reason,
          },
          actor.email
        );
        return { body: { adjustment } };
      }

      default: {
        const unhandled: never = body;
        throw new Error(`Unhandled inventory action: ${String(unhandled)}`);
      }
    }
  });
}
