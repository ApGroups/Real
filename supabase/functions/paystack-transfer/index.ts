declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || '';

async function verifyAuth(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.split(' ')[1];
}

async function fetchPayoutRequest(id: string) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/payout_requests`);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) throw new Error('Unable to fetch payout request');
  const data = await res.json();
  return data[0] ?? null;
}

async function upsertTransactionLog(log: Record<string, unknown>) {
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

  // simple auth presence check
  const userToken = await verifyAuth(req);
  if (!userToken) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const payoutId = body.payout_request_id as string;
  if (!payoutId) return new Response('Missing payout_request_id', { status: 400 });

  try {
    const payout = await fetchPayoutRequest(payoutId);
    if (!payout) return new Response('Payout request not found', { status: 404 });
    if (payout.status !== 'pending') return new Response('Payout is not pending', { status: 400 });

    const metadata = payout.metadata || {};
    const accountNumber = metadata.bank_account;
    const bankCode = metadata.bank_code;
    const accountName = metadata.bank_name || 'Chef';

    if (!accountNumber || !bankCode) return new Response('Missing bank details in payout request metadata', { status: 400 });

    // Create transfer recipient on Paystack
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });

    const recipientPayload = await recipientRes.json();
    if (!recipientRes.ok || !recipientPayload.status) {
      return new Response(JSON.stringify({ error: recipientPayload.message || 'Recipient creation failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const recipientCode = recipientPayload.data.recipient_code;

    // Initiate transfer
    const amountKobo = Math.round(Number(payout.amount) * 100);
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amountKobo,
        recipient: recipientCode,
        reason: `Payout ${payout.id}`,
        metadata: { payout_request_id: payout.id },
      }),
    });

    const transferPayload = await transferRes.json();
    if (!transferRes.ok || !transferPayload.status) {
      return new Response(JSON.stringify({ error: transferPayload.message || 'Transfer initiation failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const transferData = transferPayload.data;

    // Update payout_request with transfer ref and set status -> processing
    await fetch(`${SUPABASE_URL}/rest/v1/payout_requests?id=eq.${payout.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ status: 'processing', paystack_transfer_ref: transferData.reference }),
    });

    // Log transaction
    await upsertTransactionLog({
      payout_request_id: payout.id,
      event_type: 'transfer.initiated',
      amount: Number(payout.amount),
      provider: 'paystack',
      provider_ref: transferData.reference,
      provider_event_id: transferData.id,
      status: transferData.status,
      metadata: transferData,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ status: 'initiated', reference: transferData.reference }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Transfer failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
