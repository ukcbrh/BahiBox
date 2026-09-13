with open("src/components/retail/LabelPrintModal.tsx", "w", encoding="utf-8") as f:
    f.write("""import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';

type CodeType = 'barcode' | 'qr' | 'both';
type PrintFormat = 'sheet' | 'roll';

interface LabelProduct {
  id: string;
  product_name: string;
  barcode?: string | null;
  sku?: string | null;
  mrp?: number | null;
  selling_price?: number | null;
  size?: string | null;
}

interface LabelSizeSettings {
  width: number;
  height: number;
  unit: 'mm' | 'cm' | 'in';
}

function getLabelSettings(): LabelSizeSettings {
  try {
    const saved = localStorage.getItem('barcodeLabelSettings');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { width: 40, height: 25, unit: 'mm' };
}

function SingleLabel({ product, settings, codeType }: { product: LabelProduct; settings: LabelSizeSettings; codeType: CodeType }) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const value = product.barcode || product.sku || product.id;
  const showBarcode = codeType === 'barcode' || codeType === 'both';
  const showQr = codeType === 'qr' || codeType === 'both';

  React.useEffect(() => {
    if (showBarcode && svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: codeType === 'both' ? 1.1 : 1.5,
          height: codeType === 'both' ? 22 : 30,
          fontSize: codeType === 'both' ? 8 : 10,
          margin: 0,
          displayValue: true
        });
      } catch (e) {}
    }
  }, [product, codeType]);

  return (
    <div
      className="flex flex-col items-center justify-center border border-dashed border-slate-300 overflow-hidden"
      style={{
        width: `${settings.width}${settings.unit}`,
        height: `${settings.height}${settings.unit}`,
        padding: '1mm',
        boxSizing: 'border-box',
        breakInside: 'avoid'
      }}
    >
      <div className="text-center leading-tight">
        <div className="font-bold truncate" style={{ fontSize: '9px', maxWidth: '100%' }}>{product.product_name}</div>
        {product.size && <div style={{ fontSize: '7px' }}>Size: {product.size}</div>}
        <div className="flex justify-center gap-2" style={{ fontSize: '8px' }}>
          {product.mrp ? <span>MRP: ₹{Number(product.mrp).toFixed(2)}</span> : null}
          {product.selling_price ? <span>Price: ₹{Number(product.selling_price).toFixed(2)}</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-center gap-1" style={{ maxWidth: '100%' }}>
        {showQr && <QRCodeSVG value={value} size={codeType === 'both' ? 30 : 40} />}
        {showBarcode && <svg ref={svgRef} style={{ maxWidth: codeType === 'both' ? '60%' : '100%' }}></svg>}
      </div>
    </div>
  );
}

// Builds the SAME visual label as SingleLabel, as a raw HTML string for
// the print-iframe (a live React tree can't be handed to document.write()).
function buildLabelInnerHtml(product: LabelProduct, codeType: CodeType): string {
  const value = product.barcode || product.sku || product.id;
  const showBarcode = codeType === 'barcode' || codeType === 'both';
  const showQr = codeType === 'qr' || codeType === 'both';

  let qrMarkup = '';
  if (showQr) {
    qrMarkup = renderToStaticMarkup(<QRCodeSVG value={value} size={codeType === 'both' ? 45 : 70} />);
  }

  let barcodeMarkup = '';
  if (showBarcode) {
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try {
      JsBarcode(tempSvg, value, {
        format: 'CODE128',
        width: codeType === 'both' ? 1.4 : 2,
        height: codeType === 'both' ? 32 : 45,
        fontSize: codeType === 'both' ? 10 : 14,
        margin: 0,
        displayValue: true
      });
      barcodeMarkup = new XMLSerializer().serializeToString(tempSvg);
    } catch (e) {}
  }

  return `
    <div class="label-name">${product.product_name}</div>
    ${product.size ? `<div class="label-size">Size: ${product.size}</div>` : ''}
    <div class="label-price">
      ${product.mrp ? `<span>MRP: ₹${Number(product.mrp).toFixed(2)}</span>` : ''}
      ${product.selling_price ? `<span>Price: ₹${Number(product.selling_price).toFixed(2)}</span>` : ''}
    </div>
    <div class="label-code">${qrMarkup}${barcodeMarkup}</div>
  `;
}

export default function LabelPrintModal({ products, onClose }: { products: LabelProduct[]; onClose: () => void }) {
  const [settings] = useState<LabelSizeSettings>(getLabelSettings());
  const [codeType, setCodeType] = useState<CodeType>('barcode');
  const [printFormat, setPrintFormat] = useState<PrintFormat>('sheet');
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(products.map(p => [p.id, 1]))
  );

  const updateQty = (id: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, qty) }));
  };

  const handlePrint = () => {
    const printItems: LabelProduct[] = [];
    products.forEach(p => {
      const qty = quantities[p.id] || 1;
      for (let i = 0; i < qty; i++) {
        printItems.push(p);
      }
    });

    const labelsHtml = printItems.map(p => `
      <div class="label">
        ${buildLabelInnerHtml(p, codeType)}
      </div>
    `).join('');

    // "sheet" = normal A4/regular printer, multiple labels laid out in a
    // grid on one page (good for sticker sheets).
    // "roll" = continuous label/thermal roll printer — the printed page
    // size must exactly match ONE label, with each label as its own
    // page, so the printer advances the roll correctly per label.
    const pageStyle = printFormat === 'roll'
      ? `
        @page { size: ${settings.width}${settings.unit} ${settings.height}${settings.unit}; margin: 0; }
        .labels-wrap { display: block; }
        .label { page-break-after: always; }
        .label:last-child { page-break-after: auto; }
      `
      : `
        @page { size: auto; margin: 5mm; }
        .labels-wrap { display: flex; flex-wrap: wrap; gap: 2mm; }
        .label { page-break-inside: avoid; }
      `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const printWindow = iframe.contentWindow;
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Barcode Labels</title>
            <style>
              body { font-family: sans-serif; margin: 0; padding: 0; }
              .label {
                width: ${settings.width}${settings.unit};
                height: ${settings.height}${settings.unit};
                box-sizing: border-box;
                padding: 1mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                overflow: hidden;
              }
              .label-name { font-weight: bold; font-size: 9px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .label-size { font-size: 7px; }
              .label-price { font-size: 8px; display: flex; gap: 4px; justify-content: center; }
              .label-code { display: flex; align-items: center; justify-content: center; gap: 2px; max-width: 100%; }
              .label-code svg { max-width: 100%; max-height: 60%; }
              ${pageStyle}
            </style>
          </head>
          <body>
            <div class="labels-wrap">
              ${labelsHtml}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        document.body.removeChild(iframe);
      }, 300);
    }
  };

  const printItemsPreview: LabelProduct[] = [];
  products.forEach(p => {
    const qty = quantities[p.id] || 1;
    for (let i = 0; i < qty; i++) {
      printItemsPreview.push(p);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Print Barcode Labels</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r p-4 overflow-y-auto space-y-3">
            <div className="space-y-2 pb-3 border-b mb-3">
              <h3 className="font-semibold text-sm">Code Type</h3>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="codeType" checked={codeType === 'barcode'} onChange={() => setCodeType('barcode')} />
                  Barcode
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="codeType" checked={codeType === 'qr'} onChange={() => setCodeType('qr')} />
                  QR Code
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="codeType" checked={codeType === 'both'} onChange={() => setCodeType('both')} />
                  Both (Barcode + QR)
                </label>
              </div>
            </div>

            <div className="space-y-2 pb-3 border-b mb-3">
              <h3 className="font-semibold text-sm">Print Format</h3>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="printFormat" checked={printFormat === 'sheet'} onChange={() => setPrintFormat('sheet')} />
                  A4 / Sheet (multiple labels per page)
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="printFormat" checked={printFormat === 'roll'} onChange={() => setPrintFormat('roll')} />
                  Label Roll Printer (one label per page)
                </label>
              </div>
            </div>

            <h3 className="font-semibold text-sm mb-2">Quantity per product</h3>
            {products.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-sm truncate flex-1">{p.product_name}</span>
                <Input
                  type="number"
                  min={1}
                  className="w-16 h-8 text-sm"
                  value={quantities[p.id] || 1}
                  onChange={e => updateQty(p.id, parseInt(e.target.value) || 1)}
                />
              </div>
            ))}
            <div className="pt-3 border-t text-xs text-slate-500">
              Label size: {settings.width}{settings.unit} x {settings.height}{settings.unit}
              <br />
              (Change in Settings → Bill Generation → Barcode Label Size)
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-900">
            <div className="flex flex-wrap gap-2">
              {printItemsPreview.map((p, idx) => (
                <SingleLabel key={p.id + '-' + idx} product={p} settings={settings} codeType={codeType} />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrint} className="gap-2"><Printer size={16} /> Print Labels</Button>
        </div>
      </div>
    </div>
  );
}
""")
