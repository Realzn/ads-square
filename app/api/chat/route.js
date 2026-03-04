// app/api/chat/route.js
// GET  : historique d'un canal (100 derniers msgs)
// POST : envoyer un message (serveur-side validation)
// DELETE : supprimer un message (admin ou auteur)

import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase-server';

const VALID_CHANNELS = ['general','annonces','createurs','collab','music','vitrines','offtopic'];
const READ_ONLY      = ['annonces'];
const MAX_MSG_LEN    = 2000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel');
  const before  = searchParams.get('before');   // cursor pagination
  const limit   = Math.min(parseInt(searchParams.get('limit') || '80'), 100);

  if (!channel || !VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: 'Canal invalide' }, { status: 400 });
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channel)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: (data || []).reverse() });
}

export async function POST(request) {
  try {
    const { channel, content, author_name, author_id, author_badge, image_url } = await request.json();

    if (!channel || !VALID_CHANNELS.includes(channel))
      return NextResponse.json({ error: 'Canal invalide' }, { status: 400 });
    if (READ_ONLY.includes(channel))
      return NextResponse.json({ error: 'Canal en lecture seule' }, { status: 403 });
    if (!content?.trim())
      return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    if (content.length > MAX_MSG_LEN)
      return NextResponse.json({ error: `Message trop long (max ${MAX_MSG_LEN} chars)` }, { status: 400 });
    if (!author_name?.trim())
      return NextResponse.json({ error: 'Pseudo requis' }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id:   channel,
        author_id:    author_id || null,
        author_name:  author_name.trim().slice(0, 32),
        author_badge: author_badge || null,
        content:      content.trim(),
        image_url:    image_url || null,
        reactions:    {},
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { message_id, requester_id, requester_name } = await request.json();
    if (!message_id) return NextResponse.json({ error: 'message_id requis' }, { status: 400 });

    const supabase = createServiceClient();

    // Vérifier que c'est l'auteur ou un admin
    const { data: msg } = await supabase
      .from('chat_messages')
      .select('author_id, author_name')
      .eq('id', message_id)
      .single();

    if (!msg) return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });

    const isAuthor = (requester_id && msg.author_id === requester_id) ||
                     (requester_name && msg.author_name === requester_name);

    // TODO: vérifier rôle admin via supabase auth si besoin
    if (!isAuthor)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    await supabase.from('chat_messages').delete().eq('id', message_id);
    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
