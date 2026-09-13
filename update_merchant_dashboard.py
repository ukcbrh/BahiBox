import sys
with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Update LedgerView state
if "const [activeTab, setActiveTab]" not in content:
    content = content.replace(
        "const [loading, setLoading] = useState(false);",
        "const [loading, setLoading] = useState(false);\n  const [deliveryFundWalletId, setDeliveryFundWalletId] = useState<string | null>(null);\n  const [activeTab, setActiveTab] = useState<'cash' | 'delivery'>('cash');"
    )

# 2. Update initTestWallet
target_init = """        if (newWallet) {
          setWalletId(newWallet.id);
        } else {
           console.error("Failed to create test wallet", error);
        }
      }"""
replacement_init = """        if (newWallet) {
          setWalletId(newWallet.id);
        } else {
           console.error("Failed to create test wallet", error);
        }
      }
      
      // Fetch or create delivery fund wallet
      const { data: dfId } = await supabase.rpc('get_or_create_delivery_fund', { p_tenant_id: currentTenantId });
      if (dfId) {
         setDeliveryFundWalletId(dfId);
      }"""
content = content.replace(target_init, replacement_init)

with open('src/pages/MerchantDashboard.tsx', 'w') as f:
    f.write(content)
