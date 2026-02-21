'use client';
import { useState, useMemo, useCallback, useRef, useEffect, memo, createContext, useContext } from 'react';
import {
  D, FF, GRID_COLS, GRID_ROWS, CENTER_X, CENTER_Y,
  TIER_SIZE, TIER_COLOR, TIER_LABEL, TIER_PRICE, PROFILES,
  buildStructuralGrid, buildDemoGrid, mergeGridWithBookings,
  isTierAvailable,
} from '../lib/grid';
import {
  isSupabaseConfigured, fetchActiveSlots,
  subscribeToBookings, createCheckoutSession,
  fetchSlotStats, submitBuyoutOffer, recordClick,
} from '../lib/supabase';
import { getSession, signOut } from '../lib/supabase-auth';
import { getT } from '../lib/i18n';

// ─── Language context ─────────────────────────────────────────
const LangContext = createContext('fr');
function useLang() { return useContext(LangContext); }
function useT() { const lang = useLang(); return getT(lang); }

// ─── UI Design System (overrides neon D tokens for chrome) ────
const U = {
  bg:     '#080808',
  s1:     '#0f0f0f',
  s2:     '#151515',
  card:   '#1a1a1a',
  border: 'rgba(255,255,255,0.07)',
  border2:'rgba(255,255,255,0.13)',
  text:   '#f0f0f0',
  muted:  'rgba(255,255,255,0.36)',
  faint:  'rgba(255,255,255,0.04)',
  accent: '#d4a84b',      // single warm gold — the one accent
  accentFg: '#080808',
  err:    '#e05252',
};
const F = {
  h: "'Clash Display','Syne',sans-serif",
  b: "'DM Sans','Inter',sans-serif",
};

// ─── Theme categories ─────────────────────────────────────────
const THEMES = [
  { id: 'all',      label: 'Tous',         icon: '◈', color: null },
  { id: 'video',    label: 'Vidéo',        icon: '▶', color: '#e53935', match: (t,n)   => t === 'video' },
  { id: 'image',    label: 'Image',        icon: '◻', color: '#8e24aa', match: (t,n)   => t === 'image' },
  { id: 'link',     label: 'Liens',        icon: '⌖', color: '#1e88e5', match: (t,n)   => t === 'link' },
  { id: 'social',   label: 'Réseaux',      icon: '⊕', color: '#00acc1', match: (t,n)   => ['snapchat','instagram','tiktok','x.com','twitter','facebook','linkedin','meta'].some(s => n?.toLowerCase().includes(s)) },
  { id: 'music',    label: 'Musique',      icon: '♪', color: '#1ed760', match: (t,n)   => ['spotify','music','apple music','deezer','soundcloud','artiste','artist'].some(s => n?.toLowerCase().includes(s)) },
  { id: 'app',      label: 'App',          icon: '⬡', color: '#43a047', match: (t,n,u) => t === 'app' || ['play.google','apps.apple'].some(s => u?.includes(s)) },
  { id: 'brand',    label: 'Marque',       icon: '⬟', color: '#f0b429', match: (t,n)   => t === 'brand' },
  { id: 'clothing', label: 'Vêtements',    icon: '◎', color: '#f4511e', match: (t,n)   => ['nike','adidas','mode','fashion','vetement','clothing','wear','zara','uniqlo'].some(s => n?.toLowerCase().includes(s)) },
  { id: 'lifestyle',label: 'Lifestyle',    icon: '❋', color: '#00bfa5', match: (t,n)   => ['airbnb','lifestyle','travel','voyage','food','wellness','yoga','sport'].some(s => n?.toLowerCase().includes(s)) },
  { id: 'publish',  label: 'Publications', icon: '≡', color: '#90a4ae', match: (t,n)   => t === 'text' },
];

function getSlotTheme(slot) {
  if (!slot.occ || !slot.tenant) return null;
  const { t, name, url } = slot.tenant;
  for (const th of THEMES) {
    if (th.id === 'all') continue;
    if (th.match?.(t, name, url)) return th;
  }
  return null;
}

// ─── Hooks ────────────────────────────────────────────────────

function useScreenSize() {
  // ✅ Fix hydration mismatch (#418): start with 0 (matches SSR),
  // then set real window value after mount in useEffect
  const [w, setW] = useState(0);
  useEffect(() => {
    setW(window.innerWidth);
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { w, isMobile: w > 0 && w < 768 };
}

function useGridData() {
  const structuralGrid = useMemo(() => buildStructuralGrid(), []);
  const demoGrid       = useMemo(() => buildDemoGrid(), []);
  const [slots, setSlots]   = useState(demoGrid);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    fetchActiveSlots().then(({ data, error }) => {
      if (!error && data.length > 0) {
        setSlots(mergeGridWithBookings(structuralGrid, data)); setIsLive(true);
      } else if (!error && data.length === 0) {
        setSlots(structuralGrid.map(s => ({ ...s, occ: false, tenant: null, hot: false }))); setIsLive(true);
      }
      setLoading(false);
    });
  }, [structuralGrid]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubscribe = subscribeToBookings(() => {
      fetchActiveSlots().then(({ data, error }) => {
        if (!error) { setSlots(mergeGridWithBookings(structuralGrid, data)); setIsLive(true); }
      });
    });
    return unsubscribe;
  }, [structuralGrid]);

  return { slots, isLive, loading };
}

// ─── Grid Layout Engine ────────────────────────────────────────
const BASE_SIZE = { one: 120, ten: 52, corner_ten: 52, hundred: 26, thousand: 11 };
const GAP = 2;

function _buildBaseLayout() {
  const structural = buildStructuralGrid();
  const cw = Array.from({ length: GRID_COLS }, (_, x) => {
    let m = 0;
    for (let y = 0; y < GRID_ROWS; y++) m = Math.max(m, BASE_SIZE[structural[y * GRID_COLS + x].tier]);
    return m;
  });
  const rh = Array.from({ length: GRID_ROWS }, (_, y) => {
    let m = 0;
    for (let x = 0; x < GRID_COLS; x++) m = Math.max(m, BASE_SIZE[structural[y * GRID_COLS + x].tier]);
    return m;
  });
  const baseW = cw.reduce((a,b)=>a+b,0) + GAP*(GRID_COLS-1);
  const baseH = rh.reduce((a,b)=>a+b,0) + GAP*(GRID_ROWS-1);
  return { cw, rh, baseW, baseH };
}
const _BASE_LAYOUT = _buildBaseLayout();

function useGridLayout(containerW, containerH, isMobile) {
  const { cw, rh, baseW } = _BASE_LAYOUT;
  const k = containerW > 0 ? Math.max(0.08, containerW / baseW) : (isMobile ? 0.18 : 1);

  const tierSizes = useMemo(() => ({
    one:        Math.round(BASE_SIZE.one        * k),
    ten:        Math.round(BASE_SIZE.ten        * k),
    corner_ten: Math.round(BASE_SIZE.corner_ten * k),
    hundred:    Math.round(BASE_SIZE.hundred    * k),
    thousand:   Math.max(2, Math.round(BASE_SIZE.thousand * k)),
  }), [k]);

  const colWidths  = useMemo(() => cw.map(w => Math.round(w * k)), [k]);
  const rowHeights = useMemo(() => _BASE_LAYOUT.rh.map(h => Math.round(h * k)), [k]);

  const colOffsets = useMemo(() => {
    const o = [0];
    for (let x = 0; x < GRID_COLS - 1; x++) o.push(o[x] + colWidths[x] + GAP);
    return o;
  }, [colWidths]);

  const rowOffsets = useMemo(() => {
    const o = [0];
    for (let y = 0; y < GRID_ROWS - 1; y++) o.push(o[y] + rowHeights[y] + GAP);
    return o;
  }, [rowHeights]);

  const totalGridW = colOffsets[GRID_COLS - 1] + colWidths[GRID_COLS - 1];
  const totalGridH = rowOffsets[GRID_ROWS - 1] + rowHeights[GRID_ROWS - 1];

  return { colOffsets, rowOffsets, totalGridW, totalGridH, tierSizes, k };
}

// ─── Small Components ──────────────────────────────────────────

function BrandLogo({ size = 20, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size * 1.1} height={size * 1.1} viewBox="0 0 22 22" fill="none">
        <rect x="1" y="1" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5"/>
        <rect x="12" y="1" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5" opacity="0.5"/>
        <rect x="1" y="12" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5" opacity="0.5"/>
        <rect x="12" y="12" width="9" height="9" rx="2" stroke={U.accent} strokeWidth="1.5" opacity="0.25"/>
      </svg>
      <span style={{ color: U.text, fontWeight: 700, fontSize: size, letterSpacing: '-0.02em', fontFamily: F.h, lineHeight: 1 }}>
        ADS<span style={{ color: U.accent }}>·</span>SQUARE
      </span>
    </button>
  );
}

function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const { isMobile } = useScreenSize();
  const t = useT();
  if (!visible) return null;
  return (
    <div style={{ background: U.s1, borderBottom: `1px solid ${U.border}`, padding: isMobile ? '6px 12px' : '9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, fontSize: isMobile ? 11 : 12, color: U.muted, overflow: 'hidden' }}>
        <span style={{ background: U.accentFg, color: U.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 3, flexShrink: 0 }}>{t('banner.badge')}</span>
        {!isMobile && <span>{t('banner.text')}</span>}
        <button onClick={() => {}} style={{ color: U.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? 11 : 12, padding: 0, fontFamily: F.b, whiteSpace: 'nowrap' }}>
          {t('banner.cta')}
        </button>
      </div>
      <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: U.muted, cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── Modal Base ────────────────────────────────────────────────
function Modal({ onClose, width = 480, children, isMobile }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(t); }, []);
  useEffect(() => { const fn = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', opacity: entered ? 1 : 0, transition: 'opacity 0.2s ease' }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: isMobile ? '100vw' : `min(96vw,${width}px)`,
          background: U.s1,
          border: `1px solid ${U.border2}`,
          borderRadius: isMobile ? '20px 20px 0 0' : 16,
          overflow: 'hidden',
          overflowY: 'auto',
          maxHeight: isMobile ? '90vh' : '88vh',
          transform: entered ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 36, height: 3, borderRadius: 2, background: U.border2 }} />
          </div>
        )}
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', border: `1px solid ${U.border}`, background: U.faint, color: U.muted, cursor: 'pointer', fontSize: 16, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = U.s2; e.currentTarget.style.color = U.text; }}
          onMouseLeave={e => { e.currentTarget.style.background = U.faint; e.currentTarget.style.color = U.muted; }}>×</button>
        {children}
      </div>
    </div>
  );
}

