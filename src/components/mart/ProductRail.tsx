import React from 'react';
import { Package, Store } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

interface RailProduct {
  id: string;
  product_name: string;
  name?: string;
  selling_price: number;
  price?: number;
  mrp: number | null;
  photo: string | null;
  unit_display?: string;
  stock?: number;
  store: {
    tenant_id: string;
    id: string;
    brand_name?: string;
    branch_name?: string;
    logo_url?: string;
    primary_color?: string;
  };
  uniqueKey?: string;
}

export function ProductRail({
  title,
  subtitle,
  products,
  onProductClick,
  onSellerClick,
  onSeeAllClick,
  addToCart
}: {
  title: string;
  subtitle?: string;
  products: RailProduct[];
  onProductClick: (product: any) => void;
  onSellerClick: (store: any) => void;
  onSeeAllClick?: () => void;
  addToCart: (product: any) => void;
}) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {onSeeAllClick && (
          <button onClick={onSeeAllClick} className="text-sm font-semibold text-blue-600 hover:underline flex-shrink-0">
            See all
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {products.map(product => {
          const isOutOfStock = product.stock === 0;
          const displayName = product.product_name || product.name || 'Unknown Product';
          const displayPrice = product.selling_price || product.price || 0;
          const sellerName = product.store?.brand_name || product.store?.branch_name || 'BahiBox Store';

          return (
            <Card
              key={product.uniqueKey || product.id}
              className="flex-shrink-0 w-40 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl flex flex-col cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onProductClick(product)}
            >
              <div className="h-32 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-3 relative">
                {product.photo ? (
                  <img src={product.photo} alt={displayName} className="w-full h-full object-contain" />
                ) : (
                  <Package size={32} className="text-slate-300" />
                )}
                {isOutOfStock && (
                  <span className="absolute top-2 left-2 bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Out of Stock</span>
                )}
              </div>
              <CardContent className="p-3 flex flex-col flex-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onSellerClick(product.store); }}
                  className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1 line-clamp-1 hover:text-blue-600 hover:underline w-fit"
                >
                  <Store size={9} /> {sellerName}
                </button>
                <h3 className="font-semibold text-xs line-clamp-2 leading-tight flex-1 text-slate-800 dark:text-slate-200">{displayName}</h3>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-sm" style={{ color: product.store?.primary_color || '#3b82f6' }}>₹{displayPrice}</span>
                  {product.mrp && product.mrp > displayPrice && (
                    <span className="text-[10px] text-slate-400 line-through">₹{product.mrp}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={isOutOfStock}
                  onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) addToCart(product); }}
                  className="w-full mt-2 h-7 text-[11px] font-bold rounded-lg"
                  style={{ backgroundColor: isOutOfStock ? '#94a3b8' : (product.store?.primary_color || '#3b82f6'), color: '#fff' }}
                >
                  {isOutOfStock ? 'Out of Stock' : 'Add'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
