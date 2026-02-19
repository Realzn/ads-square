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
} from '../lib/supabase';

// ─── Hooks ────────────────────────────────────────────────

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
  const demoGrid = useMemo(() => buildDemoGrid(), []);
  const [slots, setSlots] = useState(demoGrid);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    fetchActiveSlots().then(({ data, error }) => {
      if (!error && data.length > 0) {
        setSlots(mergeGridWithBookings(structuralGrid, data));
        setIsLive(true);
      } else if (!error && data.length === 0) {
        setSlots(structuralGrid.map(s => ({ ...s, occ: false, tenant: null, hot: false })));
        setIsLive(true);
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

// BASE sizes (ratio reference — never rendered directly on desktop)
const BASE_SIZE = { one: 120, ten: 52, corner_ten: 52, hundred: 26, thousand: 11 };
const GAP = 2;

// Precompute base col/row structure once
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

/**
 * Responsive grid layout — fills the given container exactly at scale=1.
 * k = min(containerW/baseW, containerH/baseH)
 * Returns actual pixel positions + dynamic tier sizes.
 * On mobile (isMobile=true): uses fixed 2x base sizes + scrollable layout.
 */
function useGridLayout(containerW, containerH, isMobile) {
  const PAD = isMobile ? 8 : 16;
  const { cw, rh, baseW, baseH } = _BASE_LAYOUT;

  // k: scale factor that fills the container exactly
  const k = isMobile
    ? 2 // fixed 2x on mobile (scrollable)
    : Math.max(0.1, Math.min(
        (containerW - PAD * 2) / baseW,
        (containerH - PAD * 2) / baseH
      ));

  const tierSizes = useMemo(() => ({
    one:       Math.round(BASE_SIZE.one        * k),
    ten:       Math.round(BASE_SIZE.ten        * k),
    corner_ten:Math.round(BASE_SIZE.corner_ten * k),
    hundred:   Math.round(BASE_SIZE.hundred    * k),
    thousand:  Math.max(2, Math.round(BASE_SIZE.thousand  * k)),
  }), [k]);

  const colWidths  = useMemo(() => cw.map(w => Math.round(w * k)), [k]);
  const rowHeights = useMemo(() => rh.map(h => Math.round(h * k)), [k]);

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

// ─── Small Components ─────────────────────────────────────

function BrandLogo({ size = 22, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: size * 1.1, height: size * 1.1, borderRadius: size * 0.22, background: `linear-gradient(135deg,${D.cyan}33,${D.violet}22)`, border: `1.5px solid ${D.cyan}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: D.cyan, fontSize: size * 0.52, fontWeight: 900, fontFamily: FF.h, lineHeight: 1 }}>□</span>
      </div>
      <span style={{ color: D.txt, fontWeight: 900, fontSize: size, letterSpacing: 0.3, fontFamily: FF.h, lineHeight: 1 }}>ADS<span style={{ color: D.cyan }}>-</span>SQUARE</span>
    </button>
  );
}

function BetaBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div style={{ background: `linear-gradient(90deg,${D.violet}22,${D.cyan}11)`, borderBottom: `1px solid ${D.violet}44`, padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, animation: 'slideDown 0.4s ease', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: `${D.violet}33`, border: `1px solid ${D.violet}55`, borderRadius: 20, padding: '2px 8px', color: D.violet, fontSize: 9, fontWeight: 900, letterSpacing: 1, fontFamily: FF.h, whiteSpace: 'nowrap' }}>BÊTA PUBLIQUE</span>
        <span style={{ color: D.muted, fontSize: 11 }}>Plateforme en développement — réservations bientôt disponibles.</span>
        <a href="#waitlist" style={{ color: D.cyan, fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Rejoindre la liste d'attente →</a>
      </div>
      <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: D.muted, cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── PATCH 1 : WaitlistModal — ajout de position:'relative' sur la boîte modale
function WaitlistModal({ onClose }) {
  const { isMobile } = useScreenSize();
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(t); }, []);
  useEffect(() => { const fn = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(2,6,9,0.95)', backdropFilter: 'blur(28px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', opacity: entered ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      {/* FIX: position:'relative' ajouté pour que le bouton × se positionne correctement */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: isMobile ? '100vw' : 'min(96vw,560px)', background: `linear-gradient(145deg,${D.s2},${D.card})`, border: `2px solid ${D.violet}44`, borderRadius: isMobile ? '24px 24px 0 0' : 20, overflow: 'hidden', overflowY: 'auto', maxHeight: isMobile ? '90vh' : 'auto', boxShadow: `0 0 80px ${D.violet}22`, animation: entered ? 'modalIn 0.3s cubic-bezier(0.34,1.2,0.64,1) forwards' : undefined }}>
        {isMobile && <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} /></div>}
        <div style={{ height: 3, background: `linear-gradient(90deg,${D.violet},${D.cyan}44,transparent)` }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', border: `1px solid ${D.bord2}`, background: D.faint, color: D.muted, cursor: 'pointer', fontSize: 18, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        <div style={{ padding: isMobile ? '24px 20px 32px' : '36px 36px 40px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
          <div style={{ color: D.txt, fontWeight: 900, fontSize: 22, fontFamily: FF.h, marginBottom: 8 }}>Soyez parmi les premiers</div>
          <div style={{ color: D.muted, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            La plateforme ouvre bientôt. Inscrivez-vous pour être notifié en premier et obtenir un <span style={{ color: D.gold, fontWeight: 700 }}>tarif de lancement exclusif</span>.
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {PROFILES.map(p => (
              <div key={p.id} style={{ flex: 1, minWidth: 80, padding: '10px 8px', borderRadius: 10, background: `${p.color}0f`, border: `1px solid ${p.color}33`, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                <div style={{ color: p.color, fontSize: 10, fontWeight: 800, fontFamily: FF.h }}>{p.label}</div>
                <div style={{ color: D.muted, fontSize: 9, marginTop: 2 }}>{p.blocs}</div>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: D.faint, border: `1px solid ${D.bord}` }}>
            <iframe
              src="https://tally.so/embed/WONo8v?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
              width="100%" height="220" frameBorder="0" marginHeight="0" marginWidth="0"
              title="Liste d'attente ADS-SQUARE"
              style={{ display: 'block', minHeight: 180 }}
            />
          </div>
          <div style={{ marginTop: 12, color: D.muted, fontSize: 10, textAlign: 'center' }}>🔒 Pas de spam. Désabonnement en 1 clic.</div>
        </div>
      </div>
    </div>
  );
}

// ─── PATCH 2 : CheckoutModal — ajout de position:'relative' sur la boîte modale
function CheckoutModal({ slot, onClose }) {
  const { isMobile } = useScreenSize();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => { const t = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(t); }, []);
  useEffect(() => { const fn = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [onClose]);

  const tier = slot?.tier;
  const pricePerDay = TIER_PRICE[tier] || 1;
  const totalPrice = pricePerDay * days;

  const handleCheckout = async () => {
    if (!email || !email.includes('@')) { setError('Entrez un email valide'); return; }
    setLoading(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession({ slotX: slot.x, slotY: slot.y, tier: slot.tier, days, email });
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Erreur lors du paiement');
      setLoading(false);
    }
  };

  if (!slot) return null;
  const c = TIER_COLOR[tier];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(2,6,9,0.95)', backdropFilter: 'blur(28px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', opacity: entered ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      {/* FIX: position:'relative' ajouté */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: isMobile ? '100vw' : 'min(96vw,480px)', background: `linear-gradient(145deg,${D.s2},${D.card})`, border: `2px solid ${c}44`, borderRadius: isMobile ? '24px 24px 0 0' : 20, overflow: 'hidden', overflowY: 'auto', maxHeight: isMobile ? '90vh' : 'auto', boxShadow: `0 0 80px ${c}22`, animation: entered ? 'modalIn 0.3s cubic-bezier(0.34,1.2,0.64,1) forwards' : undefined }}>
        {isMobile && <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} /></div>}
        <div style={{ height: 3, background: `linear-gradient(90deg,${c},${c}44,transparent)` }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%', border: `1px solid ${D.bord2}`, background: D.faint, color: D.muted, cursor: 'pointer', fontSize: 18, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

        <div style={{ padding: isMobile ? '24px 20px 32px' : '36px 36px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c}20`, border: `2px solid ${c}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: c, fontSize: 22, fontWeight: 900, fontFamily: FF.h }}>◆</span>
            </div>
            <div>
              <div style={{ color: D.txt, fontWeight: 900, fontSize: 18, fontFamily: FF.h }}>Réserver ce bloc</div>
              <div style={{ color: c, fontSize: 12, fontWeight: 700 }}>{TIER_LABEL[tier]} · ({slot.x},{slot.y})</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: D.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>DURÉE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setDays(d)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: FF.b, background: days === d ? `${c}22` : D.faint, border: `1px solid ${days === d ? c : D.bord}`, color: days === d ? c : D.muted, fontWeight: days === d ? 800 : 400, fontSize: 12, textAlign: 'center' }}>
                  {d}j<br /><span style={{ fontSize: 10, opacity: 0.7 }}>€{pricePerDay * d}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: D.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>EMAIL</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: D.faint, border: `1px solid ${D.bord}`, color: D.txt, fontSize: 14, fontFamily: FF.b, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = c}
              onBlur={e => e.target.style.borderColor = D.bord}
            />
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${c}08`, border: `1px solid ${c}22`, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: D.muted, fontSize: 12 }}>{days} jours × €{pricePerDay}/j</span>
            <span style={{ color: c, fontWeight: 900, fontSize: 20, fontFamily: FF.h }}>€{totalPrice}</span>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: `${D.red}18`, border: `1px solid ${D.red}44`, color: D.red, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button onClick={handleCheckout} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, fontFamily: FF.b, cursor: loading ? 'wait' : 'pointer', background: loading ? `${c}44` : `linear-gradient(135deg,${c}ee,${c}88)`, border: 'none', color: '#030810', fontWeight: 900, fontSize: 14, boxShadow: `0 0 28px ${c}44`, opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Redirection vers Stripe…' : `💳 Payer €${totalPrice}`}
          </button>

          <div style={{ marginTop: 10, color: D.muted, fontSize: 10, textAlign: 'center' }}>
            Paiement sécurisé par Stripe · Annulation possible
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Block rendering ───────────────────────────────────────

function BlockMedia({ tenant, tier }) {
  const sz = TIER_SIZE[tier] || 56;
  if (!tenant) return null;
  if (tenant.t === 'image' && tenant.img) return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={tenant.img} alt={tenant.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} onError={e => e.target.style.display = 'none'} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top,${tenant.b}ee,transparent 60%)` }} />
    </div>
  );
  if (tenant.t === 'video' && sz >= 52) return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: sz * 0.35, height: sz * 0.35, borderRadius: '50%', background: `${tenant.c}22`, border: `1px solid ${tenant.c}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: sz * 0.15, color: tenant.c, marginLeft: 2 }}>▶</span>
      </div>
    </div>
  );
  return null;
}

