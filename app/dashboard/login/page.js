'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp, getSession } from '../../../lib/supabase-auth';

const U = {
  bg:      '#01020A',
  s1:      'rgba(0,4,16,0.98)',
  card:    'rgba(1,4,14,0.94)',
  border:  'rgba(0,200,240,0.09)',
  border2: 'rgba(0,200,240,0.20)',
  text:    '#DDE6F2',
  muted:   'rgba(140,180,220,0.70)',
  faint:   'rgba(0,200,240,0.04)',
  accent:  '#E8A020',
  accentFg:'#01020A',
  err:     '#D02848',
  green:   '#00D880',
};
const F = { h: "'Rajdhani','Sora',system-ui,sans-serif", b: "'Rajdhani','Sora',system-ui,sans-serif" };

const inputStyle = (focused) => ({
  width: '100%', padding: '12px 15px',
  background: 'rgba(0,200,240,0.03)',
  border: `1px solid ${focused ? U.accent : U.border2}`,
  color: U.text, fontSize: 14, outline: 'none',
  fontFamily: F.b, boxSizing: 'border-box', transition: 'border-color 0.2s',
  clipPath: focused ? 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,0 100%)' : 'none',
});

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
        {/* HUD corner decoration */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
          <div style={{ position: 'absolute', top: -8, left: -12, width: 20, height: 20, borderTop: `2px solid ${U.accent}`, borderLeft: `2px solid ${U.accent}` }} />
          <div style={{ position: 'absolute', bottom: -8, right: -12, width: 20, height: 20, borderBottom: `2px solid ${U.accent}80`, borderRight: `2px solid ${U.accent}80` }} />
          <Link href="/" style={{
            fontSize: 22, fontWeight: 900, color: U.accent, textDecoration: 'none',
            letterSpacing: '0.14em', fontFamily: F.h, display: 'block', padding: '4px 8px',
          }}>ADS-SQUARE</Link>
        </div>
        <div style={{ color: U.muted, fontSize: 11, letterSpacing: '0.1em', fontWeight: 700 }}>
          {mode === 'login' ? 'CONNEXION — ESPACE CLIENT' : 'CRÉATION — ESPACE CLIENT'}
        </div>
        {/* Scan line */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${U.accent}50, transparent)`, margin: '12px auto', width: '80%' }} />
      </div>

      {/* Card */}
      <div style={{
        background: U.card,
        border: `1px solid ${U.border2}`,
        padding: '32px 28px',
        clipPath: 'polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)',
        position: 'relative',
      }}>
        {/* Corner accent */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: U.accent, clipPath: 'polygon(100% 0,0 0,100% 100%)' }} />

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(0,200,240,0.04)', border: `1px solid ${U.border}`, padding: 3, marginBottom: 28, gap: 3 }}>
          {[{ key: 'login', label: 'SE CONNECTER' }, { key: 'register', label: 'CRÉER UN COMPTE' }].map(tab => (
            <button key={tab.key} onClick={() => { setMode(tab.key); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                background: mode === tab.key ? U.accent : 'transparent',
                color: mode === tab.key ? U.accentFg : U.muted,
                transition: 'all 0.2s',
                fontFamily: F.b,
              }}>{tab.label}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(208,40,72,0.10)', border: `1px solid rgba(208,40,72,0.3)`, padding: '11px 14px', marginBottom: 18, color: U.err, fontSize: 12, fontWeight: 700, clipPath: 'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)' }}>{error}</div>
        )}
        {success && (
          <div style={{ background: 'rgba(0,216,128,0.10)', border: `1px solid rgba(0,216,128,0.3)`, padding: '11px 14px', marginBottom: 18, color: U.green, fontSize: 12, fontWeight: 700, clipPath: 'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)' }}>{success}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 9, fontWeight: 800, color: U.muted, letterSpacing: '0.14em', display: 'block', marginBottom: 7 }}>NOM / MARQUE</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                onFocus={() => setFocused('nm')} onBlur={() => setFocused('')}
                placeholder="Votre nom ou nom de marque" style={inputStyle(focused === 'nm')} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, color: U.muted, letterSpacing: '0.14em', display: 'block', marginBottom: 7 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              onFocus={() => setFocused('em')} onBlur={() => setFocused('')}
              placeholder="votre@email.com" style={inputStyle(focused === 'em')} />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, color: U.muted, letterSpacing: '0.14em', display: 'block', marginBottom: 7 }}>MOT DE PASSE</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
              placeholder={mode === 'register' ? 'Min. 6 caractères' : '••••••••'} style={inputStyle(focused === 'pw')} />
          </div>
          <button type="submit" disabled={loading} style={{
            padding: '13px 24px',
            background: loading ? `${U.accent}50` : U.accent,
            color: U.accentFg, border: 'none', fontWeight: 800, fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
            fontFamily: F.b, letterSpacing: '0.08em',
            clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)',
            boxShadow: loading ? 'none' : `0 0 20px ${U.accent}30`,
            transition: 'all 0.2s',
          }}>
            {loading
              ? (mode === 'login' ? 'CONNEXION…' : 'CRÉATION…')
              : (mode === 'login' ? 'SE CONNECTER →' : 'CRÉER MON COMPTE →')
            }
          </button>
          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <Link href="/dashboard/forgot-password" style={{ color: U.muted, fontSize: 11, textDecoration: 'none', letterSpacing: '0.06em' }}>
                Mot de passe oublié ?
              </Link>
            </div>
          )}
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/" style={{ color: U.muted, textDecoration: 'none', fontSize: 11, letterSpacing: '0.08em', fontWeight: 700 }}>← RETOUR À LA GRILLE</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', background: U.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: F.b, padding: 24,
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,200,240,0.012) 0px, rgba(0,200,240,0.012) 1px, transparent 1px, transparent 4px)',
      backgroundSize: '100% 4px',
    }}>
      <Suspense fallback={<div style={{ color: 'rgba(140,180,220,0.5)', fontSize: 11, letterSpacing: '0.1em' }}>CHARGEMENT…</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}