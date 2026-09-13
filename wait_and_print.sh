rm -rf dist && npm run build 2>&1 | tail -30 > build_out.txt
grep -n "UsageRateCardEditor" src/pages/SuperAdmin.tsx > grep_out.txt
