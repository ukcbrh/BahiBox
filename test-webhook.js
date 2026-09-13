import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const orderId = 'order_test123';
  const amount = 50000;

  const payload = {
    entity: 'event',
    account_id: 'acc_123',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: 'pay_TEST123',
          entity: 'payment',
          amount: amount,
          currency: 'INR',
          status: 'captured',
          order_id: orderId,
          method: 'card',
          amount_refunded: 0,
          refund_status: null,
          captured: true,
          description: 'Subscription',
          fee: 100,
          notes: {
            billing_cycle: 'yearly'
          }
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  };

  const payloadString = JSON.stringify(payload);
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

  const url = 'http://localhost:3000/api/razorpay-webhook';
  console.log('Sending to', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': signature
      },
      body: payloadString
    });
    
    const text = await response.text();
    console.log('Status Code:', response.status);
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
