import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

idx = content.find("fetchMerchantSubscriptions(currentTenantId || merchantDetails.id);")
if idx != -1:
    print(content[idx-300:idx+200])
