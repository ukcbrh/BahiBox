import React from 'react';

interface MartCategory {
  id: string;
  category_name: string;
  icon_url: string | null;
}

export function CategoryQuickNav({
  categories,
  selectedCategoryId,
  onSelectCategory
}: {
  categories: MartCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="border-b border-white/20 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-5 overflow-x-auto pb-3 pt-1 scrollbar-hide">
        <button
          onClick={() => onSelectCategory(null)}
          className={`text-sm font-semibold whitespace-nowrap pb-1 border-b-2 flex-shrink-0 ${
            selectedCategoryId === null
              ? 'text-white border-white'
              : 'text-white/70 border-transparent hover:text-white'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`text-sm font-semibold whitespace-nowrap pb-1 border-b-2 flex-shrink-0 ${
              selectedCategoryId === cat.id
                ? 'text-white border-white'
                : 'text-white/70 border-transparent hover:text-white'
            }`}
          >
            {cat.category_name}
          </button>
        ))}
      </div>
    </div>
  );
}
