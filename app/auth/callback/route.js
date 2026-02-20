// app/auth/callback/route.js
// Handles Supabase Auth email confirmation callback

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') || '/dashboard';

  if (code) {
    // Exchange code for session — handled client-side by Supabase
    // Redirect to dashboard, Supabase JS SDK picks up the session from URL hash
    return NextResponse.redirect(`${origin}${next}?code=${code}`);
  }

  // No code — redirect to login
  return NextResponse.redirect(`${origin}/dashboard/login`);
}
