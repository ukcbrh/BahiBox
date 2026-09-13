import re

with open('server.ts', 'r') as f:
    text = f.read()

start_str = "app.post('/api/create-invoice-payment-qr', async (req, res) => {"
start_idx = text.find(start_str)
first_brace = text.find('{', start_idx)

stack = 0
started = False
for i in range(first_brace, len(text)):
    if text[i] == '{':
        stack += 1
        started = True
    elif text[i] == '}':
        stack -= 1
    
    if started and stack == 0:
        res = text[start_idx:i+2] # usually ends with });\n
        # just print it to a file
        with open('target1.txt', 'w') as f2:
            f2.write(text[start_idx:i+2])
        break

start_str2 = "const tenantId = qrCodeEntity.notes?.tenant_id;\n        const branchId = qrCodeEntity.notes?.branch_id;\n        const invoiceId = qrCodeEntity.notes?.invoice_id;\n\n        if (invoiceId) {"
with open('target2.txt', 'w') as f2:
    f2.write(start_str2)
