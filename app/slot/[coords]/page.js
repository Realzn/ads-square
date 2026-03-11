// app/slot/[coords]/page.js
// Page SEO publique pour chaque slot de la grille
// URL : /slot/18-18  ou  /slot/18-18/nom-du-createur

import { Suspense } from 'react';
import SlotPageClient from './SlotPageClient';

export async function generateMetadata({ params }) {
  const { coords } = await params;
  const [xStr, yStr] = coords.split('-');
  const x = parseInt(xStr), y = parseInt(yStr);

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://adsmostfair.com';

  // Fetch slot data server-side for metadata
  try {
    const res = await fetch(`${APP_URL}/api/slot?x=${x}&y=${y}`, { next: { revalidate: 300 } });
    const data = await res.json();
    const booking = data?.booking;
    const tier = data?.slot?.tier || 'viral';

    if (booking) {
      return {
        title: `${booking.display_name} · Slot [${x},${y}] · AdsMostFair`,
        description: booking.slogan || `${booking.display_name} occupe le slot ${tier.toUpperCase()} [${x},${y}] sur AdsMostFair. ${booking.cta_text || 'Découvrir'}`,
        openGraph: {
          title: `${booking.display_name} sur AdsMostFair`,
          description: booking.slogan || `Slot ${tier.toUpperCase()} occupé par ${booking.display_name}`,
          type: 'website',
          url: `${APP_URL}/slot/${coords}`,
          images: [{ url: booking.image_url || `${APP_URL}/og.png`, width: 1200, height: 630 }],
        },
        twitter: {
          card: 'summary_large_image',
          title: `${booking.display_name} · AdsMostFair`,
          description: booking.slogan || '',
        },
      };
    }
  } catch (e) {}

  return {
    title: `Slot [${x},${y}] · AdsMostFair`,
    description: `Slot disponible à la réservation sur AdsMostFair, la grille publicitaire ouverte à tous. Réservez dès 1€/jour.`,
    openGraph: {
      title: `Slot [${x},${y}] disponible · AdsMostFair`,
      description: `Réservez ce slot sur AdsMostFair dès 1€/jour.`,
      type: 'website',
      url: `${APP_URL}/slot/${coords}`,
      images: [{ url: `${APP_URL}/og.png`, width: 1200, height: 630 }],
    },
  };
}

export default async function SlotPage({ params }) {
  const { coords } = await params;
  const [xStr, yStr] = coords.split('-');
  const x = parseInt(xStr), y = parseInt(yStr);

  if (isNaN(x) || isNaN(y) || x < 0 || x > 36 || y < 0 || y > 36) {
    return (
      <div style={{ minHeight: '100vh', background: '#01020A', color: '#DDE6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Slot invalide.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#01020A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(140,180,220,0.55)', fontSize: 13, letterSpacing: '0.1em' }}>CHARGEMENT…</div>
      </div>
    }>
      <SlotPageClient x={x} y={y} />
    </Suspense>
  );
}
