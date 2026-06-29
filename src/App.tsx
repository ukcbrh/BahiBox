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
import PublicApp from './pages/PublicApp';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import SuperAdmin from './pages/SuperAdmin';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

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
            <Route path="/merchant" element={<MerchantDashboard />} />
            <Route path="/public" element={<PublicApp />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
          </Routes>
          <PWAInstallPrompt />
        </BrowserRouter>
      </AuthProvider>
    </TenantProvider>
  );
}
