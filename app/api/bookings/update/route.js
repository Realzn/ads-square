// app/api/bookings/update/route.js
// Point d'entrée serveur pour toutes les mises à jour du dashboard client.
// Utilise la service_role key pour bypasser la RLS (qui bloque le client anon).
// Vérifie la propriété avant toute écriture.

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const BOOKING_ALLOWED = [
  'display_name', 'slogan', 'description', 'logo_initials',
  'primary_color', 'background_color',
  'cta_text', 'cta_url', 'image_url',
  'badge', 'content_type',
];

const ADVERTISER_ALLOWED = [
  'display_name', 'bio', 'profile_type', 'website_url', 'avatar_url',
  'instagram_url', 'tiktok_url', 'twitter_url', 'youtube_url', 'linkedin_url',
];

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userToken, target = 'booking' } = body;

    if (!userToken) {
      return NextResponse.json({ error: 'userToken requis' }, { status: 400 });
    }

    // 1. Vérifier l'identité via le token JWT Supabase Auth
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser(userToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 2a. Mise à jour d'un booking (contenu créatif ou boost)
    if (target === 'booking' || target === 'boost') {
      const { bookingId, updates } = body;

      if (!bookingId) {
        return NextResponse.json({ error: 'bookingId requis' }, { status: 400 });
      }

      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, advertiser_id, advertisers!inner(email, auth_user_id, user_id)')
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        return NextResponse.json({ error: 'Booking introuvable' }, { status: 404 });
      }

      const adv = booking.advertisers;
      const isOwner =
        adv.email        === user.email ||
        adv.auth_user_id === user.id    ||
        adv.user_id      === user.id;

      if (!isOwner) {
        console.warn('[bookings/update] Accès refusé:', user.email, '->', bookingId);
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }

      const allowedFields = target === 'boost' ? ['is_boosted'] : BOOKING_ALLOWED;
      const filtered = Object.fromEntries(
        Object.entries(updates || {}).filter(([k]) => allowedFields.includes(k))
      );

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ ...filtered, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (updateError) {
        console.error('[bookings/update] booking update failed:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log('[bookings/update] booking', bookingId, '(' + target + ') updated by', user.email);
      return NextResponse.json({ success: true });
    }

    // 2b. Mise à jour du profil advertiser
    if (target === 'advertiser') {
      const { advertiserId, updates } = body;

      if (!advertiserId) {
        return NextResponse.json({ error: 'advertiserId requis' }, { status: 400 });
      }

      const { data: adv, error: fetchError } = await supabase
        .from('advertisers')
        .select('id, email, auth_user_id, user_id')
        .eq('id', advertiserId)
        .single();

      if (fetchError || !adv) {
        return NextResponse.json({ error: 'Advertiser introuvable' }, { status: 404 });
      }

      const isOwner =
        adv.email        === user.email ||
        adv.auth_user_id === user.id    ||
        adv.user_id      === user.id;

      if (!isOwner) {
        console.warn('[bookings/update] Accès refusé advertiser:', user.email, '->', advertiserId);
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }

      const filtered = Object.fromEntries(
        Object.entries(updates || {}).filter(([k]) => ADVERTISER_ALLOWED.includes(k))
      );

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('advertisers')
        .update({ ...filtered, updated_at: new Date().toISOString() })
        .eq('id', advertiserId);

      if (updateError) {
        console.error('[bookings/update] advertiser update failed:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log('[bookings/update] advertiser', advertiserId, 'updated by', user.email);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'target invalide' }, { status: 400 });

  } catch (err) {
    console.error('[bookings/update] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}
