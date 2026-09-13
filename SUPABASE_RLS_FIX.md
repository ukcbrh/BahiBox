# Fixing Supabase RLS for Tenants and Branches

Currently, your application has a bug where adding a new Branch or updating your Business Profile does not save correctly, and repeatedly resets when the page is refreshed.

**Why is this happening?**
Your Supabase database has Row-Level Security (RLS) enabled. While there are policies allowing you to *view* (`SELECT`) branches and tenants, there are no policies allowing you to *create* (`INSERT`) or *update* (`UPDATE`) them.
When the app tries to update the database, Supabase silently rejects the change without throwing an error (because 0 rows match the allowed policy), which makes it look like it succeeded, but nothing is actually saved!

## How to fix this

To fix this, you need to add the missing RLS policies directly in your Supabase project.

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project.
3. Click on **SQL Editor** in the left sidebar.
4. Click **New query** and paste the following SQL script:

```sql
-- Allow tenant owners and admins to update their own tenant profile
DROP POLICY IF EXISTS "Tenant admins can update tenant" ON tenants;
CREATE POLICY "Tenant admins can update tenant" ON tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
       WHERE tenant_id = tenants.id 
       AND user_id = auth.uid() 
       AND role_name IN ('owner', 'admin', 'merchant')
    )
  );

-- Allow tenant owners and admins to insert new branches
DROP POLICY IF EXISTS "Tenant admins can insert branches" ON branches;
CREATE POLICY "Tenant admins can insert branches" ON branches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
       WHERE tenant_id = branches.tenant_id 
       AND user_id = auth.uid() 
       AND role_name IN ('owner', 'admin', 'merchant')
    )
  );

-- Allow tenant owners and admins to update their branches
DROP POLICY IF EXISTS "Tenant admins can update branches" ON branches;
CREATE POLICY "Tenant admins can update branches" ON branches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
       WHERE tenant_id = branches.tenant_id 
       AND user_id = auth.uid() 
       AND role_name IN ('owner', 'admin', 'merchant')
    )
  );

-- Allow tenant owners and admins to delete their branches
DROP POLICY IF EXISTS "Tenant admins can delete branches" ON branches;
CREATE POLICY "Tenant admins can delete branches" ON branches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles 
       WHERE tenant_id = branches.tenant_id 
       AND user_id = auth.uid() 
       AND role_name IN ('owner', 'admin', 'merchant')
    )
  );
```

5. Click **Run** in the bottom right corner.
6. Refresh your app. You will now be able to update your business profile and add new branches!
