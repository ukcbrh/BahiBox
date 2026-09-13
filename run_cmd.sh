npm run lint > lint.txt 2>&1
cat lint.txt
echo "---"
grep -n "ProviderProfileForm" src/components/services/ServicesAdminSettings.tsx || true
echo "---"
grep -n "ProviderProfileForm" src/components/services/StaffTeamView.tsx || true
echo "---"
grep -c "Provider Type" src/components/services/ProviderProfileForm.tsx || true
