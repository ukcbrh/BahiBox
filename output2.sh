echo "--- 1 ---"
grep -n "platform_usage" server.ts
echo "--- 2 ---"
grep -n "UsageRateCardEditor" src/pages/SuperAdmin.tsx
echo "--- 3 ---"
grep -c "PlatformUsageWalletView" src/pages/MerchantDashboard.tsx
echo "--- 4 ---"
ls -la src/components/retail/PlatformUsageWalletView.tsx src/components/superadmin/UsageRateCardEditor.tsx
echo "--- 5 ---"
rm -rf dist && npm run build 2>&1 | tail -40
