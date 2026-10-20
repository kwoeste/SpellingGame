export type FilamentSpool = {
  id: string;
  color: string;
  material: string;
  brand: string;
  gramsTotal: number;
  gramsUsed: number;
  gramsLeft: number;
  lowStockThreshold: number;
  lowStock: boolean;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

export type StoreItem = {
  id: string;
  productId: number;
  name: string;
  variantDesc: string | null;
  stockCount: number;
  reorderThreshold: number;
  lowStock: boolean;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

export type InventoryAdjustment = {
  id: string;
  targetType: "filament" | "store_item";
  targetId: string;
  adjustmentType: "add" | "use" | "restock" | "correction" | "waste";
  quantity: number;
  reason: string | null;
  adjustedBy: string;
  createdAt: number;
};

export type FilamentInput = {
  color: string;
  material: string;
  brand: string;
  gramsTotal: number;
  lowStockThreshold: number;
  notes?: string;
};

export type StoreItemInput = {
  productId: number;
  name: string;
  variantDesc?: string;
  stockCount: number;
  reorderThreshold: number;
  notes?: string;
};

export type AdjustmentInput = {
  targetType: "filament" | "store_item";
  targetId: string;
  adjustmentType: "add" | "use" | "restock" | "correction" | "waste";
  quantity: number;
  reason?: string;
};
