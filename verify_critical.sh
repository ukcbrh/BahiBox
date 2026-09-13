echo "=== Command 1 ==="
find / -iname "CreateDebitNote.tsx" 2>/dev/null
echo "=== Command 2 ==="
find / -path "*/app/applet/app/applet*" 2>/dev/null
echo "=== Command 4 ==="
grep -n "invalidItem" src/components/retail/CreateCreditNote.tsx
echo "=== Command 6 ==="
rm -rf dist && npm run build 2>&1 | tail -30
