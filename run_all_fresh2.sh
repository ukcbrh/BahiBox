echo "=== 1 ==="
find / -iname "RetailProductsInventory.tsx" 2>/dev/null
echo "=== 2 ==="
find / -path "*/app/applet/app/applet*" 2>/dev/null
echo "=== 3 ==="
grep -c "defaultColumns" src/components/retail/RetailProductsInventory.tsx
echo "=== 4 ==="
grep -n "max-h-\[calc" src/components/retail/RetailProductsInventory.tsx
echo "=== 5 ==="
grep -n '`' src/components/retail/RetailProductsInventory.tsx | grep '\\\\'
echo "=== 6 ==="
rm -rf dist node_modules/.vite && npm run build 2>&1 | tail -60
