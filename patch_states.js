const fs = require('fs');
let content = fs.readFileSync('src/components/retail/CustomerSupplierForm.tsx', 'utf8');

const states = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const statesHtml = states.map(s => `                    <option value="${s}">${s}</option>`).join('\n');

content = content.replace('<option value="">Select State</option>', `<option value="">Select State</option>\n${statesHtml}`);
fs.writeFileSync('src/components/retail/CustomerSupplierForm.tsx', content);
