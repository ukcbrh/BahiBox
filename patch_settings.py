with open("src/components/SettingsGeneral.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "  inward_payment: 'Inward Payment Receipt',\n  outward_payment: 'Outward Payment Receipt'\n};",
    "  inward_payment: 'Inward Payment Receipt',\n  outward_payment: 'Outward Payment Receipt',\n  credit_note: 'Credit Note',\n  debit_note: 'Debit Note'\n};"
)

content = content.replace(
    "    inward_payment: { prefix: 'RCPT-IN-', printerSize: '80mm' },\n    outward_payment: { prefix: 'RCPT-OUT-', printerSize: '80mm' }\n  });",
    "    inward_payment: { prefix: 'RCPT-IN-', printerSize: '80mm' },\n    outward_payment: { prefix: 'RCPT-OUT-', printerSize: '80mm' },\n    credit_note: { prefix: 'CN-', printerSize: 'A4' },\n    debit_note: { prefix: 'DN-', printerSize: 'A4' }\n  });"
)

content = content.replace(
    "          {renderChannelSettings('inward_payment')}\n          {renderChannelSettings('outward_payment')}\n        </div>",
    "          {renderChannelSettings('inward_payment')}\n          {renderChannelSettings('outward_payment')}\n          {renderChannelSettings('credit_note')}\n          {renderChannelSettings('debit_note')}\n        </div>"
)

with open("src/components/SettingsGeneral.tsx", "w") as f:
    f.write(content)
