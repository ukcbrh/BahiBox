import base64

def patch_file(filepath, target_b64, repl_b64):
    target = base64.b64decode(target_b64).decode('utf-8')
    repl = base64.b64decode(repl_b64).decode('utf-8')
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    if target not in content:
        print(f"FAILED to find target in {filepath}")
        return False
        
    new_content = content.replace(target, repl)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"SUCCESS: Patched {filepath}")
    return True

target_b64 = base64.b64encode("""interface CreateDeliveryChallanOutwardProps {
  onBack: () => void;
}""".encode('utf-8')).decode('utf-8')

repl_b64 = base64.b64encode("""interface CreateDeliveryChallanOutwardProps {
  onBack: () => void;
  editData?: any;
}""".encode('utf-8')).decode('utf-8')

patch_file('src/components/retail/CreateDeliveryChallanOutward.tsx', target_b64, repl_b64)
