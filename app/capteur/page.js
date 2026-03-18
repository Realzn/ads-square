'use client';
// app/capteur/page.js — LE CAPTEUR SOLAIRE v3
// 1 euro/s · durée libre · effets graphiques enrichis
// Nouveaux effets : patterns, glow animé, texte gradient, scanlines,
//   overlays, animations entrée, preview live avancée, font effects

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────
//  DESIGN SYSTEM
// ─────────────────────────────────────────────────────────────────
const DS = {
  void:    '#01020A',
  glass:   'rgba(1,4,14,0.96)',
  brd:     'rgba(0,210,240,0.09)',
  gold:    '#E8A020',
  cyan:    '#00C8E4',
  violet:  '#8060C8',
  green:   '#00D880',
  rose:    '#D02848',
  textHi:  '#DDE6F2',
  textMid: 'rgba(140,180,220,0.70)',
  textLo:  'rgba(60,100,150,0.42)',
};
const F = {
  ui:   "'Rajdhani','Sora',system-ui,sans-serif",
  mono: "'JetBrains Mono','Fira Code',monospace",
};
const CLP   = 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))';
const CLP_S = 'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))';
const PRICE = 1;

// ─────────────────────────────────────────────────────────────────
//  EFFETS GRAPHIQUES — CONSTANTES
// ─────────────────────────────────────────────────────────────────

// Patterns de fond disponibles
const BG_PATTERNS = [
  { id:'grid',     label:'GRILLE',      icon:'⊞' },
  { id:'dots',     label:'POINTS',      icon:'⁘' },
  { id:'lines',    label:'LIGNES',      icon:'≡' },
  { id:'diagonal', label:'DIAGONALE',   icon:'⟋' },
  { id:'hexagon',  label:'HEXAGONE',    icon:'⬡' },
  { id:'none',     label:'AUCUN',       icon:'○' },
];

// Effets de texte
const TEXT_EFFECTS = [
  { id:'none',       label:'NORMAL',    icon:'T' },
  { id:'glow',       label:'LUEUR',     icon:'✦' },
  { id:'outline',    label:'CONTOUR',   icon:'□' },
  { id:'gradient',   label:'DÉGRADÉ',   icon:'▓' },
  { id:'shadow',     label:'OMBRE',     icon:'◫' },
  { id:'glitch',     label:'GLITCH',    icon:'⚡' },
  { id:'neon',       label:'NÉON',      icon:'◌' },
];

// Overlays d'ambiance
const OVERLAYS = [
  { id:'none',      label:'AUCUN',     icon:'○' },
  { id:'scanlines', label:'SCANLINES', icon:'≣' },
  { id:'noise',     label:'BRUIT',     icon:'▒' },
  { id:'vignette',  label:'VIGNETTE',  icon:'◎' },
  { id:'flicker',   label:'SCINTILL.', icon:'✦' },
  { id:'crt',       label:'CRT',       icon:'⊡' },
];

// Animations d'entrée du nom
const ANIM_ENTER = [
  { id:'none',    label:'AUCUNE',   icon:'—' },
  { id:'fade',    label:'FONDU',    icon:'◐' },
  { id:'slide',   label:'GLISSE',   icon:'→' },
  { id:'zoom',    label:'ZOOM',     icon:'⊕' },
  { id:'typewriter', label:'DACTYLO', icon:'|' },
  { id:'wave',    label:'VAGUE',    icon:'〜' },
];

// Formes du CTA
const CTA_SHAPES = [
  { id:'clip',  label:'BISEAUTÉ',  icon:'◇' },
  { id:'round', label:'ARRONDI',   icon:'○' },
  { id:'square',label:'CARRÉ',     icon:'□' },
  { id:'pill',  label:'PILULE',    icon:'⬭' },
];

// ─────────────────────────────────────────────────────────────────
//  DONNÉES DÉMO
// ─────────────────────────────────────────────────────────────────
const DEMO_LIVE = {
  id:'live-1', emetteur_name:'NIKE GLOBAL', emetteur_slogan:'Just Do It.',
  primary_color:'#E8A020', background_color:'#06040A',
  call_to_action:'Voir la collection', cta_url:'#',
  duration_seconds:30, started_at:new Date(Date.now()-8000).toISOString(),
};
const DEMO_QUEUE = [
  { id:'q1', emetteur_name:'Studio Parallax', duration_seconds:60,  primary_color:'#8060C8' },
  { id:'q2', emetteur_name:'OpenAI',           duration_seconds:5,   primary_color:'#00C8E4' },
  { id:'q3', emetteur_name:'Vercel',            duration_seconds:120, primary_color:'#DDE6F2' },
  { id:'q4', emetteur_name:'Indie Records',     duration_seconds:45,  primary_color:'#D02848' },
];
const DEMO_HISTORY = [
  { id:'h1', emetteur_name:'Tesla',   duration_seconds:60,  started_at:new Date(Date.now()-600000).toISOString(),  views_count:204, primary_color:'#D02848', slogan:'Drive the future' },
  { id:'h2', emetteur_name:'Figma',   duration_seconds:30,  started_at:new Date(Date.now()-800000).toISOString(),  views_count:89,  primary_color:'#F24E1E', slogan:'Design together' },
  { id:'h3', emetteur_name:'Stripe',  duration_seconds:90,  started_at:new Date(Date.now()-1200000).toISOString(), views_count:156, primary_color:'#635BFF', slogan:'Payments for internet' },
  { id:'h4', emetteur_name:'Vercel',  duration_seconds:3,   started_at:new Date(Date.now()-2000000).toISOString(), views_count:44,  primary_color:'#DDE6F2', slogan:null },
  { id:'h5', emetteur_name:'Spotify', duration_seconds:300, started_at:new Date(Date.now()-3600000).toISOString(), views_count:501, primary_color:'#1ED760', slogan:'Music for everyone' },
  { id:'h6', emetteur_name:'ADIDAS',  duration_seconds:1,   started_at:new Date(Date.now()-4200000).toISOString(), views_count:12,  primary_color:'#00C8E4', slogan:null },
  { id:'h7', emetteur_name:'Notion',  duration_seconds:120, started_at:new Date(Date.now()-7200000).toISOString(), views_count:220, primary_color:'#ffffff', slogan:'One tool for everything' },
  { id:'h8', emetteur_name:'Linear',  duration_seconds:45,  started_at:new Date(Date.now()-10000000).toISOString(),views_count:98,  primary_color:'#5E6AD2', slogan:null },
];

// ─────────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────────
const fmt = {
  dur: s => {
    if (s<1)    return '0s';
    if (s<60)   return s+'s';
    if (s<3600) return Math.floor(s/60)+'min'+(s%60?' '+s%60+'s':'');
    return Math.floor(s/3600)+'h'+(Math.floor((s%3600)/60)?' '+Math.floor((s%3600)/60)+'min':'');
  },
  eur: s => {
    const v = s*PRICE;
    if (v===0) return '0 EUR';
    return v.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0});
  },
  ago: iso => {
    const d = Math.floor((Date.now()-new Date(iso))/1000);
    if (d<60)    return d+'s';
    if (d<3600)  return Math.floor(d/60)+'min';
    if (d<86400) return Math.floor(d/3600)+'h';
    return Math.floor(d/86400)+'j';
  },
  date: iso => new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),
};

// ─────────────────────────────────────────────────────────────────
//  SVG PATTERNS
// ─────────────────────────────────────────────────────────────────
function BgPattern({ type, color, opacity=0.06 }) {
  const id = 'pat_'+type;
  const patterns = {
    grid: (
      <pattern id={id} width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke={color} strokeWidth="0.6"/>
      </pattern>
    ),
    dots: (
      <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="12" r="1.2" fill={color}/>
      </pattern>
    ),
    lines: (
      <pattern id={id} width="1" height="8" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="4" stroke={color} strokeWidth="0.5"/>
      </pattern>
    ),
    diagonal: (
      <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M-5,5 l10,-10 M0,20 l20,-20 M15,25 l10,-10" stroke={color} strokeWidth="0.7"/>
      </pattern>
    ),
    hexagon: (
      <pattern id={id} width="52" height="30" patternUnits="userSpaceOnUse">
        <polygon points="26,2 50,16 50,28 26,42 2,28 2,16" fill="none" stroke={color} strokeWidth="0.5" transform="translate(0,-6)"/>
        <polygon points="26,2 50,16 50,28 26,42 2,28 2,16" fill="none" stroke={color} strokeWidth="0.5" transform="translate(26,9)"/>
      </pattern>
    ),
  };
  if (type==='none' || !patterns[type]) return null;
  return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity,pointerEvents:'none'}}>
      <defs>{patterns[type]}</defs>
      <rect width="100%" height="100%" fill={`url(#${id})`}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
