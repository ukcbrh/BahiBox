import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

# Let's find the dropdown or menu where setActiveModuleState is called
idx = content.find("setActiveModuleState(mod.name as ModuleType);")
if idx != -1:
    start_idx = content.rfind("<div", 0, idx)
    # Just print around this area
    print(content[max(0, start_idx-500):min(len(content), idx+1000)])
