import sys

with open('src/components/retail/InvoiceHistory.tsx', 'r') as f:
    content = f.read()

content = content.replace("\\${", "${")

with open('src/components/retail/InvoiceHistory.tsx', 'w') as f:
    f.write(content)

print("Patched 2")
