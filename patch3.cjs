const fs = require('fs');
const content = fs.readFileSync('/app/applet/src/pages/PublicApp.tsx', 'utf8');

const searchA = `import { Home, ShoppingBag, Wallet, ShoppingCart, User as UserIcon, Search, Stethoscope, GraduationCap, Truck, ArrowLeft, Store, Package, Clock, Utensils, LayoutDashboard, Sprout, Settings, X, Check, Navigation, ScanLine, Bed, ChefHat, Bus, Building2, Recycle, Briefcase, Wrench, Zap, FileText, Tag, Shield } from 'lucide-react';`;
const replaceA = `import { Home, ShoppingBag, Wallet, ShoppingCart, User as UserIcon, Search, Stethoscope, GraduationCap, Truck, ArrowLeft, Store, Package, Clock, Utensils, LayoutDashboard, Sprout, Settings, X, Check, Navigation, ScanLine, Bed, ChefHat, Bus, Building2, Recycle, Briefcase, Wrench, Zap, FileText, Tag, Shield, MapPin, ChevronDown, Bell, Calendar, CreditCard } from 'lucide-react';`;

const searchB = `                {!tenant && (
                  <div className="hidden md:flex flex-col items-start leading-tight text-xs flex-shrink-0">
                    <span className="text-white/70">Deliver to Guest</span>
                    <span className="font-bold flex items-center gap-1 text-white"><Navigation size={12} /> Update location</span>
                  </div>
                )}`;
const replaceB = `                {!tenant && (
                  <div className="hidden md:flex flex-col items-start leading-tight text-xs flex-shrink-0 cursor-pointer" onClick={handleUseCurrentLocation}>
                    <span className="text-white/70">{district ? 'Now delivering to' : 'Deliver to Guest'}</span>
                    <span className="font-bold flex items-center gap-1 text-white">
                      <MapPin size={12} /> {district || 'Set location'} <ChevronDown size={12} />
                    </span>
                  </div>
                )}`;

const searchC = `              {!tenant && (
                <div className="flex md:hidden items-center gap-1.5 text-xs text-white/80 mb-2 mt-1">
                  <Navigation size={12} />
                  <span>Deliver to Guest — Update location</span>
                </div>
              )}`;
const replaceC = `              {!tenant && (
                <div className="flex md:hidden items-center gap-1.5 text-xs text-white/80 mb-2 mt-1 cursor-pointer" onClick={handleUseCurrentLocation}>
                  <MapPin size={12} />
                  <span className="font-bold">{district || 'Set location'}</span>
                  <ChevronDown size={12} />
                </div>
              )}`;

let newContent = content;
if (newContent.includes(searchA)) { newContent = newContent.replace(searchA, replaceA); console.log("PATCH A APPLIED"); } else { console.log("PATCH A FAILED"); }
if (newContent.includes(searchB)) { newContent = newContent.replace(searchB, replaceB); console.log("PATCH B APPLIED"); } else { console.log("PATCH B FAILED"); }
if (newContent.includes(searchC)) { newContent = newContent.replace(searchC, replaceC); console.log("PATCH C APPLIED"); } else { console.log("PATCH C FAILED"); }

fs.writeFileSync('/app/applet/src/pages/PublicApp.tsx', newContent);
