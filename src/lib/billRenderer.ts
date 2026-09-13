import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

export interface BillBlock {
  type: 'header' | 'customer_info' | 'invoice_meta' | 'item_table' | 'totals' | 'footer' | 'store_name' | 'product_info' | 'price' | 'barcode_image';
  order: number;
  visible: boolean;
  config: Record<string, any>;
}

export interface BillBusinessInfo {
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  logo_url?: string;
  stamp_url?: string;
  show_branch_name?: boolean;
  show_branch_address?: boolean;
  branch_name?: string;
}

export interface BillCustomerInfo {
  name?: string;
  address?: string;
  phone?: string;
  gstin?: string;
}

export interface BillInvoiceMeta {
  label: string;
  number: string;
  date: string;
  extra?: { label: string; value: string }[];
}

export interface BillItem {
  name: string;
  hsn?: string;
  qty: number | string;
  unit?: string;
  rate?: number;
  tax_percent?: number;
  amount?: number;
}

export interface BillTaxLine {
  label: string;
  amount: number;
}

export interface BillTotals {
  subtotal?: number;
  discount?: number;
  tax_breakdown?: BillTaxLine[];
  grand_total?: number;
}

export interface BillFooterData {
  bank_details?: { bank_name?: string; account_no?: string; ifsc?: string };
  signature_label?: string;
  stamp_url?: string;
}

export interface BillData {
  business: BillBusinessInfo;
  customer?: BillCustomerInfo;
  customer_info_label?: string;
  meta: BillInvoiceMeta;
  items: BillItem[];
  totals?: BillTotals;
  footer?: BillFooterData;
  bill_number_code_type?: 'none' | 'barcode' | 'qr' | 'both';
  upi_payment?: { qr_image_url?: string; upi_id?: string; payee_name?: string; amount: number };
}

export interface LabelData {
  store_name: string;
  product_name: string;
  size?: string;
  mrp?: number;
  selling_price?: number;
  barcode_value: string;
}

const SIZE_DIMENSIONS: Record<string, { width: string; fontBase: string }> = {
  'A4': { width: '210mm', fontBase: '13px' },
  'A4-Half': { width: '148mm', fontBase: '12px' },
  '112mm': { width: '112mm', fontBase: '11px' },
  '80mm': { width: '80mm', fontBase: '10px' },
  '58mm': { width: '58mm', fontBase: '9px' }
};

function esc(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function money(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toFixed(2);
}

function generateBarcodeSvgHtml(value: string): string {
  try {
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(tempSvg, value, { format: 'CODE128', width: 1.4, height: 32, fontSize: 10, margin: 0, displayValue: true });
    return new XMLSerializer().serializeToString(tempSvg);
  } catch (e) {
    return '';
  }
}

function generateQrSvgHtml(value: string, size: number = 60): string {
  try {
    return renderToStaticMarkup(React.createElement(QRCodeSVG, { value, size }));
  } catch (e) {
    return '';
  }
}

function renderInvoiceCodeBlock(codeType: string | undefined, invoiceNumber: string): string {
  if (!codeType || codeType === 'none') return '';
  const showBarcode = codeType === 'barcode' || codeType === 'both';
  const showQr = codeType === 'qr' || codeType === 'both';
  return `
    <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:10px;">
      ${showQr ? generateQrSvgHtml(invoiceNumber, 55) : ''}
      ${showBarcode ? generateBarcodeSvgHtml(invoiceNumber) : ''}
    </div>
  `;
}

function renderUpiPaymentBlock(upiPayment: { qr_image_url?: string; upi_id?: string; payee_name?: string; amount: number } | undefined): string {
  if (!upiPayment || upiPayment.amount <= 0) return '';

  let qrHtml = '';
  let showLabel = true;
  if (upiPayment.qr_image_url) {
    // Razorpay's image is a full poster-style graphic (branding + QR + 
    // instructions baked in), not a plain square QR — so we preserve 
    // its natural aspect ratio at a readable width instead of forcing 
    // it into a small square (which squishes/blurs it).
    qrHtml = `<img src="${esc(upiPayment.qr_image_url)}" style="width:180px;height:auto;" />`;
    showLabel = false;
  } else if (upiPayment.upi_id) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiPayment.upi_id)}&pn=${encodeURIComponent(upiPayment.payee_name || 'Merchant')}&am=${upiPayment.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Payment for Invoice')}`;
    qrHtml = generateQrSvgHtml(upiLink, 90);
  } else {
    return '';
  }

  return `
    <div style="text-align:center;margin-top:14px;padding:10px;border:1px dashed #999;border-radius:6px;">
      <div style="font-size:0.8em;font-weight:700;margin-bottom:6px;">Scan to Pay ₹${money(upiPayment.amount)}</div>
      <div style="display:flex;justify-content:center;">${qrHtml}</div>
      ${showLabel ? '<div style="font-size:0.7em;color:#555;margin-top:4px;">via UPI</div>' : ''}
    </div>
  `;
}

