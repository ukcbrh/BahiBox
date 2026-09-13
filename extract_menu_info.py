import re

with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    content = f.read()

print("--- 1. Menu determination using business_type ---")
# Find the exact code around effectiveModule
start_effective = content.find("const effectiveModule = activeModuleState || tenant?.business_type || 'Retail POS';")
if start_effective != -1:
    end_effective = content.find("})()}", start_effective)
    if end_effective != -1:
        print(content[start_effective:end_effective+5])

print("\n--- 2. merchant_subscriptions fetch ---")
start_sub = content.find("const fetchMerchantSubscriptions = async")
if start_sub != -1:
    brace_count = 0
    in_block = False
    end_sub = -1
    for i in range(start_sub, len(content)):
        if content[i] == '{':
            if not in_block:
                in_block = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_block and brace_count == 0:
                end_sub = i
                break
    if end_sub != -1:
        print(content[start_sub:end_sub+1])


print("\n--- 3. Purchased Modules Switcher ---")
start_switch = content.find("{/* Purchased Modules Switcher */}")
if start_switch != -1:
    end_switch = content.find("</div>", content.find("</button>", start_switch))
    # It's a div containing a map of moduleMaster. We need to find the matching closing div.
    start_div = content.rfind("<div", 0, start_switch)
    brace_count = 0
    in_div = False
    end_div = -1
    # Actually just print the map block
    # Let's parse HTML tags ... 
    print("Found Switcher. Let's get the exact block.")
