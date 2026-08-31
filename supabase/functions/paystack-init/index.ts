declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || '';

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

async function fetchOrder(orderId: string, userToken: string) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/orders`);
  url.searchParams.set('id', `eq.${orderId}`);
  url.searchParams.set('select', 'id,customer_id,chef_id,total_amount,status,customer:profiles!orders_customer_id_fkey(email)');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!res.ok) throw new Error('Unable to fetch order.');
  const data = await res.json();
  return data[0] ?? null;
}

async function upsertPayment(order: any, reference: string) {
  const payload = {
    order_id: order.id,
    customer_id: order.customer_id,
    amount: order.total_amount,
    currency: 'NGN',
    provider: 'paystack',
    provider_ref: reference,
    status: 'pending',
    metadata: {
      order_id: order.id,
      customer_id: order.customer_id,
      chef_id: order.chef_id,
    },
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create payment record: ${body}`);
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
    return new Response('Server configuration missing', { status: 500 });
  }

  const userToken = await verifyAuth(req);
  if (!userToken) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const orderId = body.order_id as string;
  if (!orderId) return new Response('Missing order_id', { status: 400 });

  const order = await fetchOrder(orderId, userToken);
  if (!order) return new Response('Order not found', { status: 404 });
  if (!['payment_pending', 'payment_failed'].includes(order.status)) {
    return new Response('Order is not eligible for payment', { status: 400 });
  }

  const amount = Number(order.total_amount);
  if (!(amount > 0)) return new Response('Invalid order amount', { status: 400 });

  const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: order.customer.email,
      amount: Math.round(amount * 100),
      currency: 'NGN',
      metadata: {
        order_id: order.id,
        customer_id: order.customer_id,
        chef_id: order.chef_id,
      },
    }),
  });

  const payload = await paystackResponse.json();
  if (!paystackResponse.ok || !payload.status) {
    return new Response(JSON.stringify({ error: payload.message || 'Paystack initialization failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const reference = payload.data.reference as string;
  await upsertPayment(order, reference);

  return new Response(JSON.stringify({
    authorization_url: payload.data.authorization_url,
    reference,
    metadata: payload.data.metadata,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
