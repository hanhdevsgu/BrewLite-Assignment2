import { NextResponse } from 'next/server';
import { buildEndpointUrl, getBackendApiTargets } from '@/lib/backend-urls';

const globalForMbPayments = globalThis as typeof globalThis & {
  __brewlite_mb_payments?: Map<string, { orderCode?: string }>;
};

export async function POST(
  _request: Request,
  context: { params: { orderCode: string } },
) {
  const code = String(context?.params?.orderCode || '').toUpperCase().trim();
  const store = globalForMbPayments.__brewlite_mb_payments;
  if (store && code) {
    store.delete(code);
    store.forEach((val, key) => {
      if (key.includes(code) || (val?.orderCode && val.orderCode.includes(code))) {
        store.delete(key);
      }
    });
  }

  const { configured, localFallbacks } = getBackendApiTargets();
  const baseUrls = configured.length > 0 ? configured : localFallbacks;
  const path = `/payments/mbbank-invalidate/${encodeURIComponent(code)}`;
  for (const baseUrl of baseUrls) {
    try {
      await fetch(buildEndpointUrl(baseUrl, path), {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      // Ignore individual backend timeout; local cache already invalidated
    }
  }

  return NextResponse.json({
    success: true,
    message: `Đã hủy mã thanh toán ${code}`,
  });
}
