import React, { useState, useEffect, useRef } from 'react';
import LabelPrintModal from './LabelPrintModal';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Printer,  Plus, Search, AlertCircle, Package, X, FolderTree, Settings2  } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { tenantScopedKey } from '@/src/lib/tenantStorage';

const COLUMN_LABELS: Record<string, string> = {
  mart_category_id: 'Marketplace Category',
  is_marketplace_listed: 'List on Marketplace',
  sku: 'SKU',
  product_name: 'Product Name',
  purchase_price: 'Purchase Price',
  unit: 'Unit',
  opening_stock: 'Opening Stock',
  barcode: 'Barcode',
  mrp: 'MRP',
  selling_price: 'Selling Price',
  w_sale_price: 'W Sale Price',
  batch: 'Batch',
  mfg_date: 'Mfg Date',
  exp_date: 'Exp Date',
  size: 'Size',
  colour: 'Colour',
  imei1: 'IMEI1',
  imei2: 'IMEI2',
  kitchen: 'Kitchen',
  category_plus: 'Category',
  subcategory_plus: 'Subcategory',
  description: 'Description',
  discount: 'Discount',
  gst_plus: 'GST Manual',
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',
  sales_unit: 'Sales Unit',
  sales_alt_unit: 'Sales Alt Unit',
  conv: 'Conv',
  min_stock: 'Min Stock',
  status: 'Status',
  s_tax: 'S Tax',
  p_tax: 'P Tax',
  g_down: 'G Down',
  rack: 'Rack',
  def_qty: 'Def Qty',
  part_no: 'Part No',
  update_button_column: 'Update ButtonColumn',
  delete_button_column: 'Delete ButtonColumn',
  print_barcode_button: 'Print Barcode Button',
  mark: 'Mark',
  photo: 'Photo',
  hsn_code: 'HSN Code',
  cmb_gst: 'GST'
};

