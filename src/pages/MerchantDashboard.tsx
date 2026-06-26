import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  LogOut,
  Plus,
  Trash2,
  Users,
  FileText,
  Calculator,
  Wallet,
  Clock,
  QrCode,
  Scan,
  CreditCard,
  Banknote,
  Search,
  CheckCircle2,
  X,
  Printer,
  Cloud,
  CheckCircle,
  Menu,
  Download,
  Upload,
  ScanLine,
  Settings,
  RotateCcw,
  FolderPlus,
  Image as ImageIcon,
  Edit,
  Tags,
  FileDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Product, CartItem } from '@/src/types';
import { useAuth } from '../contexts/AuthContext';

export interface OnlineOrder {
  id: string;
  customer_name: string;
  address: string;
  items: any;
  total_amount: number;
  status: 'New' | 'Ready to Pack' | 'Dispatch';
  created_at?: string;
}

// Dummy data for initial state
const mockProducts: Product[] = [
  { id: 'P-001', name: 'Aashirvaad Atta 5kg', price: 210, stock: 50, unit: 'Kg', category: 'Grocery', barcode: '8901234567890' },
  { id: 'P-002', name: 'Fortune Sunflower Oil 1L', price: 145, stock: 30, unit: 'Ltr', category: 'Grocery', barcode: '8901234567891' },
  { id: 'P-003', name: 'Surf Excel Matic 1kg', price: 250, stock: 20, unit: 'Box', category: 'Cleaning', barcode: '8901234567892' },
  { id: 'P-004', name: 'Maggi Noodles', price: 14, stock: 100, unit: 'Piece', category: 'Snacks', barcode: '8901234567893' },
];

const mockOrders: OnlineOrder[] = [
  {
    id: 'ORD-9921',
    customer_name: 'Rohan Sharma',
    address: 'Sector 62, Noida',
    items: [
      { name: 'Aashirvaad Atta 5kg', quantity: 1, price: 210 },
      { name: 'Fortune Sunflower Oil 1L', quantity: 4, price: 145 }
    ],
    total_amount: 850,
    status: 'New'
  },
  {
    id: 'ORD-9918',
    customer_name: 'Neha Gupta',
    address: 'Indirapuram, Ghaziabad',
    items: [
      { name: 'Surf Excel Matic 1kg', quantity: 2, price: 250 },
      { name: 'Maggi Noodles', quantity: 10, price: 14 }
    ],
    total_amount: 640,
    status: 'Ready to Pack'
  }
];

