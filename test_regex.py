import re

with open('src/components/retail/RetailProductsInventory.tsx', 'r') as f:
    content = f.read()

print("--- Step 2b ---")
print(content[content.find('useEffect(() => {'):content.find('useEffect(() => {')+200])

print("\n--- Step 4a ---")
start = content.find('const [newProduct, setNewProduct] = useState')
print(content[start:start+400])

print("\n--- Step 9 ---")
start = content.find('const handleEditProduct = (p: any) => {')
print(content[start:start+800])
