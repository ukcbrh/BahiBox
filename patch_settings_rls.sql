-- Allow owners and admins to update their tenant profile
DO $$ BEGIN
  DROP POLICY IF EXISTS "Tenant admins can update tenant" ON tenants;
  DROP POLICY IF EXISTS "Tenant admins can insert branches" ON branches;
  DROP POLICY IF EXISTS "Tenant admins can update branches" ON branches;
  DROP POLICY IF EXISTS "Tenant admins can delete branches" ON branches;
END $$;

CREATE POLICY "Tenant admins can update tenant" ON tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
      WHERE tenant_id = tenants.id 
      AND user_id = auth.uid() 
      AND role_name IN ('owner', 'admin', 'merchant')
    )
  );

CREATE POLICY "Tenant admins can insert branches" ON branches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
      WHERE tenant_id = branches.tenant_id 
      AND user_id = auth.uid() 
      AND role_name IN ('owner', 'admin', 'merchant')
    )
  );

CREATE POLICY "Tenant admins can update branches" ON branches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
      WHERE tenant_id = branches.tenant_id 
      AND user_id = auth.uid() 
      AND role_name IN ('owner', 'admin', 'merchant')
    )
  );

CREATE POLICY "Tenant admins can delete branches" ON branches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
      WHERE tenant_id = branches.tenant_id 
      AND user_id = auth.uid() 
      AND role_name IN ('owner', 'admin', 'merchant')
    )
  );
