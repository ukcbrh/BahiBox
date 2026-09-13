import sys
with open('src/pages/MerchantDashboard.tsx', 'r') as f:
    for line in f:
        if "LedgerView" in line and "function" in line:
            break
        # print(line, end="")
