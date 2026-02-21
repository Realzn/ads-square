// app/bloc/[xy]/page.js
// Route partageable pour un bloc actif : /bloc/12-18
// • SSR metadata OG dynamiques (titre, image du bloc)
// • Client : charge la grille et ouvre FocusModal sur le bon slot

import { Suspense } from 'react';
import BlocClient from './BlocClient';
import { createServiceClient } from '../../../lib/supabase-server';
import { getTier, TIER_LABEL, TIER_COLOR } from '../../../lib/grid';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ads-square.com';

// ── SSR : fetch le slot pour les metadata ─────────────────────
async function fetchBlocData(x, y) {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('active_slots')
      .select('display_name,slogan,primary_color,image_url,content_type,cta_url,is_occupied')
      .eq('x', x)
      .eq('y', y)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

// ── Metadata OG dynamiques ─────────────────────────────────────
export async function generateMetadata({ params }) {
  const [xStr, yStr] = (params.xy || '').split('-');
  const x = parseInt(xStr, 10);
  const y = parseInt(yStr, 10);

  if (isNaN(x) || isNaN(y)) {
    return { title: 'Bloc introuvable | ADS-SQUARE' };
  }

  const tier  = getTier(x, y);
  const label = TIER_LABEL[tier] || tier;
  const data  = await fetchBlocData(x, y);

  if (!data?.is_occupied) {
    return {
      title:       `Bloc ${label} (${x},${y}) — Disponible | ADS-SQUARE`,
      description: `Ce bloc publicitaire ${label} en position (${x},${y}) est disponible. Réservez-le dès 1€/jour sur ADS-SQUARE.`,
      openGraph: {
        title:       `Bloc ${label} disponible sur ADS-SQUARE`,
        description: 'Réservez cet espace publicitaire dès 1€/jour.',
        images:      [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
      },
    };
  }

  const name    = data.display_name || 'Annonceur';
  const slogan  = data.slogan || `Découvrez ${name} sur ADS-SQUARE`;
  const color   = data.primary_color || TIER_COLOR[tier];
  const imgUrl  = data.image_url
    ? data.image_url  // image du bloc si dispo
    : `${SITE_URL}/og.png`;

  return {
    title:       `${name} — Bloc ${label} | ADS-SQUARE`,
    description: slogan,
    openGraph: {
      title:       `${name} sur ADS-SQUARE`,
      description: slogan,
      url:         `${SITE_URL}/bloc/${x}-${y}`,
      siteName:    'ADS-SQUARE',
      type:        'website',
      images: [{
        url:    imgUrl,
        width:  1200,
        height: 630,
        alt:    `${name} — ${slogan}`,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${name} sur ADS-SQUARE`,
      description: slogan,
      images:      [imgUrl],
    },
  };
}

// ── Page component ─────────────────────────────────────────────
export default function BlocPage({ params }) {
  const [xStr, yStr] = (params.xy || '').split('-');
  const x = parseInt(xStr, 10);
  const y = parseInt(yStr, 10);

  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#020609', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans',sans-serif" }}>
        Chargement…
      </div>
    }>
      <BlocClient x={x} y={y} />
    </Suspense>
  );
}
