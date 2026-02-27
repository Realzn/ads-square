'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const U = {
  bg: '#01020A', s1: 'rgba(0,4,16,0.98)', card: 'rgba(1,4,14,0.94)',
  border: 'rgba(0,200,240,0.09)', border2: 'rgba(0,200,240,0.20)',
  text: '#DDE6F2', muted: 'rgba(140,180,220,0.70)',
  faint: 'rgba(0,200,240,0.04)', accent: '#E8A020',
  accentFg: '#01020A', err: '#D02848', green: '#00D880',
};
const F = { h: "'Rajdhani','Sora',system-ui,sans-serif", b: "'Rajdhani','Sora',system-ui,sans-serif" };

const inp = (focused) => ({
  width: '100%', padding: '12px 14px', background: 'rgba(0,200,240,0.03)',
  border: `1px solid ${focused ? U.accent : U.border2}`,
  color: U.text, fontSize: 13, outline: 'none',
  fontFamily: F.b, boxSizing: 'border-box', transition: 'border-color 0.2s',
  clipPath: focused ? 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)' : 'none',
});

function ForgotContent() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
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
        <Link href="/" style={{ fontSize: 18, fontWeight: 900, color: U.accent, textDecoration: 'none', letterSpacing: '0.14em', fontFamily: F.h }}>
          ADS-SQUARE
        </Link>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${U.accent}50, transparent)`, margin: '10px auto', width: '60%' }} />
      </div>

      <div style={{
        background: U.card, border: `1px solid ${U.border2}`,
        padding: '32px 28px',
        clipPath: 'polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: U.accent, clipPath: 'polygon(100% 0,0 0,100% 100%)' }} />

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 14, color: U.accent }}>✉</div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: U.text, margin: '0 0 10px', fontFamily: F.h, letterSpacing: '0.04em' }}>
              EMAIL ENVOYÉ !
            </h2>
            <p style={{ color: U.muted, fontSize: 12, lineHeight: 1.6, margin: '0 0 20px' }}>
              Un lien de réinitialisation a été envoyé à <strong style={{ color: U.text }}>{email}</strong>.
              <br />Vérifiez votre boîte mail et vos spams.
            </p>
            <Link href="/dashboard/login" style={{
              display: 'block', padding: '12px',
              background: U.accent, color: U.accentFg,
              fontWeight: 800, fontSize: 12, textDecoration: 'none', textAlign: 'center',
              letterSpacing: '0.08em',
              clipPath: 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)',
            }}>
              RETOUR À LA CONNEXION
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: U.text, margin: '0 0 6px', fontFamily: F.h, letterSpacing: '0.06em' }}>
              MOT DE PASSE OUBLIÉ
            </h2>
            <p style={{ color: U.muted, fontSize: 11, margin: '0 0 22px', lineHeight: 1.5 }}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>

            {error && (
              <div style={{ background: 'rgba(208,40,72,0.1)', border: `1px solid rgba(208,40,72,0.3)`, padding: '10px 14px', marginBottom: 16, color: U.err, fontSize: 11, fontWeight: 700 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 800, color: U.muted, letterSpacing: '0.14em', display: 'block', marginBottom: 7 }}>EMAIL</label>
                <input type="email" value={email} required
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  placeholder="votre@email.com" style={inp(focused)} />
              </div>
              <button type="submit" disabled={loading} style={{
                padding: '12px',
                background: loading ? `${U.accent}50` : U.accent,
                color: U.accentFg, border: 'none', fontWeight: 800,
                fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: F.b, letterSpacing: '0.08em',
                clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)',
                boxShadow: loading ? 'none' : `0 0 16px ${U.accent}30`,
              }}>
                {loading ? 'ENVOI…' : 'ENVOYER LE LIEN →'}
              </button>
            </form>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <Link href="/dashboard/login" style={{ color: U.muted, textDecoration: 'none', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>
          ← RETOUR À LA CONNEXION
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh', background: U.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: F.b, padding: 24,
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,200,240,0.012) 0px, rgba(0,200,240,0.012) 1px, transparent 1px, transparent 4px)',
      backgroundSize: '100% 4px',
    }}>
      <Suspense fallback={<div style={{ color: 'rgba(140,180,220,0.5)', fontSize: 11, letterSpacing: '0.1em' }}>CHARGEMENT…</div>}>
        <ForgotContent />
      </Suspense>
    </div>
  );
}