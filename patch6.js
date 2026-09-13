const fs = require('fs');
let content = fs.readFileSync('src/components/retail/InvoiceHistory.tsx', 'utf8');

const target1 = `            customerIds.length > 0 ? supabase.from('retail_customers').select('id, customer_name').in('id', customerIds) : Promise.resolve({ data: [] })`;
const replacement1 = `            customerIds.length > 0 ? supabase.from('retail_customers').select('id, customer_name, phone, address').in('id', customerIds) : Promise.resolve({ data: [] })`;

const target2 = `          if (customersData) {
            data.forEach((inv: any) => {
              const cust = customersData.find((c: any) => c.id === inv.customer_id);
              if (cust) {
                inv.retail_customers = { customer_name: cust.customer_name };
              }
            });
          }`;
const replacement2 = `          if (customersData) {
            data.forEach((inv: any) => {
              const cust = customersData.find((c: any) => c.id === inv.customer_id);
              if (cust) {
                inv.retail_customers = { customer_name: cust.customer_name, phone: cust.phone, address: cust.address };
              }
            });
          }`;

const target3 = `      customer: invoice.retail_customers?.customer_name ? { name: invoice.retail_customers.customer_name } : undefined,`;
const replacement3 = `      customer: invoice.retail_customers?.customer_name ? { name: invoice.retail_customers.customer_name, phone: invoice.retail_customers.phone, address: invoice.retail_customers.address } : undefined,`;

const target4 = `      items: (invoice.sales_invoice_items || []).map((item: any) => ({
        name: item.item_name || item.product_name,
        qty: item.quantity,
        rate: item.price || item.selling_price,
        amount: (item.quantity * (item.price || item.selling_price)) - (item.discount_value || 0)
      })),
      totals: {
        grand_total: Number(invoice.total_amount)
      },`;
const replacement4 = `      items: (invoice.sales_invoice_items || []).map((item: any) => ({
        name: item.item_name || item.product_name,
        hsn: item.hsn_code,
        qty: item.quantity,
        rate: item.price || item.selling_price,
        amount: (item.quantity * (item.price || item.selling_price)) - (item.discount_value || 0)
      })),
      totals: {
        subtotal: (invoice.sales_invoice_items || []).reduce((s: number, item: any) => s + (item.quantity * (item.price || item.selling_price)), 0),
        grand_total: Number(invoice.total_amount)
      },`;

let c1 = false, c2 = false, c3 = false, c4 = false;

if (content.includes(target1)) { content = content.replace(target1, replacement1); c1 = true; }
if (content.includes(target2)) { content = content.replace(target2, replacement2); c2 = true; }
if (content.includes(target3)) { content = content.replace(target3, replacement3); c3 = true; }
if (content.includes(target4)) { content = content.replace(target4, replacement4); c4 = true; }

fs.writeFileSync('src/components/retail/InvoiceHistory.tsx', content, 'utf8');
console.log("Replacements status:", {c1, c2, c3, c4});
