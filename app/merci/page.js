'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn, getSession } from '../../lib/supabase-auth';
import { getTier, TIER_LABEL, TIER_COLOR, TIER_PRICE } from '../../lib/grid';

const C = {
  bg:      '#020609',
  surface: '#080e14',
  card:    '#0c1520',
  border:  'rgba(0,180,220,0.10)',
  borderHi:'rgba(0,180,220,0.22)',
  text:    '#e8f0f8',
  muted:   'rgba(160,195,225,0.55)',
  dim:     'rgba(100,145,185,0.35)',
  cyan:    '#00C8E4',
  gold:    '#E8A020',
  green:   '#00D880',
  rose:    '#E03558',
};
const T = {
  h:    "'Rajdhani', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

const TIER_ICONS = { epicenter:'✦', prestige:'◯', elite:'⊕', business:'▣', standard:'▪', viral:'⚡' };

function Step({ num, label, sub, done, active }) {
  const col = done ? C.green : active ? C.gold : C.dim;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}`, opacity: !done && !active ? .45 : 1 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
        background: col + '14', border: `1px solid ${col}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: col, fontFamily: T.mono,
      }}>
        {done ? '✓' : num}
      </div>
      <div>
        <div style={{ color: active || done ? C.text : C.muted, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{label}</div>
        <div style={{ color: C.dim, fontSize: 12 }}>{sub}</div>
      </div>
    </div>
  );
}

