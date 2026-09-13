import re

with open('src/components/retail/RetailProductsInventory.tsx', 'r') as f:
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

print("--- 1. newProduct initial state ---")
print(get_block("const [newProduct, setNewProduct] = useState<Record<string, string>>({"))

print("\n--- 2. COLUMN_LABELS ---")
print(get_block("const COLUMN_LABELS: Record<string, string> = {"))

print("\n--- 3. visibleColumns ---")
print(get_block("const [visibleColumns, setVisibleColumns] = useState(() => {"))

print("\n--- 4. handleEditProduct ---")
print(get_block("const handleEditProduct = (p: any) => {"))

print("\n--- 5. handleAddCategory ---")
print(get_block("const handleAddCategory = async (e: React.FormEvent) => {"))

