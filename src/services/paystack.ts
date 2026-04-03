import axios from 'axios';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

export async function createPayment({ amount, email, callback_url }: { amount: number; email: string; callback_url: string }) {
  const response = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, {
    amount: amount * 100, // kobo
    email,
    callback_url,
  }, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data.data;
}

export async function verifyPayment(reference: string) {
  const response = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
    },
  });
  return response.data.data;
}
