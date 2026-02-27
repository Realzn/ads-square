'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn, getSession } from '../../lib/supabase-auth';
import { getTier, TIER_LABEL, TIER_COLOR, TIER_PRICE } from '../../lib/grid';

// ─── Design System · DYSON COSMOS ─────────────────────────────
const DS = {
  void:    '#01020A',
  s1:      'rgba(0,4,16,0.98)',
  s2:      'rgba(0,8,24,0.97)',
  card:    'rgba(1,6,20,0.96)',
  border:  'rgba(0,200,240,0.10)',
  border2: 'rgba(0,200,240,0.20)',
  text:    '#DDE6F2',
  muted:   'rgba(140,180,220,0.60)',
  faint:   'rgba(0,200,240,0.04)',
  gold:    '#E8A020',
  goldFg:  '#01020A',
  cyan:    '#00C8E4',
  green:   '#00D880',
  red:     '#D02848',
};
const F = {
  h:    "'Rajdhani','Sora',system-ui,sans-serif",
  b:    "'Rajdhani','Sora',system-ui,sans-serif",
  mono: "'JetBrains Mono','Fira Code',monospace",
};

// ─── Helpers ────────────────────────────────────────────────────
function ScanLine() {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
      <div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(0,200,240,0.12),transparent)', animation:'scanMove 8s linear infinite' }}/>
    </div>
  );
}

