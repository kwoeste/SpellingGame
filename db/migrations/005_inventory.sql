-- 005: Inventory management tables for filament and store items.
-- Admin-only: app_student has no access. Apply with the owner (DATABASE_URL).
-- Safe to re-run.

BEGIN;

-- Filament spool inventory
CREATE TABLE IF NOT EXISTS engine.filament_spool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  color text NOT NULL,
  material text NOT NULL DEFAULT 'PLA',
  brand text NOT NULL DEFAULT 'Bambu',
  grams_total int NOT NULL DEFAULT 1000,
  grams_used int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS filament_spool_color ON engine.filament_spool (color);
CREATE INDEX IF NOT EXISTS filament_spool_low_stock ON engine.filament_spool (((grams_total - grams_used) < low_stock_threshold));

-- Store item inventory (links to SHOP_PRODUCTS by product_id)
CREATE TABLE IF NOT EXISTS engine.store_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id int NOT NULL,
  name text NOT NULL,
  variant_desc text,
  stock_count int NOT NULL DEFAULT 0,
  reorder_threshold int NOT NULL DEFAULT 2,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_item_product ON engine.store_item (product_id);
CREATE INDEX IF NOT EXISTS store_item_low_stock ON engine.store_item ((stock_count <= reorder_threshold));

-- Inventory adjustment log for audit trail
CREATE TABLE IF NOT EXISTS engine.inventory_adjustment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('filament', 'store_item')),
  target_id uuid NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('add', 'use', 'restock', 'correction', 'waste')),
  quantity int NOT NULL,
  reason text,
  adjusted_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_adjustment_target ON engine.inventory_adjustment (target_type, target_id, created_at DESC);

-- Enable RLS
ALTER TABLE engine.filament_spool ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.store_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine.inventory_adjustment ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (no student access)
DROP POLICY IF EXISTS admin_only ON engine.filament_spool;
CREATE POLICY admin_only ON engine.filament_spool TO app_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_only ON engine.store_item;
CREATE POLICY admin_only ON engine.store_item TO app_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_only ON engine.inventory_adjustment;
CREATE POLICY admin_only ON engine.inventory_adjustment TO app_admin USING (true) WITH CHECK (true);

-- Grant admin full access, explicitly revoke from student
GRANT SELECT, INSERT, UPDATE, DELETE ON engine.filament_spool TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON engine.store_item TO app_admin;
GRANT SELECT, INSERT ON engine.inventory_adjustment TO app_admin;

REVOKE ALL ON engine.filament_spool FROM app_student;
REVOKE ALL ON engine.store_item FROM app_student;
REVOKE ALL ON engine.inventory_adjustment FROM app_student;

-- Admin views for the inventory dashboard
CREATE OR REPLACE VIEW admin_api.filament_inventory AS
SELECT
  id,
  color,
  material,
  brand,
  grams_total,
  grams_used,
  grams_total - grams_used AS grams_left,
  low_stock_threshold,
  (grams_total - grams_used) < low_stock_threshold AS low_stock,
  notes,
  created_at,
  updated_at
FROM engine.filament_spool;

CREATE OR REPLACE VIEW admin_api.store_inventory AS
SELECT
  id,
  product_id,
  name,
  variant_desc,
  stock_count,
  reorder_threshold,
  stock_count <= reorder_threshold AS low_stock,
  notes,
  created_at,
  updated_at
FROM engine.store_item;

CREATE OR REPLACE VIEW admin_api.inventory_log AS
SELECT * FROM engine.inventory_adjustment
ORDER BY created_at DESC;

GRANT SELECT ON admin_api.filament_inventory TO app_admin, assistant_ro;
GRANT SELECT ON admin_api.store_inventory TO app_admin, assistant_ro;
GRANT SELECT ON admin_api.inventory_log TO app_admin, assistant_ro;

COMMIT;
