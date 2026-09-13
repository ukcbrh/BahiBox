echo "=== 1 ==="
grep -n '\`' src/components/retail/CreditNoteList.tsx src/components/retail/DebitNoteList.tsx src/components/documents/DocumentsHub.tsx src/components/SettingsGeneral.tsx
echo "=== 2 ==="
find / -path "*/app/applet/app/applet*" 2>/dev/null
echo "=== 3 ==="
find / -iname "CreditNoteList.tsx" -o -iname "DebitNoteList.tsx" 2>/dev/null
