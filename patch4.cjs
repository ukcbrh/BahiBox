const fs = require('fs');
const content = fs.readFileSync('/app/applet/src/pages/PublicApp.tsx', 'utf8');

const searchA = `                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 px-2">Categories</h2>`;
const replaceA = `                      <div className="flex items-center justify-between px-2 mb-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Categories</h2>
                        <button className="text-sm font-semibold text-orange-500">See All &gt;</button>
                      </div>`;

const searchB = `          <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} tenantColor={tenant?.primary_color} />
          <NavItem icon={ShoppingBag} label="Orders" active={activeTab === 'orders'} onClick={() => { if (handleGuardedAction()) setActiveTab('orders'); }} tenantColor={tenant?.primary_color} />
          <NavItem icon={ShoppingCart} label="Cart" active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} tenantColor={tenant?.primary_color} />
          <NavItem icon={UserIcon} label="Profile" active={activeTab === 'profile'} onClick={() => { if (handleGuardedAction()) setActiveTab('profile'); }} tenantColor={tenant?.primary_color} />`;
const replaceB = `          <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} tenantColor={tenant?.primary_color} />
          <NavItem icon={ShoppingBag} label="Bookings" active={activeTab === 'orders'} onClick={() => { if (handleGuardedAction()) setActiveTab('orders'); }} tenantColor={tenant?.primary_color} />
          <NavItem icon={ShoppingCart} label="Cart" active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} tenantColor={tenant?.primary_color} />
          <NavItem icon={CreditCard} label="Payments" active={false} onClick={() => setComingSoonCategory('Payments')} tenantColor={tenant?.primary_color} />
          <NavItem icon={UserIcon} label="Account" active={activeTab === 'profile'} onClick={() => { if (handleGuardedAction()) setActiveTab('profile'); }} tenantColor={tenant?.primary_color} />`;

let newContent = content;
if (newContent.includes(searchA)) { newContent = newContent.replace(searchA, replaceA); console.log("PATCH A APPLIED"); } else { console.log("PATCH A FAILED"); }
if (newContent.includes(searchB)) { newContent = newContent.replace(searchB, replaceB); console.log("PATCH B APPLIED"); } else { console.log("PATCH B FAILED"); }

fs.writeFileSync('/app/applet/src/pages/PublicApp.tsx', newContent);
