import sys

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    rpc_target = """      const { data, error } = await supabase.rpc('create_online_order', {
        p_tenant_id: tId,
        p_branch_id: bId,
        p_user_id: userId,
        p_customer_name: userName || 'Guest',
        p_customer_phone: checkoutPhone,
        p_delivery_address: deliveryAddress,
        p_payment_method: 'cod',
        p_items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        p_latitude: checkoutAddressObj?.latitude || checkoutLat || null,
        p_longitude: checkoutAddressObj?.longitude || checkoutLng || null
      });"""

    rpc_replacement = """      const { data, error } = await supabase.rpc('create_online_order', {
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
      });"""

    if rpc_target in content:
        content = content.replace(rpc_target, rpc_replacement)
        print("Patched rpc")
        
    success_target_2 = """alert(`Order placed successfully!
Order ID: ${data.order_id}
Total: ₹${data.total}
Payment: Cash on Delivery`);"""
    
    success_replacement_2 = """alert(`Order placed successfully!
Order ID: ${data.order_id}
Total: ₹${data.total}
Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid via Wallet'}`);"""

    if success_target_2 in content:
        content = content.replace(success_target_2, success_replacement_2)
        print("Patched alert")

    with open(filename, 'w') as f:
        f.write(content)

process_file('src/pages/PublicApp.tsx')
