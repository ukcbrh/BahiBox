with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

print("\n--- 4. StoreProductGrid ---")
start_idx = content.find("function StoreProductGrid(")
if start_idx != -1:
    print(content[start_idx:].strip())