function renderHeaderBlock(config: any, business: BillBusinessInfo, isCompact: boolean): string {
  const align = config.align || 'left';
  const accent = config.accent_color || '#000000';
  const logo = config.show_logo && business.logo_url
    ? `<img src="${esc(business.logo_url)}" style="max-height:${isCompact ? '32px' : '48px'};margin-bottom:4px;" />`
    : '';
  const nameStyle = config.bold_name ? 'font-weight:800;' : 'font-weight:700;';
  const showBranchName = business.show_branch_name !== false;
  const showBranchAddress = business.show_branch_address !== false;
  const branchLine = showBranchName && business.branch_name ? `<div style="font-size:0.8em;color:#555;">${esc(business.branch_name)}</div>` : '';
  return `
    <div style="text-align:${align};padding-bottom:${isCompact ? '4px' : '10px'};border-bottom:2px solid ${accent};margin-bottom:${isCompact ? '4px' : '10px'};">
      ${logo}
      <div style="font-size:${isCompact ? '1.1em' : '1.4em'};${nameStyle}color:${accent};">${esc(business.name)}</div>
      ${branchLine}
      ${showBranchAddress && business.address ? `<div style="font-size:0.85em;color:#555;">${esc(business.address)}</div>` : ''}
      <div style="font-size:0.8em;color:#555;">
        ${business.phone ? `Ph: ${esc(business.phone)}` : ''}${business.phone && business.gstin ? ' | ' : ''}${business.gstin ? `GSTIN: ${esc(business.gstin)}` : ''}
      </div>
    </div>
  `;
}

function renderCustomerInfoBlock(config: any, customer?: BillCustomerInfo, infoLabel?: string): string {
  if (!customer || !customer.name) return '';
  return `
    <div style="margin-bottom:10px;font-size:0.9em;">
      <div style="font-weight:700;text-transform:uppercase;font-size:0.75em;color:#888;margin-bottom:2px;">${esc(infoLabel || 'Bill To')}</div>
      <div style="font-weight:600;">${esc(customer.name)}</div>
      ${customer.address ? `<div>${esc(customer.address)}</div>` : ''}
      ${customer.phone ? `<div>Ph: ${esc(customer.phone)}</div>` : ''}
      ${customer.gstin ? `<div>GSTIN: ${esc(customer.gstin)}</div>` : ''}
    </div>
  `;
}

