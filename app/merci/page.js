'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn, getSession } from '../../lib/supabase-auth';
import { getTier, TIER_LABEL, TIER_COLOR, TIER_PRICE } from '../../lib/grid';

const U = {
  bg: '#080808', card: '#111111', s1: '#0f0f0f', s2: '#151515',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)',
  accent: '#d4a84b', accentFg: '#080808', green: '#22c55e', err: '#e05252',
};
const F = { h: "'Clash Display','Syne',sans-serif", b: "'DM Sans','Inter',sans-serif" };

const inp = (focused) => ({
  width: '100%', padding: '12px 15px', background: U.s1,
  border: `1px solid ${focused ? U.accent : U.border2}`,
  borderRadius: 9, color: U.text, fontSize: 14, outline: 'none',
  fontFamily: F.b, boxSizing: 'border-box', transition: 'border-color 0.2s',
});

// ─── Mini bloc preview ─────────────────────────────────────────
function BlockPreview({ tier, x, y }) {
  const c     = TIER_COLOR[tier] || U.accent;
  const label = TIER_LABEL[tier] || tier;
  const price = TIER_PRICE[tier] || 1;
  const sizes = { one: 72, ten: 56, corner_ten: 56, hundred: 44, thousand: 32 };
  const sz    = sizes[tier] || 44;
  const r     = tier === 'one' ? Math.round(sz * 0.1)
              : tier === 'ten' || tier === 'corner_ten' ? Math.round(sz * 0.09)
              : tier === 'hundred' ? 3 : 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 20px', background: `${c}08`, border: `1px solid ${c}30`, borderRadius: 12, marginBottom: 20 }}>
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{
          width: sz, height: sz, borderRadius: r,
          background: `${c}18`, border: `2px solid ${c}`,
          boxShadow: `0 0 20px ${c}50, 0 0 40px ${c}20`,
          animation: 'blockPulse 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: -8, right: -8,
          background: c, color: '#000', fontSize: 7, fontWeight: 900,
          fontFamily: F.h, letterSpacing: '0.06em',
          padding: '2px 5px', borderRadius: 4,
        }}>{label}</div>
      </div>
      <div>
        <div style={{ color: U.text, fontWeight: 700, fontSize: 15, fontFamily: F.h, marginBottom: 3 }}>
          Bloc {label}
        </div>
        <div style={{ color: U.muted, fontSize: 12, marginBottom: 5 }}>
          Position ({x}, {y}) · {price === 1 ? '1€' : `${price}€`}/jour · 30 jours
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: U.green, boxShadow: `0 0 6px ${U.green}` }} />
          <span style={{ color: U.green, fontSize: 11, fontWeight: 700 }}>ACTIF</span>
        </div>
      </div>
    </div>
  );
}

