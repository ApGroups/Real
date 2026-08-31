import { supabase } from './supabase';

const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;
const paystackFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string;

export async function loadPaystackScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).PaystackPop) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Paystack checkout script.'));
    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

async function callFunction(path: string, body: unknown) {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${paystackFunctionsUrl}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Paystack function error');
  }
  return payload;
}

export async function startPaystackCheckout(orderId: string, email: string, amount: number) {
  if (!paystackPublicKey) {
    throw new Error('Missing Paystack public key in environment.');
  }
  if (!paystackFunctionsUrl) {
    throw new Error('Missing Supabase functions URL in environment.');
  }

  const init = await callFunction('paystack-init', {
    order_id: orderId,
    email,
    amount,
  });

  await loadPaystackScript();

  if (!window.PaystackPop) {
    throw new Error('Paystack checkout is unavailable.');
  }

  return new Promise<void>((resolve, reject) => {
    window.PaystackPop.setup({
      key: paystackPublicKey,
      email,
      amount: Math.round(amount * 100),
      ref: init.reference,
      metadata: init.metadata || {},
      callback: async (response: { reference: string }) => {
        try {
          const verify = await callFunction('paystack-verify', {
            reference: response.reference,
          });
          if (verify.status === 'verified') {
            resolve();
            return;
          }
          reject(new Error(verify.error || verify.message || 'Payment verification failed.'));
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Payment verification failed.'));
        }
      },
      onClose: () => reject(new Error('Payment window closed.')),
    }).openIframe();
  });
}
