import re

with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

def get_block(start_str):
    start_idx = content.find(start_str)
    if start_idx == -1:
        return f"{start_str} not found"
    
    brace_count = 0
    in_function = False
    end_idx = -1
    for i in range(start_idx, len(content)):
        if content[i] == '{' or content[i] == '(':
            if not in_function:
                in_function = True
            brace_count += 1
        elif content[i] == '}' or content[i] == ')':
            brace_count -= 1
            if in_function and brace_count == 0:
                end_idx = i
                break
    
    if end_idx != -1:
        return content[start_idx:end_idx+1]
    return "End not found"

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
                # Need to find the closing bracket of useEffect:  }, [...]);
                semicolon_idx = content.find(";", i)
                if semicolon_idx != -1:
                     end_idx = semicolon_idx
                else:
                     end_idx = i
                break
    if end_idx != -1:
        return content[use_effect_idx:end_idx+1]
    return "End not found"


print("--- 1. martCategories state ---")
match = re.search(r"const \[martCategories, setMartCategories\].*?;", content)
if match:
    print(match.group(0))
else:
    print("Not found")

print("\n--- 2. fetchMarketplace useEffect ---")
print(get_use_effect("const fetchMarketplace = async () => {"))

print("\n--- 3. fetchProductsData useEffect ---")
print(get_use_effect("const fetchProductsData = async () => {"))

print("\n--- 4. StoreProductGrid ---")
print(get_block("function StoreProductGrid("))

print("\n--- 5. ProductDetailView ---")
print(get_block("function ProductDetailView("))

