import { NotAllowed } from "@/components/NotAllowed";
import { requirePageUser } from "@/lib/auth/server";
import { InventoryPanel } from "@/app/admin/_ui/inventory";
import { listFilamentSpools, listStoreItems, listAdjustments } from "@/lib/admin/inventory-repo";
import { SHOP_PRODUCTS, FILAMENT_COLORS } from "@/lib/shop/products";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  // Layout and middleware also gate /admin; check here too so the page never queries for non-admins.
  const user = await requirePageUser(["admin"], "/admin/inventory");
  if (!user) return <NotAllowed />;

  const [filamentSpools, storeItems, adjustments] = await Promise.all([
    listFilamentSpools(),
    listStoreItems(),
    listAdjustments(50),
  ]);

  return (
    <InventoryPanel
      filamentSpools={filamentSpools}
      storeItems={storeItems}
      adjustments={adjustments}
      shopProducts={SHOP_PRODUCTS.map((p) => ({ id: p.id, name: p.name }))}
      filamentColors={FILAMENT_COLORS}
    />
  );
}
