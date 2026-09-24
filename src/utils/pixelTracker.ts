/**
 * Dynamic Pixel Loader for Meta (Facebook) Pixel & TikTok Pixel
 * Loads official tracking libraries into the customer's browser
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    ttq?: any;
    TiktokAnalyticsObject?: string;
  }
}

const initializedPixels = new Set<string>();

export function initFacebookPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') return;
  const cleanId = pixelId.trim();
  if (!cleanId) return;

  if (!window.fbq) {
    const n: any = function (...args: unknown[]) {
      if (n.callMethod) {
        n.callMethod.apply(n, args);
      } else {
        n.queue.push(args);
      }
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    window.fbq = n;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  if (!initializedPixels.has(`fb_${cleanId}`)) {
    try {
      window.fbq('init', cleanId);
      initializedPixels.add(`fb_${cleanId}`);
    } catch {
      // ignore
    }
  }
}

export function initTikTokPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') return;
  const cleanId = pixelId.trim();
  if (!cleanId) return;

  if (!window.ttq) {
    window.TiktokAnalyticsObject = 'ttq';
    const ttq: any = (window.ttq = window.ttq || []);
    ttq.methods = [
      'page',
      'track',
      'identify',
      'instances',
      'debug',
      'on',
      'off',
      'once',
      'ready',
      'alias',
      'group',
      'enableCookie',
      'disableCookie',
      'holdConsent',
      'revokeConsent',
      'grantConsent'
    ];
    ttq.setAndDefer = function (t: any, e: any) {
      t[e] = function (...args: unknown[]) {
        t.push([e].concat(Array.prototype.slice.call(args, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function (t: any) {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(e, ttq.methods[n]);
      }
      return e;
    };
    ttq.load = function (e: any, n: any) {
      const r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = r + '?sdkid=' + e + '&lib=ttq';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    };
  }

  if (!initializedPixels.has(`tt_${cleanId}`)) {
    try {
      if (window.ttq && typeof window.ttq.load === 'function') {
        window.ttq.load(cleanId);
        initializedPixels.add(`tt_${cleanId}`);
      }
    } catch {
      // ignore
    }
  }
}
