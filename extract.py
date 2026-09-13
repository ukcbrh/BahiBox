import re
with open('src/components/retail/RetailPOSFullScreen.tsx', 'r') as f:
    content = f.read()

quo_match = re.search(r'export const QuotationPage =.*?^(?=export const|export function|$)', content, re.MULTILINE | re.DOTALL)
if quo_match:
    print("=== QuotationPage ===")
    print(quo_match.group(0))

so_match = re.search(r'export const SaleOrderPage =.*?^(?=export const|export function|$)', content, re.MULTILINE | re.DOTALL)
if so_match:
    print("=== SaleOrderPage ===")
    print(so_match.group(0))
