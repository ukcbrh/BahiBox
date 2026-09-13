DO $$ BEGIN
  DROP FUNCTION IF EXISTS get_tenant_menu(UUID, UUID);
END $$;

CREATE OR REPLACE FUNCTION get_tenant_menu(checking_tenant_id UUID, checking_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_key TEXT,
  module_name TEXT,
  module_icon TEXT,
  module_order INTEGER,
  item_id UUID,
  item_key TEXT,
  item_label TEXT,
  item_icon TEXT,
  route_path TEXT,
  parent_item_id UUID,
  item_order INTEGER
) AS $$
DECLARE
  t_business_type TEXT;
BEGIN
  -- Get the tenant's business type
  SELECT business_type::TEXT INTO t_business_type FROM tenants WHERE id = checking_tenant_id;

  RETURN QUERY
  WITH user_perms AS (
    SELECT permission_key FROM get_user_permissions(checking_user_id, checking_tenant_id)
  )
  SELECT 
    mm.id AS module_id,
    mm.module_key,
    mm.module_name,
    mm.icon_name AS module_icon,
    mm.display_order AS module_order,
    mi.id AS item_id,
    mi.item_key,
    mi.item_label,
    mi.icon_name AS item_icon,
    mi.route_path,
    mi.parent_item_id,
    mi.display_order AS item_order
  FROM menu_modules mm
  JOIN menu_items mi ON mm.id = mi.menu_module_id
  WHERE (LOWER(mm.module_key) = LOWER(t_business_type) OR mm.module_key = 'core')
    AND mm.is_active = true
    AND mi.is_active = true
    AND (
      mi.required_permission IS NULL 
      OR mi.required_permission IN (SELECT permission_key FROM user_perms)
      OR is_platform_admin(checking_user_id)
    )
  ORDER BY mm.display_order ASC, mi.parent_item_id ASC NULLS FIRST, mi.display_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Tenant users can insert tenant wallets" ON wallet_accounts;
END $$;

CREATE POLICY "Tenant users can insert tenant wallets" ON wallet_accounts 
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
);