export function RetailProductsInventory() {
  const { currentTenantId, user } = useAuth();
  const [branchIdForAdj, setBranchIdForAdj] = useState<string | null>(null);
  useEffect(() => { const fetchB = async () => { const supabase = getSupabaseClient(); if (!supabase || !currentTenantId) return; const { data } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).eq('module_key', 'retail').limit(1).single(); setBranchIdForAdj(data?.id || null); }; fetchB(); }, [currentTenantId]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [martCategories, setMartCategories] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportResults, setBulkImportResults] = useState<{success: number, failed: {row: number, reason: string}[]} | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showLabelPrint, setShowLabelPrint] = useState(false); // list, categories, low_stock, adjustments
  const manualUploadInputRef = React.useRef<HTMLInputElement>(null);
  const [manualUploadProduct, setManualUploadProduct] = useState<any>(null);
  const [stockCategoryFilter, setStockCategoryFilter] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const DEFAULT_VISIBLE_COLUMNS = {
      sku: true,
      product_name: true,
      purchase_price: true,
      unit: true,
      opening_stock: true,
      barcode: true,
      mrp: true,
      selling_price: true,
      w_sale_price: false,
      batch: true,
      mfg_date: true,
      exp_date: true,
      size: false,
      colour: false,
      imei1: false,
      imei2: false,
      kitchen: false,
      category_plus: true,
      subcategory_plus: true,
      mart_category_id: true,
      is_marketplace_listed: true,
      description: false,
      discount: false,
      gst_plus: false,
      cgst: true,
      sgst: true,
      igst: true,
      sales_unit: false,
      sales_alt_unit: false,
      conv: false,
      min_stock: false,
      status: false,
      s_tax: false,
      p_tax: false,
      g_down: false,
      rack: false,
      def_qty: false,
      part_no: false,
      update_button_column: false,
      delete_button_column: false,
      print_barcode_button: false,
      mark: false,
      photo: false,
      hsn_code: false,
      cmb_gst: true
    };
    const saved = localStorage.getItem(tenantScopedKey('retail_inventory_columns', currentTenantId));
    if (saved) {
      try {
        return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse saved columns', e);
      }
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(tenantScopedKey('retail_inventory_columns', currentTenantId), JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Record<string, string>>({
    product_name: '', sku: '', barcode: '', selling_price: '', purchase_price: '',
    category_id: '', unit_id: '', hsn_sac_id: '', mrp: '', opening_stock: '', reorder_level: '',
    w_sale_price: '', batch: '', mfg_date: '', exp_date: '', size: '', colour: '', imei1: '', imei2: '',
    mart_category_id: '', is_marketplace_listed: 'true',
      kitchen: '', category_plus: '', subcategory_plus: '', description: '', discount: '', gst_plus: '',
    cgst: '', sgst: '', igst: '', sales_unit: '', sales_alt_unit: '', conv: '', min_stock: '', status: '',
    s_tax: '', p_tax: '', g_down: '', rack: '', def_qty: '', part_no: '', update_button_column: '', delete_button_column: '',
    print_barcode_button: '', mark: '', photo: '', hsn_code: '', cmb_gst: ''
  });
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ category_name: '', parent_id: '' });
  
  const [isManagingUnits, setIsManagingUnits] = useState(false);
  const [newUnitData, setNewUnitData] = useState({ unit_name: '', unit_symbol: '' });
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [isManagingGST, setIsManagingGST] = useState(false);
  const [customColumns, setCustomColumns] = useState<any[]>([]);
  const [isManagingColumns, setIsManagingColumns] = useState(false);
  const [newCustomColumnData, setNewCustomColumnData] = useState({ column_name: '', column_label: '' });
  const [editingCustomColumnId, setEditingCustomColumnId] = useState<string | null>(null);

  const [newGstData, setNewGstData] = useState({ unit_name: '', unit_symbol: '' });
  const [editingGstId, setEditingGstId] = useState<string | null>(null);
  
  const [gsts, setGsts] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('products')
      .select(`*, product_stock(current_quantity, reorder_level)`)
      .eq('tenant_id', currentTenantId);
    if (data) setProducts(data);
  };

  const handleAutoFillBarcodes = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: count, error } = await supabase.rpc('auto_generate_missing_barcodes', {
      p_tenant_id: currentTenantId
    });
    if (error) {
      toast.error('Failed to auto-fill barcodes: ' + error.message);
      return;
    }
    if (count === 0) {
      toast.success('All products already have a barcode.');
    } else {
      toast.success(`Generated barcodes for ${count} product(s).`);
    }
    fetchProducts();
  };

  const generateImagesForOneProduct = async (product: any, count: number, session: any, supabase: any) => {
    try {
      const response = await fetch('/api/generate-product-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.product_name,
          tenant_id: currentTenantId,
          count
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate images');
      }

      const result = await response.json();

      const { error: updateErr } = await supabase
        .from('products')
        .update({ photos: result.urls, photo: result.urls[0] })
        .eq('id', product.id);

      if (updateErr) throw new Error(updateErr.message);
      return { success: true, product_name: product.product_name };
    } catch (err: any) {
      return { success: false, product_name: product.product_name, error: err.message };
    }
  };

  const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const product = manualUploadProduct;
    if (!file || !product) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    toast.info('Uploading image...');

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${currentTenantId}/${product.id}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(path, file);

      if (uploadErr) {
        toast.error('Upload failed: ' + uploadErr.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      const newUrl = urlData.publicUrl;
      const existingPhotos = Array.isArray(product.photos) ? product.photos : [];

      const { error: updateErr } = await supabase
        .from('products')
        .update({ photo: newUrl, photos: [...existingPhotos, newUrl] })
        .eq('id', product.id);

      if (updateErr) {
        toast.error('Uploaded but failed to save: ' + updateErr.message);
      } else {
        toast.success('Image uploaded and saved.');
        fetchProducts();
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setManualUploadProduct(null);
      if (manualUploadInputRef.current) manualUploadInputRef.current.value = '';
    }
  };

  const handleGenerateImages = async (product: any) => {
    const countStr = prompt('How many images to find/generate for "' + product.product_name + '"? (1-4)', '2');
    if (!countStr) return;
    const count = Math.min(Math.max(parseInt(countStr) || 1, 1), 4);

    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();

    toast.info('Finding/generating images... this may take a moment.');
    const result = await generateImagesForOneProduct(product, count, session, supabase);
    if (result.success) {
      toast.success(`Images generated and saved for ${result.product_name}.`);
      fetchProducts();
    } else {
      toast.error(`Failed for ${result.product_name}: ${result.error}`);
    }
  };

  const handleBulkGenerateImages = async () => {
    const selectedProducts = products.filter((p: any) => selectedProductIds.includes(p.id));
    if (selectedProducts.length === 0) return;

    const countStr = prompt(`How many images per product for all ${selectedProducts.length} selected product(s)? (1-4)`, '2');
    if (!countStr) return;
    const count = Math.min(Math.max(parseInt(countStr) || 1, 1), 4);

    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();

    toast.info(`Generating images for ${selectedProducts.length} product(s)... this may take a while.`);
    console.log('BULK-GEN: selectedProducts array:', selectedProducts.map(p => p.product_name));

    let successCount = 0;
    const failedProducts: string[] = [];
    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      console.log(`BULK-GEN: starting iteration ${i} for "${product.product_name}"`);
      const result = await generateImagesForOneProduct(product, count, session, supabase);
      console.log(`BULK-GEN: finished iteration ${i} for "${product.product_name}", result:`, result);
      if (result.success) {
        successCount++;
      } else {
        failedProducts.push(result.product_name);
        console.error(`Image generation failed for "${result.product_name}":`, result.error);
      }
      // Small delay between products to avoid hitting Gemini/SerpAPI rate limits
      if (i < selectedProducts.length - 1) {
        console.log(`BULK-GEN: waiting 2s before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log('BULK-GEN: loop finished. successCount =', successCount, 'failedProducts =', failedProducts);

    if (failedProducts.length > 0) {
      toast.error(`Done: ${successCount} succeeded. Failed: ${failedProducts.join(', ')} (see browser console for details).`);
    } else {
      toast.success(`Done: all ${successCount} product(s) updated.`);
    }
    fetchProducts();
  };

  const fetchCategories = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('product_categories')
      .select('*')
      .eq('tenant_id', currentTenantId);
    if (data) setCategories(data);
  };
  const fetchMartCategories = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('mart_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (data) setMartCategories(data);
  };


  const fetchUnits = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { data } = await supabase
      .from('units')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${currentTenantId}`);
    if (data) {
        setUnits(data.filter((u: any) => u.unit_type !== 'gst'));
        setGsts(data.filter((u: any) => u.unit_type === 'gst'));
    }
  };

  const [hsnCodes, setHsnCodes] = useState<any[]>([]);

  const fetchHsnCodes = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;
    const { data } = await supabase
      .from('hsn_sac_master')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${currentTenantId}`);
    if (data) setHsnCodes(data);
  };


  const fetchCustomColumns = async () => {
    if (!currentTenantId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('custom_columns').select('*').eq('tenant_id', currentTenantId).eq('table_name', 'products');
    if (data) {
       setCustomColumns(data);
       data.forEach((c: any) => {
           COLUMN_LABELS[c.column_name] = c.column_label;
       });
       setVisibleColumns((prev: any) => {
           const newVis = { ...prev } as any;
           data.forEach((c: any) => {
               if (newVis[c.column_name] === undefined) {
                   newVis[c.column_name] = true; // default to true when added
               }
           });
           return newVis;
       });
    }
  };
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchMartCategories();
    fetchUnits(); fetchCustomColumns();
    fetchHsnCodes();
  }, [currentTenantId]);

  const [editingProduct, setEditingProduct] = useState<any>(null);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete product: ' + error.message);
    } else {
      toast.success('Product deleted');
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

    const handleDownloadTemplate = () => {
    const headers = ['Product Name*', 'SKU', 'Barcode', 'Category', 'Unit*', 'Purchase Price', 'Selling Price*', 'MRP', 'Opening Stock', 'Description', 'Image URL', 'HSN Code', 'Marketplace Category', 'List on Marketplace (Yes/No)'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'bahibox_product_import_template.xlsx');
  };

  const handleBulkImportFile = async (file: File) => {
    if (!currentTenantId) return;
    setBulkImporting(true);
    setBulkImportResults(null);
    const supabase = getSupabaseClient();
    if (!supabase) { setBulkImporting(false); return; }

    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).eq('module_key', 'retail').limit(1);
    const branchId = branches?.[0]?.id;

    let successCount = 0;
    const failedRows: { row: number, reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;
      const productName = String(r['Product Name*'] || '').trim();
      const unitName = String(r['Unit*'] || '').trim();
      const sellingPriceRaw = r['Selling Price*'];

      if (!productName) { failedRows.push({ row: rowNum, reason: 'Product Name is required' }); continue; }
      if (!unitName) { failedRows.push({ row: rowNum, reason: 'Unit is required' }); continue; }
      const sellingPrice = parseFloat(sellingPriceRaw);
      if (isNaN(sellingPrice)) { failedRows.push({ row: rowNum, reason: 'Selling Price is required and must be a number' }); continue; }

      const matchedUnit = units.find((u: any) => u.unit_name.toLowerCase().trim() === unitName.toLowerCase());
      if (!matchedUnit) { failedRows.push({ row: rowNum, reason: `Unit '${unitName}' not found` }); continue; }

      const categoryName = String(r['Category'] || '').trim();
      const matchedCategory = categoryName ? categories.find((c: any) => c.category_name.toLowerCase().trim() === categoryName.toLowerCase()) : null;

      const martCategoryName = String(r['Marketplace Category'] || '').trim();
      const matchedMartCategory = martCategoryName ? martCategories.find((c: any) => c.category_name.toLowerCase().trim() === martCategoryName.toLowerCase()) : null;

      const listedRaw = String(r['List on Marketplace (Yes/No)'] || '').trim().toLowerCase();
      const isListed = listedRaw === 'no' ? false : true;

      const payload: any = {
        tenant_id: currentTenantId,
        product_name: productName,
        sku: String(r['SKU'] || '').trim() || null,
        barcode: String(r['Barcode'] || '').trim() || null,
        category_id: matchedCategory ? matchedCategory.id : null,
        unit_id: matchedUnit.id,
        purchase_price: parseFloat(r['Purchase Price']) || 0,
        selling_price: sellingPrice,
        mrp: r['MRP'] ? parseFloat(r['MRP']) : null,
        description: String(r['Description'] || '').trim() || null,
        photo: String(r['Image URL'] || '').trim() || null,
        hsn_code: String(r['HSN Code'] || '').trim() || null,
        mart_category_id: matchedMartCategory ? matchedMartCategory.id : null,
        is_marketplace_listed: isListed
      };

      const { data: inserted, error: insertError } = await supabase.from('products').insert(payload).select().single();
      if (insertError) { failedRows.push({ row: rowNum, reason: insertError.message }); continue; }

      const openingQty = parseFloat(r['Opening Stock']) || 0;
      if (openingQty > 0 && branchId) {
        await supabase.rpc('adjust_stock', {
          p_product_id: inserted.id,
          p_branch_id: branchId,
          p_movement_type: 'adjustment_in',
          p_quantity: openingQty,
          p_reference_type: 'opening_stock',
          p_reference_id: null,
          p_notes: 'Opening stock via bulk import',
          p_created_by: null
        });
      }

      successCount++;
    }

    setBulkImportResults({ success: successCount, failed: failedRows });
    setBulkImporting(false);
    fetchProducts();
  };

  const handlePhotoUpload = async (file: File) => {
    if (!currentTenantId || !file) return;
    setUploadingPhoto(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setUploadingPhoto(false); return; }
    const filePath = `${currentTenantId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);
    if (uploadError) {
      toast.error(`Photo upload failed: ${uploadError.message}`);
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    setNewProduct(prev => ({ ...prev, photo: urlData.publicUrl }));
    setUploadingPhoto(false);
  };

  const handleEditProduct = (p: any) => {
    setEditingProduct(p);
    setNewProduct({
      product_name: p.product_name || '',
      category_id: p.category_id || '',
      unit_id: p.unit_id || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      selling_price: p.selling_price || '',
      purchase_price: p.purchase_price || '',
      tax_rate_id: p.tax_rate_id || '',
      hsn_code: p.hsn_code || '',
      opening_stock: '', 
      reorder_level: p.reorder_level || '',
      w_sale_price: p.w_sale_price || '', batch: p.batch || '', mfg_date: p.mfg_date || '', exp_date: p.exp_date || '', size: '', colour: '', imei1: '', imei2: '',
      mart_category_id: p.mart_category_id || '', is_marketplace_listed: p.is_marketplace_listed === false ? 'false' : 'true',
      kitchen: '', category_plus: '', subcategory_plus: '', description: '', discount: '', gst_plus: '',
      cgst: '', sgst: '', igst: '', sales_unit: '', sales_alt_unit: '', conv: '', min_stock: '', status: '',
      s_tax: '', p_tax: '', g_down: '', rack: '', def_qty: '', part_no: '', update_button_column: '', delete_button_column: '',
      print_barcode_button: '', mark: '', photo: '', cmb_gst: '', ...(p.custom_attributes || {})
    });
    setIsAddingProduct(true);
  };

  const isSubmittingRef = useRef(false);
  const handleAddProduct = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!currentTenantId || !newProduct.product_name || !newProduct.unit_id) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    let error, data;
    
    const standardKeys = ['product_name', 'sku', 'barcode', 'selling_price', 'purchase_price', 'category_id', 'unit_id', 'hsn_sac_id', 'mrp', 'opening_stock', 'reorder_level', 'w_sale_price', 'batch', 'mfg_date', 'exp_date', 'size', 'colour', 'imei1', 'imei2', 'kitchen', 'category_plus', 'subcategory_plus', 'description', 'discount', 'gst_plus', 'cgst', 'sgst', 'igst', 'sales_unit', 'sales_alt_unit', 'conv', 'min_stock', 'status', 's_tax', 'p_tax', 'g_down', 'rack', 'def_qty', 'part_no', 'update_button_column', 'delete_button_column', 'print_barcode_button', 'mark', 'photo', 'hsn_code', 'cmb_gst'];
    
    const payload: any = {
        tenant_id: currentTenantId,
        product_name: newProduct.product_name,
        mart_category_id: newProduct.mart_category_id || null,
        is_marketplace_listed: newProduct.is_marketplace_listed !== 'false',
        category_id: newProduct.category_id || null,
        unit_id: newProduct.unit_id,
        sku: newProduct.sku || null,
        barcode: newProduct.barcode || null,
        selling_price: parseFloat(newProduct.selling_price) || 0,
        purchase_price: parseFloat(newProduct.purchase_price) || 0,
        w_sale_price: newProduct.w_sale_price ? parseFloat(newProduct.w_sale_price) : null,
        batch: newProduct.batch || null,
        mfg_date: newProduct.mfg_date || null,
        exp_date: newProduct.exp_date || null,
        size: newProduct.size || null,
        colour: newProduct.colour || null,
        imei1: newProduct.imei1 || null,
        imei2: newProduct.imei2 || null,
        kitchen: newProduct.kitchen || null,
        category_plus: newProduct.category_plus || null,
        subcategory_plus: newProduct.subcategory_plus || null,
        description: newProduct.description || null,
        discount: newProduct.discount ? parseFloat(newProduct.discount) : null,
        gst_plus: newProduct.gst_plus || null,
        cgst: newProduct.cgst ? parseFloat(newProduct.cgst) : null,
        sgst: newProduct.sgst ? parseFloat(newProduct.sgst) : null,
        igst: newProduct.igst ? parseFloat(newProduct.igst) : null,
        sales_unit: newProduct.sales_unit || null,
        sales_alt_unit: newProduct.sales_alt_unit || null,
        conv: newProduct.conv ? parseFloat(newProduct.conv) : null,
        min_stock: newProduct.min_stock ? parseFloat(newProduct.min_stock) : null,
        status: newProduct.status || null,
        s_tax: newProduct.s_tax ? parseFloat(newProduct.s_tax) : null,
        p_tax: newProduct.p_tax ? parseFloat(newProduct.p_tax) : null,
        g_down: newProduct.g_down || null,
        rack: newProduct.rack || null,
        def_qty: newProduct.def_qty ? parseFloat(newProduct.def_qty) : null,
        part_no: newProduct.part_no || null,
        update_button_column: newProduct.update_button_column || null,
        delete_button_column: newProduct.delete_button_column || null,
        print_barcode_button: newProduct.print_barcode_button || null,
        mark: newProduct.mark || null,
        photo: newProduct.photo || null,
        hsn_code: newProduct.hsn_code || null,
        cmb_gst: newProduct.cmb_gst || null,
        hsn_sac_id: newProduct.hsn_sac_id || null,
        mrp: newProduct.mrp ? parseFloat(newProduct.mrp) : null
    };

    const customAttributes: any = {};
    for (const key in newProduct) {
       if (!standardKeys.includes(key)) {
           customAttributes[key] = newProduct[key];
       }
    }
    payload.custom_attributes = customAttributes;

    if (editingProduct) {
      const res = await supabase.from('products').update(payload).eq('id', editingProduct.id).select().single();
      error = res.error;
      data = res.data;
    } else {
      const res = await supabase.from('products').insert(payload).select().single();
      error = res.error;
      data = res.data;
    }

    if (error) {
      console.error('Save failed:', error);
      toast.error(`Failed to save: ${error.message}`);
      setLoading(false);
      return;
    }

    // Record opening stock + reorder level if provided (best-effort; product is already saved)
    const openingQty = parseFloat(newProduct.opening_stock) || 0;
    const reorderLvl = parseFloat(newProduct.reorder_level) || 0;

    if (openingQty > 0 || reorderLvl > 0) {
      const { data: branches } = await supabase.from('branches').select('id').eq('tenant_id', currentTenantId).eq('module_key', 'retail').limit(1);
      const branchId = branches?.[0]?.id;

      if (branchId) {
        if (openingQty > 0) {
          const { error: stockError } = await supabase.rpc('adjust_stock', {
            p_product_id: data.id,
            p_branch_id: branchId,
            p_movement_type: 'adjustment_in',
            p_quantity: openingQty,
            p_reference_type: 'opening_stock',
            p_reference_id: null,
            p_notes: 'Opening stock on product creation',
            p_created_by: null
          });
          if (stockError) console.error('Opening stock failed:', stockError);
        } else {
          // Ensure a product_stock row exists even with 0 opening qty, so reorder_level has somewhere to go
          await supabase.from('product_stock').upsert({ product_id: data.id, branch_id: branchId, current_quantity: 0 }, { onConflict: 'product_id,branch_id' });
        }

        if (reorderLvl > 0) {
          const { error: reorderError } = await supabase
            .from('product_stock')
            .update({ reorder_level: reorderLvl })
            .eq('product_id', data.id)
            .eq('branch_id', branchId);
          if (reorderError) console.error('Reorder level update failed:', reorderError);
        }
      } else {
        toast.error('Product saved, but no branch found — stock could not be set. Run Patch #19 first.');
      }
    }

    setLoading(false);
    isSubmittingRef.current = false;
    toast.success('Product added successfully');
    fetchProducts();
    setIsAddingProduct(false);
      setEditingProduct(null);
    setNewProduct({
      product_name: '', sku: '', barcode: '', selling_price: '', purchase_price: '',
      category_id: '', unit_id: '', hsn_sac_id: '', mrp: '', opening_stock: '', reorder_level: '',
      w_sale_price: '', batch: '', mfg_date: '', exp_date: '', size: '', colour: '', imei1: '', imei2: '',
      mart_category_id: '', is_marketplace_listed: 'true',
      kitchen: '', category_plus: '', subcategory_plus: '', description: '', discount: '', gst_plus: '',
      cgst: '', sgst: '', igst: '', sales_unit: '', sales_alt_unit: '', conv: '', min_stock: '', status: '',
      s_tax: '', p_tax: '', g_down: '', rack: '', def_qty: '', part_no: '', update_button_column: '', delete_button_column: '',
      print_barcode_button: '', mark: '', photo: '', hsn_code: '', cmb_gst: ''
    });
  };


  const handleSaveUnit = async () => {
    if (!newUnitData.unit_name) return toast.error('Name is required');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    
    if (editingUnitId) {
      const { error } = await supabase.from('units').update({
        unit_name: newUnitData.unit_name,
        unit_symbol: newUnitData.unit_symbol || newUnitData.unit_name
      }).eq('id', editingUnitId);
      if (error) toast.error(error.message);
      else { toast.success('Unit updated'); fetchUnits(); setNewUnitData({unit_name:'', unit_symbol:''}); setEditingUnitId(null); }
    } else {
      const { error } = await supabase.from('units').insert({
        tenant_id: currentTenantId,
        unit_name: newUnitData.unit_name,
        unit_symbol: newUnitData.unit_symbol || newUnitData.unit_name,
        unit_type: 'weight'
      });
      if (error) toast.error(error.message);
      else { toast.success('Unit added'); fetchUnits(); setNewUnitData({unit_name:'', unit_symbol:''}); }
    }
    setLoading(false);
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Delete this unit?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Unit deleted'); fetchUnits(); }
  };

  const handleSaveGst = async () => {
    if (!newGstData.unit_name) return toast.error('Name is required');
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    
    if (editingGstId) {
      const { error } = await supabase.from('units').update({
        unit_name: newGstData.unit_name,
        unit_symbol: newGstData.unit_symbol || newGstData.unit_name
      }).eq('id', editingGstId);
      if (error) toast.error(error.message);
      else { toast.success('GST updated'); fetchUnits(); setNewGstData({unit_name:'', unit_symbol:''}); setEditingGstId(null); }
    } else {
      const { error } = await supabase.from('units').insert({
        tenant_id: currentTenantId,
        unit_name: newGstData.unit_name,
        unit_symbol: newGstData.unit_symbol || newGstData.unit_name,
        unit_type: 'gst'
      });
      if (error) toast.error(error.message);
      else { toast.success('GST added'); fetchUnits(); setNewGstData({unit_name:'', unit_symbol:''}); }
    }
    setLoading(false);
  };

  const handleDeleteGst = async (id: string) => {
    if (!confirm('Delete this GST?')) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('GST deleted'); fetchUnits(); }
  };

  {/* Modals string replace target below */}

  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  const handleEditCategory = (c: any) => {
    setEditingCategory(c);
    setNewCategory({ category_name: c.category_name, parent_id: c.parent_id || '' });
    setIsAddingCategory(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newCategory.category_name) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    
    let error, data;
    if (editingCategory) {
      const res = await supabase.from('product_categories').update({
        category_name: newCategory.category_name,
        ...(newCategory.parent_id ? { parent_category_id: newCategory.parent_id } : {})
      }).eq('id', editingCategory.id).select().single();
      error = res.error;
      data = res.data;
    } else {
      const res = await supabase.from('product_categories').insert({
        tenant_id: currentTenantId,
        category_name: newCategory.category_name,
        ...(newCategory.parent_id ? { parent_category_id: newCategory.parent_id } : {})
      }).select().single();
      error = res.error;
      data = res.data;
    }
    setLoading(false);


    if (error) {
      console.error('Save failed:', error);
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success('Category created successfully');
      if (editingCategory) {
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...data } : c));
      } else {
        setCategories(prev => [...prev, data]);
      }
      setIsAddingCategory(false);
      setEditingCategory(null);
      setNewCategory({ category_name: '', parent_id: '' });
    }
  };

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
      console.error('Save failed:', checkError);
      toast.error(`Failed to save: ${checkError.message}`);
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
        console.error('Save failed:', error);
        toast.error(`Failed to save: ${error.message}`);
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

  const renderInputForCol = (col: string, isEditing: boolean) => {
    const commonClasses = "w-full bg-transparent px-4 py-2 outline-none focus:bg-red-600 focus:text-white min-w-[100px]";
    const placeholderClass = isEditing ? "" : " placeholder:text-slate-500 dark:text-slate-400";
    const numClasses = commonClasses + " text-right" + placeholderClass;
    const textClasses = commonClasses + placeholderClass;

    const value = (newProduct as any)[col] || '';
    const handleChange = (e: any) => setNewProduct(prev => ({ ...prev, [col]: e.target.value }));
    const handleKeyDown = (e: any) => { if(e.key === 'Enter') handleAddProduct(); };

    if (col === 'unit' || col === 'sales_unit' || col === 'sales_alt_unit') { 
       return (
         <div className="flex bg-transparent w-full">
           <select className={commonClasses + " appearance-none text-slate-300 !min-w-[100px]"} value={col === 'unit' ? newProduct.unit_id : value} onChange={col === 'unit' ? e => setNewProduct({...newProduct, unit_id: e.target.value}) : handleChange}><option value="" className="text-slate-900 dark:text-slate-100">Unit...</option>{units.map(u => <option key={u.id} value={u.id} className="text-slate-900 dark:text-slate-100">{u.unit_name}</option>)}</select>
           <button className="bg-slate-700 hover:bg-slate-600 px-2 flex items-center justify-center text-white border-l border-slate-600" onClick={() => setIsManagingUnits(true)} type="button"><Settings2 size={14}/></button>
         </div>
       );
    }
    if (col === 'category_plus' || col === 'subcategory_plus') {
       return (
         <div className="flex bg-transparent w-full">
           <select className={commonClasses + " appearance-none text-slate-300 !min-w-[120px]"} value={col === 'category_plus' ? newProduct.category_id : value} onChange={col === 'category_plus' ? e => setNewProduct({...newProduct, category_id: e.target.value}) : handleChange}><option value="" className="text-slate-900 dark:text-slate-100">Select...</option>{categories.map(c => <option key={c.id} value={c.id} className="text-slate-900 dark:text-slate-100">{c.category_name}</option>)}</select>
           <button className="bg-slate-700 hover:bg-slate-600 px-2 flex items-center justify-center text-white border-l border-slate-600" onClick={() => setIsAddingCategory(true)} type="button"><Plus size={14}/></button>
         </div>
       );
    }
    if (col === 'mfg_date' || col === 'exp_date') {
      return <input type="date" className={textClasses} value={value} onChange={handleChange} onKeyDown={handleKeyDown} />;
    }
    if (col === 'opening_stock') {
      return <input type="number" className={numClasses} value={newProduct.opening_stock} onChange={e => setNewProduct({...newProduct, opening_stock: e.target.value})} onKeyDown={handleKeyDown} />;
    }
    if (col === 'product_name') {
      return <input className={textClasses + " min-w-[150px]"} value={newProduct.product_name} onChange={e => setNewProduct({...newProduct, product_name: e.target.value})} onKeyDown={handleKeyDown} />;
    }
    if (col === 'cmb_gst') { return ( <div className="flex bg-transparent w-full"> <select className={commonClasses + " appearance-none text-slate-300 !min-w-[100px]"} value={newProduct.cmb_gst || ''} onChange={e => {
  const selectedGstName = e.target.value;
  const selectedGst = gsts.find(g => g.unit_name === selectedGstName);
  let cgst = newProduct.cgst, sgst = newProduct.sgst, igst = newProduct.igst;
  if (selectedGst && selectedGst.unit_symbol) {
    const gstVal = parseFloat(selectedGst.unit_symbol);
    if (!isNaN(gstVal)) {
      igst = gstVal.toString();
      cgst = (gstVal / 2).toString();
      sgst = (gstVal / 2).toString();
    }
  }
  setNewProduct({...newProduct, cmb_gst: selectedGstName, cgst, sgst, igst});
}}><option value="" className="text-slate-900 dark:text-slate-100">Select GST...</option>{gsts.map(g => <option key={g.id} value={g.unit_name} className="text-slate-900 dark:text-slate-100">{g.unit_name}</option>)}</select> <button className="bg-slate-700 hover:bg-slate-600 px-2 flex items-center justify-center text-white border-l border-slate-600" onClick={() => setIsManagingGST(true)} type="button"><Settings2 size={14}/></button> </div> ); }
    if (col === 'sku' || col === 'barcode' || col === 'batch' || col === 'size' || col === 'colour' || col === 'imei1' || col === 'imei2' || col === 'kitchen' || col === 'description' || col === 'status' || col === 'g_down' || col === 'rack' || col === 'part_no' || col === 'mark' || col === 'hsn_code' ) {
      return <input type="text" className={textClasses} value={col === 'sku' ? newProduct.sku : col === 'barcode' ? newProduct.barcode : col === 'hsn_code' ? newProduct.hsn_code : value} onChange={col === 'sku' ? e => setNewProduct({...newProduct, sku: e.target.value}) : col === 'barcode' ? e => setNewProduct({...newProduct, barcode: e.target.value}) : col === 'hsn_code' ? e => setNewProduct({...newProduct, hsn_code: e.target.value}) : handleChange} onKeyDown={handleKeyDown} />;
    }
    
    if (col === 'photo') {
      return (
        <div className="px-2 py-1 flex items-center gap-2">
          {newProduct.photo ? (
            <img src={newProduct.photo} alt="preview" className="w-8 h-8 rounded object-cover" />
          ) : null}
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            id="photo-upload-input"
            onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }}
          />
          <label 
            htmlFor="photo-upload-input" 
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded cursor-pointer"
          >
            {uploadingPhoto ? 'Uploading...' : newProduct.photo ? 'Change' : 'Upload'}
          </label>
        </div>
      );
    }

    if (col === 'mart_category_id') {
      return (
        <select className={commonClasses + " appearance-none text-slate-300 !min-w-[140px]"} value={newProduct.mart_category_id} onChange={e => setNewProduct({...newProduct, mart_category_id: e.target.value})}>
          <option value="" className="text-slate-900 dark:text-slate-100">Select...</option>
          {martCategories.map(c => <option key={c.id} value={c.id} className="text-slate-900 dark:text-slate-100">{c.category_name}</option>)}
        </select>
      );
    }

    if (col === 'is_marketplace_listed') {
      return (
        <div className="px-3 py-2 flex justify-center">
          <input 
            type="checkbox" 
            checked={newProduct.is_marketplace_listed === 'true'} 
            onChange={e => setNewProduct({...newProduct, is_marketplace_listed: e.target.checked ? 'true' : 'false'})}
          />
        </div>
      );
    }

    if (col === 'update_button_column' || col === 'delete_button_column' || col === 'print_barcode_button') {
      return <div className="px-3 py-2 text-center text-xs text-slate-500 dark:text-slate-400">-</div>;
    }
    
    if (col === 's_tax' || col === 'p_tax') {
      return (
        <select className={commonClasses + " appearance-none text-slate-300 min-w-[100px]"} value={value} onChange={handleChange} onKeyDown={handleKeyDown}>
          <option value="" className="text-slate-900 dark:text-slate-100">Select...</option>
          <option value="1" className="text-slate-900 dark:text-slate-100">Inclusive</option>
          <option value="0" className="text-slate-900 dark:text-slate-100">Exclusive</option>
        </select>
      );
    }
    // numeric inputs
    if (col === 'purchase_price') return <input type="number" className={numClasses} value={newProduct.purchase_price} onChange={e => setNewProduct({...newProduct, purchase_price: e.target.value})} onKeyDown={handleKeyDown} />;
    if (col === 'mrp') return <input type="number" className={numClasses} value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} onKeyDown={handleKeyDown} />;
    if (col === 'selling_price') return <input type="number" className={numClasses} value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: e.target.value})} onKeyDown={handleKeyDown} />;

    return <input type="number" className={numClasses} value={value} onChange={handleChange} onKeyDown={handleKeyDown} />;
  };

  return (
    <div className="space-y-6 relative">
      {/* Inline product adding replaces the modal */}

      {isAddingCategory && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center -m-6 p-6">
          <Card className="w-full max-w-sm shadow-xl border-none">
            <CardHeader className="flex flex-row items-center justify-between border-b p-6">
              <CardTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }}><X size={18} /></Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category Name <span className="text-red-500">*</span></label>
                  <Input required value={newCategory.category_name} onChange={e => setNewCategory({...newCategory, category_name: e.target.value})} placeholder="E.g. Electronics, Clothing" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent Category (Optional)</label>
                  <select 
                    className="w-full flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 dark:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newCategory.parent_id}
                    onChange={e => setNewCategory({...newCategory, parent_id: e.target.value})}
                  >
                    <option value="">None (Top Level)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }}>Cancel</Button>
                  <Button type="submit" disabled={loading || !newCategory.category_name}>{editingCategory ? 'Save Category' : 'Create Category'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Products & Inventory</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your catalog, categories, and stock levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => setIsAddingProduct(true)}>
            <Plus size={16} /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg mb-6 w-full justify-between items-center">
        <div className="flex gap-2">
          {['list', 'low_stock', 'adjustments'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t ? 'bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-2 items-center relative">
          <Button variant="outline" size="sm" onClick={() => setShowColumnSettings(!showColumnSettings)} className="h-9 gap-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950">
            <Settings2 size={14} /> Columns
          </Button>
          {showColumnSettings && (
            <div className="absolute top-12 left-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg p-4 z-50 min-w-[200px]">
              <h4 className="font-medium text-sm mb-3 text-slate-900 dark:text-slate-100">Visible Columns</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 dark:border-slate-700"
                      checked={visibleColumns[col as keyof typeof visibleColumns]}
                      onChange={() => setVisibleColumns((prev: any) => ({ ...prev, [col]: !prev[col as keyof typeof visibleColumns] }))}
                    />
                    {COLUMN_LABELS[col]}
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <Button variant="outline" size="sm" onClick={() => setActiveTab('categories')} className="h-9 gap-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950">
            <FolderTree size={14} /> Categories
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsManagingUnits(true)} className="h-9 gap-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950">
            <Settings2 size={14} /> Units
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsManagingGST(true)} className="h-9 gap-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950">
            <Settings2 size={14} /> GST
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsManagingColumns(true)} className="h-9 gap-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950">
            <Settings2 size={14} /> Custom Columns
          </Button>

        </div>
      </div>

      {activeTab === 'list' && (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
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
            <div className="flex gap-2">
              {selectedProductIds.length > 0 && (
                <Button variant="outline" className="gap-2 bg-white dark:bg-slate-950" onClick={() => setShowLabelPrint(true)}>
                  <Printer size={16} /> Print Labels ({selectedProductIds.length})
                </Button>
              )}
              {selectedProductIds.length > 0 && (
                <Button variant="outline" className="gap-2 bg-white dark:bg-slate-950" onClick={handleBulkGenerateImages}>
                  Generate Images ({selectedProductIds.length})
                </Button>
              )}
              <Button variant="outline" className="gap-2 bg-white dark:bg-slate-950" onClick={handleAutoFillBarcodes}>
                Auto-Fill Missing Barcodes
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImport(true)}><Package size={16} className="mr-2"/> Bulk Import</Button>
            </div>
          </div>
          <div className="overflow-auto max-h-[calc(100vh-280px)] border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-[#e4eec4] dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b text-xs border-r border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-2 py-2 border-r border-white w-8">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                      onChange={(e) => setSelectedProductIds(e.target.checked ? filteredProducts.map((p: any) => p.id) : [])}
                    />
                  </th>
                  {Object.keys(visibleColumns).map(col => (
                    visibleColumns[col as keyof typeof visibleColumns] && (
                      <th key={col} className="px-4 py-2 border-r border-white whitespace-nowrap">{COLUMN_LABELS[col]}</th>
                    )
                  ))}
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700 dark:text-slate-300">
                {filteredProducts.map(p => {
                  const totalStock = p.product_stock?.reduce((sum: number, s: any) => sum + Number(s.current_quantity), 0) || 0;
                  
                  if (editingProduct?.id === p.id) {
                    return (
                      <tr key={p.id} className="bg-slate-900 text-white">
                        <td className="px-2 py-2 border-r border-slate-700 text-center">
                          <input type="checkbox" checked={selectedProductIds.includes(p.id)} readOnly className="opacity-50" />
                        </td>
                        {Object.keys(visibleColumns).map(col => {
                          if (!visibleColumns[col as keyof typeof visibleColumns]) return null;
                          return <td key={col} className="p-0 border-r border-slate-700">{renderInputForCol(col, true)}</td>;
                        })}
                        <td className="p-1 flex gap-1 justify-end">
                          <Button size="sm" onClick={handleAddProduct} disabled={loading || !newProduct.product_name || !newProduct.unit_id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:bg-slate-700 h-7 text-xs px-2">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-white hover:bg-slate-800 h-7 text-xs px-2">Cancel</Button>
                        </td>
                      </tr>
                    );
                  }

                  const unitName = units.find(u => u.id === p.unit_id)?.unit_symbol || '-';

                  return (
                    <tr key={p.id} className="hover:bg-[#fcfdec] dark:hover:bg-slate-800 transition-colors bg-[#fdfaf1] dark:bg-slate-900">
                      <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={(e) => {
                            setSelectedProductIds(prev =>
                              e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                            );
                          }}
                        />
                      </td>
                      {Object.keys(visibleColumns).map(col => {
                        if (!visibleColumns[col as keyof typeof visibleColumns]) return null;
                        if (col === 'sku') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{p.sku || '-'}</td>;
                        if (col === 'product_name') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 whitespace-nowrap">{p.product_name}</td>;
                        if (col === 'purchase_price') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.purchase_price ? Number(p.purchase_price).toFixed(2) : '-'}</td>;
                        if (col === 'unit') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">{unitName}</td>;
                        if (col === 'opening_stock') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{Number(totalStock).toFixed(3)}</td>;
                        if (col === 'barcode') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.barcode || '-'}</td>;
                        if (col === 'mrp') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.mrp ? Number(p.mrp).toFixed(2) : '-'}</td>;
                        if (col === 'selling_price') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.selling_price ? Number(p.selling_price).toFixed(2) : '-'}</td>;
                        if (col === 'w_sale_price') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.w_sale_price ? Number(p.w_sale_price).toFixed(2) : '-'}</td>;
                        if (col === 'batch') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.batch || '-'}</td>;
                        if (col === 'mfg_date') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.mfg_date ? new Date(p.mfg_date).toLocaleDateString() : '-'}</td>;
                        if (col === 'exp_date') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.exp_date ? new Date(p.exp_date).toLocaleDateString() : '-'}</td>;
                        if (col === 'size') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.size || '-'}</td>;
                        if (col === 'colour') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.colour || '-'}</td>;
                        if (col === 'imei1') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.imei1 || '-'}</td>;
                        if (col === 'imei2') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.imei2 || '-'}</td>;
                        if (col === 'kitchen') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.kitchen || '-'}</td>;
                        if (col === 'category_plus') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{categories.find(c => c.id === p.category_id)?.category_name || '-'}</td>;
                        if (col === 'subcategory_plus') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.subcategory_plus || '-'}</td>;
                        if (col === 'description') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.description || '-'}</td>;
                        if (col === 'discount') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.discount ? Number(p.discount).toFixed(2) : '-'}</td>;
                        if (col === 'gst_plus') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.gst_plus || '-'}</td>;
                        if (col === 'cgst') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.cgst ? Number(p.cgst).toFixed(2) + '%' : '-'}</td>;
                        if (col === 'sgst') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.sgst ? Number(p.sgst).toFixed(2) + '%' : '-'}</td>;
                        if (col === 'igst') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.igst ? Number(p.igst).toFixed(2) + '%' : '-'}</td>;
                        if (col === 'sales_unit') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.sales_unit || '-'}</td>;
                        if (col === 'sales_alt_unit') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.sales_alt_unit || '-'}</td>;
                        if (col === 'conv') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.conv ? Number(p.conv).toFixed(2) : '-'}</td>;
                        if (col === 'min_stock') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.min_stock ? Number(p.min_stock).toFixed(2) : '-'}</td>;
                        if (col === 'status') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.status || '-'}</td>;
                        if (col === 's_tax') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.s_tax === 1 || p.s_tax === '1' ? 'Inclusive' : p.s_tax === 0 || p.s_tax === '0' ? 'Exclusive' : '-'}</td>;
                        if (col === 'p_tax') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.p_tax === 1 || p.p_tax === '1' ? 'Inclusive' : p.p_tax === 0 || p.p_tax === '0' ? 'Exclusive' : '-'}</td>;
                        if (col === 'g_down') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.g_down || '-'}</td>;
                        if (col === 'rack') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.rack || '-'}</td>;
                        if (col === 'def_qty') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">{p.def_qty ? Number(p.def_qty).toFixed(2) : '-'}</td>;
                        if (col === 'part_no') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.part_no || '-'}</td>;
                        if (col === 'update_button_column') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.update_button_column || '-'}</td>;
                        if (col === 'delete_button_column') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.delete_button_column || '-'}</td>;
                        if (col === 'print_barcode_button') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.print_barcode_button || '-'}</td>;
                        if (col === 'mark') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.mark || '-'}</td>;
                        if (col === 'photo') return (
                          <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt={p.product_name}
                                className="w-10 h-10 object-cover rounded border border-slate-200 dark:border-slate-700"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : '-'}
                          </td>
                        );
                        if (col === 'hsn_code') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.hsn_code || '-'}</td>;
                        if (col === 'cmb_gst') return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.cmb_gst || '-'}</td>;
                        
                        let cellValue = p[col];
                        if (cellValue === undefined && p.custom_attributes) {
                           cellValue = p.custom_attributes[col];
                        }
                        return <td key={col} className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">{cellValue || '-'}</td>;

                      })}
                      <td className="px-2 py-2 flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700" onClick={() => { setManualUploadProduct(p); setTimeout(() => manualUploadInputRef.current?.click(), 0); }} title="Upload Product Image">Image Upload</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700" onClick={() => handleEditProduct(p)}>Edit</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteProduct(p.id)}>Delete</Button>
                      </td>
                    </tr>
                  );
                })}
                
                {isAddingProduct && !editingProduct && (
                  <tr className="bg-slate-900 text-white">
                    <td className="p-1 border-r border-slate-700"></td>
                    {Object.keys(visibleColumns).map(col => {
                      if (!visibleColumns[col as keyof typeof visibleColumns]) return null;
                      return <td key={col} className="p-0 border-r border-slate-700">{renderInputForCol(col, false)}</td>;
                    })}
                    <td className="p-1 flex gap-1 justify-end">
                      <Button size="sm" onClick={handleAddProduct} disabled={loading || !newProduct.product_name || !newProduct.unit_id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:bg-slate-700 h-7 text-xs px-2">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-white hover:bg-slate-800 h-7 text-xs px-2">Cancel</Button>
                    </td>
                  </tr>
                )}
                
                {filteredProducts.length === 0 && !isAddingProduct && (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No products found. Click "Add Product" to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'categories' && (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
          <div className="p-4 border-b flex justify-between items-center">
            <CardTitle className="text-lg">Product Categories (Groups)</CardTitle>
            <Button size="sm" onClick={() => setIsAddingCategory(true)}><Plus size={16} className="mr-2" /> Add Category</Button>
          </div>
          <div className="p-0">
            {categories.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <FolderTree className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p>No categories found. Create a category to organize your products.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b">
                  <tr>
                    <th className="px-6 py-4">Category Name</th>
                    <th className="px-6 py-4">Parent Category</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 dark:text-slate-300">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{c.category_name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {categories.find(parent => parent.id === c.parent_id)?.category_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCategory(c)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteCategory(c.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'low_stock' && (
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <select value={stockCategoryFilter} onChange={(e) => setStockCategoryFilter(e.target.value)} className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                <option value="">All Categories</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
            <CardContent className="p-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-500" /> Low Stock Products</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Products at or below their reorder level.</p>
              {(() => {
                const lowStockProducts = products.filter((p: any) => {
                  if (stockCategoryFilter && p.category_id !== stockCategoryFilter) return false;
                  const stock = p.product_stock?.[0];
                  if (!stock) return false;
                  return stock.current_quantity <= (stock.reorder_level || 0);
                });
                return lowStockProducts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No low stock products right now.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Product</th>
                        <th className="px-3 py-2 font-semibold text-right">Current Stock</th>
                        <th className="px-3 py-2 font-semibold text-right">Reorder Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lowStockProducts.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{p.product_name}</td>
                          <td className="px-3 py-2 text-right font-bold text-red-600">{p.product_stock?.[0]?.current_quantity ?? 0}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{p.product_stock?.[0]?.reorder_level ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-500" /> Expiring Soon</h3>
                <select value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm">
                  <option value="7">Next 7 days</option>
                  <option value="15">Next 15 days</option>
                  <option value="30">Next 30 days</option>
                  <option value="60">Next 60 days</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Products with an expiry date set, expiring within the selected window.</p>
              {(() => {
                const today = new Date();
                const cutoff = new Date();
                cutoff.setDate(today.getDate() + parseInt(expiryDays));
                const expiringProducts = products.filter((p: any) => {
                  if (stockCategoryFilter && p.category_id !== stockCategoryFilter) return false;
                  if (!p.expiry_date) return false;
                  const expDate = new Date(p.expiry_date);
                  return expDate <= cutoff;
                }).sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
                return expiringProducts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No products expiring in this window.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Product</th>
                        <th className="px-3 py-2 font-semibold">Expiry Date</th>
                        <th className="px-3 py-2 font-semibold text-right">Current Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {expiringProducts.map((p: any) => {
                        const expDate = new Date(p.expiry_date);
                        const isPast = expDate < today;
                        return (
                          <tr key={p.id}>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{p.product_name}</td>
                            <td className={"px-3 py-2 " + (isPast ? "text-red-600 font-bold" : "text-amber-600")}>{p.expiry_date}{isPast ? ' (Expired)' : ''}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{p.product_stock?.[0]?.current_quantity ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'adjustments' && (
        <StockAdjustmentContent currentTenantId={currentTenantId} products={products} branchId={branchIdForAdj} currentUser={user} />
      )}
    
      {isManagingUnits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Manage Units</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsManagingUnits(false); setEditingUnitId(null); setNewUnitData({unit_name:'', unit_symbol:''}); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input placeholder="Unit Name (e.g. Box)" value={newUnitData.unit_name} onChange={e => setNewUnitData({...newUnitData, unit_name: e.target.value})} />
                <Input placeholder="Symbol (e.g. bx)" value={newUnitData.unit_symbol} onChange={e => setNewUnitData({...newUnitData, unit_symbol: e.target.value})} />
                <Button onClick={handleSaveUnit} disabled={loading}>{editingUnitId ? 'Update' : 'Add'}</Button>
                {editingUnitId && <Button variant="ghost" onClick={() => {setEditingUnitId(null); setNewUnitData({unit_name:'', unit_symbol:''});}}>Cancel</Button>}
              </div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Symbol</th><th className="px-4 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {units.map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-2">{u.unit_name}</td>
                        <td className="px-4 py-2">{u.unit_symbol}{u.unit_symbol && !String(u.unit_symbol).includes("%") ? "%" : ""}</td>
                        <td className="px-4 py-2 text-right flex justify-end gap-2">
                          {u.tenant_id ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingUnitId(u.id); setNewUnitData({unit_name: u.unit_name, unit_symbol: u.unit_symbol}); }}>Edit</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleDeleteUnit(u.id)}>Del</Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">System</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {units.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-500 dark:text-slate-400">No units found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isManagingGST && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Manage GST</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsManagingGST(false); setEditingGstId(null); setNewGstData({unit_name:'', unit_symbol:''}); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input placeholder="GST Name (e.g. GST 18%)" value={newGstData.unit_name} onChange={e => setNewGstData({...newGstData, unit_name: e.target.value})} />
                <Input placeholder="Value (e.g. 18)" value={newGstData.unit_symbol} onChange={e => setNewGstData({...newGstData, unit_symbol: e.target.value})} />
                <Button onClick={handleSaveGst} disabled={loading}>{editingGstId ? 'Update' : 'Add'}</Button>
                {editingGstId && <Button variant="ghost" onClick={() => {setEditingGstId(null); setNewGstData({unit_name:'', unit_symbol:''});}}>Cancel</Button>}
              </div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Value</th><th className="px-4 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {gsts.map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-2">{u.unit_name}</td>
                        <td className="px-4 py-2">{u.unit_symbol}{u.unit_symbol && !String(u.unit_symbol).includes("%") ? "%" : ""}</td>
                        <td className="px-4 py-2 text-right flex justify-end gap-2">
                          {u.tenant_id ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingGstId(u.id); setNewGstData({unit_name: u.unit_name, unit_symbol: u.unit_symbol}); }}>Edit</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleDeleteGst(u.id)}>Del</Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">System</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {gsts.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-500 dark:text-slate-400">No GST options found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {isManagingColumns && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Manage Custom Columns</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setIsManagingColumns(false); setEditingCustomColumnId(null); setNewCustomColumnData({column_name:'', column_label:''}); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input placeholder="Column ID (e.g. model_number)" value={newCustomColumnData.column_name} onChange={e => setNewCustomColumnData({...newCustomColumnData, column_name: e.target.value.toLowerCase().replace(/\s+/g, '_')})} />
                <Input placeholder="Label (e.g. Model Number)" value={newCustomColumnData.column_label} onChange={e => setNewCustomColumnData({...newCustomColumnData, column_label: e.target.value})} />
                <Button onClick={async () => {
                  if (!currentTenantId || !newCustomColumnData.column_name) return;
                  const supabase = getSupabaseClient();
                  if (!supabase) return;
                  try {
                      if (editingCustomColumnId) {
                        const { error } = await supabase.from('custom_columns').update({ column_name: newCustomColumnData.column_name, column_label: newCustomColumnData.column_label }).eq('id', editingCustomColumnId);
                        if (error) throw error;
                        toast.success('Column updated');
                      } else {
                        const { error } = await supabase.from('custom_columns').insert([{ tenant_id: currentTenantId, table_name: 'products', column_name: newCustomColumnData.column_name, column_label: newCustomColumnData.column_label, column_type: 'text' }]);
                        if (error) throw error;
                        toast.success('Column added');
                      }
                      setNewCustomColumnData({ column_name: '', column_label: '' });
                      setEditingCustomColumnId(null);
                      fetchCustomColumns();
                  } catch (e: any) {
                      toast.error(e.message || 'Error saving column');
                  }
                }}>
                  {editingCustomColumnId ? 'Update' : 'Add'}
                </Button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {customColumns.map(col => (
                  <div key={col.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{col.column_label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{col.column_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingCustomColumnId(col.id); setNewCustomColumnData({ column_name: col.column_name, column_label: col.column_label }); }}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={async () => {
                        const supabase = getSupabaseClient();
                        if (supabase) {
                           await supabase.from('custom_columns').delete().eq('id', col.id);
                           toast.success('Column removed');
                           fetchCustomColumns();
                        }
                      }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Bulk Import Products</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowBulkImport(false); setBulkImportResults(null); }}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                Download Excel Template
              </Button>
              <div>
                <label className="text-sm font-medium block mb-2">Upload Filled Template</label>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={(e) => { if (e.target.files?.[0]) handleBulkImportFile(e.target.files[0]); }}
                  disabled={bulkImporting}
                />
              </div>
              {bulkImporting && <p className="text-sm text-slate-500 dark:text-slate-400">Importing, please wait...</p>}
              {bulkImportResults && (
                <div className="text-sm space-y-2 max-h-[300px] overflow-y-auto">
                  <p className="font-medium text-emerald-600">{bulkImportResults.success} products added successfully</p>
                  {bulkImportResults.failed.length > 0 && (
                    <div>
                      <p className="font-medium text-red-600">{bulkImportResults.failed.length} rows failed:</p>
                      <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400">
                        {bulkImportResults.failed.map((f, idx) => (
                          <li key={idx}>Row {f.row}: {f.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        ref={manualUploadInputRef}
        className="hidden"
        onChange={handleManualImageUpload}
      />
      {showLabelPrint && (
        <LabelPrintModal
          products={products.filter((p: any) => selectedProductIds.includes(p.id))}
          onClose={() => setShowLabelPrint(false)}
        />
      )}
</div>
  );
}


export const StockAdjustmentContent = ({ currentTenantId, products, branchId, currentUser }: { currentTenantId: string | null; products: any[]; branchId: string | null; currentUser: any }) => {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustmentType, setAdjustmentType] = useState<'adjustment_in' | 'adjustment_out'>('adjustment_in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) { setLoadingHistory(false); return; }
    const { data } = await supabase
      .from('stock_ledger')
      .select('*, products(product_name)')
      .in('movement_type', ['adjustment_in', 'adjustment_out'])
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { fetchHistory(); }, [currentTenantId]);

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0 || !branchId || !currentUser) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }

    const { error } = await supabase.rpc('adjust_stock', {
      p_product_id: selectedProduct.id,
      p_branch_id: branchId,
      p_movement_type: adjustmentType,
      p_quantity: parseFloat(quantity),
      p_reference_type: 'manual_adjustment',
      p_reference_id: null,
      p_notes: reason || null,
      p_created_by: currentUser.id
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Stock adjusted successfully');
    setSelectedProduct(null);
    setProductSearch('');
    setQuantity('');
    setReason('');
    fetchHistory();
  };

  const filteredProducts = products.filter((p: any) => p.product_name?.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium">Product</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-lg p-3 mt-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedProduct.product_name}</span>
                <button onClick={() => setSelectedProduct(null)} className="text-xs text-primary font-semibold">Change</button>
              </div>
            ) : (
              <>
                <Input placeholder="Search product..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                {productSearch && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((p: any) => (
                      <button key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
                        {p.product_name} <span className="text-slate-400 text-xs">— Stock: {p.product_stock?.[0]?.current_quantity ?? 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => setAdjustmentType('adjustment_in')} className={"py-2 rounded-lg text-sm font-bold border-2 " + (adjustmentType === 'adjustment_in' ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>+ Increase Stock</button>
              <button onClick={() => setAdjustmentType('adjustment_out')} className={"py-2 rounded-lg text-sm font-bold border-2 " + (adjustmentType === 'adjustment_out' ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-800 text-slate-500')}>− Decrease Stock</button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Quantity</label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Reason (e.g. Damage, Theft, Recount)</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <Button className="w-full h-11" onClick={handleSubmit} disabled={saving || !selectedProduct || !quantity || parseFloat(quantity) <= 0}>
            {saving ? 'Saving...' : 'Apply Adjustment'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Recent Adjustments</h3>
          {loadingHistory ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No adjustments recorded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Product</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold text-right">Qty</th>
                  <th className="px-3 py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h: any) => (
                  <tr key={h.id}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{h.products?.product_name}</td>
                    <td className="px-3 py-2">
                      <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase " + (h.movement_type === 'adjustment_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{h.movement_type === 'adjustment_in' ? 'Increase' : 'Decrease'}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-600 dark:text-slate-400">{h.quantity}</td>
                    <td className="px-3 py-2 text-slate-500">{h.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
