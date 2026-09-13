npm run lint > lint.txt 2>&1
cat lint.txt
echo "---"
grep -n "onChange={e => setProfile({...profile, phone" src/components/services/ProviderProfileForm.tsx
echo "---"
grep -n "phone: profile.phone" src/components/services/ProviderProfileForm.tsx
