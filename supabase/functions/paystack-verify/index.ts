declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || '';

async function fetchPayment(reference: string) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/payments`);
  url.searchParams.set('provider_ref', `eq.${reference}`);
  url.searchParams.set('select', 'id,order_id,amount,status');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) throw new Error('Unable to query payment record.');
  const results = await res.json();
  return results[0] ?? null;
}

async function updatePaymentAndOrder(reference: string, paidAmount: number, paystackResponse: any) {
  const paymentUpdate = {
    status: 'completed',
    amount: paidAmount,
    metadata: paystackResponse.metadata ?? {},
  };

  const paymentRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?provider_ref=eq.${reference}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(paymentUpdate),
  });

  if (!paymentRes.ok) {
    const body = await paymentRes.text();
    throw new Error(`Failed to update payment: ${body}`);
  }

  const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${paystackResponse.metadata.order_id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status: 'payment_confirmed' }),
  });

  if (!orderRes.ok) {
    const body = await orderRes.text();
    throw new Error(`Failed to update order: ${body}`);
  }

  await fetch(`${SUPABASE_URL}/rest/v1/transaction_logs`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      order_id: paystackResponse.metadata.order_id,
      payment_id: paystackResponse.metadata.payment_id,
      event_type: 'charge.success',
      amount: paidAmount,
      currency: paystackResponse.currency,
      provider: 'paystack',
      provider_event_id: paystackResponse.id,
      metadata: paystackResponse,
    }),
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
    return new Response('Server configuration missing', { status: 500 });
  }

  const body = await req.json();
  const reference = body.reference as string;
  if (!reference) return new Response('Missing payment reference', { status: 400 });

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const verification = await verifyRes.json();
  if (!verifyRes.ok || !verification.status) {
    return new Response(JSON.stringify({ error: verification.message || 'Paystack verification failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const paystackData = verification.data;
  if (paystackData.status !== 'success') {
    return new Response(JSON.stringify({ error: 'Payment is not successful' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const grossAmount = Number(paystackData.amount) / 100;
  const payment = await fetchPayment(reference);
  if (!payment) return new Response('Payment record not found', { status: 404 });

  if (Number(payment.amount) !== grossAmount) {
    return new Response(JSON.stringify({ error: 'Payment amount mismatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await updatePaymentAndOrder(reference, grossAmount, {
    ...paystackData,
    metadata: { ...paystackData.metadata, payment_id: payment.id },
  });

  return new Response(JSON.stringify({ status: 'verified' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
