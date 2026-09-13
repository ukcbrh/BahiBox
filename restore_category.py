import re

with open("src/components/retail/RetailProductsInventory.tsx", "r") as f:
    text = f.read()

# We need to replace everything from `let error, data;` in handleAddCategory up to `if (error) {`
# with the original handleAddCategory logic.
pattern = r'(const handleAddCategory = async \(e: React\.FormEvent\) => \{\s+e\.preventDefault\(\);\s+if \(!currentTenantId \|\| !newCategory\.category_name\) return;\s+setLoading\(true\);\s+const supabase = getSupabaseClient\(\);\s+if \(!supabase\) return;\s+)let error, data;.*?(\s+if \(error\) \{\s+console\.error\(\'Save failed:\')'

replacement = r"""\1let error, data;
    if (editingCategory) {
      const res = await supabase.from('product_categories').update({
        category_name: newCategory.category_name,
        ...(newCategory.parent_id ? { parent_id: newCategory.parent_id } : {})
      }).eq('id', editingCategory.id).select().single();
      error = res.error;
      data = res.data;
    } else {
      const res = await supabase.from('product_categories').insert({
        tenant_id: currentTenantId,
        category_name: newCategory.category_name,
        ...(newCategory.parent_id ? { parent_id: newCategory.parent_id } : {})
      }).select().single();
      error = res.error;
      data = res.data;
    }
    setLoading(false);
\2"""

text = re.sub(pattern, replacement, text, flags=re.DOTALL)

with open("src/components/retail/RetailProductsInventory.tsx", "w") as f:
    f.write(text)

