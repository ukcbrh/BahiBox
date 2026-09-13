with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

target1 = """        const { data: brandingData } = await supabase
          .from('merchant_branding')
          .select('*')
          .in('tenant_id', retailTenantIds);"""
repl1 = """        const { data: brandingData } = await supabase
          .from('merchant_branding')
          .select('*')
          .in('merchant_id', retailTenantIds);"""
if target1 in content:
    content = content.replace(target1, repl1)
    print("target1 replaced")
else:
    print("target1 not found")

target2 = """        const brandingMap = new globalThis.Map(brandingData?.map((b: any) => [b.tenant_id, b]));"""
repl2 = """        const brandingMap = new globalThis.Map(brandingData?.map((b: any) => [b.merchant_id, b]));"""
if target2 in content:
    content = content.replace(target2, repl2)
    print("target2 replaced")
else:
    print("target2 not found")

with open('src/pages/PublicApp.tsx', 'w') as f:
    f.write(content)
