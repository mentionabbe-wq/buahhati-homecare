import 'server-only';

export type SendResult = {
  ok: boolean;
  providerRef?: string;
  error?: string;
};

export interface WhatsAppProvider {
  name: string;
  send(to: string, message: string): Promise<SendResult>;
}

/**
 * Provider default. Tidak memanggil API apa pun sehingga aplikasi tetap
 * berjalan penuh tanpa kredensial pihak ketiga — pesan tetap tersimpan di
 * tabel Notification dan bisa dilihat/dikirim manual dari dashboard admin.
 */
const mockProvider: WhatsAppProvider = {
  name: 'mock',
  async send(to, message) {
    console.info(`[whatsapp:mock] -> ${to}\n${message}\n`);
    return { ok: true, providerRef: `mock-${Date.now()}` };
  },
};

/** Fonnte (https://fonnte.com) — API key dikirim lewat header Authorization. */
const fonnteProvider: WhatsAppProvider = {
  name: 'fonnte',
  async send(to, message) {
    const url = process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send';
    const token = process.env.WHATSAPP_API_KEY;
    if (!token) return { ok: false, error: 'WHATSAPP_API_KEY belum diset' };
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: to, message }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body?.reason || `HTTP ${res.status}` };
    return { ok: true, providerRef: String(body?.id ?? body?.detail ?? '') };
  },
};

/** Wablas (https://wablas.com). */
const wablasProvider: WhatsAppProvider = {
  name: 'wablas',
  async send(to, message) {
    const url = process.env.WHATSAPP_API_URL || 'https://console.wablas.com/api/send-message';
    const token = process.env.WHATSAPP_API_KEY;
    if (!token) return { ok: false, error: 'WHATSAPP_API_KEY belum diset' };
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: to, message }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.status === false) {
      return { ok: false, error: body?.message || `HTTP ${res.status}` };
    }
    return { ok: true, providerRef: String(body?.data?.messages?.[0]?.id ?? '') };
  },
};

/** WhatsApp Cloud API resmi (Meta). */
const metaProvider: WhatsAppProvider = {
  name: 'meta',
  async send(to, message) {
    const phoneId = process.env.WHATSAPP_SENDER;
    const token = process.env.WHATSAPP_API_KEY;
    if (!phoneId || !token) return { ok: false, error: 'WHATSAPP_SENDER/API_KEY belum diset' };
    const url =
      process.env.WHATSAPP_API_URL || `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body?.error?.message || `HTTP ${res.status}` };
    return { ok: true, providerRef: String(body?.messages?.[0]?.id ?? '') };
  },
};

const REGISTRY: Record<string, WhatsAppProvider> = {
  mock: mockProvider,
  fonnte: fonnteProvider,
  wablas: wablasProvider,
  meta: metaProvider,
};

export function getWhatsAppProvider(name?: string): WhatsAppProvider {
  const key = (name || process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase();
  return REGISTRY[key] ?? mockProvider;
}

export const AVAILABLE_WA_PROVIDERS = Object.keys(REGISTRY);
