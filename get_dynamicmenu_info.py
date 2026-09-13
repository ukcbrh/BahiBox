import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

# Find the start of the useEffect containing 'get_tenant_menu'
idx = content.find("get_tenant_menu")
if idx != -1:
    ue_idx = content.rfind("useEffect(() => {", 0, idx)
    if ue_idx != -1:
        # Find the end of the useEffect
        brace_count = 0
        in_block = False
        end_idx = -1
        for i in range(ue_idx, len(content)):
            if content[i] == '{':
                if not in_block:
                    in_block = True
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if in_block and brace_count == 0:
                    semi_idx = content.find(";", i)
                    if semi_idx != -1:
                        end_idx = semi_idx
                    else:
                        end_idx = i
                    break
        if end_idx != -1:
            print(content[ue_idx:end_idx+1])
