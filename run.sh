npm run lint > output.txt 2>&1
echo "---" >> output.txt
ls src/components/ChangePasswordCard.tsx >> output.txt 2>&1
echo "---" >> output.txt
grep -n "ChangePasswordCard" src/components/SettingsView.tsx >> output.txt 2>&1
cat output.txt
