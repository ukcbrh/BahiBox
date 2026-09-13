import React, { useState } from 'react';
import { ArrowLeft, MapPin, Search, Star } from 'lucide-react';

export function MartMarketplaceView() {
  const [activeTab, setActiveTab] = useState<'shop' | 'product'>('shop');

  const featuredShops = [
    { name: 'Kirana Store', rating: '4.3', time: '25 min', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Store' },
    { name: 'Medical Store', rating: '4.5', time: '30 min', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Medical' },
    { name: 'Mobile Shop', rating: '4.1', time: '35 min', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Mobile' },
    { name: 'Bakery', rating: '4.4', time: '20 min', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Bakery' },
  ];

  const popularProducts = [
    { name: 'Amul Milk - 1L', price: '₹62', qty: '1L', rating: '4.2', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Milk' },
    { name: 'Tata Salt - 1kg', price: '₹24', qty: '1kg', rating: '4.4', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Salt' },
    { name: 'Parle-G Biscuit - 100g', price: '₹10', qty: '100g', rating: '4.1', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Biscuit' },
    { name: 'Lifebuoy Soap - 125g', price: '₹40', qty: '125g', rating: '4.3', image: 'https://placehold.co/100x100/e2e8f0/64748b?text=Soap' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-[#003B95] px-4 pt-12 pb-6 text-white rounded-b-[24px]">
        <div className="flex items-start gap-3">
          <ArrowLeft size={24} className="text-white mt-1 cursor-pointer" />
          <div className="flex flex-col">
            <h1 className="text-[22px] font-bold leading-tight">Apna Bahraich</h1>
            <div className="flex items-center text-[13px] mt-1 text-white/90">
              <MapPin size={14} className="mr-1" />
              <span>Bahraich, UP</span>
              <span className="mx-1.5">•</span>
              <span className="text-[#ea580c] font-semibold underline cursor-pointer">Change</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Overlapping Header */}
      <div className="px-4 -mt-5 relative z-10">
        <div className="relative shadow-sm rounded-xl overflow-hidden bg-white border border-slate-200">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3.5 border-none focus:ring-0 text-[15px] placeholder-slate-400 bg-white"
            placeholder="Search for shops, products, brands..."
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-5 flex gap-2">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border ${
            activeTab === 'shop'
              ? 'bg-[#ea580c] text-white border-[#ea580c]'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          Search by Shop / दुकान से खोजें
        </button>
        <button
          onClick={() => setActiveTab('product')}
          className={`flex-1 py-2.5 px-2 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors border ${
            activeTab === 'product'
              ? 'bg-[#ea580c] text-white border-[#ea580c]'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          Search by Product / प्रोडक्ट से खोजें
        </button>
      </div>

      <div className="pb-20">
        {/* Featured Shops */}
        <div className="px-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[19px] font-bold text-slate-900">Featured Shops</h2>
            <span className="text-[#ea580c] font-bold text-[15px] flex items-center cursor-pointer">
              › See All
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {featuredShops.map((shop, i) => (
              <div key={i} className="bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 mb-3 overflow-hidden flex-shrink-0">
                  <img src={shop.image} alt={shop.name} className="w-full h-full object-contain" />
                </div>
                <h3 className="font-bold text-slate-900 text-[16px] mb-1.5 leading-tight">{shop.name}</h3>
                <div className="flex items-center text-slate-600 text-[13px] mb-2.5 font-medium">
                  <Star size={13} className="text-slate-500 mr-1" />
                  <span>{shop.rating}</span>
                  <span className="mx-1.5">•</span>
                  <span>{shop.time}</span>
                </div>
                <div className="bg-[#ecfdf5] text-[#059669] text-[12px] font-bold px-2.5 py-1 rounded-full flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mr-1.5"></span>
                  Open • Now
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Products */}
        <div className="px-4 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[19px] font-bold text-slate-900">Popular Products</h2>
            <span className="text-[#ea580c] font-bold text-[15px] cursor-pointer">
              See All
            </span>
          </div>
          
          <div className="space-y-3">
            {popularProducts.map((product, i) => (
              <div key={i} className="bg-white p-3 rounded-[16px] border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-[60px] h-[60px] rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 p-1">
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                </div>
                
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="font-bold text-slate-900 text-[16px] mb-1 truncate">{product.name}</h3>
                  <div className="flex items-center text-slate-500 text-[13px] font-medium">
                    <span className="text-slate-800">{product.price}</span>
                    <span className="mx-1.5">•</span>
                    <span>{product.qty}</span>
                    <span className="mx-1.5">•</span>
                    <Star size={12} className="text-slate-400 mr-1" />
                    <span>{product.rating}</span>
                  </div>
                </div>
                
                <button className="flex-shrink-0 border-[1.5px] border-[#ea580c] text-[#ea580c] font-bold text-[14px] px-4 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">
                  +ADD
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