function renderInvoiceMetaBlock(config: any, meta: BillInvoiceMeta, isCompact: boolean): string {
  const extras = (meta.extra || []).map(e => `<div>${esc(e.label)}: <strong>${esc(e.value)}</strong></div>`).join('');
  if (isCompact) {
    return `
      <div style="text-align:center;font-size:0.85em;margin-bottom:6px;border-bottom:1px dashed #999;padding-bottom:6px;">
        <div style="font-weight:700;">${esc(meta.label)}</div>
        <div>No: ${esc(meta.number)} | ${esc(meta.date)}</div>
        ${extras}
      </div>
    `;
  }
  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:0.9em;">
      <div style="font-weight:700;font-size:1.1em;">${esc(meta.label)}</div>
      <div style="text-align:right;">
        <div>No: <strong>${esc(meta.number)}</strong></div>
        <div>Date: ${esc(meta.date)}</div>
        ${extras}
      </div>
    </div>
  `;
}

function renderItemTableBlock(config: any, items: BillItem[], isCompact: boolean, minimal: boolean): string {
  if (!items || items.length === 0) return '';

  if (minimal) {
    const rows = items.map(it => `
      <div style="display:flex;justify-content:space-between;padding:2px 0;">
        <span>${esc(it.name)} x${esc(it.qty)}</span>
        ${it.amount !== undefined ? `<span>${money(it.amount)}</span>` : ''}
      </div>
    `).join('');
    return `<div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:4px 0;margin-bottom:6px;font-size:0.9em;">${rows}</div>`;
  }

  const showHsn = config.show_hsn;
  const striped = config.striped;
  const cols = ['#', 'Item', showHsn ? 'HSN' : null, 'Qty', it_has_rate(items) ? 'Rate' : null, config.show_batch ? 'Batch' : null, it_has_amount(items) ? 'Amount' : null].filter(Boolean);

  function it_has_rate(arr: BillItem[]) { return arr.some(i => i.rate !== undefined); }
  function it_has_amount(arr: BillItem[]) { return arr.some(i => i.amount !== undefined); }

  const headerCells = cols.map(c => `<th style="text-align:${c === 'Item' ? 'left' : 'right'};padding:${isCompact ? '3px 4px' : '6px 8px'};border-bottom:2px solid #333;font-size:0.8em;text-transform:uppercase;">${c}</th>`).join('');

  const bodyRows = items.map((it, idx) => {
    const rowBg = striped && idx % 2 === 1 ? 'background:#f8fafc;' : '';
    const cells: string[] = [`<td style="padding:${isCompact ? '3px 4px' : '6px 8px'};text-align:right;">${idx + 1}</td>`];
    cells.push(`<td style="padding:${isCompact ? '3px 4px' : '6px 8px'};text-align:left;">${esc(it.name)}</td>`);
    if (showHsn) cells.push(`<td style="padding:${isCompact ? '3px 4px' : '6px 8px'};text-align:right;">${esc(it.hsn || '-')}</td>`);
    cells.push(`<td style="padding:${isCompact ? '3px 4px' : '6px 8px'};text-align:right;">${esc(it.qty)}${it.unit ? ' ' + esc(it.unit) : ''}</td>`);
    if (it.rate !== undefined) cells.push(`<td style="padding:${isCompact ? '3px 4px' : '6px 8px'};text-align:right;">${money(it.rate)}</td>`);
    if (config.show_batch) cells.push(`<td style="padding:${isCompact ? '3px 4px' : '6px 8px'};text-align:right;">-</td>`);
    if (it.amount !== undefined) cells.push(`<td style="padding:${isCompact ? '3px 4px' : '6px 8px'};text-align:right;font-weight:600;">${money(it.amount)}</td>`);
    return `<tr style="${rowBg}">${cells.join('')}</tr>`;
  }).join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:${isCompact ? '6px' : '12px'};font-size:${isCompact ? '0.85em' : '0.9em'};">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function renderTotalsBlock(config: any, totals?: BillTotals, isCompact: boolean = false): string {
  if (!totals) return '';
  const lines: string[] = [];
  if (totals.subtotal !== undefined) lines.push(`<div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>`);
  if (totals.discount) lines.push(`<div style="display:flex;justify-content:space-between;"><span>Discount</span><span>-${money(totals.discount)}</span></div>`);
  if (config.show_tax_breakdown && totals.tax_breakdown) {
    totals.tax_breakdown.forEach(t => {
      lines.push(`<div style="display:flex;justify-content:space-between;font-size:0.9em;color:#555;"><span>${esc(t.label)}</span><span>${money(t.amount)}</span></div>`);
    });
  }
  const highlightStyle = config.highlight_total ? 'background:#eff6ff;padding:6px 8px;border-radius:4px;' : 'border-top:2px solid #333;padding-top:4px;';
  const grand = `<div style="display:flex;justify-content:space-between;font-weight:800;font-size:${isCompact ? '1em' : '1.15em'};margin-top:6px;${highlightStyle}"><span>TOTAL</span><span>₹${money(totals.grand_total)}</span></div>`;

  return `<div style="max-width:${isCompact ? '100%' : '280px'};margin-left:auto;font-size:${isCompact ? '0.85em' : '0.9em'};margin-bottom:${isCompact ? '6px' : '14px'};">${lines.join('')}${grand}</div>`;
}

