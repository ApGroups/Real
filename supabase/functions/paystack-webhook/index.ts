declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || '';

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifySignature(rawBody: string, signature: string) {
  const secretKey = new TextEncoder().encode(PAYSTACK_SECRET_KEY);
  const data = new TextEncoder().encode(rawBody);
  const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-512' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, hexToBytes(signature), data);
}

async function updatePaymentStatus(reference: string, status: string, event: any) {
  await fetch(`${SUPABASE_URL}/rest/v1/payments?provider_ref=eq.${reference}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status, metadata: event.data }),
  });
}

async function logTransaction(log: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/transaction_logs`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(log),
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
    return new Response('Server configuration missing', { status: 500 });
  }

  const signature = req.headers.get('x-paystack-signature') || '';
  const rawBody = await req.text();
  const valid = await verifySignature(rawBody, signature);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(rawBody);
  const eventType = event.event;
  const data = event.data || {};

  if (eventType === 'charge.success') {
    const reference = data.reference as string;
    if (reference) {
      await updatePaymentStatus(reference, 'completed', event);
      await logTransaction({
        order_id: data.metadata?.order_id,
        event_type: 'charge.success',
        amount: Number(data.amount) / 100,
        currency: data.currency,
        provider: 'paystack',
        provider_event_id: data.id,
        metadata: event,
      });
    }
  }

  if (eventType === 'transfer.success') {
    const payoutId = data.metadata?.payout_request_id;
    if (payoutId) {
      await fetch(`${SUPABASE_URL}/rest/v1/payout_requests?id=eq.${payoutId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'completed', paid_at: new Date().toISOString(), paystack_transfer_ref: data.reference, paystack_transfer_id: data.id }),
      });
      await logTransaction({
        payout_request_id: payoutId,
        event_type: 'transfer.success',
        amount: Number(data.amount) / 100,
        currency: data.currency,
        provider: 'paystack',
        provider_event_id: data.id,
        metadata: event,
      });
    }
  }

  if (eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
    const payoutId = data.metadata?.payout_request_id;
    if (payoutId) {
      await fetch(`${SUPABASE_URL}/rest/v1/payout_requests?id=eq.${payoutId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'failed', metadata: event }),
      });
      await logTransaction({
        payout_request_id: payoutId,
        event_type: eventType,
        amount: Number(data.amount) / 100,
        currency: data.currency,
        provider: 'paystack',
        provider_event_id: data.id,
        metadata: event,
      });
    }
  }

  if (eventType === 'refund.processed') {
    const refundReference = data.reference as string;
    if (refundReference) {
      await fetch(`${SUPABASE_URL}/rest/v1/refunds?provider_ref=eq.${refundReference}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'completed', metadata: event }),
      });
      await logTransaction({
        refund_id: data.id,
        event_type: 'refund.processed',
        amount: Number(data.amount) / 100,
        currency: data.currency,
        provider: 'paystack',
        provider_event_id: data.id,
        metadata: event,
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
