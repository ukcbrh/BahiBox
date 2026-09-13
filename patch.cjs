const fs = require('fs');
const content = fs.readFileSync('/app/applet/src/pages/PublicApp.tsx', 'utf8');

const searchA = `import { Home, ShoppingBag, Wallet, ShoppingCart, User as UserIcon, Search, Stethoscope, GraduationCap, Truck, ArrowLeft, Store, Package, Clock, Utensils, LayoutDashboard, Sprout, Settings, X, Check, Navigation, ScanLine, Bed } from 'lucide-react';`;
const replaceA = `import { Home, ShoppingBag, Wallet, ShoppingCart, User as UserIcon, Search, Stethoscope, GraduationCap, Truck, ArrowLeft, Store, Package, Clock, Utensils, LayoutDashboard, Sprout, Settings, X, Check, Navigation, ScanLine, Bed, ChefHat, Bus, Building2, Recycle, Briefcase, Wrench, Zap, FileText, Tag, Shield } from 'lucide-react';`;

const searchB = `                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 px-2">Categories</h2>
                      <div className="grid grid-cols-4 gap-y-4 gap-x-2">`;
const replaceB = `                      <div className="mx-2 mb-5 rounded-2xl bg-gradient-to-r from-blue-600 to-orange-500 p-4">
                        <p className="font-bold text-lg text-white">Everything, right here!</p>
                        <p className="text-sm text-white/90">One App for Ride • Food • Mart • Jobs & More</p>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 px-2">Categories</h2>
                      <div className="grid grid-cols-4 gap-y-4 gap-x-2">`;

const searchC = `                        <ServiceIcon icon={Settings} label="Utility" color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" onClick={() => setComingSoonCategory('Utility')} />
                      </div>
                    </div>`;
const replaceC = `                        <ServiceIcon icon={Settings} label="Utility" color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" onClick={() => setComingSoonCategory('Utility')} />
                        <ServiceIcon icon={ChefHat} label="Restaurant" color="bg-red-100 text-red-600" onClick={() => setComingSoonCategory('Restaurant')} />
                        <ServiceIcon icon={Bus} label="Bus/Taxi" color="bg-cyan-100 text-cyan-600" onClick={() => setComingSoonCategory('Bus/Taxi Booking')} />
                        <ServiceIcon icon={Building2} label="Property" color="bg-amber-100 text-amber-600" onClick={() => setComingSoonCategory('Property')} />
                        <ServiceIcon icon={Recycle} label="Buy & Sell" color="bg-lime-100 text-lime-600" onClick={() => setComingSoonCategory('Buy & Sell Old')} />
                        <ServiceIcon icon={Briefcase} label="Jobs" color="bg-violet-100 text-violet-600" onClick={() => setComingSoonCategory('Jobs')} />
                        <ServiceIcon icon={Wrench} label="Home Services" color="bg-teal-100 text-teal-600" onClick={() => setComingSoonCategory('Home Services')} />
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 mt-6 px-2">Quick Services</h2>
                      <div className="grid grid-cols-2 gap-3 px-2">
                        <button onClick={() => setComingSoonCategory('Recharge')} className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                          <Zap size={18} /> Recharge
                        </button>
                        <button onClick={() => setComingSoonCategory('Bill Payments')} className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                          <FileText size={18} /> Bill Payments
                        </button>
                        <button onClick={() => setComingSoonCategory('Offers')} className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold text-sm">
                          <Tag size={18} /> Offers
                        </button>
                        <button onClick={() => setComingSoonCategory('Insurance')} className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                          <Shield size={18} /> Insurance
                        </button>
                      </div>
                    </div>`;

let newContent = content;

if (content.includes(searchA)) {
    newContent = newContent.replace(searchA, replaceA);
    console.log("PATCH A APPLIED");
} else {
    console.log("PATCH A FAILED");
}

if (content.includes(searchB)) {
    newContent = newContent.replace(searchB, replaceB);
    console.log("PATCH B APPLIED");
} else {
    console.log("PATCH B FAILED");
}

if (content.includes(searchC)) {
    newContent = newContent.replace(searchC, replaceC);
    console.log("PATCH C APPLIED");
} else {
    console.log("PATCH C FAILED");
}

if (newContent !== content) {
    fs.writeFileSync('/app/applet/src/pages/PublicApp.tsx', newContent);
    console.log("FILE SAVED");
}
