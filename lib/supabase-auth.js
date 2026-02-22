// lib/supabase-auth.js — Supabase Auth helpers (client-side only)

import { supabase } from './supabase';

/**
 * Inscription avec email + mot de passe
 * Crée un compte Supabase Auth puis lie à l'advertiser existant
 */
export async function signUp({ email, password, displayName }) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split('@')[0] },
    },
  });

  if (error) throw error;

  // Lier l'auth user à l'advertiser via fonction SECURITY DEFINER
  if (data.user) {
    await linkAuthUserToAdvertiser(data.user.id, email, displayName);
  }

  return data;
}

/**
 * Connexion email + mot de passe
 * Déclenche aussi le lien auth_user ↔ advertiser (cas paiement avant inscription)
 */
export async function signIn({ email, password }) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Lier le compte auth à l'advertiser existant par email (idempotent)
  // Essentiel pour les utilisateurs qui ont payé AVANT de créer leur compte
  if (data.user) {
    await linkAuthUserToAdvertiser(data.user.id, email, null).catch(() => {});
  }

  return data;
}

/**
 * Déconnexion
 */
export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Récupérer la session courante
 */
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Lier l'auth user à l'advertiser via RPC SECURITY DEFINER
 * Crée l'advertiser s'il n'existe pas encore.
 */
async function linkAuthUserToAdvertiser(authUserId, email, displayName) {
  if (!supabase) return;
  try {
    await supabase.rpc('link_auth_user_to_advertiser', {
      p_auth_user_id: authUserId,
      p_email: email,
      p_display_name: displayName || null,
    });
  } catch (err) {
    console.warn('[Auth] linkAuthUserToAdvertiser failed (non-fatal):', err?.message);
  }
}

/**
 * Récupérer le profil advertiser de l'utilisateur connecté
 * Stratégie multi-niveaux pour garantir le retour même si user_id n'est pas encore lié
 */
export async function getAdvertiserProfile() {
  if (!supabase) return null;
  const session = await getSession();
  if (!session) return null;

  // 1. Essai principal : chercher par user_id (après migration 015)
  const { data: byUserId, error: err1 } = await supabase
    .from('advertisers')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (byUserId) return byUserId;

  // 2. Fallback : chercher par email (avant migration ou lien pas encore fait)
  const { data: byEmail, error: err2 } = await supabase
    .from('advertisers')
    .select('*')
    .eq('email', session.user.email)
    .maybeSingle();

  if (byEmail) {
    // Lien manquant → le réparer maintenant en background
    linkAuthUserToAdvertiser(session.user.id, session.user.email, null).catch(() => {});
    return byEmail;
  }

  // 3. Tentative via RPC sécurisée (fallback supplémentaire)
  try {
    const { data: rpcData } = await supabase.rpc('get_my_advertiser_profile');
    if (rpcData && rpcData.length > 0) return rpcData[0];
  } catch (_) {}

  return null;
}

/**
 * Récupérer tous les bookings de l'utilisateur connecté
 * Utilise l'email comme fallback si auth_user_id non lié
 */
export async function getDashboardBookings() {
  if (!supabase) return [];
  const session = await getSession();
  if (!session) return [];

  // 1. Essai via la vue dashboard_bookings (filtre sur auth_user_id = user_id)
  const { data: byUserId, error: err1 } = await supabase
    .from('dashboard_bookings')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (!err1 && byUserId && byUserId.length > 0) return byUserId;

  // 2. Fallback : requête directe via advertiser_id trouvé par email
  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle();

  if (!advertiser) return [];

  const { data: byAdvId, error: err2 } = await supabase
    .from('bookings')
    .select(`
      *,
      advertisers!inner(email, display_name, stripe_customer_id, user_id)
    `)
    .eq('advertiser_id', advertiser.id)
    .order('created_at', { ascending: false });

  if (err2) {
    console.error('[Auth] getDashboardBookings fallback:', err2.message);
    return [];
  }

  // Normaliser pour correspondre au format de dashboard_bookings
  return (byAdvId || []).map(b => ({
    ...b,
    email: b.advertisers?.email,
    advertiser_name: b.advertisers?.display_name,
    stripe_customer_id: b.advertisers?.stripe_customer_id,
    auth_user_id: b.advertisers?.user_id,
  }));
}

/**
 * Mettre à jour le contenu créatif d'un booking
 */
export async function updateBookingContent(bookingId, updates) {
  if (!supabase) throw new Error('Supabase not configured');

  const allowed = [
    'display_name', 'slogan', 'description', 'logo_initials', 'primary_color',
    'background_color', 'cta_text', 'cta_url', 'image_url',
    'badge', 'content_type',
  ];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  const { error } = await supabase
    .from('bookings')
    .update(filtered)
    .eq('id', bookingId);

  if (error) throw error;
}

/**
 * Mettre à jour le profil advertiser
 */
export async function updateAdvertiserProfile(advertiserId, updates) {
  if (!supabase) throw new Error('Supabase not configured');

  const allowed = [
    'display_name', 'bio', 'profile_type', 'website_url', 'avatar_url',
    'instagram_url', 'tiktok_url', 'twitter_url', 'youtube_url', 'linkedin_url',
  ];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  const { error } = await supabase
    .from('advertisers')
    .update(filtered)
    .eq('id', advertiserId);

  if (error) throw error;
}

/**
 * Upload une image vers Supabase Storage et retourne l'URL publique
 */
export async function uploadBlockImage(file, bookingId) {
  if (!supabase) throw new Error('Supabase not configured');
  const session = await getSession();
  if (!session) throw new Error('Non authentifié');

  const ext = file.name.split('.').pop();
  const path = `${session.user.id}/${bookingId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('block-images')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('block-images').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Toggler le boost d'un booking (annonceur authentifié uniquement)
 */
export async function toggleBookingBoost(bookingId, isBoosted) {
  if (!supabase) throw new Error('Supabase not configured');
  const session = await getSession();
  if (!session) throw new Error('Non authentifié');

  const { error } = await supabase
    .from('bookings')
    .update({ is_boosted: isBoosted })
    .eq('id', bookingId);

  if (error) throw error;
}