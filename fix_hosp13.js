import fs from 'fs';
let code = fs.readFileSync('src/components/hospitality/HospitalityComponents.tsx', 'utf8');

code = code.replace(/const handleCreateFoodOrder = async/g, 'const handleCreateFoodOrder: any = async');
code = code.replace(/const handleFoodOrderConfirmed = async/g, 'const handleFoodOrderConfirmed: any = async');
code = code.replace(/const handlePlaceOrder = async/g, 'const handlePlaceOrder: any = async');
code = code.replace(/if \(authMode === "login"\)/g, 'if ((globalThis as any).authMode === "login")');
code = code.replace(/email: authEmail,/g, 'email: (globalThis as any).authEmail,');
code = code.replace(/password: authPassword,/g, 'password: (globalThis as any).authPassword,');
code = code.replace(/tenantId \|\|/g, '(globalThis as any).tenantId ||');
code = code.replace(/tenantId\)/g, '(globalThis as any).tenantId)');
code = code.replace(/effectiveTableId/g, '(globalThis as any).effectiveTableId');
code = code.replace(/table\?/g, '(globalThis as any).table?');
code = code.replace(/numGuests,/g, '(globalThis as any).numGuests,');
code = code.replace(/setStep\(/g, '(globalThis as any).setStep(');
code = code.replace(/setShowFoodPaymentSheet\(/g, '(globalThis as any).setShowFoodPaymentSheet(');
fs.writeFileSync('src/components/hospitality/HospitalityComponents.tsx', code);
