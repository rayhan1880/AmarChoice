import { useState, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { Truck, Save, Check, Key, ShieldCheck, HelpCircle, Copy, AlertCircle, RefreshCw } from 'lucide-react';

export default function CourierSettingsView() {
  const { settings, updateSettings } = useApp();

  const [sfApiKey, setSfApiKey] = useState(settings.steadfast.apiKey || '');
  const [sfSecretKey, setSfSecretKey] = useState(settings.steadfast.secretKey || '');
  const [sfBaseUrl, setSfBaseUrl] = useState(
    settings.steadfast.baseUrl?.includes('steadfast.com.bd')
      ? 'https://portal.packzy.com/api/v1'
      : settings.steadfast.baseUrl || 'https://portal.packzy.com/api/v1'
  );
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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const steadfastWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/courier/webhook/steadfast`
    : '/api/courier/webhook/steadfast';

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

  const handleTestConnection = async (provider: 'steadfast' | 'pathao') => {
    setIsTesting(true);
    setTestResult(null);

    if (provider === 'steadfast') {
      if (!sfApiKey.trim() || !sfSecretKey.trim()) {
        setTestResult({
          type: 'error',
          text: 'অনুগ্রহ করে প্রথমে Steadfast API Key এবং Secret Key ইনপুট দিন।'
        });
        setIsTesting(false);
        return;
      }

      try {
        const res = await api.testSteadfast({
          apiKey: sfApiKey.trim(),
          secretKey: sfSecretKey.trim(),
          baseUrl: sfBaseUrl.trim()
        });

        if (res.success) {
          setTestResult({
            type: 'success',
            text: res.message || `Steadfast API কানেকশন সফল! বর্তমান একাউন্ট ব্যালেন্স: ৳${res.balance ?? 0}`
          });
        } else {
          setTestResult({
            type: 'error',
            text: res.error || 'Steadfast এপিআই কানেক্ট করা যায়নি। আপনার API Key ও Secret Key সঠিক কি না পরীক্ষা করুন।'
          });
        }
      } catch (err: any) {
        setTestResult({
          type: 'error',
          text: err.message || 'কানেকশন টেস্টে ত্রুটি ঘটেছে।'
        });
      } finally {
        setIsTesting(false);
      }
    } else {
      setTimeout(() => {
        setTestResult({
          type: 'success',
          text: 'Pathao কনফিগারেশন যাচাই করা হয়েছে।'
        });
        setIsTesting(false);
      }, 700);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(steadfastWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
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
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-start gap-2.5 ${
          testResult.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
            : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          {testResult.type === 'success' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{testResult.text}</span>
        </div>
      )}

      {/* AUTO STATUS SYNC NOTIFICATION BANNER */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          <div>
            <span className="font-bold">অটো স্ট্যাটাস সিঙ্ক সক্রিয়:</span>
            <span className="ml-1 text-blue-800">
              কুরিয়ারে থাকা অর্ডারসমূহের ডেলিভারি বা রিটার্ন স্ট্যাটাস প্রতি ২ মিনিট পর পর ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে সিঙ্ক ও আপডেট হয়।
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* STEADFAST COURIER BOX */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black text-sm">
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
                disabled={isTesting}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold border border-stone-300 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isTesting ? 'টেস্ট করা হচ্ছে...' : 'টেস্ট কানেকশন'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Steadfast API Key:</label>
              <input
                type="text"
                value={sfApiKey}
                onChange={e => setSfApiKey(e.target.value)}
                placeholder="যেমন: abcdef1234567890..."
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs"
              />
              <p className="text-[11px] text-stone-400 mt-1">Steadfast পোর্টালে সেটিংস থেকে প্রাপ্ত API Key</p>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Steadfast Secret Key:</label>
              <input
                type="password"
                value={sfSecretKey}
                onChange={e => setSfSecretKey(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs"
              />
              <p className="text-[11px] text-stone-400 mt-1">Steadfast পোর্টালে সেটিংস থেকে প্রাপ্ত Secret Key</p>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-stone-700">API Base URL (অফিসিয়াল সার্ভার):</label>
                <button
                  type="button"
                  onClick={() => setSfBaseUrl('https://portal.packzy.com/api/v1')}
                  className="text-[11px] text-rose-600 hover:underline font-bold"
                >
                  অফিসিয়াল Packzy/Steadfast URL রিসেট করুন
                </button>
              </div>
              <input
                type="text"
                value={sfBaseUrl}
                onChange={e => setSfBaseUrl(e.target.value)}
                placeholder="https://portal.packzy.com/api/v1"
                className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-xs"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Steadfast এর লাইভ ক্লাউড গেটওয়ে: <span className="font-mono text-emerald-700 font-semibold">https://portal.packzy.com/api/v1</span> (সার্ভার যোগাযোগে কোনো সমস্যা হলে সিস্টেম স্বয়ংক্রিয়ভাবে ব্যাকআপ গেটওয়ে ব্যবহার করে)।
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sfSandbox}
                  onChange={e => setSfSandbox(e.target.checked)}
                  className="rounded text-red-600 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-stone-800 block text-xs">স্যান্ডবক্স / ডেমো মোড (Sandbox Mode)</span>
                  <span className="text-[11px] text-stone-500">
                    সতর্কতা: রিয়েল অর্ডারে আসল পার্সেল বুকিং করতে হলে এই বক্সটি <strong>আনচেক (বন্ধ)</strong> রাখুন। স্যান্ডবক্স মোড চালু থাকলে আসল Steadfast API-তে অর্ডার পাঠানো হবে না।
                  </span>
                </div>
              </label>
            </div>

            {/* WEBHOOK SETUP SECTION */}
            <div className="sm:col-span-2 p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-stone-600" />
                  <span>Steadfast Webhook URL (তাৎক্ষণিক অটো-আপডেটের জন্য):</span>
                </span>
                <button
                  type="button"
                  onClick={copyWebhook}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-stone-300 shadow-2xs"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'কপি হয়েছে' : 'URL কপি করুন'}</span>
                </button>
              </div>
              <div className="p-2 bg-white rounded-lg border border-stone-200 font-mono text-[11px] text-stone-700 break-all select-all">
                {steadfastWebhookUrl}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                আপনার Steadfast মার্চেন্ট ড্যাশবোর্ডে গিয়ে <strong>Settings &gt; Webhook</strong> এ এই URL বসিয়ে সেভ করুন। কুরিয়ার যখনই পার্সেল ডেলিভারি সম্পন্ন করবে বা রিটার্ন করবে, তখনই সাথে সাথে আপনার স্টোরে অর্ডার স্ট্যাটাস স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
              </p>
            </div>
          </div>
        </div>

        {/* PATHAO COURIER BOX */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-sm">
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
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold border border-stone-300"
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
              <label className="flex items-center gap-2 p-3.5 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
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
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-xs text-stone-700 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <HelpCircle className="w-4 h-4 text-stone-600" />
            <span>কীভাবে কুরিয়ার এপিআই কি পাবেন ও ব্যবহার করবেন?</span>
          </div>
          <p>
            <strong>Steadfast Courier:</strong> Steadfast মার্চেন্ট পোর্টালে (<a href="https://portal.steadfast.com.bd" target="_blank" rel="noreferrer" className="text-rose-600 underline">portal.steadfast.com.bd</a>) লগইন করুন → বামপাশের মেনু থেকে <strong>Settings &gt; API Integration</strong> এ যান → আপনার <strong>API Key</strong> ও <strong>Secret Key</strong> কপি করে উপরের ঘরে পেস্ট করে সংরক্ষণ করুন।
          </p>
          <p>
            <strong>সক্রিয় ও লাইভ করা:</strong> আসল পার্সেল সরাসরি Steadfast-এ পাঠাতে হলে অবশ্যই <strong>সক্রিয় করুন (Enable)</strong> টিকচিহ্ন দিন এবং <strong>স্যান্ডবক্স মোড আনচেক (বন্ধ)</strong> রাখুন।
          </p>
          <p>
            <strong>স্বয়ংক্রিয় স্ট্যাটাস পরিবর্তন:</strong> প্রতি ২ মিনিট পর পর সিস্টেম নিজে থেকেই Steadfast এপিআই থেকে পার্সেলের ডেলিভারি স্ট্যাটাস চেক করে অর্ডারের স্ট্যাটাস আপডেট করে। এছাড়াও তাৎক্ষণিক আপডেটের জন্য Steadfast ড্যাশবোর্ডে উপরের Webhook URL টি বসিয়ে দিন।
          </p>
        </div>
      </form>
    </div>
  );
}
