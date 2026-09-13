import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';

interface SponsoredProduct {
  id: string;
  product_name: string;
  selling_price: number;
  mrp: number | null;
  photo: string | null;
  tenant_id: string;
  brand_name?: string;
  primary_color?: string;
}

export function SponsoredBanner({ onProductClick }: { onProductClick: (product: any, store: any) => void }) {
  const [sponsored, setSponsored] = useState<SponsoredProduct[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSponsored = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: placements } = await supabase
        .from('mart_sponsored_placements')
        .select('*, products(id, product_name, selling_price, mrp, photo, tenant_id)')
        .eq('placement_type', 'sponsored_rail_slot')
        .order('display_order')
        .limit(1);

      if (!placements || placements.length === 0) return;
      const placement = placements[0] as any;
      const product = placement.products;
      if (!product) return;

      const { data: branding } = await supabase
        .from('merchant_branding')
        .select('brand_name, primary_color')
        .eq('merchant_id', product.tenant_id)
        .maybeSingle();

      if (isMounted) {
        setSponsored([{
          ...product,
          brand_name: branding?.brand_name || 'BahiBox Store',
          primary_color: branding?.primary_color || '#3b82f6'
        }]);
      }
    };
    fetchSponsored();
    return () => { isMounted = false; };
  }, []);

  if (sponsored.length === 0) return null;
  const product = sponsored[0];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex items-center gap-4 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onProductClick(product, { tenant_id: product.tenant_id, name: product.brand_name, color: product.primary_color })}
    >
      <span className="absolute top-2 right-2 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Sponsored</span>
      <div className="w-20 h-20 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {product.photo ? (
          <img src={product.photo} alt={product.product_name} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{product.brand_name}</p>
        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{product.product_name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-extrabold" style={{ color: product.primary_color }}>₹{product.selling_price}</span>
          {product.mrp && product.mrp > product.selling_price && (
            <span className="text-sm text-slate-400 line-through">₹{product.mrp}</span>
          )}
        </div>
      </div>
    </div>
  );
}
