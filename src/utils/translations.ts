export type AdminLanguage = 'bn' | 'en';

export const translations = {
  bn: {
    // Top Navigation & Sidebar
    appName: 'AmarChoice',
    adminLabel: 'অ্যাডমিন',
    mypanelUrl: '/mypanel',
    livePreview: 'অন-পেইজ প্রিভিউ',
    livePreviewLong: 'অন-পেইজ প্রিভিউ দেখুন',
    previewShort: 'প্রিভিউ',
    customerStore: 'কাস্টমার স্টোর',
    liveBadge: 'লাইভ',
    runningPage: 'রানিং অন-পেইজ',
    logout: 'লগআউট',
    logoutConfirm: 'আপনি কি অ্যাডমিন প্যানেল থেকে লগআউট করতে চান?',
    superadmin: 'সুপার অ্যাডমিন',
    manager: 'ম্যানেজার',
    adminMenu: 'অ্যাডমিন মেনু',
    close: 'বন্ধ করুন',
    languageSwitch: 'ভাষা',
    english: 'English',
    bangla: 'বাংলা',

    // Nav Groups & Tabs
    groupMainNav: 'মূল নেভিগেশন',
    groupIntegrations: 'ইন্টিগ্রেশন ও সেটিংস',
    groupTeam: 'টিম ও ম্যানেজমেন্ট',

    tabDashboard: 'ড্যাশবোর্ড',
    tabOrders: 'অর্ডারসমূহ',
    tabIncompleteOrders: 'অসম্পূর্ণ অর্ডার',
    tabFraudControl: 'ফেক ও অর্ডার লিমিট',
    tabPages: 'অন-পেইজ ম্যানেজার',
    tabCourier: 'কুরিয়ার ইন্টিগ্রেশন',
    tabSms: 'এসএমএস গেটওয়ে',
    tabPixel: 'পিক্সেল ও CAPI (Meta/TikTok)',
    tabUsers: 'ইউজার / অ্যাডমিন',

    // Dashboard Overview
    dashTotalOrders: 'সর্বমোট অর্ডার',
    dashPendingOrders: 'পেন্ডিং অর্ডার',
    dashInCourier: 'কুরিয়ারে পাঠানো',
    dashDelivered: 'সফল ডেলিভারি',
    dashTotalRevenue: 'মোট বিক্রয় (Revenue)',
    dashLandingPerformance: 'অন-পেইজ ভিত্তিক পারফরম্যান্স',
    dashRecentOrders: 'সাম্প্রতিক অর্ডারসমূহ',
    dashViewAllOrders: 'সকল অর্ডার দেখুন',
    dashCreateNewPage: 'নতুন অন-পেইজ তৈরি করুন',
    dashOrdersUnit: 'টি',
    dashTaka: '৳',
    dashStatusPending: 'পেন্ডিং',
    dashStatusDelivered: 'ডেলিভার্ড',
    dashStatusCourier: 'কুরিয়ারে',

    // Orders Management
    ordersTitle: 'অর্ডার ম্যানেজমেন্ট',
    ordersSubtitle: 'মোট {total} টি অর্ডারের মধ্যে ফিল্টার অনুযায়ী {filtered} টি দেখাচ্ছে',
    ordersSearchPlaceholder: 'অর্ডার আইডি (#123), ফোন নাম্বার, কাস্টমার নাম, কুরিয়ার ট্র্যাকিং কোড বা পণ্য দিয়ে সার্চ করুন...',
    ordersSearchAllScope: 'সব কিছু',
    ordersSearchPhoneScope: 'মোবাইল নাম্বার',
    ordersSearchIdScope: 'অর্ডার আইডি',
    ordersSearchCourierScope: 'কুরিয়ার ট্র্যাকিং',
    ordersSearchCustomerScope: 'কাস্টমার নাম',
    ordersSearchProductScope: 'পণ্য',
    ordersSearchAddressScope: 'ঠিকানা',
    ordersSearchAllDates: 'সকল তারিখের অর্ডারে খুঁজুন',
    ordersSearchMatchesFound: '{count} টি অর্ডার মিলেছে',
    ordersSearchClear: 'সার্চ মুছুন',
    ordersSourceLabel: 'অন-পেইজ:',
    ordersAllPages: '🌐 সকল অন-পেইজ ও শপ (All Pages & Stores)',
    ordersFilterByPage: 'অন-পেইজ দিয়ে ফিল্টার:',
    ordersAllPagesTab: 'সকল পেইজ',

    // Order Statuses
    statusAll: 'সব স্ট্যাটাস',
    statusPending: 'পেন্ডিং (Pending)',
    statusConfirmed: 'কনফার্মড (Confirmed)',
    statusProcessing: 'প্রসেসিং (Processing)',
    statusInCourier: 'কুরিয়ারে (In Courier)',
    statusDelivered: 'ডেলিভার্ড (Delivered)',
    statusCancelled: 'বাতিল (Cancelled)',
    statusReturned: 'রিটার্ন (Returned)',

    statusPendingShort: 'পেন্ডিং',
    statusConfirmedShort: 'কনফার্মড',
    statusProcessingShort: 'প্রসেসিং',
    statusInCourierShort: 'কুরিয়ারে',
    statusDeliveredShort: 'ডেলিভার্ড',
    statusCancelledShort: 'বাতিল',
    statusReturnedShort: 'রিটার্ন',

    // Date Filters
    dateFilterLabel: 'তারিখ ফিল্টার:',
    dateAllTime: 'সকল সময়',
    dateToday: 'আজকে (Day)',
    dateYesterday: 'গতকাল',
    dateLast7Days: 'গত ৭ দিন (Weekly)',
    dateThisMonth: 'চলতি মাস (Monthly)',
    dateLast30Days: 'গত ৩০ দিন',
    dateCustom: 'কাস্টম তারিখ (Custom)',
    dateFrom: 'শুরুর তারিখ (হতে):',
    dateTo: 'শেষ তারিখ (পর্যন্ত):',
    dateReset: 'তারিখ রিসেট',
    dateSelectedOrders: 'নির্বাচিত সময়ে অর্ডার:',

    // Daily Breakdown
    dailyBreakdownTitle: 'কোন দিন কত অর্ডার পড়েছে (দৈনিক বিশ্লেষণ)',
    dailyBreakdownSpecific: 'নির্দিষ্ট দিন ফিল্টার করা',
    dailyBreakdownDesc: 'যেকোনো দিনের কার্ডে ক্লিক করে সরাসরি সেই দিনের অর্ডারগুলো নিচে ফিল্টার করতে পারবেন',
    dailyViewAllDays: 'সকল দিন দেখুন',
    dailyHide: 'লুকান',
    dailyShow: 'বিস্তারিত দেখুন',
    dailyNoOrders: 'নির্বাচিত সময়ের মধ্যে কোনো অর্ডার নেই।',
    dailyOrderCount: 'অর্ডার সংখ্যা',
    dailyTotalSales: 'মোট বিক্রয়',
    dailySelected: 'সিলেক্টেড',
    dailyFiltered: 'ফিল্টার্ড',
    dailyToday: 'আজকে',
    dailyYesterday: 'গতকাল',

    // Courier Sync & Automation
    syncCourierBtn: 'কুরিয়ার স্ট্যাটাস সিঙ্ক',
    syncCourierBtnLoading: 'সিঙ্ক হচ্ছে...',
    courierAutoSyncTip: 'কুরিয়ার স্ট্যাটাস পরিবর্তনের সাথে সাথে অর্ডার স্ট্যাটাস স্বয়ংক্রিয়ভাবে আপডেট হবে',
    courierSyncSuccess: 'কুরিয়ার স্ট্যাটাস সফলভাবে আপডেট হয়েছে',
    manualStatusTip: 'ম্যানুয়ালি স্ট্যাটাস পরিবর্তন করতে পারবেন',

    // Customer History
    customerHistoryBadge: 'কাস্টমার হিস্ট্রি',
    customerHistoryTooltip: 'এই কাস্টমারের পূর্ববর্তী সকল অর্ডারের বিস্তারিত রেকর্ড দেখতে ক্লিক করুন',
    customerTotalOrdersShort: '{count}টি অর্ডার',
    customerDeliveredShort: '{count} ডেলিভার্ড',
    customerCancelledShort: '{count} বাতিল',
    customerReturnedShort: '{count} রিটার্ন',
    customerNewUser: '🌟 নতুন কাস্টমার (১ম অর্ডার)',
    customerTrustedUser: '✅ বিশ্বস্ত কাস্টমার',
    customerRiskUser: '⚠️ উচ্চ বাতিল ঝুঁকি',
    customerSuccessRateShort: '{rate}% সাফল্য',

    // Orders Table Columns
    colOrderIdTime: 'অর্ডার আইডি ও সময়',
    colSource: 'অন-পেইজ সোর্স',
    colCustomer: 'কাস্টমার তথ্য',
    colProducts: 'পণ্য ও সাইজ',
    colAmount: 'মূল্য (COD)',
    colStatus: 'স্ট্যাটাস',
    colCourierTracking: 'কুরিয়ার ট্র্যাকিং',
    colGoogleSheet: 'গুগল শিট',
    colAction: 'অ্যাকশন',
    noOrdersFound: 'কোনো অর্ডার পাওয়া যায়নি।',
    noOrdersFoundSub: 'ফিল্টার বা সার্চ পরিবর্তন করে দেখুন।',
    viewDetailsAction: 'বিস্তারিত দেখুন',
    invoiceAction: 'চালান প্রিন্ট',
    deleteAction: 'মুছুন',
    callAction: 'কল দিন',

    // Courier Settings
    courierTitle: 'কুরিয়ার সার্ভিস ইন্টিগ্রেশন',
    courierSubtitle: 'Steadfast ও Pathao এপিআই কনফিগার করে সরাসরি এক ক্লিকে পার্সেল বুকিং দিন',
    courierSave: 'সেটিংস সেভ করুন',
    courierSaving: 'সেভ হচ্ছে...',
    courierSaved: 'সেটিংস সফলভাবে সেভ হয়েছে!',
    courierTest: 'কানেকশন টেস্ট',
    courierSteadfastTitle: 'Steadfast কুরিয়ার কনফিগারেশন',
    courierPathaoTitle: 'Pathao কুরিয়ার কনফিগারেশন',
    courierApiKey: 'এপিআই কি (API Key)',
    courierSecretKey: 'সিক্রেট কি (Secret Key)',
    courierClientId: 'ক্লায়েন্ট আইডি (Client ID)',
    courierClientSecret: 'ক্লায়েন্ট সিক্রেট (Client Secret)',
    courierUsername: 'ইউজারনেম / ইমেইল',
    courierPassword: 'পাসওয়ার্ড',
    courierStoreId: 'স্টোর আইডি (Store ID)',
    courierEnabled: 'এই কুরিয়ার সার্ভিস সক্রিয় করুন',
    courierSandbox: 'টেস্ট / স্যান্ডবক্স মোড',

    // SMS Settings
    smsTitle: 'এসএমএস গেটওয়ে সেটিংস',
    smsSubtitle: 'Greenweb বা যেকোনো কাস্টম গেটওয়ে দিয়ে কাস্টমারকে স্বয়ংক্রিয় এসএমএস পাঠান',
    smsSave: 'এসএমএস সেটিংস সেভ করুন',
    smsSaving: 'সেভ হচ্ছে...',
    smsSaved: 'এসএমএস সেটিংস সেভ হয়েছে!',
    smsEnabled: 'অটোমেটিক এসএমএস নোটিফিকেশন চালু করুন',
    smsApiKey: 'এসএমএস গেটওয়ে এপিআই কি',
    smsSenderId: 'সেন্ডার আইডি (Sender ID / Masking Name)',
    smsOnOrder: 'অর্ডার করার সাথে সাথে নিশ্চিতকরণ এসএমএস',
    smsOnCourier: 'কুরিয়ারে হ্যান্ডওভারের সময় ট্র্যাকিং এসএমএস',
    smsOnDelivery: 'ডেলিভারি সম্পন্ন হওয়ার পর ধন্যবাদ এসএমএস',

    // Pixel Settings
    pixelTitle: 'ফেসবুক পিক্সেল ও কনভার্সন এপিআই',
    pixelSubtitle: 'কাস্টমার ইভেন্ট ট্র্যাক ও মেটা বিজ্ঞাপনের সঠিক আরওআই পর্যবেক্ষণ করুন',
    pixelSave: 'পিক্সেল সেটিংস সেভ করুন',
    pixelSaving: 'সেভ হচ্ছে...',
    pixelSaved: 'পিক্সেল সেটিংস সফলভাবে সেভ হয়েছে!',
    pixelEnabled: 'ফেসবুক পিক্সেল ট্র্যাকিং চালু করুন',
    pixelId: 'পিক্সেল আইডি (Pixel ID)',
    pixelAccessToken: 'কনভার্সন এপিআই এক্সেস টোকেন (Server-side CAPI Token)',
    pixelTestCode: 'টেস্ট ইভেন্ট কোড (ঐচ্ছিক)',

    // Users / Team Settings
    usersTitle: 'অ্যাডমিন ইউজার ও এক্সেস কন্ট্রোল',
    usersSubtitle: 'প্যানেল পরিচালনার জন্য একাধিক কর্মী বা ম্যানেজারের আইডি তৈরি করুন',
    usersAddNew: 'নতুন অ্যাডমিন ইউজার যোগ করুন',
    usersName: 'নাম',
    usersEmail: 'ইমেইল',
    usersPassword: 'পাসওয়ার্ড',
    usersRole: 'রোল / পদবী',
    usersCreateBtn: 'ইউজার তৈরি করুন',
    usersCreating: 'তৈরি হচ্ছে...',
    usersListTitle: 'নিবন্ধিত অ্যাডমিন ইউজারদের তালিকা',
    usersDeleteConfirm: 'আপনি কি সত্যিই এই ইউজারকে মুছে ফেলতে চান?'
  },

  en: {
    // Top Navigation & Sidebar
    appName: 'AmarChoice',
    adminLabel: 'Admin',
    mypanelUrl: '/mypanel',
    livePreview: 'Live Preview',
    livePreviewLong: 'View Live Preview',
    previewShort: 'Preview',
    customerStore: 'Customer Store',
    liveBadge: 'Live',
    runningPage: 'Active Landing Page',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out from the admin panel?',
    superadmin: 'Super Admin',
    manager: 'Manager',
    adminMenu: 'Admin Menu',
    close: 'Close',
    languageSwitch: 'Language',
    english: 'English',
    bangla: 'বাংলা',

    // Nav Groups & Tabs
    groupMainNav: 'Main Navigation',
    groupIntegrations: 'Integrations & Settings',
    groupTeam: 'Team & Management',

    tabDashboard: 'Dashboard',
    tabOrders: 'Orders',
    tabIncompleteOrders: 'Incomplete Checkouts',
    tabFraudControl: 'Fraud & Order Limits',
    tabPages: 'Landing Pages',
    tabCourier: 'Courier Integration',
    tabSms: 'SMS Gateway',
    tabPixel: 'Pixel & CAPI (Meta/TikTok)',
    tabUsers: 'Users / Admin',

    // Dashboard Overview
    dashTotalOrders: 'Total Orders',
    dashPendingOrders: 'Pending Orders',
    dashInCourier: 'In Courier',
    dashDelivered: 'Delivered',
    dashTotalRevenue: 'Total Revenue',
    dashLandingPerformance: 'Landing Page Performance',
    dashRecentOrders: 'Recent Orders',
    dashViewAllOrders: 'View All Orders',
    dashCreateNewPage: 'Create New Page',
    dashOrdersUnit: 'orders',
    dashTaka: '৳',
    dashStatusPending: 'Pending',
    dashStatusDelivered: 'Delivered',
    dashStatusCourier: 'In Courier',

    // Orders Management
    ordersTitle: 'Order Management',
    ordersSubtitle: 'Showing {filtered} of {total} total orders based on filters',
    ordersSearchPlaceholder: 'Search by Order ID (#123), Phone, Customer Name, Courier Tracking, or Product...',
    ordersSearchAllScope: 'All Fields',
    ordersSearchPhoneScope: 'Phone Number',
    ordersSearchIdScope: 'Order ID',
    ordersSearchCourierScope: 'Courier Tracking',
    ordersSearchCustomerScope: 'Customer Name',
    ordersSearchProductScope: 'Product',
    ordersSearchAddressScope: 'Address',
    ordersSearchAllDates: 'Search all dates',
    ordersSearchMatchesFound: '{count} orders found',
    ordersSearchClear: 'Clear search',
    ordersSourceLabel: 'Source:',
    ordersAllPages: '🌐 All Pages & Stores',
    ordersFilterByPage: 'Filter by Page:',
    ordersAllPagesTab: 'All Pages',

    // Order Statuses
    statusAll: 'All Status',
    statusPending: 'Pending',
    statusConfirmed: 'Confirmed',
    statusProcessing: 'Processing',
    statusInCourier: 'In Courier',
    statusDelivered: 'Delivered',
    statusCancelled: 'Cancelled',
    statusReturned: 'Returned',

    statusPendingShort: 'Pending',
    statusConfirmedShort: 'Confirmed',
    statusProcessingShort: 'Processing',
    statusInCourierShort: 'In Courier',
    statusDeliveredShort: 'Delivered',
    statusCancelledShort: 'Cancelled',
    statusReturnedShort: 'Returned',

    // Date Filters
    dateFilterLabel: 'Date Filter:',
    dateAllTime: 'All Time',
    dateToday: 'Today (Day)',
    dateYesterday: 'Yesterday',
    dateLast7Days: 'Last 7 Days (Weekly)',
    dateThisMonth: 'This Month (Monthly)',
    dateLast30Days: 'Last 30 Days',
    dateCustom: 'Custom Range',
    dateFrom: 'From Date:',
    dateTo: 'To Date:',
    dateReset: 'Reset Date',
    dateSelectedOrders: 'Selected Period Orders:',

    // Daily Breakdown
    dailyBreakdownTitle: 'Daily Orders Breakdown (Orders Per Day)',
    dailyBreakdownSpecific: 'Specific Day Filtered',
    dailyBreakdownDesc: 'Click on any day card to instantly filter the orders below for that date',
    dailyViewAllDays: 'View All Days',
    dailyHide: 'Hide',
    dailyShow: 'View Details',
    dailyNoOrders: 'No orders found within the selected date range.',
    dailyOrderCount: 'Order Count',
    dailyTotalSales: 'Total Sales',
    dailySelected: 'Selected',
    dailyFiltered: 'Filtered',
    dailyToday: 'Today',
    dailyYesterday: 'Yesterday',

    // Courier Sync & Automation
    syncCourierBtn: 'Sync Courier Status',
    syncCourierBtnLoading: 'Syncing...',
    courierAutoSyncTip: 'Order status automatically updates whenever courier status changes',
    courierSyncSuccess: 'Courier statuses successfully synced',
    manualStatusTip: 'You can also manually update the order status anytime',

    // Customer History
    customerHistoryBadge: 'Customer History',
    customerHistoryTooltip: 'Click to view complete order & delivery history for this customer',
    customerTotalOrdersShort: '{count} orders',
    customerDeliveredShort: '{count} delivered',
    customerCancelledShort: '{count} cancelled',
    customerReturnedShort: '{count} returned',
    customerNewUser: '🌟 New Customer (1st Order)',
    customerTrustedUser: '✅ Trusted Customer',
    customerRiskUser: '⚠️ High Cancellation Risk',
    customerSuccessRateShort: '{rate}% success',

    // Orders Table Columns
    colOrderIdTime: 'Order ID & Date',
    colSource: 'Page Source',
    colCustomer: 'Customer Details',
    colProducts: 'Products & Size',
    colAmount: 'Amount (COD)',
    colStatus: 'Status',
    colCourierTracking: 'Courier Tracking',
    colGoogleSheet: 'Google Sheet',
    colAction: 'Actions',
    noOrdersFound: 'No orders found.',
    noOrdersFoundSub: 'Try adjusting your search query or filter options.',
    viewDetailsAction: 'View Details',
    invoiceAction: 'Print Invoice',
    deleteAction: 'Delete',
    callAction: 'Call Customer',

    // Courier Settings
    courierTitle: 'Courier Service Integration',
    courierSubtitle: 'Configure Steadfast and Pathao APIs for 1-click parcel consignments',
    courierSave: 'Save Settings',
    courierSaving: 'Saving...',
    courierSaved: 'Settings saved successfully!',
    courierTest: 'Test Connection',
    courierSteadfastTitle: 'Steadfast Courier Configuration',
    courierPathaoTitle: 'Pathao Courier Configuration',
    courierApiKey: 'API Key',
    courierSecretKey: 'Secret Key',
    courierClientId: 'Client ID',
    courierClientSecret: 'Client Secret',
    courierUsername: 'Username / Email',
    courierPassword: 'Password',
    courierStoreId: 'Store ID',
    courierEnabled: 'Enable this courier service',
    courierSandbox: 'Sandbox / Test Mode',

    // SMS Settings
    smsTitle: 'SMS Gateway Settings',
    smsSubtitle: 'Send automated SMS notifications to customers using Greenweb or custom API',
    smsSave: 'Save SMS Settings',
    smsSaving: 'Saving...',
    smsSaved: 'SMS settings saved!',
    smsEnabled: 'Enable automatic SMS notifications',
    smsApiKey: 'SMS Gateway API Key',
    smsSenderId: 'Sender ID / Masking Name',
    smsOnOrder: 'Instant order confirmation SMS to customer',
    smsOnCourier: 'SMS with tracking code when parcel is handed over',
    smsOnDelivery: 'Thank you SMS upon successful delivery',

    // Pixel Settings
    pixelTitle: 'Facebook Pixel & Conversion API',
    pixelSubtitle: 'Track customer purchase events and monitor Meta Ad conversions',
    pixelSave: 'Save Pixel Settings',
    pixelSaving: 'Saving...',
    pixelSaved: 'Pixel settings saved successfully!',
    pixelEnabled: 'Enable Facebook Pixel tracking',
    pixelId: 'Pixel ID',
    pixelAccessToken: 'Conversion API Access Token (Server-side CAPI)',
    pixelTestCode: 'Test Event Code (Optional)',

    // Users / Team Settings
    usersTitle: 'Admin Users & Access Control',
    usersSubtitle: 'Create and manage administrative accounts with role-based permissions',
    usersAddNew: 'Add New Admin User',
    usersName: 'Name',
    usersEmail: 'Email',
    usersPassword: 'Password',
    usersRole: 'Role / Designation',
    usersCreateBtn: 'Create User',
    usersCreating: 'Creating...',
    usersListTitle: 'Registered Admin Users',
    usersDeleteConfirm: 'Are you sure you want to delete this user?'
  }
};

