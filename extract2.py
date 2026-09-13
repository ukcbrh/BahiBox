import re
with open('src/components/retail/RetailPOSFullScreen.tsx', 'r') as f:
    lines = f.readlines()

def extract_comp(start_str):
    in_comp = False
    comp_lines = []
    for line in lines:
        if line.startswith(start_str):
            in_comp = True
        elif in_comp and line.startswith('export const '):
            break
        
        if in_comp:
            comp_lines.append(line)
    return "".join(comp_lines)

print("=== QuotationPage ===")
print(extract_comp("export const QuotationPage"))
print("\n=== SaleOrderPage ===")
print(extract_comp("export const SaleOrderPage"))
