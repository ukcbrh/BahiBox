import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

print("--- 1. merchantSubscriptions ---")
for line in content.split('\n'):
    if 'setMerchantSubscriptions' in line:
        print(line.strip())

print("\n--- 2. moduleMaster state & fetch ---")
for line in content.split('\n'):
    if 'setModuleMaster' in line:
        print(line.strip())

# Find the block containing setModuleMaster
idx = content.find("setModuleMaster")
if idx != -1:
    ue_idx = content.rfind("useEffect", 0, idx)
    func_idx = content.rfind("const", 0, idx)
    # Let's just find the closest block start `{` before setModuleMaster
    start = max(ue_idx, func_idx)
    brace_count = 0
    in_block = False
    end_idx = -1
    for i in range(start, len(content)):
        if content[i] == '{':
            if not in_block:
                in_block = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_block and brace_count == 0:
                end_idx = i
                break
    print(content[start:end_idx+1])

print("\n--- 3. useEffect calling fetchMerchantSubscriptions ---")
for line in content.split('\n'):
    if 'fetchMerchantSubscriptions' in line:
        print(line.strip())

print("\n--- 4. activeModuleState ---")
for line in content.split('\n'):
    if 'setActiveModuleState' in line:
        print(line.strip())

