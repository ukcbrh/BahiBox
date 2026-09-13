import React, { useState } from 'react';
import { ArrowLeft, Package, Store, Search } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export function CategoryFullListView({
  categoryName,
  products,
  onBack,
  onProductClick,
  onSellerClick,
  addToCart
}: {
  categoryName: string;
  products: any[];
  onBack: () => void;
  onProductClick: (product: any) => void;
  onSellerClick: (store: any) => void;
  addToCart: (product: any) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    (p.product_name || p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" className="h-8 w-8 p-0 rounded-full">
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{categoryName}</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder={`Search in ${categoryName}...`}
          className="pl-10 h-10 bg-white dark:bg-slate-950 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {filtered.map(product => {
            const isOutOfStock = product.stock === 0;
            const displayName = product.product_name || product.name || 'Unknown Product';
            const displayPrice = product.selling_price || product.price || 0;
            const sellerName = product.store?.brand_name || product.store?.branch_name || 'BahiBox Store';
            return (
              <Card
                key={product.uniqueKey || product.id}
                className={`border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl flex flex-col h-full cursor-pointer hover:shadow-md transition-shadow ${isOutOfStock ? 'opacity-60 grayscale-[0.5]' : ''}`}
                onClick={() => onProductClick(product)}
              >
                <div className="h-32 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                  {product.photo ? (
                    <img src={product.photo} alt={displayName} className="w-full h-full object-contain" />
                  ) : (
                    <Package size={48} className="text-slate-300" />
                  )}
                </div>
                <CardContent className="p-3 flex flex-col flex-1">
                  <div className="flex-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSellerClick(product.store); }}
                      className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1 line-clamp-1 hover:text-blue-600 hover:underline w-fit"
                    >
                      <Store size={10} /> {sellerName}
                    </button>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight mb-1">{displayName}</h3>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm" style={{ color: '#2563eb' }}>₹{displayPrice}</span>
                      {product.mrp && product.mrp > displayPrice && (
                        <span className="text-xs text-slate-400 line-through">₹{product.mrp}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs font-bold rounded-lg"
                      style={{ backgroundColor: isOutOfStock ? '#94a3b8' : '#2563eb', color: '#fff' }}
                      disabled={isOutOfStock}
                      onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) addToCart(product); }}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No products found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your search.</p>
        </div>
      )}
    </div>
  );
}
