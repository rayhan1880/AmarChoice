import { useState, useEffect, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  Activity,
  Save,
  Check,
  Key,
  Zap,
  ShieldCheck,
  Send,
  ExternalLink,
  Eye,
  EyeOff,
  Server,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  CheckCheck,
  ToggleRight
} from 'lucide-react';

export default function PixelSettingsView() {
  const { settings, updateSettings, pixelLogs, testPixelCapi } = useApp();

  // Meta Settings
  const [metaPixelEnabled, setMetaPixelEnabled] = useState(
    settings.metaPixelEnabled ?? (Boolean(settings.globalPixelId || settings.globalMetaCapiToken))
  );
  const [globalPixelId, setGlobalPixelId] = useState(settings.globalPixelId || '');
  const [globalMetaCapiToken, setGlobalMetaCapiToken] = useState(settings.globalMetaCapiToken || '');
  const [globalMetaTestCode, setGlobalMetaTestCode] = useState(settings.globalMetaTestCode || '');

  // TikTok Settings
  const [tiktokPixelEnabled, setTiktokPixelEnabled] = useState(
    settings.tiktokPixelEnabled ?? (Boolean(settings.globalTiktokPixelId || settings.globalTiktokCapiToken))
  );
  const [globalTiktokPixelId, setGlobalTiktokPixelId] = useState(settings.globalTiktokPixelId || '');
  const [globalTiktokCapiToken, setGlobalTiktokCapiToken] = useState(settings.globalTiktokCapiToken || '');
  const [globalTiktokTestCode, setGlobalTiktokTestCode] = useState(settings.globalTiktokTestCode || '');

  // Global Server Tracking Switch
  const [enableServerSideTracking, setEnableServerSideTracking] = useState(
    settings.enableServerSideTracking ?? true
  );

  // Sync state when settings change
  useEffect(() => {
    if (settings) {
      if (settings.globalPixelId !== undefined) setGlobalPixelId(settings.globalPixelId || '');
      if (settings.globalMetaCapiToken !== undefined) setGlobalMetaCapiToken(settings.globalMetaCapiToken || '');
      if (settings.globalMetaTestCode !== undefined) setGlobalMetaTestCode(settings.globalMetaTestCode || '');
      setMetaPixelEnabled(settings.metaPixelEnabled ?? Boolean(settings.globalPixelId || settings.globalMetaCapiToken));

      if (settings.globalTiktokPixelId !== undefined) setGlobalTiktokPixelId(settings.globalTiktokPixelId || '');
      if (settings.globalTiktokCapiToken !== undefined) setGlobalTiktokCapiToken(settings.globalTiktokCapiToken || '');
      if (settings.globalTiktokTestCode !== undefined) setGlobalTiktokTestCode(settings.globalTiktokTestCode || '');
      setTiktokPixelEnabled(settings.tiktokPixelEnabled ?? Boolean(settings.globalTiktokPixelId || settings.globalTiktokCapiToken));
    }
  }, [settings]);

  // UI state
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showTiktokToken, setShowTiktokToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test event state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: unknown } | null>(null);
  const [testEventType, setTestEventType] = useState<'Purchase' | 'PageView' | 'InitiateCheckout'>('Purchase');

  // Logs filter
  const [logFilter, setLogFilter] = useState<'all' | 'meta' | 'tiktok'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await updateSettings({
        metaPixelEnabled,
        globalPixelId: globalPixelId.trim(),
        globalMetaCapiToken: globalMetaCapiToken.trim(),
        globalMetaTestCode: globalMetaTestCode.trim(),
        tiktokPixelEnabled,
        globalTiktokPixelId: globalTiktokPixelId.trim(),
        globalTiktokCapiToken: globalTiktokCapiToken.trim(),
        globalTiktokTestCode: globalTiktokTestCode.trim(),
        enableServerSideTracking
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to update pixel settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTestEvent = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testPixelCapi(testEventType);
      const metaStatus = res.log?.capiStatus?.meta;
      const tiktokStatus = res.log?.capiStatus?.tiktok;

      let msg = `${testEventType} টেস্ট ইভেন্ট সফলভাবে পাঠানো হয়েছে!`;
      if (metaStatus?.status === 'success' || tiktokStatus?.status === 'success') {
        msg += ' কনভার্সন এপিআই (CAPI) সার্ভারে সক্রিয়ভাবে গ্রহণ করেছে।';
      }

      setTestResult({
        success: true,
        message: msg,
        details: res.log?.capiStatus
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'টেস্ট ইভেন্ট প্রেরণ ব্যর্থ হয়েছে।'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = pixelLogs.filter(log => {
    if (logFilter === 'meta') {
      return log.channels?.includes('facebook_pixel') || log.channels?.includes('meta_capi') || log.pixelId;
    }
    if (logFilter === 'tiktok') {
      return log.channels?.includes('tiktok_pixel') || log.channels?.includes('tiktok_capi') || log.tiktokPixelId;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-600" />
            <span>পিক্সেল ও কনভার্সন এপিআই (Pixel & Conversion API - Meta & TikTok)</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            ফেসবুক (Meta) ও টিকটক (TikTok) পিক্সেলের পাশাপাশি সার্ভার-সাইড Conversion API (CAPI) সেটআপ করে ১০০% সঠিক কনভার্সন ট্র্যাকিং নিশ্চিত করুন
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>পিক্সেল ও কনভার্সন এপিআই (CAPI) সেটিংস সফলভাবে আপডেট হয়েছে!</span>
        </div>
      )}

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meta Status */}
        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
              <span className="font-bold text-xs text-stone-900">Meta (Facebook) ট্র্যাকিং</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${globalPixelId ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-stone-100 text-stone-500'}`}>
              {globalPixelId ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
            </span>
          </div>
          <div className="text-[11px] text-stone-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>ব্রাউজার পিক্সেল:</span>
              <span className="font-mono font-semibold">{globalPixelId ? 'সক্রিয়' : 'দেওয়া হয়নি'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>সার্ভার CAPI:</span>
              <span className={`font-semibold ${globalMetaCapiToken ? 'text-emerald-600' : 'text-stone-400'}`}>
                {globalMetaCapiToken ? 'লাইভ কানেক্টেড' : 'টোকেন ফাঁকা'}
              </span>
            </div>
          </div>
        </div>

        {/* TikTok Status */}
        <div className="p-4 rounded-2xl bg-white border border-stone-800/20 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-stone-900 inline-block"></span>
              <span className="font-bold text-xs text-stone-900">TikTok ট্র্যাকিং</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${globalTiktokPixelId ? 'bg-stone-100 text-stone-800 border border-stone-300' : 'bg-stone-100 text-stone-500'}`}>
              {globalTiktokPixelId ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
            </span>
          </div>
          <div className="text-[11px] text-stone-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>ব্রাউজার পিক্সেল:</span>
              <span className="font-mono font-semibold">{globalTiktokPixelId ? 'সক্রিয়' : 'দেওয়া হয়নি'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>সার্ভার Events API:</span>
              <span className={`font-semibold ${globalTiktokCapiToken ? 'text-emerald-600' : 'text-stone-400'}`}>
                {globalTiktokCapiToken ? 'লাইভ কানেক্টেড' : 'টোকেন ফাঁকা'}
              </span>
            </div>
          </div>
        </div>

        {/* CAPI Engine & Deduplication Status */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs text-stone-900">CAPI ও ডিডুপ্লিকেশন</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              সুরক্ষিত
            </span>
          </div>
          <div className="text-[11px] text-stone-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>iOS 14.5+ বাইপাস:</span>
              <span className="text-emerald-600 font-semibold">সক্রিয়</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Event ID Deduplication:</span>
              <span className="text-emerald-600 font-semibold">১০০% ইউনিক</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meta / Facebook Box */}
        <div className={`bg-white rounded-2xl p-6 border transition-all duration-200 shadow-sm space-y-4 ${metaPixelEnabled ? 'border-blue-300' : 'border-stone-200 bg-stone-50/50'}`}>
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                M
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                  Meta (Facebook) পিক্সেল ও CAPI
                </h3>
                <p className="text-[11px] text-stone-500">
                  Facebook Ads Manager এবং Events Manager কনফিগারেশন
                </p>
              </div>
            </div>

            {/* Meta ON/OFF Toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${metaPixelEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                {metaPixelEnabled ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
              </span>
              <button
                type="button"
                onClick={() => setMetaPixelEnabled(!metaPixelEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${metaPixelEnabled ? 'bg-blue-600' : 'bg-stone-300'}`}
                role="switch"
                aria-checked={metaPixelEnabled}
                title={metaPixelEnabled ? "মেটা পিক্সেল বন্ধ করুন" : "মেটা পিক্সেল চালু করুন"}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${metaPixelEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          {metaPixelEnabled ? (
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Facebook Pixel Dataset ID:
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={globalPixelId}
                    onChange={e => setGlobalPixelId(e.target.value)}
                    placeholder="যেমন: 984512398471201"
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  মেটা ইভেন্টস ম্যানেজার থেকে আপনার ডাটা সেট বা পিক্সেল আইডি দিন।
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Meta Conversion API (CAPI) Access Token:
                </label>
                <div className="relative">
                  <input
                    type={showMetaToken ? 'text' : 'password'}
                    value={globalMetaCapiToken}
                    onChange={e => setGlobalMetaCapiToken(e.target.value)}
                    placeholder="EAAB..."
                    className="w-full pl-3 pr-10 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMetaToken(!showMetaToken)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Events Manager &gt; Settings &gt; Conversions API &gt; "Generate access token"-এ ক্লিক করে টোকেন কপি করুন। এটি সার্ভার থেকে সরাসরি ফেসবুক সার্ভারে ডাটা পাঠায়।
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Meta Test Event Code (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  value={globalMetaTestCode}
                  onChange={e => setGlobalMetaTestCode(e.target.value)}
                  placeholder="যেমন: TEST83192"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Events Manager-এর Test Events ট্যাবে লাইভ টেস্ট দেখতে কোডটি দিন (টেস্টিং শেষে মুছে দিতে পারেন)।
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-stone-500">
                গ্লোবাল মেটা পিক্সেল বর্তমানে বন্ধ (OFF) রাখা হয়েছে।
              </p>
              <button
                type="button"
                onClick={() => setMetaPixelEnabled(true)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <ToggleRight className="w-4 h-4" />
                <span>মেটা পিক্সেল চালু করুন (Turn ON)</span>
              </button>
            </div>
          )}
        </div>

        {/* TikTok Box */}
        <div className={`bg-white rounded-2xl p-6 border transition-all duration-200 shadow-sm space-y-4 ${tiktokPixelEnabled ? 'border-stone-800' : 'border-stone-200 bg-stone-50/50'}`}>
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                TT
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                  TikTok পিক্সেল ও Events API (CAPI)
                </h3>
                <p className="text-[11px] text-stone-500">
                  TikTok Ads Manager এবং Web Events API কনফিগারেশন
                </p>
              </div>
            </div>

            {/* TikTok ON/OFF Toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tiktokPixelEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                {tiktokPixelEnabled ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
              </span>
              <button
                type="button"
                onClick={() => setTiktokPixelEnabled(!tiktokPixelEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${tiktokPixelEnabled ? 'bg-stone-900' : 'bg-stone-300'}`}
                role="switch"
                aria-checked={tiktokPixelEnabled}
                title={tiktokPixelEnabled ? "টিকটক পিক্সেল বন্ধ করুন" : "টিকটক পিক্সেল চালু করুন"}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${tiktokPixelEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          {tiktokPixelEnabled ? (
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  TikTok Pixel ID:
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={globalTiktokPixelId}
                    onChange={e => setGlobalTiktokPixelId(e.target.value)}
                    placeholder="যেমন: CP845210984TT"
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs focus:ring-1 focus:ring-stone-800"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  TikTok Ads Manager &gt; Assets &gt; Events &gt; Web Events থেকে Pixel ID দিন।
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  TikTok Conversion API Access Token:
                </label>
                <div className="relative">
                  <input
                    type={showTiktokToken ? 'text' : 'password'}
                    value={globalTiktokCapiToken}
                    onChange={e => setGlobalTiktokCapiToken(e.target.value)}
                    placeholder="টিকটক কনভার্সন এপিআই এক্সেস টোকেন..."
                    className="w-full pl-3 pr-10 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs focus:ring-1 focus:ring-stone-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTiktokToken(!showTiktokToken)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    {showTiktokToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  টিকটক পিক্সেল Settings &gt; Events API &gt; "Generate Access Token" এ ক্লিক করে টোকেন কপি করুন।
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  TikTok Test Event Code (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  value={globalTiktokTestCode}
                  onChange={e => setGlobalTiktokTestCode(e.target.value)}
                  placeholder="যেমন: TEST54321"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs focus:ring-1 focus:ring-stone-800"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  TikTok Events Manager &gt; Test Events ট্যাবের কোডটি প্রদান করুন।
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-stone-500">
                গ্লোবাল টিকটক পিক্সেল বর্তমানে বন্ধ (OFF) রাখা হয়েছে।
              </p>
              <button
                type="button"
                onClick={() => setTiktokPixelEnabled(true)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <ToggleRight className="w-4 h-4" />
                <span>টিকটক পিক্সেল চালু করুন (Turn ON)</span>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Interactive Conversion API Test Tool */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600/30 text-rose-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">
                লাইভ কনভার্সন এপিআই টেস্ট ইঞ্জিন (Test Conversion API)
              </h3>
              <p className="text-xs text-stone-400">
                এক ক্লিকে Meta CAPI এবং TikTok CAPI সার্ভার সংযোগ পরীক্ষা করে নিশ্চিত হোন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={testEventType}
              onChange={e => setTestEventType(e.target.value as 'Purchase' | 'PageView' | 'InitiateCheckout')}
              className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-stone-200 focus:outline-none"
            >
              <option value="Purchase">Purchase (পারচেজ - ১২৫০৳)</option>
              <option value="PageView">PageView (পেইজ ভিউ)</option>
              <option value="InitiateCheckout">InitiateCheckout (চেকআউট শুরু)</option>
            </select>

            <button
              type="button"
              onClick={handleRunTestEvent}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'পাঠানো হচ্ছে...' : 'টেস্ট ইভেন্ট পাঠান'}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${testResult.success ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200' : 'bg-rose-950/40 border-rose-600 text-rose-200'}`}>
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{testResult.message}</span>
            </div>
            {testResult.details ? (
              <pre className="p-2.5 rounded bg-black/40 text-[10px] font-mono text-stone-300 overflow-x-auto">
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-stone-300 pt-1">
          <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-800 flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white">ব্রাউজার পিক্সেল ট্র্যাকিং</span>
              <span className="text-[11px] text-stone-400">কাস্টমারের ব্রাউজারে fbq এবং ttq দিয়ে ইভেন্ট ফায়ার হয়।</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-800 flex items-start gap-2">
            <Server className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white">সার্ভার-সাইড ব্যাকআপ</span>
              <span className="text-[11px] text-stone-400">অ্যাডব্লকার ও সাফারি ITP এড়িয়ে সরাসরি Graph API এবং TikTok Events API-তে ইভেন্ট পৌঁছায়।</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white">Event Deduplication</span>
              <span className="text-[11px] text-stone-400">ইউনিক <code>eventId</code> থাকায় ব্রাউজার ও সার্ভার ইভেন্ট দ্বিগুণ গণনা হয় না।</span>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Events List */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
            স্বয়ংক্রিয় ট্র্যাক হওয়া ইভেন্টস (Standard Events Tracked)
          </h3>
          <span className="text-xs text-stone-500">অন-পেইজ ও ই-কমার্স স্টোরে স্বয়ংক্রিয়</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>PageView</span>
            </div>
            <p className="text-stone-500 text-[11px]">
              ভিজিটর ল্যান্ডিং পেইজ বা স্টোর লোড করার সাথে সাথে ফায়ার হয়।
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span>ViewContent</span>
            </div>
            <p className="text-stone-500 text-[11px]">
              প্রোডাক্ট ডিটেইলস, সাইজ ও কালার ভ্যারিয়েন্ট দেখার সময় ফায়ার হয়।
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>AddToCart</span>
            </div>
            <p className="text-stone-500 text-[11px]">
              ই-কমার্স স্টোরে "কার্টে যোগ করুন" চাপলে পরিমাণ ও দাম সহ ফায়ার হয়।
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>InitiateCheckout</span>
            </div>
            <p className="text-stone-500 text-[11px]">
              কাস্টমার অর্ডার ফর্ম পূরণ শুরু করলে বা চেকআউট বাটনে ক্লিক করলে ফায়ার হয়।
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Zap className="w-4 h-4 text-rose-600" />
              <span>Purchase (কনভার্সন)</span>
            </div>
            <p className="text-stone-500 text-[11px]">
              অর্ডার সফল হলে মূল্য (Value), BDT কারেন্সি ও হ্যাশড কাস্টমার ডাটা সহ ফায়ার হয়।
            </p>
          </div>
        </div>
      </div>

      {/* Live Event Stream / Monitor */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="bg-stone-50 px-5 py-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-600 animate-pulse" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-stone-700">
              লাইভ পিক্সেল ও CAPI ইভেন্ট মনিটর ({pixelLogs.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px]">ফিল্টার:</span>
            <button
              type="button"
              onClick={() => setLogFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${logFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700'}`}
            >
              সকল
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('meta')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${logFilter === 'meta' ? 'bg-blue-600 text-white' : 'bg-stone-200 text-stone-700'}`}
            >
              Meta
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('tiktok')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${logFilter === 'tiktok' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700'}`}
            >
              TikTok
            </button>
          </div>
        </div>

        <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto p-2">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-stone-400 italic space-y-2">
              <p>এখনো কোনো ইভেন্ট ফায়ার হয়নি।</p>
              <button
                type="button"
                onClick={handleRunTestEvent}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold not-italic inline-flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-rose-600" />
                <span>টেস্ট ইভেন্ট পাঠিয়ে পরীক্ষা করুন</span>
              </button>
            </div>
          ) : (
            filteredLogs.map(log => {
              const metaStatus = log.capiStatus?.meta;
              const tiktokStatus = log.capiStatus?.tiktok;

              return (
                <div key={log.id} className="p-3.5 hover:bg-stone-50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 font-mono text-sm">{log.eventName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[10px] border border-rose-200">
                        {log.pageTitle}
                      </span>

                      {/* Channels Badges */}
                      {log.channels?.map(ch => (
                        <span
                          key={ch}
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                            ch === 'facebook_pixel'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : ch === 'meta_capi'
                              ? 'bg-blue-900 text-white border border-blue-800'
                              : ch === 'tiktok_pixel'
                              ? 'bg-stone-200 text-stone-800 border border-stone-300'
                              : 'bg-stone-900 text-rose-400 border border-stone-800'
                          }`}
                        >
                          {ch === 'facebook_pixel' && 'FB Pixel'}
                          {ch === 'meta_capi' && 'Meta CAPI'}
                          {ch === 'tiktok_pixel' && 'TikTok Pixel'}
                          {ch === 'tiktok_capi' && 'TikTok CAPI'}
                        </span>
                      ))}

                      {log.eventId && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(log.eventId!, log.id)}
                          className="text-[10px] text-stone-400 font-mono flex items-center gap-1 hover:text-stone-700"
                          title="Event ID (Deduplication)"
                        >
                          <span>ID: {log.eventId.substring(0, 14)}...</span>
                          {copiedId === log.id ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Delivery Status Messages */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600 font-mono">
                      {metaStatus && (
                        <span className={`inline-flex items-center gap-1 ${metaStatus.status === 'success' ? 'text-emerald-700 font-semibold' : metaStatus.status === 'failed' ? 'text-rose-600' : 'text-stone-500'}`}>
                          • Meta: {metaStatus.message || metaStatus.status}
                        </span>
                      )}
                      {tiktokStatus && (
                        <span className={`inline-flex items-center gap-1 ${tiktokStatus.status === 'success' ? 'text-emerald-700 font-semibold' : tiktokStatus.status === 'failed' ? 'text-rose-600' : 'text-stone-500'}`}>
                          • TikTok: {tiktokStatus.message || tiktokStatus.status}
                        </span>
                      )}
                    </div>

                    {log.data && Object.keys(log.data).length > 0 && (
                      <pre className="mt-1 bg-stone-100 p-2 rounded-lg text-[10px] text-stone-700 overflow-x-auto max-w-xl">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>

                  <div className="text-right text-[10px] text-stone-400 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
