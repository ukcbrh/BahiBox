const fs = require('fs');

const targetContent = `  const processCheckout = async () => {
    if (cart.length === 0) return;
    if (!deliveryAddress.trim() || !checkoutPhone.trim()) {
      alert("Please enter both delivery address and phone number.");
      return;
    }
    
    setPlacingOrder(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const activeTenantId = selectedStore?.tenant_id || tenant?.merchant_id;
      const activeBranchId = selectedStore?.branch_id;
      
      // Resolve proper tenant_id if tenant mode
      let tId = activeTenantId;
      let bId = activeBranchId;
      
      if (tenant?.merchant_id && !selectedStore) {
        const { data: roles } = await supabase
          .from('user_tenant_roles')
          .select('tenant_id')
          .eq('user_id', tenant.merchant_id)
          .limit(1);
        if (roles?.[0]?.tenant_id) tId = roles[0].tenant_id;
        
        // Also fetch branch_id since tenant mode doesn't have it natively
        const { data: branchData } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tId)
          .eq('module_key', 'retail')
          .eq('is_online_store_active', true)
          .limit(1);
        if (branchData?.[0]?.id) bId = branchData[0].id;
      }
      
      if ((!tId || !bId) && cart.length > 0 && cart[0].product?.store) {
        tId = tId || cart[0].product.tenant_id;
        bId = bId || cart[0].product.store.id;
      }
      if (!tId || !bId) {
         throw new Error("Store information is incomplete. Cannot place order.");
      }
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) {
         throw new Error("You must be logged in to place an order.");
      }
      
      const { data, error } = await supabase.rpc('create_online_order', {
        p_tenant_id: tId,
        p_branch_id: bId,
        p_user_id: userId,
        p_customer_name: userName || 'Guest',
        p_customer_phone: checkoutPhone,
        p_delivery_address: deliveryAddress,
        p_payment_method: paymentMethod,
        p_items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        p_latitude: checkoutAddressObj?.latitude || checkoutLat || null,
        p_longitude: checkoutAddressObj?.longitude || checkoutLng || null
      });
      if (error) {
        throw new Error(error.message);
      }
      setCart([]);
      setCheckoutStep('cart');
      setActiveTab('orders');
      alert(\`Order placed successfully!\\nOrder ID: \${data.order_id}\\nTotal: ₹\${data.total}\\nPayment: \${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid via Wallet'}\`);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      alert(err.message || "Checkout failed. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };`;

const replacementContent = `  const resolveCheckoutStore = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return { tId: null, bId: null };

    const activeTenantId = selectedStore?.tenant_id || tenant?.merchant_id;
    const activeBranchId = selectedStore?.branch_id;

    let tId = activeTenantId;
    let bId = activeBranchId;

    if (tenant?.merchant_id && !selectedStore) {
      const { data: roles } = await supabase
        .from('user_tenant_roles')
        .select('tenant_id')
        .eq('user_id', tenant.merchant_id)
        .limit(1);
      if (roles?.[0]?.tenant_id) tId = roles[0].tenant_id;

      const { data: branchData } = await supabase
        .from('branches')
        .select('id')
        .eq('tenant_id', tId)
        .eq('module_key', 'retail')
        .eq('is_online_store_active', true)
        .limit(1);
      if (branchData?.[0]?.id) bId = branchData[0].id;
    }

    if ((!tId || !bId) && cart.length > 0 && cart[0].product?.store) {
      tId = tId || cart[0].product.tenant_id;
      bId = bId || cart[0].product.store.id;
    }

    return { tId, bId };
  };

  const handleOpenPaymentSheet = () => {
    if (cart.length === 0) return;
    if (!deliveryAddress.trim() || !checkoutPhone.trim()) {
      alert("Please enter both delivery address and phone number.");
      return;
    }
    setShowPaymentSheet(true);
  };

  const handleCreateOrder = async (selectedPaymentMethod: 'cod' | 'wallet' | 'wallet_plus_online' | 'online') => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Connection error');

    const { tId, bId } = await resolveCheckoutStore();
    if (!tId || !bId) {
      throw new Error("Store information is incomplete. Cannot place order.");
    }
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) {
      throw new Error("You must be logged in to place an order.");
    }

    const { data, error } = await supabase.rpc('create_online_order', {
      p_tenant_id: tId,
      p_branch_id: bId,
      p_user_id: userId,
      p_customer_name: userName || 'Guest',
      p_customer_phone: checkoutPhone,
      p_delivery_address: deliveryAddress,
      p_payment_method: selectedPaymentMethod,
      p_items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      p_latitude: checkoutAddressObj?.latitude || checkoutLat || null,
      p_longitude: checkoutAddressObj?.longitude || checkoutLng || null
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  };

  const handlePaymentConfirmed = (result: any) => {
    setCart([]);
    setCheckoutStep('cart');
    setActiveTab('orders');
    setShowPaymentSheet(false);
    toast.success('Order placed successfully! Total: ₹' + result.total);
  };`;

const file = 'src/pages/PublicApp.tsx';
const content = fs.readFileSync(file, 'utf8');

// Use indexOf to find the start and end of processCheckout precisely
const startIdx = content.indexOf('  const processCheckout = async () => {');
const endMarker = '  const handleCheckout';
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find the block boundaries.");
  process.exit(1);
}

// Slice out the content from startIdx to just before endMarker
// wait, endMarker might have a preceding newline. Let's find the '};' before handleCheckout.
const beforeEnd = content.lastIndexOf('};', endIdx) + 2;

// Or simpler: replace exact string.
// Let's replace from startIdx to beforeEnd.
const exactBlock = content.substring(startIdx, beforeEnd);

const newContent = content.substring(0, startIdx) + replacementContent + content.substring(beforeEnd);

fs.writeFileSync(file, newContent, 'utf8');
console.log('REPLACED successfully');
