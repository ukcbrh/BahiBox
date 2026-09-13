import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

def get_use_effect(inner_func_name):
    # This is a bit tricky, let's find the inner function first
    inner_idx = content.find(inner_func_name)
    if inner_idx == -1:
        return f"{inner_func_name} not found"
    
    # Now find the useEffect that contains this
    use_effect_idx = content.rfind("useEffect(() => {", 0, inner_idx)
    if use_effect_idx == -1:
         return f"useEffect for {inner_func_name} not found"
    
    brace_count = 0
    in_block = False
    end_idx = -1
    for i in range(use_effect_idx, len(content)):
        if content[i] == '(':
             pass
        if content[i] == '{':
            if not in_block:
                in_block = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_block and brace_count == 0:
                semicolon_idx = content.find(";", i)
                if semicolon_idx != -1:
                     end_idx = semicolon_idx
                else:
                     end_idx = i
                break
    if end_idx != -1:
        return content[use_effect_idx:end_idx+1]
    return "End not found"


print("--- 1. merchantSubscriptions ---")
match1 = re.search(r"const \[merchantSubscriptions, setMerchantSubscriptions\].*?;", content)
if match1:
    print(match1.group(0))
else:
    print("Not found")

print("\n--- 2. moduleMaster state & fetch ---")
match2 = re.search(r"const \[moduleMaster, setModuleMaster\].*?;", content)
if match2:
    print(match2.group(0))
else:
    print("Not found")
    
# Let's find fetchModuleMaster
fetch_mod_idx = content.find("const fetchModuleMaster = async () => {")
if fetch_mod_idx != -1:
    brace_count = 0
    in_block = False
    end_idx = -1
    for i in range(fetch_mod_idx, len(content)):
        if content[i] == '{':
            if not in_block:
                in_block = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_block and brace_count == 0:
                end_idx = i
                break
    if end_idx != -1:
        print(content[fetch_mod_idx:end_idx+1])
else:
    # Maybe it's inside a useEffect directly
    print(get_use_effect("from('module_master')"))


print("\n--- 3. useEffect calling fetchMerchantSubscriptions ---")
# Find calls to fetchMerchantSubscriptions
calls = [m.start() for m in re.finditer(r"fetchMerchantSubscriptions\(", content)]
for c in calls:
    # check if it's inside useEffect
    ue_idx = content.rfind("useEffect(() => {", 0, c)
    if ue_idx != -1:
        # Check if there is another function declaration between useEffect and call, if so maybe it's not the top-level
        # actually, just print the useEffect
        print("Found a call inside useEffect:")
        # Simple extraction
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
            # Just print the first one found that's an actual useEffect block
            print(content[ue_idx:end_idx+1])
            break

print("\n--- 4. activeModuleState ---")
# declaration
match4 = re.search(r"const \[activeModuleState, setActiveModuleState\].*?\);", content, re.DOTALL)
if match4:
    print(match4.group(0))
else:
    print("Not found")

# useEffect initializing it
# Let's search for `setActiveModuleState(` inside useEffect
ue_calls = [m.start() for m in re.finditer(r"setActiveModuleState\(", content)]
for c in ue_calls:
    ue_idx = content.rfind("useEffect(() => {", 0, c)
    if ue_idx != -1 and "bahi_active_module" not in content[ue_idx:c]: # ignore the one that just saves to localStorage
        # Let's verify it's initializing based on merchant details or similar
        print("Found a call inside useEffect:")
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
            # Print if it has anything to do with tenant or merchant
            if "tenant" in content[ue_idx:end_idx+1] or "merchant" in content[ue_idx:end_idx+1] or "moduleMaster" in content[ue_idx:end_idx+1]:
                print(content[ue_idx:end_idx+1])

