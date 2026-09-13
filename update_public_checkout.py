import re

with open("src/pages/PublicApp.tsx", "r") as f:
    text = f.read()

search_pattern = r"const total = cart\.reduce\(\(sum, item\) => sum \+ \(\(item\.product\.price \|\| 0\) \* item\.quantity\), 0\);\s*const \{ data: order, error: orderError \} = await supabase\.from\('orders'\)\.insert\(\{.*?alert\(`Order placed successfully!\\nOrder ID: \$\{order\.id\}\\nTotal: ₹\$\{total\}\\nPayment: Cash on Delivery`\);"

replace = """const { data, error } = await supabase.rpc('create_online_order', {
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
        }))
      });

      if (error) {
        throw new Error(error.message);
      }

      setCart([]);
      setCheckoutStep('cart');
      setActiveTab('orders');
      alert(`Order placed successfully!\\nOrder ID: ${data.order_id}\\nTotal: ₹${data.total}\\nPayment: Cash on Delivery`);"""

text = re.sub(search_pattern, replace, text, flags=re.DOTALL)

with open("src/pages/PublicApp.tsx", "w") as f:
    f.write(text)
