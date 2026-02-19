'use client';
import { useState } from 'react';

// Shared styles for static pages (legal, FAQ, etc.)
export const U = {
  bg: '#080808', s1: '#0f0f0f', s2: '#151515', card: '#1a1a1a',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)', faint: 'rgba(255,255,255,0.04)',
  accent: '#d4a84b', accentFg: '#080808', err: '#ff5555',
};
export const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
};

export function PageShell({ children, title, subtitle }) {
  const [lang, setLang] = useState('fr');

  return (
    <div style={{ minHeight: '100vh', background: U.bg, fontFamily: F.b, color: U.text }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${U.border}`, background: U.s1, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(14px)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="1" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5"/>
              <rect x="12" y="1" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5" opacity="0.5"/>
              <rect x="1" y="12" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5" opacity="0.5"/>
              <rect x="12" y="12" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5" opacity="0.25"/>
            </svg>
            <span style={{ color: U.text, fontWeight: 700, fontSize: 16, fontFamily: F.h, letterSpacing: '-0.02em' }}>
              ADS<span style={{ color: U.accent }}>·</span>SQUARE
            </span>
          </a>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              style={{ padding: '4px 9px', borderRadius: 7, fontFamily: F.b, cursor: 'pointer', background: U.faint, border: `1px solid ${U.border2}`, color: U.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            <a href="/" style={{ color: U.muted, fontSize: 12, textDecoration: 'none', padding: '5px 12px', borderRadius: 7, border: `1px solid ${U.border}` }}>
              {lang === 'fr' ? '← Retour' : '← Back'}
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ borderBottom: `1px solid ${U.border}`, padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontFamily: F.h, fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 10px', color: U.text }}>{title}</h1>
          {subtitle && <p style={{ color: U.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>{subtitle}</p>}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        {children}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${U.border}`, padding: '28px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: U.muted, fontSize: 12 }}>© 2026 ADS-SQUARE · LE91-ARENA SAS</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['/', lang === 'fr' ? 'Accueil' : 'Home'], ['/legal', lang === 'fr' ? 'Mentions légales' : 'Legal'], ['/cgv', 'CGV'], ['/privacy', lang === 'fr' ? 'Confidentialité' : 'Privacy'], ['/faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} style={{ color: U.muted, fontSize: 12, textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      {title && <h2 style={{ fontFamily: F.h, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: U.text, margin: '0 0 20px', paddingBottom: 12, borderBottom: `1px solid ${U.border}` }}>{title}</h2>}
      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

