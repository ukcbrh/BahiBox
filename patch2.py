import sys

with open("src/components/SettingsGeneral.tsx", "r") as f:
    content = f.read()

target = """          {renderChannelSettings('delivery_challan_in')}
          {renderChannelSettings('delivery_challan_out')}
        </div>"""

replacement = """          {renderChannelSettings('delivery_challan_in')}
          {renderChannelSettings('delivery_challan_out')}
          {renderChannelSettings('inward_payment')}
          {renderChannelSettings('outward_payment')}
        </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/SettingsGeneral.tsx", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
