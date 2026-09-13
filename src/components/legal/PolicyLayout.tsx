import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Languages } from 'lucide-react';

export function PolicyLayout({
  titleEn,
  titleHi,
  lastUpdated,
  children
}: {
  titleEn: string;
  titleHi: string;
  lastUpdated: string;
  children: (lang: 'en' | 'hi') => React.ReactNode;
}) {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-2">
            <img src="/logolight.png" alt="BahiBox" className="h-7 dark:hidden object-contain" />
            <img src="/logodark.png" alt="BahiBox" className="h-7 hidden dark:block object-contain" />
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <Languages size={14} /> {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
          {lang === 'en' ? titleEn : titleHi}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          {lang === 'en' ? 'Last updated' : 'अंतिम अद्यतन'}: {lastUpdated}
        </p>
        <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed">
          {children(lang)}
        </div>
      </div>
    </div>
  );
}
