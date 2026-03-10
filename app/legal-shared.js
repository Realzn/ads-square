'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLang, useLangSetter } from '../lib/lang-context';

// ─── Design System — partagé avec le dashboard ───────────────────────────
const C = {
  bg:      '#020609',
  surface: '#080e14',
  card:    '#0c1520',
  border:  'rgba(0,180,220,0.10)',
  borderHi:'rgba(0,180,220,0.22)',
  text:    '#e8f0f8',
  muted:   'rgba(160,195,225,0.55)',
  dim:     'rgba(100,145,185,0.35)',
  cyan:    '#00C8E4',
  gold:    '#E8A020',
  green:   '#00D880',
  rose:    '#E03558',
};

const T = {
  h:    "'Rajdhani', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

// ─── SITE HEADER ─────────────────────────────────────────────────────────
export function SiteHeader({ back = '/', backLabel = '← Grille' }) {
  const [hov, setHov] = useState(false);
  const lang = useLang();
  const setLang = useLangSetter();

  const navLinks = lang === 'fr'
    ? [['/', 'Grille'], ['/faq', 'FAQ'], ['/dashboard', 'Dashboard']]
    : [['/', 'Grid'], ['/faq', 'FAQ'], ['/dashboard', 'Dashboard']];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: C.surface + 'f8',
      backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`,
      height: 52,
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        padding: '0 24px', height: '100%',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ color: C.gold, fontSize: 18, lineHeight: 1 }}>◈</span>
          <span style={{ color: C.gold, fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '.16em' }}>
            DYSON·COSMOS
          </span>
        </Link>

        <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />

        <div style={{ flex: 1 }} />

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href} style={{
              padding: '5px 12px', borderRadius: 7,
              color: C.muted, fontSize: 12, fontFamily: T.mono,
              fontWeight: 600, letterSpacing: '.06em',
              border: '1px solid transparent',
              transition: 'all .14s',
            }}
              onMouseEnter={e => { e.target.style.color = C.text; e.target.style.borderColor = C.border; }}
              onMouseLeave={e => { e.target.style.color = C.muted; e.target.style.borderColor = 'transparent'; }}>
              {label}
            </Link>
          ))}

          {/* Lang toggle */}
          <button
            onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.cyan,
              fontSize: 10,
              fontFamily: T.mono,
              fontWeight: 700,
              letterSpacing: '.1em',
              cursor: 'pointer',
            }}
          >{lang === 'fr' ? 'EN' : 'FR'}</button>

          <Link href="/dashboard/login" style={{
            padding: '6px 14px', borderRadius: 8,
            background: C.gold, color: '#0a0600',
            fontSize: 12, fontFamily: T.mono, fontWeight: 700,
            letterSpacing: '.08em', flexShrink: 0,
          }}>
            {lang === 'fr' ? 'Accès' : 'Access'}
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─── SITE FOOTER ─────────────────────────────────────────────────────────
export function SiteFooter() {
  const lang = useLang();

  const platformLinks = lang === 'fr'
    ? [['/', 'Grille 3D'], ['/faq', 'FAQ'], ['/dashboard', 'Dashboard annonceur']]
    : [['/', '3D Grid'], ['/faq', 'FAQ'], ['/dashboard', 'Advertiser Dashboard']];

  const legalLinks = lang === 'fr'
    ? [['/cgv', 'CGV'], ['/privacy', 'Confidentialité'], ['/legal', 'Mentions légales']]
    : [['/cgv', 'T&C'], ['/privacy', 'Privacy'], ['/legal', 'Legal notice']];

  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      background: C.surface,
      padding: '32px 24px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', marginBottom: 28 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ color: C.gold, fontSize: 16 }}>◈</span>
              <span style={{ color: C.gold, fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '.18em' }}>DYSON·COSMOS</span>
            </div>
            <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.7, maxWidth: 220 }}>
              {lang === 'fr'
                ? "La grille publicitaire ouverte. Dès 1€/jour, votre message dans l'orbite."
                : "The open advertising grid. From €1/day, your message in orbit."}
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: C.dim, fontFamily: T.mono, fontSize: 9, letterSpacing: '.14em', fontWeight: 700, marginBottom: 12 }}>
                {lang === 'fr' ? 'PLATEFORME' : 'PLATFORM'}
              </div>
              {platformLinks.map(([h, l]) => (
                <Link key={h} href={h} style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 8 }}>{l}</Link>
              ))}
            </div>
            <div>
              <div style={{ color: C.dim, fontFamily: T.mono, fontSize: 9, letterSpacing: '.14em', fontWeight: 700, marginBottom: 12 }}>
                {lang === 'fr' ? 'LÉGAL' : 'LEGAL'}
              </div>
              {legalLinks.map(([h, l]) => (
                <Link key={h} href={h} style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 8 }}>{l}</Link>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ color: C.dim, fontSize: 12, fontFamily: T.mono }}>© 2026 ADS-SQUARE · LE91-ARENA SAS</span>
          <span style={{ color: C.dim, fontSize: 11, fontFamily: T.mono }}>GALACTIC·ADV·GRID · v2.0</span>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE SHELL — pour FAQ, CGV, Privacy, Legal ──────────────────────────
export function PageShell({ children, title, subtitle, badge }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: T.h, color: C.text,
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,180,220,0.18); border-radius: 4px; }
        a { color: ${C.cyan}; text-decoration: none; } a:hover { opacity: .8; }
      `}</style>

      <SiteHeader />

      {/* Page hero */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: 'clamp(28px, 5vw, 56px) 24px clamp(24px, 4vw, 48px)',
        background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 20, marginBottom: 14,
              background: C.gold + '14', border: `1px solid ${C.gold}30`,
              color: C.gold, fontSize: 10, fontFamily: T.mono, fontWeight: 700, letterSpacing: '.12em',
            }}>
              ◈ {badge}
            </div>
          )}
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 700,
            fontFamily: T.h, letterSpacing: '.02em',
            color: C.text, margin: '0 0 10px',
          }}>{title}</h1>
          {subtitle && (
            <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, maxWidth: 580, margin: 0 }}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: 'clamp(28px, 5vw, 56px) 24px clamp(40px, 8vw, 80px)' }}>
        {children}
      </div>

      <SiteFooter />
    </div>
  );
}