// ─── Étapes ────────────────────────────────────────────────────
function NextSteps({ showPassword, done }) {
  const steps = [
    { label: 'Paiement confirmé',       sub: 'Votre bloc est réservé',                done: true,        active: false },
    { label: 'Créer votre compte',       sub: 'Pour accéder au dashboard',             done: done,        active: showPassword && !done },
    { label: 'Personnaliser votre bloc', sub: 'Logo, lien, slogan, couleurs…',         done: false,       active: !showPassword || done },
    { label: 'Publié sur la grille',     sub: 'Visible de tous les visiteurs',         done: false,       active: false },
  ];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', marginBottom: 10 }}>PROCHAINES ÉTAPES</div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 0', borderBottom: i < steps.length - 1 ? `1px solid ${U.border}` : 'none', opacity: !s.done && !s.active ? 0.45 : 1 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800,
            background: s.done ? `${U.green}18` : s.active ? `${U.accent}18` : U.s2,
            border: `1.5px solid ${s.done ? U.green : s.active ? U.accent : U.border2}`,
            color: s.done ? U.green : s.active ? U.accent : U.muted,
          }}>
            {s.done ? '✓' : i + 1}
          </div>
          <div>
            <div style={{ color: s.active ? U.text : s.done ? U.muted : U.muted, fontWeight: s.active ? 700 : 500, fontSize: 13 }}>{s.label}</div>
            <div style={{ color: U.muted, fontSize: 11, marginTop: 1 }}>{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Setup mot de passe ────────────────────────────────────────
function PasswordSetup({ email, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6)      { setError('Minimum 6 caractères.'); return; }
    if (password !== confirm)     { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      try {
        await signUp({ email, password });
      } catch (err) {
        if (err.message?.includes('already registered') || err.message?.includes('already been registered')) {
          await signIn({ email, password });
        } else throw err;
      }
      onDone();
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Mot de passe incorrect pour ce compte existant.'
        : err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: `${U.accent}08`, border: `1px solid ${U.accent}25`, borderRadius: 11, padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: U.accent, letterSpacing: '0.1em', marginBottom: 5 }}>ÉTAPE 2 — ACCÈS À VOTRE ESPACE</div>
      <p style={{ color: U.muted, fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>
        Choisissez un mot de passe pour gérer et personnaliser votre bloc.
      </p>
      <div style={{ padding: '8px 12px', background: U.s1, borderRadius: 7, border: `1px solid ${U.border2}`, color: U.text, fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: U.accent }}>✉</span> {email}
      </div>
      {error && (
        <div style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 7, padding: '8px 12px', marginBottom: 10, color: U.err, fontSize: 12 }}>{error}</div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="password" value={password} required minLength={6}
          onChange={e => setPassword(e.target.value)}
          onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
          placeholder="Mot de passe (min. 6 caractères)" style={inp(focused === 'pw')} />
        <input type="password" value={confirm} required
          onChange={e => setConfirm(e.target.value)}
          onFocus={() => setFocused('cf')} onBlur={() => setFocused('')}
          placeholder="Confirmer le mot de passe"
          style={{ ...inp(focused === 'cf'), borderColor: confirm && confirm !== password ? U.err : focused === 'cf' ? U.accent : U.border2 }} />
        <button type="submit" disabled={loading} style={{
          padding: '12px', background: loading ? `${U.accent}50` : U.accent,
          color: U.accentFg, border: 'none', borderRadius: 9, fontWeight: 700,
          fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: F.b, marginTop: 2,
          boxShadow: loading ? 'none' : `0 0 18px ${U.accent}40`,
        }}>
          {loading ? 'Création du compte…' : 'Créer mon compte →'}
        </button>
      </form>
    </div>
  );
}

// ─── Contenu principal ─────────────────────────────────────────
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
  const tierColor        = tier ? TIER_COLOR[tier] : U.accent;

  return (
    <>
      <style>{`
        @keyframes blockPulse {
          0%,100% { box-shadow:0 0 20px ${tierColor}50,0 0 40px ${tierColor}20; }
          50%      { box-shadow:0 0 32px ${tierColor}80,0 0 60px ${tierColor}35; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes checkPop {
          0%   { transform:scale(0); opacity:0; }
          70%  { transform:scale(1.2); }
          100% { transform:scale(1); opacity:1; }
        }
      `}</style>

      <div style={{ maxWidth: 480, width: '100%', animation: 'fadeUp 0.4s ease forwards' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: `${U.green}12`, border: `2px solid ${U.green}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 22, color: U.green,
            animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
          }}>✓</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: U.accent, marginBottom: 7, fontFamily: F.h }}>
            PAIEMENT CONFIRMÉ
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 700, color: U.text, margin: '0 0 7px', fontFamily: F.h, letterSpacing: '-0.02em' }}>
            Votre bloc est réservé !
          </h1>
          <p style={{ color: U.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Bienvenue sur ADS-SQUARE. Personnalisez votre bloc pour apparaître sur la grille.
          </p>
        </div>

        {/* Card principale */}
        <div style={{ background: U.card, border: `1px solid ${U.border2}`, borderRadius: 16, padding: '22px 22px 18px', marginBottom: 10 }}>

          {/* Bloc acheté */}
          {coords && tier && <BlockPreview tier={tier} x={coords.x} y={coords.y} />}
          {coords && !tier && (
            <div style={{ padding: '12px 14px', background: U.s2, borderRadius: 9, marginBottom: 16, color: U.muted, fontSize: 13 }}>
              Bloc ({coords.x}, {coords.y}) · actif 30 jours
            </div>
          )}

          {/* Étapes */}
          <NextSteps showPassword={showPassword} done={done} />

          {/* Setup password */}
          {showPassword && <PasswordSetup email={email} onDone={() => setDone(true)} />}

          {done && (
            <div style={{ background: `${U.green}0d`, border: `1px solid ${U.green}28`, borderRadius: 8, padding: '9px 14px', marginBottom: 12, color: U.green, fontSize: 13, textAlign: 'center' }}>
              ✓ Compte créé — vous êtes connecté
            </div>
          )}

          {/* CTA principal */}
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px',
            background: showDashboardBtn ? U.accent : `${U.accent}15`,
            color: showDashboardBtn ? U.accentFg : U.accent,
            border: `1px solid ${showDashboardBtn ? 'transparent' : U.accent + '40'}`,
            borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none',
            fontFamily: F.b,
            boxShadow: showDashboardBtn ? `0 0 20px ${U.accent}40` : 'none',
          }}>
            <span>{showDashboardBtn ? 'Personnaliser mon bloc maintenant' : 'Accéder au dashboard après connexion'}</span>
            <span>→</span>
          </Link>

          {!showDashboardBtn && !showPassword && (
            <p style={{ color: U.muted, fontSize: 11, textAlign: 'center', margin: '9px 0 0' }}>
              Connectez-vous avec l'email utilisé lors du paiement.
            </p>
          )}
        </div>

        {/* Ce que vous pouvez personnaliser */}
        <div style={{ background: U.card, border: `1px solid ${U.border}`, borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', marginBottom: 10 }}>CE QUE VOUS POUVEZ CONFIGURER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {[
              ['◻', 'Logo ou image'],
              ['⌖', 'Lien de destination'],
              ['≡', 'Slogan / texte'],
              ['⊕', 'Réseaux sociaux'],
              ['⚡', 'Boost de visibilité'],
              ['📊', 'Stats temps réel'],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: U.s1, borderRadius: 7, border: `1px solid ${U.border}` }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <span style={{ color: U.muted, fontSize: 11 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          Email de confirmation envoyé ·{' '}
          <Link href="/" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
            Retour à la grille
          </Link>
        </p>
      </div>
    </>
  );
}

export default function MerciPage() {
  return (
    <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: F.b, padding: '32px 20px' }}>
      <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement…</div>}>
        <MerciContent />
      </Suspense>
    </div>
  );
}
