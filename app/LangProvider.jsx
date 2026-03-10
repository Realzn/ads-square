'use client';
// app/LangProvider.jsx — Provider de langue global
// Wraps the entire app via layout.js.
// - Lit/écrit localStorage('ads_lang')
// - Expose LangContext + LangSetterContext à toutes les pages

import { useState, useEffect, useCallback } from 'react';
import { LangContext, LangSetterContext } from '../lib/lang-context';

export default function LangProvider({ children }) {
  const [lang, setLang] = useState('fr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ads_lang');
      if (saved === 'en' || saved === 'fr') setLang(saved);
    } catch {}
  }, []);

  const handleSetLang = useCallback((fn) => {
    setLang(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      try { localStorage.setItem('ads_lang', next); } catch {}
      return next;
    });
  }, []);

  return (
    <LangContext.Provider value={lang}>
      <LangSetterContext.Provider value={handleSetLang}>
        {children}
      </LangSetterContext.Provider>
    </LangContext.Provider>
  );
}
