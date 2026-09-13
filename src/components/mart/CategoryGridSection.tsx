import React from 'react';

interface RailProduct {
  id: string;
  photo: string | null;
  mart_category_id: string | null;
}

interface MartCategory {
  id: string;
  category_name: string;
}

export function CategoryGridSection({
  categories,
  productsByCategory,
  onCategoryClick
}: {
  categories: MartCategory[];
  productsByCategory: Record<string, RailProduct[]>;
  onCategoryClick: (categoryId: string) => void;
}) {
  const categoriesWithProducts = categories.filter(
    cat => (productsByCategory[cat.id] || []).length > 0
  );

  if (categoriesWithProducts.length === 0) return null;

  const gridGroups: MartCategory[][] = [];
  for (let i = 0; i < categoriesWithProducts.length; i += 4) {
    gridGroups.push(categoriesWithProducts.slice(i, i + 4));
  }

  return (
    <div className="space-y-6">
      {gridGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {group.map(cat => {
            const catProducts = (productsByCategory[cat.id] || []).slice(0, 4);
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
                  {cat.category_name}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {catProducts.map(p => (
                    <div
                      key={p.id}
                      className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center"
                    >
                      {p.photo ? (
                        <img src={p.photo} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - catProducts.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-lg" />
                  ))}
                </div>
                <p className="text-xs font-semibold text-blue-600 mt-3">See more</p>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