// ─── Mini bloc preview ──────────────────────────────────────────
function BlockPreview({ tier, x, y }) {
  const c     = TIER_COLOR[tier] || DS.gold;
  const label = (TIER_LABEL[tier] || tier).toUpperCase();

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:16, padding:'16px 18px',
      background:`${c}08`, border:`0.5px solid ${c}30`,
      clipPath:'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
      marginBottom:20, position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${c}40,transparent)` }}/>
      <div style={{ flexShrink:0, position:'relative' }}>
        <div style={{
          width:52, height:52,
          clipPath:'polygon(15% 0,85% 0,100% 15%,100% 85%,85% 100%,15% 100%,0 85%,0 15%)',
          background:`${c}18`, border:`1.5px solid ${c}`,
          boxShadow:`0 0 20px ${c}40`,
          animation:'blockPulse 2s ease-in-out infinite',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20, color:c, fontFamily:F.mono,
        }}>◈</div>
        <div style={{
          position:'absolute', top:-6, right:-6,
          background:c, color:DS.goldFg, fontSize:6, fontWeight:800,
          fontFamily:F.mono, letterSpacing:'.08em',
          padding:'2px 5px',
          clipPath:'polygon(0 0,calc(100% - 3px) 0,100% 3px,100% 100%,0 100%)',
        }}>{label}</div>
      </div>
      <div>
        <div style={{ color:DS.text, fontWeight:700, fontSize:14, fontFamily:F.mono, marginBottom:3, letterSpacing:'.06em' }}>
          BLOC·{label}
        </div>
        <div style={{ color:DS.muted, fontSize:11, fontFamily:F.mono, marginBottom:5, letterSpacing:'.04em' }}>
          ({x},{y}) · ACTIF
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:DS.green, boxShadow:`0 0 6px ${DS.green}`, animation:'blink 1.5s infinite' }} />
          <span style={{ color:DS.green, fontSize:10, fontWeight:700, fontFamily:F.mono, letterSpacing:'.10em' }}>RÉSERVÉ</span>
        </div>
      </div>
    </div>
  );
}

// ─── Étapes ─────────────────────────────────────────────────────
function NextSteps({ showPassword, done }) {
  const steps = [
    { label:'PAIEMENT CONFIRMÉ',      sub:'Votre bloc est réservé', done:true,  active:false },
    { label:'CRÉER VOTRE COMPTE',     sub:'Pour accéder au dashboard', done:done, active:showPassword&&!done },
    { label:'PERSONNALISER LE BLOC',  sub:'Logo, lien, slogan, couleurs…', done:false, active:!showPassword||done },
    { label:'PUBLIÉ SUR LA GRILLE',   sub:'Visible de tous les visiteurs', done:false, active:false },
  ];
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:9, fontWeight:700, color:DS.muted, letterSpacing:'.16em', marginBottom:12, fontFamily:F.mono }}>PROCHAINES·ÉTAPES</div>
      {steps.map((s, i) => (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:11, padding:'9px 0', borderBottom:i<steps.length-1?`0.5px solid ${DS.border}`:'none', opacity:!s.done&&!s.active?0.35:1 }}>
          <div style={{
            width:22, height:22, flexShrink:0, marginTop:1,
            clipPath:'polygon(15% 0,85% 0,100% 15%,100% 85%,85% 100%,15% 100%,0 85%,0 15%)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:9, fontWeight:800, fontFamily:F.mono,
            background: s.done?`${DS.green}18`:s.active?`${DS.gold}18`:DS.faint,
            border:`0.5px solid ${s.done?DS.green:s.active?DS.gold:DS.border2}`,
            color: s.done?DS.green:s.active?DS.gold:DS.muted,
          }}>
            {s.done?'✓':i+1}
          </div>
          <div>
            <div style={{ color:s.active?DS.text:s.done?DS.muted:DS.muted, fontWeight:s.active?700:500, fontSize:12, fontFamily:F.mono, letterSpacing:'.06em' }}>{s.label}</div>
            <div style={{ color:DS.muted, fontSize:10, marginTop:2, fontFamily:F.mono }}>{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Setup mot de passe ─────────────────────────────────────────
function PasswordSetup({ email, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState('');

  const inpSt = (f, err=false) => ({
    width:'100%', padding:'11px 13px',
    background:'rgba(0,4,14,0.80)',
    border:`0.5px solid ${err?DS.red:f?DS.gold:DS.border2}`,
    color:DS.text, fontSize:12, outline:'none',
    fontFamily:F.mono, boxSizing:'border-box', transition:'border-color 0.2s',
    letterSpacing:'.04em',
    clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)',
  });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (password.length < 6) { setError('Minimum 6 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      try { await signUp({ email, password }); }
      catch (err) {
        if (err.message?.includes('already registered') || err.message?.includes('already been registered')) {
          await signIn({ email, password });
        } else throw err;
      }
      onDone();
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Mot de passe incorrect pour ce compte existant.' : err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background:`${DS.gold}08`, border:`0.5px solid ${DS.gold}25`, padding:'18px 20px', marginBottom:14, clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)' }}>
      <div style={{ fontSize:9, fontWeight:700, color:DS.gold, letterSpacing:'.16em', marginBottom:5, fontFamily:F.mono }}>ÉTAPE·2 — ACCÈS·ESPACE·CLIENT</div>
      <p style={{ color:DS.muted, fontSize:11, margin:'0 0 12px', lineHeight:1.6, fontFamily:F.b }}>
        Choisissez un mot de passe pour gérer et personnaliser votre bloc.
      </p>
      <div style={{ padding:'8px 12px', background:'rgba(0,4,14,0.80)', border:`0.5px solid ${DS.border2}`, color:DS.text, fontSize:11, marginBottom:10, display:'flex', alignItems:'center', gap:7, fontFamily:F.mono, clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)' }}>
        <span style={{ color:DS.gold }}>✉</span> {email}
      </div>
      {error && (
        <div style={{ background:`${DS.red}12`, border:`0.5px solid ${DS.red}40`, padding:'8px 12px', marginBottom:10, color:DS.red, fontSize:11, fontFamily:F.mono }}>{error}</div>
      )}
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <input type="password" value={password} required minLength={6}
          onChange={e => setPassword(e.target.value)}
          onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
          placeholder="Mot de passe (min. 6 caractères)" style={inpSt(focused==='pw')} />
        <input type="password" value={confirm} required
          onChange={e => setConfirm(e.target.value)}
          onFocus={() => setFocused('cf')} onBlur={() => setFocused('')}
          placeholder="Confirmer le mot de passe"
          style={inpSt(focused==='cf', confirm&&confirm!==password)} />
        <button type="submit" disabled={loading} style={{
          padding:'12px', background:loading?`${DS.gold}40`:DS.gold,
          color:DS.goldFg, border:'none', fontWeight:700, fontSize:12,
          cursor:loading?'not-allowed':'pointer', fontFamily:F.mono,
          marginTop:2, letterSpacing:'.12em',
          boxShadow:loading?'none':`0 0 18px ${DS.gold}40`,
          clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))',
        }}>
          {loading ? 'CRÉATION DU COMPTE…' : 'CRÉER MON COMPTE →'}
        </button>
      </form>
    </div>
  );
}

// ─── Contenu principal ──────────────────────────────────────────
function MerciContent() {
  const params     = useSearchParams();
  const slot       = params.get('slot');
  const emailParam = params.get('email');

  const [coords, setCoords]    = useState(null);
  const [tier,   setTier]      = useState(null);
  const [email,  setEmail]     = useState('');
  const [done,   setDone]      = useState(false);
  const [alreadyAuth, setAuth] = useState(false);

  useEffect(() => {
    if (slot) {
      const [x, y] = slot.split('-').map(Number);
      setCoords({ x, y });
      setTier(getTier(x, y));
    }
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    getSession().then(s => { if (s) setAuth(true); });
  }, [slot, emailParam]);

  const showPassword     = !alreadyAuth && !done && !!email;
  const showDashboardBtn = alreadyAuth || done || (!email);
  const tierColor        = tier ? TIER_COLOR[tier] : DS.gold;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes blockPulse {
          0%,100% { box-shadow:0 0 20px ${tierColor}50,0 0 40px ${tierColor}20; }
          50%      { box-shadow:0 0 36px ${tierColor}80,0 0 64px ${tierColor}35; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes checkPop {
          0%   { transform:scale(0); opacity:0; }
          70%  { transform:scale(1.15); }
          100% { transform:scale(1); opacity:1; }
        }
        @keyframes scanMove { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.2} }
        *{ box-sizing:border-box; }
      `}</style>

      <div style={{ maxWidth:480, width:'100%', animation:'fadeUp 0.4s ease forwards' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:52, height:52,
            clipPath:'polygon(15% 0,85% 0,100% 15%,100% 85%,85% 100%,15% 100%,0 85%,0 15%)',
            background:`${DS.green}14`, border:`1.5px solid ${DS.green}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', fontSize:20, color:DS.green,
            animation:'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
            boxShadow:`0 0 24px ${DS.green}30`,
          }}>✓</div>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.18em', color:DS.gold, marginBottom:8, fontFamily:F.mono }}>
            PAIEMENT·CONFIRMÉ
          </div>
          <h1 style={{ fontSize:24, fontWeight:700, color:DS.text, margin:'0 0 8px', fontFamily:F.h, letterSpacing:'.04em' }}>
            Votre bloc est réservé !
          </h1>
          <p style={{ color:DS.muted, fontSize:13, lineHeight:1.6, margin:0, fontFamily:F.b }}>
            Bienvenue sur DYSON·COSMOS. Personnalisez votre bloc pour apparaître sur la grille orbitale.
          </p>
        </div>

        {/* Card principale */}
        <div style={{
          background:DS.card, border:`0.5px solid ${DS.border2}`,
          clipPath:'polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))',
          padding:'22px 22px 18px', marginBottom:10,
          position:'relative', overflow:'hidden',
          boxShadow:`0 0 60px ${tierColor}08`,
        }}>
          <ScanLine/>
          {/* Top energy bar */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'1.5px', background:`linear-gradient(90deg,transparent,${tierColor},${tierColor}88,transparent)`, boxShadow:`0 0 8px ${tierColor}` }}/>
          <div style={{ position:'relative', zIndex:1 }}>
            {coords && tier && <BlockPreview tier={tier} x={coords.x} y={coords.y} />}
            {coords && !tier && (
              <div style={{ padding:'12px 14px', background:DS.s2, marginBottom:16, color:DS.muted, fontSize:12, fontFamily:F.mono, clipPath:'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)' }}>
                BLOC ({coords.x},{coords.y}) · ACTIF
              </div>
            )}

            <NextSteps showPassword={showPassword} done={done} />
            {showPassword && <PasswordSetup email={email} onDone={() => setDone(true)} />}

            {done && (
              <div style={{ background:`${DS.green}0e`, border:`0.5px solid ${DS.green}30`, padding:'9px 14px', marginBottom:12, color:DS.green, fontSize:12, textAlign:'center', fontFamily:F.mono, letterSpacing:'.06em' }}>
                ✓ COMPTE·CRÉÉ — CONNEXION·ACTIVE
              </div>
            )}

            {/* CTA */}
            <Link href="/dashboard" style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'13px 16px',
              background: showDashboardBtn ? DS.gold : `${DS.gold}15`,
              color: showDashboardBtn ? DS.goldFg : DS.gold,
              border: `0.5px solid ${showDashboardBtn ? 'transparent' : DS.gold+'40'}`,
              fontWeight:700, fontSize:13, textDecoration:'none',
              fontFamily:F.mono, letterSpacing:'.08em',
              boxShadow:showDashboardBtn?`0 0 20px ${DS.gold}40`:'none',
              clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))',
            }}>
              <span>{showDashboardBtn ? 'PERSONNALISER MON BLOC →' : 'ACCÉDER AU DASHBOARD APRÈS CONNEXION'}</span>
              <span>◈</span>
            </Link>

            {!showDashboardBtn && !showPassword && (
              <p style={{ color:DS.muted, fontSize:10, textAlign:'center', margin:'9px 0 0', fontFamily:F.mono, letterSpacing:'.06em' }}>
                Connectez-vous avec l'email utilisé lors du paiement.
              </p>
            )}
          </div>
        </div>

        {/* Ce que vous pouvez configurer */}
        <div style={{
          background:DS.card, border:`0.5px solid ${DS.border}`,
          clipPath:'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)',
          padding:'14px 18px', marginBottom:10,
          position:'relative', overflow:'hidden',
        }}>
          <ScanLine/>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:9, fontWeight:700, color:DS.muted, letterSpacing:'.16em', marginBottom:12, fontFamily:F.mono }}>CE·QUE·VOUS·POUVEZ·CONFIGURER</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
              {[
                ['◻','Logo ou image'],['⌖','Lien de destination'],
                ['≡','Slogan / texte'],['⊕','Réseaux sociaux'],
                ['⚡','Boost de visibilité'],['📊','Stats temps réel'],
              ].map(([icon,label]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:DS.faint, border:`0.5px solid ${DS.border}` }}>
                  <span style={{ fontSize:12 }}>{icon}</span>
                  <span style={{ color:DS.muted, fontSize:11, fontFamily:F.b }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ color:'rgba(140,180,220,0.20)', fontSize:10, textAlign:'center', margin:0, lineHeight:1.6, fontFamily:F.mono, letterSpacing:'.06em' }}>
          EMAIL DE CONFIRMATION ENVOYÉ ·{' '}
          <Link href="/" style={{ color:'rgba(0,200,240,0.25)', textDecoration:'none' }}>
            RETOUR·À·LA·GRILLE
          </Link>
        </p>
      </div>
    </>
  );
}

export default function MerciPage() {
  return (
    <div style={{ minHeight:'100vh', background:DS.void, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:F.b, padding:'32px 20px' }}>
      <Suspense fallback={<div style={{ color:'rgba(140,180,220,0.30)', fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:'.12em' }}>CHARGEMENT…</div>}>
        <MerciContent />
      </Suspense>
    </div>
  );
}

