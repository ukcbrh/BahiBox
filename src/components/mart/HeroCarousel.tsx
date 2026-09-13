import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase';

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_type: string;
  link_value: string | null;
  display_order: number;
}

export function HeroCarousel({ onCategoryClick }: { onCategoryClick?: (categoryId: string) => void }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchBanners = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('mart_banners')
        .select('*')
        .order('display_order');
      if (isMounted && data) setBanners(data);
    };
    fetchBanners();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[currentIndex];

  const handleClick = () => {
    if (banner.link_type === 'category' && banner.link_value && onCategoryClick) {
      onCategoryClick(banner.link_value);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm">
      <img
        src={banner.image_url}
        alt={banner.title || 'Promotional banner'}
        className="w-full h-40 md:h-64 object-cover cursor-pointer"
        onClick={handleClick}
      />
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
