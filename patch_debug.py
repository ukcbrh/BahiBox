with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = "  const unpaidTotal = myOrders.filter(o => o.payment_status === 'unpaid').reduce((sum, o) => sum + (o.total || 0), 0);"
replace = """  const unpaidTotal = myOrders.filter(o => o.payment_status === 'unpaid').reduce((sum, o) => sum + (o.total || 0), 0);
  console.log('DEBUG myOrders:', JSON.stringify(myOrders));"""

if target in content:
    content = content.replace(target, replace)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
