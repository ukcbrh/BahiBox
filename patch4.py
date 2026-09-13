import sys
import re

file_path = 'src/components/BranchSettings.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = r"  const \[formData, setFormData\] = useState\(\{\n    branch_name: '',\n    address: '',\n    city: '',\n    state: '',\n    pincode: '',\n    status: 'active',  \n    latitude: null as number \| null,\n    longitude: null as number \| null\n  \}\);"

replacement = """  const [formData, setFormData] = useState({
    branch_name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    status: 'active',  
    latitude: null as number | null,
    longitude: null as number | null,
    upi_id: ''
  });"""

content = re.sub(target, replacement, content, flags=re.MULTILINE)

with open(file_path, 'w') as f:
    f.write(content)
print("Success")
