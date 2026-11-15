import { NextResponse } from 'next/server';
import { buildEndpointUrl, getBackendApiTargets } from '@/lib/backend-urls';

interface MbPaymentRecord {
  orderCode: string;
  amount: number;
  content: string;
  sender: string;
  senderName: string;
  transId: string;
  time: number;
}

const globalForMbPayments = globalThis as typeof globalThis & {
  __brewlite_mb_payments?: Map<string, MbPaymentRecord>;
};

if (!globalForMbPayments.__brewlite_mb_payments) {
  globalForMbPayments.__brewlite_mb_payments = new Map();
}
const localPayments = globalForMbPayments.__brewlite_mb_payments;

async function forwardSyncToTargets(
  baseUrls: string[],
  rawPayload: string,
  timeoutMs: number,
): Promise<boolean> {
  if (baseUrls.length === 0) return false;
  const results = await Promise.allSettled(
    baseUrls.map(async (baseUrl) => {
      const response = await fetch(buildEndpointUrl(baseUrl, '/payments/mbbank-sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawPayload,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return true;
    }),
  );
  return results.some((r) => r.status === 'fulfilled');
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const content = String(data?.content || '').toUpperCase().trim().replace(/\s+/g, ' ');
    const rawCode = String(data?.invoice_code || '').toUpperCase().trim();

    let orderCode = '';
    const matchExact = content.match(/^BREWLITE\s+(BL\d{6}|ORD-[A-Z0-9]+)$/i);
    if (matchExact) {
      orderCode = matchExact[1].toUpperCase();
    } else if (rawCode && content === `BREWLITE ${rawCode}`) {
      orderCode = rawCode;
    }

    const paymentRecord: MbPaymentRecord = {
      orderCode,
      amount: Number(data?.amount) || 0,
      content: data?.content || '',
      sender: String(data?.sender || '0589822346'),
      senderName: String(data?.sender_name || data?.senderName || 'NGUYEN HOANG ANH'),
      transId: String(data?.trans_id || data?.transId || `FT${Date.now()}`),
      time: Date.now(),
    };

    if (orderCode) localPayments.set(orderCode, paymentRecord);
    if (rawCode && rawCode !== orderCode) localPayments.set(rawCode, paymentRecord);
    if (content) localPayments.set(content, paymentRecord);
    localPayments.set('LATEST_TX', paymentRecord);

    const serializedPayload = JSON.stringify(data);
    const { configured, localFallbacks } = getBackendApiTargets();
    const forwardedToConfigured = await forwardSyncToTargets(configured, serializedPayload, 6000);
    if (!forwardedToConfigured) {
      await forwardSyncToTargets(localFallbacks, serializedPayload, 1200);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã nhận biến động số dư chuyển khoản MBBank (Next.js Route)',
      payment: paymentRecord,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi xử lý webhook';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
