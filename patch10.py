import sys
file_path = 'src/components/hospitality/HospitalityComponents.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = "import { useAuth } from '../../contexts/AuthContext';"
replacement = """import { useAuth } from '../../contexts/AuthContext';
import { BranchSettings } from '../BranchSettings';
import { SettingsGeneral } from '../SettingsGeneral';
import { BillFormatSettings } from '../BillFormatSettings';"""

if target in content and "import { BranchSettings }" not in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Success")
elif "import { BranchSettings }" in content:
    print("Already present")
else:
    print("Target not found")
