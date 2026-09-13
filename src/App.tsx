/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MerchantDashboard from './pages/MerchantDashboard';
import PublicApp from "./pages/PublicApp";
import { RiderApp } from "./pages/RiderApp";
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import SuperAdmin from './pages/SuperAdmin';
import ScanAndGo from './pages/ScanAndGo';
import { HospitalityTableOrder, WalletPayRequest, HospitalityFoodApp, ConsumerScanGoStoreSelect, ConsumerScanGoShop, ConsumerHotelSelect, ConsumerHotelBooking } from './components/hospitality/HospitalityComponents';
import { ConsumerPosDisplay } from './components/retail/RetailPOSFullScreen';
import CustomerPolicy from './pages/CustomerPolicy';
import MerchantPolicy from './pages/MerchantPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SetPassword from './pages/SetPassword';
import ConfirmLink from './pages/ConfirmLink';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ResetPasswordModal } from './components/auth/ResetPasswordModal';

export default function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/confirm-link" element={<ConfirmLink />} />
            <Route path="/merchant-dashboard" element={<MerchantDashboard />} />
            <Route path="/rider-app" element={<RiderApp />} />
            <Route path="/public" element={<PublicApp />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
            <Route path="/scan" element={<ScanAndGo />} />
            <Route path="/table-order" element={<HospitalityTableOrder />} />
            <Route path="/wallet-pay" element={<WalletPayRequest />} />
            <Route path="/food" element={<HospitalityFoodApp />} />
            <Route path="/scan-go" element={<ConsumerScanGoStoreSelect />} />
            <Route path="/scan-go/shop" element={<ConsumerScanGoShop />} />
            <Route path="/stay" element={<ConsumerHotelSelect />} />
            <Route path="/pos-display" element={<ConsumerPosDisplay />} />
            <Route path="/stay/hotel" element={<ConsumerHotelBooking />} />
            <Route path="/customer-policy" element={<CustomerPolicy />} />
            <Route path="/merchant-policy" element={<MerchantPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          </Routes>
          <PWAInstallPrompt />
          <ResetPasswordModal />
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
}
