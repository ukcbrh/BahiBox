import fs from 'fs';

function applyPatch(file, target, replacement, description) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`[SUCCESS] Patched: ${description}`);
  } else {
    console.error(`[ERROR] Target not found for: ${description}`);
  }
}

// 1. DeliveryChallanOutwardList
applyPatch('src/components/retail/DeliveryChallanOutwardList.tsx',
`      },
      footer: { stamp_url: brandingInfo?.stamp_url }
    };`,
`      },
      footer: { stamp_url: brandingInfo?.stamp_url },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'DeliveryChallanOutwardList');

// 2. RetailScanGoOrdersPage
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`      totals: {
        grand_total: Number(invoice.total_amount)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      }
    };`,
`      totals: {
        grand_total: Number(invoice.total_amount)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'RetailScanGoOrdersPage');

// 3. Main In-Store POS
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`        stamp_url: brandingInfo?.stamp_url,
        signature_label: undefined
      }
    };`,
`        stamp_url: brandingInfo?.stamp_url,
        signature_label: undefined
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'Main In-Store POS');

// 4. DeliveryChallanInwardPage
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`      totals: {
        grand_total: items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_cost) || 0), 0)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      }
    };`,
`      totals: {
        grand_total: items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_cost) || 0), 0)
      },
      footer: {
        stamp_url: brandingInfo?.stamp_url
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'DeliveryChallanInwardPage');

// 5. DeliveryChallanOutwardPage
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`      grand_total: items.reduce((sum, i) => sum + ((parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0) - (parseFloat(i.discount_value) || 0)), 0)
      },
      footer: { stamp_url: brandingInfo?.stamp_url }
    };`,
`      grand_total: items.reduce((sum, i) => sum + ((parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0) - (parseFloat(i.discount_value) || 0)), 0)
      },
      footer: { stamp_url: brandingInfo?.stamp_url },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'DeliveryChallanOutwardPage');

// 6. CreatePurchaseInvoice
applyPatch('src/components/retail/CreatePurchaseInvoice.tsx',
`      footer: {
          stamp_url: brandingInfo?.stamp_url
        }
      };`,
`      footer: {
          stamp_url: brandingInfo?.stamp_url
        },
        bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
      };`, 'CreatePurchaseInvoice');

// 7. DeliveryChallanInwardList
applyPatch('src/components/retail/DeliveryChallanInwardList.tsx',
`      },
      footer: { stamp_url: brandingInfo?.stamp_url }
    };`,
`      },
      footer: { stamp_url: brandingInfo?.stamp_url },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'DeliveryChallanInwardList');

// 8. PurchaseInvoices
applyPatch('src/components/retail/PurchaseInvoices.tsx',
`      footer: {
        stamp_url: brandingInfo?.stamp_url
      }
    };`,
`      footer: {
        stamp_url: brandingInfo?.stamp_url
      },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'PurchaseInvoices');

// 9. printOrderBillAndLabel
applyPatch('src/components/retail/RetailPOSFullScreen.tsx',
`      totals: { grand_total: orderTotal },
      footer: { stamp_url: brandingInfo?.stamp_url }
    };`,
`      totals: { grand_total: orderTotal },
      footer: { stamp_url: brandingInfo?.stamp_url },
      bill_number_code_type: brandingInfo?.bill_number_code_type || 'none'
    };`, 'printOrderBillAndLabel');

