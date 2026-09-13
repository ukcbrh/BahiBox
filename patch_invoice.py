import sys

with open('src/components/retail/InvoiceHistory.tsx', 'r') as f:
    content = f.read()

func_str = """  const handlePrint = (invoice: any) => {"""

new_func = """  const handlePrintShippingLabel = async (invoice: any) => {
    const supabase = getSupabaseClient();
    if (!supabase || !invoice.reference_id) {
      alert('Shipping address not available for this invoice.');
      return;
    }
    const { data: orderData } = await supabase
      .from('orders')
      .select('delivery_address, customer_phone, customer_name')
      .eq('id', invoice.reference_id)
      .single();

    if (!orderData) {
      alert('Could not find the linked order for this invoice.');
      return;
    }

    const shortId = (invoice.invoice_number || invoice.id).toString();

    const labelHtml = `
      <html>
        <head>
          <title>Shipping Label - ${shortId}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; max-width: 380px; margin: 0 auto; }
            .box { border: 2px solid #000; padding: 16px; border-radius: 6px; }
            .label-title { font-size: 11px; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
            .address { font-size: 15px; line-height: 1.5; margin-bottom: 14px; }
            .phone { font-size: 14px; margin-bottom: 14px; }
            .order-id { font-size: 12px; color: #666; border-top: 1px dashed #999; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="label-title">Ship To</div>
            <div class="name">\\${orderData.customer_name || invoice.retail_customers?.customer_name || 'N/A'}</div>
            <div class="address">\\${orderData.delivery_address || 'No address on file'}</div>
            <div class="phone">Phone: \\${orderData.customer_phone || 'N/A'}</div>
            <div class="order-id">Invoice #\\${shortId}</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (win) {
      win.document.write(labelHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      }, 200);
    }
  };

  const handlePrint = (invoice: any) => {"""

content = content.replace(func_str, new_func)

button_str = """                        <Button variant="outline" size="sm" onClick={() => handlePrint(inv)} className="h-8 shadow-sm text-blue-600 hover:text-blue-700">
                          <Printer size={14} className="mr-1" /> Print
                        </Button>"""

new_button = """                        <Button variant="outline" size="sm" onClick={() => handlePrint(inv)} className="h-8 shadow-sm text-blue-600 hover:text-blue-700">
                          <Printer size={14} className="mr-1" /> Print
                        </Button>
                        {inv.module_code === 'online' && (
                          <Button variant="outline" size="sm" onClick={() => handlePrintShippingLabel(inv)} className="h-8 shadow-sm text-purple-600 hover:text-purple-700">
                            <Printer size={14} className="mr-1" /> Print Label
                          </Button>
                        )}"""

content = content.replace(button_str, new_button)

with open('src/components/retail/InvoiceHistory.tsx', 'w') as f:
    f.write(content)

print("Patched")
