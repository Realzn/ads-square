'use client';
// BlocClient.js — charge la grille, ouvre FocusModal sur le slot cible
// Réutilise exactement les mêmes composants que la page principale.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  buildStructuralGrid, buildDemoGrid, mergeGridWithBookings,
  getTier, TIER_LABEL, TIER_COLOR,
} from '../../../lib/grid';
import {
  isSupabaseConfigured, fetchActiveSlots,
} from '../../../lib/supabase';

const U = {
  bg: '#020609', s1: '#0f0f0f', s2: '#151515',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f0', muted: 'rgba(255,255,255,0.36)',
  accent: '#d4a84b', accentFg: '#080808',
};
const F = { h: "'Clash Display','Syne',sans-serif", b: "'DM Sans','Inter',sans-serif" };

export default function BlocClient({ x, y }) {
  const [slots, setSlots]     = useState(() => buildDemoGrid());
  const [isLive, setIsLive]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Load live slots
  useEffect(() => {
    const structural = buildStructuralGrid();
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    fetchActiveSlots().then(({ data, error }) => {
      if (!error && data) {
        setSlots(mergeGridWithBookings(structural, data));
        setIsLive(true);
      }
      setLoading(false);
    });
  }, []);

  // Find the target slot
  const slot = useMemo(() => {
    const found = slots.find(s => s.x === x && s.y === y);
    return found || null;
  }, [slots, x, y]);

  useEffect(() => {
    if (!loading && !slot) setNotFound(true);
  }, [loading, slot]);

  const tier  = slot?.tier || getTier(x, y);
  const c     = slot?.occ ? (slot.tenant?.c || TIER_COLOR[tier]) : TIER_COLOR[tier];
  const label = TIER_LABEL[tier];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: U.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.b }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${U.accent}20`, border: `1px solid ${U.accent}40`, margin: '0 auto 16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ color: U.muted, fontSize: 13 }}>Chargement du bloc…</div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blockGlow {
          0%,100% { box-shadow:0 0 24px ${c}50,0 0 48px ${c}20; }
          50%      { box-shadow:0 0 36px ${c}80,0 0 72px ${c}35; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: U.bg, fontFamily: F.b, display: 'flex', flexDirection: 'column' }}>

        {/* Header minimal */}
        <header style={{ padding: '16px 24px', borderBottom: `1px solid ${U.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22 }}>
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="7" fill="#020609"/>
                <rect x="4" y="4" width="11" height="11" rx="2" fill="#00d9f5" opacity=".9"/>
                <rect x="17" y="4" width="11" height="11" rx="2" fill="#9d7dff" opacity=".7"/>
                <rect x="4" y="17" width="11" height="11" rx="2" fill="#9d7dff" opacity=".7"/>
                <rect x="17" y="17" width="11" height="11" rx="2" fill="#00d9f5" opacity=".5"/>
              </svg>
            </div>
            <span style={{ color: U.text, fontWeight: 800, fontSize: 14, fontFamily: F.h, letterSpacing: '0.04em' }}>ADS-SQUARE</span>
          </Link>
          <Link href="/" style={{ color: U.muted, fontSize: 12, textDecoration: 'none' }}>
            ← Explorer la grille
          </Link>
        </header>

        {/* Contenu */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
          {notFound ? (
            <NotFoundState x={x} y={y} />
          ) : slot ? (
            <BlocCard slot={slot} isLive={isLive} />
          ) : null}
        </div>
      </div>
    </>
  );
}

