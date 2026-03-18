'use client';
// app/sphere/page.js — Sphère de Dyson (avec guard "En travaux")
// Admin bypass via token ADMIN_SECRET stocké dans localStorage

import { useState, useEffect, useCallback } from 'react';
import { getSession } from '../../lib/supabase-auth';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

// ─── Design System (ADS MOST FAIR) ──────────────────────────
const DS = {
  void:    '#01020A',
  glass:   'rgba(1,4,14,0.97)',
  brd:     'rgba(0,210,240,0.09)',
  brdHi:   'rgba(0,210,240,0.22)',
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
const CLP   = 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))';
const CLP_S = 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))';

// ─── Sphere Dashboard (original) ─────────────────────────────
const U = {
  bg:      '#060608',
  s1:      '#0d0d10',
  s2:      '#12121a',
  card:    '#16161e',
  card2:   '#1a1a24',
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.16)',
  text:    '#f4f4f6',
  muted:   'rgba(210,220,240,0.65)',
  faint:   'rgba(255,255,255,0.04)',
  err:     '#e05252',
  green:   '#22c55e',
};
const Fb = { h: "'Clash Display','Syne',sans-serif", b: "'DM Sans','Inter',sans-serif" };

const RANK_CONFIG = {
  elu:        { label: "L'Élu",        color: '#f0b429', icon: '☀', glow: '#f0b42940' },
  architecte: { label: "L'Architecte", color: '#ff4d8f', icon: '🔵', glow: '#ff4d8f30' },
  gardien:    { label: "Le Gardien",   color: '#a855f7', icon: '🟣', glow: '#a855f730' },
  batisseur:  { label: "Le Bâtisseur", color: '#00d9f5', icon: '🟡', glow: '#00d9f530' },
  signal:     { label: "Le Signal",    color: '#00e8a2', icon: '⚪', glow: '#00e8a230' },
};

const TASK_CONFIG = {
  share_grid:          { icon: '🌐', label: 'Partager la Sphère',           desc: 'Partagez le lien de la Sphère sur un réseau social', platform: true },
  highlight_neighbor:  { icon: '✨', label: 'Mettre en avant un voisin',    desc: 'Mentionnez un slot voisin dans votre communication', target: true },
  create_content:      { icon: '🎬', label: 'Créer du contenu',             desc: 'Publiez du contenu autour de votre slot (vidéo, post, article)', platform: true },
  welcome_member:      { icon: '👋', label: 'Accueillir un nouveau membre', desc: 'Envoyez un message de bienvenue à un nouveau Signal', target: true },
  recommend_members:   { icon: '⭐', label: 'Recommander 2 membres',        desc: 'Recommandez publiquement 2 membres à votre audience', target: true },
  offer_advantage:     { icon: '🎁', label: 'Offrir un avantage',           desc: 'Proposez quelque chose de concret à la communauté (réduction, accès, collab)' },
  slot_perfect:        { icon: '💎', label: 'Slot parfait',                 desc: 'Confirmez que votre slot est à jour et votre lien actif' },
};

const PLATFORMS = ['Instagram', 'Twitter/X', 'LinkedIn', 'TikTok', 'YouTube', 'Facebook', 'Threads', 'Autre'];

const FEED_ACTION_LABELS = {
  share:     { icon: '🌐', label: 'a partagé la Sphère' },
  highlight: { icon: '✨', label: 'a mis en avant' },
  recommend: { icon: '⭐', label: 'a recommandé' },
  welcome:   { icon: '👋', label: 'a accueilli' },
  advantage: { icon: '🎁', label: 'offre un avantage' },
};

// ═══════════════════════════════════════════════════════════════
//  MODAL "EN TRAVAUX"
// ═══════════════════════════════════════════════════════════════

