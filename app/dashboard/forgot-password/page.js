  'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const U = {
  bg: '#080808', s1: '#0f0f0f', card: '#1a1a1a',
  border2: 'rgba(255,255,255,0.13)', text: '#f0f0f0',
  muted: 'rgba(255,255,255,0.36)', accent: '#d4a84b',
  accentFg: '#080808', err: '#e05252', green: '#22c55e',
};

const inp = (focused) => ({
  width: '100%', padding: '13px 16px', background: U.s1,
  border: `1px solid ${focused ? U.accent : U.border2}`,
  borderRadius: 10, color: U.text, fontSize: 15, outline: 'none',
  fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s',
});

function ForgotContent() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 420, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 800, color: U.accent, textDecoration: 'none', letterSpacing: '0.06em', fontFamily: "'Clash Display',sans-serif" }}>
          ADS-SQUARE
        </Link>
      </div>

      <div style={{ background: U.card, border: `1px solid ${U.border2}`, borderRadius: 16, padding: '36px 32px' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✉</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: U.text, margin: '0 0 12px', fontFamily: "'Clash Display',sans-serif" }}>
              Email envoyé !
            </h2>
            <p style={{ color: U.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
              Un lien de réinitialisation a été envoyé à <strong style={{ color: U.text }}>{email}</strong>.
              <br />Vérifiez votre boîte mail et vos spams.
            </p>
            <Link href="/dashboard/login" style={{ display: 'block', padding: '13px', background: U.accent, color: U.accentFg, borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: U.text, margin: '0 0 8px', fontFamily: "'Clash Display',sans-serif" }}>
              Mot de passe oublié
            </h2>
            <p style={{ color: U.muted, fontSize: 13, margin: '0 0 24px', lineHeight: 1.5 }}>
              Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            {error && (
              <div style={{ background: 'rgba(224,82,82,0.1)', border: `1px solid rgba(224,82,82,0.3)`, borderRadius: 8, padding: '11px 14px', marginBottom: 18, color: U.err, fontSize: 13 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>EMAIL</label>
                <input type="email" value={email} required
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  placeholder="votre@email.com" style={inp(focused)} />
              </div>
              <button type="submit" disabled={loading} style={{
                padding: '14px', background: loading ? 'rgba(212,168,75,0.4)' : U.accent,
                color: U.accentFg, border: 'none', borderRadius: 10, fontWeight: 700,
                fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans',sans-serif",
              }}>
                {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation →'}
              </button>
            </form>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/dashboard/login" style={{ color: U.muted, textDecoration: 'none', fontSize: 13 }}>
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement…</div>}>
        <ForgotContent />
      </Suspense>
    </div>
  );
}
