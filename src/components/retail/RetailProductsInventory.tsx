import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Search, AlertCircle, Package } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';

export function RetailProductsInventory() {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // list, categories, low_stock, adjustments

  const fetchProducts = async () => {
    if (!tenant) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('products')
      .select(`*, product_stock(current_quantity, reorder_level)`)
      .eq('tenant_id', tenant.id);
    if (data) setProducts(data);
  };

  const fetchCategories = async () => {
    if (!tenant) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('product_categories')
      .select('*')
      .eq('tenant_id', tenant.id);
    if (data) setCategories(data);
  };

  const fetchUnits = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !tenant) return;
    const { data } = await supabase
      .from('units')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`);
    if (data) setUnits(data);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUnits();
  }, [tenant]);

  const handleDeleteCategory = async (categoryId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    // Deletion safety check
    const { data: checkData, error: checkError } = await supabase.rpc('safe_delete_check', {
      p_parent_table: 'product_categories',
      p_parent_id: categoryId,
      p_child_checks: [{ table: 'products', column: 'category_id' }]
    });
    
    if (checkError) {
      toast.error('Failed to check deletion safety');
      return;
    }
    
    if (!checkData.safe_to_delete) {
      toast.error(`Cannot delete category: it is still referenced by ${checkData.blocking_tables.join(', ')}.`);
      return;
    }
    
    // Proceed with deletion if safe
    if (window.confirm("Are you sure you want to delete this category?")) {
      const { error } = await supabase.from('product_categories').delete().eq('id', categoryId);
      if (error) {
        toast.error('Failed to delete category');
      } else {
        toast.success('Category deleted successfully');
        fetchCategories();
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.includes(searchTerm)) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products & Inventory</h2>
          <p className="text-slate-500">Manage your catalog, categories, and stock levels.</p>
        </div>
        <Button><Plus size={16} className="mr-2" /> Add Product</Button>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        {['list', 'categories', 'low_stock', 'adjustments'].map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <Card className="border-none shadow-sm bg-white">
          <div className="p-4 border-b flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search products..." 
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline"><Package size={16} className="mr-2"/> Bulk Import</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">SKU / Barcode</th>
                  <th className="px-6 py-4">Price (₹)</th>
                  <th className="px-6 py-4">Total Stock</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {filteredProducts.map(p => {
                  const totalStock = p.product_stock?.reduce((sum: number, s: any) => sum + Number(s.current_quantity), 0) || 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{p.product_name}</td>
                      <td className="px-6 py-4">{p.sku || p.barcode || '-'}</td>
                      <td className="px-6 py-4">{p.selling_price}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${totalStock <= 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'low_stock' && (
        <Card className="border-none shadow-sm bg-white p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Low Stock Alerts</h3>
          <p className="text-slate-500 mt-2">Products that have fallen below their reorder level will appear here.</p>
        </Card>
      )}

      {/* Placeholders for categories and adjustments */}
      {(activeTab === 'categories' || activeTab === 'adjustments') && (
        <Card className="border-none shadow-sm bg-white p-8 text-center text-slate-500">
          {activeTab} module functionality placeholder.
        </Card>
      )}
    </div>
  );
}
