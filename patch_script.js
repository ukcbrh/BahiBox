const fs = require('fs');
const file = 'src/pages/MerchantDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /^[ \t]*\{activeTab === 'quotation'[^<]*<QuotationPage \/>\}[ \t]*\n[ \t]*\{activeTab === 'proforma'[^<]*<ProformaInvoicePage \/>\}[ \t]*\n[ \t]*\{activeTab === 'delivery_challan_inward'[^<]*<DeliveryChallanInwardPage \/>\}[ \t]*\n[ \t]*\{activeTab === 'delivery_challan_outward'[^<]*<DeliveryChallanOutwardPage \/>\}/m;

const replacement = "        {activeTab === 'documents' && activeModuleState === 'Retail POS' && <DocumentsHub />}";

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log('PATCH LAGA: HAAN');
} else {
  console.log('PATCH LAGA: NAHI - marker not found');
}
