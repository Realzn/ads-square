import { NextResponse } from 'next/server';
import { ingestAIEvent } from '../../../../../lib/ai/events';

export const dynamic = 'force-dynamic';

function checkIngestAuth(request) {
  const headerToken = request.headers.get('x-ai-secret');
  const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = headerToken || bearer;
  const secret = process.env.AI_INGEST_SECRET || process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (!secret) return true;
  return token === secret;
}

export async function POST(request) {
  if (!checkIngestAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await ingestAIEvent({
      eventType: body.eventType,
      eventSource: body.eventSource || 'api.ai.ingest',
      entityType: body.entityType,
      entityId: body.entityId,
      advertiserId: body.advertiserId,
      bookingId: body.bookingId,
      payload: body.payload || {},
      happenedAt: body.happenedAt,
    });

    if (!result.ok && !result.skipped) {
      return NextResponse.json({ error: result.error || 'Ingestion failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