// ─── ATOMS partagés ──────────────────────────────────────────────────────
export function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      {title && (
        <h2 style={{
          fontFamily: T.h, fontSize: 20, fontWeight: 700,
          color: C.text, margin: '0 0 20px',
          paddingBottom: 12, borderBottom: `1px solid ${C.border}`,
          letterSpacing: '.04em',
        }}>{title}</h2>
      )}
      {children}
    </section>
  );
}

export function P({ children }) {
  return (
    <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' }}>{children}</p>
  );
}

export function Highlight({ children }) {
  return (
    <strong style={{ color: C.gold, fontWeight: 700 }}>{children}</strong>
  );
}

export function Tag({ children }) {
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 5,
      background: C.gold + '14', border: `1px solid ${C.gold}25`,
      color: C.gold, fontSize: 11, fontFamily: T.mono, fontWeight: 700,
      letterSpacing: '.06em', margin: '0 2px',
    }}>{children}</span>
  );
}

// Design tokens exported for pages that need them directly
export { C, T };


// ─── Design System — partagé avec le dashboard ───────────────────────────
const C = {
  bg:      '#020609',
  surface: '#080e14',
  card:    '#0c1520',
  border:  'rgba(0,180,220,0.10)',
  borderHi:'rgba(0,180,220,0.22)',
  text:    '#e8f0f8',
  muted:   'rgba(160,195,225,0.55)',
  dim:     'rgba(100,145,185,0.35)',
  cyan:    '#00C8E4',
  gold:    '#E8A020',
  green:   '#00D880',
  rose:    '#E03558',
};

