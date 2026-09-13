export async function createRazorpayOrder(amount: number, notes: any) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing');
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      amount: Math.round(amount),
      currency: 'INR',
      notes
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay API error: ${errorText}`);
  }

  return await response.json();
}
