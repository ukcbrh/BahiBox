with open('src/pages/PublicApp.tsx', 'r') as f:
    content = f.read()

print("\n--- 4. StoreProductGrid ---")
start_idx = content.find("function StoreProductGrid(")
end_idx = content.find("export default function PublicApp(", start_idx)
if start_idx != -1 and end_idx != -1:
    print(content[start_idx:end_idx].strip())

