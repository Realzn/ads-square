'use client';
// app/SkipLink.js — Skip-link d'accessibilité (Client Component requis pour onFocus/onBlur)

export default function SkipLink() {
  const getLabel = () => {
    try {
      return localStorage.getItem('ads_lang') === 'en'
        ? 'Skip to main content'
        : 'Aller au contenu principal';
    } catch {
      return 'Aller au contenu principal';
    }
  };

  return (
    <a
      href="#main-content"
      style={{
        position: 'fixed',
        top: -999,
        left: -999,
        zIndex: 9999,
        padding: '8px 16px',
        background: '#E8A020',
        color: '#01020A',
        fontWeight: 700,
        fontSize: 13,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)',
        transition: 'top 0.1s, left 0.1s',
        outline: 'none',
      }}
      onFocus={(e) => {
        e.target.style.top = '8px';
        e.target.style.left = '8px';
        e.target.textContent = getLabel();
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