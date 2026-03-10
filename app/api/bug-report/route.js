// app/api/bug-report/route.js
// Reçoit un signalement de bug et envoie un email à support@adsmostfair.com

import { NextResponse } from 'next/server';
import { sendBugReport } from '../../../lib/emails';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, description, page, lang } = await request.json();

    if (!email || !description) {
      return NextResponse.json({ error: 'Email et description requis' }, { status: 400 });
    }

    await sendBugReport({ email, description, page: page || '', lang: lang || 'fr' });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[BugReport] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