function PasswordSetup({ email, onDone }) {
  const [password, setPass] = useState('');
  const [confirm,  setConf] = useState('');
  const [loading,  setLoad] = useState(false);
  const [error,    setErr]  = useState('');

  const handleSubmit = async e => {
    e.preventDefault(); setErr('');
    if (password.length < 6) { setErr('Minimum 6 caractères.'); return; }
    if (password !== confirm) { setErr('Mots de passe différents.'); return; }
    setLoad(true);
    try {
      try { await signUp({ email, password }); }
      catch (e) {
        if (e.message?.includes('already registered')) await signIn({ email, password });
        else throw e;
      }
      onDone();
    } catch (e) {
      setErr(e.message === 'Invalid login credentials' ? 'Mot de passe incorrect pour ce compte.' : e.message);
    } finally { setLoad(false); }
  };

  const inp = (foc) => ({
    width: '100%', padding: '11px 14px',
    background: C.surface, border: `1px solid ${C.borderHi}`,
    borderRadius: 8, color: C.text, fontSize: 13, fontFamily: T.h,
    outline: 'none', boxSizing: 'border-box',
  });

  return (
    <div style={{ background: C.gold + '08', border: `1px solid ${C.gold}25`, borderRadius: 10, padding: '18px 20px', marginTop: 4 }}>
      <div style={{ color: C.gold, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', marginBottom: 6 }}>ÉTAPE 2 — CRÉER VOTRE COMPTE</div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>Choisissez un mot de passe pour accéder à votre espace et personnaliser votre bloc.</p>

      <div style={{ padding: '9px 12px', background: C.card, borderRadius: 7, border: `1px solid ${C.border}`, marginBottom: 14, color: C.muted, fontSize: 12, fontFamily: T.mono, display: 'flex', gap: 8 }}>
        <span style={{ color: C.gold }}>@</span> {email}
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: '9px 12px', borderRadius: 7, background: C.rose + '10', border: `1px solid ${C.rose}25`, color: C.rose, fontSize: 12 }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="password" value={password} onChange={e => setPass(e.target.value)} required minLength={6}
          placeholder="Mot de passe (min. 6 caractères)" style={inp(false)} />
        <input type="password" value={confirm} onChange={e => setConf(e.target.value)} required
          placeholder="Confirmer le mot de passe" style={{ ...inp(false), borderColor: confirm && confirm !== password ? C.rose + '50' : C.borderHi }} />
        <button type="submit" disabled={loading} style={{
          padding: '12px', borderRadius: 9, border: 'none',
          background: loading ? C.surface : C.gold,
          color: loading ? C.dim : '#0a0600',
          fontFamily: T.mono, fontWeight: 700, fontSize: 13,
          cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '.08em', transition: 'all .15s',
          boxShadow: loading ? 'none' : `0 0 18px ${C.gold}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading
            ? <><span style={{ width: 12, height: 12, border: `2px solid ${C.dim}`, borderTop: `2px solid ${C.gold}`, borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} /> Création…</>
            : 'Créer mon compte →'
          }
        </button>
      </form>
    </div>
  );
}

function MerciContent() {
  const params     = useSearchParams();
  const slot       = params.get('slot');
  const emailParam = params.get('email');

  const [coords, setCoords]   = useState(null);
  const [tier,   setTier]     = useState(null);
  const [email,  setEmail]    = useState('');
  const [done,   setDone]     = useState(false);
  const [alreadyAuth, setAuth] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (slot) {
      const [x, y] = slot.split('-').map(Number);
      setCoords({ x, y });
      setTier(getTier(x, y));
    }
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    getSession().then(s => { if (s) setAuth(true); });
    setTimeout(() => setMounted(true), 60);
  }, [slot, emailParam]);

  const showPassword     = !alreadyAuth && !done && !!email;
  const showDashboardBtn = alreadyAuth || done || !email;
  const tierColor        = tier ? TIER_COLOR[tier] : C.gold;
  const tierLabel        = tier ? TIER_LABEL[tier] : 'Annonceur';
  const tierIcon         = tier ? TIER_ICONS[tier] : '✦';

  return (
    <div style={{
      width: '100%', maxWidth: 480,
      opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)',
      transition: 'opacity .45s ease, transform .45s ease',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes checkPop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeUp .4s ease' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
          background: C.green + '14', border: `1.5px solid ${C.green}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: C.green,
          animation: 'checkPop .5s cubic-bezier(0.34,1.56,0.64,1) .1s both',
          boxShadow: `0 0 24px ${C.green}28`,
        }}>✓</div>

        <div style={{ color: C.green, fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '.18em', marginBottom: 10 }}>
          PAIEMENT CONFIRMÉ
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: '0 0 8px', fontFamily: T.h, letterSpacing: '.02em' }}>
          Votre bloc est réservé !
        </h1>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Bienvenue sur Dyson Cosmos. Personnalisez votre espace pour apparaître sur la Sphère.
        </p>
      </div>

      {/* Bloc card */}
      {coords && (
        <div style={{
          background: C.card, borderRadius: 14, border: `1px solid ${tierColor}30`,
          padding: '18px 20px', marginBottom: 16,
          boxShadow: `0 0 32px ${tierColor}10`,
          animation: 'fadeUp .4s .1s ease both',
        }}>
          <div style={{ height: 1.5, background: `linear-gradient(90deg, transparent, ${tierColor}, transparent)`, margin: '-18px -20px 16px', borderRadius: '14px 14px 0 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
              background: tierColor + '14', border: `2px solid ${tierColor}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: tierColor,
              boxShadow: `0 0 20px ${tierColor}30`,
            }}>{tierIcon}</div>
            <div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 4, fontFamily: T.h }}>
                Bloc {tierLabel}
              </div>
              <div style={{ color: C.dim, fontSize: 12, fontFamily: T.mono, marginBottom: 6 }}>
                ({coords.x}, {coords.y}) · Position sur la Sphère
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'block', animation: 'pulse 2s infinite' }} />
                <span style={{ color: C.green, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '.10em' }}>RÉSERVÉ</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '22px', marginBottom: 14,
        animation: 'fadeUp .4s .15s ease both',
      }}>
        {/* Steps */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.dim, fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '.14em', marginBottom: 4 }}>
            PROCHAINES ÉTAPES
          </div>
          <Step num={1} label="Paiement confirmé" sub="Votre bloc est réservé" done active={false} />
          <Step num={2} label="Créer votre compte" sub="Accéder à l'espace annonceur" done={done || alreadyAuth} active={showPassword} />
          <Step num={3} label="Personnaliser le bloc" sub="Logo, lien, slogan, couleurs…" done={false} active={!showPassword && (done || alreadyAuth)} />
          <div style={{ borderBottom: 'none' }}>
            <Step num={4} label="Publié sur la Sphère" sub="Visible de tous les visiteurs" done={false} active={false} />
          </div>
        </div>

        {/* Password setup */}
        {showPassword && <PasswordSetup email={email} onDone={() => setDone(true)} />}

        {done && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: C.green + '0e', border: `1px solid ${C.green}25`, color: C.green, fontSize: 13, textAlign: 'center', marginBottom: 14, fontFamily: T.mono, letterSpacing: '.06em' }}>
            ✓ Compte créé — connexion active
          </div>
        )}

        {/* CTA */}
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderRadius: 10,
          background: showDashboardBtn ? C.gold : 'transparent',
          color: showDashboardBtn ? '#0a0600' : C.gold,
          border: `1px solid ${showDashboardBtn ? 'transparent' : C.gold + '40'}`,
          fontWeight: 700, fontSize: 13, fontFamily: T.mono, letterSpacing: '.08em',
          boxShadow: showDashboardBtn ? `0 0 20px ${C.gold}35` : 'none',
          transition: 'all .15s',
        }}>
          <span>{showDashboardBtn ? 'Personnaliser mon bloc →' : 'Accéder après connexion'}</span>
          <span>◈</span>
        </Link>
      </div>

      {/* Ce que vous pouvez configurer */}
      <div style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '18px 20px', marginBottom: 14,
        animation: 'fadeUp .4s .2s ease both',
      }}>
        <div style={{ color: C.dim, fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '.14em', marginBottom: 14 }}>
          CE QUE VOUS POUVEZ CONFIGURER
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['▣', 'Logo ou image'],
            ['⌖', 'Lien de destination'],
            ['≡', 'Slogan / texte'],
            ['⊕', 'Réseaux sociaux'],
            ['⚡', 'Boost de visibilité'],
            ['◈', 'Stats en temps réel'],
          ].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 7, background: C.surface, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.gold, fontSize: 13 }}>{icon}</span>
              <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', animation: 'fadeUp .4s .25s ease both' }}>
        <p style={{ color: C.dim, fontSize: 11, fontFamily: T.mono, letterSpacing: '.08em' }}>
          Email de confirmation envoyé ·{' '}
          <Link href="/" style={{ color: C.dim }}>Retour à la grille</Link>
        </p>
      </div>
    </div>
  );
}

export default function MerciPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#020609',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(rgba(0,180,220,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,220,0.022) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: `radial-gradient(ellipse, #00D88006 0%, transparent 65%)`, pointerEvents: 'none' }} />

      <Suspense fallback={<div style={{ color: 'rgba(100,145,185,0.4)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em' }}>CHARGEMENT…</div>}>
        <MerciContent />
      </Suspense>

      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }`}</style>
    </div>
  );
}