// ─── Waitlist Modal ────────────────────────────────────────────
function WaitlistModal({ onClose }) {
  const { isMobile } = useScreenSize();
  const t = useT();
  return (
    <Modal onClose={onClose} width={520} isMobile={isMobile}>
      <div style={{ padding: isMobile ? '24px 20px 32px' : '40px 40px 44px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: U.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>{t('waitlist.label')}</div>
          <h2 style={{ color: U.text, fontWeight: 700, fontSize: 22, fontFamily: F.h, margin: 0, letterSpacing: '-0.02em' }}>{t('waitlist.title')}</h2>
          <p style={{ color: U.muted, fontSize: 13, lineHeight: 1.65, marginTop: 10, marginBottom: 0 }}>
            {t('waitlist.body')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {PROFILES.map(p => (
            <div key={p.id} style={{ flex: 1, minWidth: 80, padding: '10px 10px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, textAlign: 'center' }}>
              <div style={{ color: U.text, fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{p.label}</div>
              <div style={{ color: U.muted, fontSize: 9 }}>{p.blocs}</div>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 10, overflow: 'hidden', background: U.faint, border: `1px solid ${U.border}` }}>
          <iframe
            src="https://tally.so/embed/WONo8v?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
            width="100%" height="220" frameBorder="0" marginHeight="0" marginWidth="0"
            title="Liste d'attente ADS-SQUARE"
            style={{ display: 'block', minHeight: 180 }}
          />
        </div>
        <div style={{ marginTop: 14, color: U.muted, fontSize: 11, textAlign: 'center' }}>{t('waitlist.nospam')}</div>
      </div>
    </Modal>
  );
}

// ─── Checkout Modal ────────────────────────────────────────────

// ─── Boost Modal (1€/h spotlight) ─────────────────────────────
function BoostModal({ onClose }) {
  const { isMobile } = useScreenSize();
  const t = useT();
  const [hours, setHours] = useState(3);
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const total = hours;

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) { setError('Email invalide'); return; }
    if (!url || !url.startsWith('http')) { setError('URL invalide (ex: https://monsite.com)'); return; }
    if (!name.trim()) { setError('Nom requis'); return; }
    setLoading(true); setError(null);
    try {
      await fetch('/api/offers/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'boost', hours, email, url, name, totalCents: total * 100 }),
      });
      setSent(true);
    } catch {
      setError('Erreur réseau, réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} width={460} isMobile={isMobile}>
      <div style={{ padding: isMobile ? '24px 20px 32px' : '36px 36px 40px' }}>
        {!sent ? (<>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 4, background: `${U.accent}18`, border: `1px solid ${U.accent}40`, color: U.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12 }}>
              ⚡ BOOST SPOTLIGHT
            </div>
            <h2 style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Mettre votre bloc en avant</h2>
            <p style={{ color: U.muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>Votre marque défile dans la <strong style={{ color: U.text }}>barre de diffusion</strong> en haut de l'Explorer, visible par tous les visiteurs. <strong style={{ color: U.text }}>1€/heure</strong>, sans engagement.</p>
          </div>

          {/* Duration picker */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 10 }}>DURÉE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 3, 6, 12, 24].map(h => (
                <button key={h} onClick={() => setHours(h)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, cursor: 'pointer', fontFamily: F.b, background: hours === h ? `${U.accent}15` : U.faint, border: `1px solid ${hours === h ? U.accent + '55' : U.border}`, color: hours === h ? U.accent : U.muted, fontWeight: hours === h ? 700 : 400, fontSize: 12, transition: 'all 0.15s' }}>
                  {h}h
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>€{h}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          {[
            ['Votre nom / marque', name, setName, 'text', 'Nike, StartupXYZ…'],
            ['URL de destination', url, setUrl, 'url', 'https://monsite.com'],
            ['Email de contact', email, setEmail, 'email', 'vous@email.com'],
          ].map(([label, val, setter, type, ph]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 8 }}>{label.toUpperCase()}</div>
              <input
                type={type} value={val} onChange={e => setter(e.target.value)}
                placeholder={ph}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = U.border2}
                onBlur={e => e.target.style.borderColor = U.border}
              />
            </div>
          ))}

          {/* Summary */}
          <div style={{ padding: '12px 14px', borderRadius: 8, background: `${U.accent}08`, border: `1px solid ${U.accent}25`, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: U.muted, fontSize: 13 }}>{hours}h × 1€/h</span>
            <span style={{ color: U.accent, fontWeight: 700, fontSize: 20, fontFamily: F.h }}>€{total}</span>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: `${U.err}12`, border: `1px solid ${U.err}30`, color: U.err, fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{error}</div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 10, fontFamily: F.b, cursor: loading ? 'wait' : 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontWeight: 700, fontSize: 14, opacity: loading ? 0.7 : 1, boxShadow: `0 0 22px ${U.accent}45`, transition: 'opacity 0.15s' }}>
            {loading ? 'Envoi…' : `Lancer le boost — €${total}`}
          </button>
          <div style={{ marginTop: 10, color: U.muted, fontSize: 11, textAlign: 'center' }}>Paiement sécurisé · Activation sous 1h · Annulation libre</div>
        </>) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
            <h2 style={{ color: U.text, fontFamily: F.h, fontSize: 22, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Boost reçu !</h2>
            <p style={{ color: U.muted, fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>Votre demande a été transmise.<br />Vous recevrez les instructions de paiement par email sous peu.</p>
            <button onClick={onClose} style={{ padding: '11px 28px', borderRadius: 10, fontFamily: F.b, cursor: 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontWeight: 700, fontSize: 14 }}>Fermer</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CheckoutModal({ slot, onClose }) {
  const { isMobile } = useScreenSize();
  const t = useT();
  const [step, setStep]       = useState(1); // 1=contenu, 2=paiement
  const [email, setEmail]     = useState('');
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  // Contenu du bloc
  const [category, setCategory] = useState('link');
  const [blockForm, setBlockForm] = useState({
    title: '', slogan: '', url: '', cta_text: 'Visiter',
    image_url: '', primary_color: '', background_color: '#0d1828',
    social_network: '', music_platform: '', app_store: 'web',
  });

  const tier = slot?.tier;
  const pricePerDay = TIER_PRICE[tier] || 1;
  const totalPrice  = pricePerDay * days;
  const c = TIER_COLOR[tier];

  const CATS = [
    { id:'video',    label:'Vidéo',       icon:'▶', color:'#e53935', urlLabel:'LIEN VIDÉO',        urlPh:'https://youtube.com/watch?v=…',   showImg:false, showSocial:false, showMusic:false, showApp:false },
    { id:'image',    label:'Image',        icon:'◻', color:'#8e24aa', urlLabel:'LIEN DESTINATION',  urlPh:'https://votresite.com',           showImg:true,  showSocial:false, showMusic:false, showApp:false },
    { id:'link',     label:'Lien',         icon:'⌖', color:'#1e88e5', urlLabel:'URL DESTINATION',   urlPh:'https://votresite.com',           showImg:false, showSocial:false, showMusic:false, showApp:false },
    { id:'social',   label:'Réseaux',      icon:'⊕', color:'#00acc1', urlLabel:'LIEN DU PROFIL',    urlPh:'https://instagram.com/…',         showImg:false, showSocial:true,  showMusic:false, showApp:false },
    { id:'music',    label:'Musique',      icon:'♪', color:'#1ed760', urlLabel:"LIEN D'ÉCOUTE",     urlPh:'https://open.spotify.com/…',      showImg:false, showSocial:false, showMusic:true,  showApp:false },
    { id:'app',      label:'App',          icon:'⬡', color:'#43a047', urlLabel:"LIEN DE L'APP",     urlPh:'https://apps.apple.com/…',        showImg:true,  showSocial:false, showMusic:false, showApp:true  },
    { id:'brand',    label:'Marque',       icon:'⬟', color:'#f0b429', urlLabel:'SITE MARQUE',       urlPh:'https://votremarque.com',         showImg:true,  showSocial:false, showMusic:false, showApp:false },
    { id:'clothing', label:'Vêtements',    icon:'◎', color:'#f4511e', urlLabel:'LIEN COLLECTION',   urlPh:'https://boutique.com',            showImg:true,  showSocial:false, showMusic:false, showApp:false },
    { id:'lifestyle',label:'Lifestyle',    icon:'❋', color:'#00bfa5', urlLabel:'LIEN DESTINATION',  urlPh:'https://votrecontenu.com',        showImg:true,  showSocial:false, showMusic:false, showApp:false },
    { id:'text',     label:'Publication',  icon:'≡', color:'#90a4ae', urlLabel:"LIEN DE L'ARTICLE", urlPh:'https://medium.com/…',            showImg:false, showSocial:false, showMusic:false, showApp:false },
  ];
  const SOCIALS = [
    {id:'instagram',label:'Instagram',color:'#e1306c',e:'📸'},{id:'tiktok',label:'TikTok',color:'#69c9d0',e:'🎵'},
    {id:'x',label:'X/Twitter',color:'#1d9bf0',e:'✕'},{id:'youtube',label:'YouTube',color:'#ff0000',e:'▶'},
    {id:'linkedin',label:'LinkedIn',color:'#0a66c2',e:'💼'},{id:'snapchat',label:'Snapchat',color:'#fffc00',e:'👻'},
    {id:'twitch',label:'Twitch',color:'#9146ff',e:'🎮'},{id:'discord',label:'Discord',color:'#5865f2',e:'💬'},
  ];
  const MUSIC_PLATS = [
    {id:'spotify',label:'Spotify',color:'#1ed760',e:'🎵'},{id:'apple_music',label:'Apple Music',color:'#fc3c44',e:'🍎'},
    {id:'soundcloud',label:'SoundCloud',color:'#ff5500',e:'☁'},{id:'deezer',label:'Deezer',color:'#a238ff',e:'🎶'},
    {id:'youtube_music',label:'YT Music',color:'#ff0000',e:'▶'},{id:'bandcamp',label:'Bandcamp',color:'#1da0c3',e:'🎸'},
  ];

  const cat = CATS.find(c => c.id === category) || CATS[2];
  const selSocial = SOCIALS.find(s => s.id === blockForm.social_network);
  const selMusic  = MUSIC_PLATS.find(p => p.id === blockForm.music_platform);
  const blockColor = blockForm.primary_color || selSocial?.color || selMusic?.color || cat.color;

  const setF = (k,v) => setBlockForm(f => ({...f,[k]:v}));

  const inpStyle = { width:'100%', padding:'10px 13px', borderRadius:8, background:U.faint, border:`1px solid ${U.border}`, color:U.text, fontSize:13, fontFamily:F.b, outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' };
  const focusInp = e => e.target.style.borderColor = U.border2;
  const blurInp  = e => e.target.style.borderColor = U.border;

  const handleCheckout = async () => {
    if (!email || !email.includes('@')) { setError('Entrez un email valide'); return; }
    setLoading(true); setError(null);
    try {
      const displayName = blockForm.title || email.split('@')[0];
      const { url } = await createCheckoutSession({
        slotX: slot.x, slotY: slot.y, tier: slot.tier, days, email,
        display_name: displayName,
        slogan: blockForm.slogan,
        cta_url: blockForm.url,
        cta_text: blockForm.cta_text || 'Visiter',
        image_url: blockForm.image_url,
        primary_color: blockColor,
        background_color: blockForm.background_color || '#0d1828',
        content_type: category,
        badge: cat.label.toUpperCase(),
      });
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Erreur lors du paiement');
      setLoading(false);
    }
  };

  if (!slot) return null;

  return (
    <Modal onClose={onClose} width={isMobile ? 360 : 520} isMobile={isMobile}>
      <div style={{ padding: isMobile ? '20px 16px 28px' : '32px 36px 36px', maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'inline-block', padding:'2px 8px', borderRadius:4, background:`${c}18`, border:`1px solid ${c}30`, color:c, fontSize:10, fontWeight:700, letterSpacing:'0.05em', marginBottom:8 }}>{TIER_LABEL[tier]}</div>
          <h2 style={{ color:U.text, fontWeight:700, fontSize:18, fontFamily:F.h, margin:'0 0 4px' }}>Réserver ce bloc</h2>
          <div style={{ color:U.muted, fontSize:12 }}>Position ({slot.x}, {slot.y}) · €{pricePerDay}/jour</div>
        </div>

        {/* Durée */}
        <div style={{ marginBottom:20 }}>
          <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:8 }}>DURÉE</div>
          <div style={{ display:'flex', gap:8 }}>
            {[7,30,90].map(d => (
              <button key={d} onClick={() => setDays(d)} style={{ flex:1, padding:'9px 6px', borderRadius:8, cursor:'pointer', fontFamily:F.b, background:days===d?`${c}15`:U.faint, border:`1px solid ${days===d?c+'55':U.border}`, color:days===d?U.text:U.muted, fontWeight:days===d?600:400, fontSize:12, transition:'all 0.15s' }}>
                {d}j <div style={{ fontSize:10, opacity:0.6, marginTop:1 }}>€{pricePerDay*d}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ height:1, background:U.border, marginBottom:20 }} />

        {/* ─── CATÉGORIE ─── */}
        <div style={{ marginBottom:16 }}>
          <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:10 }}>CATÉGORIE DU BLOC</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {CATS.map(cat => (
              <button key={cat.id} onClick={() => { setCategory(cat.id); setF('primary_color',''); }}
                style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${category===cat.id?cat.color:U.border}`, background:category===cat.id?cat.color+'15':'transparent', color:category===cat.id?cat.color:U.muted, fontSize:11, fontWeight:category===cat.id?700:400, cursor:'pointer', display:'flex', alignItems:'center', gap:4, transition:'all 0.15s' }}>
                <span>{cat.icon}</span><span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── CHAMPS ADAPTATIFS ─── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>

          <div>
            <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:7 }}>NOM / TITRE</div>
            <input type="text" value={blockForm.title} maxLength={40}
              onChange={e => setF('title', e.target.value)}
              onFocus={focusInp} onBlur={blurInp}
              placeholder={cat.id==='social'?'Votre pseudo':cat.id==='music'?'Artiste / titre':'Votre nom ou marque'}
              style={inpStyle} />
          </div>

          <div>
            <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:7 }}>ACCROCHE</div>
            <input type="text" value={blockForm.slogan} maxLength={80}
              onChange={e => setF('slogan', e.target.value)}
              onFocus={focusInp} onBlur={blurInp}
              placeholder="Une phrase courte et percutante…"
              style={inpStyle} />
          </div>

          {/* Réseau social picker */}
          {cat.showSocial && (
            <div>
              <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:7 }}>RÉSEAU</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {SOCIALS.map(s => (
                  <button key={s.id} onClick={() => { setF('social_network',s.id); setF('primary_color',s.color); }}
                    style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${blockForm.social_network===s.id?s.color:U.border}`, background:blockForm.social_network===s.id?s.color+'18':'transparent', color:blockForm.social_network===s.id?s.color:U.muted, fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    {s.e} {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Musique picker */}
          {cat.showMusic && (
            <div>
              <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:7 }}>PLATEFORME</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {MUSIC_PLATS.map(p => (
                  <button key={p.id} onClick={() => { setF('music_platform',p.id); setF('primary_color',p.color); }}
                    style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${blockForm.music_platform===p.id?p.color:U.border}`, background:blockForm.music_platform===p.id?p.color+'18':'transparent', color:blockForm.music_platform===p.id?p.color:U.muted, fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    {p.e} {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image URL */}
          {cat.showImg && (
            <div>
              <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:7 }}>IMAGE (URL)</div>
              <input type="url" value={blockForm.image_url}
                onChange={e => setF('image_url', e.target.value)}
                onFocus={focusInp} onBlur={blurInp}
                placeholder="https://exemple.com/image.jpg"
                style={inpStyle} />
            </div>
          )}

          {/* URL principale */}
          <div>
            <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:7 }}>{cat.urlLabel}</div>
            <input type="url" value={blockForm.url}
              onChange={e => setF('url', e.target.value)}
              onFocus={focusInp} onBlur={blurInp}
              placeholder={cat.urlPh}
              style={inpStyle} />
          </div>

          {/* Aperçu */}
          <div style={{ borderRadius:8, background:blockForm.background_color||'#0d1828', border:`1px solid ${blockColor}30`, padding:12, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:7, flexShrink:0, background:blockForm.image_url?`url(${blockForm.image_url}) center/cover`:`${blockColor}18`, border:`2px solid ${blockColor}50`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:blockColor, overflow:'hidden' }}>
              {!blockForm.image_url && (selSocial?.e || selMusic?.e || cat.icon)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:blockColor }}>{blockForm.title||'Votre titre'}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{blockForm.slogan||'Votre accroche…'}</div>
            </div>
            <div style={{ fontSize:9, fontWeight:700, color:blockColor, padding:'2px 7px', background:`${blockColor}15`, borderRadius:4, border:`1px solid ${blockColor}30`, flexShrink:0 }}>{cat.label.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ height:1, background:U.border, marginBottom:20 }} />

        {/* EMAIL */}
        <div style={{ marginBottom:14 }}>
          <div style={{ color:U.muted, fontSize:10, fontWeight:600, letterSpacing:'0.07em', marginBottom:7 }}>EMAIL</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            style={inpStyle}
            onFocus={focusInp} onBlur={blurInp} />
        </div>

        {/* Récap prix */}
        <div style={{ padding:'11px 14px', borderRadius:8, background:U.faint, border:`1px solid ${U.border}`, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:U.muted, fontSize:13 }}>{days} jours × €{pricePerDay}</span>
          <span style={{ color:U.text, fontWeight:700, fontSize:18, fontFamily:F.h }}>€{totalPrice}</span>
        </div>

        {error && (
          <div style={{ padding:'8px 12px', borderRadius:6, background:`${U.err}12`, border:`1px solid ${U.err}30`, color:U.err, fontSize:12, marginBottom:12, textAlign:'center' }}>{error}</div>
        )}

        <button onClick={handleCheckout} disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:10, fontFamily:F.b, cursor:loading?'wait':'pointer', background:loading?U.s2:U.accent, border:'none', color:loading?U.muted:U.accentFg, fontWeight:700, fontSize:14, opacity:loading?0.6:1, transition:'opacity 0.15s, box-shadow 0.2s', boxShadow:loading?'none':`0 0 22px ${U.accent}50` }}>
          {loading ? 'Redirection vers Stripe…' : `Payer €${totalPrice}`}
        </button>
        <div style={{ marginTop:10, color:U.muted, fontSize:11, textAlign:'center' }}>{t('checkout.secure')}</div>
      </div>
    </Modal>
  );
}


// ─── Block rendering ───────────────────────────────────────────

function BlockMedia({ tenant, tier }) {
  const sz = TIER_SIZE[tier] || 56;
  if (!tenant) return null;
  if (tenant.t === 'image' && tenant.img) return (
    <img src={tenant.img} alt={tenant.name || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
  );
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 3, background: tenant.b || 'transparent', overflow: 'hidden' }}>
      {sz >= 30 && <span style={{ color: tenant.c, fontSize: Math.min(sz * 0.36, 32), fontWeight: 900, lineHeight: 1, fontFamily: F.h }}>{tenant.l}</span>}
      {sz >= 52 && <span style={{ color: tenant.c + 'cc', fontSize: Math.min(sz * 0.12, 11), fontWeight: 700, textAlign: 'center', lineHeight: 1.2, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.name}</span>}
    </div>
  );
}

// ─── LiveMiniBadge — badge permanent sur gros blocs occupés ──────
function LiveMiniBadge({ slot, sz }) {
  const [stats, setStats] = useState(statsCache[slot.id] || null);

  useEffect(() => {
    if (!slot.occ || !slot.tenant?.bookingId) return;
    if (statsCache[slot.id]) { setStats(statsCache[slot.id]); return; }
    fetchSlotStats(slot.x, slot.y).then(({ data }) => {
      if (data) { statsCache[slot.id] = data; setStats(data); }
    }).catch(() => {});
  }, [slot.id]);

  if (!stats || stats.impressions_7d === 0) return null;
  const c = slot.tenant?.c || TIER_COLOR[slot.tier];
  const v = stats.impressions_7d >= 1000
    ? `${(stats.impressions_7d / 1000).toFixed(1)}k`
    : stats.impressions_7d?.toString() ?? '0';

  return (
    <div style={{
      position: 'absolute', bottom: 3, right: 3,
      display: 'flex', alignItems: 'center', gap: 3,
      padding: sz >= 80 ? '2px 5px' : '1px 4px',
      borderRadius: 4, zIndex: 8, pointerEvents: 'none',
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
      border: `1px solid ${c}30`,
    }}>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00e8a2', flexShrink: 0 }} />
      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: sz >= 80 ? 8 : 7, fontWeight: 700, lineHeight: 1 }}>
        {v}
      </span>
    </div>
  );
}

// ─── HoverStatsTooltip — badge stats au survol des blocs occupés ─
const statsCache = {}; // cache module-level pour éviter les re-fetch

function HoverStatsBadge({ slot, sz }) {
  const [stats, setStats] = useState(statsCache[slot.id] || null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!slot.occ || !slot.tenant?.bookingId) return;
    if (statsCache[slot.id]) { setStats(statsCache[slot.id]); return; }
    // Fetch une seule fois au premier hover
    if (!visible) return;
    fetchSlotStats(slot.x, slot.y).then(({ data }) => {
      if (data) { statsCache[slot.id] = data; setStats(data); }
    }).catch(() => {});
  }, [visible, slot.id]);

  if (!slot.occ || sz < 24) return null;
  const c = slot.tenant?.c || TIER_COLOR[slot.tier];
  const hasData = stats && (stats.impressions_7d > 0 || stats.clicks_7d > 0);

  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position:'absolute', inset:0, zIndex:10 }}
    >
      {visible && hasData && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
          background: U.s1, border:`1px solid ${c}40`, borderRadius:8, padding:'7px 10px',
          whiteSpace:'nowrap', pointerEvents:'none', zIndex:200,
          boxShadow:`0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px ${c}20`,
          minWidth: 110,
        }}>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ color:c, fontWeight:800, fontSize:13, fontFamily:F.h, lineHeight:1 }}>
                {stats.impressions_7d?.toLocaleString('fr-FR') ?? '0'}
              </div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:8, marginTop:2 }}>vues / 7j</div>
            </div>
            <div style={{ width:1, background:'rgba(255,255,255,0.08)' }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ color:c, fontWeight:800, fontSize:13, fontFamily:F.h, lineHeight:1 }}>
                {stats.clicks_7d?.toLocaleString('fr-FR') ?? '0'}
              </div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:8, marginTop:2 }}>clics / 7j</div>
            </div>
            {stats.ctr_pct > 0 && (
              <>
                <div style={{ width:1, background:'rgba(255,255,255,0.08)' }} />
                <div style={{ textAlign:'center' }}>
                  <div style={{ color:'#00e8a2', fontWeight:800, fontSize:13, fontFamily:F.h, lineHeight:1 }}>
                    {stats.ctr_pct}%
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:8, marginTop:2 }}>CTR</div>
                </div>
              </>
            )}
          </div>
          {/* Flèche en bas */}
          <div style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%) rotate(45deg)',
            width:8, height:8, background:U.s1, border:`1px solid ${c}30`,
            borderTop:'none', borderLeft:'none' }} />
        </div>
      )}
    </div>
  );
}

// BlockCell — mémoïsé, reçoit sa taille via sz prop
const BlockCell = memo(({ slot, isSelected, onSelect, onFocus, sz: szProp, showStats }) => {
  const { tier, occ, tenant, hot } = slot;
  let sz = szProp !== undefined ? szProp : TIER_SIZE[tier];
  const c = TIER_COLOR[tier];
  const isCornerTen = tier === 'corner_ten';
  const r = tier === 'one' ? Math.round(sz * 0.1) : tier === 'ten' || isCornerTen ? Math.round(sz * 0.09) : tier === 'hundred' ? 3 : 2;
  const available = isTierAvailable(tier);

  // Track impression when occupied block enters viewport (once per session per slot)
  const ref = useRef(null);
  useEffect(() => {
    if (!occ || !tenant?.bookingId) return;
    const sessionKey = `imp_${tenant.bookingId}`;
    if (sessionStorage.getItem(sessionKey)) return; // already tracked this session
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        sessionStorage.setItem(sessionKey, '1');
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotX: slot.x, slotY: slot.y, bookingId: tenant.bookingId, event: 'impression' }),
        }).catch(() => {});
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [occ, tenant?.bookingId, slot.x, slot.y]);

  const handleClick = () => {
    if (occ) { onFocus(slot); return; }
    if (!available) { onFocus(slot); return; } // ouvre la modale "prochainement"
    onSelect(slot);
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      title={
        occ ? tenant?.name
        : available ? `${TIER_LABEL[tier]} — €${TIER_PRICE[tier]}/j`
        : `${TIER_LABEL[tier]} — Prochainement`
      }
      style={{
        width: sz, height: sz,
        borderRadius: r,
        position: 'relative',
        overflow: 'hidden',
        cursor: occ ? 'pointer' : available ? 'pointer' : 'not-allowed',
        flexShrink: 0,
        opacity: !occ && !available ? 0.45 : 1,
        border: `1px solid ${isSelected ? c : isCornerTen ? c + '70' : occ ? c + '40' : available ? U.border : c + '20'}`,
        background: occ ? (tenant?.b || U.s2) : !available ? '#0a0a0a' : U.s2,
        filter: !occ && !available ? 'saturate(0.3)' : 'none',
        outline: isSelected ? `2px solid ${c}` : 'none',
        outlineOffset: 1,
        boxShadow: isSelected
          ? `0 0 0 2px ${c}60, 0 0 ${sz * 0.5}px ${c}35`
          : isCornerTen
            ? `0 0 ${sz * 0.6}px ${c}28, inset 0 0 ${sz * 0.3}px ${c}08`
            : occ && sz >= 24
              ? `0 0 ${sz * 0.35}px ${c}22`
              : !available && sz >= 20
                ? `0 0 ${sz * 0.4}px ${c}18`
                : 'none',
        transition: 'opacity 0.2s, outline 0.1s, box-shadow 0.3s',
      }}
    >
      {occ && <BlockMedia tenant={tenant} tier={tier} sz={sz} />}
      {!occ && available && sz >= 8 && (
        <div style={{ position: 'absolute', inset: 0, background: `${c}06`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {sz >= 28 && <div style={{ width: '30%', height: 1, background: `${c}25`, borderRadius: 1 }} />}
        </div>
      )}
      {/* Overlay blocs indisponibles — visuellement fort et compréhensible */}
      {!occ && !available && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `repeating-linear-gradient(
            45deg,
            ${c}06 0px, ${c}06 2px,
            transparent 2px, transparent 8px
          )`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 2,
        }}>
          {/* Ligne diagonale centrale pour gros blocs */}
          {sz >= 40 && (
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.18 }}>
              <line x1="0" y1="0" x2="100%" y2="100%" stroke={c} strokeWidth="1"/>
              <line x1="100%" y1="0" x2="0" y2="100%" stroke={c} strokeWidth="1"/>
            </svg>
          )}
          {/* Cadenas pour blocs moyens */}
          {sz >= 52 && (
            <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <div style={{ fontSize: Math.max(8, sz * 0.18), lineHeight:1, filter:'grayscale(0.5)', opacity:0.55 }}>🔒</div>
              <div style={{ fontSize: Math.max(5, sz * 0.09), fontWeight:800, color:`${c}80`, letterSpacing:'0.06em', fontFamily:FF.h }}>BIENTÔT</div>
            </div>
          )}
          {/* Trait simple pour petits blocs */}
          {sz < 52 && sz >= 14 && (
            <div style={{ width:'55%', height:1, background:`${c}45`, borderRadius:1, position:'relative', zIndex:2 }} />
          )}
        </div>
      )}
      {occ && hot && <div style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: '#ff4455', animation: 'blink 1.5s infinite' }} />}
      {showStats && occ && <HoverStatsBadge slot={slot} sz={sz} />}
      {/* Mini badge permanent sur gros blocs */}
      {showStats && occ && sz >= 40 && <LiveMiniBadge slot={slot} sz={sz} />}
    </div>
  );
});
BlockCell.displayName = 'BlockCell';

// ─── Buyout Modal ──────────────────────────────────────────────
function BuyoutModal({ slot, onClose }) {
  const { isMobile } = useScreenSize();
  const t = useT();
  const [step, setStep] = useState(1); // 1=form 2=sent
  const [offerEuros, setOfferEuros] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const minOffer = slot ? Math.ceil(TIER_PRICE[slot.tier] * 1.5) : 0;
  const c = slot ? TIER_COLOR[slot.tier] : U.accent;

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) { setError('Email invalide'); return; }
    const cents = Math.round(parseFloat(offerEuros) * 100);
    if (!cents || cents < minOffer * 100) { setError(`Offre minimum : €${minOffer}`); return; }
    setLoading(true); setError(null);
    try {
      await submitBuyoutOffer({
        slotX: slot.x, slotY: slot.y,
        bookingId: slot.bookingId,
        offerCents: cents,
        buyerEmail: email,
        buyerName: name,
        message,
      });
      setStep(2);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  if (!slot) return null;

  return (
    <Modal onClose={onClose} width={440} isMobile={isMobile}>
      <div style={{ padding: isMobile ? '24px 20px 32px' : '36px 36px 40px' }}>
        {step === 1 ? (<>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: `${c}15`, border: `1px solid ${c}30`, color: c, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>{TIER_LABEL[slot.tier]}</div>
            <h2 style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t('buyout.title')}</h2>
            <p style={{ color: U.muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
{t('buyout.body')} <strong style={{ color: U.text }}>{t('buyout.72h')}</strong> {t('buyout.body2')}
            </p>
          </div>

          {/* Offer amount */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 8 }}>{t('buyout.amount')}</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: U.muted, fontSize: 14 }}>€</span>
              <input
                type="number" min={minOffer} step="1"
                value={offerEuros} onChange={e => setOfferEuros(e.target.value)}
                placeholder={`Min. ${minOffer}`}
                style={{ width: '100%', padding: '11px 14px 11px 28px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 16, fontFamily: F.h, fontWeight: 700, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = c}
                onBlur={e => e.target.style.borderColor = U.border}
              />
            </div>
            <div style={{ color: U.muted, fontSize: 11, marginTop: 6 }}>
              Offre minimum : <span style={{ color: U.text }}>€{minOffer}</span> · Commission plateforme : 20%
            </div>
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 6 }}>EMAIL</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('buyout.email.ph')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = U.border2} onBlur={e => e.target.style.borderColor = U.border} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 6 }}>NOM (optionnel)</div>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('buyout.name.ph')}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = U.border2} onBlur={e => e.target.style.borderColor = U.border} />
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 6 }}>MESSAGE POUR L'OCCUPANT (optionnel)</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder={t('buyout.message.ph')}
              rows={2}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = U.border2} onBlur={e => e.target.style.borderColor = U.border} />
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: `${U.err}12`, border: `1px solid ${U.err}30`, color: U.err, fontSize: 12, marginBottom: 14 }}>{error}</div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 10, fontFamily: F.b, cursor: loading ? 'wait' : 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontWeight: 700, fontSize: 14, opacity: loading ? 0.7 : 1, boxShadow: `0 0 22px ${U.accent}45` }}>
            {loading ? 'Envoi…' : 'Envoyer l\'offre →'}
          </button>
          <p style={{ color: U.muted, fontSize: 11, textAlign: 'center', marginTop: 10, marginBottom: 0 }}>{t('buyout.nodebite')}</p>
        </>) : (
          /* Step 2 — Confirmation */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${U.accent}15`, border: `1px solid ${U.accent}30`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <polyline points="4,11 9,16 18,6" stroke={U.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, letterSpacing: '-0.02em', margin: '0 0 10px' }}>{t('buyout.sent.title')}</h2>
            <p style={{ color: U.muted, fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
{t('buyout.sent.body')} <strong style={{ color: U.text }}>{t('buyout.72h')}</strong>.<br/>{t('buyout.sent.body2')}
            </p>
            <button onClick={onClose} style={{ padding: '12px 28px', borderRadius: 10, fontFamily: F.b, cursor: 'pointer', background: U.s2, border: `1px solid ${U.border2}`, color: U.text, fontWeight: 600, fontSize: 13 }}>{t('buyout.close')}</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Focus Modal ───────────────────────────────────────────────

// ─── AdvertiserProfileModal ────────────────────────────────────
// Profil complet d'un annonceur : tous ses blocs, stats, réseaux,
// description, et système de like.
function AdvertiserProfileModal({ advertiserId, slots, onClose, onOpenSlot }) {
  const { isMobile } = useScreenSize();
  const [entered, setEntered]   = useState(false);
  const [liked,   setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnim,  setLikeAnim]  = useState(false);
  const [totalStats, setTotalStats] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const advertiserSlots = useMemo(() =>
    slots.filter(s => s.occ && s.tenant?.advertiserId === advertiserId),
    [slots, advertiserId]
  );

  const mainSlot = advertiserSlots[0];
  const tenant   = mainSlot?.tenant;
  if (!tenant) { onClose(); return null; }

  const c = tenant.c || U.accent;

  // Animation entrée
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // Like — localStorage
  useEffect(() => {
    setLiked(localStorage.getItem(`like_adv_${advertiserId}`) === '1');
    setLikeCount(parseInt(localStorage.getItem(`likes_count_${advertiserId}`) || '0', 10));
  }, [advertiserId]);

  const handleLike = e => {
    e.stopPropagation();
    const nl = !liked;
    const nc = Math.max(0, likeCount + (nl ? 1 : -1));
    localStorage.setItem(`like_adv_${advertiserId}`, nl ? '1' : '0');
    localStorage.setItem(`likes_count_${advertiserId}`, String(nc));
    setLiked(nl); setLikeCount(nc);
    if (nl) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 700); }
  };

  // Stats agrégées
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const ids = advertiserSlots.map(s => s.tenant.bookingId).filter(Boolean);
    if (!ids.length) return;
    fetch(`${url}/rest/v1/booking_stats?booking_id=in.(${ids.join(',')})&select=clicks,impressions,ctr_pct,clicks_7d,impressions_7d`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows)) return;
        const agg = rows.reduce((acc, r) => ({
          clicks: acc.clicks + (r.clicks || 0),
          impressions: acc.impressions + (r.impressions || 0),
          clicks_7d: acc.clicks_7d + (r.clicks_7d || 0),
          impressions_7d: acc.impressions_7d + (r.impressions_7d || 0),
        }), { clicks: 0, impressions: 0, clicks_7d: 0, impressions_7d: 0 });
        setTotalStats({ ...agg, ctr_pct: agg.impressions > 0 ? Math.round(agg.clicks / agg.impressions * 1000) / 10 : 0 });
      }).catch(() => {});
  }, [advertiserId]);

  // Métadonnées réseaux
  const SOCIAL_META = {
    instagram: { label: 'Instagram', icon: '📸', color: '#e1306c', prefix: 'https://instagram.com/' },
    tiktok:    { label: 'TikTok',    icon: '🎵', color: '#00f2ea', prefix: 'https://tiktok.com/@' },
    youtube:   { label: 'YouTube',   icon: '▶',  color: '#ff0000', prefix: 'https://youtube.com/@' },
    twitter:   { label: 'Twitter / X', icon: '𝕏', color: '#e7e9ea', prefix: 'https://x.com/' },
    linkedin:  { label: 'LinkedIn',  icon: 'in', color: '#0077b5', prefix: 'https://linkedin.com/in/' },
    facebook:  { label: 'Facebook',  icon: 'f',  color: '#1877f2', prefix: 'https://facebook.com/' },
    snapchat:  { label: 'Snapchat',  icon: '👻', color: '#fffc00', prefix: 'https://snapchat.com/add/' },
    meta:      { label: 'Threads',   icon: '@',  color: '#fff',    prefix: 'https://threads.net/@' },
  };
  const MUSIC_META = {
    spotify:     { label: 'Spotify',     icon: '♫', color: '#1ed760', prefix: 'https://open.spotify.com/artist/' },
    apple_music: { label: 'Apple Music', icon: '♪', color: '#fc3c44', prefix: 'https://music.apple.com/' },
    soundcloud:  { label: 'SoundCloud',  icon: '☁', color: '#ff5500', prefix: 'https://soundcloud.com/' },
    deezer:      { label: 'Deezer',      icon: '♬', color: '#00c7f2', prefix: 'https://deezer.com/artist/' },
  };
  const socialMeta = SOCIAL_META[tenant.social];
  const musicMeta  = MUSIC_META[tenant.music];

  const BADGE_LABELS = { 'CRÉATEUR': 'Créateur·ice', 'FREELANCE': 'Auto-entrepreneur', 'MARQUE': 'Marque' };
  const profileLabel = BADGE_LABELS[tenant.badge] || tenant.badge || '';

  // Couleur de texte sur fond coloré (lisibilité)
  const isDark = (hex) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b) < 128;
  };
  const ctaBg = c;
  const ctaFg = isDark(c.slice(0,7)) ? '#fff' : '#000';

  const px = isMobile ? 20 : 28;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        opacity: entered ? 1 : 0,
        transition: 'opacity 0.3s ease',
        // Fond : flou + teinte couleur de l'auteur
        background: `rgba(4,4,6,0.92)`,
        backdropFilter: 'blur(24px) saturate(1.4)',
      }}
    >
      {/* Halo ambiant derrière la carte */}
      <div style={{
        position: 'fixed',
        width: 700, height: 700,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${c}14 0%, transparent 65%)`,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Carte principale */}
      <div
        onClick={e => e.stopPropagation()}
        onScroll={e => setScrolled(e.currentTarget.scrollTop > 10)}
        style={{
          position: 'relative', zIndex: 1,
          width: isMobile ? '100vw' : 'min(96vw, 440px)',
          background: '#0a0a0d',
          border: `1px solid ${c}22`,
          borderRadius: isMobile ? '26px 26px 0 0' : 22,
          overflow: 'hidden',
          maxHeight: isMobile ? '93vh' : '92vh',
          overflowY: 'auto',
          transform: entered
            ? 'translateY(0) scale(1)'
            : isMobile ? 'translateY(48px)' : 'translateY(20px) scale(0.96)',
          transition: 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: `
            0 0 0 1px ${c}18,
            0 40px 90px rgba(0,0,0,0.85),
            0 0 120px ${c}10
          `,
        }}
      >
        {/* ═══ PORTRAIT — zone haute, centrée sur l'auteur ═══ */}
        <div style={{
          position: 'relative',
          height: isMobile ? 340 : 380,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Fond : photo ou dégradé couleur */}
          {tenant.img ? (
            <img
              src={tenant.img} alt=""
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.55) saturate(1.15)',
                transform: 'scale(1.02)',
              }}
            />
          ) : (
            // Pas de photo — fond vivant généré depuis la couleur
            <div style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(ellipse 120% 100% at 60% 0%, ${c}28 0%, transparent 55%),
                radial-gradient(ellipse 80% 80% at 0% 100%, ${c}14 0%, transparent 60%),
                linear-gradient(160deg, #0f0f14 0%, #07070a 100%)
              `,
            }}>
              {/* Initiales monumentales */}
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -58%)',
                fontSize: isMobile ? 110 : 130,
                fontWeight: 900,
                fontFamily: F.h,
                color: c,
                opacity: 0.18,
                letterSpacing: '-0.05em',
                lineHeight: 1,
                userSelect: 'none',
              }}>{tenant.l}</div>
            </div>
          )}

          {/* Vignette : dégradé vers le bas pour lisibilité du texte */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `
              linear-gradient(to top,
                #0a0a0d 0%,
                rgba(10,10,13,0.75) 35%,
                rgba(10,10,13,0.15) 70%,
                transparent 100%
              )
            `,
          }} />

          {/* Lueur couleur en haut à droite — atmosphère */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 240, height: 240,
            borderRadius: '50%',
            background: `${c}16`,
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }} />

          {/* ── Barre du haut : badge type + close ── */}
          <div style={{
            position: 'absolute', top: isMobile ? 18 : 16,
            left: 0, right: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: `0 ${px}px`,
          }}>
            {/* Handle mobile */}
            {isMobile ? (
              <div style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                width: 38, height: 4, borderRadius: 2,
                background: 'rgba(255,255,255,0.18)',
              }} />
            ) : null}

            {/* Badge profil : qui est cette personne */}
            {profileLabel ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 20,
                background: 'rgba(0,0,0,0.52)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${c}30`,
                fontSize: 10, fontWeight: 700,
                color: c, letterSpacing: '0.05em',
                marginTop: isMobile ? 12 : 0,
              }}>
                ✦ {profileLabel}
              </div>
            ) : <div />}

            {/* Close */}
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              border: `1px solid rgba(255,255,255,0.12)`,
              color: 'rgba(255,255,255,0.65)',
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: isMobile ? 12 : 0,
            }}>×</button>
          </div>

          {/* ── Identité superposée sur la photo ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: `0 ${px}px ${isMobile ? 22 : 26}px`,
          }}>
            {/* Nom — la vraie star de ce profil */}
            <div style={{
              fontSize: isMobile ? 30 : 34,
              fontWeight: 900,
              fontFamily: F.h,
              color: '#fff',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              textShadow: '0 2px 24px rgba(0,0,0,0.7)',
              marginBottom: 8,
            }}>
              {tenant.name}
            </div>

            {/* Slogan — citation personnelle, pas un tagline produit */}
            {tenant.slogan && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 7,
              }}>
                <span style={{
                  fontSize: 18, lineHeight: 1,
                  color: c, opacity: 0.8,
                  fontFamily: 'Georgia, serif',
                  marginTop: 1, flexShrink: 0,
                }}>"</span>
                <span style={{
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: 13, lineHeight: 1.55,
                  fontStyle: 'italic',
                  maxWidth: 320,
                }}>
                  {tenant.slogan}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ CORPS — infos personnelles ═══ */}
        <div style={{ padding: `20px ${px}px ${isMobile ? 36 : 28}px` }}>

          {/* ── Réseaux + Like — "comment me trouver" ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 22,
            flexWrap: 'wrap',
          }}>
            {/* Réseaux sociaux du profil annonceur */}
            {[
              tenant.instagramUrl && { href: tenant.instagramUrl, label: 'Instagram', icon: '📸', color: '#e1306c' },
              tenant.tiktokUrl    && { href: tenant.tiktokUrl,    label: 'TikTok',    icon: '🎵', color: '#00f2ea' },
              tenant.twitterUrl   && { href: tenant.twitterUrl,   label: 'X',         icon: '𝕏',  color: '#e7e9ea' },
              tenant.youtubeUrl   && { href: tenant.youtubeUrl,   label: 'YouTube',   icon: '▶',  color: '#ff0000' },
              tenant.linkedinUrl  && { href: tenant.linkedinUrl,  label: 'LinkedIn',  icon: 'in', color: '#0077b5' },
              // Fallback : réseau lié au bloc (ancien comportement)
              !tenant.instagramUrl && !tenant.tiktokUrl && !tenant.twitterUrl && !tenant.youtubeUrl && !tenant.linkedinUrl
                && socialMeta && tenant.social && {
                  href: `${socialMeta.prefix}${tenant.social.replace('@', '')}`,
                  label: `@${tenant.social.replace('@', '')}`,
                  icon: socialMeta.icon,
                  color: socialMeta.color,
                },
              !tenant.instagramUrl && !tenant.tiktokUrl && !tenant.twitterUrl && !tenant.youtubeUrl && !tenant.linkedinUrl
                && musicMeta && tenant.music && {
                  href: `${musicMeta.prefix}${tenant.music.replace('@', '')}`,
                  label: musicMeta.label,
                  icon: musicMeta.icon,
                  color: musicMeta.color,
                },
            ].filter(Boolean).map((link, i) => (
              <a
                key={i}
                href={link.href}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 30,
                  background: `${link.color}12`,
                  border: `1px solid ${link.color}28`,
                  color: link.color,
                  fontSize: 12, fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'background 0.18s, border-color 0.18s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${link.color}22`;
                  e.currentTarget.style.borderColor = `${link.color}50`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `${link.color}12`;
                  e.currentTarget.style.borderColor = `${link.color}28`;
                }}
              >
                <span style={{ fontSize: 14 }}>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Like — geste affectif */}
            <button
              onClick={handleLike}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 30,
                cursor: 'pointer', fontFamily: F.b, fontSize: 13,
                background: liked ? `${c}18` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${liked ? c + '45' : 'rgba(255,255,255,0.09)'}`,
                color: liked ? c : 'rgba(255,255,255,0.35)',
                transition: 'all 0.22s',
                transform: likeAnim ? 'scale(1.1)' : 'scale(1)',
                flexShrink: 0,
              }}
            >
              <span style={{
                fontSize: 16,
                display: 'inline-block',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: likeAnim ? 'scale(1.5)' : 'scale(1)',
              }}>
                {liked ? '♥' : '♡'}
              </span>
              {likeCount > 0 && (
                <span style={{ fontSize: 11 }}>{likeCount}</span>
              )}
            </button>
          </div>

          {/* Séparateur fin coloré */}
          <div style={{
            height: 1,
            background: `linear-gradient(90deg, ${c}30 0%, ${c}08 60%, transparent 100%)`,
            marginBottom: 24,
          }} />

          {/* ── Description — l'histoire de l'auteur ── */}
          {tenant.description && (
            <div style={{ marginBottom: 24 }}>
              <p style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: 13.5,
                lineHeight: 1.75,
                margin: 0,
                whiteSpace: 'pre-line',
                // Limiter à 6 lignes sur mobile avec fade si trop long
              }}>
                {tenant.description}
              </p>
            </div>
          )}

          {/* ── Sur la grille — ses blocs vus comme des "posts" ── */}
          {advertiserSlots.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: 'rgba(255,255,255,0.28)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 14, height: 1, background: c, opacity: 0.45 }} />
                {advertiserSlots.length > 1
                  ? `${advertiserSlots.length} espaces sur la grille`
                  : 'Son espace sur la grille'}
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {advertiserSlots.map((s, idx) => {
                  const sc = s.tenant?.c || TIER_COLOR[s.tier];
                  return (
                    <button
                      key={s.id}
                      onClick={() => { onClose(); setTimeout(() => onOpenSlot(s), 60); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '11px 14px', borderRadius: 14,
                        background: idx === 0 ? `${sc}0e` : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${idx === 0 ? sc + '28' : 'rgba(255,255,255,0.06)'}`,
                        cursor: 'pointer', fontFamily: F.b, textAlign: 'left',
                        transition: 'all 0.18s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${sc}18`;
                        e.currentTarget.style.borderColor = `${sc}45`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = idx === 0 ? `${sc}0e` : 'rgba(255,255,255,0.025)';
                        e.currentTarget.style.borderColor = idx === 0 ? `${sc}28` : 'rgba(255,255,255,0.06)';
                      }}
                    >
                      {/* Vignette du bloc */}
                      <div style={{
                        width: 46, height: 46, borderRadius: 11,
                        flexShrink: 0,
                        background: s.tenant?.img
                          ? `url(${s.tenant.img}) center/cover`
                          : `linear-gradient(140deg, ${sc}30, ${sc}10)`,
                        border: `1.5px solid ${sc}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 17, fontWeight: 900, color: sc,
                        overflow: 'hidden',
                      }}>
                        {!s.tenant?.img && (s.tenant?.l || '?')}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Tier badge mini */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center',
                          gap: 5, marginBottom: 3,
                        }}>
                          <div style={{
                            fontSize: 8, fontWeight: 800,
                            color: sc, letterSpacing: '0.07em',
                            padding: '1px 5px', borderRadius: 3,
                            background: `${sc}15`,
                          }}>
                            {TIER_LABEL[s.tier]}
                          </div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>
                            pos. {s.x},{s.y}
                          </div>
                        </div>
                        <div style={{
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: 11, lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {s.tenant?.slogan || s.tenant?.cta || 'Voir le bloc'}
                        </div>
                      </div>

                      <div style={{
                        color: sc, fontSize: 18,
                        opacity: 0.5, flexShrink: 0,
                        lineHeight: 1,
                      }}>›</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Reach — présence discrète, pas mise en avant ── */}
          {totalStats && totalStats.impressions_7d > 0 && (
            <div style={{
              marginBottom: 24,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-around', gap: 8,
            }}>
              {[
                { v: (totalStats.impressions_7d || 0).toLocaleString('fr-FR'), l: 'vues / 7j' },
                { v: (totalStats.clicks_7d || 0).toLocaleString('fr-FR'),      l: 'visites' },
                { v: `${totalStats.ctr_pct ?? 0}%`,                             l: 'engagement' },
              ].map(({ v, l }) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 16, fontWeight: 800,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: F.h, lineHeight: 1,
                    marginBottom: 4,
                  }}>{v}</div>
                  <div style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>{l}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── CTA — invitation, pas conversion ── */}
          {tenant.url && tenant.url !== '#' && (
            <a
              href={tenant.url}
              target="_blank" rel="noopener noreferrer"
              onClick={() => recordClick(mainSlot.x, mainSlot.y, tenant.bookingId)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '14px 20px',
                borderRadius: 14,
                background: `linear-gradient(135deg, ${ctaBg} 0%, ${ctaBg}cc 100%)`,
                color: ctaFg,
                fontWeight: 800, fontSize: 14, fontFamily: F.b,
                textDecoration: 'none',
                letterSpacing: '0.01em',
                boxShadow: `0 4px 28px ${ctaBg}38`,
                transition: 'transform 0.18s, box-shadow 0.18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 8px 36px ${ctaBg}55`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 28px ${ctaBg}38`;
              }}
            >
              {tenant.cta || 'Découvrir son univers'}
              <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
            </a>
          )}

          {/* Espace respiration bas */}
          <div style={{ height: isMobile ? 8 : 2 }} />
        </div>
      </div>
    </div>
  );
}

function FocusModal({ slot, allSlots, onClose, onNavigate, onGoAdvertiser, onViewProfile, onWaitlist }) {
  const [entered, setEntered] = useState(false);
  const t = useT();
  const [dir, setDir] = useState(0);
  const { isMobile } = useScreenSize();
  const [publicStats, setPublicStats] = useState(null);

  // Fetch real stats for public display
  useEffect(() => {
    if (!slot?.occ) { setPublicStats(null); return; }
    fetchSlotStats(slot.x, slot.y).then(({ data }) => setPublicStats(data)).catch(() => {});
  }, [slot?.id]);
  const occupiedSlots = useMemo(() => allSlots.filter(s => s.occ), [allSlots]);
  const curIdx  = occupiedSlots.findIndex(s => s.id === slot?.id);
  const hasPrev = curIdx > 0;
  const hasNext = curIdx < occupiedSlots.length - 1;
  const goPrev  = useCallback(() => { if (!hasPrev) return; setDir(-1); onNavigate(occupiedSlots[curIdx - 1]); setTimeout(() => setDir(0), 250); }, [hasPrev, curIdx, occupiedSlots, onNavigate]);
  const goNext  = useCallback(() => { if (!hasNext) return; setDir(1); onNavigate(occupiedSlots[curIdx + 1]); setTimeout(() => setDir(0), 250); }, [hasNext, curIdx, occupiedSlots, onNavigate]);
  useEffect(() => { const t = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(t); }, [slot]);
  // Record impression on focus modal open — strong engagement signal
  useEffect(() => {
    if (!slot?.occ || !slot?.tenant?.bookingId) return;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotX: slot.x, slotY: slot.y, bookingId: slot.tenant.bookingId, event: 'impression' }),
    }).catch(() => {});
  }, [slot?.id]);
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') goPrev(); if (e.key === 'ArrowRight') goNext(); };
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
  }, [slot, onClose, goPrev, goNext]);

  if (!slot) return null;
  const { tier, occ, tenant } = slot;
  const c = occ ? tenant.c : TIER_COLOR[tier];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', opacity: entered ? 1 : 0, transition: 'opacity 0.2s ease' }}>
      {/* Nav arrows */}
      {!isMobile && hasPrev && (
        <button onClick={e => { e.stopPropagation(); goPrev(); }} style={{ position: 'fixed', left: 'max(16px,calc(50% - 420px))', top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: U.s1, border: `1px solid ${U.border2}`, color: U.text, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1020 }}>‹</button>
      )}
      {!isMobile && hasNext && (
        <button onClick={e => { e.stopPropagation(); goNext(); }} style={{ position: 'fixed', right: 'max(16px,calc(50% - 420px))', top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: U.s1, border: `1px solid ${U.border2}`, color: U.text, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1020 }}>›</button>
      )}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative',
        width: isMobile ? '100vw' : 'min(96vw,680px)',
        background: U.s1,
        border: `1px solid ${U.border2}`,
        borderRadius: isMobile ? '20px 20px 0 0' : 16,
        overflow: 'hidden', overflowY: 'auto',
        maxHeight: isMobile ? '88vh' : '88vh',
        transform: entered ? `translateX(${dir * -12}px)` : 'translateY(14px) scale(0.97)',
        transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.65)',
      }}>
        {isMobile && <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}><div style={{ width: 36, height: 3, borderRadius: 2, background: U.border2 }} /></div>}

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', border: `1px solid ${U.border}`, background: U.faint, color: U.muted, cursor: 'pointer', fontSize: 16, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

        {/* Hero image */}
        {occ && tenant?.img && tier !== 'thousand' && (
          <div style={{ position: 'relative', height: isMobile ? 160 : 210, overflow: 'hidden', background: U.s2 }}>
            <img src={tenant.img} alt={tenant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${U.s1} 0%, ${c}08 40%, transparent 60%)` }} />
          </div>
        )}

        {occ && tenant ? (
          <div style={{ padding: isMobile ? '16px 20px 28px' : '24px 28px 32px' }}>
            <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: `${TIER_COLOR[tier]}15`, border: `1px solid ${TIER_COLOR[tier]}30`, color: TIER_COLOR[tier], fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 14 }}>{TIER_LABEL[tier]} · €{TIER_PRICE[tier]}/j</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: tenant.img ? `url(${tenant.img}) center/cover` : `${c}18`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: c, fontFamily: F.h, overflow:'hidden' }}>
                {!tenant.img && tenant.l}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => onViewProfile && onViewProfile(tenant.advertiserId)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left', display:'block' }}
                  title="Voir le profil de l'annonceur"
                >
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <div style={{ color: U.text, fontWeight: 700, fontSize: 19, fontFamily: F.h, letterSpacing: '-0.02em' }}>{tenant.name}</div>
                    <div style={{ color:c, fontSize:11, opacity:0.7, flexShrink:0 }}>↗ profil</div>
                  </div>
                </button>
                <div style={{ color: U.muted, fontSize: 13, lineHeight: 1.5 }}>{tenant.slogan}</div>
              </div>
            </div>

            {/* Réseaux sociaux / plateforme si renseignés */}
            {(tenant.social || tenant.music) && (() => {
              const SOCIAL_META = {
                instagram: { label:'Instagram', icon:'📸', color:'#e1306c', prefix:'https://instagram.com/' },
                tiktok:    { label:'TikTok',    icon:'🎵', color:'#00f2ea', prefix:'https://tiktok.com/@' },
                youtube:   { label:'YouTube',   icon:'▶',  color:'#ff0000', prefix:'https://youtube.com/@' },
                twitter:   { label:'X / Twitter',icon:'✕', color:'#1da1f2', prefix:'https://x.com/' },
                linkedin:  { label:'LinkedIn',  icon:'in', color:'#0077b5', prefix:'https://linkedin.com/in/' },
                facebook:  { label:'Facebook',  icon:'f',  color:'#1877f2', prefix:'https://facebook.com/' },
                snapchat:  { label:'Snapchat',  icon:'👻', color:'#fffc00', prefix:'https://snapchat.com/add/' },
                meta:      { label:'Threads',   icon:'@',  color:'#fff',    prefix:'https://threads.net/@' },
              };
              const MUSIC_META = {
                spotify:    { label:'Spotify',      icon:'♪', color:'#1ed760', prefix:'https://open.spotify.com/' },
                apple:      { label:'Apple Music',  icon:'♫', color:'#fa57c1', prefix:'https://music.apple.com/' },
                soundcloud: { label:'SoundCloud',   icon:'☁', color:'#ff5500', prefix:'https://soundcloud.com/' },
                deezer:     { label:'Deezer',       icon:'≋', color:'#00c7f2', prefix:'https://deezer.com/' },
              };
              const socialMeta = SOCIAL_META[tenant.social];
              const musicMeta  = MUSIC_META[tenant.music];
              return (
                <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  {socialMeta && (
                    <a href={tenant.url?.includes(socialMeta.prefix?.split('//')[1]?.split('/')[0]) ? tenant.url : tenant.url}
                       target="_blank" rel="noopener noreferrer"
                       onClick={e => { e.stopPropagation(); recordClick(slot.x, slot.y, slot.bookingId); }}
                       style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, background:`${socialMeta.color}15`, border:`1px solid ${socialMeta.color}40`, color:socialMeta.color, textDecoration:'none', fontSize:12, fontWeight:700 }}>
                      <span style={{ fontSize:14 }}>{socialMeta.icon}</span> {socialMeta.label}
                    </a>
                  )}
                  {musicMeta && (
                    <a href={tenant.url} target="_blank" rel="noopener noreferrer"
                       onClick={e => { e.stopPropagation(); recordClick(slot.x, slot.y, slot.bookingId); }}
                       style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, background:`${musicMeta.color}15`, border:`1px solid ${musicMeta.color}40`, color:musicMeta.color, textDecoration:'none', fontSize:12, fontWeight:700 }}>
                      <span style={{ fontSize:14 }}>{musicMeta.icon}</span> {musicMeta.label}
                    </a>
                  )}
                </div>
              );
            })()}

            {/* Badge promo */}
            {tenant.badge && (
              <div style={{ marginBottom:14, padding:'6px 12px', borderRadius:7, background:`${c}10`, border:`1px solid ${c}20`, display:'inline-flex', alignItems:'center', gap:6, fontSize:11, color:c, fontWeight:700 }}>
                ✦ {tenant.badge}
              </div>
            )}

            {/* Description — histoire ou incitation au clic */}
            {tenant.description && (
              <div style={{
                marginBottom: 16,
                padding: '12px 14px',
                borderRadius: 10,
                background: `${c}06`,
                border: `1px solid ${c}14`,
                position: 'relative',
              }}>
                {/* Barre colorée gauche */}
                <div style={{
                  position: 'absolute', left: 0, top: 10, bottom: 10,
                  width: 2, borderRadius: 2,
                  background: `linear-gradient(to bottom, ${c}60, ${c}10)`,
                }} />
                <p style={{
                  margin: 0,
                  paddingLeft: 10,
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                }}>
                  {tenant.description}
                </p>
              </div>
            )}

            {/* Stats publiques — crédibilité et preuve sociale */}
            {publicStats && (publicStats.impressions > 0 || publicStats.clicks > 0) && (
              <div style={{ margin:'16px 0', padding:'12px 14px', borderRadius:10, background:`${c}08`, border:`1px solid ${c}18`, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  [publicStats.impressions_7d?.toLocaleString('fr-FR') ?? '0', 'vues / 7j'],
                  [publicStats.clicks_7d?.toLocaleString('fr-FR')    ?? '0', 'clics / 7j'],
                  [publicStats.ctr_pct != null ? `${publicStats.ctr_pct}%` : '—', 'CTR'],
                ].map(([v, l]) => (
                  <div key={l} style={{ textAlign:'center', padding:'6px 0' }}>
                    <div style={{ color:c, fontWeight:800, fontSize:18, fontFamily:F.h, lineHeight:1 }}>{v}</div>
                    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:9, marginTop:3, fontWeight:600 }}>{l}</div>
                  </div>
                ))}
                <div style={{ gridColumn:'1/-1', borderTop:`1px solid ${c}15`, marginTop:4, paddingTop:8, textAlign:'center' }}>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'0.05em' }}>DONNÉES RÉELLES · MIS À JOUR EN TEMPS RÉEL</span>
                </div>
              </div>
            )}

            <a href={tenant.url} target="_blank" rel="noopener noreferrer" onClick={e => { e.stopPropagation(); recordClick(slot.x, slot.y, slot.bookingId); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 20px', borderRadius: 10, background: c, color: U.accentFg, fontWeight: 700, fontSize: 14, fontFamily: F.b, textDecoration: 'none', boxShadow: `0 0 22px ${c}50`, transition: 'opacity 0.15s' }}>
              {tenant.cta} →
            </a>
          </div>
        ) : (() => {
          const isAvail = isTierAvailable(tier);
          const c = TIER_COLOR[tier];
          return (
            <div style={{ padding: isMobile ? '28px 20px 32px' : '40px 28px 40px', textAlign: 'center' }}>
              {/* Icône selon état */}
              <div style={{ width: 64, height: 64, borderRadius: 16, background: isAvail ? `${c}10` : `${c}08`, border: `1.5px solid ${isAvail ? c + '35' : c + '20'}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, position: 'relative' }}>
                {isAvail ? (
                  // Bloc libre — carré vide avec animation subtle
                  <div style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${c}50`, background: `${c}10`, animation: 'vacantBreath 2.5s ease-in-out infinite' }} />
                ) : (
                  // Bloc verrouillé — cadenas
                  <span style={{ filter: 'grayscale(0.3)', opacity: 0.7 }}>🔒</span>
                )}
                {isAvail && (
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#00e8a2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✦</div>
                )}
              </div>

              {/* Titre */}
              <div style={{ color: isAvail ? U.text : c, fontWeight: 800, fontSize: 17, fontFamily: F.h, marginBottom: 8, letterSpacing: '-0.01em' }}>
                {isAvail ? 'Bloc disponible' : 'Non disponible'}
              </div>

              {/* Corps */}
              <div style={{ color: U.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                {isAvail ? (
                  <>
                    Ce bloc <strong style={{ color: U.text }}>{TIER_LABEL[tier]}</strong> est libre à la location.<br/>
                    <span style={{ color: U.accent, fontWeight: 600 }}>€{TIER_PRICE[tier]}/jour</span> · visibilité immédiate sur la grille.
                  </>
                ) : (
                  <>
                    Les blocs <strong style={{ color: c }}>{TIER_LABEL[tier]}</strong> ne sont pas encore ouverts à la réservation.<br/>
                    Inscrivez-vous pour être <strong style={{ color: U.text }}>notifié en premier</strong> à l'ouverture.
                  </>
                )}
              </div>

              {/* Badge tier */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: `${c}10`, border: `1px solid ${c}25`, marginBottom: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: c }} />
                <span style={{ color: c, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>{TIER_LABEL[tier]}</span>
                <span style={{ color: U.muted, fontSize: 10 }}>·</span>
                <span style={{ color: U.muted, fontSize: 10 }}>({slot.x}, {slot.y})</span>
              </div>

              {/* CTA */}
              {isAvail ? (
                <button onClick={() => { onClose(); onGoAdvertiser(); }} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 10, fontFamily: F.b, cursor: 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontWeight: 700, fontSize: 13, boxShadow: `0 0 20px ${U.accent}40` }}>
                  Réserver ce bloc →
                </button>
              ) : (
                <button onClick={() => { onClose(); onWaitlist(); }} style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 10, fontFamily: F.b, cursor: 'pointer', background: `${c}15`, border: `1.5px solid ${c}40`, color: c, fontWeight: 700, fontSize: 13 }}>
                  ✉ Me prévenir à l'ouverture
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── TikTok Feed ───────────────────────────────────────────────
function TikTokFeed({ slots, isLive }) {
  const feedRef = useRef(null);
  const t = useT();
  const [currentIdx, setCurrentIdx] = useState(0);
  const { isMobile } = useScreenSize();

  const feedSlots = useMemo(() => slots.filter(s => s.occ), [slots]);

  useEffect(() => {
    const container = feedRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('[data-card]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting && e.intersectionRatio >= 0.5) setCurrentIdx(parseInt(e.target.dataset.card)); });
    }, { threshold: 0.5, root: container });
    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, [feedSlots.length]);

  const scrollTo = useCallback(idx => {
    feedRef.current?.querySelectorAll('[data-card]')?.[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (feedSlots.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: U.muted, fontSize: 14 }}>{t('feed.no_slots')}</div>
  );

  return (
    <div ref={feedRef} style={{ flex: 1, overflowY: 'scroll', overflowX: 'hidden', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
      {feedSlots.map((slot, idx) => {
        const { tier, occ, tenant } = slot;
        const c = occ ? tenant.c : TIER_COLOR[tier];
        const isActive = currentIdx === idx;
        return (
          <div key={slot.id} data-card={idx} style={{ scrollSnapAlign: 'start', width: '100%', height: '100%', minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 20 : 28, padding: isMobile ? '16px 16px 16px 8px' : '24px 60px 24px 24px', boxSizing: 'border-box', overflow: 'hidden', background: U.bg }}>

            {occ && tenant?.img && (<>
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                <img src={tenant.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.05, filter: 'blur(32px)', transform: 'scale(1.15)' }} onError={e => e.target.style.display='none'} />
              </div>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${U.bg}cc 0%, transparent 40%, ${U.bg}ee 100%)` }} />
            </>)}

            {/* Tier badge */}
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
              <span style={{ padding: '3px 9px', borderRadius: 4, background: `${TIER_COLOR[tier]}15`, border: `1px solid ${TIER_COLOR[tier]}30`, color: TIER_COLOR[tier], fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{TIER_LABEL[tier]}</span>
            </div>
            {isLive && (
              <div style={{ position: 'absolute', top: 16, right: isMobile ? 16 : 48, zIndex: 2, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: U.faint, border: `1px solid ${U.border}` }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4caf50', animation: 'blink 2s infinite' }} />
                <span style={{ color: U.muted, fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>LIVE</span>
              </div>
            )}

            {/* Block visual */}
            <div style={{ position: 'relative', zIndex: 1, width: isMobile ? 176 : 232, height: isMobile ? 176 : 232, borderRadius: tier === 'one' ? 24 : 18, background: occ ? (tenant.b || U.s2) : U.s2, border: `1px solid ${c}30`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.4s, box-shadow 0.4s', boxShadow: isActive ? `0 0 48px ${c}30, 0 0 12px ${c}18` : `0 0 16px ${c}08` }}>
              {occ && tenant?.img && <img src={tenant.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} onError={e => e.target.style.display='none'} />}
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 16 }}>
                {occ ? (
                  <>
                    <div style={{ fontSize: tier === 'one' ? 52 : 36, fontWeight: 900, color: c, fontFamily: F.h, lineHeight: 1, marginBottom: 6 }}>{tenant.l}</div>
                    {tier !== 'thousand' && <div style={{ color: `${c}cc`, fontSize: tier === 'one' ? 13 : 10, fontWeight: 700 }}>{tenant.name}</div>}
                  </>
                ) : (
                  <>
                    <div style={{ color: `${c}60`, fontSize: 36, fontWeight: 300, lineHeight: 1 }}>+</div>
                    <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, marginTop: 8, letterSpacing: '0.05em' }}>{t('feed.available')}</div>
                    <div style={{ color: U.muted, fontSize: 9, marginTop: 3, opacity: 0.6 }}>€{TIER_PRICE[tier]}/j</div>
                  </>
                )}
              </div>
            </div>

            {/* Info card */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: isMobile ? '92vw' : 400, padding: isMobile ? '16px' : '20px 22px', borderRadius: 14, background: U.s1, border: `1px solid ${U.border2}` }}>
              {occ ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c}18`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: c, fontFamily: F.h, flexShrink: 0 }}>{tenant.l}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: U.text, fontWeight: 700, fontSize: 15, fontFamily: F.h, letterSpacing: '-0.02em' }}>{tenant.name}</div>
                    <div style={{ color: U.muted, fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.slogan}</div>
                  </div>
                </div>
                <a href={tenant.url} target="_blank" rel="noopener noreferrer" onClick={() => recordClick(slot.x, slot.y, slot.bookingId)} style={{ display: 'block', padding: '10px 14px', borderRadius: 9, background: c, color: U.accentFg, fontWeight: 700, fontSize: 12, fontFamily: F.b, textDecoration: 'none', textAlign: 'center', boxShadow: `0 0 18px ${c}50` }}>
                  {tenant.cta}{' ->'}
                </a>
              </>) : null}
            </div>

            {/* Progress dots */}
            <div style={{ position: 'absolute', right: isMobile ? 8 : 18, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 5, zIndex: 2 }}>
              {feedSlots.map((_, i) => (
                <div key={i} onClick={() => scrollTo(i)} style={{ width: i === currentIdx ? 3 : 2, height: i === currentIdx ? 18 : 4, borderRadius: 2, background: i === currentIdx ? U.accent : U.border2, cursor: 'pointer', transition: 'all 0.3s' }} />
              ))}
            </div>

            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', color: U.muted, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', zIndex: 2 }}>{idx + 1} / {feedSlots.length}</div>
          </div>
        );
      })}
    </div>
  );
}


