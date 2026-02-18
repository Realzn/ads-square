'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════
   DESIGN SYSTEM — ADS-SQUARE
═══════════════════════════════════════════════════════ */
const D = {
  bg:"#020609", s1:"#060c16", s2:"#0a1222", card:"#0d1828",
  bord:"rgba(255,255,255,0.055)", bord2:"rgba(255,255,255,0.11)",
  txt:"#dde8ff", muted:"rgba(185,205,255,0.48)", faint:"rgba(255,255,255,0.04)",
  cyan:"#00d9f5", violet:"#9d7dff", gold:"#f0b429",
  rose:"#ff4d8f", mint:"#00e8a2", red:"#ff4455", blue:"#4499ff",
};
const FF = { h:"'Clash Display','Syne',sans-serif", b:"'DM Sans',sans-serif" };

const GRID_COLS = 37;
const GRID_ROWS = 37;
const CENTER_X = 18;
const CENTER_Y = 18;

const CORNER_POSITIONS = new Set(["0-0","36-0","0-36","36-36"]);

function getTier(x, y) {
  if (CORNER_POSITIONS.has(`${x}-${y}`)) return "corner_ten";
  const dx = Math.abs(x - CENTER_X);
  const dy = Math.abs(y - CENTER_Y);
  const dist = Math.max(dx, dy);
  if (dist === 0)  return "one";
  if (dist <= 3)   return "ten";
  if (dist <= 11)  return "hundred";
  return "thousand";
}

function isCorner(x, y) { return CORNER_POSITIONS.has(`${x}-${y}`); }

const TIER_SIZE  = { one:120, ten:52, corner_ten:52, hundred:26, thousand:11 };
const TIER_COLOR = { one:D.gold, ten:D.rose, corner_ten:D.gold, hundred:D.cyan, thousand:D.mint };
const TIER_LABEL = { one:"ÉPICENTRE", ten:"PRESTIGE", corner_ten:"CORNER", hundred:"BUSINESS", thousand:"VIRAL" };
const TIER_PRICE = { one:1000, ten:100, corner_ten:100, hundred:10, thousand:1 };

/* ─── Simulated visitor/click data per tier ─── */
const TIER_VIEWS = { one:58000, ten:12400, corner_ten:14200, hundred:3200, thousand:480 };
const TIER_CTR   = { one:8.4, ten:5.7, corner_ten:6.2, hundred:3.1, thousand:1.8 };

const TENANTS = [
  { l:"NK", t:"image", c:"#ff6b35", b:"#160800", name:"NikeKicks Studio", slogan:"Just Do It — Air Max 2025", url:"https://nike.com", cta:"Voir la collection", img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", badge:"LUXURY" },
  { l:"SV", t:"link",  c:"#c5d3e8", b:"#08121e", name:"SaaS Vision", slogan:"Automatisez votre croissance B2B", url:"https://example.com", cta:"Essai 14 jours", img:"", badge:"BUSINESS" },
  { l:"SP", t:"video", c:"#1ed760", b:"#001409", name:"Spotify Ads", slogan:"Faites entendre votre marque", url:"https://spotify.com", cta:"Lancer une campagne", img:"https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&q=80", badge:"VIRAL" },
  { l:"TS", t:"video", c:"#e31937", b:"#100002", name:"TechStream TV", slogan:"Le streaming tech — 24h/24", url:"https://example.com", cta:"Regarder", img:"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80", badge:"HOT" },
  { l:"AZ", t:"link",  c:"#ff9900", b:"#110800", name:"Amazon Business", slogan:"Pro pricing. Free shipping.", url:"https://amazon.com", cta:"Créer un compte Pro", img:"", badge:"LUXURY" },
  { l:"NF", t:"video", c:"#e50914", b:"#0e0000", name:"Netflix Originals", slogan:"Des histoires qui vous transportent", url:"https://netflix.com", cta:"Voir les nouveautés", img:"https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80", badge:"VIRAL" },
  { l:"GG", t:"brand", c:"#4285f4", b:"#000b1e", name:"Google Workspace", slogan:"Travaillez ensemble, partout", url:"https://workspace.google.com", cta:"Démarrer", img:"", badge:"BUSINESS" },
  { l:"AB", t:"image", c:"#ff5a5f", b:"#110002", name:"Airbnb", slogan:"Vivez comme un local", url:"https://airbnb.com", cta:"Explorer", img:"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", badge:"HOT" },
  { l:"MT", t:"link",  c:"#0082fb", b:"#000b1e", name:"Meta Ads", slogan:"Votre audience, vos règles", url:"https://facebook.com/business", cta:"Créer une annonce", img:"", badge:"BUSINESS" },
  { l:"SN", t:"image", c:"#fffc00", b:"#111100", name:"Snapchat", slogan:"Stories 360°", url:"https://snapchat.com", cta:"Ouvrir Snapchat", img:"https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80", badge:"VIRAL" },
  { l:"TW", t:"text",  c:"#1d9bf0", b:"#000e1c", name:"X Premium+", slogan:"La conversation évolue", url:"https://x.com/premium", cta:"Passer Premium", img:"", badge:"INFLUENCE" },
  { l:"LI", t:"brand", c:"#0a66c2", b:"#000c1a", name:"LinkedIn Talent", slogan:"Recrutez les meilleurs", url:"https://linkedin.com", cta:"Publier une offre", img:"", badge:"BUSINESS" },
];

function rng(s) { let v=s; return ()=>{ v=(v*1664525+1013904223)&0xffffffff; return(v>>>0)/0xffffffff; }; }

function buildMasterGrid() {
  const r = rng(42);
  const canonical = {};
  for (let y = 0; y <= CENTER_Y; y++) {
    for (let x = 0; x <= CENTER_X; x++) {
      const tier = getTier(x, y);
      const occupancy = { one:0.99, ten:0.80, corner_ten:0.99, hundred:0.82, thousand:0.88 }[tier];
      const occ = r() < occupancy;
      const tenantIdx = occ ? Math.floor(r() * TENANTS.length) : -1;
      const hot = occ && r() > 0.82;
      /* simulate click data */
      const clicks = occ ? Math.floor(r() * TIER_VIEWS[tier] * (TIER_CTR[tier]/100)) : 0;
      canonical[`${x}-${y}`] = { occ, tenantIdx, hot, clicks };
    }
  }
  const getData = (x, y) => {
    const cx = x <= CENTER_X ? x : CENTER_X * 2 - x;
    const cy = y <= CENTER_Y ? y : CENTER_Y * 2 - y;
    return canonical[`${cx}-${cy}`];
  };
  const slots = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const tier = getTier(x, y);
      const { occ, tenantIdx, hot, clicks } = getData(x, y);
      const tenant = occ && tenantIdx >= 0 ? TENANTS[tenantIdx] : null;
      slots.push({ x, y, tier, occ, tenant, hot, clicks, id:`${x}-${y}`, corner: isCorner(x, y) });
    }
  }
  return slots;
}

const MASTER_SLOTS = buildMasterGrid();

/* ─── Generate fake "recently rented" feed ─── */
const RECENT_RENTALS = (() => {
  const r2 = rng(77);
  const occupied = MASTER_SLOTS.filter(s => s.occ);
  const feed = [];
  for (let i = 0; i < 20; i++) {
    const sl = occupied[Math.floor(r2() * occupied.length)];
    const mins = Math.floor(r2() * 180) + 1;
    feed.push({ slot: sl, timeAgo: mins < 60 ? `${mins}min` : `${Math.floor(mins/60)}h${mins%60>0?(mins%60)+"m":""}` });
  }
  return feed;
})();

/* ─── Live visitor counter hook ─── */
function useVisitorCounter() {
  const [count, setCount] = useState(2_143_892);
  useEffect(() => {
    const iv = setInterval(() => {
      setCount(c => c + Math.floor(Math.random() * 12) + 1);
    }, 2400);
    return () => clearInterval(iv);
  }, []);
  return count;
}

/* ─── Responsive hook ─── */
function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { w, isMobile: w < 768, isTablet: w >= 768 && w < 1024 };
}

