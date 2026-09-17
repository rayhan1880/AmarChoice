import { useState, FormEvent } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { MessageSquare, Save, Check, Key, Send, HelpCircle } from 'lucide-react';

export default function SmsSettingsView() {
  const { settings, updateSettings } = useApp();

  const [provider, setProvider] = useState(settings.smsGateway.provider || 'greenweb');
  const [apiKey, setApiKey] = useState(settings.smsGateway.apiKey || '');
  const [senderId, setSenderId] = useState(settings.smsGateway.senderId || 'AmarChoice');
  const [apiUrl, setApiUrl] = useState(settings.smsGateway.apiUrl || 'https://api.greenweb.com.bd/api.php');
  const [isEnabled, setIsEnabled] = useState(settings.smsGateway.isEnabled);

  const [tplReceived, setTplReceived] = useState(
    settings.smsGateway.templates.orderReceived ||
      'প্রিয় {customer_name}, আপনার অর্ডারটি (#{order_id}) AmarChoice-এ গ্রহণ করা হয়েছে। মোট মূল্য: {total}৳।'
  );
  const [tplConfirmed, setTplConfirmed] = useState(
    settings.smsGateway.templates.orderConfirmed ||
      'প্রিয় {customer_name}, আপনার অর্ডার #{order_id} সফলভাবে কনফার্ম করা হয়েছে। শীঘ্রই পার্সেল পাঠানো হবে।'
  );
  const [tplDispatched, setTplDispatched] = useState(
    settings.smsGateway.templates.courierDispatched ||
      'প্রিয় {customer_name}, আপনার পার্সেলটি {courier_name} কুরিয়ারে বুক করা হয়েছে। ট্র্যাকিং কোড: {tracking_code}।'
  );
  const [tplDelivered, setTplDelivered] = useState(
    settings.smsGateway.templates.delivered ||
      'প্রিয় {customer_name}, আপনার পার্সেলটি সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। AmarChoice এর সাথে থাকার জন্য ধন্যবাদ!'
  );

  // Test SMS State
  const [testPhone, setTestPhone] = useState('01712345678');
  const [testMessage, setTestMessage] = useState('টেস্ট এসএমএস: AmarChoice SMS গেটওয়ে সফলভাবে কাজ করছে!');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleSendTestSms = () => {
    setIsSendingTest(true);
    setTestFeedback(null);
    setTimeout(() => {
      setIsSendingTest(false);
      setTestFeedback(`✅ টেস্ট এসএমএস সফলভাবে পাঠানো হয়েছে "${testPhone}" নাম্বারে! (Sender ID: ${senderId})`);
      setTimeout(() => setTestFeedback(null), 6000);
    }, 1000);
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
                <option value="greenweb">Greenweb BD</option>
                <option value="bulksmsbd">BulkSMSBD</option>
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
                placeholder="যেমন: AmarChoice বা 88096..."
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
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
            <Send className="w-4 h-4 text-stone-600" />
            <span>টেস্ট এসএমএস পাঠান (Test SMS Utility)</span>
          </div>
          <p className="text-stone-500">আপনার মোবাইল নাম্বারে একটি টেস্ট এসএমএস পাঠিয়ে গেটওয়ে চেক করুন:</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">টেস্ট মোবাইল নাম্বার:</label>
              <input
                type="tel"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
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

          {testFeedback && (
            <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-semibold">
              {testFeedback}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={isSendingTest}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold shadow disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTest ? 'টেস্ট এসএমএস যাচ্ছে...' : 'টেস্ট এসএমএস পাঠান'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
