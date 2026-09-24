import { useState, useEffect, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import {
  MessageSquare,
  Save,
  Check,
  Key,
  Send,
  AlertTriangle,
  Copy,
  ExternalLink,
  Globe,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Sparkles,
  BellOff,
  BellRing
} from 'lucide-react';

export default function SmsSettingsView() {
  const { settings, updateSettings } = useApp();

  const [provider, setProvider] = useState(settings.smsGateway?.provider || 'bulksmsbd');
  const [apiKey, setApiKey] = useState(settings.smsGateway?.apiKey || '');
  const [senderId, setSenderId] = useState(settings.smsGateway?.senderId || '8809617628579');
  const [apiUrl, setApiUrl] = useState(settings.smsGateway?.apiUrl || 'http://bulksmsbd.net/api/smsapi');
  const [isEnabled, setIsEnabled] = useState(settings.smsGateway?.isEnabled ?? true);

  // Granular Event Switches & Manual Controls
  const [manualOnly, setManualOnly] = useState(settings.smsGateway?.manualOnly ?? false);
  const [autoOrderReceived, setAutoOrderReceived] = useState(settings.smsGateway?.autoOrderReceived ?? false);
  const [autoOrderConfirmed, setAutoOrderConfirmed] = useState(settings.smsGateway?.autoOrderConfirmed ?? true);
  const [autoCourierDispatched, setAutoCourierDispatched] = useState(settings.smsGateway?.autoCourierDispatched ?? false);
  const [autoDelivered, setAutoDelivered] = useState(settings.smsGateway?.autoDelivered ?? false);

  const [serverIp, setServerIp] = useState('34.34.254.243');
  const [copiedIp, setCopiedIp] = useState(false);

  useEffect(() => {
    if (settings.smsGateway) {
      setProvider(settings.smsGateway.provider || 'bulksmsbd');
      setApiKey(settings.smsGateway.apiKey || '');
      setSenderId(settings.smsGateway.senderId || '8809617628579');
      setApiUrl(settings.smsGateway.apiUrl || 'http://bulksmsbd.net/api/smsapi');
      setIsEnabled(settings.smsGateway.isEnabled ?? true);
      setManualOnly(settings.smsGateway.manualOnly ?? false);
      setAutoOrderReceived(settings.smsGateway.autoOrderReceived ?? false);
      setAutoOrderConfirmed(settings.smsGateway.autoOrderConfirmed ?? true);
      setAutoCourierDispatched(settings.smsGateway.autoCourierDispatched ?? false);
      setAutoDelivered(settings.smsGateway.autoDelivered ?? false);
    }
  }, [settings.smsGateway]);

  useEffect(() => {
    api.getServerIp().then(res => {
      if (res?.ip) setServerIp(res.ip);
    }).catch(() => {
      // Keep default
    });
  }, []);

  const [tplReceived, setTplReceived] = useState(
    settings.smsGateway?.templates?.orderReceived ||
      'প্রিয় {customer_name}, আপনার অর্ডারটি (#{order_id}) AmarChoice-এ গ্রহণ করা হয়েছে। মোট মূল্য: {total}৳।'
  );
  const [tplConfirmed, setTplConfirmed] = useState(
    settings.smsGateway?.templates?.orderConfirmed ||
      'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} সফলভাবে কনফার্ম করা হয়েছে। শীঘ্রই পার্সেল পাঠানো হবে।'
  );
  const [tplDispatched, setTplDispatched] = useState(
    settings.smsGateway?.templates?.courierDispatched ||
      'প্রিয় {customer_name}, আপনার পার্সেলটি {courier_name} কুরিয়ারে বুক করা হয়েছে। ট্র্যাকিং কোড: {tracking_code}।'
  );
  const [tplDelivered, setTplDelivered] = useState(
    settings.smsGateway?.templates?.delivered ||
      'প্রিয় {customer_name}, আপনার পার্সেলটি সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। AmarChoice এর সাথে থাকার জন্য ধন্যবাদ!'
  );

  // Test SMS State
  const [testPhone, setTestPhone] = useState('01791045497');
  const [testMessage, setTestMessage] = useState('টেস্ট এসএমএস: AmarChoice SMS গেটওয়ে সফলভাবে কাজ করছে!');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(serverIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  const applyPreset = (preset: 'confirmOnly' | 'manualOnly' | 'allAuto') => {
    if (preset === 'confirmOnly') {
      setManualOnly(false);
      setAutoOrderReceived(false);
      setAutoOrderConfirmed(true);
      setAutoCourierDispatched(false);
      setAutoDelivered(false);
    } else if (preset === 'manualOnly') {
      setManualOnly(true);
      setAutoOrderReceived(false);
      setAutoOrderConfirmed(false);
      setAutoCourierDispatched(false);
      setAutoDelivered(false);
    } else if (preset === 'allAuto') {
      setManualOnly(false);
      setAutoOrderReceived(true);
      setAutoOrderConfirmed(true);
      setAutoCourierDispatched(true);
      setAutoDelivered(true);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateSettings({
        smsGateway: {
          provider,
          apiKey: apiKey.trim(),
          senderId: senderId.trim(),
          apiUrl: apiUrl.trim(),
          isEnabled,
          manualOnly,
          autoOrderReceived,
          autoOrderConfirmed,
          autoCourierDispatched,
          autoDelivered,
          templates: {
            orderReceived: tplReceived.trim(),
            orderConfirmed: tplConfirmed.trim(),
            courierDispatched: tplDispatched.trim(),
            delivered: tplDelivered.trim()
          }
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update SMS settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      setTestError('অনুগ্রহ করে একটি মোবাইল নাম্বার দিন');
      return;
    }
    setIsSendingTest(true);
    setTestFeedback(null);
    setTestError(null);

    try {
      const res = await api.sendTestSms(testPhone, testMessage, {
        provider,
        apiKey: apiKey.trim(),
        senderId: senderId.trim(),
        apiUrl: apiUrl.trim(),
        isEnabled
      });

      if (res.serverIp) {
        setServerIp(res.serverIp);
      }

      if (res.success) {
        setTestFeedback(`✅ টেস্ট এসএমএস সফলভাবে পাঠানো হয়েছে! (${testPhone})\nগেটওয়ে রেসপন্স: ${res.gatewayResponse}`);
      } else {
        setTestError(res.error || res.gatewayResponse || 'এসএমএস পাঠাতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setTestError(`সার্ভার এরর: ${err?.message || 'গেটওয়ে কানেকশন ব্যর্থ'}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-rose-600" />
            <span>এসএমএস গেটওয়ে ও সেন্ডার আইডি (SMS Gateway & Sender ID)</span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            গ্রাহকের কাছে অর্ডার রিসিভ, কনফার্মেশন ও কুরিয়ার ট্র্যাকিং কোড সম্বলিত অটোমেটিক এসএমএস পাঠান
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

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>এসএমএস গেটওয়ে সেটিংস সফলভাবে আপডেট হয়েছে!</span>
        </div>
      )}

      {/* BULKSMSBD IP WHITELIST ADVISORY */}
      {provider === 'bulksmsbd' && (
        <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-xs space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>BulkSMSBD-তে এসএমএস আসার জন্য জরুরি আইপি হোয়াইটলিস্ট (IP Whitelist)</span>
            </div>
            <a
              href="https://bulksmsbd.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 underline hover:text-amber-700"
            >
              <span>bulksmsbd.net ওপেন করুন</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-amber-900 leading-relaxed">
            BulkSMSBD সিকিউরিটির জন্য আন-অথরাইজড আইপি থেকে এসএমএস পাঠানো ব্লক করে দেয়। এসএমএস চালু রাখতে আপনার ক্লাউড সার্ভারের আইপিটি BulkSMSBD প্যানেলে যোগ করতে হবে:
          </p>

          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-amber-200">
            <div className="flex items-center gap-1.5 text-stone-600 font-semibold">
              <Globe className="w-4 h-4 text-rose-600" />
              <span>আপনার সার্ভার আইপি (Server IP):</span>
            </div>
            <code className="px-2.5 py-1 bg-amber-100/70 border border-amber-300 text-amber-950 rounded-lg font-mono font-bold text-xs">
              {serverIp}
            </code>
            <button
              type="button"
              onClick={handleCopyIp}
              className="inline-flex items-center gap-1 px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold transition"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedIp ? 'কপি হয়েছে!' : 'আইপি কপি করুন'}</span>
            </button>
          </div>

          <div className="text-[11px] text-amber-900 space-y-1 pl-1">
            <p><strong>কীভাবে করবেন:</strong></p>
            <ol className="list-decimal pl-4 space-y-0.5 text-stone-700">
              <li><strong>bulksmsbd.net</strong> এ লগইন করুন।</li>
              <li>বাম পাশের মেনু থেকে <strong>Developer Settings</strong> অথবা <strong>Phonebook / IP Whitelist</strong> এ যান।</li>
              <li><strong>IP Whitelist</strong> বক্সে কপি করা আইপিটি (<code className="bg-amber-100 px-1 rounded">{serverIp}</code>) পেস্ট করে Save দিন, অথবা IP Whitelisting বন্ধ (Allow All) করুন।</li>
              <li>এরপর নিচের <strong>টেস্ট এসএমএস পাঠান</strong> বাটনে ক্লিক করে সরাসরি টেস্ট করুন।</li>
            </ol>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* GATEWAY CREDENTIALS */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
              গেটওয়ে ও সেন্ডার আইডি ক্রেডেনশিয়াল
            </h3>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={e => setIsEnabled(e.target.checked)}
                className="rounded text-rose-600 w-4 h-4"
              />
              <span>অটো এসএমএস সক্রিয় করুন</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Provider */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">এসএমএস প্রোভাইডার:</label>
              <select
                value={provider}
                onChange={e => {
                  const p = e.target.value as typeof provider;
                  setProvider(p);
                  if (p === 'greenweb') setApiUrl('https://api.greenweb.com.bd/api.php');
                  if (p === 'bulksmsbd') setApiUrl('http://bulksmsbd.net/api/smsapi');
                  if (p === 'mimsms') setApiUrl('https://mimsms.com.bd/smsapi');
                }}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-medium"
              >
                <option value="bulksmsbd">BulkSMSBD</option>
                <option value="greenweb">Greenweb BD</option>
                <option value="mimsms">MimSMS</option>
                <option value="custom_api">অন্যান্য / Custom HTTP API</option>
              </select>
            </div>

            {/* Sender ID */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                সেন্ডার আইডি (Sender ID / Masking) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={senderId}
                onChange={e => setSenderId(e.target.value)}
                placeholder="যেমন: 88096... বা AmarChoice"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-bold text-stone-800"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                API Key / Auth Token <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="আপনার SMS API কী দিন"
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-[11px]"
                />
              </div>
            </div>

            {/* API URL */}
            <div className="sm:col-span-3">
              <label className="block font-bold text-stone-700 mb-1">API Endpoint URL:</label>
              <input
                type="url"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* SMS AUTOMATION & EVENT CONTROLS */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
            <div>
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide flex items-center gap-2">
                <Sliders className="w-4 h-4 text-rose-600" />
                <span>এসএমএস অটোমেশন ও ইভেন্ট কন্ট্রোল (SMS Automation & Event Controls)</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                কোন কোন ধাপে স্বয়ংক্রিয় এসএমএস পাঠানো হবে এবং কোনগুলো বন্ধ থাকবে তা নির্ধারণ করুন
              </p>
            </div>

            {/* Manual Master Toggle */}
            <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              <input
                type="checkbox"
                id="manualOnlySwitch"
                checked={manualOnly}
                onChange={e => setManualOnly(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded cursor-pointer"
              />
              <label htmlFor="manualOnlySwitch" className="text-xs font-bold text-stone-800 cursor-pointer select-none">
                🖐️ সম্পূর্ণ ম্যানুয়াল মোড (সব অটো এসএমএস বন্ধ)
              </label>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="bg-gradient-to-r from-rose-50/70 via-stone-50 to-amber-50/50 p-3.5 rounded-xl border border-rose-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>এক ক্লিকে মোড সেট করুন (Quick Presets):</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset('confirmOnly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  !manualOnly && !autoOrderReceived && autoOrderConfirmed && !autoCourierDispatched && !autoDelivered
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>🎯 শুধুমাত্র কনফার্মেশন মোড (রিকমেন্ডেড)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('manualOnly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  manualOnly
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <BellOff className="w-3.5 h-3.5" />
                <span>🖐️ ম্যানুয়াল অনলি (সব অটো বন্ধ, অ্যাডমিন বাটন দিয়ে পাঠাবেন)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('allAuto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  !manualOnly && autoOrderReceived && autoOrderConfirmed && autoCourierDispatched && autoDelivered
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>⚡ সম্পূর্ণ অটোমেটিক (সব ইভেন্ট চালু)</span>
              </button>
            </div>
          </div>

          {/* If manual mode is ON, show clear info */}
          {manualOnly ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1 text-amber-950">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <BellOff className="w-4 h-4 text-amber-600" />
                <span>ম্যানুয়াল মোড সক্রিয় আছে (সব স্বয়ংক্রিয় এসএমএস বন্ধ)</span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                কোনো অবস্থাতেই স্বয়ংক্রিয়ভাবে কাস্টমারকে এসএমএস যাবে না। আপনি অর্ডার ভিউ বা অর্ডার ডিটেইলস থেকে প্রয়োজনমতো <strong>&ldquo;💬 কনফার্ম SMS&rdquo;</strong> বাটনে ক্লিক করে নির্দিষ্ট কাস্টমারকে কনফার্মেশন এসএমএস পাঠাতে পারবেন।
              </p>
            </div>
          ) : (
            /* Granular 4 Event Toggle Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {/* Event 1: Order Received */}
              <div className={`p-4 rounded-xl border transition-all ${
                autoOrderReceived
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-stone-50 border-stone-200 opacity-80'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <label htmlFor="toggleOrderReceived" className="font-bold text-stone-900 block cursor-pointer">
                      ১. নতুন অর্ডার প্লেস অটো এসএমএস (Order Received)
                    </label>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      গ্রাহক ওয়েবসাইটে নতুন অর্ডার সাবমিট করার সাথে সাথেই তাৎক্ষণিক রিসিভ এসএমএস পাঠাবে। ভুয়া/ফেক অর্ডারে এসএমএস ব্যালেন্স বাঁচাতে এটি বন্ধ রাখতে পারেন।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="toggleOrderReceived"
                    checked={autoOrderReceived}
                    onChange={e => setAutoOrderReceived(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer shrink-0 mt-0.5"
                  />
                </div>
                <div className="mt-2 text-[10px] font-bold">
                  {autoOrderReceived ? (
                    <span className="text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">চালু আছে ✓</span>
                  ) : (
                    <span className="text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded">বন্ধ আছে (সুপারিশকৃত) ✕</span>
                  )}
                </div>
              </div>

              {/* Event 2: Order Confirmed */}
              <div className={`p-4 rounded-xl border transition-all ${
                autoOrderConfirmed
                  ? 'bg-emerald-50/50 border-emerald-300'
                  : 'bg-stone-50 border-stone-200 opacity-80'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <label htmlFor="toggleOrderConfirmed" className="font-bold text-stone-900 block cursor-pointer">
                      ২. অর্ডার কনফার্মেশন অটো এসএমএস (Order Confirmed)
                    </label>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      অ্যাডমিন প্যানেল থেকে অর্ডারের স্ট্যাটাস &ldquo;Confirmed&rdquo; করার সাথে সাথে স্বয়ংক্রিয়ভাবে কাস্টমারকে কনফার্মেশন এসএমএস পাঠাবে।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="toggleOrderConfirmed"
                    checked={autoOrderConfirmed}
                    onChange={e => setAutoOrderConfirmed(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer shrink-0 mt-0.5"
                  />
                </div>
                <div className="mt-2 text-[10px] font-bold">
                  {autoOrderConfirmed ? (
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">চালু আছে ✓ (সুপারিশকৃত)</span>
                  ) : (
                    <span className="text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded">বন্ধ আছে ✕</span>
                  )}
                </div>
              </div>

              {/* Event 3: Courier Dispatched */}
              <div className={`p-4 rounded-xl border transition-all ${
                autoCourierDispatched
                  ? 'bg-blue-50/50 border-blue-300'
                  : 'bg-stone-50 border-stone-200 opacity-80'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <label htmlFor="toggleCourierDispatched" className="font-bold text-stone-900 block cursor-pointer">
                      ৩. কুরিয়ার ট্র্যাকিং কোড অটো এসএমএস (Courier Dispatched)
                    </label>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Steadfast বা Pathao কুরিয়ারে বুকিং দেওয়ার সাথে সাথে কনসাইনমেন্ট ও ট্র্যাকিং কোডসহ কাস্টমারকে এসএমএস পাঠাবে।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="toggleCourierDispatched"
                    checked={autoCourierDispatched}
                    onChange={e => setAutoCourierDispatched(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0 mt-0.5"
                  />
                </div>
                <div className="mt-2 text-[10px] font-bold">
                  {autoCourierDispatched ? (
                    <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded">চালু আছে ✓</span>
                  ) : (
                    <span className="text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded">বন্ধ আছে ✕</span>
                  )}
                </div>
              </div>

              {/* Event 4: Delivered */}
              <div className={`p-4 rounded-xl border transition-all ${
                autoDelivered
                  ? 'bg-purple-50/50 border-purple-300'
                  : 'bg-stone-50 border-stone-200 opacity-80'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <label htmlFor="toggleDelivered" className="font-bold text-stone-900 block cursor-pointer">
                      ৪. ডেলিভারি সম্পন্ন অটো এসএমএস (Order Delivered)
                    </label>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      পার্সেল সফলভাবে ডেলিভারি সম্পন্ন হলে কাস্টমারকে ধন্যবাদ জানিয়ে স্বয়ংক্রিয় এসএমএস পাঠাবে।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="toggleDelivered"
                    checked={autoDelivered}
                    onChange={e => setAutoDelivered(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer shrink-0 mt-0.5"
                  />
                </div>
                <div className="mt-2 text-[10px] font-bold">
                  {autoDelivered ? (
                    <span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded">চালু আছে ✓</span>
                  ) : (
                    <span className="text-stone-500 bg-stone-200/80 px-2 py-0.5 rounded">বন্ধ আছে ✕</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SMS TEMPLATES */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wide">
              স্বয়ংক্রিয় এসএমএস মেসেজ টেমপ্লেট
            </h3>
            <div className="text-[11px] text-stone-500">
              ট্যাগসমূহ: <code className="bg-stone-100 px-1 py-0.5 rounded text-rose-600">{"{customer_name}"}</code>,{' '}
              <code className="bg-stone-100 px-1 py-0.5 rounded text-rose-600">{"{order_id}"}</code>,{' '}
              <code className="bg-stone-100 px-1 py-0.5 rounded text-rose-600">{"{total}"}</code>,{' '}
              <code className="bg-stone-100 px-1 py-0.5 rounded text-rose-600">{"{tracking_code}"}</code>,{' '}
              <code className="bg-stone-100 px-1 py-0.5 rounded text-rose-600">{"{courier_name}"}</code>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Template 1: Order Received */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">১. অর্ডার গ্রহণ টেমপ্লেট (Order Received):</label>
              <textarea
                rows={3}
                value={tplReceived}
                onChange={e => setTplReceived(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white resize-none leading-relaxed"
              ></textarea>
              <span className="text-[10px] text-stone-400">গ্রাহক অর্ডার ফর্ম সাবমিট করার সাথে সাথেই পাঠানো হবে।</span>
            </div>

            {/* Template 2: Order Confirmed */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">২. অর্ডার কনফার্মেশন টেমপ্লেট (Order Confirmed):</label>
              <textarea
                rows={3}
                value={tplConfirmed}
                onChange={e => setTplConfirmed(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white resize-none leading-relaxed"
              ></textarea>
              <span className="text-[10px] text-stone-400">অর্ডার স্ট্যাটাস কনফার্ম করার সময় গ্রাহককে যাবে।</span>
            </div>

            {/* Template 3: Courier Dispatched */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">৩. কুরিয়ার ট্র্যাকিং টেমপ্লেট (Courier Dispatched):</label>
              <textarea
                rows={3}
                value={tplDispatched}
                onChange={e => setTplDispatched(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white resize-none leading-relaxed"
              ></textarea>
              <span className="text-[10px] text-stone-400">Steadfast বা Pathao এন্ট্রি দেওয়ার সাথে সাথে ট্র্যাকিং কোডসহ যাবে।</span>
            </div>

            {/* Template 4: Delivered */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">৪. ডেলিভারি সম্পন্ন টেমপ্লেট (Delivered):</label>
              <textarea
                rows={3}
                value={tplDelivered}
                onChange={e => setTplDelivered(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl bg-stone-50 focus:bg-white resize-none leading-relaxed"
              ></textarea>
              <span className="text-[10px] text-stone-400">পার্সেল সফলভাবে ডেলিভারি হওয়ার পর ধন্যবাদ এসএমএস।</span>
            </div>
          </div>
        </div>

        {/* TEST SMS SENDER */}
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <Send className="w-4 h-4 text-rose-600" />
            <span>লাইভ টেস্ট এসএমএস পাঠান (Real SMS Gateway Test)</span>
          </div>
          <p className="text-stone-500">
            আপনার প্রবেশ করানো ক্রেডেনশিয়াল ও সেন্ডার আইডি দিয়ে সরাসরি আপনার মোবাইলে একটি টেস্ট এসএমএস পাঠিয়ে যাচাই করুন:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">টেস্ট মোবাইল নাম্বার:</label>
              <input
                type="tel"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="যেমন: 01791045497"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">টেস্ট মেসেজ:</label>
              <input
                type="text"
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white"
              />
            </div>
          </div>

          {/* SUCCESS FEEDBACK */}
          {testFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <Check className="w-4 h-4" />
                <span>এসএমএস সফলভাবে ডেলিভারি হয়েছে!</span>
              </div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-emerald-900">{testFeedback}</pre>
            </div>
          )}

          {/* ERROR FEEDBACK */}
          {testError && (
            <div className="p-4 bg-rose-50 border border-rose-300 text-rose-950 rounded-xl space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                <span>এসএমএস পাঠানো যায়নি! গেটওয়ে এরর মেসেজ:</span>
              </div>
              <p className="text-xs font-semibold text-rose-900">{testError}</p>

              {(testError.toLowerCase().includes('whitelisted') || testError.toLowerCase().includes('whitelist') || testError.includes('আইপি')) && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-rose-200 text-stone-800 space-y-2">
                  <div className="font-bold text-xs text-rose-700">
                    💡 দ্রুত সমাধান (BulkSMSBD IP Whitelist):
                  </div>
                  <p className="text-[11px] text-stone-600">
                    BulkSMSBD আপনার সার্ভার আইপি (<code className="bg-stone-100 px-1 font-bold">{serverIp}</code>) ব্লক করেছে।
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyIp}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedIp ? 'আইপি কপি হয়েছে!' : `আইপি কপি করুন (${serverIp})`}</span>
                    </button>
                    <a
                      href="https://bulksmsbd.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-bold text-xs border border-stone-300"
                    >
                      <span>BulkSMSBD ওপেন করুন</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={isSendingTest}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl font-bold shadow disabled:opacity-50 transition"
            >
              <Send className="w-3.5 h-3.5 text-rose-400" />
              <span>{isSendingTest ? 'এসএমএস পাঠানো হচ্ছে...' : 'টেস্ট এসএমএস পাঠান'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
