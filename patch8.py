import sys
file_path = 'src/components/BranchSettings.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """              <div className="space-y-2">
                <label className="text-sm font-medium">PIN Code</label>
                <Input 
                  value={formData.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                  placeholder="PIN / ZIP code\""""

replacement = """              <div className="space-y-2">
                <label className="text-sm font-medium">PIN Code</label>
                <Input 
                  value={formData.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                  placeholder="PIN / ZIP code"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UPI ID (for bill payments)</label>
                <Input 
                  value={formData.upi_id}
                  onChange={(e) => setFormData({...formData, upi_id: e.target.value})}
                  placeholder="yourname@bank\""""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