function SphereWIPModal({ onWaitlist, onCapteur, onAdminBypass }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pwd, setPwd] = useState('');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminErr, setAdminErr] = useState('');
  const [tick, setTick] = useState(0);

  // Animation pulsante
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60);
    return () => clearInterval(t);
  }, []);

  const submitWaitlist = async () => {
    if (!email.includes('@')) return;
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'sphere_wip' }),
      });
    } catch (_) {}
    setSubmitted(true);
  };

  const tryAdmin = async () => {
    setAdminErr('');
    const ok = await onAdminBypass(pwd);
    if (!ok) setAdminErr('Code invalide');
  };

  // Rotation orbe
  const angle = (tick * 0.4) % 360;
  const orbeStyle = (r, col, phase) => ({
    position: 'absolute',
    width: r * 2, height: r * 2,
    top: '50%', left: '50%',
    transform: `translate(-50%,-50%) rotate(${angle + phase}deg)`,
    border: `1px solid ${col}`,
    borderRadius: '50%',
    pointerEvents: 'none',
  });

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,1,6,0.92)',
        backdropFilter: 'blur(18px)',
      }}/>

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          width: '100%', maxWidth: 520,
          background: DS.glass,
          border: `1px solid ${DS.brdHi}`,
          clipPath: CLP,
          padding: '44px 40px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Scan line top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${DS.cyan}60, transparent)` }}/>

          {/* Orbe animé décoratif */}
          <div style={{ position: 'absolute', top: -120, right: -120, width: 280, height: 280, pointerEvents: 'none', zIndex: 0 }}>
            <div style={orbeStyle(90, DS.gold+'30', 0)}/>
            <div style={orbeStyle(70, DS.cyan+'20', 45)}/>
            <div style={orbeStyle(50, DS.violet+'25', -30)}/>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 18, height: 18, background: DS.gold+'40', clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', animation: 'rotSlow 8s linear infinite' }}/>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* Badge statut */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: DS.gold + '14', border: `1px solid ${DS.gold}50`,
                clipPath: CLP_S, padding: '4px 12px',
                fontFamily: F.mono, fontSize: 8, color: DS.gold, letterSpacing: '.18em',
              }}>
                <span style={{ width: 6, height: 6, background: DS.gold, clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }}/>
                EN CONSTRUCTION
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: DS.rose + '10', border: `1px solid ${DS.rose}30`,
                clipPath: CLP_S, padding: '4px 10px',
                fontFamily: F.mono, fontSize: 7.5, color: DS.rose, letterSpacing: '.14em',
              }}>
                ACCÈS RESTREINT
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: F.ui, fontSize: 30, fontWeight: 900, color: DS.textHi,
                letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 4,
              }}>
                SPHÈRE DE DYSON
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: 9, color: DS.gold, letterSpacing: '.22em', fontWeight: 700,
              }}>
                ⚙ OUVERTURE PROCHAINE
              </div>
            </div>

            {/* Scan */}
            <div style={{ height: 1, background: `linear-gradient(90deg, ${DS.cyan}30, transparent)`, margin: '18px 0' }}/>

            {/* Description */}
            <div style={{
              fontFamily: F.mono, fontSize: 9.5, color: DS.textMid,
              lineHeight: 2, letterSpacing: '.04em', marginBottom: 22,
            }}>
              La Sphère de Dyson — réseau mutualiste et cockpit membres — est actuellement en phase de déploiement.
              <br/>
              <span style={{ color: DS.textHi }}>Inscrivez-vous à la liste d'attente</span> pour être notifié en premier dès l'ouverture.
            </div>

            {/* Waitlist */}
            {!submitted ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: F.mono, fontSize: 7.5, color: DS.textLo, letterSpacing: '.18em', marginBottom: 8 }}>
                  LISTE D'ATTENTE
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitWaitlist()}
                    placeholder="votre@email.com"
                    style={{
                      flex: 1, background: 'rgba(0,8,24,0.95)',
                      border: `1px solid ${DS.brd}`, color: DS.textHi,
                      fontFamily: F.mono, fontSize: 11, padding: '10px 13px',
                      outline: 'none', clipPath: CLP_S,
                    }}
                    onFocus={e => e.target.style.borderColor = DS.gold + '80'}
                    onBlur={e => e.target.style.borderColor = DS.brd}
                  />
                  <button onClick={submitWaitlist} disabled={!email.includes('@')} style={{
                    background: DS.gold + 'cc', color: DS.void,
                    border: `1px solid ${DS.gold}`,
                    fontFamily: F.mono, fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                    padding: '10px 18px', cursor: 'pointer', clipPath: CLP_S,
                    transition: 'all .15s', opacity: email.includes('@') ? 1 : 0.4,
                  }}
                  onMouseEnter={e => { if (email.includes('@')) e.currentTarget.style.background = DS.gold; }}
                  onMouseLeave={e => e.currentTarget.style.background = DS.gold + 'cc'}>
                    REJOINDRE →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 10,
                background: DS.green + '0e', border: `1px solid ${DS.green}40`,
                clipPath: CLP_S, padding: '11px 16px',
              }}>
                <span style={{ color: DS.green, fontSize: 14 }}>◈</span>
                <div>
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: DS.green, fontWeight: 700, letterSpacing: '.16em' }}>SIGNAL ENREGISTRÉ</div>
                  <div style={{ fontFamily: F.mono, fontSize: 8, color: DS.textLo, letterSpacing: '.08em', marginTop: 2 }}>Vous serez notifié à l'ouverture de la Sphère.</div>
                </div>
              </div>
            )}

            {/* CTA Capteur */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${DS.brd}, transparent)`, marginBottom: 16 }}/>
              <div style={{ fontFamily: F.mono, fontSize: 8, color: DS.textLo, letterSpacing: '.14em', marginBottom: 10 }}>
                EN ATTENDANT L'OUVERTURE
              </div>
              <button onClick={onCapteur} style={{
                width: '100%', background: 'transparent',
                border: `1px solid ${DS.cyan}50`, color: DS.cyan,
                fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: '.14em',
                padding: '12px', cursor: 'pointer', clipPath: CLP_S,
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = DS.cyan + '0e'; e.currentTarget.style.borderColor = DS.cyan; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = DS.cyan + '50'; }}>
                <span style={{ fontSize: 12 }}>⚡</span>
                PROMOUVOIR SUR LE CAPTEUR · 1ct/s
              </button>
              <div style={{ fontFamily: F.mono, fontSize: 7.5, color: DS.textLo, letterSpacing: '.08em', marginTop: 8, textAlign: 'center' }}>
                Le panneau broadcast est disponible maintenant
              </div>
            </div>

            {/* Retour grille */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 8, color: DS.textLo,
                  letterSpacing: '.12em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5, transition: 'color .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = DS.textMid}
                onMouseLeave={e => e.currentTarget.style.color = DS.textLo}>
                  ← RETOUR À LA GRILLE
                </div>
              </Link>

              {/* Admin bypass discret */}
              {!showAdminForm ? (
                <button onClick={() => setShowAdminForm(true)} style={{
                  background: 'transparent', border: 'none',
                  fontFamily: F.mono, fontSize: 7, color: DS.textLo + '60',
                  letterSpacing: '.12em', cursor: 'pointer', padding: '2px 6px',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = DS.textLo}
                onMouseLeave={e => e.currentTarget.style.color = DS.textLo + '60'}>
                  ◈ ACCÈS ADMIN
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    value={pwd} onChange={e => setPwd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && tryAdmin()}
                    type="password" placeholder="Code admin"
                    autoFocus
                    style={{
                      background: 'rgba(0,8,24,0.95)',
                      border: `1px solid ${adminErr ? DS.rose : DS.brd}`,
                      color: DS.textHi, fontFamily: F.mono, fontSize: 9,
                      padding: '5px 9px', outline: 'none', clipPath: CLP_S,
                      width: 130,
                    }}
                  />
                  <button onClick={tryAdmin} style={{
                    background: DS.cyan + '18', border: `1px solid ${DS.cyan}50`,
                    color: DS.cyan, fontFamily: F.mono, fontSize: 8, fontWeight: 700,
                    letterSpacing: '.10em', padding: '5px 10px', cursor: 'pointer', clipPath: CLP_S,
                  }}>OK</button>
                  <button onClick={() => { setShowAdminForm(false); setAdminErr(''); }} style={{
                    background: 'transparent', border: 'none', color: DS.textLo,
                    fontFamily: F.mono, fontSize: 9, cursor: 'pointer',
                  }}>×</button>
                  {adminErr && <span style={{ fontFamily: F.mono, fontSize: 7.5, color: DS.rose }}>{adminErr}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Scan line bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${DS.gold}40, transparent)` }}/>
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
        @keyframes rotSlow{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SPHERE DASHBOARD (inchangé, affiché si admin)
// ═══════════════════════════════════════════════════════════════

function RankBadge({ rank, size = 'md' }) {
  const cfg = RANK_CONFIG[rank] || RANK_CONFIG.signal;
  const sizes = { sm: { p: '3px 10px', fs: 10 }, md: { p: '5px 14px', fs: 12 } };
  const s = sizes[size];
  return (
    <span style={{
      background: cfg.glow, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      borderRadius: 6, padding: s.p, fontSize: s.fs,
      fontWeight: 700, letterSpacing: '0.08em', fontFamily: Fb.b,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function Btn({ onClick, children, variant = 'primary', disabled, small }) {
  const styles = {
    primary:   { background: '#d4a84b', color: '#080808' },
    success:   { background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e40' },
    secondary: { background: U.faint, color: U.text, border: `1px solid ${U.border2}` },
    danger:    { background: 'rgba(224,82,82,0.1)', color: U.err, border: '1px solid rgba(224,82,82,0.3)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      border: 'none', borderRadius: 8, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: Fb.b, opacity: disabled ? 0.5 : 1,
      padding: small ? '8px 16px' : '12px 24px',
      fontSize: small ? 13 : 14, transition: 'opacity 0.15s',
      ...styles[variant],
    }}>
      {children}
    </button>
  );
}

function Gauge({ value, max, color, label }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: U.muted, fontWeight: 600, letterSpacing: '0.07em' }}>{label}</span>
        <span style={{ fontSize: 13, color, fontWeight: 700 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 5, background: U.faint, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function TaskCard({ task, onComplete, loading }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ proof_text: '', proof_url: '', proof_platform: '', target_name: '' });
  const cfg = TASK_CONFIG[task.task_type] || {};
  const isCompleted = task.completed;
  const handleComplete = () => { onComplete(task.id, form); setOpen(false); };
  return (
    <div style={{ background: isCompleted ? 'rgba(34,197,94,0.05)' : U.card, border: `1px solid ${isCompleted ? '#22c55e30' : U.border}`, borderRadius: 12, padding: '16px 20px', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: isCompleted ? '#22c55e' : U.text }}>
              {cfg.label}{isCompleted && <span style={{ marginLeft: 8, fontSize: 12, color: '#22c55e' }}>✓ Fait</span>}
            </div>
            <div style={{ fontSize: 13, color: U.muted, marginTop: 4, lineHeight: 1.5 }}>{cfg.desc}</div>
          </div>
        </div>
        {!isCompleted && (
          <button onClick={() => setOpen(!open)} style={{ background: 'rgba(212,168,75,0.12)', color: '#d4a84b', border: '1px solid rgba(212,168,75,0.3)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: Fb.b }}>
            {open ? 'Fermer' : 'Déclarer'}
          </button>
        )}
      </div>
      {open && !isCompleted && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${U.border}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea placeholder="Décrivez ce que vous avez fait…" value={form.proof_text} onChange={e => setForm(f => ({ ...f, proof_text: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: U.s1, border: `1px solid ${U.border2}`, borderRadius: 8, color: U.text, fontSize: 13, fontFamily: Fb.b, resize: 'vertical', minHeight: 72, outline: 'none', boxSizing: 'border-box' }}/>
            <input placeholder="Lien (optionnel)" value={form.proof_url} onChange={e => setForm(f => ({ ...f, proof_url: e.target.value }))} style={{ padding: '10px 12px', background: U.s1, border: `1px solid ${U.border2}`, borderRadius: 8, color: U.text, fontSize: 13, fontFamily: Fb.b, outline: 'none' }}/>
            {cfg.platform && (<select value={form.proof_platform} onChange={e => setForm(f => ({ ...f, proof_platform: e.target.value }))} style={{ padding: '10px 12px', background: U.s1, border: `1px solid ${U.border2}`, borderRadius: 8, color: U.text, fontSize: 13 }}><option value="">Plateforme</option>{PLATFORMS.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}</select>)}
            {cfg.target && (<input placeholder="Nom du membre" value={form.target_name} onChange={e => setForm(f => ({ ...f, target_name: e.target.value }))} style={{ padding: '10px 12px', background: U.s1, border: `1px solid ${U.border2}`, borderRadius: 8, color: U.text, fontSize: 13, fontFamily: Fb.b, outline: 'none' }}/>)}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={handleComplete} disabled={loading || !form.proof_text} small>{loading ? '…' : '✓ Confirmer'}</Btn>
              <Btn onClick={() => setOpen(false)} variant="secondary" small>Annuler</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function FeedEntry({ entry }) {
  const rankCfg = RANK_CONFIG[entry.rank] || RANK_CONFIG.signal;
  const actionCfg = FEED_ACTION_LABELS[entry.action_type] || { icon: '◈', label: 'a agi' };
  return (
    <div style={{ background: U.card, border: `1px solid ${U.border}`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: rankCfg.glow, border: `2px solid ${rankCfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: rankCfg.color }}>
          {(entry.author_name || '?').substring(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>
            <strong style={{ color: U.text }}>{entry.author_name}</strong>
            <span style={{ color: rankCfg.color }}> {actionCfg.icon}</span>
            <span style={{ color: U.muted }}> {actionCfg.label}</span>
            {entry.featured_name && <strong style={{ color: U.text }}> {entry.featured_name}</strong>}
          </div>
          <RankBadge rank={entry.rank} size="sm" />
          {entry.content_text && <p style={{ margin: '10px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.80)', lineHeight: 1.7 }}>{entry.content_text}</p>}
          {entry.proof_url && <a href={entry.proof_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: '#00d9f5', textDecoration: 'none' }}>↗ Voir la preuve</a>}
          <div style={{ marginTop: 8, fontSize: 12, color: U.muted }}>{getTimeAgo(entry.created_at)}</div>
        </div>
      </div>
    </div>
  );
}

function SphereDashboardInner() {
  const [session, setSession] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDismissed, setMobileDismissed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (!s) { window.location.href = '/dashboard/login'; return; }
      setSession(s);
      const { data: subs } = await supabase.from('member_dashboard').select('*').eq('advertiser_id', s.user.id).order('started_at', { ascending: false });
      setSubscriptions(subs || []);
      if (subs && subs.length > 0) { setSelectedSub(subs[0]); setDashboard(subs[0]); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedSub) return;
    (async () => {
      const res = await fetch(`/api/tasks?subscription_id=${selectedSub.id}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    })();
  }, [selectedSub]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/community?limit=30');
      const data = await res.json();
      setFeed(data.feed || []);
    })();
  }, []);

  const handleCompleteTask = useCallback(async (taskId, form) => {
    setTaskLoading(true);
    try {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: taskId, proof_text: form.proof_text, proof_url: form.proof_url, proof_platform: form.proof_platform, target_name: form.target_name }) });
      const data = await res.json();
      if (data.success) {
        setTasks(t => t.map(task => task.id === taskId ? { ...task, completed: true } : task));
        if (data.dashboard) setDashboard(data.dashboard);
        showToast('Tâche accomplie ✓ — Amplification publiée sur le fil !');
        const feedRes = await fetch('/api/community?limit=30');
        const feedData = await feedRes.json();
        setFeed(feedData.feed || []);
      } else showToast(data.error || 'Erreur', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
    finally { setTaskLoading(false); }
  }, []);

  const handleCancel = async () => {
    if (!selectedSub || !session) return;
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription_id: selectedSub.id, advertiser_id: session.user.id }) });
      const data = await res.json();
      if (data.success) {
        showToast('Abonnement annulé. Votre slot restera visible 24h.');
        setSubscriptions(s => s.map(sub => sub.id === selectedSub.id ? { ...sub, status: 'cancelled' } : sub));
        setDashboard(d => ({ ...d, status: 'cancelled' }));
        setCancelConfirm(false);
      } else showToast(data.error || 'Erreur annulation', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
  };

  if (loading) return <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: U.muted, fontFamily: Fb.b }}>Chargement de la Sphère…</div></div>;

  if (!selectedSub) return (
    <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', fontFamily: Fb.b }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>◎</div>
        <div style={{ color: U.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Vous n'êtes pas encore dans la Sphère</div>
        <div style={{ color: U.muted, marginBottom: 24 }}>Réservez un slot pour rejoindre le réseau mutualiste.</div>
        <a href="/" style={{ background: '#d4a84b', color: '#080808', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Voir la grille</a>
      </div>
    </div>
  );

  const rankCfg = RANK_CONFIG[dashboard?.rank] || RANK_CONFIG.signal;
  const tasksDone = tasks.filter(t => t.completed).length;
  const tasksTotal = tasks.length;
  const allTasksDone = tasksTotal > 0 && tasksDone === tasksTotal;
  const daysBeforeSuspension = dashboard?.days_before_suspension ?? 0;
  const suspensionThreshold = dashboard?.suspension_threshold ?? 5;

  return (
    <div style={{ minHeight: '100vh', background: U.bg, fontFamily: Fb.b }}>
      {isMobile && !mobileDismissed && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(6,6,8,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', marginBottom: 28, background: 'radial-gradient(circle at 40% 40%, #f0b42960 0%, #a855f720 50%, transparent 70%)', border: '1.5px solid rgba(240,180,41,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, boxShadow: '0 0 48px #f0b42920' }}>☀</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f4f4f6', fontFamily: Fb.h, marginBottom: 14, lineHeight: 1.3 }}>Tu penses vraiment canaliser<br />l'énergie de la Sphère avec<br />ton vieux smartphone ?</div>
          <div style={{ fontSize: 15, color: 'rgba(210,220,240,0.70)', lineHeight: 1.7, marginBottom: 32, maxWidth: 300 }}>La Sphère de Dyson est une expérience pensée pour grand écran.</div>
          <button onClick={() => setMobileDismissed(true)} style={{ background: 'rgba(240,180,41,0.12)', color: '#d4a84b', border: '1px solid rgba(240,180,41,0.35)', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: Fb.b }}>Continuer quand même →</button>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? U.err : U.green, color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>{toast.msg}</div>}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ background: `radial-gradient(ellipse at 20% 50%, ${rankCfg.glow} 0%, transparent 60%), ${U.card}`, border: `1px solid ${rankCfg.color}30`, borderRadius: 16, padding: '28px 32px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: U.muted, marginBottom: 10, letterSpacing: '0.14em', fontWeight: 600 }}>SPHÈRE DE DYSON — COCKPIT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 32, lineHeight: 1 }}>{rankCfg.icon}</div>
                <div><RankBadge rank={dashboard?.rank} /><div style={{ fontSize: 13, color: U.muted, marginTop: 6 }}>Slot ({selectedSub.slot_x},{selectedSub.slot_y}) · {selectedSub.tier?.toUpperCase()}</div></div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: rankCfg.color, fontFamily: Fb.h }}>{dashboard?.tasks_streak || 0}</div>
              <div style={{ fontSize: 11, color: U.muted, marginTop: 2 }}>jours consécutifs</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
            <Gauge label="TÂCHES AUJOURD'HUI" value={tasksDone} max={tasksTotal || 1} color={allTasksDone ? U.green : rankCfg.color}/>
            <Gauge label="JOURS AVANT SUSPENSION" value={daysBeforeSuspension} max={suspensionThreshold} color={daysBeforeSuspension <= 1 ? U.err : daysBeforeSuspension <= 2 ? '#f0b429' : U.green}/>
          </div>
          {dashboard?.status === 'suspended' && <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 8, fontSize: 13, color: U.err }}>⚠️ Votre slot est suspendu. Complétez vos tâches pour le réactiver.</div>}
          {allTasksDone && <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 13, color: U.green }}>✓ Toutes vos tâches sont complétées !</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, background: U.s1, borderRadius: 10, padding: 4, marginBottom: 24, border: `1px solid ${U.border}` }}>
          {[{ key:'tasks', label:`Tâches (${tasksDone}/${tasksTotal})` }, { key:'feed', label:'Fil communautaire' }, { key:'subscription', label:'Mon abonnement' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none', background: tab === t.key ? U.card2 : 'transparent', color: tab === t.key ? U.text : U.muted, fontWeight: tab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: Fb.b, transition: 'all 0.15s' }}>{t.label}</button>
          ))}
        </div>
        {tab === 'tasks' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{tasks.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: U.muted }}>Chargement…</div> : tasks.map(task => <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} loading={taskLoading}/>)}</div>}
        {tab === 'feed' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{feed.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: U.muted }}>Le fil est vide.</div> : feed.map(entry => <FeedEntry key={entry.id} entry={entry}/>)}</div>}
        {tab === 'subscription' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[{label:'Prix/jour',value:`${((selectedSub.price_cents_per_day||0)/100).toFixed(2)}€`},{label:'Amplifications',value:dashboard?.total_amplifications||0},{label:'Série active',value:`${dashboard?.tasks_streak||0}j`}].map(stat=>(
                <div key={stat.label} style={{ background:U.card, border:`1px solid ${U.border}`, borderRadius:12, padding:'18px 20px' }}>
                  <div style={{ fontSize:12, color:U.muted, letterSpacing:'0.07em', marginBottom:8, fontWeight:600 }}>{stat.label}</div>
                  <div style={{ fontSize:24, fontWeight:700, color:rankCfg.color, fontFamily:Fb.h }}>{stat.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background:U.card, border:`1px solid ${U.border}`, borderRadius:12, padding:'20px 24px' }}>
              <div style={{ fontSize:14, fontWeight:700, color:U.text, marginBottom:16 }}>Détails de l'abonnement</div>
              {[{label:'Statut',value:dashboard?.status},{label:'Rang',value:RANK_CONFIG[dashboard?.rank]?.label},{label:'Slot',value:`(${selectedSub.slot_x},${selectedSub.slot_y}) · ${selectedSub.tier}`},{label:'Membre depuis',value:new Date(selectedSub.started_at).toLocaleDateString('fr-FR')},{label:'Tâches manquées',value:`${dashboard?.tasks_missed_days||0} / ${dashboard?.suspension_threshold||5} jours`}].map(row=>(
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${U.border}` }}>
                  <span style={{ fontSize:14, color:U.muted }}>{row.label}</span>
                  <span style={{ fontSize:14, fontWeight:600, color:U.text }}>{row.value}</span>
                </div>
              ))}
            </div>
            {dashboard?.status === 'active' && (
              <div style={{ background:U.card, border:`1px solid rgba(224,82,82,0.2)`, borderRadius:12, padding:'20px 24px' }}>
                <div style={{ fontSize:14, fontWeight:700, color:U.text, marginBottom:8 }}>Annuler l'abonnement</div>
                <div style={{ fontSize:14, color:U.muted, marginBottom:16, lineHeight:1.6 }}>L'annulation est immédiate. Votre slot sera affiché en "void" pendant 24h.</div>
                {!cancelConfirm ? <Btn onClick={()=>setCancelConfirm(true)} variant="danger" small>Annuler mon abonnement</Btn> : (
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:13, color:U.err }}>Confirmer ?</span>
                    <Btn onClick={handleCancel} variant="danger" small>Oui, annuler</Btn>
                    <Btn onClick={()=>setCancelConfirm(false)} variant="secondary" small>Non</Btn>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PAGE ROOT — GUARD
// ═══════════════════════════════════════════════════════════════

export default function SpherePage() {
  // null = vérification en cours, true = admin, false = bloqué
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    // Vérifier si token admin stocké
    const stored = localStorage.getItem('ads_admin_token');
    if (stored) {
      verifyToken(stored).then(ok => setIsAdmin(ok));
    } else {
      setIsAdmin(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch('/api/admin?action=stats', {
        headers: { 'x-admin-token': token },
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleAdminBypass = async (pwd) => {
    const ok = await verifyToken(pwd);
    if (ok) {
      localStorage.setItem('ads_admin_token', pwd);
      setIsAdmin(true);
    }
    return ok;
  };

  // Chargement
  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', background: DS.void, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: DS.textLo, letterSpacing: '.20em', animation: 'fadePulse 1.5s ease-in-out infinite' }}>
          VÉRIFICATION ACCÈS…
        </div>
        <style>{`@keyframes fadePulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
      </div>
    );
  }

  // Bloqué → modal travaux
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: DS.void }}>
        <SphereWIPModal
          onWaitlist={() => {}}
          onCapteur={() => { window.location.href = '/capteur'; }}
          onAdminBypass={handleAdminBypass}
        />
      </div>
    );
  }

  // Admin → dashboard complet
  return <SphereDashboardInner />;
}
