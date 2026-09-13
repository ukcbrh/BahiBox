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

target1_b64 = base64.b64encode("import { DeliveryChallanOutwardPage } from './RetailPOSFullScreen';".encode('utf-8')).decode('utf-8')
repl1_b64 = base64.b64encode("import { CreateDeliveryChallanOutward } from './CreateDeliveryChallanOutward';".encode('utf-8')).decode('utf-8')

target2_b64 = base64.b64encode("    return <DeliveryChallanOutwardPage onBack={() => { setIsCreating(false); setEditData(null); fetchChallans(); }} editData={editData} />;".encode('utf-8')).decode('utf-8')
repl2_b64 = base64.b64encode("    return <CreateDeliveryChallanOutward onBack={() => { setIsCreating(false); setEditData(null); fetchChallans(); }} editData={editData} />;".encode('utf-8')).decode('utf-8')

patch_file('src/components/retail/DeliveryChallanOutwardList.tsx', target1_b64, repl1_b64)
patch_file('src/components/retail/DeliveryChallanOutwardList.tsx', target2_b64, repl2_b64)