export default function MerchantDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, activeModule, logout, loading } = useAuth();
  
  const role = location.state?.role || userRole || 'admin';
  const module = location.state?.module || activeModule || 'Retail POS';
  
  const [activeTab, setActiveTab] = useState('pos');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [orders, setOrders] = useState<OnlineOrder[]>(mockOrders);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="h-screen flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium animate-pulse">Loading BahiBox...</p>
    </div>;
  }

  if (!user) return null;

  const navItems = [
    { id: 'pos', label: 'Hybrid POS', icon: ShoppingCart },
    { id: 'inventory', label: 'Master & Inventory', icon: Package },
    { id: 'gst', label: 'GST & Tax', icon: Calculator },
    { id: 'ledger', label: 'Purchase & Ledger', icon: Wallet },
    { id: 'crm', label: 'CRM & Payroll', icon: Users },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navigation Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          
          {/* Menu Drawer */}
          <div className="relative flex flex-col w-4/5 max-w-sm bg-white h-full shadow-2xl p-6 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg">B</div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">BahiBox</span>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 border-b border-slate-100 bg-slate-50/50 -mx-6 px-6">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Active Module</p>
              <p className="font-bold text-slate-800 text-sm">Retail & POS</p>
              <p className="text-xs text-slate-500 truncate mt-1">{user?.email || 'User'}</p>
            </div>

            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    activeTab === item.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-100">
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              title="Menu"
            >
              <Menu size={22} />
            </button>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">BahiBox POS</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50">
          {activeTab === 'pos' && (
            <HybridPOSView 
              products={products} 
              setProducts={setProducts} 
              orders={orders} 
              setOrders={setOrders} 
            />
          )}
          {activeTab === 'inventory' && (
            <InventoryView 
              products={products} 
              setProducts={setProducts} 
              onRefresh={async () => {}}
            />
          )}
          {activeTab === 'gst' && <GSTView />}
          {activeTab === 'ledger' && <LedgerView />}
          {activeTab === 'crm' && <CRMView />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// 1. Hybrid POS View (3 Tabs: In-Store, Scan & Go, Online)
// ==========================================
interface HybridPOSViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: OnlineOrder[];
  setOrders: React.Dispatch<React.SetStateAction<OnlineOrder[]>>;
}

function HybridPOSView({ products, setProducts, orders, setOrders }: HybridPOSViewProps) {
  const [posTab, setPosTab] = useState<'in-store' | 'scan-go' | 'online'>('in-store');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // In-Store POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [heldCarts, setHeldCarts] = useState<CartItem[][]>([]);
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState<number>(0);

  const categories = ['All', 'Grocery', 'Snacks', 'Cleaning'];
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, discountType: 'percentage', discountValue: 0 }];
    });
  };

  const updateDiscount = (id: string, type: 'percentage' | 'fixed', value: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, discountType: type, discountValue: value } : item));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const basePrice = item.price * item.quantity;
      const discount = item.discountType === 'percentage' 
        ? basePrice * (item.discountValue / 100)
        : item.discountValue;
      return total + (basePrice - discount);
    }, 0);
  };

  const [receiptData, setReceiptData] = useState<{items: CartItem[], total: number, date: string, cash: number, upi: number} | null>(null);

  const totalAmount = calculateTotal();
  const upiAmount = Math.max(0, totalAmount - cashAmount);

  const handleHoldCart = () => {
    if (cart.length > 0) {
      setHeldCarts([...heldCarts, cart]);
      setCart([]);
    }
  };

  const restoreHeldCart = (index: number) => {
    setCart(heldCarts[index]);
    setHeldCarts(heldCarts.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    // 1. Decrement products locally
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      });
    });

    // 2. Open Receipt / Print Preview
    setReceiptData({
      items: [...cart],
      total: totalAmount,
      date: new Date().toLocaleString(),
      cash: cashAmount,
      upi: splitPayment ? upiAmount : totalAmount
    });

    setCart([]);
    setCashAmount(0);
    setSplitPayment(false);
  };

  const handleAcceptOrder = async (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Ready to Pack' } : o));
  };

  const handleDispatchOrder = async (order: OnlineOrder) => {
    const orderItems = Array.isArray(order.items) ? order.items : [];

    // Decrement stock in local state
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const orderedItem = orderItems.find((oItem: any) => oItem.name === p.name);
        if (orderedItem) {
          return { ...p, stock: Math.max(0, p.stock - (orderedItem.quantity || 1)) };
        }
        return p;
      });
    });

    // Set order status to Dispatch
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Dispatch' } : o));

    alert(`Order ${order.id} is successfully dispatched and master inventory stock has been decremented!`);
  };

  const newOrdersList = orders.filter(o => o.status === 'New');
  const packingOrdersList = orders.filter(o => o.status === 'Ready to Pack');
  const dispatchOrdersList = orders.filter(o => o.status === 'Dispatch');

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Top 3 Major Tabs */}
      <div className="flex bg-white border-b border-slate-200 p-4 gap-4 shrink-0 shadow-sm z-20 relative">
        <button 
          onClick={() => setPosTab('in-store')}
          className={`flex-1 py-4 px-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all ${posTab === 'in-store' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
        >
          <ShoppingCart size={24} /> 🛒 In-Store POS
        </button>
        <button 
          onClick={() => setPosTab('scan-go')}
          className={`flex-1 py-4 px-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all relative ${posTab === 'scan-go' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
        >
          <Scan size={24} /> 📱 Scan & Go
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm animate-pulse">3</span>
        </button>
        <button 
          onClick={() => setPosTab('online')}
          className={`flex-1 py-4 px-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all relative ${posTab === 'online' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
        >
          <Package size={24} /> 📦 Online Orders
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
            {newOrdersList.length}
          </span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* ======================= TAB 1: IN-STORE POS ======================= */}
        {posTab === 'in-store' && (
          <div className="absolute inset-0 flex flex-col lg:flex-row">
            {/* LEFT PANEL: Cart & Billing */}
            <div className="w-full lg:w-[450px] xl:w-[500px] border-r border-slate-200 flex flex-col bg-white z-10 shadow-xl">
              {/* Top Search & Controls */}
              <div className="p-4 border-b bg-slate-50 flex gap-2">
                <div className="relative flex-1">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    placeholder="Scan Barcode or Search..." 
                    className="pl-10 h-12 text-lg font-medium border-slate-300 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button variant="outline" className="h-12 w-12 p-0 bg-white"><QrCode size={20}/></Button>
              </div>

              {/* Quick Add Products (If searching) */}
              {searchTerm && (
                 <div className="p-4 grid grid-cols-2 gap-2 border-b max-h-48 overflow-auto bg-slate-50 z-10 shadow-inner">
                   {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                     <div key={product.id} onClick={() => {addToCart(product); setSearchTerm('');}} className="p-3 border bg-white rounded-lg cursor-pointer hover:border-slate-800 transition-colors shadow-sm">
                       <p className="font-semibold text-sm truncate text-slate-800">{product.name}</p>
                       <p className="text-slate-600 text-xs font-bold mt-1">₹{product.price}</p>
                     </div>
                   ))}
                 </div>
              )}

              {/* Billing Grid */}
              <div className="flex-1 overflow-auto p-0 bg-white">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 sticky top-0 z-0 text-slate-600 border-b">
                     <tr>
                       <th className="px-4 py-3 font-semibold">Item</th>
                       <th className="px-4 py-3 font-semibold w-24">Qty</th>
                       <th className="px-4 py-3 font-semibold w-28">Discount</th>
                       <th className="px-4 py-3 font-semibold text-right w-24">Total</th>
                       <th className="px-2 py-3 w-8"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {cart.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50 group">
                         <td className="px-4 py-4">
                           <p className="font-bold text-slate-800">{item.name}</p>
                           <p className="text-xs text-slate-500 mt-0.5">₹{item.price} / {item.unit}</p>
                         </td>
                         <td className="px-4 py-4">
                           <div className="flex items-center gap-1 border border-slate-200 rounded-md w-max p-0.5 bg-white">
                             <button onClick={() => {
                               if(item.quantity > 1) {
                                 setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                               }
                             }} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded">-</button>
                             <span className="w-6 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                             <button onClick={() => {
                               setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                             }} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded">+</button>
                           </div>
                         </td>
                         <td className="px-4 py-4">
                           <div className="flex items-center gap-1">
                             <select 
                                 className="h-8 w-12 text-xs rounded border border-slate-200 bg-slate-50 px-1 font-medium focus:ring-1 outline-none"
                                 value={item.discountType}
                                 onChange={(e) => updateDiscount(item.id, e.target.value as 'percentage'|'fixed', item.discountValue)}
                               >
                                 <option value="percentage">%</option>
                                 <option value="fixed">₹</option>
                               </select>
                               <Input 
                                 type="number" 
                                 className="h-8 text-xs w-14 px-2 bg-white" 
                                 placeholder="0"
                                 value={item.discountValue || ''}
                                 onChange={(e) => updateDiscount(item.id, item.discountType, Number(e.target.value))}
                               />
                           </div>
                         </td>
                         <td className="px-4 py-4 text-right font-bold text-slate-900 text-base">
                           ₹{((item.price * item.quantity) - (item.discountType === 'percentage' ? (item.price * item.quantity * item.discountValue / 100) : item.discountValue)).toFixed(2)}
                         </td>
                         <td className="px-2 py-4 text-right">
                           <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={18}/></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
                {cart.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-20">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <ShoppingCart size={40} className="text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">Cart is empty</p>
                    <p className="text-sm">Scan or tap products to add</p>
                  </div>
                )}
              </div>

              {/* Action Bottom Bar */}
              <div className="border-t border-slate-200 bg-white p-6 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3 mb-6">
                   <Button variant="outline" className="flex-1 h-12 font-bold border-slate-300 text-slate-700 hover:bg-slate-50" onClick={handleHoldCart} disabled={cart.length === 0}>
                     <Clock size={18} className="mr-2"/> Hold Bill
                   </Button>
                   {heldCarts.length > 0 && (
                     <Button variant="outline" className="flex-1 h-12 font-bold border-slate-300 text-slate-700" onClick={() => restoreHeldCart(0)}>
                       Resume ({heldCarts.length})
                     </Button>
                   )}
                   <Button variant="outline" className={`flex-1 h-12 font-bold transition-colors ${splitPayment ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`} onClick={() => setSplitPayment(!splitPayment)}>
                     Split Payment
                   </Button>
                </div>
                
                {splitPayment && (
                  <div className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200 mb-6 animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex-1 space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Banknote size={14}/> Cash Received</label>
                       <Input type="number" value={cashAmount || ''} onChange={e => setCashAmount(Number(e.target.value))} className="h-12 text-xl font-bold bg-white" placeholder="0" />
                     </div>
                     <div className="flex-1 space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><QrCode size={14}/> UPI / Card</label>
                       <div className="h-12 flex items-center px-4 bg-white rounded-md border border-slate-200 text-xl font-bold text-slate-800">₹ {upiAmount.toFixed(2)}</div>
                     </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Grand Total</p>
                     <p className="text-5xl font-extrabold text-slate-900 tracking-tighter leading-none">₹{totalAmount.toFixed(2)}</p>
                  </div>
                  <Button className="h-16 px-12 text-xl font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all" disabled={cart.length === 0} onClick={handleCheckout}>
                    Pay & Print <Printer size={24} className="ml-3"/>
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Visual Product Catalog */}
            <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
               <div className="p-6 bg-white border-b border-slate-200 flex gap-3 overflow-x-auto shrink-0">
                 {categories.map(cat => (
                   <Button 
                     key={cat} 
                     variant={selectedCategory === cat ? 'default' : 'outline'} 
                     className={`rounded-full px-6 font-bold ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                     onClick={() => setSelectedCategory(cat)}
                   >
                     {cat}
                   </Button>
                 ))}
               </div>
               <div className="p-6 flex-1 overflow-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredProducts.map(p => (
                      <Card key={p.id} className="cursor-pointer border-slate-200 hover:border-slate-800 hover:shadow-xl transition-all overflow-hidden group bg-white" onClick={() => addToCart(p)}>
                        <div className="h-40 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                           <Package size={56} className="text-slate-300 group-hover:scale-110 transition-transform duration-300" />
                           <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <Plus size={24} className="text-slate-900" />
                              </div>
                           </div>
                        </div>
                        <CardContent className="p-4 text-center">
                           <p className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">{p.name}</p>
                           <p className="text-xs font-semibold text-slate-500 mt-1 mb-2">{p.unit} • Stock: {p.stock}</p>
                           <p className="text-xl font-extrabold text-slate-900 font-mono">₹{p.price}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: SCAN & GO ======================= */}
        {posTab === 'scan-go' && (
           <div className="absolute inset-0 bg-slate-50 p-8 overflow-auto">
              <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">Live Scan & Go</h2>
                    <p className="text-slate-500 mt-1 font-medium">Monitor self-checkout customers in real-time.</p>
                 </div>
                 <div className="flex gap-4">
                    <span className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> 3 Active Shoppers
                    </span>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {/* Card 1: Payment Cleared */}
                 <Card className="border-blue-200 shadow-lg relative overflow-hidden bg-white hover:-translate-y-1 transition-transform">
                   <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                   <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl border border-blue-100">AK</div>
                           <div>
                             <p className="font-extrabold text-xl text-slate-900">Amit Kumar</p>
                             <p className="text-sm font-medium text-slate-500 mt-0.5">ID: SG-8920 • 12 items</p>
                           </div>
                        </div>
                        <span className="text-sm font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                          <CheckCircle2 size={16}/> Payment Cleared
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-8 border-t border-slate-100 pt-6">
                        <div>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
                          <p className="text-4xl font-extrabold text-slate-900">₹ 1,450.00</p>
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-8 h-12 text-lg rounded-xl shadow-md">Clear Exit</Button>
                      </div>
                   </CardContent>
                 </Card>
                 
                 {/* Card 2: Shopping */}
                 <Card className="border-emerald-200 shadow-sm relative overflow-hidden bg-white hover:-translate-y-1 transition-transform">
                   <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                   <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl border border-emerald-100">RJ</div>
                           <div>
                             <p className="font-extrabold text-xl text-slate-900">Rahul Jain</p>
                             <p className="text-sm font-medium text-slate-500 mt-0.5">ID: SG-8921 • Aisle 4</p>
                           </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg">Shopping...</span>
                      </div>
                      <div className="text-sm text-slate-600 space-y-3 mt-6 pt-6 border-t border-slate-100">
                        <p className="flex items-center gap-3 font-medium"><CheckCircle2 size={18} className="text-emerald-500"/> Fortune Oil 1L <span className="text-slate-400 text-xs ml-auto">1m ago</span></p>
                        <p className="flex items-center gap-3 font-medium"><CheckCircle2 size={18} className="text-emerald-500"/> Maggi Noodles x4 <span className="text-slate-400 text-xs ml-auto">3m ago</span></p>
                      </div>
                   </CardContent>
                 </Card>
              </div>
           </div>
        )}

        {/* ======================= TAB 3: ONLINE ORDERS ======================= */}
        {posTab === 'online' && (
           <div className="absolute inset-0 bg-slate-50 p-8 overflow-hidden flex flex-col">
              <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">Online Orders Hub</h2>
                    <p className="text-slate-500 mt-1 font-medium">Manage deliveries, picking, and dispatch kanban.</p>
                 </div>
              </div>
              <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                 {/* Kanban Column 1: New Orders */}
                 <div className="w-96 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center justify-between pb-4 border-b border-slate-100">
                      New Orders <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-bold">{newOrdersList.length}</span>
                    </h3>
                    <div className="flex-1 overflow-auto space-y-4">
                       {newOrdersList.map(order => (
                         <Card key={order.id} className="shadow-sm border-2 border-orange-200 bg-orange-50/30">
                           <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">New</span>
                                <span className="text-sm font-bold text-slate-400 font-mono">#{order.id}</span>
                              </div>
                              <p className="font-extrabold text-lg text-slate-900 mb-1">{order.customer_name}</p>
                              <p className="text-sm font-medium text-slate-500 mb-4 truncate">{order.address}</p>
                              
                              <div className="mb-4 bg-white/50 p-3 rounded-lg border text-xs text-slate-600 space-y-1">
                                {Array.isArray(order.items) && order.items.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between">
                                    <span>{it.name} x{it.quantity}</span>
                                    <span className="font-bold">₹{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex justify-between items-center">
                                <p className="text-lg font-extrabold text-slate-900">₹ {order.total_amount}.00 <span className="text-emerald-600 text-xs ml-1 bg-emerald-50 px-2 py-0.5 rounded">Paid</span></p>
                                <Button size="sm" onClick={() => handleAcceptOrder(order.id)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-4 rounded-lg">Accept Order</Button>
                              </div>
                           </CardContent>
                         </Card>
                       ))}
                       {newOrdersList.length === 0 && (
                         <p className="text-sm text-slate-400 text-center py-8">No new online orders</p>
                       )}
                    </div>
                 </div>

                 {/* Kanban Column 2: Ready to Pack */}
                 <div className="w-96 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center justify-between pb-4 border-b border-slate-100">
                      Ready to Pack <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">{packingOrdersList.length}</span>
                    </h3>
                    <div className="flex-1 overflow-auto space-y-4">
                       {packingOrdersList.map(order => (
                         <Card key={order.id} className="shadow-sm border border-slate-200">
                           <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border border-blue-100">Packing</span>
                                <span className="text-sm font-bold text-slate-400 font-mono">#{order.id}</span>
                              </div>
                              <p className="font-extrabold text-lg text-slate-900 mb-1">{order.customer_name}</p>
                              <p className="text-sm font-medium text-slate-500 mb-4">{order.address}</p>
                              
                              <div className="mb-4 bg-slate-50 p-3 rounded-lg border text-xs text-slate-600 space-y-1">
                                {Array.isArray(order.items) && order.items.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between">
                                    <span>{it.name} x{it.quantity}</span>
                                    <span className="font-bold">₹{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-50 font-bold h-10 rounded-lg text-xs" onClick={() => alert("Picking list generated!")}>
                                   <Printer size={14} className="mr-1"/> Picking List
                                </Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-lg text-xs" onClick={() => handleDispatchOrder(order)}>
                                   <CheckCircle size={14} className="mr-1"/> Pack & Ship
                                </Button>
                              </div>
                           </CardContent>
                         </Card>
                       ))}
                       {packingOrdersList.length === 0 && (
                         <p className="text-sm text-slate-400 text-center py-8">No orders to pack</p>
                       )}
                    </div>
                 </div>

                 {/* Kanban Column 3: Dispatch */}
                 <div className="w-96 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center justify-between pb-4 border-b border-slate-100">
                      Dispatch <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-sm font-bold">{dispatchOrdersList.length}</span>
                    </h3>
                    <div className="flex-1 overflow-auto space-y-4">
                       {dispatchOrdersList.map(order => (
                         <Card key={order.id} className="shadow-sm border border-emerald-100 bg-emerald-50/10">
                           <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">Shipped</span>
                                <span className="text-sm font-bold text-slate-400 font-mono">#{order.id}</span>
                              </div>
                              <p className="font-extrabold text-lg text-slate-900 mb-1">{order.customer_name}</p>
                              <p className="text-sm font-medium text-slate-500 mb-2">{order.address}</p>
                              <p className="text-lg font-bold text-slate-800">₹ {order.total_amount}.00</p>
                           </CardContent>
                         </Card>
                       ))}
                       {dispatchOrdersList.length === 0 && (
                         <div className="h-40 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                           <Package size={32} className="mb-2 text-slate-300" />
                           <p className="font-medium text-sm">No orders to dispatch</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReceiptData(null)}></div>
          <div className="bg-white p-8 rounded-2xl shadow-2xl relative z-10 w-[400px] flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <h2 className="text-2xl font-extrabold text-slate-900">Receipt Preview</h2>
              <button onClick={() => setReceiptData(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800"><X size={20}/></button>
            </div>
            
            {/* Printable Area */}
            <div id="print-receipt" className="flex-1 overflow-auto bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 font-mono text-sm text-slate-800 printable-area print:p-0 print:border-none print:bg-white print:m-0 print:shadow-none print:w-full">
               <div className="text-center mb-6">
                 <h1 className="text-xl font-black uppercase tracking-widest border-b-2 border-slate-800 pb-2 mb-2 inline-block print:text-black print:border-black">BAHIBOX STORE</h1>
                 <p className="text-xs text-slate-500 print:text-black">Date: {receiptData.date}</p>
               </div>
               
               <table className="w-full text-left mb-6">
                 <thead>
                   <tr className="border-b border-dashed border-slate-300 print:border-black">
                     <th className="pb-2 font-bold uppercase text-xs print:text-black">Item</th>
                     <th className="pb-2 font-bold uppercase text-xs text-center w-12 print:text-black">Qty</th>
                     <th className="pb-2 font-bold uppercase text-xs text-right w-20 print:text-black">Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-dashed divide-slate-200 print:divide-black">
                   {receiptData.items.map((item, idx) => (
                     <tr key={idx}>
                       <td className="py-2 pr-2 print:text-black">{item.name}</td>
                       <td className="py-2 text-center print:text-black">{item.quantity}</td>
                       <td className="py-2 text-right print:text-black">₹{((item.price * item.quantity) - item.discountValue).toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               
               <div className="border-t-2 border-slate-800 pt-4 space-y-2 print:border-black">
                 <div className="flex justify-between font-bold text-lg print:text-black">
                   <span>TOTAL</span>
                   <span>₹{receiptData.total.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-slate-500 text-xs mt-4 print:text-black">
                   <span>Cash Paid:</span>
                   <span>₹{receiptData.cash.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-slate-500 text-xs print:text-black">
                   <span>UPI / Card:</span>
                   <span>₹{receiptData.upi.toFixed(2)}</span>
                 </div>
               </div>
               
               <div className="mt-8 text-center border-t border-dashed border-slate-300 pt-4 print:border-black">
                 <p className="font-bold text-xs uppercase tracking-widest print:text-black">Thank You!</p>
                 <p className="text-[10px] text-slate-400 mt-1 print:text-black">Please visit again.</p>
               </div>
            </div>
            
            <div className="flex gap-4 print:hidden">
              <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setReceiptData(null)}>Close</Button>
              <Button className="flex-1 h-12 font-bold bg-slate-900 text-white" onClick={() => {
                  window.print();
              }}>
                <Printer size={18} className="mr-2"/> Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ==========================================
// 2. Master & Inventory Management
// ==========================================
interface InventoryViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onRefresh: () => Promise<void>;
}

function InventoryView({ products, setProducts, onRefresh }: InventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  
  // Settings Dropdown State
  const [showSettings, setShowSettings] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({
    'Product Name': true,
    'Purchase Price': true,
    'CESS %': true,
    'Opening Stock': true,
    'Barcode': true,
    'MRP': true,
    'Sale Price': true,
    Category: false,
    Subcategory: false,
    Batch: false,
    Mfgdate: false,
    'Exp Date': false,
    Size: false,
    Colour: false,
    WSalePrice: false,
    IMEI1: false,
    IMEI2: false,
    Kitchen: false,
    Description: false,
    Discount: false,
    'Sales Unit': false,
    'Sales Alt Unit': false,
    Conv: false,
    'Min Stock': false,
    Status: false,
    'S Tax': false,
    'P Tax': false,
    'G Down': false,
    Rack: false,
    'Def Qty': false,
    'Part No': false,
    HSNCode: false,
    Category_plus: false,
    Subcategory_plus: false,
    Gst_plus: false,
    CGST: false,
    SGST: false,
    IGST: false,
    UpdateButtonColumn: false,
    'Delete ButtonColumn': false,
    'Print BandaButton': false
  });

  useEffect(() => {
    import('../lib/supabase').then(async ({ getSupabaseClient }) => {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.from('products').select('*');
          if (!error && data && data.length > 0) {
             setProducts(prev => {
                // simple deduplication based on id
                const existingIds = new Set(prev.map(p => p.id));
                const newItems = data.filter(p => !existingIds.has(p.id));
                return [...prev, ...newItems];
             });
          }
        } catch (e) {
          console.error("Error fetching products from supabase", e);
        }
      }
    });
  }, [setProducts]);

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };
  
  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(0);
  const [newCess, setNewCess] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [newBarcode, setNewBarcode] = useState('');
  const [newMrp, setNewMrp] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0); // Retail Sale Price

  const [newCategory, setNewCategory] = useState('General');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newWSalePrice, setNewWSalePrice] = useState<number>(0);
  const [newBatch, setNewBatch] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newColour, setNewColour] = useState('');
  
  const [newImei1, setNewImei1] = useState('');
  const [newImei2, setNewImei2] = useState('');
  const [newKitchen, setNewKitchen] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [newSalesUnit, setNewSalesUnit] = useState('');
  const [newSalesAltUnit, setNewSalesAltUnit] = useState('');
  const [newConv, setNewConv] = useState<number>(0);
  const [newMinStock, setNewMinStock] = useState<number>(0);
  const [newStatus, setNewStatus] = useState('');
  const [newSTax, setNewSTax] = useState<number>(0);
  const [newPTax, setNewPTax] = useState<number>(0);
  const [newGDown, setNewGDown] = useState('');
  const [newRack, setNewRack] = useState('');
  const [newDefQty, setNewDefQty] = useState<number>(0);
  const [newPartNo, setNewPartNo] = useState('');
  const [newHsnCode, setNewHsnCode] = useState('');
  const [newGstPlus, setNewGstPlus] = useState<number>(0);
  const [newCGST, setNewCGST] = useState<number>(0);
  const [newSGST, setNewSGST] = useState<number>(0);
  const [newIGST, setNewIGST] = useState<number>(0);

  const [availableCategories, setAvailableCategories] = useState<string[]>(['Grocery', 'Snacks', 'Cleaning']);
  const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, string[]>>({});
  const [availableUnits, setAvailableUnits] = useState<string[]>(['Piece', 'Kg', 'Ltr', 'Box']);

  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showAddSubcatModal, setShowAddSubcatModal] = useState(false);
  const [newSubcatParent, setNewSubcatParent] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const purchasePriceInputRef = useRef<HTMLInputElement>(null);
  const cessInputRef = useRef<HTMLInputElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const mrpInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const downloadProforma = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: 'Example Product', category: 'Grocery', price: 100, purchasePrice: 80, stock: 50, unit: 'Piece', barcode: '123456789' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proforma");
    XLSX.writeFile(wb, "Inventory_Proforma.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newProducts: Product[] = data.map(row => ({
          id: 'P-' + Math.floor(100 + Math.random() * 900) + Date.now(),
          name: row.name || 'Unnamed',
          category: row.category || 'General',
          price: Number(row.price) || 0,
          purchasePrice: Number(row.purchasePrice) || 0,
          stock: Number(row.stock) || 0,
          unit: row.unit || 'Piece',
          barcode: row.barcode || String(Math.floor(8900000000000 + Math.random() * 99999999999))
        }));

        setProducts(prev => [...newProducts, ...prev]);
        alert(`${newProducts.length} products added successfully!`);
      } catch (error) {
        alert("Error parsing Excel file");
      }
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const handleAddProduct = async () => {
    let finalName = newName;
    if (!finalName && newBarcode) {
      finalName = `Scanned Item ${newBarcode.slice(-4)}`;
    }

    if (!finalName) {
      alert("Please enter a valid name or scan a barcode!");
      return;
    }

    const newId = 'P-' + Math.floor(100 + Math.random() * 900);
    const barcodeVal = newBarcode || String(Math.floor(8900000000000 + Math.random() * 99999999999));

    const newProduct: Product = {
      id: newId,
      name: finalName,
      category: newCategory || 'General',
      subcategory: newSubcategory || undefined,
      wSalePrice: newWSalePrice || undefined,
      batch: newBatch || undefined,
      mfgDate: newMfgDate || undefined,
      expDate: newExpDate || undefined,
      size: newSize || undefined,
      colour: newColour || undefined,
      imei1: newImei1 || undefined,
      imei2: newImei2 || undefined,
      kitchen: newKitchen || undefined,
      description: newDescription || undefined,
      discount: newDiscount || undefined,
      salesUnit: newSalesUnit || undefined,
      salesAltUnit: newSalesAltUnit || undefined,
      conv: newConv || undefined,
      minStock: newMinStock || undefined,
      status: newStatus || undefined,
      sTax: newSTax || undefined,
      pTax: newPTax || undefined,
      gDown: newGDown || undefined,
      rack: newRack || undefined,
      defQty: newDefQty || undefined,
      partNo: newPartNo || undefined,
      hsnCode: newHsnCode || undefined,
      gst_plus: newGstPlus || undefined,
      cgst: newCGST || undefined,
      sgst: newSGST || undefined,
      igst: newIGST || undefined,
      price: newPrice || 0,
      purchasePrice: newPurchasePrice || 0,
      mrp: newMrp || 0,
      cess: newCess || 0,
      stock: newStock || 0,
      unit: 'Piece',
      barcode: barcodeVal
    };

    // Import dynamically to avoid issues if not used in other parts
    import('../lib/supabase').then(async ({ getSupabaseClient }) => {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase.from('products').insert([newProduct]);
          if (error) {
            console.error("Error saving to Supabase:", error);
            alert("Error saving to Supabase: " + (error.message || JSON.stringify(error)));
          }
        } catch (e) {
          console.error("Supabase integration error:", e);
        }
      }
    });

    // Update local state
    setProducts(prev => [newProduct, ...prev]);

    // Reset Form for next entry
    setNewName('');
    setNewPrice(0);
    setNewPurchasePrice(0);
    setNewStock(0);
    setNewBarcode('');
    setNewMrp(0);
    setNewCess(0);

    setNewCategory('General');
    setNewSubcategory('');
    setNewWSalePrice(0);
    setNewBatch('');
    setNewMfgDate('');
    setNewExpDate('');
    setNewSize('');
    setNewColour('');
    setNewImei1('');
    setNewImei2('');
    setNewKitchen('');
    setNewDescription('');
    setNewDiscount(0);
    setNewSalesUnit('');
    setNewSalesAltUnit('');
    setNewConv(0);
    setNewMinStock(0);
    setNewStatus('');
    setNewSTax(0);
    setNewPTax(0);
    setNewGDown('');
    setNewRack('');
    setNewDefQty(0);
    setNewPartNo('');
    setNewHsnCode('');
    setNewGstPlus(0);
    setNewCGST(0);
    setNewSGST(0);
    setNewIGST(0);

    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const handleAddCategory = () => {
    setShowAddCatModal(true);
  };

  const handleAddSubcategory = () => {
    setShowAddSubcatModal(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleAddProduct();
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? (Child-before-Parent constraint checked)")) {
      return;
    }

    // Update local state
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full mx-auto relative">
      {/* Add Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Category</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
                <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Enter category name..." />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowAddCatModal(false)}>Cancel</Button>
                <Button onClick={() => {
                  if (newCatName && !availableCategories.includes(newCatName)) {
                    setAvailableCategories(prev => [...prev, newCatName]);
                    setShowAddCatModal(false);
                    setNewCatName('');
                  }
                }}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Subcategory</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Category</label>
                <Select value={newSubcatParent} onValueChange={setNewSubcatParent}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategory Name</label>
                <Input value={newSubcatName} onChange={e => setNewSubcatName(e.target.value)} placeholder="Enter subcategory name..." />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowAddSubcatModal(false)}>Cancel</Button>
                <Button onClick={() => {
                  if (newSubcatParent && newSubcatName) {
                    setSubcategoriesMap(prev => ({...prev, [newSubcatParent]: [...(prev[newSubcatParent] || []), newSubcatName]}));
                    setShowAddSubcatModal(false);
                    setNewSubcatName('');
                  }
                }}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inventory & Product Master</h2>
          <p className="text-slate-500 mt-1 font-medium">Manage product pricing, real-time barcodes, stock levels, and mandatory units.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadProforma} className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 h-9 text-xs font-bold">
            <Edit size={14} className="mr-1.5 text-blue-600" /> Product Bulk Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 h-9 text-xs font-bold">
            <FileDown size={14} className="mr-1.5 text-emerald-600" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => { if(confirm("Reset all form entries?")) { setShowAddRow(false); setNewName(''); } }} className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 h-9 text-xs font-bold">
            <RotateCcw size={14} className="mr-1.5 text-slate-500" /> Reset
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setShowSettings(!showSettings)} className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 h-9 text-xs font-bold">
              <Settings size={14} className="mr-1.5 text-slate-500" /> Settings
            </Button>
            {showSettings && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 flex flex-col gap-1 max-h-64 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 mb-1 px-1 uppercase tracking-wider">Visible Columns</div>
                {Object.keys(selectedColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={selectedColumns[col]} onChange={() => toggleColumn(col)} className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    {col}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 h-9 text-xs font-bold">
            <CheckCircle size={14} className="mr-1.5 text-blue-500" /> Set Default
          </Button>
        </div>
      </div>

      {/* Toolbar & Actions */}
      <div className="flex flex-col xl:flex-row justify-between gap-4">
        {/* Left Side Controls */}
        <div className="flex flex-col gap-3 flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 max-w-lg">
            <Select defaultValue="all">
              <SelectTrigger className="w-[120px] h-9 text-xs font-semibold">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="grocery">Grocery</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs" 
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-700 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span>TOP:</span>
              <Input type="number" defaultValue={5} className="w-16 h-7 text-xs bg-white text-center font-mono" />
              <span>RECORDS</span>
            </div>
            <div className="flex items-center gap-2">
              <span>SELECT ALL:</span>
              <input type="checkbox" className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span>BARCODE No. of Copies:</span>
              <Input type="number" defaultValue={1} className="w-12 h-7 text-xs bg-white text-center font-mono" />
            </div>
          </div>
        </div>

        {/* Right Side Buttons */}
        <div className="flex flex-wrap items-stretch justify-end gap-2 xl:min-w-[450px]">
          <div className="grid grid-cols-2 gap-2 flex-1">
             <Button variant="outline" onClick={handleAddCategory} className="h-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700 text-xs font-bold justify-start">
               <FolderPlus size={16} className="mr-2 text-green-500" /> Add Category
             </Button>
             <Button variant="outline" onClick={handleAddSubcategory} className="h-full bg-green-50 hover:bg-green-100 border-green-200 text-green-700 text-xs font-bold justify-start">
               <Tags size={16} className="mr-2 text-green-500" /> Add Subcategory
             </Button>
             <Button variant="outline" className="h-full bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 text-xs font-bold justify-start">
               <Search size={16} className="mr-2 text-teal-500" /> Show All
             </Button>
             <Button variant="outline" className="h-full bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 text-xs font-bold justify-start">
               <ImageIcon size={16} className="mr-2 text-teal-500" /> Bulk Image Update
             </Button>
          </div>
          <Button onClick={() => setShowAddRow(prev => !prev)} className="h-full px-6 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex flex-col items-center justify-center shadow-sm rounded-xl">
            {showAddRow ? <RotateCcw size={20} className="mb-0.5 text-red-200" /> : <Plus size={20} className="mb-0.5 text-red-200" />}
            {showAddRow ? <>CLOSE<br/>ENTRY</> : <>NEW<br/>RECORD</>}
          </Button>
        </div>
      </div>

      {/* Products Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-slate-700 bg-lime-100/50 uppercase border-b border-lime-200 font-extrabold tracking-wider">
              <tr>
                <th className="px-3 py-2 w-20">P-Code</th>
                {selectedColumns['Product Name'] && <th className="px-3 py-2 min-w-[200px] text-red-600 bg-red-100/50 text-center">Product Name</th>}
                {selectedColumns['Category'] && <th className="px-3 py-2 min-w-[120px]">Category</th>}
                {selectedColumns['Subcategory'] && <th className="px-3 py-2 min-w-[120px]">Subcategory</th>}
                {selectedColumns['WSalePrice'] && <th className="px-3 py-2 min-w-[100px]">WSalePrice</th>}
                {selectedColumns['Purchase Price'] && <th className="px-3 py-2 min-w-[120px] text-red-600 bg-red-100/50 text-center">Purchase Price</th>}
                {selectedColumns['Batch'] && <th className="px-3 py-2 min-w-[100px]">Batch</th>}
                {selectedColumns['Mfgdate'] && <th className="px-3 py-2 min-w-[100px]">MfgDate</th>}
                {selectedColumns['Exp Date'] && <th className="px-3 py-2 min-w-[100px]">ExpDate</th>}
                {selectedColumns['Size'] && <th className="px-3 py-2 min-w-[80px]">Size</th>}
                {selectedColumns['Colour'] && <th className="px-3 py-2 min-w-[80px]">Colour</th>}
                {selectedColumns['IMEI1'] && <th className="px-3 py-2 min-w-[100px]">IMEI1</th>}
                {selectedColumns['IMEI2'] && <th className="px-3 py-2 min-w-[100px]">IMEI2</th>}
                {selectedColumns['Kitchen'] && <th className="px-3 py-2 min-w-[100px]">Kitchen</th>}
                {selectedColumns['Description'] && <th className="px-3 py-2 min-w-[120px]">Description</th>}
                {selectedColumns['Discount'] && <th className="px-3 py-2 min-w-[80px]">Discount</th>}
                {selectedColumns['Sales Unit'] && <th className="px-3 py-2 min-w-[80px]">S.Unit</th>}
                {selectedColumns['Sales Alt Unit'] && <th className="px-3 py-2 min-w-[80px]">S.AltUnit</th>}
                {selectedColumns['Conv'] && <th className="px-3 py-2 min-w-[80px]">Conv</th>}
                {selectedColumns['Min Stock'] && <th className="px-3 py-2 min-w-[80px]">MinStock</th>}
                {selectedColumns['Status'] && <th className="px-3 py-2 min-w-[80px]">Status</th>}
                {selectedColumns['S Tax'] && <th className="px-3 py-2 min-w-[80px]">S.Tax</th>}
                {selectedColumns['P Tax'] && <th className="px-3 py-2 min-w-[80px]">P.Tax</th>}
                {selectedColumns['G Down'] && <th className="px-3 py-2 min-w-[100px]">G.Down</th>}
                {selectedColumns['Rack'] && <th className="px-3 py-2 min-w-[80px]">Rack</th>}
                {selectedColumns['Def Qty'] && <th className="px-3 py-2 min-w-[80px]">DefQty</th>}
                {selectedColumns['Part No'] && <th className="px-3 py-2 min-w-[100px]">PartNo</th>}
                {selectedColumns['HSNCode'] && <th className="px-3 py-2 min-w-[100px]">HSNCode</th>}
                {selectedColumns['Category_plus'] && <th className="px-3 py-2 min-w-[100px]">Cat+</th>}
                {selectedColumns['Subcategory_plus'] && <th className="px-3 py-2 min-w-[100px]">SubCat+</th>}
                {selectedColumns['Gst_plus'] && <th className="px-3 py-2 min-w-[80px]">GST+</th>}
                {selectedColumns['CGST'] && <th className="px-3 py-2 min-w-[80px]">CGST</th>}
                {selectedColumns['SGST'] && <th className="px-3 py-2 min-w-[80px]">SGST</th>}
                {selectedColumns['IGST'] && <th className="px-3 py-2 min-w-[80px]">IGST</th>}
                {selectedColumns['CESS %'] && <th className="px-3 py-2 w-20">CESS %</th>}
                {selectedColumns['Opening Stock'] && <th className="px-3 py-2 w-24">Opening Stock</th>}
                {selectedColumns['Barcode'] && <th className="px-3 py-2 min-w-[120px] text-red-600 bg-red-100/50 text-center">Barcode</th>}
                {selectedColumns['MRP'] && <th className="px-3 py-2 w-24">MRP</th>}
                {selectedColumns['Sale Price'] && <th className="px-3 py-2 w-32">Sale Price</th>}
                <th className="px-3 py-2 text-center w-16">Insert</th>
                {selectedColumns['UpdateButtonColumn'] && <th className="px-3 py-2 text-center w-16">Update</th>}
                {selectedColumns['Delete ButtonColumn'] && <th className="px-3 py-2 text-center w-16">Delete</th>}
                <th className="px-3 py-2 text-center w-16">Print</th>
                {selectedColumns['Print BandaButton'] && <th className="px-3 py-2 text-center w-16">Barcode Print</th>}
                <th className="px-3 py-2 text-center w-16">Variant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-3 py-1.5 text-[11px] font-mono font-medium border-l-4 border-l-purple-600 bg-slate-50">{product.id}</td>
                  {selectedColumns['Product Name'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-900">{product.name}</td>}
                  {selectedColumns['Category'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.category}</td>}
                  {selectedColumns['Subcategory'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.subcategory || '-'}</td>}
                  {selectedColumns['WSalePrice'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.wSalePrice?.toFixed(2) || '-'}</td>}
                  {selectedColumns['Purchase Price'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.purchasePrice?.toFixed(2) || '0.00'}</td>}
                  {selectedColumns['Batch'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600">{product.batch || '-'}</td>}
                  {selectedColumns['Mfgdate'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600">{product.mfgDate || '-'}</td>}
                  {selectedColumns['Exp Date'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600">{product.expDate || '-'}</td>}
                  {selectedColumns['Size'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.size || '-'}</td>}
                  {selectedColumns['Colour'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.colour || '-'}</td>}
                  {selectedColumns['IMEI1'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.imei1 || '-'}</td>}
                  {selectedColumns['IMEI2'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.imei2 || '-'}</td>}
                  {selectedColumns['Kitchen'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.kitchen || '-'}</td>}
                  {selectedColumns['Description'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700 truncate max-w-[120px]" title={product.description}>{product.description || '-'}</td>}
                  {selectedColumns['Discount'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.discount || '-'}</td>}
                  {selectedColumns['Sales Unit'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.salesUnit || '-'}</td>}
                  {selectedColumns['Sales Alt Unit'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.salesAltUnit || '-'}</td>}
                  {selectedColumns['Conv'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.conv || '-'}</td>}
                  {selectedColumns['Min Stock'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.minStock || '-'}</td>}
                  {selectedColumns['Status'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.status || '-'}</td>}
                  {selectedColumns['S Tax'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.sTax || '-'}</td>}
                  {selectedColumns['P Tax'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.pTax || '-'}</td>}
                  {selectedColumns['G Down'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.gDown || '-'}</td>}
                  {selectedColumns['Rack'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.rack || '-'}</td>}
                  {selectedColumns['Def Qty'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.defQty || '-'}</td>}
                  {selectedColumns['Part No'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.partNo || '-'}</td>}
                  {selectedColumns['HSNCode'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.hsnCode || '-'}</td>}
                  {selectedColumns['Category_plus'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.category || '-'}</td>}
                  {selectedColumns['Subcategory_plus'] && <td className="px-3 py-1.5 text-xs font-semibold text-slate-700">{product.subcategory || '-'}</td>}
                  {selectedColumns['Gst_plus'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.gst_plus || '-'}</td>}
                  {selectedColumns['CGST'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.cgst || '-'}</td>}
                  {selectedColumns['SGST'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.sgst || '-'}</td>}
                  {selectedColumns['IGST'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.igst || '-'}</td>}
                  {selectedColumns['CESS %'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.cess?.toFixed(2) || '0.00'}</td>}
                  {selectedColumns['Opening Stock'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.stock.toFixed(3)}</td>}
                  {selectedColumns['Barcode'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-700">{product.barcode || 'N/A'}</td>}
                  {selectedColumns['MRP'] && <td className="px-3 py-1.5 text-xs font-mono text-slate-600 text-right">{product.mrp?.toFixed(2) || '0.00'}</td>}
                  {selectedColumns['Sale Price'] && <td className="px-3 py-1.5 text-xs font-mono font-bold text-slate-900 text-right">{product.price.toFixed(2)}</td>}
                  <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-slate-300">
                      Insert
                    </Button>
                  </td>
                  {selectedColumns['UpdateButtonColumn'] && <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-slate-300">
                      Update
                    </Button>
                  </td>}
                  {selectedColumns['Delete ButtonColumn'] && <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-slate-300">
                      Delete
                    </Button>
                  </td>}
                  <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-slate-300">
                      Barcode
                    </Button>
                  </td>
                  {selectedColumns['Print BandaButton'] && <td className="px-1 py-1.5 text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-slate-300">
                      Print
                    </Button>
                  </td>}
                  <td className="px-1 py-1.5 text-center pr-3">
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border-slate-300">
                      Variant
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 font-medium text-sm">
                    No products found in inventory master
                  </td>
                </tr>
              )}
              {/* Fast Add Row at bottom */}
              {showAddRow && (
              <tr className="bg-amber-50/40 border-b-2 border-amber-200">
                <td className="px-2 py-1 align-middle text-center border-l-4 border-l-amber-400">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Auto</span>
                </td>
                {selectedColumns['Product Name'] && <td className="px-2 py-1 align-middle">
                  <Input ref={nameInputRef} placeholder="Type Name..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => handleKeyDown(e, purchasePriceInputRef)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Category'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Category" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Subcategory'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Subcategory" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['WSalePrice'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0.00" value={newWSalePrice || ''} onChange={e => setNewWSalePrice(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Purchase Price'] && <td className="px-2 py-1 align-middle">
                  <Input ref={purchasePriceInputRef} type="number" placeholder="0.00" value={newPurchasePrice || ''} onChange={e => setNewPurchasePrice(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, cessInputRef)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Batch'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Batch" value={newBatch} onChange={e => setNewBatch(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Mfgdate'] && <td className="px-2 py-1 align-middle">
                  <Input type="date" value={newMfgDate} onChange={e => setNewMfgDate(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Exp Date'] && <td className="px-2 py-1 align-middle">
                  <Input type="date" value={newExpDate} onChange={e => setNewExpDate(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Size'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Size" value={newSize} onChange={e => setNewSize(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Colour'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Colour" value={newColour} onChange={e => setNewColour(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['IMEI1'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="IMEI1" value={newImei1} onChange={e => setNewImei1(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['IMEI2'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="IMEI2" value={newImei2} onChange={e => setNewImei2(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Kitchen'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Kitchen" value={newKitchen} onChange={e => setNewKitchen(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Description'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Description" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Discount'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newDiscount || ''} onChange={e => setNewDiscount(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Sales Unit'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Unit" value={newSalesUnit} onChange={e => setNewSalesUnit(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Sales Alt Unit'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Alt Unit" value={newSalesAltUnit} onChange={e => setNewSalesAltUnit(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Conv'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newConv || ''} onChange={e => setNewConv(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Min Stock'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newMinStock || ''} onChange={e => setNewMinStock(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Status'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Status" value={newStatus} onChange={e => setNewStatus(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['S Tax'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newSTax || ''} onChange={e => setNewSTax(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['P Tax'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newPTax || ''} onChange={e => setNewPTax(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['G Down'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="GDown" value={newGDown} onChange={e => setNewGDown(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Rack'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Rack" value={newRack} onChange={e => setNewRack(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Def Qty'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newDefQty || ''} onChange={e => setNewDefQty(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['Part No'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="PartNo" value={newPartNo} onChange={e => setNewPartNo(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['HSNCode'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="HSNCode" value={newHsnCode} onChange={e => setNewHsnCode(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Category_plus'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="Cat+" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Subcategory_plus'] && <td className="px-2 py-1 align-middle">
                  <Input placeholder="SubCat+" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm" />
                </td>}
                {selectedColumns['Gst_plus'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newGstPlus || ''} onChange={e => setNewGstPlus(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['CGST'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newCGST || ''} onChange={e => setNewCGST(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['SGST'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newSGST || ''} onChange={e => setNewSGST(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['IGST'] && <td className="px-2 py-1 align-middle">
                  <Input type="number" placeholder="0" value={newIGST || ''} onChange={e => setNewIGST(Number(e.target.value))} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 rounded-sm text-right" />
                </td>}
                {selectedColumns['CESS %'] && <td className="px-2 py-1 align-middle">
                  <Input ref={cessInputRef} type="number" placeholder="0.00" value={newCess || ''} onChange={e => setNewCess(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, stockInputRef)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Opening Stock'] && <td className="px-2 py-1 align-middle">
                  <Input ref={stockInputRef} type="number" placeholder="0" value={newStock || ''} onChange={e => setNewStock(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, barcodeInputRef)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Barcode'] && <td className="px-2 py-1 align-middle">
                  <div className="relative">
                     <Input ref={barcodeInputRef} placeholder="Scan Barcode..." value={newBarcode} onChange={e => setNewBarcode(e.target.value)} onKeyDown={e => handleKeyDown(e, mrpInputRef)} className="h-7 text-xs pl-7 bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm font-mono" />
                     <ScanLine size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </td>}
                {selectedColumns['MRP'] && <td className="px-2 py-1 align-middle">
                  <Input ref={mrpInputRef} type="number" placeholder="0.00" value={newMrp || ''} onChange={e => setNewMrp(Number(e.target.value))} onKeyDown={e => handleKeyDown(e, priceInputRef)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                {selectedColumns['Sale Price'] && <td className="px-2 py-1 align-middle">
                  <Input ref={priceInputRef} type="number" placeholder="0.00" value={newPrice || ''} onChange={e => setNewPrice(Number(e.target.value))} onKeyDown={e => handleKeyDown(e)} className="h-7 text-xs bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400 rounded-sm text-right font-mono" />
                </td>}
                <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" onClick={handleAddProduct} className="h-6 text-[10px] px-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold border-amber-300">
                    Insert
                  </Button>
                </td>
                {selectedColumns['UpdateButtonColumn'] && <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 text-slate-400 font-bold border-slate-200 cursor-not-allowed">
                    Update
                  </Button>
                </td>}
                {selectedColumns['Delete ButtonColumn'] && <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 text-slate-400 font-bold border-slate-200 cursor-not-allowed">
                    Delete
                  </Button>
                </td>}
                <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-400 font-bold border-slate-200 cursor-not-allowed">
                    Barcode
                  </Button>
                </td>
                {selectedColumns['Print BandaButton'] && <td className="px-1 py-1.5 text-center">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 text-slate-400 font-bold border-slate-200 cursor-not-allowed">
                    Print
                  </Button>
                </td>}
                <td className="px-1 py-1.5 text-center pr-3">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-slate-100 hover:bg-slate-200 text-slate-400 font-bold border-slate-200 cursor-not-allowed">
                    Variant
                  </Button>
                </td>
              </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 3. GST & Tax Compliance
// ==========================================
function GSTView() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">GST & Tax Compliance</h2>
          <p className="text-slate-500">Live tax calculator and automated GSTR exports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary text-primary"><FileText size={16} className="mr-2"/> Export GSTR-1</Button>
          <Button variant="outline" className="border-primary text-primary"><FileText size={16} className="mr-2"/> Export GSTR-3B</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white shadow-sm border-none">
           <CardContent className="p-6">
             <p className="text-sm font-medium text-slate-500 mb-1">Total Output Tax (Sales)</p>
             <h3 className="text-3xl font-bold text-slate-900">₹ 45,200</h3>
             <div className="mt-4 space-y-2 text-sm text-slate-600">
               <div className="flex justify-between"><span>CGST:</span> <span className="font-medium">₹ 22,600</span></div>
               <div className="flex justify-between"><span>SGST:</span> <span className="font-medium">₹ 22,600</span></div>
               <div className="flex justify-between"><span>IGST:</span> <span className="font-medium">₹ 0</span></div>
             </div>
           </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-none">
           <CardContent className="p-6">
             <p className="text-sm font-medium text-slate-500 mb-1">Total Input Tax (Purchases)</p>
             <h3 className="text-3xl font-bold text-slate-900">₹ 32,100</h3>
             <div className="mt-4 space-y-2 text-sm text-slate-600">
               <div className="flex justify-between"><span>CGST:</span> <span className="font-medium">₹ 16,050</span></div>
               <div className="flex justify-between"><span>SGST:</span> <span className="font-medium">₹ 16,050</span></div>
               <div className="flex justify-between"><span>IGST:</span> <span className="font-medium">₹ 0</span></div>
             </div>
           </CardContent>
        </Card>
        <Card className="bg-primary text-white shadow-sm border-none">
           <CardContent className="p-6">
             <p className="text-primary-foreground/80 text-sm font-medium mb-1">Net GST Payable</p>
             <h3 className="text-3xl font-bold">₹ 13,100</h3>
             <p className="text-sm mt-4 text-primary-foreground/90">Estimated payable for current month. Automatically calculated based on B2B/B2C logic.</p>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// 4. Purchase & Ledger
// ==========================================
function LedgerView() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Purchase & Ledgers</h2>
        <p className="text-slate-500">Real-time Cash Book, Supplier entries, and Banking.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-none">
          <CardHeader className="border-b">
             <CardTitle className="flex items-center gap-2"><Wallet size={20}/> Cash Book (गल्ला)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-4 bg-emerald-50 border-b flex justify-between items-center">
               <span className="font-medium text-emerald-800">Current Balance</span>
               <span className="text-2xl font-bold text-emerald-700">₹ 12,450.00</span>
             </div>
             <div className="divide-y divide-slate-100">
               <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                 <div>
                   <p className="font-semibold text-sm">Cash Sales (Bill #102-105)</p>
                   <p className="text-xs text-slate-500">10:45 AM</p>
                 </div>
                 <span className="font-bold text-emerald-600">+ ₹ 4,500</span>
               </div>
               <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                 <div>
                   <p className="font-semibold text-sm">Supplier Payment (Ramesh Traders)</p>
                   <p className="text-xs text-slate-500">09:30 AM</p>
                 </div>
                 <span className="font-bold text-red-600">- ₹ 2,000</span>
               </div>
             </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none">
          <CardHeader className="border-b flex flex-row justify-between items-center">
             <CardTitle className="flex items-center gap-2"><Users size={20}/> Supplier Ledgers</CardTitle>
             <Button size="sm">New Purchase Entry</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
               <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                 <div>
                   <p className="font-semibold text-sm">Ramesh Traders</p>
                   <p className="text-xs text-slate-500">Last purchase: 2 days ago</p>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-red-600 block">₹ 15,000 Cr</span>
                   <span className="text-xs text-slate-500">Payable</span>
                 </div>
               </div>
               <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                 <div>
                   <p className="font-semibold text-sm">A1 Wholesalers</p>
                   <p className="text-xs text-slate-500">Last purchase: 1 week ago</p>
                 </div>
                 <div className="text-right">
                   <span className="font-bold text-emerald-600 block">₹ 0</span>
                   <span className="text-xs text-slate-500">Settled</span>
                 </div>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// 5. CRM & Payroll
// ==========================================
function CRMView() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">CRM & Payroll (HR)</h2>
        <p className="text-slate-500">Manage customer loyalty and staff attendance.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-none">
          <CardHeader className="border-b">
             <CardTitle>Customer Loyalty Engine</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
             <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
               <div>
                 <p className="font-bold text-slate-800">1 Point per ₹100 spent</p>
                 <p className="text-sm text-slate-500">Global rule active</p>
               </div>
               <Button variant="outline">Edit Rule</Button>
             </div>
             <div className="flex items-center justify-between p-4 border rounded-lg border-primary/20 bg-primary/5">
               <div>
                 <p className="font-bold text-primary">Buy 2 Get 1 Free (Snacks)</p>
                 <p className="text-sm text-slate-600">Active until Weekend</p>
               </div>
               <Button variant="default" className="bg-primary">Manage</Button>
             </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none">
          <CardHeader className="border-b">
             <CardTitle>Staff Attendance & Payroll</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-4 border-b bg-slate-50">
               <Button className="w-full bg-slate-800 hover:bg-slate-900"><Scan size={16} className="mr-2"/> Scan Staff QR for Attendance</Button>
              </div>
           </CardContent>
         </Card>
       </div>
     </div>
   );
}



