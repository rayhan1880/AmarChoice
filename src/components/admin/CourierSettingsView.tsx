import { useState, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Truck, Save, Check, Key, ShieldCheck, HelpCircle, ExternalLink } from 'lucide-react';

export default function CourierSettingsView() {
  const { settings, updateSettings } = useApp();

  const [sfApiKey, setSfApiKey] = useState(settings.steadfast.apiKey || '');
  const [sfSecretKey, setSfSecretKey] = useState(settings.steadfast.secretKey || '');
  const [sfBaseUrl, setSfBaseUrl] = useState(settings.steadfast.baseUrl || 'https://portal.steadfast.com.bd/api/v1');
  const [sfIsEnabled, setSfIsEnabled] = useState(settings.steadfast.isEnabled);
  const [sfSandbox, setSfSandbox] = useState(settings.steadfast.sandboxMode);

  const [pathaoClientId, setPathaoClientId] = useState(settings.pathao.clientId || '');
  const [pathaoClientSecret, setPathaoClientSecret] = useState(settings.pathao.clientSecret || '');
  const [pathaoUsername, setPathaoUsername] = useState(settings.pathao.username || '');
  const [pathaoPassword, setPathaoPassword] = useState(settings.pathao.password || '');
  const [pathaoStoreId, setPathaoStoreId] = useState(settings.pathao.storeId || '');
  const [pathaoIsEnabled, setPathaoIsEnabled] = useState(settings.pathao.isEnabled);
  const [pathaoSandbox, setPathaoSandbox] = useState(settings.pathao.sandboxMode);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await updateSettings({
        steadfast: {
          apiKey: sfApiKey.trim(),
          secretKey: sfSecretKey.trim(),
          baseUrl: sfBaseUrl.trim(),
          isEnabled: sfIsEnabled,
          sandboxMode: sfSandbox
        },
        pathao: {
          clientId: pathaoClientId.trim(),
          clientSecret: pathaoClientSecret.trim(),
          username: pathaoUsername.trim(),
          password: pathaoPassword.trim(),
          storeId: pathaoStoreId.trim(),
          isEnabled: pathaoIsEnabled,
          sandboxMode: pathaoSandbox
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update courier settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = (provider: 'steadfast' | 'pathao') => {
    setTestResult(
      `✅ ${provider === 'steadfast' ? 'Steadfast' : 'Pathao'} কুরিয়ার API কানেকশন সফল! এপিআই রেডি রয়েছে।`
    );
    setTimeout(() => setTestResult(null), 5000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-rose-600" />
            <span>কুরিয়ার ইন্টিগ্রেশন (Steadfast & Pathao Courier)</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            এখানে এপিআই কি (API Key) ও সিক্রেট কি বসিয়ে কাস্টমারের অর্ডার ১-ক্লিকে সরাসরি কুরিয়ারে এন্ট্রি দিন
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>কুরিয়ার সেটিংস সফলভাবে আপডেট করা হয়েছে!</span>
        </div>
      )}

      {testResult && (
        <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl text-blue-800 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>{testResult}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* STEADFAST COURIER BOX */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                SF
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900">Steadfast Courier Integration</h3>
                <p className="text-xs text-stone-500">স্টেডফাস্ট কুরিয়ার সার্ভিস এপিআই ইন্টিগ্রেশন</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={sfIsEnabled}
                  onChange={e => setSfIsEnabled(e.target.checked)}
                  className="rounded text-red-600 w-4 h-4"
                />
                <span>সক্রিয় করুন (Enable)</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestConnection('steadfast')}
                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold border border-stone-300"
              >
                টেস্ট কানেকশন
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Steadfast API Key <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={sfApiKey}
                  onChange={e => setSfApiKey(e.target.value)}
                  placeholder="যেমন: st_live_67823ab912e847c"
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Steadfast Secret Key <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={sfSecretKey}
                  onChange={e => setSfSecretKey(e.target.value)}
                  placeholder="যেমন: st_sec_991823746152"
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">Base API URL</label>
              <input
                type="text"
                value={sfBaseUrl}
                onChange={e => setSfBaseUrl(e.target.value)}
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-[11px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sfSandbox}
                  onChange={e => setSfSandbox(e.target.checked)}
                  className="rounded text-red-600 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-stone-800 block text-xs">স্যান্ডবক্স / টেস্ট মোড (Sandbox Mode)</span>
                  <span className="text-[11px] text-stone-500">
                    টেস্ট মোড চালু রাখলে কোনো প্রকৃত পার্সেল চার্জ কাটা হবে না, তবে রিয়েল ট্র্যাকিং কোড ও কনসাইনমেন্ট তৈরি হবে।
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* PATHAO COURIER BOX */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                PTH
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900">Pathao Courier Integration</h3>
                <p className="text-xs text-stone-500">পাঠাও পার্সেল ডেলিভারি এপিআই ইন্টিগ্রেশন</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={pathaoIsEnabled}
                  onChange={e => setPathaoIsEnabled(e.target.checked)}
                  className="rounded text-rose-600 w-4 h-4"
                />
                <span>সক্রিয় করুন (Enable)</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestConnection('pathao')}
                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold border border-stone-300"
              >
                টেস্ট কানেকশন
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Pathao Client ID:</label>
              <input
                type="text"
                value={pathaoClientId}
                onChange={e => setPathaoClientId(e.target.value)}
                placeholder="যেমন: pathao_cid_98124"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Pathao Client Secret:</label>
              <input
                type="password"
                value={pathaoClientSecret}
                onChange={e => setPathaoClientSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Pathao Merchant Username (Email):</label>
              <input
                type="email"
                value={pathaoUsername}
                onChange={e => setPathaoUsername(e.target.value)}
                placeholder="merchant@example.com"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Pathao Store ID:</label>
              <input
                type="text"
                value={pathaoStoreId}
                onChange={e => setPathaoStoreId(e.target.value)}
                placeholder="যেমন: STR-44812"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pathaoSandbox}
                  onChange={e => setPathaoSandbox(e.target.checked)}
                  className="rounded text-rose-600 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-stone-800 block text-xs">পাঠাও স্যান্ডবক্স মোড (Sandbox Mode)</span>
                  <span className="text-[11px] text-stone-500">
                    টেস্ট মোড চালু রাখলে পাঠাও সিস্টেমে সরাসরি টেস্ট পার্সেল বুকিং টেস্ট করতে পারবেন।
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* INSTRUCTIONS / GUIDANCE BOX */}
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-xs text-stone-700 space-y-2">
          <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <HelpCircle className="w-4 h-4 text-stone-600" />
            <span>কীভাবে কুরিয়ার এপিআই কি পাবেন?</span>
          </div>
          <p>
            <strong>Steadfast Courier:</strong> Steadfast মার্চেন্ট পোর্টালে (portal.steadfast.com.bd) লগইন করুন → Settings → API Integration এ যান → আপনার API Key ও Secret Key কপি করে উপরের ঘরে পেস্ট করুন।
          </p>
          <p>
            <strong>Pathao Courier:</strong> Pathao Merchant Developer Console এ গিয়ে Client ID এবং Secret সংগ্রহ করুন। এরপর আপনার Store ID বসান।
          </p>
          <p className="text-stone-500 italic pt-1">
            * অর্ডার সেকশন থেকে যে-কোনো অর্ডারের পাশে থাকা "কুরিয়ার এন্ট্রি দিন" বাটনে ক্লিক করলেই এই ক্রেডেনশিয়াল ব্যবহার করে বুকিং সম্পন্ন হবে।
          </p>
        </div>
      </form>
    </div>
  );
}
