import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

calls = [m.start() for m in re.finditer(r"setActiveModuleState", content)]
for c in calls:
    ue_idx = content.rfind("useEffect(() => {", 0, c)
    if ue_idx != -1:
        # Check if the useEffect ends after c
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
                    end_idx = i
                    break
        if end_idx > c:
            print("Found in useEffect:")
            print(content[ue_idx:end_idx+2])

