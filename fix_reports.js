import fs from 'fs';
['src/components/reports/InwardPaymentReportView.tsx', 
 'src/components/reports/PurchaseOutstandingView.tsx',
 'src/components/reports/PurchaseReportView.tsx',
 'src/components/reports/SaleOutstandingView.tsx',
 'src/components/reports/SaleReportView.tsx',
 'src/components/reports/SalesByProductReport.tsx',
 'src/components/reports/StockReportView.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/import \{ ReportActionButtons \} from '\.\/ReportActionButtons';\nimport \{ ReportActionButtons \} from '\.\/ReportActionButtons';/g, "import { ReportActionButtons } from './ReportActionButtons';");
  fs.writeFileSync(file, code);
});
let ledgerCode = fs.readFileSync('src/components/retail/PartyLedgerModal.tsx', 'utf8');
ledgerCode = ledgerCode.replace(/import \{ X, Printer/g, "import { ReportActionButtons } from '../reports/ReportActionButtons';\nimport { X, Printer");
fs.writeFileSync('src/components/retail/PartyLedgerModal.tsx', ledgerCode);
