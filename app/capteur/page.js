'use client';
// app/capteur/page.js — LE CAPTEUR SOLAIRE
// Panneau photovoltaïque broadcast · aucun minimum · 1ct/s
// DA : ADS MOST FAIR — Rajdhani · clipPath · cyan/gold/void

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────
//  DESIGN SYSTEM — identique à View3D
// ─────────────────────────────────────────────────────────────────

const DS = {
  void:     '#01020A',
  glass:    'rgba(1,4,14,0.94)',
  brd:      'rgba(0,210,240,0.09)',
  brdHi:    'rgba(0,210,240,0.22)',
  gold:     '#E8A020',
  cyan:     '#00C8E4',
  violet:   '#8060C8',
  green:    '#00D880',
  rose:     '#D02848',
  textHi:   '#DDE6F2',
  textMid:  'rgba(140,180,220,0.70)',
  textLo:   'rgba(60,100,150,0.42)',
};

const F = {
  ui:   "'Rajdhani','Sora',system-ui,sans-serif",
  mono: "'JetBrains Mono','Fira Code',monospace",
};

const CLP  = 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))';
const CLP_S= 'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))';
const CLP_R= 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)';

const PRICE = 0.01; // €/s

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
  { id:'q1', pos:1, emetteur_name:'Studio Parallax', duration_seconds:60,  primary_color:'#8060C8' },
  { id:'q2', pos:2, emetteur_name:'OpenAI',           duration_seconds:5,   primary_color:'#00C8E4' },
  { id:'q3', pos:3, emetteur_name:'Vercel',            duration_seconds:120, primary_color:'#DDE6F2' },
  { id:'q4', pos:4, emetteur_name:'Indie Records',     duration_seconds:45,  primary_color:'#D02848' },
];

const DEMO_HISTORY = [
  { id:'h1', emetteur_name:'Tesla',   duration_seconds:60,  started_at:new Date(Date.now()-600000).toISOString(),  views_count:204, primary_color:'#D02848' },
  { id:'h2', emetteur_name:'Figma',   duration_seconds:30,  started_at:new Date(Date.now()-800000).toISOString(),  views_count:89,  primary_color:'#F24E1E' },
  { id:'h3', emetteur_name:'Stripe',  duration_seconds:90,  started_at:new Date(Date.now()-1200000).toISOString(), views_count:156, primary_color:'#635BFF' },
  { id:'h4', emetteur_name:'Vercel',  duration_seconds:3,   started_at:new Date(Date.now()-2000000).toISOString(), views_count:44,  primary_color:'#DDE6F2' },
  { id:'h5', emetteur_name:'Spotify', duration_seconds:300, started_at:new Date(Date.now()-3600000).toISOString(), views_count:501, primary_color:'#1ED760' },
  { id:'h6', emetteur_name:'ADIDAS',  duration_seconds:1,   started_at:new Date(Date.now()-4200000).toISOString(), views_count:12,  primary_color:'#00C8E4' },
];

// ─────────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────────

const fmt = {
  dur: s => {
    if (s < 1)  return '0s';
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s/60) + 'min' + (s%60 ? s%60+'s' : '');
    return Math.floor(s/3600) + 'h' + (Math.floor((s%3600)/60) ? Math.floor((s%3600)/60)+'min' : '');
  },
  eur: s => {
    const v = s * PRICE;
    return v < 0.01 ? '< 0,01 €' : v.toFixed(2).replace('.', ',') + ' €';
  },
  ago: iso => {
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60)    return d + 's';
    if (d < 3600)  return Math.floor(d/60) + 'min';
    if (d < 86400) return Math.floor(d/3600) + 'h';
    return Math.floor(d/86400) + 'j';
  },
  date: iso => new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }),
};

// ─────────────────────────────────────────────────────────────────
//  COMPOSANTS DA
// ─────────────────────────────────────────────────────────────────

