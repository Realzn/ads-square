'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp, getSession } from '../../../lib/supabase-auth';

const U = {
  bg: '#080808', s1: '#0f0f0f', card: '#1a1a1a',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)',
  faint: 'rgba(255,255,255,0.04)', accent: '#d4a84b',
  accentFg: '#080808', err: '#e05252', green: '#22c55e',
};

const inputStyle = (focused) => ({
  width: '100%', padding: '13px 16px', background: U.s1,
  border: `1px solid ${focused ? U.accent : U.border2}`,
  borderRadius: 10, color: U.text, fontSize: 15, outline: 'none',
  fontFamily: "'DM Sans','Inter',sans-serif",
  boxSizing: 'border-box', transition: 'border-color 0.2s',
});

// ─── Composant interne qui utilise useSearchParams ────────────
function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/dashboard';

  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [focused, setFocused]   = useState('');

  useEffect(() => {
    getSession().then(s => { if (s) router.replace(redirectTo); });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await signIn({ email, password });
        router.replace(redirectTo);
      } else {
        await signUp({ email, password, displayName: name });
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.');
        setMode('login');
      }
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' :
        err.message === 'User already registered'   ? 'Un compte existe déjà avec cet email. Connectez-vous.' :
        err.message
      );
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 420, width: '100%' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <Link href="/" style={{
          fontSize: 22, fontWeight: 800, color: U.accent, textDecoration: 'none',
          letterSpacing: '0.06em', fontFamily: "'Clash Display','Syne',sans-serif",
        }}>ADS-SQUARE</Link>
        <div style={{ color: U.muted, fontSize: 13, marginTop: 6 }}>
          {mode === 'login' ? 'Connectez-vous à votre espace client' : 'Créez votre espace client'}
        </div>
      </div>

      {/* Card */}
      <div style={{ background: U.card, border: `1px solid ${U.border2}`, borderRadius: 16, padding: '36px 32px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: U.s1, borderRadius: 10, padding: 4, marginBottom: 28, gap: 4 }}>
          {[{ key: 'login', label: 'Se connecter' }, { key: 'register', label: 'Créer un compte' }].map(tab => (
            <button key={tab.key} onClick={() => { setMode(tab.key); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: mode === tab.key ? U.accent : 'transparent',
                color: mode === tab.key ? U.accentFg : U.muted,
                transition: 'all 0.2s',
              }}>{tab.label}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(224,82,82,0.1)', border: `1px solid rgba(224,82,82,0.3)`, borderRadius: 8, padding: '12px 14px', marginBottom: 20, color: U.err, fontSize: 13 }}>{error}</div>
        )}
        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: `1px solid rgba(34,197,94,0.3)`, borderRadius: 8, padding: '12px 14px', marginBottom: 20, color: U.green, fontSize: 13 }}>{success}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>NOM / MARQUE</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                onFocus={() => setFocused('nm')} onBlur={() => setFocused('')}
                placeholder="Votre nom ou nom de marque" style={inputStyle(focused === 'nm')} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              onFocus={() => setFocused('em')} onBlur={() => setFocused('')}
              placeholder="votre@email.com" style={inputStyle(focused === 'em')} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: U.muted, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>MOT DE PASSE</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
              placeholder={mode === 'register' ? 'Min. 6 caractères' : '••••••••'} style={inputStyle(focused === 'pw')} />
          </div>
          <button type="submit" disabled={loading} style={{
            padding: '15px 24px', background: loading ? 'rgba(212,168,75,0.5)' : U.accent,
            color: U.accentFg, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
          }}>
            {loading
              ? (mode === 'login' ? 'Connexion…' : 'Création…')
              : (mode === 'login' ? 'Se connecter →' : 'Créer mon compte →')
            }
          </button>
          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link href="/dashboard/forgot-password" style={{ color: U.muted, fontSize: 12, textDecoration: 'none' }}>
                Mot de passe oublié ?
              </Link>
            </div>
          )}
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link href="/" style={{ color: U.muted, textDecoration: 'none', fontSize: 12 }}>← Retour à la grille</Link>
      </div>
    </div>
  );
}

// ─── Export avec Suspense ─────────────────────────────────────
export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', background: U.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans','Inter',sans-serif", padding: 24,
    }}>
      <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Chargement…</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
