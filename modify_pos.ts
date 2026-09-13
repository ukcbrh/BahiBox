import fs from 'fs';
let content = fs.readFileSync('src/components/retail/RetailPOSFullScreen.tsx', 'utf-8');

const oldUpdateStr = `const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
       const supabase = getSupabaseClient();
       if (!supabase) return;
       const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
       if (error) throw error;
       setOnlineOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch(err) {
       console.error("Failed to update order status:", err);
       alert("Failed to update order status");
    }
  };`;

const newUpdateStr = `const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
       const supabase = getSupabaseClient();
       if (!supabase) return;
       if (newStatus === 'Dispatch') {
         const { error } = await supabase.rpc('create_delivery_job', { p_order_id: orderId });
         if (error) throw error;
         setOnlineOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
         // Optional: if it tracks assignments, it would refetch here.
       } else {
         const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
         if (error) throw error;
         setOnlineOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o));
       }
    } catch(err) {
       console.error("Failed to update order status:", err);
       alert("Failed to update order status");
    }
  };`;

if(content.includes(oldUpdateStr)) {
  content = content.replace(oldUpdateStr, newUpdateStr);
  console.log('Replaced updateOrderStatus in POS');
} else {
  console.log('Could not find updateOrderStatus in POS');
}

fs.writeFileSync('src/components/retail/RetailPOSFullScreen.tsx', content);