// Bouton principal style ADS MOST FAIR
function Btn({ children, onClick, col, outline, sm, disabled, style = {} }) {
  const c = col || DS.cyan;
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: outline
          ? (hov && !disabled ? c + '18' : 'transparent')
          : (disabled ? 'rgba(60,80,100,0.15)' : hov ? c + 'dd' : c + 'cc'),
        border: `1px solid ${disabled ? DS.textLo : hov && !disabled ? c : c + '70'}`,
        color: disabled ? DS.textLo : outline ? (hov ? c : DS.textMid) : DS.void,
        fontFamily: F.mono,
        fontSize: sm ? 9 : 10,
        fontWeight: 700,
        letterSpacing: '.12em',
        padding: sm ? '5px 12px' : '9px 18px',
        cursor: disabled ? 'default' : 'pointer',
        clipPath: CLP_S,
        transition: 'all 0.15s',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        ...style,
      }}>
      {children}
    </button>
  );
}

// Champ input style ADS MOST FAIR
function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: F.mono, fontSize: 7.5, color: DS.textLo,
        letterSpacing: '.18em', marginBottom: 5, textTransform: 'uppercase',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {label}
        {required && <span style={{ color: DS.gold, fontSize: 8 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

const INP_STYLE = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(0,8,24,0.95)',
  border: `1px solid ${DS.brd}`,
  color: DS.textHi,
  fontFamily: F.mono, fontSize: 11, letterSpacing: '.04em',
  padding: '8px 11px',
  outline: 'none',
  clipPath: CLP_S,
  transition: 'border-color 0.15s',
};

// Ligne séparateur scanline
function Scan() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${DS.cyan}22, transparent)`, margin: '14px 0' }}/>;
}

// Label de durée + prix
function DurLabel({ s, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active ? DS.cyan + '18' : hov ? DS.brd : 'transparent',
        border: `1px solid ${active ? DS.cyan + '80' : hov ? DS.brd : 'rgba(0,200,240,0.06)'}`,
        color: active ? DS.cyan : hov ? DS.textMid : DS.textLo,
        fontFamily: F.mono, fontSize: 8, letterSpacing: '.08em',
        padding: '4px 7px', cursor: 'pointer', clipPath: CLP_S,
        transition: 'all 0.12s', textAlign: 'center', lineHeight: 1.6,
      }}>
      <div style={{ fontWeight: 700 }}>{fmt.dur(s)}</div>
      <div style={{ fontSize: 7, opacity: 0.75 }}>{fmt.eur(s)}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TOPBAR — intégration navigation ADS MOST FAIR
// ─────────────────────────────────────────────────────────────────

function TopBar({ view, setView }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(1,2,10,0.96)',
      borderBottom: `1px solid ${DS.brd}`,
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', height: 44,
      gap: 0,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
        <span style={{ color: DS.gold, fontSize: 14 }}>◈</span>
        <div>
          <div style={{ color: DS.textHi, fontFamily: F.mono, fontSize: 8, fontWeight: 700, letterSpacing: '.18em', lineHeight: 1 }}>ADS·MOST·FAIR</div>
          <div style={{ color: DS.textLo, fontFamily: F.mono, fontSize: 5.5, letterSpacing: '.14em' }}>GALACTIC·ADV·GRID</div>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: DS.brd, marginRight: 16 }}/>

      {/* Titre section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 20 }}>
        <span style={{ color: DS.gold, fontSize: 10 }}>⚡</span>
        <span style={{ fontFamily: F.mono, fontSize: 9, color: DS.gold, fontWeight: 700, letterSpacing: '.18em' }}>LE·CAPTEUR</span>
        <span style={{
          fontFamily: F.mono, fontSize: 6.5, color: DS.void, background: DS.gold,
          padding: '1px 5px', letterSpacing: '.10em', fontWeight: 700,
        }}>LIVE</span>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {[
          { id: 'panel',   label: 'PANNEAU',   icon: '◉' },
          { id: 'book',    label: 'RÉSERVER',  icon: '◈' },
          { id: 'history', label: 'CHRONIQUES', icon: '◆' },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            background: view === t.id ? DS.cyan + '14' : 'transparent',
            border: 'none',
            borderBottom: `2px solid ${view === t.id ? DS.cyan : 'transparent'}`,
            color: view === t.id ? DS.cyan : DS.textLo,
            fontFamily: F.mono, fontSize: 8, fontWeight: 700,
            letterSpacing: '.12em', padding: '0 12px', height: 44,
            cursor: 'pointer', transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Back to sphere */}
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: F.mono, fontSize: 8, color: DS.textLo,
          letterSpacing: '.10em', padding: '4px 10px',
          border: `1px solid ${DS.brd}`, clipPath: CLP_S,
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = DS.cyan; e.currentTarget.style.borderColor = DS.cyan + '50'; }}
        onMouseLeave={e => { e.currentTarget.style.color = DS.textLo; e.currentTarget.style.borderColor = DS.brd; }}>
          ← SPHÈRE
        </div>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PANEL VIEW — broadcast plein écran
// ─────────────────────────────────────────────────────────────────

function PanelView({ live, queue, elapsed, progress, remaining }) {
  const col = live?.primary_color || DS.cyan;
  const bg  = live?.background_color || DS.void;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: bg, transition: 'background 1.2s' }}>

      {/* Grille de fond cosmique */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}>
        <defs>
          <pattern id="g" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke={live ? col : DS.cyan} strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>

      {live ? <>
        {/* Halo central */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 65% 55% at 50% 48%, ${col}20 0%, transparent 68%)`,
        }}/>

        {/* Contenu */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '5vw', zIndex: 2,
        }}>

          {/* Badge LIVE */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: '3vh',
            background: col + '14', border: `1px solid ${col}50`,
            clipPath: CLP_S, padding: '5px 14px',
            fontFamily: F.mono, fontSize: 9, color: col, letterSpacing: '.18em',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: col,
              boxShadow: `0 0 8px ${col}`,
              animation: 'lp 1.2s ease-in-out infinite',
              display: 'inline-block',
            }}/>
            ÉCLAT·ACTIF · {remaining}s
          </div>

          {/* Nom émetteur */}
          <div style={{
            fontSize: 'clamp(2.8rem, 9vw, 7.5rem)',
            fontWeight: 900, fontFamily: F.ui,
            color: '#fff', letterSpacing: '-0.02em', lineHeight: 0.9,
            textAlign: 'center',
            textShadow: `0 0 80px ${col}60, 0 0 160px ${col}20`,
          }}>
            {live.emetteur_name}
          </div>

          {/* Slogan */}
          {live.emetteur_slogan && (
            <div style={{
              marginTop: '2.5vh',
              fontSize: 'clamp(.9rem, 2vw, 1.5rem)',
              fontFamily: F.mono, color: DS.textMid,
              letterSpacing: '.08em', textAlign: 'center',
            }}>
              {live.emetteur_slogan}
            </div>
          )}

          {/* CTA */}
          {live.call_to_action && (
            <a href={live.cta_url || '#'} target="_blank" rel="noopener noreferrer"
              style={{
                marginTop: '4vh', display: 'inline-block',
                background: col, color: DS.void,
                fontFamily: F.mono, fontSize: 'clamp(.75rem, 1.3vw, .9rem)',
                fontWeight: 800, letterSpacing: '.16em',
                padding: '12px 28px',
                clipPath: CLP,
                textDecoration: 'none',
              }}>
              {live.call_to_action} →
            </a>
          )}
        </div>

        {/* Barre progression */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%', width: progress + '%', background: col,
            boxShadow: `0 0 12px ${col}`,
            transition: 'width 1s linear',
          }}/>
        </div>

        {/* Timer + prix */}
        <div style={{
          position: 'absolute', bottom: 14, right: 20,
          fontFamily: F.mono, fontSize: 10, color: col + '80', letterSpacing: '.10em',
        }}>
          {remaining}s · {fmt.eur(live.duration_seconds)}
        </div>

        {/* Corner brackets */}
        {[[{top:16,left:16},{borderTop:`1px solid ${col}60`,borderLeft:`1px solid ${col}60`}],
          [{top:16,right:16},{borderTop:`1px solid ${col}60`,borderRight:`1px solid ${col}60`}],
          [{bottom:18,left:16},{borderBottom:`1px solid ${col}60`,borderLeft:`1px solid ${col}60`}],
          [{bottom:18,right:16},{borderBottom:`1px solid ${col}60`,borderRight:`1px solid ${col}60`}],
        ].map(([pos, brd], i) => (
          <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...pos, ...brd, pointerEvents: 'none' }}/>
        ))}

      </> : (
        /* Veille */
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1.5vh',
        }}>
          <div style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', color: DS.cyan + '18', lineHeight: 1 }}>◈</div>
          <div style={{ fontFamily: F.mono, fontSize: 'clamp(.75rem, 1.5vw, .95rem)', color: DS.textLo, letterSpacing: '.3em' }}>
            CAPTEUR·EN·VEILLE
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 'clamp(.55rem, 1vw, .7rem)', color: DS.textLo + '88', letterSpacing: '.2em', marginTop: 4 }}>
            PANNEAU PHOTOVOLTAÏQUE · SPHÈRE DE DYSON
          </div>
          <div style={{ marginTop: '2vh', fontFamily: F.mono, fontSize: 9, color: DS.gold + '80', letterSpacing: '.18em' }}>
            AUCUN ÉCLAT EN COURS
          </div>
        </div>
      )}

      {/* File d'attente scrollable en bas */}
      <div style={{
        position: 'absolute', bottom: live ? 24 : 14, left: 0, right: 0,
        display: 'flex', gap: 6, padding: '0 16px', overflowX: 'auto',
        scrollbarWidth: 'none', alignItems: 'center', justifyContent: 'center',
      }}>
        {queue.length > 0 ? queue.map((item, i) => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
            background: 'rgba(1,4,14,0.88)', backdropFilter: 'blur(8px)',
            border: `1px solid ${i === 0 ? (item.primary_color || DS.cyan) + '60' : DS.brd}`,
            clipPath: CLP_S, padding: '4px 10px',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.primary_color || DS.cyan, flexShrink: 0 }}/>
            <span style={{ fontFamily: F.mono, fontSize: 8, color: i === 0 ? DS.textHi : DS.textMid, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
              {item.emetteur_name}
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 7.5, color: DS.textLo }}>
              {fmt.dur(item.duration_seconds)}
            </span>
          </div>
        )) : (
          <div style={{ fontFamily: F.mono, fontSize: 8, color: DS.textLo, letterSpacing: '.14em' }}>
            FLUX VIDE · PROCHAIN ÉCLAT IMMÉDIAT
          </div>
        )}
      </div>

      <style>{`@keyframes lp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.75)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  BOOK VIEW — formulaire réservation
// ─────────────────────────────────────────────────────────────────

function BookView({ queue, remaining, onDone }) {
  const [name,   setName]   = useState('');
  const [slogan, setSlogan] = useState('');
  const [dur,    setDur]    = useState(30);
  const [color,  setColor]  = useState(DS.cyan);
  const [bg,     setBg]     = useState(DS.void);
  const [cta,    setCta]    = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [step,   setStep]   = useState(1);
  const [submitting, setSub] = useState(false);

  const totalWait = queue.reduce((a, b) => a + (b.duration_seconds || 0), 0) + (remaining || 0);
  const price     = dur * PRICE;

  const PRESETS = [1, 3, 5, 10, 30, 60, 120, 300, 600, 1800, 3600];

  const submit = async () => {
    setSub(true);
    const sb = getSupabaseClient();
    if (sb) {
      await sb.from('eclats').insert([{
        emetteur_name: name, emetteur_slogan: slogan || null,
        primary_color: color, background_color: bg,
        call_to_action: cta || null, cta_url: ctaUrl || null,
        duration_seconds: dur, content_type: 'brand', content_text: name,
        status: 'queued', paid: false,
      }]);
    }
    setSub(false);
    onDone({ name, dur, color });
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* Aperçu live — gauche */}
      <div style={{
        flex: 1, background: bg, position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.5s',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}>
          <defs>
            <pattern id="g2" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke={color} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g2)"/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${color}18, transparent 70%)` }}/>
        <div style={{ zIndex: 2, textAlign: 'center', padding: '8%', maxWidth: '85%' }}>
          <div style={{
            fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 900, fontFamily: F.ui,
            color: '#fff', letterSpacing: '-0.02em', lineHeight: 0.9,
            textShadow: `0 0 60px ${color}50`,
          }}>
            {name || <span style={{ opacity: 0.15 }}>VOTRE NOM</span>}
          </div>
          {slogan && (
            <div style={{ marginTop: '2vh', fontSize: 'clamp(.8rem, 1.5vw, 1.1rem)', fontFamily: F.mono, color: DS.textMid, letterSpacing: '.06em' }}>
              {slogan}
            </div>
          )}
          {cta && (
            <div style={{
              marginTop: '3vh', display: 'inline-block', background: color, color: DS.void,
              fontFamily: F.mono, fontSize: 'clamp(.7rem, 1.1vw, .82rem)', fontWeight: 800,
              letterSpacing: '.14em', padding: '9px 22px', clipPath: CLP_S,
            }}>
              {cta} →
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 14, left: 16, fontFamily: F.mono, fontSize: 8, color: DS.textLo, letterSpacing: '.12em' }}>
          APERÇU TEMPS RÉEL
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: color + '60' }}/>
      </div>

      {/* Formulaire — droite */}
      <div style={{
        width: 320, background: DS.glass, borderLeft: `1px solid ${DS.brd}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${DS.brd}` }}>
          <div style={{ color: DS.gold, fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: '.22em' }}>◈ CRÉER UN ÉCLAT</div>
          <div style={{ color: DS.textLo, fontFamily: F.mono, fontSize: 7, letterSpacing: '.16em', marginTop: 3 }}>
            PANNEAU PHOTOVOLTAÏQUE · {price.toFixed(2).replace('.', ',')} €
          </div>
        </div>

        {/* Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', scrollbarWidth: 'thin', scrollbarColor: `${DS.brd} transparent` }}>

          <Field label="Nom / Marque" required>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
              placeholder="NIKE, STUDIO XYZ, JEAN DUPONT..."
              style={INP_STYLE}
              onFocus={e => e.target.style.borderColor = DS.cyan + '60'}
              onBlur={e => e.target.style.borderColor = DS.brd}/>
          </Field>

          <Field label="Tagline">
            <input value={slogan} onChange={e => setSlogan(e.target.value)} maxLength={60}
              placeholder="Just do it." style={INP_STYLE}
              onFocus={e => e.target.style.borderColor = DS.cyan + '60'}
              onBlur={e => e.target.style.borderColor = DS.brd}/>
          </Field>

          <Field label="Bouton CTA (optionnel)">
            <input value={cta} onChange={e => setCta(e.target.value)} maxLength={30}
              placeholder="Visiter le site" style={{ ...INP_STYLE, marginBottom: 6 }}
              onFocus={e => e.target.style.borderColor = DS.cyan + '60'}
              onBlur={e => e.target.style.borderColor = DS.brd}/>
            <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
              placeholder="https://..." style={INP_STYLE}
              onFocus={e => e.target.style.borderColor = DS.cyan + '60'}
              onBlur={e => e.target.style.borderColor = DS.brd}/>
          </Field>

          <Field label="Couleurs">
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ l: 'PRINCIPALE', v: color, s: setColor }, { l: 'FOND', v: bg, s: setBg }].map(c => (
                <label key={c.l} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ fontFamily: F.mono, fontSize: 7, color: DS.textLo, letterSpacing: '.14em', marginBottom: 5 }}>{c.l}</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(0,8,24,0.95)', border: `1px solid ${DS.brd}`,
                    padding: '7px 9px', clipPath: CLP_S,
                  }}>
                    <div style={{ width: 16, height: 16, background: c.v, clipPath: CLP_S, flexShrink: 0 }}/>
                    <span style={{ fontFamily: F.mono, fontSize: 8, color: DS.textLo }}>{c.v}</span>
                    <input type="color" value={c.v} onChange={e => c.s(e.target.value)}
                      style={{ opacity: 0, position: 'absolute', width: 1, height: 1 }}/>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <Scan/>

          <Field label={`Durée · ${fmt.dur(dur)} · ${fmt.eur(dur)}`}>
            {/* Slider custom */}
            <div style={{ marginBottom: 10 }}>
              <input type="range" min={1} max={3600} step={1} value={dur}
                onChange={e => setDur(+e.target.value)}
                style={{ width: '100%', accentColor: DS.cyan, cursor: 'pointer' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontFamily: F.mono, fontSize: 7, color: DS.textLo }}>
                <span>1s</span><span>1h</span>
              </div>
            </div>
            {/* Presets rapides */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {PRESETS.map(s => <DurLabel key={s} s={s} active={dur === s} onClick={() => setDur(s)}/>)}
            </div>
          </Field>

          {/* Info file */}
          {queue.length > 0 && (
            <div style={{
              background: 'rgba(0,200,240,0.04)', border: `1px solid ${DS.brd}`,
              clipPath: CLP_S, padding: '9px 12px', marginTop: 4,
              fontFamily: F.mono, fontSize: 8, color: DS.textLo, lineHeight: 1.9, letterSpacing: '.06em',
            }}>
              <div><span style={{ color: DS.cyan }}>{queue.length}</span> éclat{queue.length > 1 ? 's' : ''} avant vous</div>
              <div>Attente estimée · <span style={{ color: DS.textMid }}>{fmt.dur(totalWait)}</span></div>
            </div>
          )}
        </div>

        {/* Action */}
        <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${DS.brd}` }}>
          <Btn onClick={submit} disabled={!name || submitting} col={DS.gold}
            style={{ width: '100%', fontSize: 11, padding: '12px', letterSpacing: '.18em' }}>
            {submitting ? '⚙ TRAITEMENT...' : <>◈ ÉMETTRE · {fmt.eur(dur)}</>}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HISTORY VIEW — chroniques
// ─────────────────────────────────────────────────────────────────

function HistoryView({ history }) {
  const totalSec   = history.reduce((a, b) => a + (b.duration_seconds || 0), 0);
  const totalViews = history.reduce((a, b) => a + (b.views_count || 0), 0);
  const uniq       = [...new Set(history.map(h => h.emetteur_name))].length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Stats bar */}
      <div style={{
        padding: '12px 24px', borderBottom: `1px solid ${DS.brd}`,
        background: DS.glass, display: 'flex', gap: 28, flexWrap: 'wrap',
      }}>
        {[
          { l: 'ÉCLATS',    v: history.length,       c: DS.cyan  },
          { l: 'TEMPS',     v: fmt.dur(totalSec),    c: DS.gold  },
          { l: 'VUES',      v: totalViews.toLocaleString(), c: DS.green },
          { l: 'ÉMETTEURS', v: uniq,                 c: DS.violet},
          { l: 'REVENUS',   v: fmt.eur(totalSec),    c: DS.textMid },
        ].map(s => (
          <div key={s.l}>
            <div style={{ fontFamily: F.mono, fontSize: 7, color: DS.textLo, letterSpacing: '.18em', marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 700, color: s.c, letterSpacing: '.04em' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div style={{
        display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr',
        padding: '8px 24px', borderBottom: `1px solid ${DS.brd}`,
        fontFamily: F.mono, fontSize: 7.5, color: DS.textLo, letterSpacing: '.16em',
        background: 'rgba(0,4,14,0.60)',
      }}>
        {['ÉMETTEUR', 'DURÉE', 'PRIX', 'VUES', 'IL Y A'].map(h => <span key={h}>{h}</span>)}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${DS.brd} transparent` }}>
        {history.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 28, color: DS.textLo, opacity: 0.3 }}>◆</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: DS.textLo, letterSpacing: '.16em' }}>CHRONIQUES VIDES</div>
          </div>
        ) : history.map(item => (
          <div key={item.id}
            style={{
              display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr',
              padding: '11px 24px', borderBottom: `1px solid rgba(0,200,240,0.04)`,
              transition: 'background 0.1s', cursor: 'default',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,240,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 22, background: item.primary_color || DS.cyan, flexShrink: 0 }}/>
              <span style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700, color: DS.textHi, letterSpacing: '.03em' }}>
                {item.emetteur_name}
              </span>
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: DS.textMid, alignSelf: 'center' }}>{fmt.dur(item.duration_seconds)}</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: item.primary_color || DS.gold, alignSelf: 'center' }}>{fmt.eur(item.duration_seconds)}</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: DS.textMid, alignSelf: 'center' }}>{(item.views_count || 0).toLocaleString()}</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: DS.textLo, alignSelf: 'center' }}>{fmt.ago(item.started_at)}</span>
          </div>
        ))}
      </div>

      {/* Footer lore */}
      <div style={{
        padding: '8px 24px', borderTop: `1px solid ${DS.brd}`, background: DS.glass,
        fontFamily: F.mono, fontSize: 7, color: DS.textLo, letterSpacing: '.12em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: DS.gold + '60' }}>◈</span>
        CHAQUE ÉCLAT EST GRAVÉ DANS LA MÉMOIRE PERMANENTE DE LA SPHÈRE DE DYSON
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SUCCESS STATE
// ─────────────────────────────────────────────────────────────────

function SuccessView({ booking, onBack }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, color: DS.gold }}>◈</div>
      <div style={{ fontFamily: F.mono, fontSize: 13, color: DS.textHi, fontWeight: 700, letterSpacing: '.16em' }}>
        ÉCLAT RÉSERVÉ
      </div>
      <div style={{
        fontFamily: F.mono, fontSize: 9, color: DS.textMid, lineHeight: 2, letterSpacing: '.08em',
        maxWidth: 320,
        background: 'rgba(0,200,240,0.04)', border: `1px solid ${DS.brd}`,
        clipPath: CLP, padding: '16px 20px', marginTop: 8,
      }}>
        <div style={{ color: DS.textHi, fontWeight: 700, marginBottom: 8 }}>{booking.name}</div>
        <div>DURÉE · <span style={{ color: DS.cyan }}>{fmt.dur(booking.dur)}</span></div>
        <div>PRIX · <span style={{ color: DS.gold }}>{fmt.eur(booking.dur)}</span></div>
        <div style={{ marginTop: 8, color: DS.textLo, fontSize: 8 }}>
          Le paiement sera demandé avant diffusion.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn onClick={onBack} outline col={DS.cyan} sm>← PANNEAU</Btn>
        <Btn onClick={() => window.location.reload()} outline col={DS.gold} sm>+ NOUVEL ÉCLAT</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────

export default function CapteurPage() {
  const [live,    setLive]    = useState(DEMO_LIVE);
  const [queue,   setQueue]   = useState(DEMO_QUEUE);
  const [history, setHistory] = useState(DEMO_HISTORY);
  const [view,    setView]    = useState('panel');
  const [elapsed, setElapsed] = useState(0);
  const [booked,  setBooked]  = useState(null);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!live) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(live.started_at)) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [live]);

  // Supabase
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    (async () => {
      const { data: l } = await sb.from('eclats').select('*').eq('status', 'live').limit(1);
      if (l?.[0]) setLive(l[0]);
      const { data: q } = await sb.from('flux_solaire').select('*').limit(20);
      if (q?.length) setQueue(q);
      const { data: h } = await sb.from('chroniques').select('*').eq('status', 'completed').limit(100);
      if (h?.length) setHistory(h);
    })();
    const ch = sb.channel('capteur-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eclats' }, async () => {
        const { data: l } = await sb.from('eclats').select('*').eq('status', 'live').limit(1);
        setLive(l?.[0] || null);
        const { data: q } = await sb.from('flux_solaire').select('*').limit(20);
        if (q) setQueue(q);
      })
      .subscribe();
    return () => sb.removeChannel(ch);
  }, []);

  const progress  = live ? Math.min(100, (elapsed / live.duration_seconds) * 100) : 0;
  const remaining = live ? Math.max(0, live.duration_seconds - elapsed) : 0;

  const handleBooked = useCallback((booking) => {
    setBooked(booking);
    setView('success');
  }, []);

  return (
    <div style={{
      width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
      background: DS.void, fontFamily: F.ui,
    }}>
      <TopBar view={view === 'success' ? 'book' : view} setView={v => { setBooked(null); setView(v); }}/>

      {/* Contenu sous la topbar */}
      <div style={{ flex: 1, marginTop: 44, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'panel' && (
          <PanelView live={live} queue={queue} elapsed={elapsed} progress={progress} remaining={remaining}/>
        )}
        {view === 'book' && (
          booked ? (
            <SuccessView booking={booked} onBack={() => { setBooked(null); setView('panel'); }}/>
          ) : (
            <BookView queue={queue} remaining={remaining} onDone={handleBooked}/>
          )
        )}
        {view === 'success' && booked && (
          <SuccessView booking={booked} onBack={() => { setBooked(null); setView('panel'); }}/>
        )}
        {view === 'history' && <HistoryView history={history}/>}
      </div>

      <style>{`
        *{box-sizing:border-box}
        input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;height:3px}
        input[type=range]::-webkit-slider-runnable-track{background:${DS.brd};height:3px;border-radius:0}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;background:${DS.cyan};margin-top:-4.5px;cursor:pointer;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${DS.brd};border-radius:0}
        a{color:inherit}
      `}</style>
    </div>
  );
}
