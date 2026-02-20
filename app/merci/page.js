'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn, getSession } from '../../lib/supabase-auth';

const U = {
  bg: '#080808', card: '#1a1a1a', s1: '#0f0f0f',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)',
  accent: '#d4a84b', accentFg: '#080808', green: '#22c55e', err: '#e05252',
};

const inp = (focused) => ({
  width: '100%', padding: '13px 16px', background: U.s1,
  border: `1px solid ${focused ? U.accent : U.border2}`,
  borderRadius: 10, color: U.text, fontSize: 15, outline: 'none',
  fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s',
});

function PasswordSetup({ email, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focused, setFocused]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Minimum 6 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
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
    <div style={{ background: 'rgba(212,168,75,0.06)', border: `1px solid rgba(212,168,75,0.2)`, borderRadius: 14, padding: '24px 28px', marginTop: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: U.accent, letterSpacing: '0.12em', marginBottom: 8 }}>CRÉER VOTRE ACCÈS</div>
      <p style={{ color: U.muted, fontSize: 13, margin: '0 0 18px', lineHeight: 1.5 }}>
        Choisissez un mot de passe pour accéder à votre espace client et gérer votre bloc.
      </p>

      <div style={{ padding: '10px 14px', background: U.s1, borderRadius: 8, border: `1px solid ${U.border2}`, color: U.text, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: U.accent }}>✉</span> {email}
      </div>

      {error && (
        <div style={{ background: 'rgba(224,82,82,0.1)', border: `1px solid rgba(224,82,82,0.3)`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: U.err, fontSize: 13 }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>MOT DE PASSE</label>
          <input type="password" value={password} required minLength={6}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
            placeholder="Min. 6 caractères" style={inp(focused === 'pw')} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 7 }}>CONFIRMER</label>
          <input type="password" value={confirm} required
            onChange={e => setConfirm(e.target.value)}
            onFocus={() => setFocused('cf')} onBlur={() => setFocused('')}
            placeholder="Répétez le mot de passe"
            style={{ ...inp(focused === 'cf'), borderColor: confirm && confirm !== password ? U.err : focused === 'cf' ? U.accent : U.border2 }} />
        </div>
        <button type="submit" disabled={loading} style={{
          padding: '14px', background: loading ? 'rgba(212,168,75,0.4)' : U.accent,
          color: U.accentFg, border: 'none', borderRadius: 10, fontWeight: 700,
          fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
          fontFamily: "'DM Sans',sans-serif",
        }}>
          {loading ? 'Création du compte…' : 'Créer mon compte et accéder au dashboard →'}
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
  const [email, setEmail]     = useState('');
  const [done, setDone]       = useState(false);
  const [alreadyAuth, setAuth] = useState(false);

  useEffect(() => {
    if (slot) { const [x, y] = slot.split('-'); setCoords({ x, y }); }
    if (emailParam) setEmail(decodeURIComponent(emailParam));
    getSession().then(s => { if (s) setAuth(true); });
  }, [slot, emailParam]);

  const showDashboardBtn = alreadyAuth || done;

  return (
    <div style={{ maxWidth: 520, width: '100%', background: U.card, border: `1px solid ${U.border2}`, borderRadius: 20, padding: '44px 40px' }}>

      {/* Succès */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: `2px solid ${U.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: U.green }}>✓</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: U.accent, marginBottom: 10 }}>PAIEMENT CONFIRMÉ</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: U.text, margin: '0 0 10px', fontFamily: "'Clash Display',sans-serif" }}>Votre bloc est réservé !</h1>
        <p style={{ color: U.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {coords ? `Bloc en position (${coords.x}, ${coords.y}) — actif pour 30 jours.` : 'Votre réservation a bien été enregistrée.'}
        </p>
      </div>

      {/* CTA selon état */}
      {showDashboardBtn ? (
        <div style={{ marginTop: 28 }}>
          {done && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: `1px solid rgba(34,197,94,0.2)`, borderRadius: 10, padding: '11px 16px', marginBottom: 14, color: U.green, fontSize: 13, textAlign: 'center' }}>
              ✓ Compte créé avec succès !
            </div>
          )}
          <Link href="/dashboard" style={{ display: 'block', padding: '15px 24px', background: U.accent, color: U.accentFg, borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', textAlign: 'center' }}>
            Accéder à mon espace client →
          </Link>
        </div>
      ) : email ? (
        <PasswordSetup email={email} onDone={() => setDone(true)} />
      ) : (
        <div style={{ marginTop: 28 }}>
          <Link href="/dashboard" style={{ display: 'block', padding: '15px 24px', background: U.accent, color: U.accentFg, borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', textAlign: 'center', marginBottom: 10 }}>
            Accéder à mon espace client →
          </Link>
          <p style={{ color: U.muted, fontSize: 12, textAlign: 'center', margin: 0 }}>
            Connectez-vous avec l'email utilisé lors du paiement.
          </p>
        </div>
      )}

      <p style={{ color: U.muted, fontSize: 11, marginTop: 24, textAlign: 'center', borderTop: `1px solid ${U.border}`, paddingTop: 18 }}>
        Un email de confirmation a été envoyé ·{' '}
        <Link href="/" style={{ color: U.muted, textDecoration: 'none' }}>Retour à la grille</Link>
      </p>
    </div>
  );
}

export default function MerciPage() {
  return (
    <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement…</div>}>
        <MerciContent />
      </Suspense>
    </div>
  );
}
