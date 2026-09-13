echo "=== Command 1 ==="
rm -rf dist && npm run build 2>&1 | tail -30
echo "=== Command 2 ==="
grep -n "invalidItem" src/components/retail/CreateDebitNote.tsx
echo "=== Command 3 ==="
grep -n '\`' src/components/retail/CreateDebitNote.tsx
echo "=== Command 4 ==="
find / -path "*/app/applet/app/applet*" 2>/dev/null
