with open("src/components/retail/RetailPOSFullScreen.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);"""

replacement = """  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('retail_customers')
        .select('*')
        .eq('tenant_id', currentTenantId);
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, [currentTenantId]);

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/retail/RetailPOSFullScreen.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found. Let's look at the exact spacing:")
    import re
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "const [customers, setCustomers] = useState<any[]>([]);" in line:
            print("Found at line", i+1)
            print(repr(lines[i-1]))
            print(repr(line))
            print(repr(lines[i+1]))
            break
