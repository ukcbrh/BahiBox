import sys

file_path = "/app/applet/src/components/retail/CreateCreditNote.tsx"
with open(file_path, "r") as f:
    content = f.read()

target = """  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedSourceId || includedItems.length === 0 || !currentTenantId || !user || !activeBranchId) {
      toast.error('Please select a customer, source document, and at least one item to return');
      return;
    }"""

replacement = """  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedSourceId || includedItems.length === 0 || !currentTenantId || !user || !activeBranchId) {
      toast.error('Please select a customer, source document, and at least one item to return');
      return;
    }
    const invalidItem = includedItems.find(it => !(parseFloat(it.quantity) > 0));
    if (invalidItem) {
      toast.error(`Please enter a valid quantity (greater than 0) for "${invalidItem.item_name}"`);
      return;
    }"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, "w") as f:
        f.write(new_content)
    print("PATCH APPLIED")
else:
    print("MATCH NOT FOUND")
