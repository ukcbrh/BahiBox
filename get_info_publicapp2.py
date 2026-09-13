import re

with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

def get_func(func_name):
    start_idx = content.find(f"function {func_name}")
    if start_idx == -1:
        return f"{func_name} not found"
        
    brace_count = 0
    in_func = False
    end_idx = -1
    
    # find first {
    first_brace = content.find("{", start_idx)
    if first_brace == -1:
        return "Could not parse"
        
    for i in range(first_brace, len(content)):
        if content[i] == '{':
            if not in_func:
                in_func = True
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if in_func and brace_count == 0:
                end_idx = i
                break
                
    if end_idx != -1:
        return content[start_idx:end_idx+1]
    return "End not found"

print("\n--- 4. StoreProductGrid ---")
print(get_func("StoreProductGrid"))

print("\n--- 5. ProductDetailView ---")
print(get_func("ProductDetailView"))

