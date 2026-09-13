import re

with open('src/components/retail/RetailProductsInventory.tsx', 'r') as f:
    content = f.read()

print("--- 1. handleDownloadTemplate headers ---")
headers_match = re.search(r"const headers = \[(.*?)\];", content)
if headers_match:
    print(f"const headers = [{headers_match.group(1)}];")
else:
    print("Not found")

print("\n--- 2. handleBulkImportFile payload ---")
payload_start = content.find("const payload: any = {", content.find("const handleBulkImportFile"))
if payload_start != -1:
    brace_count = 0
    in_block = False
    end_idx = -1
    for i in range(payload_start, len(content)):
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
        print(content[payload_start:end_idx+1])
    else:
        print("End not found")
else:
    print("Not found")

