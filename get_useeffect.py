import re

with open('src/components/retail/CreateDeliveryChallanInward.tsx', 'r') as f:
    content = f.read()

start_str = "useEffect(() => {\n    if (editData) {"
if start_str not in content:
    start_str = "if (editData)"

start_idx = content.find("useEffect(() => {\n    if (editData) {")
if start_idx == -1:
    # Just search for editData within a useEffect
    matches = list(re.finditer(r'useEffect\(\(\) => \{[^}]*editData', content, re.MULTILINE | re.DOTALL))
    if matches:
        start_idx = matches[0].start()

if start_idx != -1:
    stack = 0
    started = False
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            stack += 1
            started = True
        elif content[i] == '}':
            stack -= 1
        if started and stack == 0:
            print(content[start_idx:i+2])
            break
else:
    print("Could not find useEffect for editData.")
