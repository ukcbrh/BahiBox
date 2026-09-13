echo "=== 1 ==="
rm -rf dist && npm run build 2>&1 | tail -40

echo "=== 2 ==="
grep -c "sales_alt_unit\|cmb_gst" src/components/retail/RetailPOSFullScreen.tsx

echo "=== 3 ==="
grep -c '\\`' src/components/retail/RetailPOSFullScreen.tsx

echo "=== 4 ==="
find / -path "*/app/applet/app/applet*" -maxdepth 15 2>/dev/null
