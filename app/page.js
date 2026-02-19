'use client';
import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import {
  D, FF, GRID_COLS, GRID_ROWS, CENTER_X, CENTER_Y,
  TIER_SIZE, TIER_COLOR, TIER_LABEL, TIER_PRICE, PROFILES,
  buildStructuralGrid, buildDemoGrid, mergeGridWithBookings,
} from '../lib/grid';
import {
  isSupabaseConfigured, fetchActiveSlots,
  subscribeToBookings, createCheckoutSession,
  fetchSlotStats, submitBuyoutOffer, recordClick,
} from '../lib/supabase';

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

// ─── Hooks ────────────────────────────────────────────────────

function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { w, isMobile: w < 768 };
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
  const k = isMobile ? 2 : Math.max(0.1, containerW / baseW);

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
  if (!visible) return null;
  return (
    <div style={{ background: U.s1, borderBottom: `1px solid ${U.border}`, padding: '9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: U.muted }}>
        <span style={{ background: U.accentFg, color: U.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 3 }}>BÊTA</span>
        <span>Plateforme en développement — réservations bientôt disponibles.</span>
        <button onClick={() => {}} style={{ color: U.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: F.b }}>
          Rejoindre la liste d'attente →
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
  return (
    <Modal onClose={onClose} width={520} isMobile={isMobile}>
      <div style={{ padding: isMobile ? '24px 20px 32px' : '40px 40px 44px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: U.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>ACCÈS ANTICIPÉ</div>
          <h2 style={{ color: U.text, fontWeight: 700, fontSize: 22, fontFamily: F.h, margin: 0, letterSpacing: '-0.02em' }}>Soyez parmi les premiers</h2>
          <p style={{ color: U.muted, fontSize: 13, lineHeight: 1.65, marginTop: 10, marginBottom: 0 }}>
            La plateforme ouvre bientôt. Inscrivez-vous pour être notifié et obtenir un tarif de lancement.
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
        <div style={{ marginTop: 14, color: U.muted, fontSize: 11, textAlign: 'center' }}>Aucun spam. Désabonnement en un clic.</div>
      </div>
    </Modal>
  );
}

// ─── Checkout Modal ────────────────────────────────────────────
function CheckoutModal({ slot, onClose }) {
  const { isMobile } = useScreenSize();
  const [email, setEmail]   = useState('');
  const [days, setDays]     = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const tier = slot?.tier;
  const pricePerDay = TIER_PRICE[tier] || 1;
  const totalPrice  = pricePerDay * days;
  const c = TIER_COLOR[tier];

  const handleCheckout = async () => {
    if (!email || !email.includes('@')) { setError('Entrez un email valide'); return; }
    setLoading(true); setError(null);
    try {
      const { url } = await createCheckoutSession({ slotX: slot.x, slotY: slot.y, tier: slot.tier, days, email });
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Erreur lors du paiement');
      setLoading(false);
    }
  };

  if (!slot) return null;
  return (
    <Modal onClose={onClose} width={460} isMobile={isMobile}>
      <div style={{ padding: isMobile ? '24px 20px 32px' : '36px 36px 40px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: `${c}18`, border: `1px solid ${c}30`, color: c, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 10 }}>{TIER_LABEL[tier]}</div>
          <h2 style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, margin: 0, letterSpacing: '-0.02em' }}>Réserver ce bloc</h2>
          <div style={{ color: U.muted, fontSize: 12, marginTop: 4 }}>Position ({slot.x}, {slot.y}) · €{pricePerDay}/jour</div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 10 }}>DURÉE</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} style={{ flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontFamily: F.b, background: days === d ? `${c}15` : U.faint, border: `1px solid ${days === d ? c + '55' : U.border}`, color: days === d ? U.text : U.muted, fontWeight: days === d ? 600 : 400, fontSize: 13, transition: 'all 0.15s' }}>
                {d}j
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>€{pricePerDay * d}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 10 }}>EMAIL</div>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            style={{ width: '100%', padding: '11px 14px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 14, fontFamily: F.b, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = U.border2}
            onBlur={e => e.target.style.borderColor = U.border}
          />
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: U.muted, fontSize: 13 }}>{days} jours × €{pricePerDay}</span>
          <span style={{ color: U.text, fontWeight: 700, fontSize: 18, fontFamily: F.h }}>€{totalPrice}</span>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: `${U.err}12`, border: `1px solid ${U.err}30`, color: U.err, fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{error}</div>
        )}

        <button onClick={handleCheckout} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 10, fontFamily: F.b, cursor: loading ? 'wait' : 'pointer', background: loading ? U.s2 : U.accent, border: 'none', color: loading ? U.muted : U.accentFg, fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s, box-shadow 0.2s', boxShadow: loading ? 'none' : `0 0 22px ${U.accent}50` }}>
          {loading ? 'Redirection vers Stripe…' : `Payer €${totalPrice}`}
        </button>
        <div style={{ marginTop: 10, color: U.muted, fontSize: 11, textAlign: 'center' }}>Paiement sécurisé · Annulation possible</div>
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

