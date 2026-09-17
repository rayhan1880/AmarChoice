import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Custom ErrorBoundary compatible with React without requiring @types/react class inheritance
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Application render error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    const state = (this as any).state as State;
    const props = (this as any).props as Props;

    if (state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f4f0] flex items-center justify-center p-6 text-stone-800 font-sans">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-xl border border-stone-200 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              !
            </div>
            <h2 className="text-xl font-bold mb-2 text-stone-900">পেইজ লোড হতে সাময়িক সমস্যা হয়েছে</h2>
            <p className="text-sm text-stone-600 mb-6">
              অনুগ্রহ করে পেইজটি রিফ্রেশ করুন অথবা হোমপেইজে ফিরে যান।
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
              >
                রিলোড করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-sm font-semibold transition"
              >
                হোমপেইজে যান
              </button>
            </div>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