//  OVERLAYS
// ─────────────────────────────────────────────────────────────────
function OverlayFx({ type, color }) {
  if (type==='none') return null;
  if (type==='scanlines') return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10,
      background:'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 4px)',
    }}/>
  );
  if (type==='noise') return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:10,opacity:.04}}>
      <filter id="noise_f"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3"/><feColorMatrix type="saturate" values="0"/></filter>
      <rect width="100%" height="100%" filter="url(#noise_f)"/>
    </svg>
  );
  if (type==='vignette') return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10,
      background:'radial-gradient(ellipse 75% 65% at 50% 50%, transparent 50%, rgba(0,0,0,0.65) 100%)',
    }}/>
  );
  if (type==='flicker') return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10,
      animation:'flicker 0.15s infinite', background:'transparent',
    }}/>
  );
  if (type==='crt') return (<>
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10,
      background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 3px)',
      mixBlendMode:'multiply',
    }}/>
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:11,
      background:'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
      animation:'crtScan 8s linear infinite',
    }}/>
  </>);
  return null;
}

// ─────────────────────────────────────────────────────────────────
//  TEXTE avec effets
// ─────────────────────────────────────────────────────────────────
function EffectText({ text, effect, color, size, weight=900, family, style={} }) {
  const base = {
    fontSize: size, fontWeight: weight, fontFamily: family||F.ui,
    letterSpacing:'-0.02em', lineHeight:0.9,
    transition:'all 0.4s',
  };

  if (effect==='glow') return (
    <div style={{ ...base, color:'#fff',
      textShadow:`0 0 30px ${color}cc, 0 0 80px ${color}80, 0 0 160px ${color}40`,
      ...style,
    }}>{text}</div>
  );
  if (effect==='outline') return (
    <div style={{ ...base, color:'transparent',
      WebkitTextStroke:`2px ${color}`,
      textShadow:`4px 4px 0 ${color}22`,
      ...style,
    }}>{text}</div>
  );
  if (effect==='gradient') return (
    <div style={{ ...base,
      background:`linear-gradient(135deg, ${color} 0%, #ffffff 50%, ${color} 100%)`,
      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
      backgroundClip:'text',
      ...style,
    }}>{text}</div>
  );
  if (effect==='shadow') return (
    <div style={{ ...base, color:'#fff',
      textShadow:`6px 6px 0 ${color}cc, 12px 12px 0 ${color}44`,
      ...style,
    }}>{text}</div>
  );
  if (effect==='glitch') return (
    <div style={{ position:'relative', display:'inline-block', ...style }}>
      <div style={{ ...base, color:'#fff', position:'relative', zIndex:2 }}>{text}</div>
      <div style={{ ...base, color:color, position:'absolute', inset:0, animation:'glitchR 2.5s infinite', clipPath:'polygon(0 30%,100% 30%,100% 55%,0 55%)' }}>{text}</div>
      <div style={{ ...base, color:'#0ff', position:'absolute', inset:0, animation:'glitchB 2s infinite 0.3s', clipPath:'polygon(0 65%,100% 65%,100% 80%,0 80%)' }}>{text}</div>
    </div>
  );
  if (effect==='neon') return (
    <div style={{ ...base, color:color,
      textShadow:`0 0 7px ${color}, 0 0 10px ${color}, 0 0 21px ${color}, 0 0 42px ${color}bb, 0 0 82px ${color}88`,
      animation:'neonPulse 2.5s ease-in-out infinite',
      ...style,
    }}>{text}</div>
  );
  // default / none
  return (
    <div style={{ ...base, color:'#fff',
      textShadow:`0 0 60px ${color}50`,
      ...style,
    }}>{text}</div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  CTA BUTTON SHAPES
// ─────────────────────────────────────────────────────────────────
function CtaButton({ text, color, shape }) {
  const shapes = {
    clip:   { clipPath:CLP },
    round:  { borderRadius:0 },
    square: { borderRadius:0 },
    pill:   { borderRadius:100 },
  };
  return (
    <div style={{
      display:'inline-block', background:color, color:DS.void,
      fontFamily:F.mono, fontSize:'clamp(.75rem,1.3vw,.9rem)',
      fontWeight:800, letterSpacing:'.16em',
      padding:'12px 28px',
      ...shapes[shape||'clip'],
    }}>
      {text} →
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COMPOSANTS ATOMIQUES
// ─────────────────────────────────────────────────────────────────
function Btn({ children, onClick, col, outline, sm, disabled, style={} }) {
  const c = col||DS.cyan;
  const [hov,setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:outline?(hov&&!disabled?c+'18':'transparent'):(disabled?'rgba(60,80,100,.15)':hov?c+'ee':c+'cc'),
        border:`1px solid ${disabled?DS.textLo:hov&&!disabled?c:c+'70'}`,
        color:disabled?DS.textLo:outline?(hov?c:DS.textMid):DS.void,
        fontFamily:F.mono, fontSize:sm?9:10, fontWeight:700, letterSpacing:'.12em',
        padding:sm?'5px 12px':'9px 18px', cursor:disabled?'default':'pointer',
        clipPath:CLP_S, transition:'all .15s', outline:'none',
        display:'flex', alignItems:'center', justifyContent:'center', gap:6, ...style,
      }}>{children}</button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
        <div style={{ fontFamily:F.mono, fontSize:7.5, color:DS.textLo, letterSpacing:'.18em', textTransform:'uppercase' }}>{label}</div>
        {hint && <div style={{ fontFamily:F.mono, fontSize:7, color:DS.textLo+'88', letterSpacing:'.08em' }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

const INP = {
  width:'100%', boxSizing:'border-box',
  background:'rgba(0,8,24,.95)', border:`1px solid rgba(0,210,240,.09)`,
  color:DS.textHi, fontFamily:F.mono, fontSize:11, letterSpacing:'.04em',
  padding:'8px 11px', outline:'none', clipPath:CLP_S, transition:'border-color .15s',
};

function Scan({ col }) {
  return <div style={{ height:1, background:`linear-gradient(90deg,transparent,${col||DS.cyan}22,transparent)`, margin:'14px 0' }}/>;
}

function PriceBadge({ style={} }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      background:`linear-gradient(135deg,${DS.gold}22 0%,${DS.gold}08 100%)`,
      border:`1px solid ${DS.gold}60`, clipPath:CLP_S, padding:'6px 14px', ...style,
    }}>
      <span style={{ color:DS.gold, fontFamily:F.mono, fontSize:20, fontWeight:900, lineHeight:1 }}>1€</span>
      <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
        <span style={{ color:DS.gold, fontFamily:F.mono, fontSize:7, fontWeight:700, letterSpacing:'.14em' }}>PAR</span>
        <span style={{ color:DS.gold, fontFamily:F.mono, fontSize:7, fontWeight:700, letterSpacing:'.14em' }}>SECONDE</span>
      </div>
    </div>
  );
}

function DurPill({ s, active, onClick }) {
  const [hov,setHov] = useState(false);
  const eur = s*PRICE;
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:active?DS.gold+'1a':hov?DS.brd:'transparent',
        border:`1px solid ${active?DS.gold+'80':hov?DS.brd:'rgba(0,200,240,.06)'}`,
        color:active?DS.gold:hov?DS.textMid:DS.textLo,
        fontFamily:F.mono, fontSize:8, letterSpacing:'.06em',
        padding:'5px 8px', cursor:'pointer', clipPath:CLP_S,
        transition:'all .12s', textAlign:'center', lineHeight:1.55, minWidth:44,
      }}>
      <div style={{ fontWeight:700 }}>{fmt.dur(s)}</div>
      <div style={{ fontSize:7.5, color:active?DS.gold:DS.textLo }}>
        {eur<1?eur.toFixed(2).replace('.',',')+'\u20ac':eur+'\u20ac'}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SÉLECTEUR D'OPTION GRAPHIQUE
// ─────────────────────────────────────────────────────────────────
function OptionPicker({ label, options, value, onChange, col }) {
  const c = col||DS.cyan;
  return (
    <Field label={label}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
        {options.map(o => {
          const active = value===o.id;
          const [hov,setHov] = useState(false);
          return (
            <button key={o.id} onClick={()=>onChange(o.id)}
              onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
              title={o.label}
              style={{
                background:active?c+'18':hov?'rgba(255,255,255,.04)':'transparent',
                border:`1px solid ${active?c+'70':hov?c+'30':'rgba(0,200,240,.07)'}`,
                color:active?c:DS.textLo,
                fontFamily:F.mono, fontSize:8, letterSpacing:'.06em',
                padding:'4px 7px', cursor:'pointer', clipPath:CLP_S,
                transition:'all .1s', display:'flex', flexDirection:'column',
                alignItems:'center', gap:2, minWidth:38,
              }}>
              <span style={{ fontSize:10 }}>{o.icon}</span>
              <span style={{ fontSize:6, letterSpacing:'.10em' }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TOPBAR
// ─────────────────────────────────────────────────────────────────
function TopBar({ view, setView }) {
  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100,
      background:'rgba(1,2,10,.97)', borderBottom:`1px solid ${DS.brd}`,
      backdropFilter:'blur(16px)', display:'flex', alignItems:'center',
      padding:'0 16px', height:44, gap:0,
    }}>
      <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8, marginRight:20 }}>
        <span style={{ color:DS.gold, fontSize:14 }}>◈</span>
        <div>
          <div style={{ color:DS.textHi, fontFamily:F.mono, fontSize:8, fontWeight:700, letterSpacing:'.18em', lineHeight:1 }}>ADS·MOST·FAIR</div>
          <div style={{ color:DS.textLo, fontFamily:F.mono, fontSize:5.5, letterSpacing:'.14em' }}>GALACTIC·ADV·GRID</div>
        </div>
      </Link>
      <div style={{ width:1, height:22, background:DS.brd, marginRight:16 }}/>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginRight:16 }}>
        <span style={{ color:DS.gold, fontSize:10 }}>⚡</span>
        <span style={{ fontFamily:F.mono, fontSize:9, color:DS.gold, fontWeight:700, letterSpacing:'.18em' }}>LE·CAPTEUR</span>
        <span style={{ fontFamily:F.mono, fontSize:6.5, color:DS.void, background:DS.gold, padding:'1px 5px', letterSpacing:'.10em', fontWeight:700 }}>LIVE</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, background:DS.gold+'10', border:`1px solid ${DS.gold}30`, clipPath:CLP_S, padding:'2px 8px', marginRight:16 }}>
        <span style={{ color:DS.gold, fontFamily:F.mono, fontSize:10, fontWeight:900 }}>1€</span>
        <span style={{ color:DS.gold+'90', fontFamily:F.mono, fontSize:6.5, letterSpacing:'.12em' }}>/SEC</span>
      </div>
      <div style={{ display:'flex', gap:2, flex:1 }}>
        {[
          { id:'panel',   label:'PANNEAU',    icon:'◉' },
          { id:'book',    label:'PROMOUVOIR', icon:'◈' },
          { id:'history', label:'HISTORIQUE', icon:'◆' },
        ].map(t => (
          <button key={t.id} onClick={()=>setView(t.id)} style={{
            background:view===t.id?DS.cyan+'14':'transparent',
            border:'none', borderBottom:`2px solid ${view===t.id?DS.cyan:'transparent'}`,
            color:view===t.id?DS.cyan:DS.textLo,
            fontFamily:F.mono, fontSize:8, fontWeight:700, letterSpacing:'.12em',
            padding:'0 12px', height:44, cursor:'pointer', transition:'all .12s',
            display:'flex', alignItems:'center', gap:5,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <Link href="/" style={{ textDecoration:'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:F.mono, fontSize:8, color:DS.textLo, letterSpacing:'.10em', padding:'4px 10px', border:`1px solid ${DS.brd}`, clipPath:CLP_S, transition:'all .12s' }}
          onMouseEnter={e=>{e.currentTarget.style.color=DS.cyan;e.currentTarget.style.borderColor=DS.cyan+'50';}}
          onMouseLeave={e=>{e.currentTarget.style.color=DS.textLo;e.currentTarget.style.borderColor=DS.brd;}}>
          ← SPHÈRE
        </div>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PANEL VIEW
// ─────────────────────────────────────────────────────────────────
function PanelView({ live, queue, elapsed, progress, remaining, onPromote }) {
  const col = live?.primary_color||DS.cyan;
  const bg  = live?.background_color||DS.void;
  return (
    <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:bg, transition:'background 1.2s' }}>
      <BgPattern type="grid" color={col}/>
      <OverlayFx type="vignette"/>
      {live ? <>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:`radial-gradient(ellipse 65% 55% at 50% 48%,${col}20,transparent 68%)` }}/>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'5vw', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'3vh', background:col+'14', border:`1px solid ${col}50`, clipPath:CLP_S, padding:'5px 14px', fontFamily:F.mono, fontSize:9, color:col, letterSpacing:'.18em' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:col, boxShadow:`0 0 8px ${col}`, animation:'lp 1.2s ease-in-out infinite', display:'inline-block' }}/>
            ÉCLAT·ACTIF · {remaining}s
          </div>
          <EffectText text={live.emetteur_name} effect="glow" color={col} size="clamp(2.8rem,9vw,7.5rem)" style={{ textAlign:'center' }}/>
          {live.emetteur_slogan && <div style={{ marginTop:'2.5vh', fontSize:'clamp(.9rem,2vw,1.5rem)', fontFamily:F.mono, color:DS.textMid, letterSpacing:'.08em', textAlign:'center' }}>{live.emetteur_slogan}</div>}
          {live.call_to_action && <div style={{ marginTop:'4vh' }}><CtaButton text={live.call_to_action} color={col} shape="clip"/></div>}
        </div>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,.06)' }}>
          <div style={{ height:'100%', width:progress+'%', background:col, boxShadow:`0 0 12px ${col}`, transition:'width 1s linear' }}/>
        </div>
        <div style={{ position:'absolute', bottom:14, right:20, fontFamily:F.mono, fontSize:10, color:col+'80', letterSpacing:'.10em' }}>
          {remaining}s · {fmt.eur(live.duration_seconds)}
        </div>
        {[[{top:16,left:16},{borderTop:`1px solid ${col}60`,borderLeft:`1px solid ${col}60`}],[{top:16,right:16},{borderTop:`1px solid ${col}60`,borderRight:`1px solid ${col}60`}],[{bottom:18,left:16},{borderBottom:`1px solid ${col}60`,borderLeft:`1px solid ${col}60`}],[{bottom:18,right:16},{borderBottom:`1px solid ${col}60`,borderRight:`1px solid ${col}60`}]].map(([p,b],i)=><div key={i} style={{ position:'absolute', width:20, height:20, ...p, ...b, pointerEvents:'none' }}/>)}
      </> : (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'2vh' }}>
          <div style={{ fontSize:'clamp(3rem,10vw,8rem)', color:DS.cyan+'18', lineHeight:1 }}>◈</div>
          <div style={{ fontFamily:F.mono, fontSize:'clamp(.75rem,1.5vw,.95rem)', color:DS.textLo, letterSpacing:'.3em' }}>CAPTEUR·EN·VEILLE</div>
          <div style={{ marginTop:'2vh', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <div style={{ fontFamily:F.mono, fontSize:9, color:DS.textMid, letterSpacing:'.14em', textAlign:'center' }}>Le panneau est libre — promouvez votre contenu maintenant</div>
            <button onClick={onPromote} style={{ background:DS.gold+'cc', color:DS.void, border:`1px solid ${DS.gold}`, fontFamily:F.mono, fontSize:11, fontWeight:800, letterSpacing:'.18em', padding:'11px 28px', cursor:'pointer', clipPath:CLP_S, transition:'all .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=DS.gold}
              onMouseLeave={e=>e.currentTarget.style.background=DS.gold+'cc'}>
              ◈ PROMOUVOIR · 1€/s
            </button>
          </div>
        </div>
      )}
      <div style={{ position:'absolute', bottom:live?24:14, left:0, right:0, display:'flex', gap:6, padding:'0 16px', overflowX:'auto', scrollbarWidth:'none', alignItems:'center', justifyContent:'center' }}>
        {queue.length>0?queue.map((item,i)=>(
          <div key={item.id} style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0, background:'rgba(1,4,14,.88)', backdropFilter:'blur(8px)', border:`1px solid ${i===0?(item.primary_color||DS.cyan)+'60':DS.brd}`, clipPath:CLP_S, padding:'4px 10px' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:item.primary_color||DS.cyan }}/>
            <span style={{ fontFamily:F.mono, fontSize:8, color:i===0?DS.textHi:DS.textMid, letterSpacing:'.04em', whiteSpace:'nowrap' }}>{item.emetteur_name}</span>
            <span style={{ fontFamily:F.mono, fontSize:7.5, color:DS.textLo }}>{fmt.dur(item.duration_seconds)}</span>
          </div>
        )):<div style={{ fontFamily:F.mono, fontSize:8, color:DS.textLo, letterSpacing:'.14em' }}>FLUX VIDE · PROCHAIN ÉCLAT IMMÉDIAT</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  BOOK VIEW — avec panneau effets graphiques complet
// ─────────────────────────────────────────────────────────────────
function BookView({ queue, remaining, onDone }) {
  const [name,setName]       = useState('');
  const [slogan,setSlogan]   = useState('');
  const [dur,setDur]         = useState(30);
  const [color,setColor]     = useState(DS.cyan);
  const [color2,setColor2]   = useState('#8060C8');  // 2e couleur pour dégradé
  const [bg,setBg]           = useState(DS.void);
  const [cta,setCta]         = useState('');
  const [ctaUrl,setCtaUrl]   = useState('');
  const [sub,setSub]         = useState(false);

  // Effets graphiques
  const [bgPattern, setBgPattern]   = useState('grid');
  const [textEffect, setTextEffect] = useState('glow');
  const [overlay, setOverlay]       = useState('vignette');
  const [animEnter, setAnimEnter]   = useState('none');
  const [ctaShape, setCtaShape]     = useState('clip');
  const [glowInt, setGlowInt]       = useState(60);     // intensité glow 0-100
  const [patternScale, setPatternScale] = useState(50); // échelle pattern 10-100
  const [gradAngle, setGradAngle]   = useState(135);    // angle dégradé fond
  const [useGradBg, setUseGradBg]   = useState(false);  // fond uni vs dégradé
  const [fontSize, setFontSize]     = useState(70);     // taille texte % de clamp
  const [fontFamily, setFontFamily] = useState('ui');   // ui | mono
  const [letterSpacing, setLetterSpacing] = useState(-2); // -5 à 10
  const [sloganOpacity, setSloganOpacity] = useState(70);
  const [ctaGlow, setCtaGlow]       = useState(false);
  const [showGrid, setShowGrid]     = useState(true);
  const [activeTab, setActiveTab]   = useState('identity'); // identity | bg | text | effects | cta

  const totalWait = queue.reduce((a,b)=>a+(b.duration_seconds||0),0)+(remaining||0);
  const PRESETS = [1,5,10,30,60,120,300,600,1800,3600];

  const durLabel = useMemo(()=>{
    if(dur<60) return `${dur} seconde${dur>1?'s':''}`;
    if(dur<3600) return `${Math.floor(dur/60)} min${dur%60?' '+dur%60+'s':''}`;
    return `${Math.floor(dur/3600)}h${Math.floor((dur%3600)/60)?' '+Math.floor((dur%3600)/60)+'min':''}`;
  },[dur]);

  const bgStyle = useGradBg
    ? `linear-gradient(${gradAngle}deg, ${bg}, ${color}30)`
    : bg;

  const fontFam = fontFamily==='mono' ? F.mono : F.ui;

  const submit = async () => {
    setSub(true);
    const sb = getSupabaseClient();
    if(sb) {
      await sb.from('eclats').insert([{
        emetteur_name:name, emetteur_slogan:slogan||null,
        primary_color:color, background_color:bg,
        call_to_action:cta||null, cta_url:ctaUrl||null,
        duration_seconds:dur, content_type:'brand', content_text:name,
        status:'queued', paid:false,
      }]);
    }
    setSub(false);
    onDone({ name, dur, color });
  };

  const TABS = [
    { id:'identity', label:'IDENTITÉ', icon:'◈' },
    { id:'bg',       label:'FOND',     icon:'▣' },
    { id:'text',     label:'TEXTE',    icon:'T' },
    { id:'effects',  label:'EFFETS',   icon:'✦' },
    { id:'cta',      label:'CTA',      icon:'→' },
  ];

  return (
    <div style={{ display:'flex', height:'100%' }}>

      {/* ── APERÇU ── */}
      <div style={{
        flex:1, position:'relative', overflow:'hidden',
        background:bgStyle,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'background .5s',
      }}>
        {showGrid && <BgPattern type={bgPattern} color={color} opacity={0.04+(glowInt/100)*0.06}/>}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:`radial-gradient(ellipse 60% 50% at 50% 50%,${color}${Math.round(glowInt*.35).toString(16).padStart(2,'0')},transparent 70%)` }}/>
        <OverlayFx type={overlay} color={color}/>

        {/* Contenu central */}
        <div style={{ zIndex:5, textAlign:'center', padding:'8%', maxWidth:'88%',
          animation: animEnter!=='none' ? `anim_${animEnter} 0.8s ease forwards` : 'none',
        }}>
          <EffectText
            text={name||<span style={{opacity:.12}}>VOTRE NOM</span>}
            effect={textEffect}
            color={color}
            size={`clamp(1.8rem,${fontSize/10}vw,${(fontSize/10)*0.8}rem)`}
            family={fontFam}
            style={{ letterSpacing:`${letterSpacing/10}em`, marginBottom: slogan?'2vh':0 }}
          />
          {slogan && (
            <div style={{
              marginTop:'2vh', fontSize:'clamp(.8rem,1.5vw,1.1rem)',
              fontFamily:fontFam, color:DS.textMid,
              letterSpacing:'.06em', opacity:sloganOpacity/100,
            }}>{slogan}</div>
          )}
          {cta && (
            <div style={{
              marginTop:'3vh',
              filter: ctaGlow ? `drop-shadow(0 0 12px ${color}cc)` : 'none',
            }}>
              <CtaButton text={cta} color={color} shape={ctaShape}/>
            </div>
          )}
        </div>

        {/* Label aperçu */}
        <div style={{ position:'absolute', top:14, left:16, fontFamily:F.mono, fontSize:7.5, color:DS.textLo, letterSpacing:'.14em', background:'rgba(0,0,0,.5)', padding:'3px 8px', clipPath:CLP_S }}>APERÇU TEMPS RÉEL</div>

        {/* Barre bas */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:color+'60' }}/>

        {/* Corners */}
        {[[{top:34,left:10},{borderTop:`1px solid ${color}50`,borderLeft:`1px solid ${color}50`}],[{top:34,right:10},{borderTop:`1px solid ${color}50`,borderRight:`1px solid ${color}50`}],[{bottom:8,left:10},{borderBottom:`1px solid ${color}50`,borderLeft:`1px solid ${color}50`}],[{bottom:8,right:10},{borderBottom:`1px solid ${color}50`,borderRight:`1px solid ${color}50`}]].map(([p,b],i)=>(
          <div key={i} style={{ position:'absolute', width:16, height:16, ...p, ...b, pointerEvents:'none', zIndex:4 }}/>
        ))}
      </div>

      {/* ── PANNEAU DROITE ── */}
      <div style={{ width:360, background:DS.glass, borderLeft:`1px solid ${DS.brd}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'14px 18px 12px', borderBottom:`1px solid ${DS.brd}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ color:DS.gold, fontFamily:F.mono, fontSize:10, fontWeight:700, letterSpacing:'.22em', marginBottom:3 }}>◈ PROMOUVOIR</div>
              <div style={{ color:DS.textMid, fontFamily:F.mono, fontSize:8, letterSpacing:'.06em' }}>Diffusez votre marque sur le panneau en direct</div>
            </div>
            <PriceBadge/>
          </div>
          <div style={{ marginTop:10, background:`linear-gradient(135deg,${DS.gold}0c,transparent)`, border:`1px solid ${DS.gold}25`, clipPath:CLP_S, padding:'7px 11px', fontFamily:F.mono, fontSize:8, color:DS.textMid, lineHeight:1.8 }}>
            <span style={{ color:DS.gold }}>1 euro / seconde</span> — durée libre · de 1s à 1h
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{ display:'flex', borderBottom:`1px solid ${DS.brd}`, flexShrink:0, overflowX:'auto', scrollbarWidth:'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              flex:1, minWidth:58,
              background:activeTab===t.id?DS.cyan+'0e':'transparent',
              border:'none', borderBottom:`2px solid ${activeTab===t.id?DS.cyan:'transparent'}`,
              color:activeTab===t.id?DS.cyan:DS.textLo,
              fontFamily:F.mono, fontSize:7, fontWeight:700, letterSpacing:'.10em',
              padding:'8px 6px', cursor:'pointer', transition:'all .1s',
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            }}>
              <span style={{ fontSize:10 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* SCROLL BODY */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px', scrollbarWidth:'thin', scrollbarColor:`${DS.brd} transparent` }}>

          {/* ── TAB : IDENTITÉ ── */}
          {activeTab==='identity' && <>
            <Field label="Nom / Marque" hint="obligatoire">
              <input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="NIKE, STUDIO XYZ..." style={INP}
                onFocus={e=>e.target.style.borderColor=DS.gold+'60'} onBlur={e=>e.target.style.borderColor='rgba(0,210,240,.09)'}/>
            </Field>
            <Field label="Tagline" hint="optionnel">
              <input value={slogan} onChange={e=>setSlogan(e.target.value)} maxLength={60} placeholder="Just do it." style={INP}
                onFocus={e=>e.target.style.borderColor=DS.gold+'60'} onBlur={e=>e.target.style.borderColor='rgba(0,210,240,.09)'}/>
            </Field>
            <Scan col={DS.gold}/>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontFamily:F.mono, fontSize:7.5, color:DS.textLo, letterSpacing:'.18em', textTransform:'uppercase' }}>Durée</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, background:DS.gold+'14', border:`1px solid ${DS.gold}50`, clipPath:CLP_S, padding:'4px 10px' }}>
                  <span style={{ fontFamily:F.mono, fontSize:10, color:DS.textHi, fontWeight:700 }}>{durLabel}</span>
                  <span style={{ color:DS.textLo, fontFamily:F.mono, fontSize:9 }}>×</span>
                  <span style={{ fontFamily:F.mono, fontSize:10, color:DS.gold, fontWeight:900 }}>1€/s</span>
                  <span style={{ color:DS.textLo, fontFamily:F.mono, fontSize:9 }}>=</span>
                  <span style={{ fontFamily:F.mono, fontSize:14, color:DS.gold, fontWeight:900 }}>{fmt.eur(dur)}</span>
                </div>
              </div>
              <input type="range" min={1} max={3600} step={1} value={dur} onChange={e=>setDur(+e.target.value)} style={{ width:'100%', accentColor:DS.gold, cursor:'pointer', marginBottom:6 }}/>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {PRESETS.map(s=><DurPill key={s} s={s} active={dur===s} onClick={()=>setDur(s)}/>)}
              </div>
            </div>
            {queue.length>0 && (
              <div style={{ background:'rgba(0,200,240,.04)', border:`1px solid ${DS.brd}`, clipPath:CLP_S, padding:'8px 11px', fontFamily:F.mono, fontSize:8, color:DS.textLo, lineHeight:1.9 }}>
                <div><span style={{ color:DS.cyan }}>{queue.length}</span> éclat{queue.length>1?'s':''} avant vous</div>
                <div>Attente · <span style={{ color:DS.textMid }}>{fmt.dur(totalWait)}</span></div>
              </div>
            )}
          </>}

          {/* ── TAB : FOND ── */}
          {activeTab==='bg' && <>
            <Field label="Couleur principale">
              <div style={{ display:'flex', gap:8 }}>
                {[{l:'COULEUR 1',v:color,s:setColor},{l:'COULEUR 2',v:color2,s:setColor2},{l:'FOND',v:bg,s:setBg}].map(c=>(
                  <label key={c.l} style={{ flex:1, cursor:'pointer' }}>
                    <div style={{ fontFamily:F.mono, fontSize:6.5, color:DS.textLo, letterSpacing:'.14em', marginBottom:4 }}>{c.l}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,8,24,.95)', border:`1px solid ${DS.brd}`, padding:'6px 8px', clipPath:CLP_S, position:'relative' }}>
                      <div style={{ width:14, height:14, background:c.v, clipPath:CLP_S, flexShrink:0 }}/>
                      <span style={{ fontFamily:F.mono, fontSize:7, color:DS.textLo }}>{c.v.slice(0,7).toUpperCase()}</span>
                      <input type="color" value={c.v} onChange={e=>c.s(e.target.value)} style={{ opacity:0, position:'absolute', inset:0, width:'100%', height:'100%', cursor:'pointer' }}/>
                    </div>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Type de fond">
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                {[{id:false,l:'UNI'},{id:true,l:'DÉGRADÉ'}].map(o=>(
                  <button key={String(o.id)} onClick={()=>setUseGradBg(o.id)} style={{
                    flex:1, background:useGradBg===o.id?DS.cyan+'14':'transparent',
                    border:`1px solid ${useGradBg===o.id?DS.cyan+'60':DS.brd}`,
                    color:useGradBg===o.id?DS.cyan:DS.textLo,
                    fontFamily:F.mono, fontSize:8, fontWeight:700, letterSpacing:'.10em',
                    padding:'6px', cursor:'pointer', clipPath:CLP_S, transition:'all .1s',
                  }}>{o.l}</button>
                ))}
              </div>
              {useGradBg && (
                <div>
                  <div style={{ fontFamily:F.mono, fontSize:7, color:DS.textLo, letterSpacing:'.14em', marginBottom:4 }}>ANGLE · {gradAngle}°</div>
                  <input type="range" min={0} max={360} step={5} value={gradAngle} onChange={e=>setGradAngle(+e.target.value)} style={{ width:'100%', accentColor:DS.cyan, cursor:'pointer' }}/>
                </div>
              )}
            </Field>
            <OptionPicker label="Pattern de fond" options={BG_PATTERNS} value={bgPattern} onChange={setBgPattern} col={DS.cyan}/>
            <Field label={`Opacité pattern · ${Math.round(4+(glowInt/100)*6)}%`}>
              <input type="range" min={0} max={100} value={glowInt} onChange={e=>setGlowInt(+e.target.value)} style={{ width:'100%', accentColor:DS.cyan, cursor:'pointer' }}/>
            </Field>
            <Field label="Afficher le pattern">
              <button onClick={()=>setShowGrid(v=>!v)} style={{
                background:showGrid?DS.cyan+'14':'transparent', border:`1px solid ${showGrid?DS.cyan+'60':DS.brd}`,
                color:showGrid?DS.cyan:DS.textLo, fontFamily:F.mono, fontSize:8, fontWeight:700,
                letterSpacing:'.10em', padding:'6px 14px', cursor:'pointer', clipPath:CLP_S, transition:'all .1s',
              }}>{showGrid?'◉ VISIBLE':'○ CACHÉ'}</button>
            </Field>
          </>}

          {/* ── TAB : TEXTE ── */}
          {activeTab==='text' && <>
            <OptionPicker label="Effet sur le nom" options={TEXT_EFFECTS} value={textEffect} onChange={setTextEffect} col={DS.gold}/>
            <Scan col={DS.gold}/>
            <Field label={`Taille du texte · ${fontSize}%`}>
              <input type="range" min={30} max={100} value={fontSize} onChange={e=>setFontSize(+e.target.value)} style={{ width:'100%', accentColor:DS.gold, cursor:'pointer' }}/>
            </Field>
            <Field label={`Espacement · ${letterSpacing/10 > 0 ? '+':''}{(letterSpacing/10).toFixed(1)}em`}>
              <input type="range" min={-50} max={100} value={letterSpacing} onChange={e=>setLetterSpacing(+e.target.value)} style={{ width:'100%', accentColor:DS.gold, cursor:'pointer' }}/>
            </Field>
            <Field label="Police">
              <div style={{ display:'flex', gap:6 }}>
                {[{id:'ui',l:'RAJDHANI',eg:'AaBb'},{id:'mono',l:'JETBRAINS',eg:'Aa'}].map(o=>(
                  <button key={o.id} onClick={()=>setFontFamily(o.id)} style={{
                    flex:1, background:fontFamily===o.id?DS.gold+'14':'transparent',
                    border:`1px solid ${fontFamily===o.id?DS.gold+'60':DS.brd}`,
                    color:fontFamily===o.id?DS.gold:DS.textLo,
                    fontFamily:o.id==='mono'?F.mono:F.ui, fontSize:10, fontWeight:700,
                    letterSpacing:'.06em', padding:'8px', cursor:'pointer', clipPath:CLP_S, transition:'all .1s',
                    display:'flex', flexDirection:'column', gap:2, alignItems:'center',
                  }}>
                    <span>{o.eg}</span>
                    <span style={{ fontFamily:F.mono, fontSize:7, letterSpacing:'.12em' }}>{o.l}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label={`Opacité tagline · ${sloganOpacity}%`}>
              <input type="range" min={10} max={100} value={sloganOpacity} onChange={e=>setSloganOpacity(+e.target.value)} style={{ width:'100%', accentColor:DS.cyan, cursor:'pointer' }}/>
            </Field>
          </>}

          {/* ── TAB : EFFETS ── */}
          {activeTab==='effects' && <>
            <OptionPicker label="Overlay d'ambiance" options={OVERLAYS} value={overlay} onChange={setOverlay} col={DS.violet}/>
            <Scan col={DS.violet}/>
            <OptionPicker label="Animation d'entrée" options={ANIM_ENTER} value={animEnter} onChange={v=>{setAnimEnter('none');setTimeout(()=>setAnimEnter(v),50);}} col={DS.violet}/>
            <Scan col={DS.violet}/>
            <Field label={`Intensité lumineuse · ${glowInt}%`}>
              <input type="range" min={0} max={100} value={glowInt} onChange={e=>setGlowInt(+e.target.value)} style={{ width:'100%', accentColor:DS.violet, cursor:'pointer' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontFamily:F.mono, fontSize:7, color:DS.textLo }}>
                <span>DISCRET</span><span>INTENSE</span>
              </div>
            </Field>
            {/* Preview miniature des overlays */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
              {OVERLAYS.map(o=>(
                <button key={o.id} onClick={()=>setOverlay(o.id)} style={{
                  width:48, height:32, position:'relative', overflow:'hidden',
                  background:DS.void, border:`1px solid ${overlay===o.id?DS.violet+'80':DS.brd}`,
                  cursor:'pointer', clipPath:CLP_S, flexShrink:0,
                }}>
                  <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg,${DS.violet}20,${DS.cyan}10)` }}/>
                  {o.id==='scanlines' && <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.2) 4px)' }}/>}
                  {o.id==='vignette' && <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 50% at 50% 50%,transparent,rgba(0,0,0,.7))' }}/>}
                  {o.id==='noise' && <div style={{ position:'absolute', inset:0, opacity:.3, backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize:'40px 40px' }}/>}
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F.mono, fontSize:9, color:overlay===o.id?DS.violet:DS.textLo }}>
                    {o.icon}
                  </div>
                </button>
              ))}
            </div>
          </>}

          {/* ── TAB : CTA ── */}
          {activeTab==='cta' && <>
            <Field label="Texte du bouton">
              <input value={cta} onChange={e=>setCta(e.target.value)} maxLength={30} placeholder="Voir le site" style={INP}
                onFocus={e=>e.target.style.borderColor=DS.gold+'60'} onBlur={e=>e.target.style.borderColor='rgba(0,210,240,.09)'}/>
            </Field>
            <Field label="URL de destination">
              <input value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)} placeholder="https://..." style={INP}
                onFocus={e=>e.target.style.borderColor=DS.gold+'60'} onBlur={e=>e.target.style.borderColor='rgba(0,210,240,.09)'}/>
            </Field>
            <Scan col={DS.gold}/>
            <OptionPicker label="Forme du bouton" options={CTA_SHAPES} value={ctaShape} onChange={setCtaShape} col={DS.gold}/>
            <Scan col={DS.gold}/>
            <Field label="Effet lueur CTA">
              <button onClick={()=>setCtaGlow(v=>!v)} style={{
                background:ctaGlow?DS.gold+'14':'transparent', border:`1px solid ${ctaGlow?DS.gold+'60':DS.brd}`,
                color:ctaGlow?DS.gold:DS.textLo, fontFamily:F.mono, fontSize:8, fontWeight:700,
                letterSpacing:'.10em', padding:'6px 14px', cursor:'pointer', clipPath:CLP_S, transition:'all .1s',
              }}>{ctaGlow?'✦ LUEUR ACTIVE':'○ LUEUR INACTIVE'}</button>
            </Field>
            {/* Preview CTA */}
            {cta && (
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontFamily:F.mono, fontSize:7, color:DS.textLo, letterSpacing:'.14em' }}>APERÇU FORMES</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {CTA_SHAPES.map(s=>(
                    <div key={s.id} onClick={()=>setCtaShape(s.id)} style={{
                      cursor:'pointer', opacity:ctaShape===s.id?1:.45, transition:'opacity .15s',
                      filter: ctaShape===s.id?`drop-shadow(0 0 6px ${color}80)`:'none',
                    }}>
                      <CtaButton text={cta} color={color} shape={s.id}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}
        </div>

        {/* Footer CTA */}
        <div style={{ padding:'12px 18px 16px', borderTop:`1px solid ${DS.brd}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontFamily:F.mono, fontSize:8, color:DS.textMid, letterSpacing:'.06em' }}>
            <span>{durLabel}</span>
            <span style={{ color:DS.gold, fontWeight:700, fontSize:13 }}>{fmt.eur(dur)}</span>
          </div>
          <Btn onClick={submit} disabled={!name||sub} col={DS.gold} style={{ width:'100%', fontSize:11, padding:'13px', letterSpacing:'.16em' }}>
            {sub?'⚙ TRAITEMENT...': <>◈ LANCER MON ÉCLAT · {fmt.eur(dur)}</>}
          </Btn>
          <div style={{ marginTop:8, fontFamily:F.mono, fontSize:7, color:DS.textLo, letterSpacing:'.08em', textAlign:'center' }}>
            Paiement sécurisé via Stripe · Aucun abonnement
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HISTORY VIEW
// ─────────────────────────────────────────────────────────────────
function HistoryRow({ item, onPromote }) {
  const [exp,setExp] = useState(false);
  const [hov,setHov] = useState(false);
  const col = item.primary_color||DS.cyan;
  return (
    <>
      <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>setExp(v=>!v)}
        style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 70px 60px 44px', padding:'10px 24px', borderBottom:`1px solid rgba(0,200,240,.04)`, background:exp?'rgba(0,200,240,.05)':hov?'rgba(0,200,240,.03)':'transparent', transition:'background .1s', cursor:'pointer', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:3, height:24, background:col, flexShrink:0, borderRadius:1 }}/>
          <div>
            <div style={{ fontFamily:F.ui, fontSize:13, fontWeight:700, color:DS.textHi, letterSpacing:'.03em' }}>{item.emetteur_name}</div>
            {item.slogan && <div style={{ fontFamily:F.mono, fontSize:8, color:DS.textLo, letterSpacing:'.04em', marginTop:2 }}>{item.slogan}</div>}
          </div>
        </div>
        <span style={{ fontFamily:F.mono, fontSize:10, color:DS.textMid }}>{fmt.dur(item.duration_seconds)}</span>
        <span style={{ fontFamily:F.mono, fontSize:10, color:col, fontWeight:700 }}>{(item.duration_seconds*PRICE).toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0})}</span>
        <span style={{ fontFamily:F.mono, fontSize:10, color:DS.green }}>{(item.views_count||0).toLocaleString('fr-FR')}</span>
        <span style={{ fontFamily:F.mono, fontSize:10, color:DS.textLo }}>{fmt.ago(item.started_at)}</span>
        <span style={{ fontFamily:F.mono, fontSize:9, color:DS.textLo, textAlign:'right' }}>{exp?'▲':'▼'}</span>
      </div>
      {exp && (
        <div style={{ padding:'10px 24px 14px 52px', background:'rgba(0,200,240,.04)', borderBottom:`1px solid ${DS.brd}`, display:'flex', alignItems:'center', gap:20, animation:'fadeIn .15s ease' }}>
          <div style={{ width:110, height:62, background:item.background_color||DS.void, border:`1px solid ${col}30`, clipPath:CLP_S, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 70% 60% at 50% 50%,${col}18,transparent)` }}/>
            <BgPattern type="dots" color={col} opacity={0.08}/>
            <span style={{ fontFamily:F.ui, fontSize:11, fontWeight:900, color:'#fff', textShadow:`0 0 20px ${col}60`, zIndex:1 }}>{item.emetteur_name}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,auto)', gap:'6px 22px' }}>
            {[
              {l:'DIFFUSÉ LE', v:fmt.date(item.started_at), c:DS.textMid},
              {l:'DURÉE', v:fmt.dur(item.duration_seconds), c:DS.textHi},
              {l:'VUES', v:(item.views_count||0).toLocaleString('fr-FR'), c:DS.green},
              {l:'COÛT', v:(item.duration_seconds*PRICE).toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0}), c:col},
              {l:'COULEUR', v:col.toUpperCase(), c:col},
            ].map(m=>(
              <div key={m.l}>
                <div style={{ fontFamily:F.mono, fontSize:6.5, color:DS.textLo, letterSpacing:'.16em', marginBottom:2 }}>{m.l}</div>
                <div style={{ fontFamily:F.mono, fontSize:10, color:m.c, fontWeight:600 }}>{m.v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginLeft:'auto' }}>
            <button onClick={()=>onPromote(item)} style={{ background:'transparent', border:`1px solid ${DS.gold}50`, color:DS.gold, fontFamily:F.mono, fontSize:7.5, fontWeight:700, letterSpacing:'.12em', padding:'5px 12px', cursor:'pointer', clipPath:CLP_S, transition:'all .15s', display:'flex', alignItems:'center', gap:5 }}
              onMouseEnter={e=>e.currentTarget.style.background=DS.gold+'14'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              ↺ REPROMOUVOIR
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function HistoryView({ history, onPromote }) {
  const [search,setSearch] = useState('');
  const [sort,setSort]     = useState('date');
  const totalSec   = history.reduce((a,b)=>a+(b.duration_seconds||0),0);
  const totalViews = history.reduce((a,b)=>a+(b.views_count||0),0);
  const uniq       = [...new Set(history.map(h=>h.emetteur_name))].length;
  const sorted = useMemo(()=>{
    let arr=[...history];
    if(search) arr=arr.filter(h=>h.emetteur_name.toLowerCase().includes(search.toLowerCase()));
    if(sort==='duration') arr.sort((a,b)=>b.duration_seconds-a.duration_seconds);
    else if(sort==='views') arr.sort((a,b)=>(b.views_count||0)-(a.views_count||0));
    else if(sort==='price') arr.sort((a,b)=>b.duration_seconds-a.duration_seconds);
    else arr.sort((a,b)=>new Date(b.started_at)-new Date(a.started_at));
    return arr;
  },[history,search,sort]);
  const top = useMemo(()=>{
    const map={};
    history.forEach(h=>{if(!map[h.emetteur_name])map[h.emetteur_name]={name:h.emetteur_name,dur:0,color:h.primary_color};map[h.emetteur_name].dur+=h.duration_seconds;});
    return Object.values(map).sort((a,b)=>b.dur-a.dur)[0];
  },[history]);
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'14px 24px', borderBottom:`1px solid ${DS.brd}`, background:DS.glass, display:'flex', gap:0, flexWrap:'wrap', flexShrink:0 }}>
        {[
          {l:'ÉCLATS',v:history.length,c:DS.cyan,sub:'DIFFUSIONS'},
          {l:'TEMPS',v:fmt.dur(totalSec),c:DS.gold,sub:'TOTAL'},
          {l:'VUES',v:totalViews.toLocaleString('fr-FR'),c:DS.green,sub:'CUMULÉES'},
          {l:'ÉMETTEURS',v:uniq,c:DS.violet,sub:'UNIQUES'},
          {l:'REVENUS',v:fmt.eur(totalSec),c:DS.gold,sub:'GÉNÉRÉS'},
        ].map((s,i)=>(
          <div key={s.l} style={{ flex:1, minWidth:100, padding:'6px 16px', borderRight:i<4?`1px solid ${DS.brd}`:'none' }}>
            <div style={{ fontFamily:F.mono, fontSize:6.5, color:DS.textLo, letterSpacing:'.18em', marginBottom:3 }}>{s.l}</div>
            <div style={{ fontFamily:F.mono, fontSize:18, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
            <div style={{ fontFamily:F.mono, fontSize:6, color:DS.textLo+'80', letterSpacing:'.14em', marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'8px 24px', borderBottom:`1px solid ${DS.brd}`, background:'rgba(0,4,14,.60)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{ position:'relative', flex:1, maxWidth:240 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontFamily:F.mono, fontSize:9, color:DS.textLo, pointerEvents:'none' }}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...INP, paddingLeft:26, fontSize:9, height:30, padding:'0 10px 0 26px' }}
            onFocus={e=>e.target.style.borderColor=DS.cyan+'60'} onBlur={e=>e.target.style.borderColor='rgba(0,210,240,.09)'}/>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <span style={{ fontFamily:F.mono, fontSize:7, color:DS.textLo, letterSpacing:'.14em', alignSelf:'center' }}>TRIER</span>
          {[{id:'date',l:'DATE'},{id:'duration',l:'DURÉE'},{id:'views',l:'VUES'},{id:'price',l:'PRIX'}].map(o=>(
            <button key={o.id} onClick={()=>setSort(o.id)} style={{ background:sort===o.id?DS.cyan+'14':'transparent', border:`1px solid ${sort===o.id?DS.cyan+'60':DS.brd}`, color:sort===o.id?DS.cyan:DS.textLo, fontFamily:F.mono, fontSize:7.5, fontWeight:700, letterSpacing:'.10em', padding:'3px 9px', cursor:'pointer', clipPath:CLP_S, transition:'all .12s' }}>{o.l}</button>
          ))}
        </div>
        <div style={{ flex:1 }}/>
        {top && <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:F.mono, fontSize:7.5, color:DS.textLo }}>
          <span style={{ color:DS.gold }}>★</span> TOP
          <div style={{ width:5, height:5, borderRadius:'50%', background:top.color||DS.cyan }}/>
          <span style={{ color:DS.textMid }}>{top.name}</span>
          <span>·</span>
          <span style={{ color:DS.textMid }}>{fmt.dur(top.dur)}</span>
        </div>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 70px 60px 44px', padding:'6px 24px', borderBottom:`1px solid ${DS.brd}`, fontFamily:F.mono, fontSize:7.5, color:DS.textLo, letterSpacing:'.16em', background:'rgba(0,4,14,.60)', flexShrink:0 }}>
        {['ÉMETTEUR','DURÉE','PRIX','VUES','IL Y A',''].map(h=><span key={h}>{h}</span>)}
      </div>
      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:`${DS.brd} transparent` }}>
        {sorted.length===0 ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:28, color:DS.textLo, opacity:.3 }}>◆</div>
            <div style={{ fontFamily:F.mono, fontSize:9, color:DS.textLo, letterSpacing:'.16em' }}>{search?'AUCUN RÉSULTAT':'CHRONIQUES VIDES'}</div>
          </div>
        ) : sorted.map(item=><HistoryRow key={item.id} item={item} onPromote={onPromote}/>)}
      </div>
      <div style={{ padding:'8px 24px', borderTop:`1px solid ${DS.brd}`, background:DS.glass, fontFamily:F.mono, fontSize:7, color:DS.textLo, letterSpacing:'.12em', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:DS.gold+'60' }}>◈</span>
          CHAQUE ÉCLAT EST GRAVÉ DANS LA MÉMOIRE PERMANENTE DE LA SPHÈRE DE DYSON
        </div>
        <button onClick={()=>onPromote()} style={{ background:'transparent', border:`1px solid ${DS.gold}50`, color:DS.gold, fontFamily:F.mono, fontSize:7.5, fontWeight:700, letterSpacing:'.12em', padding:'3px 10px', cursor:'pointer', clipPath:CLP_S, transition:'all .15s' }}
          onMouseEnter={e=>e.currentTarget.style.background=DS.gold+'14'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          + AJOUTER UN ÉCLAT
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SUCCESS
// ─────────────────────────────────────────────────────────────────
function SuccessView({ booking, onBack }) {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:32, textAlign:'center' }}>
      <div style={{ fontSize:40, color:DS.gold, animation:'spinIn .5s ease' }}>◈</div>
      <div style={{ fontFamily:F.mono, fontSize:13, color:DS.textHi, fontWeight:700, letterSpacing:'.16em' }}>ÉCLAT RÉSERVÉ</div>
      <div style={{ fontFamily:F.mono, fontSize:9, color:DS.textMid, lineHeight:2.2, maxWidth:340, background:'rgba(0,200,240,.04)', border:`1px solid ${DS.brd}`, clipPath:CLP, padding:'18px 24px' }}>
        <div style={{ color:DS.textHi, fontWeight:700, fontSize:14, marginBottom:10, fontFamily:F.ui }}>{booking.name}</div>
        <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:DS.textLo }}>DURÉE</span><span style={{ color:DS.cyan }}>{fmt.dur(booking.dur)}</span></div>
        <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:DS.textLo }}>PRIX</span><span style={{ color:DS.gold, fontWeight:900 }}>{fmt.eur(booking.dur)}</span></div>
        <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:DS.textLo }}>TARIF</span><span style={{ color:DS.textMid }}>1 euro / seconde</span></div>
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${DS.brd}`, color:DS.textLo, fontSize:8 }}>Paiement sécurisé via Stripe avant diffusion.</div>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <Btn onClick={onBack} outline col={DS.cyan} sm>← PANNEAU</Btn>
        <Btn onClick={()=>window.location.reload()} outline col={DS.gold} sm>+ NOUVEL ÉCLAT</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PAGE
// ─────────────────────────────────────────────────────────────────
export default function CapteurPage() {
  const [live,setLive]       = useState(DEMO_LIVE);
  const [queue,setQueue]     = useState(DEMO_QUEUE);
  const [history,setHistory] = useState(DEMO_HISTORY);
  const [view,setView]       = useState('panel');
  const [elapsed,setElapsed] = useState(0);
  const [booked,setBooked]   = useState(null);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(timerRef.current) clearInterval(timerRef.current);
    if(!live) return;
    const tick=()=>setElapsed(Math.floor((Date.now()-new Date(live.started_at))/1000));
    tick(); timerRef.current=setInterval(tick,1000);
    return()=>clearInterval(timerRef.current);
  },[live]);

  useEffect(()=>{
    const sb=getSupabaseClient();
    if(!sb) return;
    (async()=>{
      const{data:l}=await sb.from('eclats').select('*').eq('status','live').limit(1);
      if(l?.[0]) setLive(l[0]);
      const{data:q}=await sb.from('flux_solaire').select('*').limit(20);
      if(q?.length) setQueue(q);
      const{data:h}=await sb.from('chroniques').select('*').eq('status','completed').limit(100);
      if(h?.length) setHistory(h);
    })();
    const ch=sb.channel('capteur-rt').on('postgres_changes',{event:'*',schema:'public',table:'eclats'},async()=>{
      const{data:l}=await sb.from('eclats').select('*').eq('status','live').limit(1);
      setLive(l?.[0]||null);
      const{data:q}=await sb.from('flux_solaire').select('*').limit(20);
      if(q) setQueue(q);
    }).subscribe();
    return()=>sb.removeChannel(ch);
  },[]);

  const progress  = live?Math.min(100,(elapsed/live.duration_seconds)*100):0;
  const remaining = live?Math.max(0,live.duration_seconds-elapsed):0;
  const handleBooked  = useCallback((booking)=>{setBooked(booking);setView('success');},[]);
  const handlePromote = useCallback(()=>{setBooked(null);setView('book');},[]);
  const handleSetView = useCallback((v)=>{setBooked(null);setView(v);},[]);

  return (
    <div style={{ width:'100%', height:'100vh', display:'flex', flexDirection:'column', background:DS.void, fontFamily:F.ui }}>
      <TopBar view={view==='success'?'book':view} setView={handleSetView}/>
      <div style={{ flex:1, marginTop:44, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {view==='panel'   && <PanelView live={live} queue={queue} elapsed={elapsed} progress={progress} remaining={remaining} onPromote={handlePromote}/>}
        {view==='book'    && (booked?<SuccessView booking={booked} onBack={()=>{setBooked(null);setView('panel');}}/>:<BookView queue={queue} remaining={remaining} onDone={handleBooked}/>)}
        {view==='success' && booked && <SuccessView booking={booked} onBack={()=>{setBooked(null);setView('panel');}}/>}
        {view==='history' && <HistoryView history={history} onPromote={handlePromote}/>}
      </div>

      <style>{`
        *{box-sizing:border-box}
        input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;height:4px}
        input[type=range]::-webkit-slider-runnable-track{background:rgba(0,210,240,.14);height:4px;border-radius:0}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;background:${DS.gold};margin-top:-5px;cursor:pointer;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,200,240,.14)}
        a{color:inherit}

        @keyframes lp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.75)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spinIn{from{opacity:0;transform:scale(.5) rotate(-90deg)}to{opacity:1;transform:scale(1) rotate(0)}}
        @keyframes neonPulse{0%,100%{opacity:1}50%{opacity:.7}}
        @keyframes flicker{0%,19%,21%,23%,25%,54%,56%,100%{opacity:1}20%,24%,55%{opacity:.2}}
        @keyframes crtScan{from{background-position:0 0}to{background-position:0 100vh}}
        @keyframes glitchR{0%,100%{transform:translate(0)}20%{transform:translate(-3px,1px)}40%{transform:translate(3px,-1px)}60%{transform:translate(-2px,0)}80%{transform:translate(1px,2px)}}
        @keyframes glitchB{0%,100%{transform:translate(0)}25%{transform:translate(3px,-2px)}50%{transform:translate(-3px,1px)}75%{transform:translate(2px,1px)}}
        @keyframes anim_fade{from{opacity:0}to{opacity:1}}
        @keyframes anim_slide{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
        @keyframes anim_zoom{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
        @keyframes anim_wave{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}