export function toLocalizedNumber(num: number | string, lang: AdminLanguage): string {
  if (lang === 'en') {
    return String(num);
  }
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, d => bnDigits[parseInt(d, 10)]);
}

export function toLocalizedCurrency(amount: number, lang: AdminLanguage): string {
  const numStr = toLocalizedNumber(amount, lang);
  return lang === 'bn' ? `${numStr}৳` : `৳${numStr}`;
}

export function toLocalizedDate(date: Date | string, lang: AdminLanguage): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  if (lang === 'bn') {
    return d.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function getLocalizedDayName(date: Date | string, lang: AdminLanguage): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  if (lang === 'bn') {
    const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    return days[d.getDay()];
  }
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

/**
 * Shows relative time (e.g. "৫ মিনিট আগে", "১ ঘণ্টা ২০ মিনিট আগে") for orders placed within 24 hours.
 * For orders older than 24 hours, displays the formatted date and time.
 */
export function formatOrderRelativeTime(date: Date | string, lang: AdminLanguage = 'bn'): { display: string; isRecent: boolean; fullTooltip: string } {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return { display: '', isRecent: false, fullTooltip: '' };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  const fullTooltip = `${toLocalizedDate(d, lang)} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  // If order was placed in the future or under 1 minute
  if (diffMin < 1) {
    const text = lang === 'bn' ? 'এইমাত্র' : 'Just now';
    return { display: text, isRecent: true, fullTooltip };
  }

  // Under 24 hours: show minutes/hours ago
  if (diffHours < 24) {
    if (diffHours === 0) {
      const minStr = toLocalizedNumber(diffMin, lang);
      const text = lang === 'bn' ? `${minStr} মিনিট আগে` : `${minStr} mins ago`;
      return { display: text, isRecent: true, fullTooltip };
    }

    const remainingMins = diffMin % 60;
    const hoursStr = toLocalizedNumber(diffHours, lang);
    const minsStr = toLocalizedNumber(remainingMins, lang);

    if (remainingMins === 0) {
      const text = lang === 'bn' ? `${hoursStr} ঘণ্টা আগে` : `${hoursStr} hr${diffHours > 1 ? 's' : ''} ago`;
      return { display: text, isRecent: true, fullTooltip };
    }

    const text = lang === 'bn'
      ? `${hoursStr} ঘণ্টা ${minsStr} মিনিট আগে`
      : `${hoursStr}h ${minsStr}m ago`;
    return { display: text, isRecent: true, fullTooltip };
  }

  // After 24 hours: show date and time
  const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = toLocalizedDate(d, lang);
  return {
    display: `${dateFormatted}, ${timeFormatted}`,
    isRecent: false,
    fullTooltip
  };
}

