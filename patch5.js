import fs from 'fs';
let content = fs.readFileSync('src/lib/billRenderer.ts', 'utf8');

const target = `function renderUpiPaymentBlock(upiPayment: { qr_image_url?: string; upi_id?: string; payee_name?: string; amount: number } | undefined): string {
  if (!upiPayment || upiPayment.amount <= 0) return '';

  let qrHtml = '';
  if (upiPayment.qr_image_url) {
    qrHtml = \`<img src="\${esc(upiPayment.qr_image_url)}" style="width:90px;height:90px;" />\`;
  } else if (upiPayment.upi_id) {
    const upiLink = \`upi://pay?pa=\${encodeURIComponent(upiPayment.upi_id)}&pn=\${encodeURIComponent(upiPayment.payee_name || 'Merchant')}&am=\${upiPayment.amount.toFixed(2)}&cu=INR&tn=\${encodeURIComponent('Payment for Invoice')}\`;
    qrHtml = generateQrSvgHtml(upiLink, 90);
  } else {
    return '';
  }

  return \`
    <div style="text-align:center;margin-top:14px;padding:10px;border:1px dashed #999;border-radius:6px;">
      <div style="font-size:0.8em;font-weight:700;margin-bottom:6px;">Scan to Pay ₹\${money(upiPayment.amount)}</div>
      <div style="display:flex;justify-content:center;">\${qrHtml}</div>
      <div style="font-size:0.7em;color:#555;margin-top:4px;">via UPI</div>
    </div>
  \`;
}`;

const replacement = `function renderUpiPaymentBlock(upiPayment: { qr_image_url?: string; upi_id?: string; payee_name?: string; amount: number } | undefined): string {
  if (!upiPayment || upiPayment.amount <= 0) return '';

  let qrHtml = '';
  let showLabel = true;
  if (upiPayment.qr_image_url) {
    // Razorpay's image is a full poster-style graphic (branding + QR + 
    // instructions baked in), not a plain square QR — so we preserve 
    // its natural aspect ratio at a readable width instead of forcing 
    // it into a small square (which squishes/blurs it).
    qrHtml = \`<img src="\${esc(upiPayment.qr_image_url)}" style="width:180px;height:auto;" />\`;
    showLabel = false;
  } else if (upiPayment.upi_id) {
    const upiLink = \`upi://pay?pa=\${encodeURIComponent(upiPayment.upi_id)}&pn=\${encodeURIComponent(upiPayment.payee_name || 'Merchant')}&am=\${upiPayment.amount.toFixed(2)}&cu=INR&tn=\${encodeURIComponent('Payment for Invoice')}\`;
    qrHtml = generateQrSvgHtml(upiLink, 90);
  } else {
    return '';
  }

  return \`
    <div style="text-align:center;margin-top:14px;padding:10px;border:1px dashed #999;border-radius:6px;">
      <div style="font-size:0.8em;font-weight:700;margin-bottom:6px;">Scan to Pay ₹\${money(upiPayment.amount)}</div>
      <div style="display:flex;justify-content:center;">\${qrHtml}</div>
      \${showLabel ? '<div style="font-size:0.7em;color:#555;margin-top:4px;">via UPI</div>' : ''}
    </div>
  \`;
}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/lib/billRenderer.ts', content, 'utf8');
    console.log("Replaced successfully via EXACT string match.");
} else {
    console.log("COULD NOT FIND TARGET.");
}
