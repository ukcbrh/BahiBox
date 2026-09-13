import re

with open('src/components/retail/RetailProductsInventory.tsx', 'r') as f:
    content = f.read()

def extract_function(func_start_text):
    start_idx = content.find(func_start_text)
    if start_idx == -1:
        return "Not found"
        
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
        return content[start_idx:end_idx+1]
    return "Could not parse"

print("--- 4. handleEditProduct ---")
print(extract_function("const handleEditProduct = (p: any) => {"))

print("\n--- 5. handleAddCategory ---")
print(extract_function("const handleAddCategory = async (e: React.FormEvent) => {"))