// BlockCell — mémoïsé, reçoit sa taille via sz prop
const BlockCell = memo(({ slot, isSelected, onSelect, onFocus, sz: szProp }) => {
  const { tier, occ, tenant, hot } = slot;
  let sz = szProp !== undefined ? szProp : TIER_SIZE[tier];
  const c = TIER_COLOR[tier];
  const isCornerTen = tier === 'corner_ten';
  const r = tier === 'one' ? Math.round(sz * 0.1) : tier === 'ten' || isCornerTen ? Math.round(sz * 0.09) : tier === 'hundred' ? 3 : 2;

  return (
    <div
      onClick={() => occ ? onFocus(slot) : onSelect(slot)}
      title={occ ? tenant?.name : `${TIER_LABEL[tier]} — €${TIER_PRICE[tier]}/j`}
      style={{
        width: sz, height: sz,
        borderRadius: r,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        flexShrink: 0,
        border: `1px solid ${isSelected ? c : isCornerTen ? c + '70' : occ ? c + '40' : U.border}`,
        background: occ ? (tenant?.b || U.s2) : U.s2,
        outline: isSelected ? `2px solid ${c}` : 'none',
        outlineOffset: 1,
        boxShadow: isSelected
          ? `0 0 0 2px ${c}60, 0 0 ${sz * 0.5}px ${c}35`
          : isCornerTen
            ? `0 0 ${sz * 0.6}px ${c}28, inset 0 0 ${sz * 0.3}px ${c}08`
            : occ && sz >= 24
              ? `0 0 ${sz * 0.35}px ${c}22`
              : 'none',
        transition: 'opacity 0.2s, outline 0.1s, box-shadow 0.3s',
      }}
    >
      {occ && <BlockMedia tenant={tenant} tier={tier} sz={sz} />}
      {!occ && sz >= 8 && (
        <div style={{ position: 'absolute', inset: 0, background: `${c}06`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {sz >= 28 && <div style={{ width: '30%', height: 1, background: `${c}25`, borderRadius: 1 }} />}
        </div>
      )}
      {occ && hot && <div style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: '#ff4455', animation: 'blink 1.5s infinite' }} />}
    </div>
  );
});
BlockCell.displayName = 'BlockCell';

