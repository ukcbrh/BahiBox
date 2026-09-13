import sys

with open("src/components/retail/CreateInwardPayment.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "print" in line.lower() or "Print" in line:
        print(f"{i+1}: {line.strip()}")