function renderFooterBlock(config: any, footer?: BillFooterData, isCompact: boolean = false): string {
  const bank = config.show_bank_details && footer?.bank_details
    ? `<div style="font-size:0.8em;color:#555;margin-top:8px;">
        <div style="font-weight:700;">Bank Details</div>
        ${footer.bank_details.bank_name ? `<div>${esc(footer.bank_details.bank_name)}</div>` : ''}
        ${footer.bank_details.account_no ? `<div>A/C: ${esc(footer.bank_details.account_no)}</div>` : ''}
        ${footer.bank_details.ifsc ? `<div>IFSC: ${esc(footer.bank_details.ifsc)}</div>` : ''}
      </div>`
    : '';
  const stamp = config.show_signature && footer?.stamp_url
    ? `<img src="${esc(footer.stamp_url)}" style="max-height:${isCompact ? '36px' : '60px'};opacity:0.85;" />`
    : '';
  const signature = config.show_signature
    ? `<div style="text-align:right;margin-top:${isCompact ? '20px' : '40px'};font-size:0.85em;">
        ${stamp}
        <div style="border-top:1px solid #333;display:inline-block;padding-top:4px;">${esc(config.signature_label || footer?.signature_label || 'Authorized Signatory')}</div>
      </div>`
    : '';
  return `
    <div style="margin-top:${isCompact ? '8px' : '16px'};text-align:${isCompact ? 'center' : 'left'};">
      ${bank}
      ${signature}
      ${config.footer_text ? `<div style="text-align:center;font-size:${isCompact ? '0.85em' : '0.8em'};color:#555;margin-top:8px;">${esc(config.footer_text)}</div>` : ''}
    </div>
  `;
}

function renderStoreNameLabelBlock(config: any, data: LabelData): string {
  return `<div style="text-align:${config.align || 'center'};font-size:1em;${config.bold ? 'font-weight:800;' : 'font-weight:600;'}margin-bottom:2px;">${esc(data.store_name)}</div>`;
}

function renderProductInfoLabelBlock(config: any, data: LabelData): string {
  return `
    <div style="text-align:center;font-size:0.8em;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${esc(data.product_name)}</div>
    ${config.show_size && data.size ? `<div style="text-align:center;font-size:0.65em;color:#555;">Size: ${esc(data.size)}</div>` : ''}
  `;
}

function renderPriceLabelBlock(config: any, data: LabelData): string {
  const highlight = config.highlight_price ? 'font-weight:800;color:#166534;' : 'font-weight:700;';
  return `
    <div style="text-align:center;font-size:0.75em;display:flex;justify-content:center;gap:6px;">
      ${config.show_mrp && data.mrp ? `<span>MRP: ₹${money(data.mrp)}</span>` : ''}
      ${config.show_selling_price && data.selling_price ? `<span style="${highlight}">₹${money(data.selling_price)}</span>` : ''}
    </div>
  `;
}

function renderBarcodeImageLabelBlock(config: any, data: LabelData): string {
  // The real scannable barcode/QR image is generated client-side (JsBarcode/QRCodeSVG)
  // by LabelPrintModal.tsx at print time — this is a lightweight visual placeholder 
  // for the settings preview only, showing which code-type this template uses.
  const isQr = config.code_type === 'qr';
  if (isQr) {
    return `<div style="display:flex;justify-content:center;margin-top:2px;"><div style="width:36px;height:36px;background:repeating-linear-gradient(45deg,#000,#000 2px,#fff 2px,#fff 4px);border:1px solid #000;"></div></div>`;
  }
  return `
    <div style="text-align:center;margin-top:2px;">
      <div style="display:inline-block;background:repeating-linear-gradient(90deg,#000,#000 1px,#fff 1px,#fff 2px);width:70%;height:20px;"></div>
      <div style="font-size:0.6em;letter-spacing:1px;">${esc(data.barcode_value)}</div>
    </div>
  `;
}

export function renderLabelHtml(blocks: BillBlock[], data: LabelData, widthMm: number, heightMm: number): string {
  const sorted = [...blocks].filter(b => b.visible).sort((a, b) => a.order - b.order);

  const bodyHtml = sorted.map(block => {
    switch (block.type) {
      case 'store_name': return renderStoreNameLabelBlock(block.config, data);
      case 'product_info': return renderProductInfoLabelBlock(block.config, data);
      case 'price': return renderPriceLabelBlock(block.config, data);
      case 'barcode_image': return renderBarcodeImageLabelBlock(block.config, data);
      default: return '';
    }
  }).join('');

  return `
    <div style="width:${widthMm}mm;height:${heightMm}mm;padding:1mm;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;background:#fff;border:1px dashed #ccc;display:flex;flex-direction:column;justify-content:center;overflow:hidden;">
      ${bodyHtml}
    </div>
  `;
}

