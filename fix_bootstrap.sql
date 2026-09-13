CREATE OR REPLACE FUNCTION bootstrap_merchant_tenant(
  p_user_id UUID,
  p_business_name TEXT,
  p_business_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Insert the new tenant
  INSERT INTO tenants (business_name, business_type, status, plan_type)
  VALUES (p_business_name, p_business_type::business_type, 'active', 'free')
  RETURNING id INTO v_tenant_id;

  -- Assign the user as the owner
  INSERT INTO user_tenant_roles (user_id, tenant_id, role_name)
  VALUES (p_user_id, v_tenant_id, 'owner');

  -- Create a default branch
  INSERT INTO branches (tenant_id, branch_name, is_main_branch, status)
  VALUES (v_tenant_id, 'Main Branch', true, 'active');

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
