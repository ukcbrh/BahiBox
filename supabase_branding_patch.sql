ALTER TABLE merchant_branding 
ADD COLUMN IF NOT EXISTS domain_verification_status TEXT NOT NULL DEFAULT 'none' 
CHECK (domain_verification_status IN ('none','pending','verified','rejected'));

ALTER TABLE merchant_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active whitelabel" ON merchant_branding;
CREATE POLICY "Public read active whitelabel" ON merchant_branding
  FOR SELECT USING (is_whitelabel_active = true);

DROP POLICY IF EXISTS "Merchant manage own branding" ON merchant_branding;
CREATE POLICY "Merchant manage own branding" ON merchant_branding
  FOR ALL USING (merchant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid()));

-- Super Admin can manage all branding
DROP POLICY IF EXISTS "Super Admin manage all branding" ON merchant_branding;
CREATE POLICY "Super Admin manage all branding" ON merchant_branding
  FOR ALL USING (EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid() AND role = 'super_admin'));
