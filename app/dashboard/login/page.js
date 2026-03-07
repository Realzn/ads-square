'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp, getSession } from '../../../lib/supabase-auth';

const C = {
  bg:      '#020609',
  surface: '#080e14',
  card:    '#0c1520',
  border:  'rgba(0,180,220,0.10)',
  borderHi:'rgba(0,180,220,0.26)',
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

function LoginContent() {
  const router     = useRouter();
  const params     = useSearchParams();
  const redirectTo = params.get('redirect') || '/dashboard';

  const [mode,    setMode]    = useState('login');
  const [email,   setEmail]   = useState('');
  const [password,setPass]    = useState('');
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [focused, setFocused] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    getSession().then(s => { if (s) router.replace(redirectTo); });
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await signIn({ email, password });
        router.replace(redirectTo);
      } else {
        await signUp({ email, password, displayName: name });
        setSuccess('Vérifiez votre email pour confirmer votre compte.');
        setMode('login');
      }
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' :
        err.message === 'User already registered'   ? 'Compte existant. Connectez-vous.' :
        err.message
      );
    } finally { setLoading(false); }
  };

  const isLogin = mode === 'login';

  const iStyle = (k) => ({
    width: '100%', padding: '11px 14px 11px 42px',
    background: focused === k ? C.card : C.surface,
    border: `1px solid ${focused === k ? C.borderHi : C.border}`,
    borderRadius: 9, color: C.text, fontSize: 13,
    fontFamily: T.h, outline: 'none', boxSizing: 'border-box',
    transition: 'border .15s, background .15s',
  });

  return (
    <div style={{
      width: '100%', maxWidth: 420,
      opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)',
      transition: 'opacity .45s ease, transform .45s ease',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes orbitA { to { transform: rotate(360deg); } }
        @keyframes orbitB { to { transform: rotate(-360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color: ${C.dim}; }
        input:focus { outline: none; }
      `}</style>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 36, animation: 'fadeUp .4s ease' }}>
        <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Orbits */}
          <div style={{ position: 'absolute', width: 52, height: 52, borderRadius: '50%', border: `1px solid ${C.cyan}28`, animation: 'orbitA 8s linear infinite' }}>
            <div style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 6px ${C.cyan}` }} />
          </div>
          <div style={{ position: 'absolute', width: 36, height: 36, borderRadius: '50%', border: `1px solid ${C.gold}22`, animation: 'orbitB 5s linear infinite' }}>
            <div style={{ position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: C.gold, boxShadow: `0 0 5px ${C.gold}` }} />
          </div>
          {/* Core */}
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${C.gold}dd, ${C.gold}55)`, boxShadow: `0 0 14px ${C.gold}60` }} />
        </div>

        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, letterSpacing: '.12em', color: C.gold, lineHeight: 1 }}>
            DYSON·COSMOS
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '.24em', color: C.dim, marginTop: 4 }}>
            GALACTIC·ADV·GRID
          </div>
        </Link>
      </div>

      {/* ── Card ─────────────────────────────────────────────── */}
      <div style={{
        background: C.card, borderRadius: 16,
        border: `1px solid ${C.border}`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.04) inset, 0 32px 80px rgba(0,0,0,0.6)`,
        overflow: 'hidden',
        animation: 'fadeUp .4s .1s ease both',
      }}>
        {/* Energy line */}
        <div style={{ height: 1.5, background: `linear-gradient(90deg, transparent, ${isLogin ? C.cyan : C.gold}, transparent)` }} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
          {[
            { key: 'login',    label: 'Connexion' },
            { key: 'register', label: 'Inscription' },
          ].map(tab => {
            const on  = mode === tab.key;
            const col = tab.key === 'login' ? C.cyan : C.gold;
            return (
              <button key={tab.key} onClick={() => { setMode(tab.key); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
                  color: on ? col : C.dim, fontFamily: T.mono, fontSize: 11, fontWeight: 700,
                  letterSpacing: '.10em', borderBottom: `2px solid ${on ? col : 'transparent'}`,
                  transition: 'all .15s', marginBottom: -1,
                }}>
                {tab.label.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '28px 28px 32px' }}>
          {/* Error / Success */}
          {error && (
            <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 8, background: C.rose + '10', border: `1px solid ${C.rose}30`, color: C.rose, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>⚠</span> {error}
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 8, background: C.green + '10', border: `1px solid ${C.green}30`, color: C.green, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Nom (register only) */}
            {mode === 'register' && (
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '.12em', fontFamily: T.mono, marginBottom: 6 }}>NOM / MARQUE</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'nm' ? C.gold : C.dim, fontSize: 13, pointerEvents: 'none', transition: 'color .15s' }}>◈</span>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    onFocus={() => setFocused('nm')} onBlur={() => setFocused('')}
                    placeholder="Votre nom ou marque" style={iStyle('nm')} />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '.12em', fontFamily: T.mono, marginBottom: 6 }}>EMAIL</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'em' ? C.cyan : C.dim, fontSize: 12, pointerEvents: 'none', transition: 'color .15s' }}>@</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  onFocus={() => setFocused('em')} onBlur={() => setFocused('')}
                  placeholder="votre@email.com" style={iStyle('em')} />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: '.12em', fontFamily: T.mono }}>MOT DE PASSE</div>
                {isLogin && (
                  <Link href="/dashboard/forgot-password" style={{ color: C.dim, fontSize: 11, fontFamily: T.mono }}>
                    Oublié ?
                  </Link>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'pw' ? C.cyan : C.dim, fontSize: 13, pointerEvents: 'none', transition: 'color .15s' }}>◌</span>
                <input type="password" value={password} onChange={e => setPass(e.target.value)} required minLength={6}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                  placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'} style={iStyle('pw')} />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              marginTop: 6, padding: '13px', borderRadius: 9, border: 'none',
              background: loading ? C.surface : C.gold,
              color: loading ? C.dim : '#0a0600',
              fontFamily: T.mono, fontWeight: 700, fontSize: 13,
              letterSpacing: '.10em', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : `0 0 24px ${C.gold}40`,
              transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading
                ? <><span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${C.dim}`, borderTop: `2px solid ${C.gold}`, display: 'inline-block', animation: 'spin .8s linear infinite' }} /> Chargement…</>
                : isLogin ? '◉ Accéder à la Sphère' : '◈ Créer mon compte'
              }
            </button>
          </form>
        </div>
      </div>

      {/* Footer links */}
      <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeUp .4s .25s ease both' }}>
        <Link href="/" style={{ color: C.dim, fontSize: 11, fontFamily: T.mono, letterSpacing: '.12em' }}>
          ← Retour à la grille
        </Link>
        <div style={{ color: C.dim + '66', fontFamily: T.mono, fontSize: 9, letterSpacing: '.14em' }}>
          DYSON·COSMOS · GALACTIC·ADV·GRID
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#020609',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,180,220,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,220,0.025) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />
      {/* Glow gold bottom */}
      <div style={{ position: 'absolute', bottom: -100, left: '50%', transform: 'translateX(-50%)', width: 500, height: 280, borderRadius: '50%', background: `radial-gradient(ellipse, #E8A02010 0%, transparent 70%)`, pointerEvents: 'none' }} />
      {/* Glow cyan top-right */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(ellipse, #00C8E40a 0%, transparent 65%)`, pointerEvents: 'none' }} />
      {/* Scan line */}
      <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(0,200,240,0.10), transparent)`, animation: 'scanDown 7s linear infinite', pointerEvents: 'none' }} />

      <Suspense fallback={
        <div style={{ color: 'rgba(100,145,185,0.4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.14em' }}>
          INITIALISATION…
        </div>
      }>
        <LoginContent />
      </Suspense>

      <style>{`@keyframes scanDown { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }`}</style>
    </div>
  );
}
