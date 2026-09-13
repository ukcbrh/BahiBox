import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: any) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = await getRawBody(req);

  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      console.error('Webhook secret not configured');
      return res.status(500).send('Configuration Error');
    }

    const expectedSignature = crypto.createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid Signature');
    }

    const payload = JSON.parse(rawBody.toString());
    console.log('Received Razorpay Webhook:', payload.event);

    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;

      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! || process.env.VITE_SUPABASE_ANON_KEY!
      );

      const razorpay_order_id = payment.order_id;
      const razorpay_payment_id = payment.id;
      const method = payment.method;
      const gateway_fee = (payment.fee || 0) / 100;

      await supabase.from('payment_webhook_events').insert({
        event_type: payload.event,
        payload: payload
      });

      const { data: orderData } = await supabase
        .from('payment_orders')
        .select('id')
        .eq('razorpay_order_id', razorpay_order_id)
        .single();

      if (orderData) {
        await supabase.rpc('capture_payment', {
          p_payment_order_id: orderData.id,
          p_razorpay_payment_id: razorpay_payment_id,
          p_method: method,
          p_gateway_fee: gateway_fee,
          p_raw_response: payload
        });
      } else {
        console.log(`Payment order not found for razorpay_order_id: ${razorpay_order_id}`);
      }
    } else if (payload.event === 'qr_code.credited') {
      const payment = payload.payload.payment.entity;
      const qrCodeEntity = payload.payload.qr_code.entity;

      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! || process.env.VITE_SUPABASE_ANON_KEY!
      );

      const tenantId = qrCodeEntity.notes?.tenant_id;
      const branchId = qrCodeEntity.notes?.branch_id;
      const invoiceId = qrCodeEntity.notes?.invoice_id;
      const challanId = qrCodeEntity.notes?.challan_id;

      if (challanId) {
        // This QR belongs to a specific Delivery Challan Outward — 
        // record a real payment against it (same accounting entries as 
        // any other customer payment) and close the QR so it can't be 
        // paid again.
        const { data: challanData } = await supabase
          .from('delivery_challans_outward')
          .select('id, tenant_id, customer_id, created_by, payment_status')
          .eq('id', challanId)
          .maybeSingle();

        if (challanData && challanData.payment_status !== 'paid' && challanData.customer_id) {
          const { error: payErr } = await supabase.rpc('record_customer_payment', {
            p_tenant_id: challanData.tenant_id,
            p_customer_id: challanData.customer_id,
            p_sales_invoice_id: null,
            p_amount: (payment.amount || 0) / 100,
            p_payment_method: 'online',
            p_payment_date: new Date().toISOString().slice(0, 10),
            p_reference_note: 'Razorpay QR payment (Delivery Challan)',
            p_created_by: challanData.created_by,
            p_delivery_challan_outward_id: challanId
          });

          if (!payErr) {
            await supabase.from('delivery_challans_outward').update({ payment_status: 'paid' }).eq('id', challanId);
          } else {
            console.error('Failed to record challan payment:', payErr.message);
          }

          try {
            const keyId = process.env.RAZORPAY_KEY_ID;
            const keySecret = process.env.RAZORPAY_KEY_SECRET;
            if (keyId && keySecret) {
              const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
              await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrCodeEntity.id}/close`, {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth}` }
              });
            }
          } catch (closeErr: any) {
            console.error('Failed to close challan payment QR:', closeErr.message);
          }
        }
      } else if (invoiceId) {
        // This QR belongs to a specific credit-invoice — mark it paid, 
        // reduce the customer's credit exposure, and close the QR so 
        // it can't be paid again.
        const { data: invoiceData } = await supabase
          .from('sales_invoices')
          .select('id, tenant_id, customer_id, total_amount, status')
          .eq('id', invoiceId)
          .maybeSingle();

        if (invoiceData && invoiceData.status !== 'paid') {
          await supabase.from('sales_invoices').update({ status: 'paid' }).eq('id', invoiceId);

          const { data: creditLimitRow } = await supabase
            .from('credit_limits')
            .select('id, current_exposure')
            .eq('tenant_id', invoiceData.tenant_id)
            .eq('party_type', 'customer')
            .eq('party_id', invoiceData.customer_id)
            .maybeSingle();

          if (creditLimitRow) {
            const newExposure = Math.max(0, Number(creditLimitRow.current_exposure) - Number(invoiceData.total_amount));
            await supabase.from('credit_limits').update({ current_exposure: newExposure }).eq('id', creditLimitRow.id);
          }

          // Close the QR so it can't be scanned/paid again for this invoice.
          try {
            const keyId = process.env.RAZORPAY_KEY_ID;
            const keySecret = process.env.RAZORPAY_KEY_SECRET;
            if (keyId && keySecret) {
              const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
              await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${qrCodeEntity.id}/close`, {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth}` }
              });
            }
          } catch (closeErr: any) {
            console.error('Failed to close invoice payment QR:', closeErr.message);
          }
        }
      } else if (tenantId) {
        await supabase.from('qr_code_payments').insert({
          tenant_id: tenantId,
          branch_id: branchId || null,
          razorpay_qr_id: qrCodeEntity.id,
          razorpay_payment_id: payment.id,
          amount: (payment.amount || 0) / 100,
          payer_vpa: payment.vpa || null
        });
      } else {
        console.log('qr_code.credited webhook received but no tenant_id or invoice_id in QR notes:', qrCodeEntity.id);
      }
    }

    res.status(200).send('OK');
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    res.status(200).send('Handled with error');
  }
}