export function renderBillHtml(blocks: BillBlock[], data: BillData, printerSize: string): string {
  const dims = SIZE_DIMENSIONS[printerSize] || SIZE_DIMENSIONS['A4'];
  const isCompact = ['112mm', '80mm', '58mm'].includes(printerSize);
  const isMinimal = printerSize === '58mm';

  const sorted = [...blocks].filter(b => b.visible).sort((a, b) => a.order - b.order);

  const bodyHtml = sorted.map(block => {
    switch (block.type) {
      case 'header': return renderHeaderBlock(block.config, data.business, isCompact);
      case 'customer_info': return renderCustomerInfoBlock(block.config, data.customer, data.customer_info_label);
      case 'invoice_meta': return renderInvoiceMetaBlock(block.config, data.meta, isCompact);
      case 'item_table': return renderItemTableBlock(block.config, data.items, isCompact, isMinimal || block.config.minimal);
      case 'totals': return renderTotalsBlock(block.config, data.totals, isCompact);
      case 'footer': return renderFooterBlock(block.config, data.footer, isCompact);
      default: return '';
    }
  }).join('') + renderInvoiceCodeBlock(data.bill_number_code_type, data.meta.number) + renderUpiPaymentBlock(data.upi_payment);

  return `
    <div style="width:${dims.width};min-height:20mm;padding:${isCompact ? '3mm' : '10mm'};box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;font-size:${dims.fontBase};color:#1a1a1a;background:#fff;">
      ${bodyHtml}
    </div>
  `;
}

export function getBillPageCss(printerSize: string): string {
  const dims = SIZE_DIMENSIONS[printerSize] || SIZE_DIMENSIONS['A4'];
  return `@page { size: ${dims.width} auto; margin: 0; } body { margin: 0; }`;
}

export async function printBillForChannel(
  supabase: any,
  tenantId: string,
  channel: string,
  billData: BillData,
  fallbackPrinterSize: string = 'A4'
): Promise<void> {
  try {
    const { data: selection } = await supabase
      .from('bill_format_selection')
      .select('template_id, printer_size')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .maybeSingle();

    let blocks: BillBlock[] = [];
    let printerSize = fallbackPrinterSize;

    if (selection?.template_id) {
      const { data: template } = await supabase
        .from('bill_templates')
        .select('blocks, printer_size')
        .eq('id', selection.template_id)
        .maybeSingle();
      if (template) {
        blocks = template.blocks;
        printerSize = template.printer_size;
      }
    }

    if (blocks.length === 0) {
      // No template selected yet for this channel — fall back to the 
      // system default "Classic" style for the fallback size, so 
      // printing still works even before the merchant has configured 
      // anything in Settings → Print Formats.
      const { data: defaultTemplate } = await supabase
        .from('bill_templates')
        .select('blocks, printer_size')
        .eq('printer_size', fallbackPrinterSize)
        .eq('style_name', 'Classic')
        .eq('is_default', true)
        .maybeSingle();
      if (defaultTemplate) {
        blocks = defaultTemplate.blocks;
        printerSize = defaultTemplate.printer_size;
      }
    }

    if (blocks.length === 0) {
      console.error('printBillForChannel: no template blocks available for', channel);
      return;
    }

    const html = renderBillHtml(blocks, billData, printerSize);
    const pageCss = getBillPageCss(printerSize);

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (win) {
            win.document.write(`
        <html>
          <head>
            <title>${billData.meta.label}</title>
            <style>${pageCss}</style>
          </head>
          <body>${html}</body>
        </html>
      `);
      win.document.close();
      win.focus();

      const doPrint = () => {
        win.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      };

      const images = Array.from(win.document.images);
      if (images.length === 0) {
        setTimeout(doPrint, 200);
      } else {
        let settledCount = 0;
        const total = images.length;
        // Safety fallback: print anyway after 3s even if some image 
        // never finishes loading (e.g. network hiccup), so printing 
        // never hangs indefinitely.
        const maxWaitTimer = setTimeout(doPrint, 3000);

        const onImageSettled = () => {
          settledCount++;
          if (settledCount >= total) {
            clearTimeout(maxWaitTimer);
            setTimeout(doPrint, 100);
          }
        };

        images.forEach((img: any) => {
          if (img.complete) {
            onImageSettled();
          } else {
            img.addEventListener('load', onImageSettled);
            img.addEventListener('error', onImageSettled);
          }
        });
      }
    }
  } catch (err) {
    console.error('printBillForChannel error:', err);
  }
}

