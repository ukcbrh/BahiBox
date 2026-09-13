with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """    if (data) setMyOrders(data);
  };"""
replace = """    console.log('DEBUG tableData:', JSON.stringify(tableData), 'error:', typeof error !== 'undefined' ? JSON.stringify(error) : 'undefined');
    if (data) setMyOrders(data);
  };"""

if target in content:
    content = content.replace(target, replace)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
