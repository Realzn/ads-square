'use client';
// app/SphereWIPModal.jsx — Modal "Sphère en travaux"
// Affiché sur tous les points d'entrée vers /sphere
// Bypass admin via token localStorage 'ads_admin_token'

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
const CLP   = 'polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))';
const CLP_S = 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))';

// ── Hook : vérifie si admin côté client ──────────────────────
export function useSphereAdmin() {
  const [isAdmin, setIsAdmin] = useState(null); // null=loading, true/false

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ads_admin_token');
      if (stored) {
        fetch('/api/admin?action=stats', { headers: { 'x-admin-token': stored } })
          .then(r => setIsAdmin(r.ok))
          .catch(() => setIsAdmin(false));
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const verifyAndStore = async (token) => {
    try {
      const res = await fetch('/api/admin?action=stats', { headers: { 'x-admin-token': token } });
      if (res.ok) {
        localStorage.setItem('ads_admin_token', token);
        setIsAdmin(true);
        return true;
      }
    } catch {}
    return false;
  };

  return { isAdmin, verifyAndStore };
}

// ── Composant modal ──────────────────────────────────────────
export default function SphereWIPModal({ onClose }) {
  const [email, setEmail]               = useState('');
  const [submitted, setSubmitted]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [pwd, setPwd]                   = useState('');
  const [adminErr, setAdminErr]         = useState('');
  const [tick, setTick]                 = useState(0);

  const { verifyAndStore } = useSphereAdmin();

  // Rotation orbe
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 50);
    return () => clearInterval(t);
  }, []);

  const angle = (tick * 0.35) % 360;

  const submitWaitlist = async () => {
    if (!email.includes('@') || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'sphere_wip' }),
      });
    } catch (_) {}
    setSubmitting(false);
    setSubmitted(true);
  };

  const tryAdmin = async () => {
    setAdminErr('');
    const ok = await verifyAndStore(pwd);
    if (ok) {
      // Admin confirmé → naviguer vers /sphere
      window.location.href = '/sphere';
    } else {
      setAdminErr('Code invalide');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,1,8,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          cursor: onClose ? 'pointer' : 'default',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', maxWidth: 540,
          background: DS.glass,
          border: `1px solid ${DS.brdHi}`,
          clipPath: CLP,
          padding: '48px 44px 40px',
          position: 'relative',
          overflow: 'hidden',
          pointerEvents: 'all',
          boxShadow: `0 0 80px rgba(0,200,240,0.06), 0 0 160px rgba(232,160,32,0.04)`,
        }}>

          {/* Lignes déco haut/bas */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${DS.cyan}80,${DS.gold}60,transparent)` }}/>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${DS.gold}50,transparent)` }}/>

          {/* Orbe décoratif animé */}
          <div style={{ position:'absolute', top:-100, right:-100, width:260, height:260, pointerEvents:'none', zIndex:0 }}>
            {[
              { r:100, col:DS.gold+'28', phase:0 },
              { r:76,  col:DS.cyan+'1a', phase:55 },
              { r:54,  col:DS.violet+'22', phase:-28 },
            ].map(({ r, col, phase }, i) => (
              <div key={i} style={{
                position:'absolute', top:'50%', left:'50%',
                width:r*2, height:r*2,
                transform:`translate(-50%,-50%) rotate(${angle+phase}deg)`,
                border:`1px solid ${col}`, borderRadius:'50%',
              }}/>
            ))}
            {/* Losange central */}
            <div style={{
              position:'absolute', top:'50%', left:'50%',
              width:16, height:16, background:DS.gold+'50',
              clipPath:'polygon(50% 0,100% 50%,50% 100%,0 50%)',
              transform:`translate(-50%,-50%) rotate(${angle*1.4}deg)`,
            }}/>
          </div>

          {/* Bouton fermer (si onClose disponible) */}
          {onClose && (
            <button onClick={onClose} style={{
              position:'absolute', top:16, right:20,
              background:'transparent', border:'none',
              fontFamily:F.mono, fontSize:13, color:DS.textLo,
              cursor:'pointer', lineHeight:1, padding:'2px 6px',
              transition:'color .15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.color=DS.textMid}
            onMouseLeave={e=>e.currentTarget.style.color=DS.textLo}>
              ×
            </button>
          )}

          <div style={{ position:'relative', zIndex:1 }}>

            {/* Badges statut */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:26 }}>
              <div style={{
                display:'flex', alignItems:'center', gap:7,
                background:DS.gold+'14', border:`1px solid ${DS.gold}55`,
                clipPath:CLP_S, padding:'4px 12px',
                fontFamily:F.mono, fontSize:8, color:DS.gold, letterSpacing:'.18em',
              }}>
                <span style={{ width:6, height:6, background:DS.gold, borderRadius:'50%', display:'inline-block', animation:'wipPulse 2s ease-in-out infinite' }}/>
                EN CONSTRUCTION
              </div>
              <div style={{
                display:'flex', alignItems:'center', gap:5,
                background:DS.rose+'0e', border:`1px solid ${DS.rose}35`,
                clipPath:CLP_S, padding:'4px 10px',
                fontFamily:F.mono, fontSize:7.5, color:DS.rose, letterSpacing:'.14em',
              }}>
                ACCÈS RESTREINT
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom:6 }}>
              <div style={{ fontFamily:F.ui, fontSize:34, fontWeight:900, color:DS.textHi, letterSpacing:'-0.01em', lineHeight:1 }}>
                SPHÈRE DE DYSON
              </div>
              <div style={{ fontFamily:F.mono, fontSize:8.5, color:DS.gold, letterSpacing:'.24em', fontWeight:700, marginTop:6 }}>
                ⚙ OUVERTURE PROCHAINE
              </div>
            </div>

            {/* Séparateur */}
            <div style={{ height:1, background:`linear-gradient(90deg,${DS.cyan}35,${DS.gold}20,transparent)`, margin:'18px 0' }}/>

            {/* Description */}
            <div style={{ fontFamily:F.mono, fontSize:9.5, color:DS.textMid, lineHeight:2.1, letterSpacing:'.04em', marginBottom:22 }}>
              Le réseau mutualiste et cockpit membres sont en cours de déploiement.
              <br/>
              <span style={{ color:DS.textHi }}>Rejoignez la liste d'attente</span> — vous serez notifié en priorité à l'ouverture.
            </div>

            {/* Waitlist form */}
            {!submitted ? (
              <div style={{ marginBottom:22 }}>
                <div style={{ fontFamily:F.mono, fontSize:7.5, color:DS.textLo, letterSpacing:'.18em', marginBottom:8 }}>
                  LISTE D'ATTENTE · PRIORITAIRE
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitWaitlist()}
                    placeholder="votre@email.com"
                    type="email"
                    style={{
                      flex:1, background:'rgba(0,8,24,.95)',
                      border:`1px solid ${DS.brd}`, color:DS.textHi,
                      fontFamily:F.mono, fontSize:11, padding:'10px 13px',
                      outline:'none', clipPath:CLP_S, transition:'border-color .15s',
                    }}
                    onFocus={e=>e.target.style.borderColor=DS.gold+'80'}
                    onBlur={e=>e.target.style.borderColor=DS.brd}
                  />
                  <button
                    onClick={submitWaitlist}
                    disabled={!email.includes('@') || submitting}
                    style={{
                      background: submitting ? DS.gold+'80' : DS.gold+'cc',
                      color:DS.void, border:`1px solid ${DS.gold}`,
                      fontFamily:F.mono, fontSize:9, fontWeight:800, letterSpacing:'.16em',
                      padding:'10px 18px', cursor:'pointer', clipPath:CLP_S,
                      transition:'all .15s',
                      opacity: email.includes('@') ? 1 : 0.4,
                    }}
                    onMouseEnter={e=>{ if(email.includes('@')) e.currentTarget.style.background=DS.gold; }}
                    onMouseLeave={e=>e.currentTarget.style.background=DS.gold+'cc'}
                  >
                    {submitting ? '…' : 'REJOINDRE →'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                marginBottom:22, display:'flex', alignItems:'center', gap:12,
                background:DS.green+'0e', border:`1px solid ${DS.green}45`,
                clipPath:CLP_S, padding:'13px 18px',
              }}>
                <span style={{ color:DS.green, fontSize:16 }}>◈</span>
                <div>
                  <div style={{ fontFamily:F.mono, fontSize:9, color:DS.green, fontWeight:700, letterSpacing:'.16em' }}>SIGNAL ENREGISTRÉ</div>
                  <div style={{ fontFamily:F.mono, fontSize:8, color:DS.textLo, letterSpacing:'.08em', marginTop:3 }}>Notification à l'ouverture de la Sphère.</div>
                </div>
              </div>
            )}

            {/* Séparateur + CTA Capteur */}
            <div style={{ height:1, background:`linear-gradient(90deg,transparent,${DS.brd},transparent)`, marginBottom:16 }}/>
            <div style={{ fontFamily:F.mono, fontSize:7.5, color:DS.textLo, letterSpacing:'.16em', marginBottom:10 }}>
              EN ATTENDANT — DISPONIBLE MAINTENANT
            </div>
            <a href="/capteur" style={{ textDecoration:'none', display:'block' }}>
              <div style={{
                width:'100%', background:'transparent',
                border:`1px solid ${DS.cyan}55`, color:DS.cyan,
                fontFamily:F.mono, fontSize:10, fontWeight:700, letterSpacing:'.14em',
                padding:'13px 20px', cursor:'pointer', clipPath:CLP_S,
                transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background=DS.cyan+'0e'; e.currentTarget.style.borderColor=DS.cyan; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=DS.cyan+'55'; }}>
                <span style={{ fontSize:13 }}>⚡</span>
                PROMOUVOIR SUR LE CAPTEUR · 1€/s
              </div>
            </a>
            <div style={{ fontFamily:F.mono, fontSize:7.5, color:DS.textLo, letterSpacing:'.08em', marginTop:7, textAlign:'center' }}>
              Diffusion broadcast · panneau disponible maintenant
            </div>

            {/* Footer : retour + admin */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:22 }}>
              <Link href="/" style={{ textDecoration:'none' }}>
                <div style={{
                  fontFamily:F.mono, fontSize:8, color:DS.textLo,
                  letterSpacing:'.12em', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:5, transition:'color .15s',
                }}
                onMouseEnter={e=>e.currentTarget.style.color=DS.textMid}
                onMouseLeave={e=>e.currentTarget.style.color=DS.textLo}>
                  ← GRILLE PRINCIPALE
                </div>
              </Link>

              {/* Admin entry point — discret */}
              {!showAdminForm ? (
                <button onClick={() => setShowAdminForm(true)} style={{
                  background:'transparent', border:'none',
                  fontFamily:F.mono, fontSize:7, color:DS.textLo+'55',
                  letterSpacing:'.12em', cursor:'pointer', padding:'2px 4px',
                  transition:'color .15s',
                }}
                onMouseEnter={e=>e.currentTarget.style.color=DS.textLo}
                onMouseLeave={e=>e.currentTarget.style.color=DS.textLo+'55'}>
                  ◈ ADMIN
                </button>
              ) : (
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input
                    value={pwd}
                    onChange={e => setPwd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && tryAdmin()}
                    type="password"
                    placeholder="Code d'accès"
                    autoFocus
                    style={{
                      background:'rgba(0,8,24,.95)',
                      border:`1px solid ${adminErr ? DS.rose : DS.brd}`,
                      color:DS.textHi, fontFamily:F.mono, fontSize:9,
                      padding:'5px 9px', outline:'none', clipPath:CLP_S,
                      width:140, transition:'border-color .15s',
                    }}
                  />
                  <button onClick={tryAdmin} style={{
                    background:DS.cyan+'14', border:`1px solid ${DS.cyan}55`,
                    color:DS.cyan, fontFamily:F.mono, fontSize:8, fontWeight:700,
                    letterSpacing:'.10em', padding:'5px 10px',
                    cursor:'pointer', clipPath:CLP_S, transition:'all .15s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=DS.cyan+'25'}
                  onMouseLeave={e=>e.currentTarget.style.background=DS.cyan+'14'}>
                    ENTRER
                  </button>
                  <button onClick={()=>{ setShowAdminForm(false); setAdminErr(''); setPwd(''); }} style={{
                    background:'transparent', border:'none', color:DS.textLo,
                    fontFamily:F.mono, fontSize:11, cursor:'pointer', padding:'0 4px',
                  }}>×</button>
                  {adminErr && (
                    <span style={{ fontFamily:F.mono, fontSize:7.5, color:DS.rose, letterSpacing:'.08em' }}>
                      {adminErr}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wipPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}
      `}</style>
    </>
  );
}
