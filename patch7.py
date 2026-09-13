import sys
file_path = 'src/components/BranchSettings.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = "            pincode: formData.pincode,"
replacement = "            pincode: formData.pincode,\n            upi_id: formData.upi_id,"

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