// ─── FeedInvitePanel ───────────────────────────────────────────
// Apparaît en deux cas :
//   1. Inactivité > 60s sur la grille
//   2. Toutes les 3min même avec activité (invitation douce, disparaît en 8s)
function FeedInvitePanel({ slots, onSwitchToFeed, onDismiss }) {
  const [entered, setEntered] = useState(false);
  const occupiedSlots = useMemo(() => slots.filter(s => s.occ).slice(0, 3), [slots]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const c = U.accent;

  return (
    <div
      style={{
        position: 'fixed',
        right: entered ? 0 : -320,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 500,
        transition: 'right 0.45s cubic-bezier(0.34,1.2,0.64,1)',
        width: 280,
      }}
    >
      <div style={{
        background: U.s1,
        border: `1px solid ${U.border2}`,
        borderRight: 'none',
        borderRadius: '16px 0 0 16px',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.6), -2px 0 0 ' + c + '30',
        overflow: 'hidden',
      }}>
        {/* Bande accent en haut */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${c}, ${c}90)` }} />

        <div style={{ padding: '18px 18px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e8a2', boxShadow: '0 0 6px #00e8a2', animation: 'blink 1.5s infinite' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#00e8a2', letterSpacing: '0.1em' }}>DÉCOUVERTE</span>
              </div>
              <div style={{ color: U.text, fontWeight: 800, fontSize: 15, fontFamily: F.h, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Explorez les blocs
              </div>
              <div style={{ color: U.text, fontWeight: 800, fontSize: 15, fontFamily: F.h, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                en mode <span style={{ color: c }}>Feed</span>
              </div>
            </div>
            <button
              onClick={onDismiss}
              style={{ width: 24, height: 24, borderRadius: '50%', background: U.faint, border: `1px solid ${U.border}`, color: U.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}
            >×</button>
          </div>

          {/* Preview de 3 blocs */}
          {occupiedSlots.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {occupiedSlots.map((slot, i) => {
                const c2 = slot.tenant?.c || TIER_COLOR[slot.tier];
                return (
                  <div key={slot.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10,
                    background: `${c2}08`, border: `1px solid ${c2}20`,
                    animation: `fadeUp 0.4s ease ${i * 0.08}s both`,
                  }}>
                    {/* Miniature colorée */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: slot.tenant?.img
                        ? `url(${slot.tenant.img}) center/cover`
                        : `${c2}20`,
                      border: `1.5px solid ${c2}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {!slot.tenant?.img && (
                        <span style={{ color: c2, fontWeight: 900, fontSize: 13, fontFamily: F.h }}>
                          {slot.tenant?.l || slot.tenant?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: U.text, fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {slot.tenant?.name || 'Annonceur'}
                      </div>
                      <div style={{ color: U.muted, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {slot.tenant?.slogan || TIER_LABEL[slot.tier]}
                      </div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: c2, flexShrink: 0, opacity: 0.6 }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Description */}
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>
            Naviguez bloc par bloc, découvrez les offres et inspirations des annonceurs actifs.
          </div>

          {/* CTA */}
          <button
            onClick={onSwitchToFeed}
            style={{
              width: '100%', padding: '10px',
              borderRadius: 10, fontFamily: F.b,
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: c, border: 'none', color: U.accentFg,
              boxShadow: `0 0 20px ${c}40`,
              transition: 'opacity 0.15s',
            }}
          >
            Ouvrir le Feed →
          </button>

          {/* Skip */}
          <button
            onClick={onDismiss}
            style={{ width: '100%', marginTop: 7, padding: '6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 10, cursor: 'pointer', fontFamily: F.b }}
          >
            Continuer à explorer la grille
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Public View ───────────────────────────────────────────────
// ─── Boost Ticker (scrolling banner of boosted slots only) ──────
function BoostTicker({ slots, authUser, userBookings, onBoost, onGoAdvertiser }) {
  const [showTickerToast, setShowTickerToast] = useState(false);

  // Only show slots explicitly boosted
  const boosted = slots.filter(s => s.occ && s.tenant && s.tenant.boosted);

  // Determine CTA state
  const hasActiveBooking = userBookings && userBookings.length > 0;
  const isLoggedIn = !!authUser;

  const handleCTA = () => {
    if (!isLoggedIn || !hasActiveBooking) {
      setShowTickerToast(true);
      setTimeout(() => setShowTickerToast(false), 4000);
    } else {
      onBoost();
    }
  };

  const ctaLabel = !isLoggedIn
    ? '⚡ Booster mon bloc'
    : !hasActiveBooking
    ? '⚡ Booster mon bloc'
    : '⚡ Booster votre bloc';

  // Empty state message items
  const emptyItems = [
    '⚡ Boostez votre bloc pour apparaître ici et obtenir une visibilité maximale',
    '🚀 Votre marque vue par tous les visiteurs en temps réel',
    '✦ Réservez un bloc ADS-SQUARE et activez le boost pour rejoindre cette barre',
    '💡 Les annonceurs boostés obtiennent 3× plus de clics',
  ];

  return (
    <div style={{ borderBottom: `1px solid ${U.accent}25`, background: `${U.accent}08`, flexShrink: 0, overflow: 'hidden', height: 30, display: 'flex', alignItems: 'center', position: 'relative' }}>
      {/* Tooltip toast */}
      {showTickerToast && (
        <div style={{ position: 'absolute', bottom: 36, right: 12, zIndex: 100, background: U.s1, border: `1px solid ${U.accent}40`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 260, animation: 'fadeIn 0.2s ease' }}>
          {!isLoggedIn ? (
            <>
              <div style={{ color: U.text, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Vous n'avez pas encore de bloc</div>
              <div style={{ color: U.muted, fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>Réservez un bloc ADS-SQUARE pour profiter d'un boost de visibilité et apparaître ici.</div>
              <button onClick={() => { setShowTickerToast(false); onGoAdvertiser(); }} style={{ padding: '6px 12px', borderRadius: 7, background: U.accent, border: 'none', color: U.accentFg, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                Voir les blocs disponibles →
              </button>
            </>
          ) : (
            <>
              <div style={{ color: U.text, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Aucun bloc actif</div>
              <div style={{ color: U.muted, fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>Le boost est disponible une fois que vous avez réservé et activé un bloc.</div>
              <button onClick={() => { setShowTickerToast(false); onGoAdvertiser(); }} style={{ padding: '6px 12px', borderRadius: 7, background: U.accent, border: 'none', color: U.accentFg, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                Réserver un bloc →
              </button>
            </>
          )}
        </div>
      )}

      {/* Left label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px 0 12px', flexShrink: 0, borderRight: `1px solid ${U.accent}30`, height: '100%', background: `${U.accent}10`, zIndex: 2 }}>
        <span style={{ fontSize: 9 }}>⚡</span>
        <span style={{ color: U.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>BOOST</span>
      </div>

      {/* Scrolling track */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', maskImage: 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)' }}>
        {boosted.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, animation: 'tickerScroll 40s linear infinite', width: 'max-content', willChange: 'transform' }}>
            {[...boosted, ...boosted].map((slot, i) => {
              const theme = getSlotTheme(slot);
              const c = theme?.color || slot.tenant.c || U.accent;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', borderRight: `1px solid ${U.border}`, height: 30, cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => window.open(slot.tenant.url, '_blank')}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: `${c}22`, border: `1px solid ${c}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: c, fontFamily: 'monospace', flexShrink: 0 }}>{slot.tenant.l?.charAt(0)}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{slot.tenant.name}</span>
                  {theme && <span style={{ color: c, fontSize: 8, opacity: 0.7 }}>{theme.icon}</span>}
                  <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, whiteSpace: 'nowrap' }}>{slot.tenant.cta}</span>
                </div>
              );
            })}
          </div>
        ) : (
          // Empty state — invitation scrolling
          <div style={{ display: 'flex', alignItems: 'center', animation: 'tickerScroll 60s linear infinite', width: 'max-content', willChange: 'transform' }}>
            {[...emptyItems, ...emptyItems].map((msg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 32px', borderRight: `1px solid ${U.border}`, height: 30, flexShrink: 0 }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap', fontStyle: 'italic' }}>{msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right CTA — always visible but context-aware */}
      <button onClick={handleCTA} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', height: '100%', background: `${U.accent}15`, border: 'none', borderLeft: `1px solid ${U.accent}30`, cursor: 'pointer', flexShrink: 0, color: U.accent, fontSize: 9, fontWeight: 700, fontFamily: 'inherit', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
        {ctaLabel}
      </button>
    </div>
  );
}

function PublicView({ slots, isLive, onGoAdvertiser, onWaitlist, authUser, userBookings }) {
  const t = useT();
  const containerRef  = useRef(null);
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const [focusSlot, setFocusSlot]   = useState(null);
  const [filterTier, setFilterTier] = useState('all');
  const [filterTheme, setFilterTheme] = useState('all');
  const [feedMode, setFeedMode]     = useState(false);
  const [showFeedInvite, setShowFeedInvite] = useState(false);
  const [profileAdvertiserId, setProfileAdvertiserId] = useState(null);
  const { isMobile } = useScreenSize();

  // ── Logique d'invitation au Feed ──────────────────────────────
  const INACTIVITY_MS  = 60_000;  // 60s sans interaction → panneau
  const PERIODIC_MS    = 180_000; // 3min même avec activité → rappel
  const inactivityTimer = useRef(null);
  const periodicTimer   = useRef(null);
  const dismissedRef    = useRef(false); // évite le re-show immédiat après dismiss

  const showInvite = () => {
    if (feedMode) return; // pas en mode Feed, inutile
    setShowFeedInvite(true);
  };

  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer.current);
    if (dismissedRef.current) return; // l'user a fermé, on respecte
    inactivityTimer.current = setTimeout(showInvite, INACTIVITY_MS);
  };

  useEffect(() => {
    if (feedMode) {
      // En mode feed — on annule tout
      setShowFeedInvite(false);
      clearTimeout(inactivityTimer.current);
      clearTimeout(periodicTimer.current);
      return;
    }

    // Inactivité : reset au moindre mouvement souris / tactile / scroll
    const events = ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'scroll', 'keydown'];
    const onActivity = () => { if (!dismissedRef.current) resetInactivityTimer(); };
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    resetInactivityTimer();

    // Invitation périodique — toutes les 3min, même avec activité
    // 8s de visibilité puis disparaît automatiquement (non intrusif)
    periodicTimer.current = setInterval(() => {
      if (feedMode || dismissedRef.current) return;
      setShowFeedInvite(true);
      // Auto-dismiss après 8s si l'user ne fait rien
      setTimeout(() => setShowFeedInvite(v => v ? false : v), 8_000);
    }, PERIODIC_MS);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearTimeout(inactivityTimer.current);
      clearInterval(periodicTimer.current);
    };
  }, [feedMode]);

  const handleDismissInvite = () => {
    setShowFeedInvite(false);
    dismissedRef.current = true;
    // Réactiver après 5min pour ne pas être trop insistant
    setTimeout(() => { dismissedRef.current = false; resetInactivityTimer(); }, 300_000);
  };

  const handleSwitchToFeed = () => {
    setShowFeedInvite(false);
    setFeedMode(true);
    dismissedRef.current = false;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => { setContainerW(e[0].contentRect.width); setContainerH(e[0].contentRect.height); });
    obs.observe(el);
    setContainerW(el.clientWidth); setContainerH(el.clientHeight);
    return () => obs.disconnect();
  }, []);

  const { colOffsets, rowOffsets, totalGridW, totalGridH, tierSizes, k } =
    useGridLayout(containerW, containerH, isMobile);

  // Centre sur ÉPICENTRE au premier rendu + à chaque retour depuis Feed
  const centeredRef = useRef(false);
  useEffect(() => {
    if (feedMode) { centeredRef.current = false; return; }
    if (centeredRef.current || !containerRef.current || containerW === 0) return;
    const el = containerRef.current;
    el.scrollLeft = colOffsets[CENTER_X] + tierSizes.one / 2 - el.clientWidth / 2;
    el.scrollTop  = rowOffsets[CENTER_Y] + tierSizes.one / 2 - el.clientHeight / 2;
    centeredRef.current = true;
  }, [feedMode, colOffsets, rowOffsets, tierSizes, containerW]);

  const filteredSlots = useMemo(() => {
    let s = slots;
    // Tier filter: inclut TOUS les slots du tier (occupés, libres ET indisponibles)
    // pour un dimming uniforme identique à la vue annonceur.
    if (filterTier !== 'all') s = s.filter(sl => sl.tier === filterTier || (filterTier === 'ten' && sl.tier === 'corner_ten'));
    // Theme filter: ne dimme que les blocs occupés qui ne matchent pas;
    // les blocs vides/indisponibles du tier restent à pleine opacité.
    if (filterTheme !== 'all') {
      const theme = THEMES.find(t => t.id === filterTheme);
      if (theme) s = s.filter(sl => !sl.occ || theme.match?.(sl.tenant?.t, sl.tenant?.name, sl.tenant?.url));
    }
    return new Set(s.map(sl => sl.id));
  }, [slots, filterTier, filterTheme]);

  const stats = useMemo(() => ({ occupied: slots.filter(s => s.occ).length, vacant: slots.filter(s => !s.occ).length }), [slots]);

  const tierFilters = useMemo(() => [
    ['all', t('toolbar.all')],
    ['one', t('toolbar.epicenter')],
    ['ten', t('toolbar.prestige')],
    ['hundred', t('toolbar.business')],
    ['thousand', t('toolbar.viral')],
  ], [t]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: U.bg }}>
      {/* ── Row 1: View toggle + Tier filters + Live stats ── */}
      <div style={{ borderBottom: `1px solid ${U.border}`, background: `${U.s1}f5`, backdropFilter: 'blur(12px)', flexShrink: 0, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 40, minWidth: 'max-content' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: U.faint, border: `1px solid ${U.border}`, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
            {[['grid','Grille'], ['feed','Feed']].map(([id, label]) => (
              <button key={id} onClick={() => setFeedMode(id === 'feed')} style={{ padding: '4px 11px', fontFamily: F.b, cursor: 'pointer', fontSize: 11, background: (feedMode ? 'feed' : 'grid') === id ? U.s2 : 'transparent', border: 'none', color: (feedMode ? 'feed' : 'grid') === id ? U.text : U.muted, fontWeight: (feedMode ? 'feed' : 'grid') === id ? 600 : 400, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{t(id === 'grid' ? 'toolbar.grid' : 'toolbar.feed')}</button>
            ))}
          </div>

          {!feedMode && <>
            <div style={{ width: 1, height: 16, background: U.border, flexShrink: 0 }} />
            {tierFilters.map(([id, label]) => (
              <button key={id} onClick={() => setFilterTier(id)} style={{ padding: '4px 9px', borderRadius: 6, fontFamily: F.b, cursor: 'pointer', fontSize: 11, background: filterTier === id ? U.s2 : 'transparent', border: `1px solid ${filterTier === id ? U.border2 : 'transparent'}`, color: filterTier === id ? U.text : U.muted, fontWeight: filterTier === id ? 600 : 400, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{label}</button>
            ))}
          </>}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', paddingLeft: 12, flexShrink: 0 }}>
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4caf50', animation: 'blink 2s infinite' }} />
                <span style={{ color: U.muted, fontSize: 10, fontWeight: 500 }}>{t('toolbar.live')}</span>
              </div>
            )}
            {!isMobile && (
              <>
                <span style={{ color: U.muted, fontSize: 11 }}><span style={{ color: U.text, fontWeight: 600 }}>{stats.occupied}</span> {t('toolbar.active')}</span>
                <span style={{ color: U.muted, fontSize: 11 }}><span style={{ color: U.text, fontWeight: 600 }}>{stats.vacant}</span> {t('toolbar.free')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Theme filters (grid only) ── */}
      {!feedMode && (
        <div style={{ borderBottom: `1px solid ${U.border}`, background: U.bg, flexShrink: 0, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, minWidth: 'max-content' }}>
            {THEMES.map(th => {
              const active = filterTheme === th.id;
              const col = th.color || U.muted;
              return (
                <button key={th.id} onClick={() => setFilterTheme(th.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontFamily: F.b, cursor: 'pointer', fontSize: 10, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s', background: active ? `${col}22` : 'transparent', border: `1px solid ${active ? col + '66' : 'transparent'}`, color: active ? col : U.muted }}>
                  <span style={{ fontSize: 9 }}>{th.icon}</span>
                  {th.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Boost ticker ── */}
      <BoostTicker slots={slots} authUser={authUser} userBookings={userBookings} onBoost={onGoAdvertiser} onGoAdvertiser={onGoAdvertiser} />

      {/* Les deux vues restent dans le DOM — display:none évite le remount et préserve containerW */}
      <div style={{ flex: 1, display: feedMode ? 'none' : 'flex', overflow: 'auto', alignItems: 'flex-start', justifyContent: 'center', minHeight: 0 }} ref={containerRef}>
        <div style={{ position: 'relative', width: totalGridW, height: totalGridH, flexShrink: 0 }}>
          {slots.map(slot => {
            const inFilter  = filteredSlots.has(slot.id);
            const isFiltering = filterTier !== 'all' || filterTheme !== 'all';

            // ── Couleur néon selon le filtre actif ──────────────
            // Tier → couleur du tier, Theme → couleur du thème
            let neonColor = null;
            if (isFiltering && inFilter) {
              if (filterTier !== 'all') {
                neonColor = TIER_COLOR[slot.tier];
              } else if (filterTheme !== 'all') {
                const th = THEMES.find(t => t.id === filterTheme);
                neonColor = th?.color || TIER_COLOR[slot.tier];
              }
            }

            // sz du bloc pour calibrer l'intensité du glow
            const sz = tierSizes[slot.tier] || 10;

            // Opacité : hors filtre = très dim, dans filtre = pleine lumière
            const wrapperOpacity = isFiltering ? (inFilter ? 1 : 0.05) : 1;

            return (
              <div
                key={slot.id}
                style={{
                  position: 'absolute',
                  left: colOffsets[slot.x],
                  top: rowOffsets[slot.y],
                  opacity: wrapperOpacity,
                  transition: 'opacity 0.25s ease, transform 0.2s ease',
                  // Légère montée des blocs en filtre pour sensation de "sélection"
                  transform: isFiltering && inFilter ? 'scale(1.04)' : 'scale(1)',
                  zIndex: isFiltering && inFilter ? 2 : 1,
                }}
              >
                <BlockCell slot={slot} isSelected={false} onSelect={() => {}} onFocus={setFocusSlot} sz={tierSizes[slot.tier]} showStats={true} />

                {/* ── Néon overlay multi-couches ── */}
                {neonColor && (() => {
                  const isLargeBlock = sz >= 40;
                  const isMedium     = sz >= 20 && sz < 40;
                  return (
                    <>
                      {/* Couche 1 — bordure néon nette */}
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 'inherit',
                        boxShadow: `inset 0 0 0 ${isLargeBlock ? 2 : 1}px ${neonColor}`,
                        pointerEvents: 'none', zIndex: 6,
                      }} />

                      {/* Couche 2 — halo externe proche */}
                      <div style={{
                        position: 'absolute',
                        inset: isLargeBlock ? -3 : -2,
                        borderRadius: 'inherit',
                        boxShadow: `0 0 ${isLargeBlock ? 10 : 6}px ${isLargeBlock ? 4 : 2}px ${neonColor}70`,
                        pointerEvents: 'none', zIndex: 5,
                        animation: 'neonPulse 2.2s ease-in-out infinite',
                      }} />

                      {/* Couche 3 — glow diffus large (gros blocs seulement) */}
                      {isLargeBlock && (
                        <div style={{
                          position: 'absolute',
                          inset: -8,
                          borderRadius: 'inherit',
                          boxShadow: `0 0 28px 8px ${neonColor}35`,
                          pointerEvents: 'none', zIndex: 4,
                          animation: 'neonPulse 2.2s ease-in-out infinite',
                          animationDelay: '0.4s',
                        }} />
                      )}

                      {/* Couche 4 — teinte colorée sur le fond du bloc (blocs vides/indisponibles) */}
                      {!slot.occ && (
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 'inherit',
                          background: `${neonColor}12`,
                          pointerEvents: 'none', zIndex: 3,
                        }} />
                      )}

                      {/* Couche 5 — étiquette tier sur les gros blocs libres/indisponibles */}
                      {!slot.occ && sz >= 48 && (
                        <div style={{
                          position: 'absolute', bottom: 4, left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: Math.max(7, sz * 0.1),
                          fontWeight: 800,
                          color: neonColor,
                          fontFamily: F.h,
                          letterSpacing: '0.04em',
                          textShadow: `0 0 8px ${neonColor}`,
                          pointerEvents: 'none', zIndex: 7,
                          whiteSpace: 'nowrap',
                        }}>
                          {TIER_LABEL[slot.tier]}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, display: feedMode ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
        <TikTokFeed slots={slots} isLive={isLive} />
      </div>
      {focusSlot && <FocusModal
        slot={focusSlot}
        allSlots={slots}
        onClose={() => setFocusSlot(null)}
        onNavigate={setFocusSlot}
        onGoAdvertiser={onGoAdvertiser}
        onWaitlist={onWaitlist}
        onViewProfile={(advId) => { setFocusSlot(null); setTimeout(() => setProfileAdvertiserId(advId), 50); }}
      />}

      {/* ── Feed Invite Panel ── */}
      {showFeedInvite && !feedMode && (
        <FeedInvitePanel
          slots={slots}
          onSwitchToFeed={handleSwitchToFeed}
          onDismiss={handleDismissInvite}
        />
      )}

      {/* ── Advertiser Profile Modal ── */}
      {profileAdvertiserId && (
        <AdvertiserProfileModal
          advertiserId={profileAdvertiserId}
          slots={slots}
          onClose={() => setProfileAdvertiserId(null)}
          onOpenSlot={(slot) => setFocusSlot(slot)}
        />
      )}
    </div>
  );
}

// ─── AnonBlock ─────────────────────────────────────────────────
const AnonBlock = memo(({ slot, chosenSlot, activeTier, onChoose, sz: szProp }) => {
  const { tier: t, occ } = slot;
  const sz = szProp !== undefined ? szProp : TIER_SIZE[t];
  const c  = TIER_COLOR[t];
  const isChosen = chosenSlot?.id === slot.id;
  const isTierHighlighted = activeTier && (t === activeTier || (activeTier === 'ten' && t === 'corner_ten'));
  const r = t === 'one' ? Math.round(sz * 0.1) : t === 'ten' || t === 'corner_ten' ? Math.round(sz * 0.09) : t === 'hundred' ? 3 : 2;

  if (occ) return (
    <div onClick={() => onChoose(slot)} style={{ width: sz, height: sz, borderRadius: r, background: slot.tenant?.b || U.s2, border: `1px solid ${isTierHighlighted ? c + '50' : isChosen ? c + '80' : c + '25'}`, position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', outline: isChosen ? `2px solid ${c}` : 'none', outlineOffset: 1, transition: 'box-shadow 0.25s', boxShadow: isChosen ? `0 0 0 2px ${c}55, 0 0 ${sz * 0.5}px ${c}35` : isTierHighlighted ? `0 0 ${sz * 0.4}px ${c}18` : 'none' }}>
      {sz >= 12 && slot.tenant && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: slot.tenant.b || U.s2 }}>
          {sz >= 24 && <span style={{ color: slot.tenant.c, fontSize: Math.min(sz * 0.38, 28), fontWeight: 900, fontFamily: F.h, lineHeight: 1 }}>{slot.tenant.l}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div onClick={() => onChoose(slot)} style={{ width: sz, height: sz, flexShrink: 0, position: 'relative', borderRadius: r, background: isChosen ? `${c}18` : isTierHighlighted ? `${c}0c` : U.s2, border: `1px solid ${isChosen ? c + '80' : isTierHighlighted ? c + '40' : U.border}`, outline: isChosen ? `2px solid ${c}` : 'none', outlineOffset: 1, cursor: 'pointer', boxShadow: isChosen ? `0 0 0 2px ${c}55, 0 0 ${sz * 0.5}px ${c}35` : isTierHighlighted ? `0 0 ${sz * 0.4}px ${c}22` : 'none', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.25s' }}>
      {isChosen && sz >= 18 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={sz * 0.4} height={sz * 0.4} viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
});
AnonBlock.displayName = 'AnonBlock';

// ─── Advertiser View ───────────────────────────────────────────
function AdvertiserView({ slots, isLive, onWaitlist, onCheckout }) {
  const t = useT();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [chosenSlot, setChosenSlot]     = useState(null);
  const [hoveredTier, setHoveredTier]   = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [slotStats, setSlotStats]       = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [neighborStats, setNeighborStats] = useState(null); // stats zone pour slots libres

  // Check if all slots in a tier are occupied (enables buyout offer)
  const tierOccupancy = useMemo(() => {
    const counts = { one: 0, ten: 0, corner_ten: 0, hundred: 0, thousand: 0 };
    const total   = { one: 1, ten: 48, corner_ten: 4, hundred: 576, thousand: 740 };
    slots.forEach(s => { if (s.occ && counts[s.tier] !== undefined) counts[s.tier]++; });
    const full = {};
    Object.keys(counts).forEach(k => full[k] = counts[k] >= total[k]);
    return full;
  }, [slots]);
  const containerRef  = useRef(null);
  const [containerW, setContainerW] = useState(0); // ✅ Fix hydration: init 0, set real in ResizeObserver
  const [containerH, setContainerH] = useState(0);
  const { isMobile } = useScreenSize();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => { setContainerW(e[0].contentRect.width); setContainerH(e[0].contentRect.height); });
    obs.observe(el);
    setContainerW(el.clientWidth); setContainerH(el.clientHeight);
    return () => obs.disconnect();
  }, []);

  const { colOffsets, rowOffsets, totalGridW, totalGridH, tierSizes } =
    useGridLayout(containerW, containerH, isMobile);

  const activeTier = selectedTier || hoveredTier;

  const handleChoose = useCallback(slot => {
    setChosenSlot(prev => prev?.id === slot.id ? null : slot);
  }, []);

  // Fetch stats when slot is chosen
  useEffect(() => {
    if (!chosenSlot) { setSlotStats(null); setNeighborStats(null); return; }

    if (chosenSlot.occ) {
      // Slot occupé — stats directes
      setStatsLoading(true);
      setNeighborStats(null);
      fetchSlotStats(chosenSlot.x, chosenSlot.y)
        .then(({ data }) => setSlotStats(data))
        .catch(() => setSlotStats(null))
        .finally(() => setStatsLoading(false));
    } else {
      // Slot libre — stats des voisins occupés du même tier
      setSlotStats(null);
      const neighbors = slots.filter(s =>
        s.occ && s.tier === chosenSlot.tier && s.id !== chosenSlot.id
      ).slice(0, 3);
      if (!neighbors.length) { setNeighborStats(null); return; }
      Promise.all(neighbors.map(s => fetchSlotStats(s.x, s.y)))
        .then(results => {
          const valid = results.map(r => r.data).filter(Boolean);
          if (!valid.length) { setNeighborStats(null); return; }
          const avg = {
            impressions_7d: Math.round(valid.reduce((a,b) => a + (b.impressions_7d||0), 0) / valid.length),
            clicks_7d:      Math.round(valid.reduce((a,b) => a + (b.clicks_7d||0), 0) / valid.length),
            ctr_pct:        +(valid.reduce((a,b) => a + (b.ctr_pct||0), 0) / valid.length).toFixed(1),
          };
          setNeighborStats({ ...avg, sampleSize: valid.length });
        })
        .catch(() => setNeighborStats(null));
    }
  }, [chosenSlot?.id, slots]);

  const tiers = [
    { id: 'one',      label: t('adv.tier.epicenter'), price: 1000, count: 1,   desc: t('adv.tier.center') },
    { id: 'ten',      label: t('adv.tier.prestige'),  price: 100,  count: 48,  desc: t('adv.tier.crown') },
    { id: 'corner_ten',label:t('adv.tier.corner'),   price: 100,  count: 4,   desc: t('adv.tier.corners') },
    { id: 'hundred',  label: t('adv.tier.business'), price: 10,   count: 576, desc: t('adv.tier.mid') },
    { id: 'thousand', label: t('adv.tier.viral'),    price: 1,    count: 740, desc: t('adv.tier.perimeter') },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', background: U.bg, minHeight: 0 }}>
      {/* Sidebar */}
      <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, background: U.s1, borderRight: isMobile ? 'none' : `1px solid ${U.border}`, borderBottom: isMobile ? `1px solid ${U.border}` : 'none', overflowY: 'auto', display: 'flex', flexDirection: 'column', order: isMobile ? 2 : 0, maxHeight: isMobile ? '55vh' : undefined, minHeight: 0 }}>
        <div style={{ padding: isMobile ? '16px 16px' : '24px 20px', borderBottom: `1px solid ${U.border}` }}>
          <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 14 }}>{t('adv.choose')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tiers.map(tier => {
              const isActive = activeTier === tier.id || (activeTier === 'ten' && tier.id === 'corner_ten');
              const c = TIER_COLOR[tier.id];
              return (
                <div key={tier.id}
                  onMouseEnter={() => setHoveredTier(tier.id)}
                  onMouseLeave={() => setHoveredTier(null)}
                  onClick={() => setSelectedTier(prev => prev === tier.id ? null : tier.id)}
                  style={{ padding: '10px 12px', borderRadius: 8, background: isActive ? `${c}0d` : U.faint, border: `1px solid ${isActive ? c + '50' : U.border}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10, boxShadow: isActive ? `0 0 16px ${c}18, inset 0 0 20px ${c}06` : 'none' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isActive ? U.text : U.muted, fontWeight: 600, fontSize: 12, transition: 'color 0.15s' }}>{tier.label}</div>
                    <div style={{ color: U.muted, fontSize: 10, marginTop: 1 }}>{tier.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: isActive ? U.text : U.muted, fontWeight: 700, fontSize: 12, fontFamily: F.h }}>€{tier.price}<span style={{ fontSize: 9, fontWeight: 400 }}>{t('adv.tier.perday')}</span></div>
                    <div style={{ color: U.muted, fontSize: 9 }}>{tier.count} {t('adv.tier.blocks')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {chosenSlot ? (
          <div style={{ margin: '16px', borderRadius: 10, background: U.faint, border: `1px solid ${TIER_COLOR[chosenSlot.tier]}25`, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${U.border}` }}>
              <div style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: `${TIER_COLOR[chosenSlot.tier]}15`, border: `1px solid ${TIER_COLOR[chosenSlot.tier]}30`, color: TIER_COLOR[chosenSlot.tier], fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>
  {chosenSlot.occ ? t('adv.occupied') : TIER_LABEL[chosenSlot.tier]}
              </div>
              <div style={{ color: U.text, fontWeight: 700, fontSize: 13, fontFamily: F.h }}>
  {chosenSlot.occ ? (chosenSlot.tenant?.name || t('adv.occupied')) : t('adv.selected')}
              </div>
              <div style={{ color: U.muted, fontSize: 11, marginTop: 2 }}>
                ({chosenSlot.x}, {chosenSlot.y}) · €{TIER_PRICE[chosenSlot.tier]}/j
              </div>
            </div>

            {/* Stats panel enrichi — uniquement si le slot est occupé */}
            {chosenSlot.occ && (
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${U.border}` }}>

                <div style={{ color: U.muted, fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 10 }}>{t('adv.stats.title')}</div>
                {statsLoading ? (
                  <div style={{ color: U.muted, fontSize: 11, textAlign: 'center', padding: '8px 0' }}>{t('adv.stats.loading')}</div>
                ) : slotStats ? (
                  <div style={{ display: 'flex', flexDirection:'column', gap: 6 }}>
                    {/* Ligne impressions globales */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      <div style={{ padding:'8px 10px', borderRadius:7, background:U.s2, border:`1px solid ${U.border}` }}>
                        <div style={{ color:U.text, fontWeight:700, fontSize:15, fontFamily:F.h }}>{slotStats.impressions?.toLocaleString() ?? '—'}</div>
                        <div style={{ color:U.muted, fontSize:9, marginTop:2 }}>Vues totales</div>
                      </div>
                      <div style={{ padding:'8px 10px', borderRadius:7, background:U.s2, border:`1px solid ${U.border}` }}>
                        <div style={{ color:U.text, fontWeight:700, fontSize:15, fontFamily:F.h }}>{slotStats.ctr_pct != null ? `${slotStats.ctr_pct}%` : '—'}</div>
                        <div style={{ color:U.muted, fontSize:9, marginTop:2 }}>CTR</div>
                      </div>
                    </div>
                    {/* Clics par période */}
                    <div style={{ fontSize:9, color:U.muted, fontWeight:600, letterSpacing:'0.07em', marginTop:4 }}>CLICS PAR PÉRIODE</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                      {[
                        [slotStats.clicks_today?.toLocaleString() ?? '0', "Aujourd'hui"],
                        [slotStats.clicks_7d?.toLocaleString()    ?? '0', '7 jours'],
                        [slotStats.clicks_30d?.toLocaleString()   ?? '0', '30 jours'],
                      ].map(([v, l]) => (
                        <div key={l} style={{ padding:'8px 6px', borderRadius:7, background:U.s2, border:`1px solid ${U.border}`, textAlign:'center' }}>
                          <div style={{ color:U.accent, fontWeight:700, fontSize:14, fontFamily:F.h }}>{v}</div>
                          <div style={{ color:U.muted, fontSize:9, marginTop:2 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: U.muted, fontSize: 11, textAlign: 'center', padding: '6px 0', fontStyle: 'italic' }}>{t('adv.stats.nodemo')}</div>
                )}
              </div>
            )}

            {/* CTA */}
            <div style={{ padding: '12px 16px' }}>
              {chosenSlot.occ ? (() => {
                const tierIsFull = tierOccupancy[chosenSlot.tier];
                return (
                  <>
                    {/* Indicateur tier complet */}
                    {!tierIsFull && (
                      <div style={{ marginBottom:10, padding:'7px 10px', borderRadius:7, background:'#f0b42912', border:'1px solid #f0b42925', fontSize:10, color:'#f0b429', lineHeight:1.5 }}>
                        ⚠️ Des blocs <strong>{TIER_LABEL[chosenSlot.tier]}</strong> sont encore libres — l'offre de rachat sera disponible quand ce tier sera complet.
                      </div>
                    )}
                    <button
                      onClick={() => tierIsFull ? onCheckout(chosenSlot) : null}
                      disabled={!tierIsFull}
                      style={{ width:'100%', padding:'11px', borderRadius:8, fontFamily:F.b,
                        cursor: tierIsFull ? 'pointer' : 'not-allowed',
                        background: tierIsFull ? U.accent : 'transparent',
                        border: tierIsFull ? 'none' : `1px solid ${U.border2}`,
                        color: tierIsFull ? U.accentFg : U.muted,
                        fontWeight:700, fontSize:13,
                        boxShadow: tierIsFull ? `0 0 20px ${U.accent}50` : 'none',
                        opacity: tierIsFull ? 1 : 0.45,
                        filter: tierIsFull ? 'none' : 'blur(0.3px)',
                        marginBottom:8, transition:'all 0.2s' }}>
                      {t('adv.cta.offer')}
                    </button>
                    <div style={{ color: U.muted, fontSize: 10, textAlign: 'center', lineHeight: 1.5 }}>
                      {tierIsFull ? t('adv.cta.offer.sub') : `Disponible quand les ${['one','ten','corner_ten'].includes(chosenSlot.tier) ? TIER_LABEL[chosenSlot.tier] : 'blocs de ce tier'} sont tous occupés`}
                    </div>
                  </>
                );
              })() : (
                isTierAvailable(chosenSlot.tier) ? (<>
                  {/* Stats zone voisine — preuve de trafic pour slots libres */}
                  {neighborStats && (neighborStats.impressions_7d > 0 || neighborStats.clicks_7d > 0) && (
                    <div style={{ marginBottom:12, padding:'10px 12px', borderRadius:9, background:`${U.accent}08`, border:`1px solid ${U.accent}20` }}>
                      <div style={{ fontSize:9, color:U.muted, fontWeight:700, letterSpacing:'0.07em', marginBottom:8 }}>
                        TRAFIC DES BLOCS VOISINS ({neighborStats.sampleSize} blocs analysés)
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
                        {[
                          [neighborStats.impressions_7d?.toLocaleString('fr-FR') ?? '0', 'vues / 7j'],
                          [neighborStats.clicks_7d?.toLocaleString('fr-FR') ?? '0', 'clics / 7j'],
                          [`${neighborStats.ctr_pct ?? 0}%`, 'CTR moy.'],
                        ].map(([v, l]) => (
                          <div key={l} style={{ textAlign:'center', padding:'7px 4px', borderRadius:6, background:U.s2, border:`1px solid ${U.border}` }}>
                            <div style={{ color:U.accent, fontWeight:800, fontSize:14, fontFamily:F.h }}>{v}</div>
                            <div style={{ color:U.muted, fontSize:8, marginTop:2 }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop:7, fontSize:9, color:'rgba(255,255,255,0.22)', textAlign:'center' }}>
                        Performances réelles · blocs {TIER_LABEL[chosenSlot.tier]} actifs
                      </div>
                    </div>
                  )}
                  <button onClick={() => onCheckout(chosenSlot)} style={{ width: '100%', padding: '11px', borderRadius: 8, fontFamily: F.b, cursor: 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontWeight: 700, fontSize: 13, boxShadow: `0 0 20px ${U.accent}50`, marginBottom: 8 }}>
                    {t('adv.cta.rent')}
                  </button>
                  <div style={{ color: U.muted, fontSize: 10, textAlign: 'center' }}>
                    {t('adv.cta.rent.sub', TIER_PRICE[chosenSlot.tier])}
                  </div>
                </>) : (() => {
                  const c = TIER_COLOR[chosenSlot.tier];
                  return (
                    <div style={{ padding: '16px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c}12`, border: `1.5px solid ${c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔒</div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: c, fontWeight: 800, fontSize: 14, fontFamily: F.h, letterSpacing: '0.04em', marginBottom: 4 }}>PROCHAINEMENT</div>
                          <div style={{ color: U.muted, fontSize: 11, lineHeight: 1.6 }}>
                            Les blocs <strong style={{ color: U.text }}>{TIER_LABEL[chosenSlot.tier]}</strong> ouvrent en phase 2.<br />
                            Réservez votre place en avant-première.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                        {[
                          ['Prix', `€${TIER_PRICE[chosenSlot.tier]}/j`],
                          ['Tier', TIER_LABEL[chosenSlot.tier]],
                          ['Position', `(${chosenSlot.x}, ${chosenSlot.y})`],
                          ['Lancement', 'Phase 2'],
                        ].map(([label, val]) => (
                          <div key={label} style={{ padding: '8px 12px', borderRadius: 8, background: `${c}08`, border: `1px solid ${c}20`, textAlign: 'center' }}>
                            <div style={{ color: U.muted, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                            <div style={{ color: U.text, fontWeight: 700, fontSize: 13, fontFamily: F.h }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={onWaitlist} style={{ width: '100%', padding: '12px', borderRadius: 8, fontFamily: F.b, cursor: 'pointer', background: `${c}18`, border: `1.5px solid ${c}50`, color: c, fontWeight: 700, fontSize: 13 }}>
                        ✉ Me prévenir à l'ouverture
                      </button>
                      <div style={{ color: U.muted, fontSize: 10, textAlign: 'center', marginTop: 8 }}>Accès prioritaire garanti aux premiers inscrits</div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        ) : (
          <div style={{ margin: '16px', borderRadius: 10, background: U.faint, border: `1px solid ${U.border}`, padding: '20px' }}>
            <div style={{ color: U.muted, fontSize: 12, lineHeight: 1.7, textAlign: 'center' }}>
              {t('adv.empty').split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br/>}</span>)}
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px 20px', marginTop: 'auto' }}>
          <button onClick={onWaitlist} style={{ width: '100%', padding: '11px', borderRadius: 8, fontFamily: F.b, cursor: 'pointer', background: 'transparent', border: `1px solid ${U.border2}`, color: U.muted, fontWeight: 600, fontSize: 12 }}>
            {t('adv.waitlist')}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', background: U.bg, order: isMobile ? 1 : 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: 0, maxHeight: isMobile ? '45vh' : undefined }}>
        <div style={{ position: 'relative', width: totalGridW, height: totalGridH, flexShrink: 0 }}>
          {slots.map(slot => {
            const tierMatch = !activeTier || slot.tier === activeTier || (activeTier === 'ten' && slot.tier === 'corner_ten');
            return (
              <div key={slot.id} style={{ position: 'absolute', left: colOffsets[slot.x], top: rowOffsets[slot.y], opacity: tierMatch ? 1 : 0.06, transition: 'opacity 0.2s' }}>
                <AnonBlock slot={slot} chosenSlot={chosenSlot} activeTier={activeTier} onChoose={handleChoose} sz={tierSizes[slot.tier]} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Landing Mini-Grid Background ─────────────────────────────
function LandingGrid({ slots }) {
  const { isMobile } = useScreenSize();
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const startRef  = useRef(0); // ✅ set in useEffect to avoid SSR mismatch

  // ✅ Fix hydration: Math.random() in useMemo causes server/client mismatch.
  // Use useState + useEffect so random selection only runs client-side.
  const [litSlots, setLitSlots] = useState([]);
  useEffect(() => {
    const always = slots.filter(s =>
      (s.tier === 'one') ||
      (s.tier === 'corner_ten') ||
      (s.occ && s.tier === 'ten')
    );
    const randOcc  = slots.filter(s => s.occ  && s.tier === 'hundred').sort(() => .5 - Math.random()).slice(0, 12);
    const randVac  = slots.filter(s => !s.occ && s.tier === 'hundred').sort(() => .5 - Math.random()).slice(0, 8);
    const randVir  = slots.filter(s => s.tier === 'thousand').sort(() => .5 - Math.random()).slice(0, 20);
    setLitSlots([...always, ...randOcc, ...randVac, ...randVir]);
  }, [slots.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const COLS = GRID_COLS;
    const ROWS = GRID_ROWS;

    // Taille canvas = taille de la fenêtre entière
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Calculer la taille de bloc pour que la grille remplisse tout l'écran (cover)
    const scaleX = W / COLS;
    const scaleY = H / ROWS;
    const scale  = Math.max(scaleX, scaleY) * 1.05; // légère marge pour éviter les bords vides

    const BSZ  = scale * 0.82; // bloc = 82% du step
    const GAP  = scale * 0.18; // gap  = 18% du step
    const STEP = BSZ + GAP;

    // Offset pour centrer la grille dans la fenêtre
    const gridW  = COLS * STEP;
    const gridH  = ROWS * STEP;
    const offsetX = (W - gridW) / 2;
    const offsetY = (H - gridH) / 2;

    // hi-dpi
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    // Build a lookup: slot id → slot
    const slotMap = {};
    slots.forEach(s => { slotMap[`${s.x},${s.y}`] = s; });

    // Phase offset per lit slot (so pulses are staggered)
    const phases = {};
    litSlots.forEach((s, i) => { phases[`${s.x},${s.y}`] = (i / litSlots.length) * Math.PI * 2; });

    function draw(now) {
      const t = (now - startRef.current) / 1000; // seconds
      ctx.clearRect(0, 0, W, H);

      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          const key = `${x},${y}`;
          const slot = slotMap[key];
          if (!slot) continue;

          const isLit = phases[key] !== undefined;
          const c = TIER_COLOR[slot.tier];

          // base opacity: very dim for all blocks
          let baseAlpha = 0.04;
          if (slot.tier === 'one')        baseAlpha = 0.22;
          else if (slot.tier === 'ten' || slot.tier === 'corner_ten') baseAlpha = 0.12;
          else if (slot.tier === 'hundred') baseAlpha = 0.06;

          let alpha = baseAlpha;
          let glowR = 0;

          if (isLit) {
            const phase  = phases[key];
            const pulse  = 0.5 + 0.5 * Math.sin(t * 0.9 + phase); // 0→1
            const pulse2 = 0.5 + 0.5 * Math.sin(t * 0.4 + phase + 1.2);

            if (slot.tier === 'one') {
              alpha  = 0.55 + 0.35 * pulse;
              glowR  = (BSZ * 3.5 + BSZ * 2 * pulse2);
            } else if (slot.tier === 'ten' || slot.tier === 'corner_ten') {
              alpha  = 0.28 + 0.22 * pulse;
              glowR  = (BSZ * 1.8 + BSZ * 0.8 * pulse2);
            } else if (slot.tier === 'hundred') {
              alpha  = 0.12 + 0.14 * pulse;
              glowR  = (BSZ * 1.2 + BSZ * 0.5 * pulse2);
            } else {
              alpha  = 0.06 + 0.07 * pulse;
              glowR  = (BSZ * 0.7 + BSZ * 0.3 * pulse2);
            }
          }

          const px = offsetX + x * STEP;
          const py = offsetY + y * STEP;
          const r  = slot.tier === 'one' ? 3 : slot.tier === 'ten' || slot.tier === 'corner_ten' ? 2 : 1;

          // glow halo
          if (glowR > 0) {
            const grd = ctx.createRadialGradient(px + BSZ/2, py + BSZ/2, 0, px + BSZ/2, py + BSZ/2, glowR);
            grd.addColorStop(0, hexWithAlpha(c, alpha * 0.55));
            grd.addColorStop(1, hexWithAlpha(c, 0));
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(px + BSZ/2, py + BSZ/2, glowR, 0, Math.PI * 2);
            ctx.fill();
          }

          // block fill
          ctx.fillStyle = hexWithAlpha(c, alpha);
          roundRect(ctx, px, py, BSZ, BSZ, r);
          ctx.fill();
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [slots, litSlots, isMobile]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        pointerEvents: 'none',
        opacity: 0.55,
        mixBlendMode: 'screen',
      }}
    />
  );
}

function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Landing Page ──────────────────────────────────────────────
function LandingPage({ slots, onPublic, onAdvertiser, onWaitlist }) {
  const { isMobile } = useScreenSize();
  const t = useT();
  const stats = useMemo(() => ({ occupied: slots.filter(s => s.occ).length, vacant: slots.filter(s => !s.occ).length }), [slots]);
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    // Total impressions + clics toutes campagnes
    fetch(`${url}/rest/v1/slot_clicks?select=event_type`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    })
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows)) return;
        const impressions = rows.filter(r => r.event_type === 'impression').length;
        const clicks      = rows.filter(r => r.event_type === 'click').length;
        setPlatformStats({ impressions, clicks });
      })
      .catch(() => {});
  }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', padding: isMobile ? '32px 20px 48px' : '48px 40px', position: 'relative', overflowY: 'auto', overflowX: 'hidden', background: U.bg }}>

      {/* Animated mini-grid background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <LandingGrid slots={slots} />
        {/* Radial vignette — centre transparent, bords opaques */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, ${U.bg}cc 60%, ${U.bg} 100%)` }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, width: '100%', textAlign: 'center', animation: 'fadeUp 0.5s ease forwards' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, marginBottom: 28, background: U.s1, border: `1px solid ${U.border2}`, color: U.muted, fontSize: 11 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: U.accent, boxShadow: `0 0 6px ${U.accent}` }} />
          <span>{t('landing.badge')}</span>
        </div>

        <h1 style={{ color: U.text, fontWeight: 700, fontSize: isMobile ? 36 : 52, lineHeight: 1.05, fontFamily: F.h, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
          {t('landing.title1')}<br />
          <span style={{ color: U.accent }}>{t('landing.title2')}</span>
        </h1>

        <p style={{ color: U.muted, fontSize: isMobile ? 14 : 16, lineHeight: 1.7, maxWidth: 460, margin: '0 auto 36px' }}>
{t('landing.sub')}
        </p>

        {/* Stats live plateforme */}
        <div style={{ display: 'flex', gap: isMobile ? 16 : 36, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
          {[
            [stats.occupied,                                                              t('landing.stat.active'),  false],
            [stats.vacant,                                                                t('landing.stat.free'),    false],
            [platformStats ? platformStats.impressions.toLocaleString('fr-FR') : '—',    'vues totales',             true],
            [platformStats ? platformStats.clicks.toLocaleString('fr-FR')      : '—',    'clics générés',            true],
            ['1€',                                                                        t('landing.stat.from'),    false],
          ].map(([v, l, live]) => (
            <div key={l} style={{ textAlign: 'center', minWidth: 60 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                {live && <div style={{ width:5, height:5, borderRadius:'50%', background:'#00e8a2', boxShadow:'0 0 6px #00e8a2', flexShrink:0 }} />}
                <div style={{ color: live ? '#00e8a2' : U.text, fontWeight: 700, fontSize: isMobile ? 18 : 24, fontFamily: F.h, letterSpacing: '-0.02em' }}>{v}</div>
              </div>
              <div style={{ color: U.muted, fontSize: 10, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onPublic} style={{ padding: isMobile ? '12px 20px' : '14px 26px', borderRadius: 10, background: U.s1, border: `1px solid ${U.border2}`, cursor: 'pointer', fontFamily: F.b, color: U.text, fontWeight: 600, fontSize: 14, transition: 'background 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = U.s2; e.currentTarget.style.borderColor = U.accent + '60'; }}
            onMouseLeave={e => { e.currentTarget.style.background = U.s1; e.currentTarget.style.borderColor = U.border2; }}>
            {t('landing.cta.explore')}
          </button>
          <button onClick={onAdvertiser} style={{ padding: isMobile ? '12px 20px' : '14px 26px', borderRadius: 10, background: U.s1, border: `1px solid ${U.border2}`, cursor: 'pointer', fontFamily: F.b, color: U.text, fontWeight: 600, fontSize: 14, transition: 'background 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = U.s2; e.currentTarget.style.borderColor = U.accent + '60'; }}
            onMouseLeave={e => { e.currentTarget.style.background = U.s1; e.currentTarget.style.borderColor = U.border2; }}>
            {t('landing.cta.choose')}
          </button>
          <button onClick={onWaitlist} style={{ padding: isMobile ? '12px 20px' : '14px 26px', borderRadius: 10, background: U.accent, border: 'none', cursor: 'pointer', fontFamily: F.b, color: U.accentFg, fontWeight: 700, fontSize: 14, boxShadow: `0 0 24px ${U.accent}50, 0 2px 8px rgba(0,0,0,0.4)`, transition: 'box-shadow 0.2s' }}>
            {t('landing.cta.waitlist')}
          </button>
        </div>

        <div style={{ marginTop: 20, color: U.muted, fontSize: 12 }}>{t('landing.tagline')}</div>

        {/* Legal footer links */}
        <div style={{ marginTop: 36, paddingTop: 24, borderTop: `1px solid ${U.border}`, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['FAQ', '/faq'], ['CGV', '/cgv'], ['Mentions légales', '/legal'], ['Confidentialité', '/privacy']].map(([label, href]) => (
            <a key={href} href={href} style={{ color: U.muted, fontSize: 11, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = U.text}
              onMouseLeave={e => e.currentTarget.style.color = U.muted}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]             = useState('fr');
  const [view, setView]             = useState('landing');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [checkoutSlot, setCheckoutSlot] = useState(null);
  const [buyoutSlot, setBuyoutSlot]     = useState(null);
  const [showBoost, setShowBoost]       = useState(false);
  const [authUser, setAuthUser]         = useState(null);
  const [userBookings, setUserBookings]  = useState([]);
  const { slots, isLive, loading }  = useGridData();
  const { isMobile } = useScreenSize();
  const handleWaitlist = useCallback(() => setShowWaitlist(true), []);

  // Charger la session auth + bookings utilisateur au montage
  useEffect(() => {
    getSession().then(s => {
      const user = s?.user || null;
      setAuthUser(user);
      if (user) {
        // Fetch user's active bookings via Supabase REST
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          fetch(`${url}/rest/v1/bookings?advertiser_id=eq.${user.id}&status=in.(active,pending)&select=id,slot_x,slot_y,status,is_boosted`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
          }).then(r => r.json()).then(data => {
            if (Array.isArray(data)) setUserBookings(data);
          }).catch(() => {});
        }
      }
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setAuthUser(null);
  }, []);

 const handleCheckout = useCallback(slot => {
  if (slot?.occ) {
    setBuyoutSlot(slot);
    return;
  }

  if (slot) {
    setCheckoutSlot(slot);
  } else {
    setShowWaitlist(true);
  }
}, []);

  const isGrid = view === 'public' || view === 'advertiser';
  const t = getT(lang);

  return (
    <LangContext.Provider value={lang}>
      <div style={{ display: 'flex', height: '100vh', background: U.bg, fontFamily: F.b, color: U.text, flexDirection: 'column', overflow: view === 'landing' ? 'auto' : 'hidden' }}>
        <AnnouncementBar />

        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 24px', height: 48, flexShrink: 0, borderBottom: `1px solid ${U.border}`, background: `${U.s1}f0`, backdropFilter: 'blur(14px)', zIndex: 100, gap: 8 }}>
          <BrandLogo size={isMobile ? 15 : 17} onClick={() => setView('landing')} />

          <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[
              ['public',     t('nav.explore'),  '◈'],
              ['advertiser', t('nav.reserve'),  '⊞'],
            ].map(([v, label, icon]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: isMobile ? '5px 7px' : '5px 12px', borderRadius: 7, fontFamily: F.b, cursor: 'pointer', background: view === v ? U.s2 : 'transparent', border: `1px solid ${view === v ? U.border2 : 'transparent'}`, color: view === v ? U.text : U.muted, fontSize: isMobile ? 11 : 12, fontWeight: view === v ? 600 : 400, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {isMobile ? (view === v ? label : icon) : label}
              </button>
            ))}
            <button onClick={handleWaitlist} style={{ padding: isMobile ? '5px 8px' : '6px 14px', borderRadius: 7, fontFamily: F.b, cursor: 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontSize: isMobile ? 10 : 12, fontWeight: 700, marginLeft: 2, boxShadow: `0 0 16px ${U.accent}45`, whiteSpace: 'nowrap' }}>
              {isMobile ? t('nav.waitlist.short') : t('nav.waitlist')}
            </button>

            {/* ── Auth icons ── */}
            {authUser ? (
              <>
                {/* Icône profil → dashboard */}
                <a href="/dashboard" title="Mon dashboard"
                  style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(212,168,75,0.15)', border: `1.5px solid ${U.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,75,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,168,75,0.15)'; }}
                >
                  <span style={{ fontSize: 14 }}>👤</span>
                </a>
                {/* Déconnexion */}
                {!isMobile && (
                  <button onClick={handleSignOut} title="Se déconnecter"
                    style={{ width: 30, height: 30, borderRadius: '50%', background: U.faint, border: `1px solid ${U.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = U.err; e.currentTarget.style.color = U.err; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = U.border2; e.currentTarget.style.color = U.muted; }}
                  >
                    <span style={{ fontSize: 13, color: U.muted }}>⏻</span>
                  </button>
                )}
              </>
            ) : (
              <a href="/dashboard/login" title="Se connecter"
                style={{ width: 30, height: 30, borderRadius: '50%', background: U.faint, border: `1px solid ${U.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = U.border2; e.currentTarget.style.background = U.faint; }}
              >
                <span style={{ fontSize: 14 }}>🔑</span>
              </a>
            )}

            {/* ── Language toggle ── */}
            <button
              onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
              style={{ marginLeft: isMobile ? 2 : 4, padding: isMobile ? '4px 7px' : '4px 9px', borderRadius: 7, fontFamily: F.b, cursor: 'pointer', background: U.faint, border: `1px solid ${U.border2}`, color: U.muted, fontSize: isMobile ? 10 : 11, fontWeight: 700, letterSpacing: '0.05em', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = U.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = U.muted; }}
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
          </nav>
        </header>

        {view === 'landing'    && <LandingPage    slots={slots} onPublic={() => setView('public')} onAdvertiser={() => setView('advertiser')} onWaitlist={handleWaitlist} />}
        {view === 'public'     && <PublicView     slots={slots} isLive={isLive} onGoAdvertiser={() => setShowBoost(true)} onWaitlist={handleWaitlist} authUser={authUser} userBookings={userBookings} />}
        {view === 'advertiser' && <AdvertiserView slots={slots} isLive={isLive} onWaitlist={handleWaitlist} onCheckout={handleCheckout} />}
        {showWaitlist  && <WaitlistModal  onClose={() => setShowWaitlist(false)} />}
        {checkoutSlot  && <CheckoutModal  slot={checkoutSlot} onClose={() => setCheckoutSlot(null)} />}
        {buyoutSlot    && <BuyoutModal    slot={buyoutSlot}   onClose={() => setBuyoutSlot(null)} />}
        {showBoost     && <BoostModal     onClose={() => setShowBoost(false)} />}
      </div>
    </LangContext.Provider>
  );
}
