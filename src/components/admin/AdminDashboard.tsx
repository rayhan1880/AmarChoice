import { ComponentType } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { AdminTab } from '../../types.ts';
import {
  LayoutDashboard,
  ShoppingBag,
  Layers,
  Truck,
  MessageSquare,
  Activity,
  Eye,
  Users,
  X,
  LogOut,
  ChevronRight,
  Clock,
  ShieldAlert
} from 'lucide-react';

import DashboardOverview from './DashboardOverview.tsx';
import OrdersView from './OrdersView.tsx';
import IncompleteOrdersView from './IncompleteOrdersView.tsx';
import FraudControlView from './FraudControlView.tsx';
import LandingPagesView from './LandingPagesView.tsx';
import CourierSettingsView from './CourierSettingsView.tsx';
import SmsSettingsView from './SmsSettingsView.tsx';
import PixelSettingsView from './PixelSettingsView.tsx';
import UsersView from './UsersView.tsx';
import LanguageSwitcher from './LanguageSwitcher.tsx';
import { translations, toLocalizedNumber } from '../../utils/translations.ts';

interface NavGroup {
  groupTitle: string;
  items: {
    key: AdminTab;
    label: string;
    icon: ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[];
}

export default function AdminDashboard() {
  const {
    adminTab,
    setAdminTab,
    setViewMode,
    orders,
    incompleteOrders,
    fraudControl,
    users,
    currentUser,
    logout,
    activeLandingPage,
    adminSidebarOpen,
    setAdminSidebarOpen,
    adminLanguage
  } = useApp();

  const t = translations[adminLanguage];

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const uncontactedCount = incompleteOrders.filter(o => o.status === 'uncontacted').length;
  const blockedCount = fraudControl?.blockedPhones?.length || 0;

  const navGroups: NavGroup[] = [
    {
      groupTitle: t.groupMainNav,
      items: [
        { key: 'overview', label: t.tabDashboard, icon: LayoutDashboard },
        {
          key: 'orders',
          label: t.tabOrders,
          icon: ShoppingBag,
          badge: pendingOrdersCount,
          badgeColor: 'bg-rose-500 text-white'
        },
        {
          key: 'incomplete_orders',
          label: t.tabIncompleteOrders || 'অসম্পূর্ণ অর্ডার',
          icon: Clock,
          badge: uncontactedCount > 0 ? uncontactedCount : undefined,
          badgeColor: 'bg-amber-500 text-white'
        },
        {
          key: 'fraud_control',
          label: t.tabFraudControl || 'ফেক ও অর্ডার লিমিট',
          icon: ShieldAlert,
          badge: blockedCount > 0 ? blockedCount : undefined,
          badgeColor: 'bg-red-500 text-white'
        },
        { key: 'pages', label: t.tabPages, icon: Layers }
      ]
    },
    {
      groupTitle: t.groupIntegrations,
      items: [
        { key: 'courier', label: t.tabCourier, icon: Truck },
        { key: 'sms', label: t.tabSms, icon: MessageSquare },
        { key: 'pixel', label: t.tabPixel, icon: Activity }
      ]
    },
    {
      groupTitle: t.groupTeam,
      items: [
        {
          key: 'users',
          label: t.tabUsers,
          icon: Users,
          badge: users.length,
          badgeColor: 'bg-stone-200 text-stone-700'
        }
      ]
    }
  ];

  const handleTabSelect = (key: AdminTab) => {
    setAdminTab(key);
    setAdminSidebarOpen(false); // Close mobile drawer if open
  };

  const handleLogout = () => {
    logout();
  };

  // Sidebar navigation content used by both desktop sidebar and mobile drawer
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Nav Items Section */}
      <div className="p-3.5 space-y-4 overflow-y-auto scrollbar-thin">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1.5">
            <div className="px-3 text-[11px] font-bold tracking-wider text-stone-400 uppercase">
              {group.groupTitle}
            </div>
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = adminTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleTabSelect(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition ${
                          isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-700'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? 'bg-white text-rose-700'
                              : item.badgeColor || 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {toLocalizedNumber(item.badge, adminLanguage)}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Language Switcher Option in Sidebar */}
        <div className="pt-1">
          <LanguageSwitcher variant="sidebar" />
        </div>

        {/* Live Customer View Quick Card */}
        <div className="pt-1">
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {t.customerStore}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">{t.liveBadge}</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-tight mb-2.5 truncate">
              {activeLandingPage?.title || t.runningPage}
            </p>
            <button
              type="button"
              onClick={() => {
                setViewMode('customer');
                setAdminSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t.livePreviewLong}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Profile & Logout Footer */}
      {currentUser && (
        <div className="p-3 border-t border-stone-200 bg-stone-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-800 truncate leading-tight">
                  {currentUser.name}
                </p>
                <span className="inline-block text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 leading-none">
                  {currentUser.role === 'superadmin' ? t.superadmin : t.manager}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-stone-100/70 flex flex-col md:flex-row">
      {/* Mobile Drawer Backdrop */}
      {adminSidebarOpen && (
        <div
          onClick={() => setAdminSidebarOpen(false)}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Off-canvas Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col md:hidden transform transition-transform duration-200 ease-in-out ${
          adminSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-900 text-white">
          <div className="flex items-center gap-2 font-bold text-sm">
            <div className="w-6 h-6 rounded bg-rose-600 flex items-center justify-center text-xs">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <span>{t.adminMenu}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminSidebarOpen(false)}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderSidebarContent()}
        </div>
      </div>

      {/* Desktop Sticky Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-stone-200 sticky top-14 h-[calc(100vh-3.5rem)] shadow-xs z-20">
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {(adminTab === 'overview' || adminTab === 'dashboard') && <DashboardOverview />}
        {adminTab === 'orders' && <OrdersView />}
        {adminTab === 'incomplete_orders' && <IncompleteOrdersView />}
        {adminTab === 'fraud_control' && <FraudControlView />}
        {adminTab === 'pages' && <LandingPagesView />}
        {adminTab === 'courier' && <CourierSettingsView />}
        {adminTab === 'sms' && <SmsSettingsView />}
        {adminTab === 'pixel' && <PixelSettingsView />}
        {adminTab === 'users' && <UsersView />}
      </main>
    </div>
  );
}

