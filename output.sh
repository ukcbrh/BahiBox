echo "--- 1 ---"
rm -rf dist && npm run build 2>&1 | tail -30
echo "--- 2 ---"
grep -n "UsageRateCardEditor" src/pages/SuperAdmin.tsx