// BlockCell — reçoit sa taille réelle depuis le layout responsive
const BlockCell = memo(({ slot, isSelected, onSelect, onFocus, sz }) => {
  const { tier, occ, tenant, hot } = slot;
  // sz injected by parent (responsive layout); fallback to TIER_SIZE for TikTok feed
  if (sz === undefined) sz = TIER_SIZE[tier];
  const isCornerTen = tier === 'corner_ten';
  const color = occ ? tenant.c : TIER_COLOR[tier];
  const bg = occ ? (tenant.b || D.card) : D.s2;
  const glow = isCornerTen ? `0 0 ${sz * 0.5}px ${D.gold}88,0 0 ${sz * 0.2}px ${D.gold}cc` : hot ? `0 0 ${sz * 0.25}px ${color}66` : occ ? `0 0 ${sz * 0.12}px ${color}22` : 'none';
  const selectedGlow = isSelected ? `0 0 0 3px ${TIER_COLOR[tier]},0 0 18px ${TIER_COLOR[tier]}aa,0 0 40px ${TIER_COLOR[tier]}44` : glow;
  return (
    <div className="block-hover" onClick={() => occ ? onFocus(slot) : onSelect && onSelect(slot)} style={{ width: sz, height: sz, flexShrink: 0, position: 'relative', borderRadius: tier === 'one' ? 10 : tier === 'ten' || isCornerTen ? 6 : tier === 'hundred' ? 3 : 2, background: isSelected && !occ ? `${TIER_COLOR[tier]}18` : bg, border: `${isSelected ? 2 : isCornerTen ? 2 : 1}px solid ${isSelected ? TIER_COLOR[tier] : isCornerTen ? D.gold : occ ? `${color}45` : `${TIER_COLOR[tier]}18`}`, boxShadow: selectedGlow, overflow: 'hidden', transition: 'transform 0.12s,box-shadow 0.12s', animation: isSelected && !occ ? 'selectedPulse 1.8s ease-in-out infinite' : isCornerTen ? 'glowPulse 3s infinite' : undefined, color: TIER_COLOR[tier] }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 50%)', pointerEvents: 'none' }} />
      {isCornerTen && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(45deg,${D.gold}22 0%,transparent 40%,${D.gold}11 100%)` }} />}
      {occ && <BlockMedia tenant={tenant} tier={tier} />}
      {occ && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: sz > 30 ? 3 : 1, padding: sz > 20 ? 4 : 1 }}>
          {tier === 'one' && (<>
            <div style={{ fontSize: 36, fontWeight: 900, color: tenant.c, fontFamily: FF.h, textShadow: `0 0 24px ${tenant.c}`, lineHeight: 1 }}>{tenant.l}</div>
            <div style={{ color: tenant.c, fontSize: 13, fontWeight: 800, textAlign: 'center' }}>{tenant.name}</div>
            <div style={{ color: `${tenant.c}88`, fontSize: 10, textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.slogan}</div>
            <div style={{ marginTop: 6, padding: '4px 12px', borderRadius: 20, background: `${tenant.c}22`, border: `1px solid ${tenant.c}44`, color: tenant.c, fontSize: 9, fontWeight: 800 }}>{tenant.badge}</div>
          </>)}
          {(tier === 'ten' || isCornerTen) && (<>
            <div style={{ fontSize: isCornerTen ? 18 : 16, fontWeight: 900, color: tenant.c, fontFamily: FF.h, textShadow: `0 0 14px ${tenant.c}`, lineHeight: 1 }}>{tenant.l}</div>
            {sz >= 40 && <div style={{ color: tenant.c, fontSize: 8, fontWeight: 800, textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.name}</div>}
            {isCornerTen && <div style={{ marginTop: 2, padding: '1px 5px', borderRadius: 8, background: `${D.gold}22`, border: `1px solid ${D.gold}55`, color: D.gold, fontSize: 6, fontWeight: 800, letterSpacing: 0.5 }}>CORNER</div>}
          </>)}
          {tier === 'hundred' && sz >= 26 && <div style={{ fontSize: 8, fontWeight: 900, color: tenant.c, fontFamily: FF.h, textAlign: 'center', lineHeight: 1 }}>{tenant.l}</div>}
          {tier === 'thousand' && sz >= 11 && <div style={{ width: '55%', height: 1.5, background: tenant.c, borderRadius: 1, opacity: 0.7 }} />}
        </div>
      )}
      {!occ && (
        <div className="rent-cta" style={{ position: 'absolute', inset: 0, background: isSelected ? `${TIER_COLOR[tier]}15` : 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {isSelected ? <span style={{ color: TIER_COLOR[tier], fontSize: Math.max(10, sz * 0.25), fontWeight: 900, textShadow: `0 0 12px ${TIER_COLOR[tier]}` }}>✓</span>
            : sz >= 28 ? (<><span style={{ fontSize: Math.min(12, sz * 0.2), color: TIER_COLOR[tier], fontWeight: 900, animation: 'vacantBreath 2s ease-in-out infinite' }}>+</span>{sz >= 46 && <span style={{ fontSize: Math.min(7, sz * 0.12), color: TIER_COLOR[tier], fontWeight: 700 }}>{isCornerTen ? 'CORNER' : 'Louer'}</span>}</>)
              : <div style={{ width: 3, height: 3, borderRadius: '50%', background: TIER_COLOR[tier], animation: 'vacantBreath 2s ease-in-out infinite' }} />}
        </div>
      )}
      {occ && hot && <div style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: D.red, boxShadow: `0 0 5px ${D.red}`, animation: 'blink 1.5s infinite' }} />}
      {isCornerTen && !occ && <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: D.gold, boxShadow: `0 0 8px ${D.gold}`, animation: 'blink 2s infinite' }} />}
    </div>
  );
});
BlockCell.displayName = 'BlockCell';

// ─── PATCH 4 : FocusModal — position:'relative' sur la boîte modale
function FocusModal({ slot, allSlots, onClose, onWaitlist, onNavigate }) {
  const [entered, setEntered] = useState(false);
  const [dir, setDir] = useState(0);
  const { isMobile } = useScreenSize();
  const occupiedSlots = useMemo(() => allSlots.filter(s => s.occ), [allSlots]);
  const curIdx = occupiedSlots.findIndex(s => s.id === slot?.id);
  const hasPrev = curIdx > 0, hasNext = curIdx < occupiedSlots.length - 1;
  const goPrev = useCallback(() => { if (!hasPrev) return; setDir(-1); onNavigate(occupiedSlots[curIdx - 1]); setTimeout(() => setDir(0), 250); }, [hasPrev, curIdx, occupiedSlots, onNavigate]);
  const goNext = useCallback(() => { if (!hasNext) return; setDir(1); onNavigate(occupiedSlots[curIdx + 1]); setTimeout(() => setDir(0), 250); }, [hasNext, curIdx, occupiedSlots, onNavigate]);
  useEffect(() => { const t = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(t); }, [slot]);
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') goPrev(); if (e.key === 'ArrowRight') goNext(); };
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
  }, [slot, onClose, goPrev, goNext]);

  if (!slot) return null;
  const { tier, occ, tenant } = slot;
  const color = occ ? tenant.c : TIER_COLOR[tier];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,9,0.95)', backdropFilter: 'blur(28px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', opacity: entered ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      {!isMobile && hasPrev && <button onClick={e => { e.stopPropagation(); goPrev(); }} className="focus-nav" style={{ position: 'fixed', left: 'max(12px,calc(50% - 420px))', top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(6,12,22,0.85)', backdropFilter: 'blur(12px)', border: `1px solid ${D.bord2}`, color: D.txt, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1020 }}>‹</button>}
      {!isMobile && hasNext && <button onClick={e => { e.stopPropagation(); goNext(); }} className="focus-nav" style={{ position: 'fixed', right: 'max(12px,calc(50% - 420px))', top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'rgba(6,12,22,0.85)', backdropFilter: 'blur(12px)', border: `1px solid ${D.bord2}`, color: D.txt, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1020 }}>›</button>}
      {/* FIX: position:'relative' ajouté */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: isMobile ? '100vw' : 'min(96vw,760px)', background: `linear-gradient(145deg,${D.s2},${D.card})`, border: `2px solid ${color}44`, borderRadius: isMobile ? '24px 24px 0 0' : 20, overflow: 'hidden', overflowY: 'auto', maxHeight: isMobile ? '88vh' : '90vh', boxShadow: `0 0 0 1px ${color}18,0 40px 100px rgba(0,0,0,0.9),0 0 80px ${color}18`, transform: entered ? (isMobile ? undefined : `scale(1) translateX(${dir * -18}px)`) : (isMobile ? undefined : 'scale(0.88) translateY(28px)'), transition: 'transform 0.25s cubic-bezier(0.34,1.2,0.64,1)' }}>
        {isMobile && <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} /></div>}
        <div style={{ height: 3, background: `linear-gradient(90deg,${color},${color}44,transparent)` }} />
        <div style={{ position: 'absolute', top: isMobile ? 22 : 12, left: 16, zIndex: 10, padding: '3px 10px', borderRadius: 20, background: `${TIER_COLOR[tier]}18`, border: `1px solid ${TIER_COLOR[tier]}40`, color: TIER_COLOR[tier], fontSize: 8, fontWeight: 800, letterSpacing: 1 }}>{TIER_LABEL[tier]} · €{TIER_PRICE[tier]}/j</div>
        <button onClick={onClose} style={{ position: 'absolute', top: isMobile ? 18 : 10, right: 12, width: 34, height: 34, borderRadius: '50%', border: `1px solid ${D.bord2}`, background: D.faint, color: D.muted, cursor: 'pointer', fontSize: 18, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        {occ && tenant?.img && tier !== 'thousand' && <div style={{ position: 'relative', height: isMobile ? 160 : 220, overflow: 'hidden', background: tenant.b }}><img src={tenant.img} alt={tenant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} /><div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top,${D.card}ee,transparent 60%)` }} /></div>}
        {occ && tenant && (
          <div style={{ padding: isMobile ? '16px 16px 20px' : '22px 26px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 14, marginBottom: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: 14, flexShrink: 0, background: `${color}20`, border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color, fontFamily: FF.h, boxShadow: `0 0 20px ${color}33` }}>{tenant.l}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: D.txt, fontWeight: 900, fontSize: isMobile ? 17 : 20, fontFamily: FF.h, marginBottom: 4 }}>{tenant.name}</div>
                <div style={{ color, fontSize: 12, fontWeight: 700, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.slogan}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ padding: '2px 9px', borderRadius: 20, background: `${color}18`, border: `1px solid ${color}44`, color, fontSize: 9, fontWeight: 800 }}>{tenant.badge}</span>
                  <span style={{ color: D.muted, fontSize: 10 }}>📍 {TIER_LABEL[tier]}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <a href={tenant.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ flex: 1, padding: '12px 20px', borderRadius: 12, background: `linear-gradient(135deg,${color}ee,${color}88)`, color: '#030810', fontWeight: 900, fontSize: 13, fontFamily: FF.b, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: `0 0 22px ${color}44` }}>{tenant.cta} →</a>
              <button onClick={() => { onClose(); onWaitlist(); }} style={{ padding: '12px 18px', borderRadius: 12, fontFamily: FF.b, cursor: 'pointer', background: `${D.violet}18`, border: `1px solid ${D.violet}44`, color: D.violet, fontWeight: 700, fontSize: 12 }}>Louer ici →</button>
            </div>
          </div>
        )}
        {!occ && (
          <div style={{ padding: isMobile ? '28px 20px' : '40px 26px', textAlign: 'center' }}>
            <div style={{ fontSize: 42, marginBottom: 14, color: TIER_COLOR[tier] }}>◆</div>
            <div style={{ color: D.txt, fontWeight: 900, fontSize: 20, fontFamily: FF.h, marginBottom: 8 }}>Espace disponible</div>
            <div style={{ color: D.muted, fontSize: 12, lineHeight: 1.7, marginBottom: 20 }}>Bloc {TIER_LABEL[tier]} — €{TIER_PRICE[tier]}/jour.<br />Ouvert à tous : créateur, freelance ou marque.</div>
            <button onClick={() => { onClose(); onWaitlist(); }} style={{ padding: '14px 28px', borderRadius: 12, fontFamily: FF.b, cursor: 'pointer', background: `linear-gradient(135deg,${TIER_COLOR[tier]}ee,${TIER_COLOR[tier]}88)`, border: 'none', color: '#030810', fontWeight: 900, fontSize: 14, boxShadow: `0 0 28px ${TIER_COLOR[tier]}44`, width: isMobile ? '100%' : 'auto' }}>📬 Réserver ma place →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TikTok Feed View ─────────────────────────────────────
function TikTokFeed({ slots, isLive, onWaitlist }) {
  const feedRef = useRef(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const { isMobile } = useScreenSize();

  const feedSlots = useMemo(() => {
    const occ = slots.filter(s => s.occ);
    const vacantPremium = slots.filter(s => !s.occ && (s.tier === 'one' || s.tier === 'corner_ten')).slice(0, 4);
    return [...occ, ...vacantPremium];
  }, [slots]);

  useEffect(() => {
    const container = feedRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('[data-card]');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          setCurrentIdx(parseInt(e.target.dataset.card));
        }
      });
    }, { threshold: 0.5, root: container });
    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, [feedSlots.length]);

  const scrollTo = useCallback((idx) => {
    const cards = feedRef.current?.querySelectorAll('[data-card]');
    cards?.[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (feedSlots.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.muted, fontSize: 14 }}>
      Aucun bloc actif pour le moment
    </div>
  );

  return (
    <div ref={feedRef} style={{ flex: 1, overflowY: 'scroll', overflowX: 'hidden', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
      {feedSlots.map((slot, idx) => {
        const { tier, occ, tenant } = slot;
        const c = occ ? tenant.c : TIER_COLOR[tier];
        const isActive = currentIdx === idx;
        return (
          <div key={slot.id} data-card={idx} style={{ scrollSnapAlign: 'start', width: '100%', height: '100%', minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 20 : 28, padding: isMobile ? '16px 16px 16px 8px' : '24px 60px 24px 24px', boxSizing: 'border-box', overflow: 'hidden', background: `radial-gradient(ellipse at 50% 40%, ${c}0a 0%, ${D.bg} 65%)` }}>

            {/* Blurred bg image */}
            {occ && tenant?.img && (<>
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                <img src={tenant.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08, filter: 'blur(32px)', transform: 'scale(1.15)' }} onError={e => e.target.style.display='none'} />
              </div>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${D.bg}bb 0%, transparent 40%, ${D.bg}cc 100%)` }} />
            </>)}

            {/* Top badge */}
            <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 2, display: 'flex', gap: 6 }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: `${TIER_COLOR[tier]}18`, border: `1px solid ${TIER_COLOR[tier]}44`, color: TIER_COLOR[tier], fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>{TIER_LABEL[tier]}</span>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: `${D.faint}`, border: `1px solid ${D.bord}`, color: D.muted, fontSize: 9, fontWeight: 700 }}>({slot.x},{slot.y})</span>
            </div>
            {isLive && <div style={{ position: 'absolute', top: 14, right: isMobile ? 14 : 54, zIndex: 2, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, background: `${D.mint}15`, border: `1px solid ${D.mint}33` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: D.mint, animation: 'blink 1.5s infinite' }} />
              <span style={{ color: D.mint, fontSize: 8, fontWeight: 700 }}>LIVE</span>
            </div>}

            {/* Block visual */}
            <div style={{ position: 'relative', zIndex: 1, width: isMobile ? 180 : 240, height: isMobile ? 180 : 240, borderRadius: tier === 'one' ? 28 : 20, background: occ ? (tenant.b || D.card) : D.s2, border: `2px solid ${c}44`, boxShadow: isActive ? `0 0 80px ${c}33, 0 0 30px ${c}22` : `0 0 40px ${c}11`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 0.5s', animation: isActive && tier === 'one' ? 'glowPulse 3s infinite' : undefined }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 55%)' }} />
              {occ && tenant?.img && <img src={tenant.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} onError={e => e.target.style.display='none'} />}
              {occ ? (
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: tier === 'one' ? 52 : 36, fontWeight: 900, color: c, fontFamily: FF.h, textShadow: `0 0 40px ${c}`, lineHeight: 1, marginBottom: 6 }}>{tenant.l}</div>
                  {tier !== 'thousand' && <div style={{ color: c, fontSize: tier === 'one' ? 14 : 11, fontWeight: 800, textShadow: `0 0 12px ${c}` }}>{tenant.name}</div>}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ color: c, fontSize: 42, fontWeight: 900, fontFamily: FF.h, animation: 'vacantBreath 2s infinite', lineHeight: 1 }}>+</div>
                  <div style={{ color: `${c}88`, fontSize: 10, fontWeight: 800, marginTop: 6, letterSpacing: 1 }}>DISPONIBLE</div>
                  <div style={{ color: D.muted, fontSize: 9, marginTop: 3 }}>€{TIER_PRICE[tier]}/j</div>
                </div>
              )}
            </div>

            {/* Info card */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: isMobile ? '92vw' : 400, padding: isMobile ? '16px 16px' : '20px 22px', borderRadius: 18, background: 'rgba(6,12,22,0.88)', backdropFilter: 'blur(20px)', border: `1px solid ${c}22`, boxShadow: `0 4px 32px rgba(0,0,0,0.5)` }}>
              {occ ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: `${c}20`, border: `2px solid ${c}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: c, fontFamily: FF.h, flexShrink: 0 }}>{tenant.l}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: D.txt, fontWeight: 900, fontSize: 15, fontFamily: FF.h, lineHeight: 1.2 }}>{tenant.name}</div>
                    <div style={{ color: `${c}99`, fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.slogan}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, background: `${c}12`, border: `1px solid ${c}30`, color: c, fontSize: 8, fontWeight: 800 }}>{tenant.badge}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, background: `${TIER_COLOR[tier]}12`, border: `1px solid ${TIER_COLOR[tier]}30`, color: TIER_COLOR[tier], fontSize: 8, fontWeight: 800 }}>€{TIER_PRICE[tier]}/j</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={tenant.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '10px 14px', borderRadius: 11, background: `linear-gradient(135deg,${c}ee,${c}88)`, color: '#030810', fontWeight: 900, fontSize: 12, fontFamily: FF.b, textDecoration: 'none', textAlign: 'center', boxShadow: `0 0 18px ${c}44` }}>{tenant.cta} →</a>
                  <button onClick={onWaitlist} style={{ padding: '10px 14px', borderRadius: 11, fontFamily: FF.b, cursor: 'pointer', background: `${D.violet}18`, border: `1px solid ${D.violet}44`, color: D.violet, fontWeight: 700, fontSize: 11 }}>Louer</button>
                </div>
              </>) : (<>
                <div style={{ color: D.txt, fontWeight: 900, fontSize: 16, fontFamily: FF.h, marginBottom: 4 }}>Espace disponible</div>
                <div style={{ color: D.muted, fontSize: 11, lineHeight: 1.6, marginBottom: 12 }}>Bloc {TIER_LABEL[tier]} · €{TIER_PRICE[tier]}/jour<br/>Visibilité immédiate devant toute l'audience.</div>
                <button onClick={onWaitlist} style={{ width: '100%', padding: '11px', borderRadius: 11, fontFamily: FF.b, cursor: 'pointer', background: `linear-gradient(135deg,${c}ee,${c}88)`, border: 'none', color: '#030810', fontWeight: 900, fontSize: 12 }}>📬 Réserver ce bloc →</button>
              </>)}
            </div>

            {/* Right: progress dots */}
            <div style={{ position: 'absolute', right: isMobile ? 8 : 18, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 5, zIndex: 2 }}>
              {feedSlots.map((_, i) => (
                <div key={i} onClick={() => scrollTo(i)} style={{ width: i === currentIdx ? 4 : 3, height: i === currentIdx ? 20 : 4, borderRadius: 3, background: i === currentIdx ? c : 'rgba(255,255,255,0.18)', cursor: 'pointer', transition: 'all 0.3s ease' }} />
              ))}
            </div>

            {/* Counter */}
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', color: D.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1, zIndex: 2 }}>{idx + 1} / {feedSlots.length}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Public View ───────────────────────────────────────────
function PublicView({ slots, isLive, onWaitlist }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const [containerH, setContainerH] = useState(typeof window !== 'undefined' ? window.innerHeight - 80 : 1000);
  const [focusSlot, setFocusSlot] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [filterTier, setFilterTier] = useState('all');
  const [showVacant, setShowVacant] = useState(false);
  const [feedMode, setFeedMode] = useState(false);
  const { isMobile } = useScreenSize();

  // Measure container to compute exact responsive k
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => {
      setContainerW(e[0].contentRect.width);
      setContainerH(e[0].contentRect.height);
    });
    obs.observe(el);
    setContainerW(el.clientWidth);
    setContainerH(el.clientHeight);
    return () => obs.disconnect();
  }, []);

  // k fills the screen exactly — no CSS scale, blocks are their real computed size
  const { colOffsets, rowOffsets, totalGridW, totalGridH, tierSizes, k } =
    useGridLayout(containerW, containerH, isMobile);

  const filteredSlots = useMemo(() => {
    let s = slots;
    if (filterTier !== 'all') s = s.filter(sl => sl.tier === filterTier || (filterTier === 'ten' && sl.tier === 'corner_ten'));
    if (showVacant) s = s.filter(sl => !sl.occ);
    return new Set(s.map(sl => sl.id));
  }, [slots, filterTier, showVacant]);

  const toggleSelect = useCallback(slot => {
    if (slot.occ) return;
    setSelected(prev => { const n = new Set(prev); n.has(slot.id) ? n.delete(slot.id) : n.add(slot.id); return n; });
  }, []);

  const stats = useMemo(() => ({ occupied: slots.filter(s => s.occ).length, vacant: slots.filter(s => !s.occ).length }), [slots]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: D.bg }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 16px', borderBottom: `1px solid ${D.bord}`, background: D.s1, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {/* View mode toggle */}
        <div style={{ display: 'flex', background: D.faint, border: `1px solid ${D.bord}`, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={() => setFeedMode(false)} style={{ padding: '4px 12px', fontFamily: FF.b, cursor: 'pointer', fontSize: 11, background: !feedMode ? `${D.cyan}22` : 'transparent', border: 'none', color: !feedMode ? D.cyan : D.muted, fontWeight: !feedMode ? 800 : 400, transition: 'all 0.2s' }}>⊞ Grille</button>
          <button onClick={() => setFeedMode(true)} style={{ padding: '4px 12px', fontFamily: FF.b, cursor: 'pointer', fontSize: 11, background: feedMode ? `${D.rose}22` : 'transparent', border: 'none', color: feedMode ? D.rose : D.muted, fontWeight: feedMode ? 800 : 400, transition: 'all 0.2s' }}>↕ Feed</button>
        </div>

        {!feedMode && <>
          <div style={{ width: 1, height: 18, background: D.bord }} />
          {[['all', 'Tous', D.txt], ['one', 'ÉPICENTRE', D.gold], ['ten', 'PRESTIGE', D.rose], ['hundred', 'BUSINESS', D.cyan], ['thousand', 'VIRAL', D.mint]].map(([id, label, color]) => (
            <button key={id} onClick={() => setFilterTier(id)} style={{ padding: '4px 12px', borderRadius: 20, fontFamily: FF.b, cursor: 'pointer', fontSize: 11, background: filterTier === id ? `${color}20` : 'transparent', border: `1px solid ${filterTier === id ? color : D.bord}`, color: filterTier === id ? color : D.muted, fontWeight: filterTier === id ? 800 : 400, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>{label}</button>
          ))}
          <div style={{ width: 1, height: 18, background: D.bord }} />
          <button onClick={() => setShowVacant(v => !v)} style={{ padding: '4px 12px', borderRadius: 20, fontFamily: FF.b, cursor: 'pointer', fontSize: 11, background: showVacant ? `${D.violet}20` : 'transparent', border: `1px solid ${showVacant ? D.violet : D.bord}`, color: showVacant ? D.violet : D.muted }}>Disponibles</button>
        </>}

        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, background: `${D.mint}15`, border: `1px solid ${D.mint}33` }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: D.mint, animation: 'blink 1.5s infinite' }} />
            <span style={{ color: D.mint, fontSize: 9, fontWeight: 700 }}>LIVE</span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: isMobile ? 8 : 16, alignItems: 'center' }}>
          {!isMobile && [[stats.occupied, isLive ? 'Actifs' : 'Démos', D.rose], [stats.vacant, 'Libres', D.mint], [selected.size, 'Sél.', D.violet]].map(([v, l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ color: c, fontWeight: 900, fontSize: 13, fontFamily: FF.h }}>{v}</span><span style={{ color: D.muted, fontSize: 10 }}>{l}</span></div>
          ))}
        </div>
        {selected.size > 0 && !feedMode && <button onClick={onWaitlist} style={{ padding: '6px 16px', borderRadius: 9, fontFamily: FF.b, cursor: 'pointer', background: `linear-gradient(135deg,${D.violet}ee,${D.violet}88)`, border: 'none', color: '#030810', fontWeight: 900, fontSize: 12, boxShadow: `0 0 18px ${D.violet}44` }}>📬 Réserver {selected.size} bloc{selected.size > 1 ? 's' : ''} →</button>}
      </div>

      {feedMode ? (
        <TikTokFeed slots={slots} isLive={isLive} onWaitlist={onWaitlist} />
      ) : (
        // Grid — blocs à leur taille réelle calculée pour remplir l'écran (k adaptatif)
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: isMobile ? 'auto' : 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 8 : 0,
          }}
        >
          <div style={{ position: 'relative', width: totalGridW, height: totalGridH, flexShrink: 0 }}>
            {slots.map(slot => (
              <div
                key={slot.id}
                style={{
                  position: 'absolute',
                  left: colOffsets[slot.x],
                  top: rowOffsets[slot.y],
                  opacity: filteredSlots.has(slot.id) ? 1 : 0.08,
                  transition: 'opacity 0.25s',
                }}
              >
                <BlockCell
                  slot={slot}
                  isSelected={selected.has(slot.id)}
                  onSelect={toggleSelect}
                  onFocus={setFocusSlot}
                  sz={tierSizes[slot.tier]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {focusSlot && <FocusModal slot={focusSlot} allSlots={slots} onClose={() => setFocusSlot(null)} onWaitlist={onWaitlist} onNavigate={setFocusSlot} />}
    </div>
  );
}

// ─── PATCH 5 : AnonBlock sorti de AdvertiserView et mémoïsé
const AnonBlock = memo(({ slot, chosenSlot, activeTier, onChoose, sz: szProp }) => {
  const { tier: t, occ } = slot;
  const sz = szProp !== undefined ? szProp : TIER_SIZE[t];
  const c = TIER_COLOR[t];
  const isChosen = chosenSlot?.id === slot.id;
  const isTierHighlighted = activeTier && (t === activeTier || (activeTier === 'ten' && t === 'corner_ten'));
  const dimmed = activeTier && !isTierHighlighted;

  if (occ) return (
    <div style={{ width: sz, height: sz, borderRadius: t === 'one' ? 10 : 5, background: 'rgba(10,15,25,0.9)', border: `1px solid ${isTierHighlighted ? c + '55' : 'rgba(255,255,255,0.04)'}`, position: 'relative', overflow: 'hidden', flexShrink: 0, opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.3s' }}>
      <div style={{ position: 'absolute', inset: 0, background: `${c}06`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {sz >= 20 && <div style={{ width: '40%', height: 1.5, background: `${c}30`, borderRadius: 1 }} />}
      </div>
    </div>
  );

  return (
    <div className="block-hover" onClick={() => onChoose(slot)} style={{ width: sz, height: sz, flexShrink: 0, position: 'relative', borderRadius: t === 'one' ? 10 : t === 'ten' || t === 'corner_ten' ? 6 : t === 'hundred' ? 3 : 2, background: isChosen ? `${c}22` : isTierHighlighted ? `${c}0c` : D.s2, border: `${t === 'corner_ten' ? 2 : isChosen ? 2 : 1}px solid ${isChosen ? c : isTierHighlighted ? c : t === 'corner_ten' ? D.gold : `${c}25`}`, boxShadow: isChosen ? `0 0 0 2px ${c},0 0 20px ${c}44` : t === 'corner_ten' ? `0 0 15px ${D.gold}44` : 'none', cursor: 'pointer', opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.3s,border-color 0.3s,background 0.3s', animation: isTierHighlighted && !isChosen ? 'tierHighlight 2s ease-in-out infinite' : t === 'corner_ten' ? 'glowPulse 3s infinite' : undefined, color: c }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 50%)', pointerEvents: 'none' }} />
      <div className="rent-cta" style={{ position: 'absolute', inset: 0, background: isChosen ? `${c}15` : 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        {isChosen
          ? <span style={{ color: c, fontSize: Math.max(8, sz * 0.3), fontWeight: 900 }}>✓</span>
          : sz >= 28
            ? (<><span style={{ fontSize: Math.min(14, sz * 0.22), color: c, fontWeight: 900 }}>+</span>{sz >= 46 && <span style={{ fontSize: Math.min(8, sz * 0.13), color: c, fontWeight: 700 }}>{t === 'corner_ten' ? 'CORNER' : t === 'one' ? 'ÉPICENTRE' : 'Choisir'}</span>}</>)
            : <div style={{ width: 3, height: 3, borderRadius: '50%', background: c }} />}
      </div>
    </div>
  );
});
AnonBlock.displayName = 'AnonBlock';

// ─── Advertiser View ───────────────────────────────────────
function AdvertiserView({ slots, isLive, selectedSlot, onWaitlist, onCheckout }) {
  const [chosenSlot, setChosenSlot] = useState(selectedSlot || null);
  const [hoveredTier, setHoveredTier] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const [containerH, setContainerH] = useState(typeof window !== 'undefined' ? window.innerHeight - 80 : 1000);
  const { isMobile } = useScreenSize();
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => {
      setContainerW(e[0].contentRect.width);
      setContainerH(e[0].contentRect.height);
    });
    obs.observe(el);
    setContainerW(el.clientWidth);
    setContainerH(el.clientHeight);
    return () => obs.disconnect();
  }, []);
  // Responsive k — blocs à taille réelle (pas de CSS scale)
  const { colOffsets, rowOffsets, totalGridW, totalGridH, tierSizes } =
    useGridLayout(containerW, containerH, isMobile);
  const activeTier = selectedTier || hoveredTier;
  const tierStats = useMemo(() => { const map = {}; for (const t of ['one', 'ten', 'corner_ten', 'hundred', 'thousand']) { const s = slots.filter(sl => sl.tier === t); map[t] = { total: s.length, vacant: s.filter(sl => !sl.occ).length }; } return map; }, [slots]);

  const handleChoose = useCallback((slot) => {
    setChosenSlot(slot);
    setSelectedTier(slot.tier === 'corner_ten' ? 'corner_ten' : slot.tier);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: D.bg, flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{ width: isMobile ? '100%' : 340, flexShrink: 0, borderRight: isMobile ? undefined : `1px solid ${D.bord}`, borderTop: isMobile ? `1px solid ${D.bord}` : undefined, display: 'flex', flexDirection: 'column', background: D.s1, overflowY: 'auto', order: isMobile ? 2 : 0, maxHeight: isMobile ? '55vh' : undefined }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${D.bord}` }}>
          <div style={{ color: D.txt, fontWeight: 900, fontSize: 18, fontFamily: FF.h, marginBottom: 6 }}>Choisissez <span style={{ color: D.gold }}>votre bloc</span></div>
          <div style={{ color: D.muted, fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>Tous les blocs sont ouverts à tous — aucune restriction. Choisissez celui qui vous correspond.</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROFILES.map(p => (<div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: `${p.color}10`, border: `1px solid ${p.color}33` }}><span style={{ fontSize: 11 }}>{p.icon}</span><span style={{ color: p.color, fontSize: 9, fontWeight: 700 }}>{p.label}</span></div>))}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.bord}` }}>
          <div style={{ color: D.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>TIERS DISPONIBLES</div>
          {[
            { tier: 'one', label: 'ÉPICENTRE', desc: 'Bloc central unique', icon: '◆', who: 'Toute marque premium' },
            { tier: 'corner_ten', label: 'CORNER', desc: '4 coins emblématiques', icon: '⬛', who: 'Marques & créateurs' },
            { tier: 'ten', label: 'PRESTIGE', desc: 'Anneau autour du centre', icon: '💎', who: 'Freelances & PME' },
            { tier: 'hundred', label: 'BUSINESS', desc: 'Zone business principale', icon: '🏢', who: 'Auto-entrepreneurs' },
            { tier: 'thousand', label: 'VIRAL', desc: 'Maximum de portée', icon: '🚀', who: 'Créateurs & particuliers' },
          ].map(({ tier: t, label, desc, icon, who }) => {
            const s = tierStats[t]; const isHov = hoveredTier === t; const isSel = selectedTier === t; const c = TIER_COLOR[t];
            return (
              <div key={t} onMouseEnter={() => setHoveredTier(t)} onMouseLeave={() => setHoveredTier(null)} onClick={() => setSelectedTier(prev => prev === t ? null : t)} style={{ padding: '11px 14px', borderRadius: 11, marginBottom: 7, cursor: 'pointer', background: isSel ? `${c}18` : isHov ? `${c}12` : D.faint, border: `1px solid ${isSel ? c : isHov ? c + '44' : D.bord}`, transition: 'all 0.2s', boxShadow: isSel ? `0 0 16px ${c}33` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: c, fontWeight: 900, fontSize: 13, fontFamily: FF.h, letterSpacing: 1 }}>{label}</span>
                      {isSel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}`, animation: 'blink 1.5s infinite' }} />}
                    </div>
                    <div style={{ color: D.muted, fontSize: 10, marginTop: 1 }}>{desc}</div>
                    <div style={{ color: `${c}88`, fontSize: 9, marginTop: 2 }}>👤 {who}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: c, fontWeight: 900, fontSize: 13, fontFamily: FF.h }}>€{TIER_PRICE[t]}/j</div>
                    <div style={{ color: D.muted, fontSize: 9 }}>{s.vacant} libres</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '16px 20px', flex: 1 }}>
          {chosenSlot ? (
            <>
              <div style={{ color: D.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>BLOC SÉLECTIONNÉ</div>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: `${TIER_COLOR[chosenSlot.tier]}10`, border: `1px solid ${TIER_COLOR[chosenSlot.tier]}35`, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: D.txt, fontWeight: 800, fontSize: 13, fontFamily: FF.h }}>{TIER_LABEL[chosenSlot.tier]}</span>
                  <span style={{ color: TIER_COLOR[chosenSlot.tier], fontWeight: 900, fontSize: 13, fontFamily: FF.h }}>€{TIER_PRICE[chosenSlot.tier]}/j</span>
                </div>
                <div style={{ color: D.muted, fontSize: 10 }}>Position ({chosenSlot.x},{chosenSlot.y}) · 30j = €{TIER_PRICE[chosenSlot.tier] * 30}</div>
              </div>
              <button onClick={() => onCheckout(chosenSlot)} style={{ width: '100%', padding: '13px', borderRadius: 12, fontFamily: FF.b, cursor: 'pointer', background: `linear-gradient(135deg,${D.cyan}ee,${D.cyan}88)`, border: 'none', color: '#030810', fontWeight: 900, fontSize: 14, boxShadow: `0 0 22px ${D.cyan}44` }}>
                💳 Réserver ce bloc →
              </button>
              <div style={{ color: D.muted, fontSize: 10, textAlign: 'center', marginTop: 8 }}>
                {isLive ? 'Paiement sécurisé par Stripe' : 'Paiements disponibles bientôt · Soyez notifié en premier'}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
              <div style={{ color: D.muted, fontSize: 11, lineHeight: 1.6, marginBottom: 16 }}>Survolez un tier pour surligner, puis cliquez sur un bloc libre dans la grille.</div>
              <button onClick={onWaitlist} style={{ padding: '11px 20px', borderRadius: 12, fontFamily: FF.b, cursor: 'pointer', background: `${D.violet}18`, border: `1px solid ${D.violet}44`, color: D.violet, fontWeight: 700, fontSize: 12 }}>📬 Liste d'attente</button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: isMobile ? 'auto' : 'hidden',
          background: D.bg,
          order: isMobile ? 1 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? 8 : 0,
          minHeight: isMobile ? '30vh' : undefined,
        }}
      >
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

// ─── Landing Page ──────────────────────────────────────────
function LandingPage({ slots, onPublic, onAdvertiser, onWaitlist }) {
  const { isMobile } = useScreenSize();
  const stats = useMemo(() => ({ occupied: slots.filter(s => s.occ).length, vacant: slots.filter(s => !s.occ).length }), [slots]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : 40, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 8 : 12},${isMobile ? 14 : 18}px)`, gap: 2 }}>
          {slots.slice(0, isMobile ? 64 : 144).map(s => (<div key={s.id} style={{ width: isMobile ? 14 : 18, height: isMobile ? 14 : 18, borderRadius: 2, background: s.occ ? (s.tenant.c + '33') : D.s2, border: `1px solid ${s.occ ? s.tenant.c + '22' : D.bord}` }} />))}
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 620, textAlign: 'center', animation: 'fadeUp 0.6s ease forwards', width: '100%' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, marginBottom: 20, background: `${D.violet}15`, border: `1px solid ${D.violet}35`, color: D.violet, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: D.violet, animation: 'blink 1.8s infinite' }} />
          BÊTA PUBLIQUE · LANCEMENT IMMINENT
        </div>
        <h1 style={{ color: D.txt, fontWeight: 900, fontSize: 'clamp(32px,7vw,54px)', lineHeight: 1.05, fontFamily: FF.h, letterSpacing: -1, margin: '0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg,${D.cyan}33,${D.violet}22)`, border: `2px solid ${D.cyan}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: D.cyan, fontSize: 24, fontWeight: 900, fontFamily: FF.h }}>□</span>
          </div>
          <span>ADS<span style={{ color: D.cyan }}>-</span>SQUARE</span>
        </h1>
        <div style={{ fontSize: 'clamp(13px,2.5vw,18px)', letterSpacing: 3, color: D.muted, fontWeight: 700, fontFamily: FF.h, marginBottom: 14 }}>PUBLICITÉ POUR TOUS</div>
        <p style={{ color: D.muted, fontSize: 'clamp(12px,2.5vw,14px)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 24px' }}>
          Une grille de blocs publicitaires ouverts à tous —<br />
          <span style={{ color: D.mint }}>créateur</span>, <span style={{ color: D.cyan }}>auto-entrepreneur</span> ou <span style={{ color: D.gold }}>grande marque</span>.<br />
          Choisissez votre bloc. Diffusez votre contenu. Dès 1€/jour.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {PROFILES.map(p => (
            <div key={p.id} className="profile-card" onClick={onAdvertiser} style={{ padding: '12px 16px', borderRadius: 14, background: `${p.color}0c`, border: `1px solid ${p.color}33`, textAlign: 'center', minWidth: isMobile ? 90 : 120 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{p.icon}</div>
              <div style={{ color: p.color, fontWeight: 800, fontSize: 11, fontFamily: FF.h, marginBottom: 2 }}>{p.label}</div>
              <div style={{ color: D.muted, fontSize: 9, marginBottom: 5 }}>{p.desc}</div>
              <div style={{ color: p.color, fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: `${p.color}15`, display: 'inline-block' }}>{p.blocs}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 16 : 32, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
          {[[stats.occupied.toLocaleString(), 'Blocs actifs', D.rose], [stats.vacant.toLocaleString(), 'Blocs libres', D.mint], ['1 369', 'Total blocs', D.cyan], ['1€', 'Prix départ', D.gold]].map(([v, l, c]) => (
            <div key={l} style={{ textAlign: 'center' }}><div style={{ color: c, fontWeight: 900, fontSize: isMobile ? 20 : 24, fontFamily: FF.h }}>{v}</div><div style={{ color: D.muted, fontSize: 10, marginTop: 2 }}>{l}</div></div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="landing-btn" onClick={onPublic} style={{ padding: isMobile ? '12px 18px' : '16px 24px', borderRadius: 16, background: `${D.cyan}0a`, border: `2px solid ${D.cyan}44`, cursor: 'pointer', fontFamily: FF.b, color: D.cyan, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>👁 Explorer la grille</button>
          <button className="landing-btn" onClick={onAdvertiser} style={{ padding: isMobile ? '12px 18px' : '16px 24px', borderRadius: 16, background: `${D.gold}0a`, border: `2px solid ${D.gold}44`, cursor: 'pointer', fontFamily: FF.b, color: D.gold, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>📢 Choisir mon bloc</button>
          <button className="landing-btn" id="waitlist" onClick={onWaitlist} style={{ padding: isMobile ? '12px 18px' : '16px 24px', borderRadius: 16, background: `linear-gradient(135deg,${D.violet}dd,${D.violet}99)`, border: 'none', cursor: 'pointer', fontFamily: FF.b, color: '#030810', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 0 30px ${D.violet}44` }}>📬 Liste d'attente</button>
        </div>
        <div style={{ marginTop: 14, color: D.muted, fontSize: 11 }}>Pas de budget minimum · Pas d'agence · Résultat immédiat</div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('landing');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [checkoutSlot, setCheckoutSlot] = useState(null);
  const { slots, isLive, loading } = useGridData();
  const { isMobile } = useScreenSize();
  const handleWaitlist = useCallback(() => setShowWaitlist(true), []);

  const handleCheckout = useCallback((slot) => {
    if (process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true') {
      setCheckoutSlot(slot);
    } else {
      setShowWaitlist(true);
    }
  }, []);

  const isFullscreen = view === 'public' || view === 'advertiser';

  return (
    <div style={{ display: 'flex', height: '100vh', background: D.bg, fontFamily: FF.b, color: D.txt, overflow: 'hidden', flexDirection: 'column' }}>
      <BetaBanner />
      {!isFullscreen ? (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : '0 24px', height: 52, flexShrink: 0, borderBottom: `1px solid ${D.bord}`, background: `${D.s1}e8`, backdropFilter: 'blur(14px)', zIndex: 100 }}>
          <BrandLogo size={isMobile ? 16 : 20} onClick={() => setView('landing')} />
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setView('public')} style={{ padding: '5px 12px', borderRadius: 8, fontFamily: FF.b, cursor: 'pointer', background: 'transparent', border: `1px solid ${D.bord}`, color: D.muted, fontSize: 11 }}>👁{isMobile ? '' : ' Explorer'}</button>
            <button onClick={() => setView('advertiser')} style={{ padding: '6px 14px', borderRadius: 9, fontFamily: FF.b, cursor: 'pointer', background: `${D.gold}18`, border: `1px solid ${D.gold}44`, color: D.gold, fontSize: 11, fontWeight: 700 }}>📢{isMobile ? '' : ' Mon bloc'}</button>
            <button onClick={handleWaitlist} style={{ padding: '6px 14px', borderRadius: 9, fontFamily: FF.b, cursor: 'pointer', background: `${D.violet}18`, border: `1px solid ${D.violet}44`, color: D.violet, fontSize: 11, fontWeight: 700 }}>📬{isMobile ? '' : ' Attente'}</button>
          </nav>
        </header>
      ) : (
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(6,12,22,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 40, padding: '7px 14px', boxShadow: '0 4px 32px rgba(0,0,0,0.6)', maxWidth: 'calc(100vw - 24px)' }}>
          <BrandLogo size={isMobile ? 12 : 14} onClick={() => setView('landing')} />
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
          {[['public', '👁', 'Explorer', D.cyan], ['advertiser', '📢', 'Mon bloc', D.gold]].map(([v, ico, l, c]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '4px 10px', borderRadius: 20, fontFamily: FF.b, cursor: 'pointer', background: view === v ? `${c}22` : 'transparent', border: `1px solid ${view === v ? c + '77' : 'transparent'}`, color: view === v ? c : D.muted, fontWeight: view === v ? 800 : 400, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{ico}</span>{isMobile ? '' : l}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
          <button onClick={handleWaitlist} style={{ padding: '4px 10px', borderRadius: 20, fontFamily: FF.b, cursor: 'pointer', background: `${D.violet}18`, border: `1px solid ${D.violet}44`, color: D.violet, fontSize: 10, fontWeight: 700 }}>📬</button>
        </div>
      )}
      {view === 'landing'    && <LandingPage    slots={slots} onPublic={() => setView('public')} onAdvertiser={() => setView('advertiser')} onWaitlist={handleWaitlist} />}
      {view === 'public'     && <PublicView     slots={slots} isLive={isLive} onWaitlist={handleWaitlist} />}
      {view === 'advertiser' && <AdvertiserView slots={slots} isLive={isLive} onWaitlist={handleWaitlist} onCheckout={handleCheckout} />}
      {showWaitlist  && <WaitlistModal  onClose={() => setShowWaitlist(false)} />}
      {checkoutSlot  && <CheckoutModal  slot={checkoutSlot} onClose={() => setCheckoutSlot(null)} />}
    </div>
  );
}