/* ─── Format number shorthand ─── */
function fmtK(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + "M";
  if (n >= 1000) return (n/1000).toFixed(1) + "K";
  return n.toLocaleString();
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  @import url('https://api.fontshare.com/v2/css?f[]=clash-display@700,800,900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #020609; color: #dde8ff; font-family: 'DM Sans', sans-serif; overflow: hidden; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
  ::-webkit-scrollbar-thumb { background: rgba(0,217,245,0.25); border-radius: 3px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(0,217,245,0.2)} 50%{box-shadow:0 0 60px rgba(0,217,245,0.5)} }
  @keyframes selectedPulse {
    0%,100% { box-shadow: 0 0 0 2px currentColor, 0 0 12px currentColor; }
    50%     { box-shadow: 0 0 0 4px currentColor, 0 0 28px currentColor, 0 0 60px currentColor; }
  }
  @keyframes vacantBreath {
    0%,100% { opacity: 0.6; }
    50%     { opacity: 1; }
  }
  @keyframes tierHighlight {
    0%,100% { box-shadow: inset 0 0 0 1px currentColor, 0 0 8px currentColor; }
    50%     { box-shadow: inset 0 0 0 2px currentColor, 0 0 22px currentColor; }
  }
  @keyframes tickerScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes counterPop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
  .block-hover { transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s; cursor: pointer; }
  .block-hover:hover { transform: scale(1.15); z-index: 20; }
  .block-hover:hover .rent-cta { opacity: 1 !important; }
  .rent-cta { opacity: 0; transition: opacity 0.15s; }
  .landing-btn { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1); }
  .landing-btn:hover { transform: translateY(-3px) scale(1.03); }
  .landing-btn:active { transform: scale(0.97); }
  .focus-nav { transition: all 0.2s; }
  .focus-nav:hover { transform: scale(1.1); background: rgba(0,217,245,0.2) !important; }

  @media (hover: none) and (pointer: coarse) {
    .block-hover:hover { transform: none; }
    .block-hover:active { transform: scale(1.08); }
    .rent-cta { opacity: 0.7 !important; }
  }

  /* Ticker bar */
  .ticker-bar {
    display: flex; overflow: hidden; white-space: nowrap;
    border-bottom: 1px solid rgba(255,255,255,0.055);
    background: linear-gradient(90deg, #060c16, #0a1222 20%, #0a1222 80%, #060c16);
    height: 32px; align-items: center; flex-shrink: 0;
  }
  .ticker-track {
    display: flex; animation: tickerScroll 80s linear infinite;
    gap: 0; align-items: center;
  }
  .ticker-track:hover { animation-play-state: paused; }
  .ticker-item {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 18px; height: 32px; cursor: pointer;
    border-right: 1px solid rgba(255,255,255,0.04);
    transition: background 0.15s;
    flex-shrink: 0; white-space: nowrap;
  }
  .ticker-item:hover { background: rgba(0,217,245,0.08); }

  /* Visitor counter widget */
  .visitor-counter {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 12px; border-radius: 20px;
    background: rgba(0,232,162,0.06); border: 1px solid rgba(0,232,162,0.25);
  }
  .visitor-digit {
    display: inline-block; min-width: 8px; text-align: center;
    font-variant-numeric: tabular-nums;
  }
`;

/* ── Brand Logo component ── */
function BrandLogo({ size = 22, onClick }) {
  return (
    <button onClick={onClick} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ width:size*1.1, height:size*1.1, borderRadius:size*0.22, background:`linear-gradient(135deg,${D.cyan}33,${D.violet}22)`, border:`1.5px solid ${D.cyan}55`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ color:D.cyan, fontSize:size*0.52, fontWeight:900, fontFamily:FF.h, lineHeight:1 }}>□</span>
      </div>
      <span style={{ color:D.txt, fontWeight:900, fontSize:size, letterSpacing:.3, fontFamily:FF.h, lineHeight:1 }}>ADS<span style={{ color:D.cyan }}>-</span>SQUARE</span>
    </button>
  );
}

/* ── Live Visitor Counter ── */
function VisitorBadge() {
  const count = useVisitorCounter();
  return (
    <div className="visitor-counter">
      <div style={{ width:6, height:6, borderRadius:"50%", background:D.mint, boxShadow:`0 0 8px ${D.mint}`, animation:"blink 1.8s infinite" }} />
      <span style={{ color:D.mint, fontSize:10, fontWeight:800, letterSpacing:0.5, fontFamily:FF.h }}>{fmtK(count)}</span>
      <span style={{ color:D.muted, fontSize:9 }}>visiteurs</span>
    </div>
  );
}

/* ── Ticker Bar: nouveautés ── */
function TickerBar({ onBlockClick }) {
  const items = RECENT_RENTALS;
  const doubled = [...items, ...items]; /* duplicate for seamless loop */
  return (
    <div className="ticker-bar" style={{ position:"relative" }}>
      {/* Label overlays the ticker — ticker scrolls behind */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, zIndex:5, display:"flex", alignItems:"center", padding:"0 14px 0 10px", background:"linear-gradient(90deg, #060c16 70%, transparent 100%)", gap:5 }}>
        <span style={{ color:D.gold, fontSize:9, fontWeight:800, letterSpacing:1 }}>NOUVEAUTÉS</span>
        <div style={{ width:4, height:4, borderRadius:"50%", background:D.gold, animation:"blink 2s infinite" }} />
      </div>
      <div className="ticker-track" style={{ paddingLeft:110 }}>
        {doubled.map((r, i) => {
          const c = TIER_COLOR[r.slot.tier];
          return (
            <div key={i} className="ticker-item" onClick={() => onBlockClick && onBlockClick(r.slot)}>
              <div style={{ width:14, height:14, borderRadius:3, background:`${c}22`, border:`1px solid ${c}55`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:6, fontWeight:900, color:c, fontFamily:FF.h }}>{r.slot.tenant?.l || "+"}</span>
              </div>
              <span style={{ color:c, fontSize:9, fontWeight:800, fontFamily:FF.h }}>{TIER_LABEL[r.slot.tier]}</span>
              <span style={{ color:D.txt, fontSize:9, fontWeight:700 }}>{r.slot.tenant?.name || "Bloc"}</span>
              <span style={{ color:D.muted, fontSize:8 }}>il y a {r.timeAgo}</span>
              {r.slot.clicks > 0 && <span style={{ color:D.cyan, fontSize:8, fontWeight:700 }}>🖱 {fmtK(r.slot.clicks)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Media renderer ── */
function BlockMedia({ tenant, tier }) {
  const sz = TIER_SIZE[tier] || 56;
  if (!tenant) return null;
  if (tenant.t === "image" && tenant.img) {
    return (
      <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
        <img src={tenant.img} alt={tenant.name} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.65 }} onError={e => e.target.style.display="none"} />
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(to top, ${tenant.b}ee, transparent 60%)` }} />
      </div>
    );
  }
  if (tenant.t === "video" && sz >= 52) {
    return (
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:sz*0.35, height:sz*0.35, borderRadius:"50%", background:`${tenant.c}22`, border:`1px solid ${tenant.c}55`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:sz*0.15, color:tenant.c, marginLeft:2 }}>▶</span>
        </div>
      </div>
    );
  }
  return null;
}

