'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const U = {
  bg: '#01020A', s1: 'rgba(0,4,16,0.98)', card: 'rgba(1,4,14,0.94)',
  border2: 'rgba(0,200,240,0.20)', text: '#DDE6F2',
  muted: 'rgba(140,180,220,0.70)', accent: '#E8A020',
  accentFg: '#01020A', err: '#D02848', green: '#00D880',
};

const inp = (focused, error) => ({
  width: '100%', padding: '13px 16px', background: U.s1,
  border: `1px solid ${error ? U.err : focused ? U.accent : U.border2}`,
   color: U.text, fontSize: 15, outline: 'none',
  fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s',
});

function ResetContent() {
  const router = useRouter();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');
  const [focused, setFocused]     = useState('');
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    // Supabase met la session dans le hash de l'URL après le clic sur le lien email
    // On attend que le client Supabase traite ce hash
    if (!supabase) return;
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Aussi vérifier si déjà en session PASSWORD_RECOVERY
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Minimum 6 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.replace('/dashboard'), 2500);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 420, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 800, color: U.accent, textDecoration: 'none', letterSpacing: '0.06em', fontFamily: "'Rajdhani','Sora',system-ui,sans-serif" }}>
          ADS-SQUARE
        </Link>
      </div>

      <div style={{ background: U.card, border: `1px solid ${U.border2}`,  padding: '36px 32px' }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16, color: U.green }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: U.text, margin: '0 0 12px', fontFamily: "'Rajdhani','Sora',system-ui,sans-serif" }}>Mot de passe mis à jour !</h2>
            <p style={{ color: U.muted, fontSize: 14, margin: '0 0 20px' }}>Redirection vers votre dashboard…</p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center', color: U.muted, padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              Lien invalide ou expiré.<br />
              <Link href="/dashboard/forgot-password" style={{ color: U.accent }}>Demander un nouveau lien</Link>
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: U.text, margin: '0 0 8px', fontFamily: "'Rajdhani','Sora',system-ui,sans-serif" }}>
              Nouveau mot de passe
            </h2>
            <p style={{ color: U.muted, fontSize: 13, margin: '0 0 24px' }}>
              Choisissez un nouveau mot de passe pour votre compte.
            </p>

            {error && (
              <div style={{ background: 'rgba(224,82,82,0.1)', border: `1px solid rgba(224,82,82,0.3)`,  padding: '11px 14px', marginBottom: 18, color: U.err, fontSize: 13 }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>NOUVEAU MOT DE PASSE</label>
                <input type="password" value={password} required minLength={6}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                  placeholder="Min. 6 caractères" style={inp(focused === 'pw', false)} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>CONFIRMER</label>
                <input type="password" value={confirm} required
                  onChange={e => setConfirm(e.target.value)}
                  onFocus={() => setFocused('cf')} onBlur={() => setFocused('')}
                  placeholder="Répétez le mot de passe"
                  style={inp(focused === 'cf', confirm && confirm !== password)} />
              </div>
              <button type="submit" disabled={loading} style={{
                padding: '14px', background: loading ? 'rgba(212,168,75,0.4)' : U.accent,
                color: U.accentFg, border: 'none',  fontWeight: 700,
                fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", marginTop: 4,
              }}>
                {loading ? 'Mise à jour…' : 'Confirmer le nouveau mot de passe →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani','Sora',system-ui,sans-serif", padding: 24 }}>
      <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement…</div>}>
        <ResetContent />
      </Suspense>
    </div>
  );
}