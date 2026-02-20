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
 */
export async function signIn({ email, password }) {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
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
 */
async function linkAuthUserToAdvertiser(authUserId, email, displayName) {
  if (!supabase) return;
  await supabase.rpc('link_auth_user_to_advertiser', {
    p_auth_user_id: authUserId,
    p_email: email,
    p_display_name: displayName || null,
  });
}

/**
 * Récupérer le profil advertiser de l'utilisateur connecté
 */
export async function getAdvertiserProfile() {
  if (!supabase) return null;
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('advertisers')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Récupérer tous les bookings de l'utilisateur connecté
 */
export async function getDashboardBookings() {
  if (!supabase) return [];
  const session = await getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('dashboard_bookings')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Auth] getDashboardBookings:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Mettre à jour le contenu créatif d'un booking
 */
export async function updateBookingContent(bookingId, updates) {
  if (!supabase) throw new Error('Supabase not configured');

  const allowed = [
    'display_name', 'slogan', 'logo_initials', 'primary_color',
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
