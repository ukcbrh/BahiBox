DO $$ BEGIN
  DROP POLICY IF EXISTS "Tenant users can insert tenant wallets" ON wallet_accounts;
END $$;
CREATE POLICY "Tenant users can insert tenant wallets" ON wallet_accounts 
FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));
