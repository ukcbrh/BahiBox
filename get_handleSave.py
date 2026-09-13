with open('src/components/retail/CreateDeliveryChallanOutward.tsx', 'r') as f:
    text = f.read()

start_str = "const handleSave = async ("
start_idx = text.find(start_str)
if start_idx == -1:
    print("NOT FOUND")
else:
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
            print(text[start_idx:i+1])
            break
