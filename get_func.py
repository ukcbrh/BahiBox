import sys

def get_block(filepath, start_str):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    start_idx = -1
    for i, line in enumerate(lines):
        if start_str in line:
            start_idx = i
            break
            
    if start_idx == -1:
        print("Not found")
        return
        
    stack = 0
    started = False
    
    for i in range(start_idx, len(lines)):
        line = lines[i]
        sys.stdout.write(line)
        for char in line:
            if char == '{':
                stack += 1
                started = True
            elif char == '}':
                stack -= 1
        
        if started and stack == 0:
            break

get_block('src/components/retail/CreateDeliveryChallanInward.tsx', 'const handleSave = async () => {')