/* ── Single block cell (Public view) ── */
const BlockCell = ({ slot, isSelected, onSelect, onFocus }) => {
  const { tier, occ, tenant, hot } = slot;
  const sz = TIER_SIZE[tier];
  const isCornerTen = tier === "corner_ten";
  const color = occ ? tenant.c : TIER_COLOR[tier];
  const bg = occ ? (tenant.b || D.card) : D.s2;
  const borderColor = isSelected ? TIER_COLOR[tier] : isCornerTen ? D.gold : occ ? `${color}45` : `${TIER_COLOR[tier]}18`;
  const borderWidth = isCornerTen ? 2 : (tier === "one" ? 2 : 1);
  const glow = isCornerTen ? `0 0 ${sz*0.5}px ${D.gold}88, 0 0 ${sz*0.2}px ${D.gold}cc` : hot ? `0 0 ${sz*0.25}px ${color}66` : occ ? `0 0 ${sz*0.12}px ${color}22` : "none";

  /* ── SELECTED VACANT: pulsing bright glow ── */
  const selectedGlow = isSelected
    ? `0 0 0 3px ${TIER_COLOR[tier]}, 0 0 18px ${TIER_COLOR[tier]}aa, 0 0 40px ${TIER_COLOR[tier]}44`
    : glow;

  return (
    <div className="block-hover" onClick={() => occ ? onFocus(slot) : onSelect && onSelect(slot)} style={{
      width:sz, height:sz, flexShrink:0, position:"relative",
      borderRadius: tier==="one"?10:tier==="ten"||isCornerTen?6:tier==="hundred"?3:2,
      background: isSelected && !occ ? `${TIER_COLOR[tier]}18` : bg,
      border:`${isSelected?2:borderWidth}px solid ${isSelected?TIER_COLOR[tier]:borderColor}`,
      boxShadow: selectedGlow,
      overflow:"hidden", transition:"transform 0.12s, box-shadow 0.12s",
      animation: isSelected && !occ ? "selectedPulse 1.8s ease-in-out infinite" : isCornerTen ? "glowPulse 3s infinite" : undefined,
      color: TIER_COLOR[tier], /* for currentColor in animation */
    }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 50%)", pointerEvents:"none" }} />
      {isCornerTen && <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:`linear-gradient(45deg, ${D.gold}22 0%, transparent 40%, ${D.gold}11 100%)` }} />}
      {occ && <BlockMedia tenant={tenant} tier={tier} />}
      {occ && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:sz>30?3:1, padding:sz>20?4:1 }}>
          {tier==="one" && (<>
            <div style={{ fontSize:36, fontWeight:900, color:tenant.c, fontFamily:FF.h, textShadow:`0 0 24px ${tenant.c}`, lineHeight:1 }}>{tenant.l}</div>
            <div style={{ color:tenant.c, fontSize:13, fontWeight:800, textAlign:"center" }}>{tenant.name}</div>
            <div style={{ color:`${tenant.c}88`, fontSize:10, textAlign:"center", maxWidth:"90%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tenant.slogan}</div>
            <div style={{ marginTop:6, padding:"4px 12px", borderRadius:20, background:`${tenant.c}22`, border:`1px solid ${tenant.c}44`, color:tenant.c, fontSize:9, fontWeight:800 }}>{tenant.badge}</div>
          </>)}
          {(tier==="ten"||isCornerTen) && (<>
            <div style={{ fontSize:isCornerTen?18:16, fontWeight:900, color:tenant.c, fontFamily:FF.h, textShadow:`0 0 14px ${tenant.c}`, lineHeight:1 }}>{tenant.l}</div>
            {sz>=40&&<div style={{ color:tenant.c, fontSize:8, fontWeight:800, textAlign:"center", maxWidth:"90%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tenant.name}</div>}
            {isCornerTen&&<div style={{ marginTop:2, padding:"1px 5px", borderRadius:8, background:`${D.gold}22`, border:`1px solid ${D.gold}55`, color:D.gold, fontSize:6, fontWeight:800, letterSpacing:0.5 }}>CORNER</div>}
          </>)}
          {tier==="hundred"&&sz>=26&&<div style={{ fontSize:8, fontWeight:900, color:tenant.c, fontFamily:FF.h, textAlign:"center", lineHeight:1 }}>{tenant.l}</div>}
          {tier==="thousand"&&sz>=11&&<div style={{ width:"55%", height:1.5, background:tenant.c, borderRadius:1, opacity:0.7 }} />}
        </div>
      )}
      {/* VACANT: enhanced CTA with breathing animation */}
      {!occ && (
        <div className="rent-cta" style={{ position:"absolute", inset:0, background: isSelected ? `${TIER_COLOR[tier]}15` : "rgba(0,0,0,0.75)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
          {isSelected ? (
            <span style={{ color:TIER_COLOR[tier], fontSize:Math.max(10,sz*0.25), fontWeight:900, textShadow:`0 0 12px ${TIER_COLOR[tier]}` }}>✓</span>
          ) : sz>=28 ? (<>
            <span style={{ fontSize:Math.min(12,sz*0.2), color:TIER_COLOR[tier], fontWeight:900, animation:"vacantBreath 2s ease-in-out infinite" }}>+</span>
            {sz>=46&&<span style={{ fontSize:Math.min(7,sz*0.12), color:TIER_COLOR[tier], fontWeight:700 }}>{isCornerTen?"CORNER":"Louer"}</span>}
          </>) : <div style={{ width:3, height:3, borderRadius:"50%", background:TIER_COLOR[tier], animation:"vacantBreath 2s ease-in-out infinite" }} />}
        </div>
      )}
      {occ&&hot&&<div style={{ position:"absolute", top:2, right:2, width:4, height:4, borderRadius:"50%", background:D.red, boxShadow:`0 0 5px ${D.red}`, animation:"blink 1.5s infinite" }} />}
      {isCornerTen&&!occ&&<div style={{ position:"absolute", top:3, right:3, width:5, height:5, borderRadius:"50%", background:D.gold, boxShadow:`0 0 8px ${D.gold}`, animation:"blink 2s infinite" }} />}
    </div>
  );
};

/* ── Focus Modal with arrow navigation ── */
function FocusModal({ slot, allSlots, onClose, onRent, onNavigate }) {
  const [entered, setEntered] = useState(false);
  const [dir, setDir] = useState(0);
  const { isMobile } = useScreenSize();
  const occupiedSlots = useMemo(() => allSlots.filter(s => s.occ), [allSlots]);
  const curIdx = occupiedSlots.findIndex(s => s.id === slot?.id);
  const hasPrev = curIdx > 0;
  const hasNext = curIdx < occupiedSlots.length - 1;

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    setDir(-1);
    onNavigate(occupiedSlots[curIdx - 1]);
    setTimeout(() => setDir(0), 250);
  }, [hasPrev, curIdx, occupiedSlots, onNavigate]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    setDir(1);
    onNavigate(occupiedSlots[curIdx + 1]);
    setTimeout(() => setDir(0), 250);
  }, [hasNext, curIdx, occupiedSlots, onNavigate]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [slot]);

  useEffect(() => {
    const fn = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [slot, onClose, goPrev, goNext]);

  if (!slot) return null;
  const { tier, occ, tenant, clicks } = slot;
  const color = occ ? tenant.c : TIER_COLOR[tier];
  const ytMatch = tenant?.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  const ytId = ytMatch?.[1];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(2,6,9,0.95)", backdropFilter:"blur(28px)", display:"flex", alignItems:isMobile?"flex-end":"center", justifyContent:"center", opacity:entered?1:0, transition:"opacity 0.3s ease" }}>
      {/* ── Desktop: side arrows ── */}
      {!isMobile && hasPrev && (
        <button onClick={e=>{e.stopPropagation();goPrev();}} className="focus-nav" style={{ position:"fixed", left:"max(12px, calc(50% - 420px))", top:"50%", transform:"translateY(-50%)", width:48, height:48, borderRadius:"50%", background:"rgba(6,12,22,0.85)", backdropFilter:"blur(12px)", border:`1px solid ${D.bord2}`, color:D.txt, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1020 }}>‹</button>
      )}
      {!isMobile && hasNext && (
        <button onClick={e=>{e.stopPropagation();goNext();}} className="focus-nav" style={{ position:"fixed", right:"max(12px, calc(50% - 420px))", top:"50%", transform:"translateY(-50%)", width:48, height:48, borderRadius:"50%", background:"rgba(6,12,22,0.85)", backdropFilter:"blur(12px)", border:`1px solid ${D.bord2}`, color:D.txt, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1020 }}>›</button>
      )}
      {/* ── Bottom counter + nav ── */}
      <div style={{ position:"fixed", bottom:isMobile?undefined:24, left:"50%", transform:"translateX(-50%)", background:`${D.s2}dd`, backdropFilter:"blur(8px)", border:`1px solid ${D.bord2}`, borderRadius:20, padding:"4px 16px", zIndex:1010, color:D.muted, fontSize:10, fontWeight:700, fontFamily:FF.h, display:isMobile?"none":"flex", alignItems:"center", gap:8 }}>
        <button onClick={e=>{e.stopPropagation();goPrev();}} disabled={!hasPrev} style={{ background:"none", border:"none", color:hasPrev?D.txt:"rgba(255,255,255,0.15)", cursor:hasPrev?"pointer":"default", fontSize:14, padding:"0 2px" }}>‹</button>
        <span style={{ color }}>{curIdx+1}</span><span style={{ color:D.bord2 }}>/</span><span>{occupiedSlots.length}</span>
        <button onClick={e=>{e.stopPropagation();goNext();}} disabled={!hasNext} style={{ background:"none", border:"none", color:hasNext?D.txt:"rgba(255,255,255,0.15)", cursor:hasNext?"pointer":"default", fontSize:14, padding:"0 2px" }}>›</button>
        <span style={{ color:D.muted, fontSize:9 }}>· ← → naviguer · Esc fermer</span>
      </div>
      {/* ── Mobile: arrows inside modal top ── */}
      {isMobile && (
        <div onClick={e=>e.stopPropagation()} style={{ position:"fixed", bottom:12, left:"50%", transform:"translateX(-50%)", zIndex:1020, display:"flex", alignItems:"center", gap:12, background:`${D.s2}dd`, backdropFilter:"blur(8px)", border:`1px solid ${D.bord2}`, borderRadius:24, padding:"6px 14px" }}>
          <button onClick={goPrev} disabled={!hasPrev} style={{ width:38, height:38, borderRadius:"50%", background:hasPrev?`${D.cyan}18`:D.faint, border:`1px solid ${hasPrev?D.cyan+"55":D.bord}`, color:hasPrev?D.txt:"rgba(255,255,255,0.15)", cursor:hasPrev?"pointer":"default", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <div style={{ textAlign:"center" }}>
            <span style={{ color, fontSize:11, fontWeight:800, fontFamily:FF.h }}>{curIdx+1}</span>
            <span style={{ color:D.bord2, fontSize:10 }}> / </span>
            <span style={{ color:D.muted, fontSize:10 }}>{occupiedSlots.length}</span>
          </div>
          <button onClick={goNext} disabled={!hasNext} style={{ width:38, height:38, borderRadius:"50%", background:hasNext?`${D.cyan}18`:D.faint, border:`1px solid ${hasNext?D.cyan+"55":D.bord}`, color:hasNext?D.txt:"rgba(255,255,255,0.15)", cursor:hasNext?"pointer":"default", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
        </div>
      )}
      <div onClick={e=>e.stopPropagation()} style={{ width:isMobile?"100vw":"min(96vw, 760px)", background:`linear-gradient(145deg,${D.s2},${D.card})`, border:`2px solid ${color}44`, borderRadius:isMobile?"24px 24px 0 0":20, overflow:"hidden", overflowY:"auto", maxHeight:isMobile?"88vh":"90vh", boxShadow:`0 0 0 1px ${color}18, 0 40px 100px rgba(0,0,0,0.9), 0 0 80px ${color}18`, transform:entered?(isMobile?undefined:`scale(1) translateX(${dir*-18}px)`):(isMobile?undefined:"scale(0.88) translateY(28px)"), transition:"transform 0.25s cubic-bezier(0.34,1.2,0.64,1)" }}>
        {isMobile && <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.2)" }} /></div>}
        <div style={{ height:3, background:`linear-gradient(90deg,${color},${color}44,transparent)` }} />
        <div style={{ position:"absolute", top:isMobile?22:12, left:16, zIndex:10, padding:"3px 10px", borderRadius:20, background:`${TIER_COLOR[tier]}18`, border:`1px solid ${TIER_COLOR[tier]}40`, color:TIER_COLOR[tier], fontSize:8, fontWeight:800, letterSpacing:1 }}>{TIER_LABEL[tier]} · €{TIER_PRICE[tier]}/j</div>
        <button onClick={onClose} style={{ position:"absolute", top:isMobile?18:10, right:12, width:34, height:34, borderRadius:"50%", border:`1px solid ${D.bord2}`, background:D.faint, color:D.muted, cursor:"pointer", fontSize:18, zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        {occ&&tenant?.img&&tier!=="thousand"&&(
          <div style={{ position:"relative", height:isMobile?160:220, overflow:"hidden", background:tenant.b }}>
            <img src={tenant.img} alt={tenant.name} style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.75 }} />
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(to top, ${D.card}ee, transparent 60%)` }} />
          </div>
        )}
        {occ&&tenant?.t==="video"&&ytId&&(
          <div style={{ position:"relative", height:isMobile?160:220, background:"#000" }}>
            <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=0&modestbranding=1`} style={{ width:"100%", height:"100%", border:"none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        )}
        {occ&&tenant&&(
          <div style={{ padding:isMobile?"16px 16px 20px":"22px 26px 24px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:isMobile?10:14, marginBottom:16 }}>
              <div style={{ width:54, height:54, borderRadius:14, flexShrink:0, background:`${color}20`, border:`2px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color, fontFamily:FF.h, boxShadow:`0 0 20px ${color}33` }}>{tenant.l}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:D.txt, fontWeight:900, fontSize:isMobile?17:20, fontFamily:FF.h, marginBottom:4 }}>{tenant.name}</div>
                <div style={{ color, fontSize:12, fontWeight:700, marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tenant.slogan}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ padding:"2px 9px", borderRadius:20, background:`${color}18`, border:`1px solid ${color}44`, color, fontSize:9, fontWeight:800 }}>{tenant.badge}</span>
                  <span style={{ color:D.muted, fontSize:10 }}>📍 {TIER_LABEL[tier]}</span>
                  {clicks > 0 && <span style={{ color:D.cyan, fontSize:10, fontWeight:700 }}>🖱 {fmtK(clicks)} clics</span>}
                  <span style={{ color:D.mint, fontSize:10, fontWeight:700 }}>👁 {fmtK(TIER_VIEWS[tier])}/j</span>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, flexDirection:isMobile?"column":"row" }}>
              <a href={tenant.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ flex:1, padding:"12px 20px", borderRadius:12, background:`linear-gradient(135deg,${color}ee,${color}88)`, color:"#030810", fontWeight:900, fontSize:13, fontFamily:FF.b, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:7, boxShadow:`0 0 22px ${color}44` }}>{tenant.cta} →</a>
              <button onClick={()=>{onClose();onRent(slot);}} style={{ padding:"12px 18px", borderRadius:12, fontFamily:FF.b, cursor:"pointer", background:`${D.violet}18`, border:`1px solid ${D.violet}44`, color:D.violet, fontWeight:700, fontSize:12 }}>Louer ici →</button>
            </div>
          </div>
        )}
        {!occ&&(
          <div style={{ padding:isMobile?"28px 20px":"40px 26px", textAlign:"center" }}>
            <div style={{ fontSize:42, marginBottom:14, color:TIER_COLOR[tier] }}>◆</div>
            <div style={{ color:D.txt, fontWeight:900, fontSize:20, fontFamily:FF.h, marginBottom:8 }}>Espace disponible</div>
            <div style={{ color:D.muted, fontSize:12, lineHeight:1.7, marginBottom:6 }}>Bloc {TIER_LABEL[tier]} — €{TIER_PRICE[tier]}/jour.</div>
            <div style={{ color:D.cyan, fontSize:13, fontWeight:800, marginBottom:22 }}>👁 {fmtK(TIER_VIEWS[tier])} vues/jour · {TIER_CTR[tier]}% CTR</div>
            <button onClick={()=>{onClose();onRent(slot);}} style={{ padding:"14px 28px", borderRadius:12, fontFamily:FF.b, cursor:"pointer", background:`linear-gradient(135deg,${TIER_COLOR[tier]}ee,${TIER_COLOR[tier]}88)`, border:"none", color:"#030810", fontWeight:900, fontSize:14, boxShadow:`0 0 28px ${TIER_COLOR[tier]}44`, width:isMobile?"100%":"auto" }}>Réserver cet espace →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GRID RENDERER
══════════════════════════════════════════════════════ */
function useGridLayout() {
  const GAP = 2;
  const colWidths = useMemo(() => Array.from({ length:GRID_COLS }, (_, x) => {
    let m = 0;
    for (let y = 0; y < GRID_ROWS; y++) m = Math.max(m, TIER_SIZE[MASTER_SLOTS[y*GRID_COLS+x].tier]);
    return m;
  }), []);
  const rowHeights = useMemo(() => Array.from({ length:GRID_ROWS }, (_, y) => {
    let m = 0;
    for (let x = 0; x < GRID_COLS; x++) m = Math.max(m, TIER_SIZE[MASTER_SLOTS[y*GRID_COLS+x].tier]);
    return m;
  }), []);
  const colOffsets = useMemo(() => { const o=[0]; for(let x=0;x<GRID_COLS-1;x++) o.push(o[x]+colWidths[x]+GAP); return o; }, [colWidths]);
  const rowOffsets = useMemo(() => { const o=[0]; for(let y=0;y<GRID_ROWS-1;y++) o.push(o[y]+rowHeights[y]+GAP); return o; }, [rowHeights]);
  const totalGridW = colOffsets[GRID_COLS-1] + colWidths[GRID_COLS-1];
  const totalGridH = rowOffsets[GRID_ROWS-1] + rowHeights[GRID_ROWS-1];
  return { colOffsets, rowOffsets, totalGridW, totalGridH };
}

/* ══════════════════════════════════════════════════════
   PUBLIC VIEW
══════════════════════════════════════════════════════ */
function PublicView({ onRent }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(1200);
  const [focusSlot, setFocusSlot] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [filterTier, setFilterTier] = useState("all");
  const [showVacant, setShowVacant] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const { colOffsets, rowOffsets, totalGridW, totalGridH } = useGridLayout();
  const { isMobile } = useScreenSize();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => setContainerW(e[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const baseScale = Math.min(1, Math.max(0.15, (containerW - (isMobile?16:32)) / totalGridW));
  const scale = Math.min(2, Math.max(0.12, baseScale * Math.pow(1.25, zoomLevel)));

  const filteredSlots = useMemo(() => {
    let s = MASTER_SLOTS;
    if (filterTier !== "all") s = s.filter(sl => sl.tier === filterTier || (filterTier === "ten" && sl.tier === "corner_ten"));
    if (showVacant) s = s.filter(sl => !sl.occ);
    return new Set(s.map(sl => sl.id));
  }, [filterTier, showVacant]);

  const toggleSelect = (slot) => {
    if (slot.occ) return;
    setSelected(prev => {
      const n = new Set(prev);
      n.has(slot.id) ? n.delete(slot.id) : n.add(slot.id);
      return n;
    });
  };

  const stats = useMemo(() => ({
    occupied: MASTER_SLOTS.filter(s => s.occ).length,
    vacant: MASTER_SLOTS.filter(s => !s.occ).length,
    hot: MASTER_SLOTS.filter(s => s.hot).length,
  }), []);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:D.bg }}>
      {/* Ticker */}
      <TickerBar onBlockClick={(sl) => setFocusSlot(sl)} />

      {/* Controls */}
      <div style={{ padding:"8px 16px", borderBottom:`1px solid ${D.bord}`, background:D.s1, display:"flex", alignItems:"center", gap:10, flexShrink:0, flexWrap:"wrap" }}>
        {[["all","Tous",D.txt],["one","ÉPICENTRE",D.gold],["ten","PRESTIGE",D.rose],["hundred","BUSINESS",D.cyan],["thousand","VIRAL",D.mint]].map(([id,label,color]) => (
          <button key={id} onClick={() => setFilterTier(id)} style={{ padding:"4px 12px", borderRadius:20, fontFamily:FF.b, cursor:"pointer", fontSize:11, background:filterTier===id?`${color}20`:"transparent", border:`1px solid ${filterTier===id?color:D.bord}`, color:filterTier===id?color:D.muted, fontWeight:filterTier===id?800:400, transition:"all 0.2s", whiteSpace:"nowrap" }}>{label}</button>
        ))}
        <div style={{ width:1, height:18, background:D.bord }} />
        <button onClick={() => setShowVacant(v=>!v)} style={{ padding:"4px 12px", borderRadius:20, fontFamily:FF.b, cursor:"pointer", fontSize:11, background:showVacant?`${D.violet}20`:"transparent", border:`1px solid ${showVacant?D.violet:D.bord}`, color:showVacant?D.violet:D.muted }}>Vacants</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:isMobile?8:16, alignItems:"center" }}>
          <VisitorBadge />
          {!isMobile && [[stats.occupied,"Occupés",D.rose],[stats.vacant,"Libres",D.mint],[selected.size,"Sél.",D.violet]].map(([v,l,c]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ color:c, fontWeight:900, fontSize:13, fontFamily:FF.h }}>{v}</span>
              <span style={{ color:D.muted, fontSize:10 }}>{l}</span>
            </div>
          ))}
        </div>
        {selected.size > 0 && (
          <button onClick={() => onRent({ selected: Array.from(selected) })} style={{ padding:"6px 16px", borderRadius:9, fontFamily:FF.b, cursor:"pointer", background:`linear-gradient(135deg,${D.violet}ee,${D.violet}88)`, border:"none", color:"#030810", fontWeight:900, fontSize:12, boxShadow:`0 0 18px ${D.violet}44` }}>
            Louer {selected.size} bloc{selected.size>1?"s":""} →
          </button>
        )}
      </div>

      {/* Grid */}
      <div ref={containerRef} style={{ flex:1, overflow:"auto", padding:isMobile?8:16, position:"relative" }}>
        <div style={{ position:"relative", width:totalGridW*scale, height:totalGridH*scale }}>
          <div style={{ position:"absolute", top:0, left:0, transform:`scale(${scale})`, transformOrigin:"top left", width:totalGridW, height:totalGridH }}>
            {MASTER_SLOTS.map(slot => (
              <div key={slot.id} style={{ position:"absolute", left:colOffsets[slot.x], top:rowOffsets[slot.y], opacity:filteredSlots.has(slot.id)?1:0.08, transition:"opacity 0.25s" }}>
                <BlockCell slot={slot} isSelected={selected.has(slot.id)} onSelect={toggleSelect} onFocus={setFocusSlot} />
              </div>
            ))}
          </div>
        </div>
        {/* Zoom */}
        <div style={{ position:"sticky", bottom:16, float:"right", zIndex:50, display:"flex", flexDirection:"column", gap:4, marginTop:-120, pointerEvents:"none" }}>
          {[{icon:"+",fn:()=>setZoomLevel(z=>Math.min(z+1,4))},{icon:"−",fn:()=>setZoomLevel(z=>Math.max(z-1,-3))}].map((z,i)=>(
            <button key={i} onClick={z.fn} style={{ pointerEvents:"auto", width:40, height:40, borderRadius:12, background:"rgba(6,12,22,0.92)", backdropFilter:"blur(12px)", border:`1px solid ${D.bord2}`, color:D.txt, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{z.icon}</button>
          ))}
          {zoomLevel!==0&&<button onClick={()=>setZoomLevel(0)} style={{ pointerEvents:"auto", width:40, height:40, borderRadius:12, background:"rgba(6,12,22,0.92)", backdropFilter:"blur(12px)", border:`1px solid ${D.bord2}`, color:D.txt, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>⟳</button>}
        </div>
      </div>

      {focusSlot && <FocusModal slot={focusSlot} allSlots={MASTER_SLOTS} onClose={() => setFocusSlot(null)} onRent={onRent} onNavigate={setFocusSlot} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ADVERTISER VIEW — with tier highlight + click stats
══════════════════════════════════════════════════════ */
function AdvertiserView({ selectedSlot, onBack }) {
  const [chosenSlot, setChosenSlot] = useState(selectedSlot || null);
  const [tunnelOpen, setTunnelOpen] = useState(!!selectedSlot);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email:"", company:"", pass:"" });
  const [content, setContent] = useState({ type:null, url:"" });
  const [dur, setDur] = useState(30);
  const [hoveredTier, setHoveredTier] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(1200);
  const { colOffsets, rowOffsets, totalGridW, totalGridH } = useGridLayout();
  const { isMobile } = useScreenSize();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => setContainerW(e[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scale = Math.min(1, Math.max(0.2, (containerW - 32) / totalGridW));
  const vacantCount = useMemo(() => MASTER_SLOTS.filter(s => !s.occ).length, []);

  const tier = chosenSlot?.tier;
  const basePrice = tier ? TIER_PRICE[tier] : 0;
  const discount = dur===7?0.93:dur===30?0.80:1;
  const price = Math.round(basePrice * dur * discount);

  /* highlighted tier = selectedTier (click) > hoveredTier (hover) */
  const activeTier = selectedTier || hoveredTier;

  const openTunnel = (slot) => {
    setChosenSlot(slot);
    setSelectedTier(slot.tier === "corner_ten" ? "corner_ten" : slot.tier);
    setStep(1);
    setForm({ email:"", company:"", pass:"" });
    setContent({ type:null, url:"" });
    setDur(30);
    setTunnelOpen(true);
  };

  const tierStats = useMemo(() => {
    const map = {};
    for (const t of ["one","ten","corner_ten","hundred","thousand"]) {
      const slots = MASTER_SLOTS.filter(s => s.tier === t);
      map[t] = { total:slots.length, vacant:slots.filter(s=>!s.occ).length };
    }
    return map;
  }, []);

  const inputSt = { width:"100%", padding:"9px 12px", borderRadius:9, background:D.faint, border:`1px solid ${D.bord2}`, color:D.txt, fontSize:12, outline:"none", fontFamily:FF.b, boxSizing:"border-box" };

  /* ── Anon Block with tier highlight + click display ── */
  const AnonBlock = ({ slot }) => {
    const { tier: t, occ, clicks } = slot;
    const sz = TIER_SIZE[t];
    const c = TIER_COLOR[t];
    const isChosen = chosenSlot?.id === slot.id;
    const isTierHighlighted = activeTier && (t === activeTier || (activeTier === "ten" && t === "corner_ten"));
    const dimmed = activeTier && !isTierHighlighted;

    if (occ) return (
      <div style={{ width:sz, height:sz, borderRadius:t==="one"?10:t==="ten"||t==="corner_ten"?5:3, background:"rgba(10,15,25,0.9)", border:`1px solid ${isTierHighlighted?c+"55":"rgba(255,255,255,0.04)"}`, position:"relative", overflow:"hidden", flexShrink:0, opacity:dimmed?0.15:1, transition:"opacity 0.3s, border-color 0.3s" }}>
        <div style={{ position:"absolute", inset:0, background:`${c}06`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:1 }}>
          {sz>=20&&<div style={{ width:"40%", height:1.5, background:`${c}30`, borderRadius:1 }} />}
          {/* Click stats on occupied blocks (larger ones) */}
          {sz>=26 && clicks > 0 && (
            <div style={{ position:"absolute", bottom:1, left:0, right:0, display:"flex", justifyContent:"center" }}>
              <span style={{ fontSize:Math.min(7,sz*0.13), color:`${c}88`, fontWeight:700, fontFamily:FF.h }}>{fmtK(clicks)}</span>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className="block-hover" onClick={() => openTunnel(slot)} style={{
        width:sz, height:sz, flexShrink:0, position:"relative",
        borderRadius:t==="one"?10:t==="ten"||t==="corner_ten"?6:t==="hundred"?3:2,
        background:isChosen?`${c}22`:isTierHighlighted?`${c}0c`:D.s2,
        border:`${t==="corner_ten"?2:isChosen?2:1}px solid ${isChosen?c:isTierHighlighted?c:t==="corner_ten"?D.gold:`${c}25`}`,
        boxShadow:isChosen?`0 0 0 2px ${c}, 0 0 20px ${c}44`:t==="corner_ten"?`0 0 15px ${D.gold}44`:"none",
        cursor:"pointer",
        opacity:dimmed?0.15:1,
        transition:"opacity 0.3s, border-color 0.3s, background 0.3s",
        animation:isTierHighlighted&&!isChosen?"tierHighlight 2s ease-in-out infinite":t==="corner_ten"?"glowPulse 3s infinite":undefined,
        color:c,
      }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 50%)", pointerEvents:"none" }} />
        <div className="rent-cta" style={{ position:"absolute", inset:0, background: isChosen ? `${c}15` : "rgba(0,0,0,0.75)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
          {isChosen ? (
            <span style={{ color:c, fontSize:Math.max(8,sz*0.3), fontWeight:900 }}>✓</span>
          ) : sz>=28 ? (<>
            <span style={{ fontSize:Math.min(14,sz*0.22), color:c, fontWeight:900 }}>+</span>
            {sz>=46&&<span style={{ fontSize:Math.min(8,sz*0.13), color:c, fontWeight:700 }}>{t==="corner_ten"?"CORNER":t==="one"?"PREMIUM":"Louer"}</span>}
            {/* Show views/day on vacant blocks to incentivize */}
            {sz>=46&&<span style={{ fontSize:Math.min(7,sz*0.11), color:D.cyan, fontWeight:700, opacity:0.8 }}>👁 {fmtK(TIER_VIEWS[t])}/j</span>}
          </>) : <div style={{ width:3, height:3, borderRadius:"50%", background:c }} />}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden", background:D.bg, flexDirection:isMobile?"column":"row" }}>
      {/* Sidebar */}
      <div style={{ width:isMobile?"100%":340, flexShrink:0, borderRight:isMobile?undefined:`1px solid ${D.bord}`, borderTop:isMobile?`1px solid ${D.bord}`:undefined, display:"flex", flexDirection:"column", background:D.s1, overflowY:"auto", order:isMobile?2:0, maxHeight:isMobile?"50vh":undefined }}>
        <div style={{ padding:"18px 20px", borderBottom:`1px solid ${D.bord}` }}>
          <div style={{ color:D.txt, fontWeight:900, fontSize:18, fontFamily:FF.h, marginBottom:4 }}>Interface <span style={{ color:D.gold }}>Annonceurs</span></div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6 }}>
            <span style={{ color:D.muted, fontSize:11 }}>{vacantCount} emplacements</span>
            <VisitorBadge />
          </div>
        </div>

        {/* Tier selector — click to highlight on grid */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${D.bord}` }}>
          <div style={{ color:D.muted, fontSize:9, fontWeight:700, letterSpacing:1.2, marginBottom:10 }}>CHOISIR UN TIER <span style={{ color:D.cyan, opacity:0.7 }}>· cliquer pour surbrillance</span></div>
          {[{tier:"one",label:"ÉPICENTRE",desc:"Le bloc central absolu",icon:"◆"},{tier:"corner_ten",label:"CORNER",desc:"Les 4 coins de la grille",icon:"⬛"},{tier:"ten",label:"PRESTIGE",desc:"Anneau autour du centre",icon:"💎"},{tier:"hundred",label:"BUSINESS",desc:"Zone business principale",icon:"🏢"},{tier:"thousand",label:"VIRAL",desc:"Maximum de couverture",icon:"🚀"}].map(({ tier:t, label, desc, icon }) => {
            const s = tierStats[t];
            const isHov = hoveredTier === t;
            const isSel = selectedTier === t;
            const c = TIER_COLOR[t];
            return (
              <div key={t}
                onMouseEnter={() => setHoveredTier(t)}
                onMouseLeave={() => setHoveredTier(null)}
                onClick={() => setSelectedTier(prev => prev === t ? null : t)}
                style={{ padding:"11px 14px", borderRadius:11, marginBottom:7, cursor:"pointer", background:isSel?`${c}18`:isHov?`${c}12`:D.faint, border:`1px solid ${isSel?c:isHov?c+"44":D.bord}`, transition:"all 0.2s", boxShadow:isSel?`0 0 16px ${c}33`:"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:18 }}>{icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ color:c, fontWeight:900, fontSize:13, fontFamily:FF.h, letterSpacing:1 }}>{label}</span>
                      {isSel && <div style={{ width:6, height:6, borderRadius:"50%", background:c, boxShadow:`0 0 8px ${c}`, animation:"blink 1.5s infinite" }} />}
                    </div>
                    <div style={{ color:D.muted, fontSize:10, marginTop:1 }}>{desc}</div>
                    {/* Views + CTR per tier */}
                    <div style={{ display:"flex", gap:8, marginTop:4 }}>
                      <span style={{ color:D.cyan, fontSize:9, fontWeight:700 }}>👁 {fmtK(TIER_VIEWS[t])}/j</span>
                      <span style={{ color:D.mint, fontSize:9, fontWeight:700 }}>{TIER_CTR[t]}% CTR</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color:c, fontWeight:900, fontSize:13, fontFamily:FF.h }}>€{TIER_PRICE[t]}/j</div>
                    <div style={{ color:D.muted, fontSize:9 }}>{s.vacant} libres</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chosen slot */}
        {chosenSlot && (
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${D.bord}` }}>
            <div style={{ color:D.muted, fontSize:9, fontWeight:700, letterSpacing:1.2, marginBottom:10 }}>ESPACE SÉLECTIONNÉ</div>
            <div style={{ padding:"12px 14px", borderRadius:12, background:`${TIER_COLOR[chosenSlot.tier]}10`, border:`1px solid ${TIER_COLOR[chosenSlot.tier]}35` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ color:D.txt, fontWeight:800, fontSize:13, fontFamily:FF.h }}>{TIER_LABEL[chosenSlot.tier]}</span>
                <span style={{ color:TIER_COLOR[chosenSlot.tier], fontWeight:900, fontSize:13, fontFamily:FF.h }}>€{TIER_PRICE[chosenSlot.tier]}/j</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:D.muted, fontSize:10 }}>Position : ({chosenSlot.x}, {chosenSlot.y})</span>
                <span style={{ color:D.cyan, fontSize:10, fontWeight:700 }}>👁 {fmtK(TIER_VIEWS[chosenSlot.tier])}/j</span>
              </div>
              <div style={{ marginTop:12 }}>
                <div style={{ color:D.muted, fontSize:9, fontWeight:700, letterSpacing:1, marginBottom:6 }}>DURÉE</div>
                <div style={{ display:"flex", gap:4 }}>
                  {[{d:1,l:"1j",off:0},{d:7,l:"7j",off:7},{d:30,l:"30j",off:20}].map(({d,l,off}) => (
                    <button key={d} onClick={() => setDur(d)} style={{ flex:1, padding:"6px 4px", borderRadius:8, fontFamily:FF.b, cursor:"pointer", background:dur===d?`${D.cyan}18`:D.faint, border:`1px solid ${dur===d?D.cyan:D.bord}`, color:dur===d?D.cyan:D.muted, fontSize:11, fontWeight:dur===d?800:400 }}>
                      {l}{off>0&&<div style={{ fontSize:8, color:D.mint }}>−{off}%</div>}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop:12, padding:"10px 12px", borderRadius:8, background:`${D.gold}0c`, border:`1px solid ${D.gold}22`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:D.muted, fontSize:11 }}>Total {dur}j</span>
                <span style={{ color:D.gold, fontWeight:900, fontSize:18, fontFamily:FF.h }}>€{price}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tunnel steps */}
        {tunnelOpen && chosenSlot && (
          <div style={{ padding:"16px 20px", flex:1 }}>
            <div style={{ color:D.muted, fontSize:9, fontWeight:700, letterSpacing:1.2, marginBottom:12 }}>ÉTAPES ({step}/4)</div>
            <div style={{ display:"flex", gap:4, marginBottom:16 }}>
              {["Compte","Contenu","Paiement","Live"].map((s,i) => (
                <div key={s} style={{ flex:1, height:3, borderRadius:2, background:step>i+1?D.cyan:step===i+1?`${D.cyan}88`:D.bord }} />
              ))}
            </div>

            {step===1&&(
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ color:D.txt, fontWeight:800, fontSize:13, fontFamily:FF.h, marginBottom:4 }}>Créer un compte</div>
                {[["email","Email","votre@email.com"],["company","Entreprise","Ma Société"],["pass","Mot de passe","••••••••"]].map(([k,l,p]) => (
                  <div key={k}>
                    <div style={{ color:D.muted, fontSize:11, marginBottom:4 }}>{l}</div>
                    <input placeholder={p} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inputSt} type={k==="pass"?"password":"text"} />
                  </div>
                ))}
                <button onClick={() => setStep(2)} style={{ padding:"11px", borderRadius:10, fontFamily:FF.b, cursor:"pointer", background:`linear-gradient(135deg,${D.cyan}ee,${D.cyan}88)`, border:"none", color:"#030810", fontWeight:900, fontSize:13, boxShadow:`0 0 22px ${D.cyan}44`, marginTop:4 }}>Continuer →</button>
              </div>
            )}
            {step===2&&(
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ color:D.txt, fontWeight:800, fontSize:13, fontFamily:FF.h, marginBottom:4 }}>Votre contenu</div>
                {[{id:"link",icon:"🔗",label:"Lien",color:D.cyan},{id:"image",icon:"🖼",label:"Image",color:D.violet},{id:"video",icon:"🎬",label:"Vidéo",color:D.rose},{id:"brand",icon:"🏷",label:"Marque",color:D.gold},{id:"text",icon:"📝",label:"Texte",color:D.mint}].map(ct=>(
                  <button key={ct.id} onClick={()=>setContent(c=>({...c,type:ct.id}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, fontFamily:FF.b, cursor:"pointer", textAlign:"left", background:content.type===ct.id?`${ct.color}18`:D.faint, border:`1px solid ${content.type===ct.id?ct.color:D.bord}`, transition:"all 0.2s" }}>
                    <span style={{ fontSize:20 }}>{ct.icon}</span>
                    <span style={{ color:content.type===ct.id?ct.color:D.txt, fontWeight:700, fontSize:12 }}>{ct.label}</span>
                  </button>
                ))}
                {content.type&&<div><div style={{ color:D.muted, fontSize:11, marginBottom:4 }}>URL de destination</div><input placeholder="https://votre-site.com" value={content.url} onChange={e=>setContent(c=>({...c,url:e.target.value}))} style={inputSt}/></div>}
                <button onClick={()=>setStep(3)} disabled={!content.type} style={{ padding:"11px", borderRadius:10, fontFamily:FF.b, cursor:"pointer", background:content.type?`linear-gradient(135deg,${D.violet}ee,${D.violet}88)`:D.faint, border:`1px solid ${content.type?"transparent":D.bord}`, color:content.type?"#030810":D.muted, fontWeight:900, fontSize:13, opacity:content.type?1:0.5 }}>Continuer →</button>
              </div>
            )}
            {step===3&&(
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ color:D.txt, fontWeight:800, fontSize:13, fontFamily:FF.h, marginBottom:4 }}>Paiement</div>
                {[["card","N° carte","4242 4242 4242 4242"],["exp","Expiration","MM/AA"],["cvv","CVV","•••"]].map(([k,l,p])=>(
                  <div key={k}><div style={{ color:D.muted, fontSize:11, marginBottom:4 }}>{l}</div><input placeholder={p} style={inputSt}/></div>
                ))}
                <div style={{ color:D.muted, fontSize:10 }}>🔒 Paiement sécurisé SSL · Stripe</div>
                <button onClick={()=>setStep(4)} style={{ padding:"11px", borderRadius:10, fontFamily:FF.b, cursor:"pointer", background:`linear-gradient(135deg,${D.gold}ee,${D.gold}88)`, border:"none", color:"#030810", fontWeight:900, fontSize:13, boxShadow:`0 0 22px ${D.gold}44` }}>Payer €{price} →</button>
              </div>
            )}
            {step===4&&(
              <div style={{ textAlign:"center", padding:"24px 0" }}>
                <div style={{ width:72, height:72, borderRadius:"50%", background:`${D.mint}12`, border:`2px solid ${D.mint}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:36, boxShadow:`0 0 44px ${D.mint}44` }}>✓</div>
                <div style={{ color:D.txt, fontWeight:900, fontSize:18, fontFamily:FF.h, marginBottom:8 }}>Votre bloc est en ligne !</div>
                <div style={{ color:D.muted, fontSize:12, lineHeight:1.65, marginBottom:20 }}>Emplacement {TIER_LABEL[chosenSlot.tier]} · {dur} jour{dur>1?"s":""}.<br/>Visible par {fmtK(TIER_VIEWS[chosenSlot.tier])} visiteurs/jour.</div>
                <button onClick={()=>{setTunnelOpen(false);setChosenSlot(null);setSelectedTier(null);setStep(1);}} style={{ padding:"10px 22px", borderRadius:10, fontFamily:FF.b, cursor:"pointer", background:`${D.violet}18`, border:`1px solid ${D.violet}44`, color:D.violet, fontWeight:700, fontSize:12 }}>← Retour à la grille</button>
              </div>
            )}
          </div>
        )}
        {!tunnelOpen&&<div style={{ padding:"16px 20px", textAlign:"center", color:D.muted, fontSize:11, lineHeight:1.6 }}><div style={{ fontSize:32, marginBottom:12 }}>🎯</div>Cliquez sur un tier ci-dessus pour le mettre en surbrillance, puis sélectionnez un espace libre dans la grille.</div>}
      </div>

      {/* Grid */}
      <div ref={containerRef} style={{ flex:1, overflow:"auto", padding:16, background:D.bg, order:isMobile?1:0, minHeight:isMobile?"30vh":undefined }}>
        <div style={{ position:"relative", width:totalGridW*scale, height:totalGridH*scale }}>
          <div style={{ position:"absolute", top:0, left:0, transform:`scale(${scale})`, transformOrigin:"top left", width:totalGridW, height:totalGridH }}>
            {MASTER_SLOTS.map(slot => (
              <div key={slot.id} style={{ position:"absolute", left:colOffsets[slot.x], top:rowOffsets[slot.y] }}>
                <AnonBlock slot={slot} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LANDING PAGE — ADS-SQUARE
══════════════════════════════════════════════════════ */
function LandingPage({ onPublic, onAdvertiser }) {
  const [hovP, setHovP] = useState(false);
  const [hovA, setHovA] = useState(false);
  const visitors = useVisitorCounter();
  const { isMobile } = useScreenSize();

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:isMobile?"24px 16px":40, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, overflow:"hidden", opacity:0.12, pointerEvents:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${isMobile?8:12}, ${isMobile?14:18}px)`, gap:2 }}>
          {MASTER_SLOTS.slice(0, isMobile?64:144).map(s => (
            <div key={s.id} style={{ width:isMobile?14:18, height:isMobile?14:18, borderRadius:2, background:s.occ?(s.tenant.c+"33"):D.s2, border:`1px solid ${s.occ?s.tenant.c+"22":D.bord}` }} />
          ))}
        </div>
      </div>

      <div style={{ position:"relative", zIndex:10, maxWidth:580, textAlign:"center", animation:"fadeUp 0.6s ease forwards", width:"100%" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 14px", borderRadius:20, marginBottom:24, background:`${D.cyan}12`, border:`1px solid ${D.cyan}35`, color:D.cyan, fontSize:10, fontWeight:800, letterSpacing:1.5 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:D.mint, boxShadow:`0 0 8px ${D.mint}`, animation:"blink 1.8s infinite" }} />
          LIVE · {fmtK(visitors)} VISITEURS MAINTENANT
        </div>

        <h1 style={{ color:D.txt, fontWeight:900, fontSize:"clamp(34px,8vw,56px)", lineHeight:1.05, fontFamily:FF.h, letterSpacing:-1, margin:"0 0 12px", display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ width:48, height:48, borderRadius:12, background:`linear-gradient(135deg,${D.cyan}33,${D.violet}22)`, border:`2px solid ${D.cyan}55`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:D.cyan, fontSize:24, fontWeight:900, fontFamily:FF.h }}>□</span>
          </div>
          <span>ADS<span style={{ color:D.cyan }}>-</span>SQUARE</span>
        </h1>
        <div style={{ fontSize:"clamp(14px,3vw,20px)", letterSpacing:3, color:D.muted, fontWeight:700, fontFamily:FF.h, marginBottom:18 }}>DIGITAL ADVERTISING GRID</div>

        <p style={{ color:D.muted, fontSize:"clamp(12px,2.5vw,14px)", lineHeight:1.7, maxWidth:440, margin:"0 auto 36px" }}>
          La première plateforme de blocs publicitaires organisés en grille.<br />
          Réservez votre espace. Diffusez votre contenu. Touchez des millions.
        </p>

        <div style={{ display:"flex", gap:isMobile?16:32, justifyContent:"center", marginBottom:40, flexWrap:"wrap" }}>
          {[
            [MASTER_SLOTS.filter(s=>s.occ).length.toLocaleString(),"Blocs actifs",D.rose],
            [MASTER_SLOTS.filter(s=>!s.occ).length.toLocaleString(),"Disponibles",D.mint],
            [fmtK(visitors),"Visiteurs live",D.cyan],
            ["4","Tiers de prix",D.gold],
          ].map(([v,l,c]) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ color:c, fontWeight:900, fontSize:isMobile?22:26, fontFamily:FF.h }}>{v}</div>
              <div style={{ color:D.muted, fontSize:10, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
          <button className="landing-btn" onMouseEnter={()=>setHovP(true)} onMouseLeave={()=>setHovP(false)} onClick={onPublic} style={{ position:"relative", width:260, maxWidth:"calc(50vw - 20px)", padding:isMobile?"18px 20px":"22px 26px", borderRadius:18, background:hovP?`linear-gradient(135deg,${D.cyan}22,${D.violet}12)`:`${D.cyan}0a`, border:`2px solid ${hovP?D.cyan:D.cyan+"44"}`, cursor:"pointer", textAlign:"left", fontFamily:FF.b, boxShadow:hovP?`0 0 40px ${D.cyan}22`:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ fontSize:26 }}>👁</div>
              <div style={{ color:D.cyan, fontWeight:900, fontSize:17, fontFamily:FF.h, letterSpacing:.5 }}>EXPLORER</div>
            </div>
            <div style={{ color:D.muted, fontSize:12, lineHeight:1.6, marginBottom:12 }}>Naviguez dans la grille 37×37 et découvrez tous les blocs actifs.</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, color:D.cyan, fontSize:12, fontWeight:800 }}>Vue publique <span>→</span></div>
          </button>

          <button className="landing-btn" onMouseEnter={()=>setHovA(true)} onMouseLeave={()=>setHovA(false)} onClick={onAdvertiser} style={{ position:"relative", width:260, maxWidth:"calc(50vw - 20px)", padding:isMobile?"18px 20px":"22px 26px", borderRadius:18, background:hovA?`linear-gradient(135deg,${D.gold}22,${D.rose}12)`:`${D.gold}0a`, border:`2px solid ${hovA?D.gold:D.gold+"44"}`, cursor:"pointer", textAlign:"left", fontFamily:FF.b, boxShadow:hovA?`0 0 40px ${D.gold}22`:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ fontSize:26 }}>📢</div>
              <div style={{ color:D.gold, fontWeight:900, fontSize:17, fontFamily:FF.h, letterSpacing:.5 }}>ANNONCER</div>
            </div>
            <div style={{ color:D.muted, fontSize:12, lineHeight:1.6, marginBottom:12 }}>Réservez un espace et diffusez votre contenu à {fmtK(visitors)} visiteurs.</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, color:D.gold, fontSize:12, fontWeight:800 }}>Interface annonceurs <span>→</span></div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ROOT APP — ADS-SQUARE
══════════════════════════════════════════════════════ */
export default function App() {
  const [view, setView] = useState("landing");
  const [rentSlot, setRentSlot] = useState(null);
  const { isMobile } = useScreenSize();

  const handleRent = useCallback((slot) => {
    setRentSlot(slot);
    setView("advertiser");
  }, []);

  const isFullscreen = view === "public" || view === "advertiser";

  return (
    <div style={{ display:"flex", height:"100vh", background:D.bg, fontFamily:FF.b, color:D.txt, overflow:"hidden", flexDirection:"column" }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {!isFullscreen && (
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:isMobile?"0 12px":"0 24px", height:52, flexShrink:0, borderBottom:`1px solid ${D.bord}`, background:`${D.s1}e8`, backdropFilter:"blur(14px)", zIndex:100 }}>
          <BrandLogo size={isMobile?16:20} onClick={() => setView("landing")} />
          <nav style={{ display:"flex", gap:4, alignItems:"center" }}>
            <VisitorBadge />
            <button onClick={() => setView("public")} style={{ padding:"5px 12px", borderRadius:8, fontFamily:FF.b, cursor:"pointer", background:"transparent", border:`1px solid ${D.bord}`, color:D.muted, fontSize:11 }}>👁{isMobile?"":" Explorer"}</button>
            <button onClick={() => setView("advertiser")} style={{ padding:"6px 16px", borderRadius:9, fontFamily:FF.b, cursor:"pointer", background:`linear-gradient(135deg,${D.gold}22,${D.gold}0a)`, border:`1px solid ${D.gold}55`, color:D.gold, fontSize:11, fontWeight:700 }}>📢{isMobile?"":" Annoncer"}</button>
          </nav>
        </header>
      )}

      {isFullscreen && (
        <div style={{ position:"fixed", top:12, left:"50%", transform:"translateX(-50%)", zIndex:200, display:"flex", alignItems:"center", gap:6, background:"rgba(6,12,22,0.88)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:40, padding:"7px 14px", boxShadow:"0 4px 32px rgba(0,0,0,0.6)", maxWidth:"calc(100vw - 24px)" }}>
          <BrandLogo size={isMobile?12:14} onClick={() => setView("landing")} />
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.12)" }} />
          {[["public","👁","Explorer",D.cyan],["advertiser","📢","Annoncer",D.gold]].map(([v,ico,l,c]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding:"4px 10px", borderRadius:20, fontFamily:FF.b, cursor:"pointer", background:view===v?`${c}22`:"transparent", border:`1px solid ${view===v?c+"77":"transparent"}`, color:view===v?c:D.muted, fontWeight:view===v?800:400, fontSize:10, transition:"all 0.2s", display:"flex", alignItems:"center", gap:4 }}>
              <span>{ico}</span>{isMobile?"":l}
            </button>
          ))}
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.12)" }} />
          <VisitorBadge />
          {!isMobile && (<>
            <div style={{ width:1, height:16, background:"rgba(255,255,255,0.12)" }} />
            <span style={{ color:D.muted, fontSize:10 }}><span style={{ color:D.txt, fontWeight:700 }}>{MASTER_SLOTS.filter(s=>s.occ).length}</span> actifs</span>
            <span style={{ color:"rgba(255,255,255,0.15)", fontSize:10 }}>·</span>
            <span style={{ color:D.muted, fontSize:10 }}><span style={{ color:D.cyan, fontWeight:700 }}>{MASTER_SLOTS.filter(s=>!s.occ).length}</span> libres</span>
          </>)}
        </div>
      )}

      {view==="landing"&&<LandingPage onPublic={()=>setView("public")} onAdvertiser={()=>setView("advertiser")}/>}
      {view==="public"&&<PublicView onRent={handleRent}/>}
      {view==="advertiser"&&<AdvertiserView selectedSlot={rentSlot} onBack={()=>setView("public")}/>}
    </div>
  );
}