const T = {
  h:    "'Rajdhani', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

// ─── SITE HEADER ─────────────────────────────────────────────────────────
export function SiteHeader({ back = '/', backLabel = '← Grille' }) {
  const [hov, setHov] = useState(false);
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: C.surface + 'f8',
      backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`,
      height: 52,
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        padding: '0 24px', height: '100%',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ color: C.gold, fontSize: 18, lineHeight: 1 }}>◈</span>
          <span style={{ color: C.gold, fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '.16em' }}>
            DYSON·COSMOS
          </span>
        </Link>

        <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />

        <div style={{ flex: 1 }} />

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            ['/', 'Grille'],
            ['/faq', 'FAQ'],
            ['/dashboard', 'Dashboard'],
          ].map(([href, label]) => (
            <Link key={href} href={href} style={{
              padding: '5px 12px', borderRadius: 7,
              color: C.muted, fontSize: 12, fontFamily: T.mono,
              fontWeight: 600, letterSpacing: '.06em',
              border: '1px solid transparent',
              transition: 'all .14s',
            }}
              onMouseEnter={e => { e.target.style.color = C.text; e.target.style.borderColor = C.border; }}
              onMouseLeave={e => { e.target.style.color = C.muted; e.target.style.borderColor = 'transparent'; }}>
              {label}
            </Link>
          ))}
          <Link href="/dashboard/login" style={{
            padding: '6px 14px', borderRadius: 8,
            background: C.gold, color: '#0a0600',
            fontSize: 12, fontFamily: T.mono, fontWeight: 700,
            letterSpacing: '.08em', flexShrink: 0,
          }}>
            Accès
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─── SITE FOOTER ─────────────────────────────────────────────────────────
export function SiteFooter() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      background: C.surface,
      padding: '32px 24px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', marginBottom: 28 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ color: C.gold, fontSize: 16 }}>◈</span>
              <span style={{ color: C.gold, fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: '.18em' }}>DYSON·COSMOS</span>
            </div>
            <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.7, maxWidth: 220 }}>
              La grille publicitaire ouverte. Dès 1€/jour, votre message dans l'orbite.
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: C.dim, fontFamily: T.mono, fontSize: 9, letterSpacing: '.14em', fontWeight: 700, marginBottom: 12 }}>PLATEFORME</div>
              {[['/', 'Grille 3D'], ['/faq', 'FAQ'], ['/dashboard', 'Dashboard annonceur']].map(([h, l]) => (
                <Link key={h} href={h} style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 8 }}>{l}</Link>
              ))}
            </div>
            <div>
              <div style={{ color: C.dim, fontFamily: T.mono, fontSize: 9, letterSpacing: '.14em', fontWeight: 700, marginBottom: 12 }}>LÉGAL</div>
              {[['/cgv', 'CGV'], ['/privacy', 'Confidentialité'], ['/legal', 'Mentions légales']].map(([h, l]) => (
                <Link key={h} href={h} style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 8 }}>{l}</Link>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ color: C.dim, fontSize: 12, fontFamily: T.mono }}>© 2026 ADS-SQUARE · LE91-ARENA SAS</span>
          <span style={{ color: C.dim, fontSize: 11, fontFamily: T.mono }}>GALACTIC·ADV·GRID · v2.0</span>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE SHELL — pour FAQ, CGV, Privacy, Legal ──────────────────────────
export function PageShell({ children, title, subtitle, badge }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: T.h, color: C.text,
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,180,220,0.18); border-radius: 4px; }
        a { color: ${C.cyan}; text-decoration: none; } a:hover { opacity: .8; }
      `}</style>

      <SiteHeader />

      {/* Page hero */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: 'clamp(28px, 5vw, 56px) 24px clamp(24px, 4vw, 48px)',
        background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 20, marginBottom: 14,
              background: C.gold + '14', border: `1px solid ${C.gold}30`,
              color: C.gold, fontSize: 10, fontFamily: T.mono, fontWeight: 700, letterSpacing: '.12em',
            }}>
              ◈ {badge}
            </div>
          )}
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 700,
            fontFamily: T.h, letterSpacing: '.02em',
            color: C.text, margin: '0 0 10px',
          }}>{title}</h1>
          {subtitle && (
            <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, maxWidth: 580, margin: 0 }}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: 'clamp(28px, 5vw, 56px) 24px clamp(40px, 8vw, 80px)' }}>
        {children}
      </div>

      <SiteFooter />
    </div>
  );
}

// ─── ATOMS partagés ──────────────────────────────────────────────────────
export function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      {title && (
        <h2 style={{
          fontFamily: T.h, fontSize: 20, fontWeight: 700,
          color: C.text, margin: '0 0 20px',
          paddingBottom: 12, borderBottom: `1px solid ${C.border}`,
          letterSpacing: '.04em',
        }}>{title}</h2>
      )}
      {children}
    </section>
  );
}

export function P({ children }) {
  return (
    <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' }}>{children}</p>
  );
}

export function Highlight({ children }) {
  return (
    <strong style={{ color: C.gold, fontWeight: 700 }}>{children}</strong>
  );
}

export function Tag({ children }) {
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 5,
      background: C.gold + '14', border: `1px solid ${C.gold}25`,
      color: C.gold, fontSize: 11, fontFamily: T.mono, fontWeight: 700,
      letterSpacing: '.06em', margin: '0 2px',
    }}>{children}</span>
  );
}

// Design tokens exported for pages that need them directly
export { C, T };
