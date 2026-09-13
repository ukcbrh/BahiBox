with open("src/pages/MerchantDashboard.tsx", "r") as f:
    text = f.read()

import re

# Find the block where finalMenu is being used
match = re.search(r"let finalMenu: any\[\] = \[\];(.*?)setDynamicMenu\(finalMenu.sort", text, re.DOTALL)
if match:
    print(match.group(0))
