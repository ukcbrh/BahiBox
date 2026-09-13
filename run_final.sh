echo "=== 1 ==="
rm -rf dist && npm run build 2>&1 | tail -40
echo "=== 2 ==="
grep -n "CreditNoteList\|DebitNoteList" src/components/documents/DocumentsHub.tsx
echo "=== 3 ==="
grep -n "credit_note\|debit_note" src/components/SettingsGeneral.tsx
echo "=== 4 ==="
grep -n '\`' src/components/retail/CreditNoteList.tsx src/components/retail/DebitNoteList.tsx src/components/documents/DocumentsHub.tsx src/components/SettingsGeneral.tsx
echo "=== 5 ==="
find / -path "*/app/applet/app/applet*" 2>/dev/null
