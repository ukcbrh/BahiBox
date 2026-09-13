const fs = require('fs');
const lines = fs.readFileSync('src/components/payments/SubscriptionPlanManager.tsx', 'utf8').split('\n');
for (let i = 449; i < 535; i++) {
  console.log(`${i + 1}:${lines[i]}`);
}
