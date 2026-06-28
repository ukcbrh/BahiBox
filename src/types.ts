export type UserRole = 'admin' | 'manager' | 'cashier' | 'doctor' | 'teacher' | 'public';

export type ModuleType = 
  | 'Retail POS' 
  | 'Manufacturing ERP' 
  | 'Education' 
  | 'Health Care' 
  | 'Hotel/Restaurant' 
  | 'Transport Management' 
  | 'Daily Services' 
  | 'Agri Management';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  module?: ModuleType;
}

export interface Product {
  id: string;
  name: string;
  price: number; // Will use as Sale Price
  purchasePrice?: number;
  mrp?: number;
  cess?: number;
  stock: number;
  unit: string;
  category: string;
  subcategory?: string;
  barcode?: string;
  wSalePrice?: number;
  batch?: string;
  mfgDate?: string;
  expDate?: string;
  size?: string;
  colour?: string;
  imei1?: string;
  imei2?: string;
  kitchen?: string;
  description?: string;
  discount?: number;
  salesUnit?: string;
  salesAltUnit?: string;
  conv?: number;
  minStock?: number;
  status?: string;
  sTax?: number;
  pTax?: number;
  gDown?: string;
  rack?: string;
  defQty?: number;
  partNo?: string;
  hsnCode?: string;
  gst_plus?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  merchant_id?: string;
}

export interface JobPosting {
  id: string;
  merchantId: string;
  merchantName: string;
  title: string;
  module: ModuleType;
  description: string;
  salary: string;
}

export interface CartItem extends Product {
  quantity: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

export interface Order {
  id: string;
  merchant_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
}

export interface ModuleMaster {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  price?: number;
  status?: string;
  test_mode_free?: boolean;
  test_mode_pro?: boolean;
  test_mode_custom?: boolean;
}

export interface MerchantSubscription {
  id: string;
  merchant_id: string;
  module_id: string;
  status: string;
  start_date?: string;
  end_date?: string;
}