// ─── Buyout Modal ──────────────────────────────────────────────
function BuyoutModal({ slot, onClose }) {
  const { isMobile } = useScreenSize();
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
            <h2 style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Faire une offre de rachat</h2>
            <p style={{ color: U.muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              L'occupant actuel recevra votre offre et aura <strong style={{ color: U.text }}>72 heures</strong> pour accepter ou refuser. Aucun débit si refusé.
            </p>
          </div>

          {/* Offer amount */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 8 }}>VOTRE OFFRE</div>
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = U.border2} onBlur={e => e.target.style.borderColor = U.border} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 6 }}>NOM (optionnel)</div>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Votre marque"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: U.faint, border: `1px solid ${U.border}`, color: U.text, fontSize: 13, fontFamily: F.b, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = U.border2} onBlur={e => e.target.style.borderColor = U.border} />
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 6 }}>MESSAGE POUR L'OCCUPANT (optionnel)</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Expliquez pourquoi vous voulez ce bloc..."
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
          <p style={{ color: U.muted, fontSize: 11, textAlign: 'center', marginTop: 10, marginBottom: 0 }}>Aucun débit maintenant · Paiement seulement si accepté</p>
        </>) : (
          /* Step 2 — Confirmation */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${U.accent}15`, border: `1px solid ${U.accent}30`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <polyline points="4,11 9,16 18,6" stroke={U.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, letterSpacing: '-0.02em', margin: '0 0 10px' }}>Offre envoyée</h2>
            <p style={{ color: U.muted, fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
              L'occupant a été notifié. Vous recevrez une réponse par email sous <strong style={{ color: U.text }}>72 heures</strong>.<br/>Si l'offre est acceptée, vous serez débité et le bloc vous sera transféré immédiatement.
            </p>
            <button onClick={onClose} style={{ padding: '12px 28px', borderRadius: 10, fontFamily: F.b, cursor: 'pointer', background: U.s2, border: `1px solid ${U.border2}`, color: U.text, fontWeight: 600, fontSize: 13 }}>Fermer</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Focus Modal ───────────────────────────────────────────────
function FocusModal({ slot, allSlots, onClose, onNavigate, onGoAdvertiser }) {
  const [entered, setEntered] = useState(false);
  const [dir, setDir] = useState(0);
  const { isMobile } = useScreenSize();
  const occupiedSlots = useMemo(() => allSlots.filter(s => s.occ), [allSlots]);
  const curIdx  = occupiedSlots.findIndex(s => s.id === slot?.id);
  const hasPrev = curIdx > 0;
  const hasNext = curIdx < occupiedSlots.length - 1;
  const goPrev  = useCallback(() => { if (!hasPrev) return; setDir(-1); onNavigate(occupiedSlots[curIdx - 1]); setTimeout(() => setDir(0), 250); }, [hasPrev, curIdx, occupiedSlots, onNavigate]);
  const goNext  = useCallback(() => { if (!hasNext) return; setDir(1); onNavigate(occupiedSlots[curIdx + 1]); setTimeout(() => setDir(0), 250); }, [hasNext, curIdx, occupiedSlots, onNavigate]);
  useEffect(() => { const t = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(t); }, [slot]);
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
              <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: `${c}18`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: c, fontFamily: F.h }}>
                {tenant.l}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: U.text, fontWeight: 700, fontSize: 19, fontFamily: F.h, marginBottom: 3, letterSpacing: '-0.02em' }}>{tenant.name}</div>
                <div style={{ color: U.muted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.slogan}</div>
              </div>
            </div>
            <a href={tenant.url} target="_blank" rel="noopener noreferrer" onClick={e => { e.stopPropagation(); recordClick(slot.x, slot.y, slot.bookingId); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 20px', borderRadius: 10, background: c, color: U.accentFg, fontWeight: 700, fontSize: 14, fontFamily: F.b, textDecoration: 'none', boxShadow: `0 0 22px ${c}50`, transition: 'opacity 0.15s' }}>
              {tenant.cta} →
            </a>
          </div>
        ) : (
          <div style={{ padding: isMobile ? '32px 20px' : '48px 28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${TIER_COLOR[tier]}10`, border: `1px solid ${TIER_COLOR[tier]}25`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${TIER_COLOR[tier]}60`, background: `${TIER_COLOR[tier]}12` }} />
            </div>
            <div style={{ color: U.text, fontWeight: 700, fontSize: 18, fontFamily: F.h, marginBottom: 8, letterSpacing: '-0.02em' }}>Espace libre</div>
            <div style={{ color: U.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              Ce bloc {TIER_LABEL[tier]} n'est actuellement occupé par personne.<br/>
              Pour le louer ou faire une offre, rendez-vous dans<br/><span style={{ color: U.text, fontWeight: 600 }}>Mon espace</span>.
            </div>
            <button onClick={() => { onClose(); onGoAdvertiser(); }} style={{ padding: '11px 24px', borderRadius: 10, fontFamily: F.b, cursor: 'pointer', background: U.faint, border: `1px solid ${U.border2}`, color: U.text, fontWeight: 600, fontSize: 13 }}>
              Voir Mon espace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TikTok Feed ───────────────────────────────────────────────
function TikTokFeed({ slots, isLive }) {
  const feedRef = useRef(null);
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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: U.muted, fontSize: 14 }}>Aucun bloc actif</div>
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
                    <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, marginTop: 8, letterSpacing: '0.05em' }}>DISPONIBLE</div>
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
                <a href={tenant.url} target="_blank" rel="noopener noreferrer" onClick={() => recordClick(slot.x, slot.y, slot.bookingId)} style={{ display: 'block', padding: '10px 14px', borderRadius: 9, background: c, color: U.accentFg, fontWeight: 700, fontSize: 12, fontFamily: F.b, textDecoration: 'none', textAlign: 'center', boxShadow: `0 0 18px ${c}50` }}>{tenant.cta} →</a>
              </>): null}
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

// ─── Public View ───────────────────────────────────────────────
function PublicView({ slots, isLive, onGoAdvertiser }) {
  const containerRef  = useRef(null);
  const [containerW, setContainerW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const [containerH, setContainerH] = useState(typeof window !== 'undefined' ? window.innerHeight - 80 : 1000);
  const [focusSlot, setFocusSlot]   = useState(null);
  const [filterTier, setFilterTier] = useState('all');
  const [feedMode, setFeedMode]     = useState(false);
  const { isMobile } = useScreenSize();

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
    if (filterTier !== 'all') s = s.filter(sl => sl.tier === filterTier || (filterTier === 'ten' && sl.tier === 'corner_ten'));
    return new Set(s.map(sl => sl.id));
  }, [slots, filterTier]);

  const stats = useMemo(() => ({ occupied: slots.filter(s => s.occ).length, vacant: slots.filter(s => !s.occ).length }), [slots]);

  const tierFilters = [
    ['all', 'Tous'],
    ['one', 'Épicentre'],
    ['ten', 'Prestige'],
    ['hundred', 'Business'],
    ['thousand', 'Viral'],
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: U.bg }}>
      {/* Toolbar */}
      <div style={{ height: 44, padding: '0 16px', borderBottom: `1px solid ${U.border}`, background: U.s1, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', background: U.faint, border: `1px solid ${U.border}`, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
          {[['grid','Grille'], ['feed','Feed']].map(([id, label]) => (
            <button key={id} onClick={() => setFeedMode(id === 'feed')} style={{ padding: '4px 12px', fontFamily: F.b, cursor: 'pointer', fontSize: 11, background: (feedMode ? 'feed' : 'grid') === id ? U.s2 : 'transparent', border: 'none', color: (feedMode ? 'feed' : 'grid') === id ? U.text : U.muted, fontWeight: (feedMode ? 'feed' : 'grid') === id ? 600 : 400, transition: 'all 0.15s' }}>{label}</button>
          ))}
        </div>

        {!feedMode && <>
          <div style={{ width: 1, height: 16, background: U.border, flexShrink: 0 }} />
          {tierFilters.map(([id, label]) => (
            <button key={id} onClick={() => setFilterTier(id)} style={{ padding: '4px 10px', borderRadius: 6, fontFamily: F.b, cursor: 'pointer', fontSize: 11, background: filterTier === id ? U.s2 : 'transparent', border: `1px solid ${filterTier === id ? U.border2 : 'transparent'}`, color: filterTier === id ? U.text : U.muted, fontWeight: filterTier === id ? 600 : 400, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{label}</button>
          ))}
        </>}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          {isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4caf50', animation: 'blink 2s infinite' }} />
              <span style={{ color: U.muted, fontSize: 10, fontWeight: 500 }}>Live</span>
            </div>
          )}
          {!isMobile && (
            <>
              <span style={{ color: U.muted, fontSize: 11 }}><span style={{ color: U.text, fontWeight: 600 }}>{stats.occupied}</span> actifs</span>
              <span style={{ color: U.muted, fontSize: 11 }}><span style={{ color: U.text, fontWeight: 600 }}>{stats.vacant}</span> libres</span>
            </>
          )}
        </div>


      </div>

      {/* Les deux vues restent dans le DOM — display:none évite le remount et préserve containerW */}
      <div style={{ flex: 1, display: feedMode ? 'none' : 'flex', overflow: 'auto', alignItems: 'flex-start', justifyContent: 'center' }} ref={containerRef}>
        <div style={{ position: 'relative', width: totalGridW, height: totalGridH, flexShrink: 0 }}>
          {slots.map(slot => (
            <div key={slot.id} style={{ position: 'absolute', left: colOffsets[slot.x], top: rowOffsets[slot.y], opacity: filteredSlots.has(slot.id) ? 1 : 0.06, transition: 'opacity 0.2s' }}>
              <BlockCell slot={slot} isSelected={false} onSelect={() => {}} onFocus={setFocusSlot} sz={tierSizes[slot.tier]} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: feedMode ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
        <TikTokFeed slots={slots} isLive={isLive} />
      </div>
      {focusSlot && <FocusModal slot={focusSlot} allSlots={slots} onClose={() => setFocusSlot(null)} onNavigate={setFocusSlot} onGoAdvertiser={onGoAdvertiser} />}
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
  const dimmed = activeTier && !isTierHighlighted;
  const r = t === 'one' ? Math.round(sz * 0.1) : t === 'ten' || t === 'corner_ten' ? Math.round(sz * 0.09) : t === 'hundred' ? 3 : 2;

  if (occ) return (
    <div onClick={() => onChoose(slot)} style={{ width: sz, height: sz, borderRadius: r, background: occ ? (slot.tenant?.b || U.s2) : U.s2, border: `1px solid ${isTierHighlighted ? c + '50' : isChosen ? c + '80' : c + '25'}`, position: 'relative', overflow: 'hidden', flexShrink: 0, opacity: dimmed ? 0.1 : 1, cursor: 'pointer', outline: isChosen ? `2px solid ${c}` : 'none', outlineOffset: 1, transition: 'opacity 0.25s, box-shadow 0.25s', boxShadow: isChosen ? `0 0 0 2px ${c}55, 0 0 ${sz * 0.5}px ${c}35` : isTierHighlighted ? `0 0 ${sz * 0.4}px ${c}18` : 'none' }}>
      {sz >= 12 && slot.tenant && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: slot.tenant.b || U.s2 }}>
          {sz >= 24 && <span style={{ color: slot.tenant.c, fontSize: Math.min(sz * 0.38, 28), fontWeight: 900, fontFamily: F.h, lineHeight: 1 }}>{slot.tenant.l}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div onClick={() => onChoose(slot)} style={{ width: sz, height: sz, flexShrink: 0, position: 'relative', borderRadius: r, background: isChosen ? `${c}18` : isTierHighlighted ? `${c}0c` : U.s2, border: `1px solid ${isChosen ? c + '80' : isTierHighlighted ? c + '40' : U.border}`, outline: isChosen ? `2px solid ${c}` : 'none', outlineOffset: 1, cursor: 'pointer', opacity: dimmed ? 0.1 : 1, boxShadow: isChosen ? `0 0 0 2px ${c}55, 0 0 ${sz * 0.5}px ${c}35` : isTierHighlighted ? `0 0 ${sz * 0.4}px ${c}22` : 'none', transition: 'opacity 0.25s, border-color 0.2s, background 0.2s, box-shadow 0.25s' }}>
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
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [chosenSlot, setChosenSlot]     = useState(null);
  const [hoveredTier, setHoveredTier]   = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [slotStats, setSlotStats]       = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const containerRef  = useRef(null);
  const [containerW, setContainerW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const [containerH, setContainerH] = useState(typeof window !== 'undefined' ? window.innerHeight - 80 : 1000);
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

  // Fetch stats when an occupied slot is chosen
  useEffect(() => {
    if (!chosenSlot?.occ) { setSlotStats(null); return; }
    setStatsLoading(true);
    fetchSlotStats(chosenSlot.x, chosenSlot.y)
      .then(({ data }) => setSlotStats(data))
      .catch(() => setSlotStats(null))
      .finally(() => setStatsLoading(false));
  }, [chosenSlot?.id]);

  const tiers = [
    { id: 'one',      label: 'Épicentre',  price: 1000, count: 1,   desc: 'Centre absolu' },
    { id: 'ten',      label: 'Prestige',   price: 100,  count: 48,  desc: 'Couronne centrale' },
    { id: 'corner_ten',label:'Corner',     price: 100,  count: 4,   desc: 'Coins stratégiques' },
    { id: 'hundred',  label: 'Business',   price: 10,   count: 576, desc: 'Zone intermédiaire' },
    { id: 'thousand', label: 'Viral',      price: 1,    count: 740, desc: 'Périphérie' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', background: U.bg }}>
      {/* Sidebar */}
      <div style={{ width: isMobile ? '100%' : 280, flexShrink: 0, background: U.s1, borderRight: isMobile ? 'none' : `1px solid ${U.border}`, borderBottom: isMobile ? `1px solid ${U.border}` : 'none', overflowY: 'auto', display: 'flex', flexDirection: 'column', order: isMobile ? 2 : 0 }}>
        <div style={{ padding: isMobile ? '16px 16px' : '24px 20px', borderBottom: `1px solid ${U.border}` }}>
          <div style={{ color: U.muted, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 14 }}>CHOISIR UN ESPACE</div>
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
                    <div style={{ color: isActive ? U.text : U.muted, fontWeight: 700, fontSize: 12, fontFamily: F.h }}>€{tier.price}<span style={{ fontSize: 9, fontWeight: 400 }}>/j</span></div>
                    <div style={{ color: U.muted, fontSize: 9 }}>{tier.count} blocs</div>
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
                {chosenSlot.occ ? 'OCCUPÉ' : TIER_LABEL[chosenSlot.tier]}
              </div>
              <div style={{ color: U.text, fontWeight: 700, fontSize: 13, fontFamily: F.h }}>
                {chosenSlot.occ ? (chosenSlot.tenant?.name || 'Occupé') : 'Bloc sélectionné'}
              </div>
              <div style={{ color: U.muted, fontSize: 11, marginTop: 2 }}>
                ({chosenSlot.x}, {chosenSlot.y}) · €{TIER_PRICE[chosenSlot.tier]}/j
              </div>
            </div>

            {/* Stats panel — uniquement si le slot est occupé */}
            {chosenSlot.occ && (
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${U.border}` }}>
                <div style={{ color: U.muted, fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', marginBottom: 10 }}>STATISTIQUES DU BLOC</div>
                {statsLoading ? (
                  <div style={{ color: U.muted, fontSize: 11, textAlign: 'center', padding: '8px 0' }}>Chargement…</div>
                ) : slotStats ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      [slotStats.impressions?.toLocaleString() ?? '—', 'Impressions'],
                      [slotStats.clicks?.toLocaleString() ?? '—', 'Clics total'],
                      [slotStats.ctr_pct != null ? `${slotStats.ctr_pct}%` : '—', 'CTR'],
                      [slotStats.clicks_7d?.toLocaleString() ?? '—', 'Clics 7j'],
                    ].map(([v, l]) => (
                      <div key={l} style={{ padding: '8px 10px', borderRadius: 7, background: U.s2, border: `1px solid ${U.border}` }}>
                        <div style={{ color: U.text, fontWeight: 700, fontSize: 15, fontFamily: F.h }}>{v}</div>
                        <div style={{ color: U.muted, fontSize: 9, marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: U.muted, fontSize: 11, textAlign: 'center', padding: '6px 0', fontStyle: 'italic' }}>Stats non disponibles en démo</div>
                )}
              </div>
            )}

            {/* CTA */}
            <div style={{ padding: '12px 16px' }}>
              {chosenSlot.occ ? (<>
                <button onClick={() => onCheckout(chosenSlot)} style={{ width: '100%', padding: '11px', borderRadius: 8, fontFamily: F.b, cursor: 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontWeight: 700, fontSize: 13, boxShadow: `0 0 20px ${U.accent}50`, marginBottom: 8 }}>
                  Faire une offre de rachat →
                </button>
                <div style={{ color: U.muted, fontSize: 10, textAlign: 'center', lineHeight: 1.5 }}>
                  L'occupant a 72h pour accepter · Aucun débit si refusé
                </div>
              </>) : (<>
                <button onClick={() => onCheckout(chosenSlot)} style={{ width: '100%', padding: '11px', borderRadius: 8, fontFamily: F.b, cursor: 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontWeight: 700, fontSize: 13, boxShadow: `0 0 20px ${U.accent}50`, marginBottom: 8 }}>
                  Louer ce bloc →
                </button>
                <div style={{ color: U.muted, fontSize: 10, textAlign: 'center' }}>
                  Disponible immédiatement · À partir de €{TIER_PRICE[chosenSlot.tier]}/jour
                </div>
              </>)}
            </div>
          </div>
        ) : (
          <div style={{ margin: '16px', borderRadius: 10, background: U.faint, border: `1px solid ${U.border}`, padding: '20px' }}>
            <div style={{ color: U.muted, fontSize: 12, lineHeight: 1.7, textAlign: 'center' }}>
              Survolez un tier pour filtrer la grille.<br/>
              Cliquez sur un bloc pour voir ses stats et options.
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px 20px', marginTop: 'auto' }}>
          <button onClick={onWaitlist} style={{ width: '100%', padding: '11px', borderRadius: 8, fontFamily: F.b, cursor: 'pointer', background: 'transparent', border: `1px solid ${U.border2}`, color: U.muted, fontWeight: 600, fontSize: 12 }}>
            Rejoindre la liste d'attente
          </button>
        </div>
      </div>

      {/* Grid */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', background: U.bg, order: isMobile ? 1 : 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: isMobile ? '40vh' : undefined }}>
        <div style={{ position: 'relative', width: totalGridW, height: totalGridH, flexShrink: 0 }}>
          {slots.map(slot => (
            <div key={slot.id} style={{ position: 'absolute', left: colOffsets[slot.x], top: rowOffsets[slot.y] }}>
              <AnonBlock slot={slot} chosenSlot={chosenSlot} activeTier={activeTier} onChoose={handleChoose} sz={tierSizes[slot.tier]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Landing Page ──────────────────────────────────────────────
function LandingPage({ slots, onPublic, onAdvertiser, onWaitlist }) {
  const { isMobile } = useScreenSize();
  const stats = useMemo(() => ({ occupied: slots.filter(s => s.occ).length, vacant: slots.filter(s => !s.occ).length }), [slots]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '32px 20px' : '48px 40px', position: 'relative', overflow: 'hidden', background: U.bg }}>

      {/* Subtle grid background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.04 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${U.border} 1px, transparent 1px), linear-gradient(90deg, ${U.border} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, width: '100%', textAlign: 'center', animation: 'fadeUp 0.5s ease forwards' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, marginBottom: 28, background: U.s1, border: `1px solid ${U.border2}`, color: U.muted, fontSize: 11 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: U.accent, boxShadow: `0 0 6px ${U.accent}` }} />
          <span>Bêta publique — lancement imminent</span>
        </div>

        <h1 style={{ color: U.text, fontWeight: 700, fontSize: isMobile ? 36 : 52, lineHeight: 1.05, fontFamily: F.h, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
          La grille publicitaire<br />
          <span style={{ color: U.accent }}>ouverte à tous.</span>
        </h1>

        <p style={{ color: U.muted, fontSize: isMobile ? 14 : 16, lineHeight: 1.7, maxWidth: 460, margin: '0 auto 36px' }}>
          1 369 blocs. Créateur, freelance ou grande marque — choisissez votre espace et diffusez votre contenu. Dès 1€/jour.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: isMobile ? 20 : 40, justifyContent: 'center', marginBottom: 40 }}>
          {[
            [stats.occupied, 'Blocs actifs'],
            [stats.vacant, 'Blocs libres'],
            ['1 369', 'Total'],
            ['1€', 'Dès'],
          ].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ color: U.text, fontWeight: 700, fontSize: isMobile ? 20 : 26, fontFamily: F.h, letterSpacing: '-0.02em' }}>{v}</div>
              <div style={{ color: U.muted, fontSize: 11, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onPublic} style={{ padding: isMobile ? '12px 20px' : '14px 26px', borderRadius: 10, background: U.s1, border: `1px solid ${U.border2}`, cursor: 'pointer', fontFamily: F.b, color: U.text, fontWeight: 600, fontSize: 14, transition: 'background 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = U.s2; e.currentTarget.style.borderColor = U.accent + '60'; }}
            onMouseLeave={e => { e.currentTarget.style.background = U.s1; e.currentTarget.style.borderColor = U.border2; }}>
            Explorer la grille
          </button>
          <button onClick={onAdvertiser} style={{ padding: isMobile ? '12px 20px' : '14px 26px', borderRadius: 10, background: U.s1, border: `1px solid ${U.border2}`, cursor: 'pointer', fontFamily: F.b, color: U.text, fontWeight: 600, fontSize: 14, transition: 'background 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = U.s2; e.currentTarget.style.borderColor = U.accent + '60'; }}
            onMouseLeave={e => { e.currentTarget.style.background = U.s1; e.currentTarget.style.borderColor = U.border2; }}>
            Choisir mon bloc
          </button>
          <button onClick={onWaitlist} style={{ padding: isMobile ? '12px 20px' : '14px 26px', borderRadius: 10, background: U.accent, border: 'none', cursor: 'pointer', fontFamily: F.b, color: U.accentFg, fontWeight: 700, fontSize: 14, boxShadow: `0 0 24px ${U.accent}50, 0 2px 8px rgba(0,0,0,0.4)`, transition: 'box-shadow 0.2s' }}>
            Liste d'attente →
          </button>
        </div>

        <div style={{ marginTop: 20, color: U.muted, fontSize: 12 }}>Sans budget minimum · Sans agence · Résultat immédiat</div>

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
  const [view, setView]             = useState('landing');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [checkoutSlot, setCheckoutSlot] = useState(null);
  const [buyoutSlot, setBuyoutSlot]     = useState(null);
  const { slots, isLive, loading }  = useGridData();
  const { isMobile } = useScreenSize();
  const handleWaitlist = useCallback(() => setShowWaitlist(true), []);

  const handleCheckout = useCallback(slot => {
    if (slot?.occ) { setBuyoutSlot(slot); return; }
    if (process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true') setCheckoutSlot(slot);
    else setShowWaitlist(true);
  }, []);

  const isGrid = view === 'public' || view === 'advertiser';

  return (
    <div style={{ display: 'flex', height: '100vh', background: U.bg, fontFamily: F.b, color: U.text, overflow: 'hidden', flexDirection: 'column' }}>
      <AnnouncementBar />

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 14px' : '0 24px', height: 48, flexShrink: 0, borderBottom: `1px solid ${U.border}`, background: `${U.s1}f0`, backdropFilter: 'blur(14px)', zIndex: 100 }}>
        <BrandLogo size={isMobile ? 15 : 17} onClick={() => setView('landing')} />

        <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[
            ['public', 'Explorer'],
            ['advertiser', 'Mon espace'],
          ].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: 7, fontFamily: F.b, cursor: 'pointer', background: view === v ? U.s2 : 'transparent', border: `1px solid ${view === v ? U.border2 : 'transparent'}`, color: view === v ? U.text : U.muted, fontSize: 12, fontWeight: view === v ? 600 : 400, transition: 'all 0.15s' }}>
              {isMobile ? label.split(' ')[0] : label}
            </button>
          ))}
          <button onClick={handleWaitlist} style={{ padding: '6px 14px', borderRadius: 7, fontFamily: F.b, cursor: 'pointer', background: U.accent, border: 'none', color: U.accentFg, fontSize: 12, fontWeight: 700, marginLeft: 4, boxShadow: `0 0 16px ${U.accent}45` }}>
            {isMobile ? 'Attente' : 'Liste d\'attente'}
          </button>
        </nav>
      </header>

      {view === 'landing'    && <LandingPage    slots={slots} onPublic={() => setView('public')} onAdvertiser={() => setView('advertiser')} onWaitlist={handleWaitlist} />}
      {view === 'public'     && <PublicView     slots={slots} isLive={isLive} onGoAdvertiser={() => setView('advertiser')} />}
      {view === 'advertiser' && <AdvertiserView slots={slots} isLive={isLive} onWaitlist={handleWaitlist} onCheckout={handleCheckout} />}
      {showWaitlist  && <WaitlistModal  onClose={() => setShowWaitlist(false)} />}
      {checkoutSlot  && <CheckoutModal  slot={checkoutSlot} onClose={() => setCheckoutSlot(null)} />}
      {buyoutSlot    && <BuyoutModal    slot={buyoutSlot}   onClose={() => setBuyoutSlot(null)} />}
    </div>
  );
}
