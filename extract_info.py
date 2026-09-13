import re

with open('src/components/retail/RetailProductsInventory.tsx', 'r') as f:
    content = f.read()

print("--- renderInputForCol ---")
start_idx = content.find("const renderInputForCol = (col: string) => {")
if start_idx != -1:
    brace_count = 0
    in_function = False
    end_idx = -1
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            if not in_function:
                in_function = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_function and brace_count == 0:
                end_idx = i
                break
    if end_idx != -1:
        print(content[start_idx:end_idx+1])
    else:
        print("End not found")
else:
    print("Function not found")


print("\n--- handleAddProduct payload ---")
start_idx = content.find("const payload = {")
if start_idx != -1:
    brace_count = 0
    in_function = False
    end_idx = -1
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            if not in_function:
                in_function = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_function and brace_count == 0:
                end_idx = i
                break
    if end_idx != -1:
        print(content[start_idx:end_idx+1])
    else:
        print("End not found")
else:
    print("Payload not found")
