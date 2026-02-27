'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn, getSession } from '../../lib/supabase-auth';
import { getTier, TIER_LABEL, TIER_COLOR, TIER_PRICE } from '../../lib/grid';

const U = {
  bg:      '#01020A',
  card:    'rgba(1,4,14,0.94)',
  s1:      'rgba(0,4,16,0.98)',
  s2:      'rgba(0,8,24,0.97)',
  border:  'rgba(0,200,240,0.09)',
  border2: 'rgba(0,200,240,0.20)',
  text:    '#DDE6F2',
  muted:   'rgba(140,180,220,0.70)',
  faint:   'rgba(0,200,240,0.04)',
  accent:  '#E8A020',
  accentFg:'#01020A',
  cyan:    '#00C8E4',
  green:   '#00D880',
  err:     '#D02848',
};
const F = { h: "'Rajdhani','Sora',system-ui,sans-serif", b: "'Rajdhani','Sora',system-ui,sans-serif" };

const inp = (focused) => ({
  width: '100%', padding: '11px 14px',
  background: 'rgba(0,200,240,0.03)',
  border: `1px solid ${focused ? U.accent : U.border2}`,
  color: U.text, fontSize: 13, outline: 'none',
  fontFamily: F.b, boxSizing: 'border-box', transition: 'border-color 0.2s',
  clipPath: focused ? 'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)' : 'none',
});

