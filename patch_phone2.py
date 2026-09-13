with open("src/components/hospitality/HospitalityComponents.tsx", "r") as f:
    content = f.read()

target = """      p_customer_name: user.email || 'Guest',
      p_customer_phone: '',"""

replacement = """      p_customer_name: user.email || 'Guest',
      p_customer_phone: customerPhone,"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/hospitality/HospitalityComponents.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
