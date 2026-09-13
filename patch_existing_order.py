with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """      const { data: catsData } = await supabase.from('restaurant_menu_categories').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('display_order');
      if (catsData) setMenuCategories(catsData);
    };
    fetchAll();
  }, [tenantId, tableId]);"""

replace = """      const { data: catsData } = await supabase.from('restaurant_menu_categories').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('display_order');
      if (catsData) setMenuCategories(catsData);

      if (user) {
        const { data: tableData2 } = await supabase.from('restaurant_tables').select('last_reset_at').eq('id', tableId).single();
        if (tableData2) {
          const { data: existingOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('table_id', tableId)
            .eq('user_id', user.id)
            .neq('status', 'Cancelled')
            .gte('created_at', tableData2.last_reset_at)
            .limit(1);
          if (existingOrders && existingOrders.length > 0) {
            setStep('success');
          }
        }
      }
    };
    fetchAll();
  }, [tenantId, tableId, user]);"""

if target in content:
    content = content.replace(target, replace)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
