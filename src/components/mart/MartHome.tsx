import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { HeroCarousel } from './HeroCarousel';
import { CategoryQuickNav } from './CategoryQuickNav';
import { ProductRail } from './ProductRail';
import { SponsoredBanner } from './SponsoredBanner';
import { CategoryGridSection } from './CategoryGridSection';
import { CategoryFullListView } from './CategoryFullListView';

interface MartCategory {
  id: string;
  category_name: string;
  icon_url: string | null;
  display_order: number;
}

interface SponsoredItem {
  id: string;
  mart_category_id: string | null;
  photo: string | null;
  product_name: string;
  selling_price: number;
  mrp: number | null;
  stock: number;
  store: any;
  uniqueKey?: string;
}

export function MartHome({
  marketplaceProducts,
  onProductClick,
  onSellerClick,
  addToCart,
  externalSelectedCategoryId
}: {
  marketplaceProducts: any[];
  onProductClick: (product: any) => void;
  onSellerClick: (store: any) => void;
  addToCart: (product: any) => void;
  externalSelectedCategoryId?: string | null;
}) {
  const [martCategories, setMartCategories] = useState<MartCategory[]>([]);
  const [sponsoredPlacements, setSponsoredPlacements] = useState<{ product_id: string; display_order: number }[]>([]);
  const [fullListCategory, setFullListCategory] = useState<MartCategory | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('mart_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (isMounted && data) setMartCategories(data);
    };
    fetchCategories();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchSponsored = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('mart_sponsored_placements')
        .select('product_id, display_order')
        .eq('placement_type', 'homepage_featured')
        .eq('is_active', true)
        .in('payment_status', ['paid', 'waived'])
        .order('display_order');
      if (isMounted && data) setSponsoredPlacements(data);
    };
    fetchSponsored();
    return () => { isMounted = false; };
  }, []);

  const sponsoredProductsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const seen = new Set<string>();
    sponsoredPlacements.forEach(placement => {
      if (seen.has(placement.product_id)) return;
      const match = marketplaceProducts.find(p => p.id === placement.product_id);
      if (!match) return;
      seen.add(placement.product_id);
      const catId = match.mart_category_id || 'uncategorized';
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(match);
    });
    return grouped;
  }, [marketplaceProducts, sponsoredPlacements]);

  const handleCategoryClick = (categoryId: string) => {
    const cat = martCategories.find(c => c.id === categoryId);
    if (cat) setFullListCategory(cat);
  };

  useEffect(() => {
    if (externalSelectedCategoryId) {
      handleCategoryClick(externalSelectedCategoryId);
    }
  }, [externalSelectedCategoryId]);

  const categoriesToShow = martCategories;

  if (fullListCategory) {
    const catProducts = marketplaceProducts.filter(p => p.mart_category_id === fullListCategory.id);
    return (
      <CategoryFullListView
        categoryName={fullListCategory.category_name}
        products={catProducts}
        onBack={() => setFullListCategory(null)}
        onProductClick={onProductClick}
        onSellerClick={onSellerClick}
        addToCart={addToCart}
      />
    );
  }

  return (
    <div className="space-y-8">
      <HeroCarousel onCategoryClick={handleCategoryClick} />
      <CategoryGridSection
        categories={martCategories}
        productsByCategory={sponsoredProductsByCategory}
        onCategoryClick={handleCategoryClick}
      />
      {categoriesToShow.map((cat, idx) => {
        const catProducts = sponsoredProductsByCategory[cat.id] || [];
        if (catProducts.length === 0) return null;
        return (
          <React.Fragment key={cat.id}>
            <div id={`mart-category-${cat.id}`}>
              <ProductRail
                title={cat.category_name}
                products={catProducts.slice(0, 10)}
                onProductClick={onProductClick}
                onSellerClick={onSellerClick}
                onSeeAllClick={() => handleCategoryClick(cat.id)}
                addToCart={addToCart}
              />
            </div>
            {idx === 1 && <SponsoredBanner onProductClick={onProductClick} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
