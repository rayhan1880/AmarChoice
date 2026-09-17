/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import Navigation from './components/Navigation.tsx';
import LandingPageView from './components/landing/LandingPageView.tsx';
import AdminDashboard from './components/admin/AdminDashboard.tsx';
import AdminLogin from './components/admin/AdminLogin.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';

function MainContent() {
  const { viewMode, currentUser } = useApp();

  useEffect(() => {
    document.title = 'Premium Apparel & Aesthetic Lifestyle Collective';
  }, []);

  // If in customer view, show the customer landing page
  if (viewMode === 'customer') {
    return (
      <div className="min-h-screen bg-[#f8f4f0] flex flex-col font-sans antialiased text-stone-900">
        <LandingPageView />
      </div>
    );
  }

  // If in admin view (/mypanel) but not logged in, show secure login page
  if (!currentUser) {
    return <AdminLogin />;
  }

  // If in admin view and authenticated, show full admin dashboard
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans antialiased text-stone-900">
      <Navigation />
      <div className="flex-1">
        <AdminDashboard />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

