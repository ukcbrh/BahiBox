import sys

with open('src/components/retail/RetailPOSFullScreen.tsx', 'r') as f:
    content = f.read()

# Task 1
target_1 = """  const [onlineOrders, setOnlineOrders] = useState<any[]>([]);
  const [deliveryAssignments, setDeliveryAssignments] = useState<any[]>([]);"""
new_1 = """  const [onlineOrders, setOnlineOrders] = useState<any[]>([]);
  const [deliveryAssignments, setDeliveryAssignments] = useState<any[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<Record<string, string>>({});"""
if target_1 in content:
    content = content.replace(target_1, new_1)
else:
    print("Task 1 not found")

# Task 2
target_2 = """       toast.error("RPC Error: " + (err.message || JSON.stringify(err)));
    }
  };

  const addToCart = (product: Product) => {"""
new_2 = """       toast.error("RPC Error: " + (err.message || JSON.stringify(err)));
    }
  };

  const printOrderBillAndLabel = (order: any) => {
    const itemsList = Array.isArray(order.items) ? order.items : (order.order_items || []).map((oi: any) => ({ name: oi.products?.product_name || 'Item', quantity: oi.quantity, price: oi.price }));
    const orderTotal = itemsList.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
    const shortId = order.id.substring(0, 8).toUpperCase();

    const combinedHtml = `
      <html>
        <head>
          <title>Bill and Label - ${shortId}</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: sans-serif; margin: 0; }
            .page { page-break-after: always; padding: 10px; }
            .page:last-child { page-break-after: auto; }
            .bill-body { font-family: monospace; max-width: 320px; margin: 0 auto; font-size: 13px; }
            .header { text-align: center; margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-size: 1.15em; display: flex; justify-content: space-between; }
            hr { border: 1px dashed #000; }
            .label-box { border: 2px solid #000; padding: 16px; border-radius: 6px; max-width: 380px; margin: 40px auto; }
            .label-title { font-size: 11px; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
            .address { font-size: 15px; line-height: 1.5; margin-bottom: 14px; }
            .phone { font-size: 14px; margin-bottom: 14px; }
            .order-id { font-size: 12px; color: #666; border-top: 1px dashed #999; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="bill-body">
              <div class="header">
                <h3 style="margin:0;">TAX INVOICE</h3>
                <p style="margin:4px 0;">Order #${shortId}</p>
                <p style="margin:0;">${new Date(order.created_at).toLocaleString()}</p>
              </div>
              <hr />
              <div class="row"><span>Customer:</span><span>${order.customer_name || 'N/A'}</span></div>
              <div class="row"><span>Phone:</span><span>${order.customer_phone || 'N/A'}</span></div>
              <hr />
              ${itemsList.map((it: any) => `
                <div class="item">
                  <span>${it.name} x ${it.quantity}</span>
                  <span>Rs ${(it.price * it.quantity).toFixed(2)}</span>
                </div>
              `).join('')}
              <div class="total"><span>TOTAL</span><span>Rs ${orderTotal.toFixed(2)}</span></div>
              <p style="text-align:center; margin-top:20px; font-size:0.85em;">Thank you for shopping with us!</p>
            </div>
          </div>
          <div class="page">
            <div class="label-box">
              <div class="label-title">Ship To</div>
              <div class="name">${order.customer_name || 'N/A'}</div>
              <div class="address">${order.address || order.delivery_address || 'No address provided'}</div>
              <div class="phone">Phone: ${order.customer_phone || 'N/A'}</div>
              <div class="order-id">Order #${shortId}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (win) {
      win.document.write(combinedHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      }, 200);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = window.prompt('Reason for rejecting this order (optional):');
    if (reason === null) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('reject_online_order', { p_order_id: orderId, p_reason: reason || null });
    if (error) { toast.error(error.message); return; }
    setOnlineOrders((prev: any) => prev.filter((o: any) => o.id !== orderId));
  };

  const addToCart = (product: Product) => {"""
if target_2 in content:
    content = content.replace(target_2, new_2)
else:
    print("Task 2 not found")

# Task 3
target_3 = """                        <Button variant="outline" className="mt-2 text-sm" onClick={() => updateOrderStatus(order.id, 'Ready to Pack')}>Mark as Ready</Button>"""
new_3 = """                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" className="flex-1 text-sm" onClick={() => updateOrderStatus(order.id, 'Ready to Pack')}>Mark as Ready</Button>
                          <Button variant="outline" className="flex-1 text-sm border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleRejectOrder(order.id)}>Reject</Button>
                        </div>"""
if target_3 in content:
    content = content.replace(target_3, new_3)
else:
    print("Task 3 not found")

# Task 4
target_4 = """                        <Button className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateOrderStatus(order.id, 'Dispatch')}>Dispatch Order</Button>"""
new_4 = """                        <div className="mt-2 mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Delivery Vehicle Required</p>
                          <div className="grid grid-cols-3 gap-1">
                            {(['bike', 'auto', 'car'] as const).map(vt => (
                              <button
                                key={vt}
                                type="button"
                                onClick={() => setSelectedVehicleType(prev => ({ ...prev, [order.id]: vt }))}
                                className={`py-1 rounded text-[10px] font-bold uppercase border-2 transition-colors ${(selectedVehicleType[order.id] || 'bike') === vt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                              >
                                {vt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 text-xs" onClick={() => printOrderBillAndLabel(order)}>Print Bill + Label</Button>
                          <Button className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                            const vehicleType = selectedVehicleType[order.id] || 'bike';
                            const supabase = getSupabaseClient();
                            supabase?.rpc('create_delivery_job', { p_order_id: order.id, p_vehicle_type: vehicleType }).then(({ error }: any) => {
                              if (error) { toast.error(error.message); return; }
                              setOnlineOrders((prev: any) => prev.map((o: any) => o.id === order.id ? { ...o, status: 'Dispatch' } : o));
                            });
                          }}>Dispatch</Button>
                          <Button variant="outline" className="text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleRejectOrder(order.id)}>Reject</Button>
                        </div>"""
if target_4 in content:
    content = content.replace(target_4, new_4)
else:
    print("Task 4 not found")

with open('src/components/retail/RetailPOSFullScreen.tsx', 'w') as f:
    f.write(content)

print("Script completed")