// ─── Mini bloc preview ─────────────────────────────────────────
function BlockPreview({ tier, x, y }) {
  const c     = TIER_COLOR[tier] || U.accent;
  const label = TIER_LABEL[tier] || tier;
  const price = TIER_PRICE[tier] || 1;
  const sizes = { one: 64, ten: 50, corner_ten: 50, hundred: 38, thousand: 28 };
  const sz    = sizes[tier] || 38;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18, padding: '16px 18px',
      background: `${c}08`, border: `1px solid ${c}30`, marginBottom: 18,
      clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)',
    }}>
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{
          width: sz, height: sz,
          background: `${c}18`, border: `2px solid ${c}`,
          boxShadow: `0 0 20px ${c}50, 0 0 40px ${c}20`,
          animation: 'blockPulse 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: -7, right: -7,
          background: c, color: '#000', fontSize: 7, fontWeight: 900,
          fontFamily: F.h, letterSpacing: '0.08em',
          padding: '2px 4px',
        }}>{label}</div>
      </div>
      <div>
        <div style={{ color: U.text, fontWeight: 800, fontSize: 14, fontFamily: F.h, marginBottom: 3, letterSpacing: '0.04em' }}>
          BLOC {label.toUpperCase()}
        </div>
        <div style={{ color: U.muted, fontSize: 11, marginBottom: 5, letterSpacing: '0.06em' }}>
          POSITION ({x}, {y}) · {price === 1 ? '1€' : `${price}€`}/JOUR · 30 JOURS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, background: U.green, boxShadow: `0 0 6px ${U.green}`, animation: 'blink 1.5s infinite' }} />
          <span style={{ color: U.green, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>ACTIF</span>
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
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: U.muted, letterSpacing: '0.14em', marginBottom: 10 }}>PROCHAINES ÉTAPES</div>
      {steps.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 0',
          borderBottom: i < steps.length - 1 ? `1px solid ${U.border}` : 'none',
          opacity: !s.done && !s.active ? 0.4 : 1,
        }}>
          <div style={{
            width: 20, height: 20, flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 900,
            background: s.done ? `${U.green}18` : s.active ? `${U.accent}18` : U.s2,
            border: `1.5px solid ${s.done ? U.green : s.active ? U.accent : U.border2}`,
            color: s.done ? U.green : s.active ? U.accent : U.muted,
            clipPath: 'polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,0 100%)',
          }}>
            {s.done ? '✓' : i + 1}
          </div>
          <div>
            <div style={{ color: s.active ? U.text : s.done ? U.muted : U.muted, fontWeight: s.active ? 800 : 600, fontSize: 12, letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ color: U.muted, fontSize: 10, marginTop: 1 }}>{s.sub}</div>
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
    <div style={{
      background: `${U.accent}08`, border: `1px solid ${U.accent}25`,
      padding: '16px 18px', marginBottom: 14,
      clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)',
      position: 'relative',
    }}>
      {/* Corner accent */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, background: U.accent, clipPath: 'polygon(100% 0,0 0,100% 100%)' }} />
      <div style={{ fontSize: 9, fontWeight: 800, color: U.accent, letterSpacing: '0.14em', marginBottom: 5 }}>ÉTAPE 2 — ACCÈS À VOTRE ESPACE</div>
      <p style={{ color: U.muted, fontSize: 11, margin: '0 0 12px', lineHeight: 1.5 }}>
        Choisissez un mot de passe pour gérer et personnaliser votre bloc.
      </p>
      <div style={{
        padding: '7px 12px', background: U.s1, border: `1px solid ${U.border2}`,
        color: U.text, fontSize: 11, marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{ color: U.accent }}>✉</span> {email}
      </div>
      {error && (
        <div style={{
          background: 'rgba(208,40,72,0.1)', border: '1px solid rgba(208,40,72,0.3)',
          padding: '7px 12px', marginBottom: 10, color: U.err, fontSize: 11,
        }}>{error}</div>
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
          padding: '11px',
          background: loading ? `${U.accent}50` : U.accent,
          color: U.accentFg, border: 'none', fontWeight: 800,
          fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: F.b, marginTop: 2, letterSpacing: '0.08em',
          clipPath: 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)',
          boxShadow: loading ? 'none' : `0 0 16px ${U.accent}35`,
        }}>
          {loading ? 'CRÉATION DU COMPTE…' : 'CRÉER MON COMPTE →'}
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
          0%,100% { box-shadow: 0 0 20px ${tierColor}50, 0 0 40px ${tierColor}20; }
          50%      { box-shadow: 0 0 32px ${tierColor}80, 0 0 60px ${tierColor}35; }
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
        @keyframes blink {
          0%,100% { opacity:1; }
          50%      { opacity:0.2; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ maxWidth: 480, width: '100%', animation: 'fadeUp 0.4s ease forwards' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          {/* Success icon HUD-style */}
          <div style={{
            width: 52, height: 52,
            background: `${U.green}12`, border: `2px solid ${U.green}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 20, color: U.green,
            animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
            clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))',
          }}>✓</div>

          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.16em', color: U.accent, marginBottom: 7, fontFamily: F.h }}>
            ◈ PAIEMENT CONFIRMÉ ◈
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${U.accent}60, transparent)`, marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: U.text, margin: '0 0 7px', fontFamily: F.h, letterSpacing: '0.04em' }}>
            Votre bloc est réservé !
          </h1>
          <p style={{ color: U.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            Bienvenue sur ADS-SQUARE. Personnalisez votre bloc pour apparaître sur la grille.
          </p>
        </div>

        {/* Card principale */}
        <div style={{
          background: U.card, border: `1px solid ${U.border2}`,
          padding: '20px 20px 16px',
          clipPath: 'polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)',
          marginBottom: 8, position: 'relative',
        }}>
          {/* Top-right corner accent */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: U.accent, clipPath: 'polygon(100% 0,0 0,100% 100%)' }} />
          {/* Top scan line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${U.accent}80, transparent)` }} />

          {/* Bloc acheté */}
          {coords && tier && <BlockPreview tier={tier} x={coords.x} y={coords.y} />}
          {coords && !tier && (
            <div style={{ padding: '11px 14px', background: U.s2, border: `1px solid ${U.border}`, marginBottom: 16, color: U.muted, fontSize: 12 }}>
              Bloc ({coords.x}, {coords.y}) · actif 30 jours
            </div>
          )}

          {/* Étapes */}
          <NextSteps showPassword={showPassword} done={done} />

          {/* Setup password */}
          {showPassword && <PasswordSetup email={email} onDone={() => setDone(true)} />}

          {done && (
            <div style={{
              background: `${U.green}0d`, border: `1px solid ${U.green}28`,
              padding: '8px 14px', marginBottom: 12, color: U.green,
              fontSize: 12, textAlign: 'center', fontWeight: 700, letterSpacing: '0.06em',
            }}>
              ✓ COMPTE CRÉÉ — VOUS ÊTES CONNECTÉ
            </div>
          )}

          {/* CTA principal */}
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: showDashboardBtn ? U.accent : `${U.accent}15`,
            color: showDashboardBtn ? U.accentFg : U.accent,
            border: `1px solid ${showDashboardBtn ? 'transparent' : U.accent + '40'}`,
            fontWeight: 800, fontSize: 13, textDecoration: 'none',
            fontFamily: F.b, letterSpacing: '0.08em',
            boxShadow: showDashboardBtn ? `0 0 24px ${U.accent}40` : 'none',
            clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)',
            transition: 'all 0.2s',
          }}>
            <span>{showDashboardBtn ? 'PERSONNALISER MON BLOC' : 'ACCÉDER AU DASHBOARD'}</span>
            <span>→</span>
          </Link>

          {!showDashboardBtn && !showPassword && (
            <p style={{ color: U.muted, fontSize: 10, textAlign: 'center', margin: '8px 0 0', letterSpacing: '0.06em' }}>
              Connectez-vous avec l'email utilisé lors du paiement.
            </p>
          )}
        </div>

        {/* Ce que vous pouvez personnaliser */}
        <div style={{
          background: U.card, border: `1px solid ${U.border}`,
          padding: '14px 16px', marginBottom: 8,
          clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: U.muted, letterSpacing: '0.14em', marginBottom: 10 }}>CE QUE VOUS POUVEZ CONFIGURER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              ['◻', 'Logo ou image'],
              ['⌖', 'Lien de destination'],
              ['≡', 'Slogan / texte'],
              ['⊕', 'Réseaux sociaux'],
              ['⚡', 'Boost de visibilité'],
              ['📊', 'Stats temps réel'],
            ].map(([icon, label]) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
                background: U.faint, border: `1px solid ${U.border}`,
              }}>
                <span style={{ fontSize: 11, color: U.accent }}>{icon}</span>
                <span style={{ color: U.muted, fontSize: 10, letterSpacing: '0.04em' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(140,180,220,0.25)', fontSize: 10, textAlign: 'center', margin: 0, lineHeight: 1.6, letterSpacing: '0.06em' }}>
          EMAIL DE CONFIRMATION ENVOYÉ ·{' '}
          <Link href="/" style={{ color: 'rgba(140,180,220,0.3)', textDecoration: 'none' }}>
            RETOUR À LA GRILLE
          </Link>
        </p>
      </div>
    </>
  );
}

export default function MerciPage() {
  return (
    <div style={{
      minHeight: '100vh', background: U.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.b, padding: '32px 20px',
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,200,240,0.012) 0px, rgba(0,200,240,0.012) 1px, transparent 1px, transparent 4px)',
      backgroundSize: '100% 4px',
    }}>
      <Suspense fallback={<div style={{ color: 'rgba(140,180,220,0.5)', fontSize: 11, letterSpacing: '0.1em' }}>CHARGEMENT…</div>}>
        <MerciContent />
      </Suspense>
    </div>
  );
}