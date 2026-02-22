'use client';
// app/SkipLink.js — Skip-link d'accessibilité (Client Component requis pour onFocus/onBlur)

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      style={{
        position: 'fixed',
        top: -999,
        left: -999,
        zIndex: 9999,
        padding: '8px 16px',
        background: '#f0b429',
        color: '#080808',
        fontWeight: 700,
        borderRadius: 6,
        textDecoration: 'none',
        fontSize: 14,
        fontFamily: "'DM Sans', sans-serif",
        transition: 'top 0.1s, left 0.1s',
      }}
      onFocus={(e) => {
        e.target.style.top = '8px';
        e.target.style.left = '8px';
      }}
      onBlur={(e) => {
        e.target.style.top = '-999px';
        e.target.style.left = '-999px';
      }}
    >
      Aller au contenu principal
    </a>
  );
}
