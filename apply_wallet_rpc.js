const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const sql = `
CREATE OR REPLACE FUNCTION get_or_create_tenant_bank_wallet(p_tenant_id UUID) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Try to find existing
  SELECT id INTO v_wallet_id
  FROM wallet_accounts
  WHERE tenant_id = p_tenant_id AND owner_type = 'tenant_bank'
  LIMIT 1;
  
  -- If not found, create
  IF v_wallet_id IS NULL THEN
    INSERT INTO wallet_accounts (tenant_id, owner_type, owner_id, account_label)
    VALUES (p_tenant_id, 'tenant_bank', p_tenant_id, 'Business Wallet')
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

// since there is no execute_sql directly on supabase js without rpc, we'll write it to schema.sql and then try to see if we can use postgres node client.
