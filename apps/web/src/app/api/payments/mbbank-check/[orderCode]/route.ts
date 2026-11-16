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

async function queryBackendCheck(
  baseUrls: string[],
  code: string,
  expectedAmount: number | null,
  timeoutMs: number,
): Promise<{ paid: boolean; payment?: MbPaymentRecord } | null> {
  const qs = expectedAmount && expectedAmount > 0 ? `?expectedAmount=${expectedAmount}` : '';
  const path = `/payments/mbbank-check/${encodeURIComponent(code)}${qs}`;
  for (const baseUrl of baseUrls) {
    try {
      const res = await fetch(buildEndpointUrl(baseUrl, path), {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json?.data || json;
        if (payload && payload.paid) {
          return payload;
        }
      }
    } catch {
      // Try next candidate backend
    }
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderCode: string }> },
) {
  const { orderCode } = await params;
  const code = String(orderCode || '').toUpperCase().trim();
  const url = new URL(request.url);
  const rawExpected = url.searchParams.get('expectedAmount');
  const expectedAmount = rawExpected && Number.isFinite(Number(rawExpected)) ? Number(rawExpected) : null;

  const { configured, localFallbacks } = getBackendApiTargets();
  const remoteMatch = await queryBackendCheck(configured, code, expectedAmount, 4500);
  if (remoteMatch) {
    return NextResponse.json({ success: true, data: remoteMatch });
  }

  if (configured.length === 0) {
    const localMatch = await queryBackendCheck(localFallbacks, code, expectedAmount, 1000);
    if (localMatch) {
      return NextResponse.json({ success: true, data: localMatch });
    }
  }

  const localPayments = globalForMbPayments.__brewlite_mb_payments;
  if (localPayments && code.length >= 4) {
    let payment = localPayments.get(code);
    if (!payment) {
      const expectedMemo = `BREWLITE ${code}`;
      localPayments.forEach((val, key) => {
        if (!payment && key !== 'LATEST_TX') {
          const txContent = String(val?.content || '').toUpperCase().trim().replace(/\s+/g, ' ');
          const txOrderCode = String(val?.orderCode || '').toUpperCase().trim();
          if (txContent === expectedMemo || (txOrderCode === code && txContent === expectedMemo)) {
            payment = val;
          }
        }
      });
    }

    if (payment && Date.now() - payment.time < 300000) {
      if (expectedAmount && expectedAmount > 0 && Number(payment.amount) < expectedAmount) {
        return NextResponse.json({
          success: true,
          data: { paid: false, reason: 'UNDERPAID', receivedAmount: payment.amount, expectedAmount },
        });
      }
      return NextResponse.json({
        success: true,
        data: { paid: true, payment },
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { paid: false },
  });
}