// ── Carte principale du bloc ───────────────────────────────────
function BlocCard({ slot, isLive }) {
  const { tier, occ, tenant } = slot;
  const c = occ ? (tenant?.c || TIER_COLOR[tier]) : TIER_COLOR[tier];
  const label = TIER_LABEL[tier];
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://ads-square.com/bloc/${slot.x}-${slot.y}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: occ ? `${tenant.name} sur ADS-SQUARE` : `Bloc ${label} disponible`,
          text:  occ ? (tenant.slogan || tenant.name) : `Ce bloc publicitaire est disponible dès 1€/jour.`,
          url:   shareUrl,
        });
        return;
      } catch { /* user cancelled */ }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* silent fail */ }
  };

  return (
    <div style={{ maxWidth: 520, width: '100%', animation: 'fadeIn 0.35s ease forwards' }}>

      {/* Bloc preview hero */}
      <div style={{ position: 'relative', marginBottom: 20, padding: '32px', background: `${c}06`, border: `1px solid ${c}20`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, overflow: 'hidden' }}>
        {/* Fond hachures */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${c}12 0%, transparent 70%)` }} />

        {occ && tenant?.img && (
          <img src={tenant.img} alt={tenant.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }} />
        )}

        {/* Bloc animé */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 80, height: 80, borderRadius: 14,
          background: occ ? (tenant?.b || `${c}18`) : `${c}10`,
          border: `2px solid ${c}`,
          animation: 'blockGlow 2.5s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {occ && tenant?.img ? (
            <img src={tenant.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : occ && tenant ? (
            <span style={{ color: c, fontWeight: 900, fontSize: 28, fontFamily: F.h }}>{tenant.l}</span>
          ) : (
            <span style={{ color: `${c}60`, fontSize: 24 }}>⬡</span>
          )}
        </div>

        {/* Badge LIVE */}
        {isLive && (
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'rgba(0,232,162,0.1)', border: '1px solid rgba(0,232,162,0.3)', borderRadius: 20 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e8a2', boxShadow: '0 0 6px #00e8a2' }} />
            <span style={{ color: '#00e8a2', fontSize: 9, fontWeight: 700 }}>LIVE</span>
          </div>
        )}

        {/* Tier badge */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, padding: '3px 8px', background: `${c}18`, border: `1px solid ${c}40`, borderRadius: 4, color: c, fontSize: 9, fontWeight: 800, fontFamily: F.h, letterSpacing: '0.08em' }}>
          {label} · ({slot.x}, {slot.y})
        </div>
      </div>

      {/* Card infos */}
      <div style={{ background: '#111', border: `1px solid ${U.border2}`, borderRadius: 14, padding: '22px 22px 18px', marginBottom: 10 }}>
        {occ && tenant ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, background: tenant.img ? `url(${tenant.img}) center/cover` : `${c}18`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: c, fontFamily: F.h, overflow: 'hidden' }}>
                {!tenant.img && tenant.l}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, letterSpacing: '-0.02em', marginBottom: 4 }}>{tenant.name}</div>
                <div style={{ color: U.muted, fontSize: 13, lineHeight: 1.5 }}>{tenant.slogan}</div>
              </div>
            </div>

            {/* CTA principal */}
            {tenant.url && tenant.url !== '#' && (
              <a
                href={tenant.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 20px', borderRadius: 10, background: c, color: '#000', fontWeight: 700, fontSize: 14, fontFamily: F.b, textDecoration: 'none', boxShadow: `0 0 22px ${c}50`, marginBottom: 10 }}
              >
                {tenant.cta || 'Visiter'} →
              </a>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
            <div style={{ color: U.text, fontWeight: 700, fontSize: 17, fontFamily: F.h, marginBottom: 6 }}>Bloc {label} disponible</div>
            <div style={{ color: U.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>Cet espace est libre. Réservez-le pour diffuser votre contenu dès aujourd'hui.</div>
            <Link href="/?view=advertiser" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 9, background: U.accent, color: U.accentFg, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Réserver ce bloc →
            </Link>
          </div>
        )}

        {/* Bouton partager */}
        <button
          onClick={handleShare}
          style={{
            width: '100%', padding: '11px', borderRadius: 9,
            background: 'transparent', border: `1px solid ${U.border2}`,
            color: copied ? '#00e8a2' : U.muted,
            fontFamily: F.b, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'all 0.2s',
          }}
        >
          {copied ? (
            <><span>✓</span> Lien copié !</>
          ) : (
            <><span>⎘</span> Partager ce bloc</>
          )}
        </button>
      </div>

      {/* Footer lien retour grille */}
      <div style={{ textAlign: 'center' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textDecoration: 'none' }}>
          Voir tous les blocs sur la grille →
        </Link>
      </div>
    </div>
  );
}

// ── 404 bloc ───────────────────────────────────────────────────
function NotFoundState({ x, y }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 400 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⬡</div>
      <div style={{ color: U.text, fontWeight: 700, fontSize: 20, fontFamily: F.h, marginBottom: 8 }}>Bloc introuvable</div>
      <div style={{ color: U.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        Le bloc ({x}, {y}) n'existe pas ou n'est plus actif.
      </div>
      <Link href="/" style={{ display: 'inline-flex', padding: '11px 22px', borderRadius: 9, background: U.accent, color: U.accentFg, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
        Explorer la grille →
      </Link>
    </div>
  );
}
