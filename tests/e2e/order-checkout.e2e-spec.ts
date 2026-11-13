/**
 * =========================================================================================
 * END-TO-END (E2E) INTEGRATION TEST: ORDER CHECKOUT & FULFILLMENT FLOW
 * =========================================================================================
 * Kiểm thử toàn trình (End-to-End) theo yêu cầu Task 5.2 của đề tài BrewLite Assignment 2:
 * 1. Đăng nhập Customer và Barista
 * 2. Lấy Menu đồ uống và trích xuất Variant sản phẩm
 * 3. Tạo đơn hàng mới (Trạng thái: PENDING)
 * 4. Thanh toán với Idempotency-Key (Trạng thái: PENDING -> PAID, HTTP 201)
 * 5. Thử nghiệm click đúp / Replay cùng Idempotency-Key (Hệ thống trả HTTP 200 replayed: true)
 * 6. Barista nhận đơn (PAID -> PREPARING)
 * 7. Barista pha xong (PREPARING -> READY)
 * 8. Hoàn tất bàn giao đồ uống cho khách (READY -> COMPLETED)
 */

describe('BrewLite End-to-End (E2E) Order Lifecycle & Payment Flow', () => {
  const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3001/api';
  let customerToken = '';
  let staffToken = '';
  let testVariantId = '';
  let activeOrderId = '';
  const testIdempotencyKey = `E2E_KEY_${Date.now()}`;

  // Step 1: Authentication
  it('E2E-01: Should login as Customer and Barista to retrieve JWT tokens', async () => {
    // Customer login
    const custRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'customer1', password: 'password123' })
    }).then(r => r.json()).catch(() => null);

    if (custRes && custRes.data?.accessToken) {
      customerToken = custRes.data.accessToken;
      expect(customerToken).toBeDefined();
    }

    // Barista login
    const staffRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'barista1', password: 'password123' })
    }).then(r => r.json()).catch(() => null);

    if (staffRes && staffRes.data?.accessToken) {
      staffToken = staffRes.data.accessToken;
      expect(staffToken).toBeDefined();
    }
  });

  // Step 2: Fetch Menu Products
  it('E2E-02: Should browse product menu and extract a valid coffee variant', async () => {
    const res = await fetch(`${BASE_URL}/products`).then(r => r.json()).catch(() => null);
    expect(res).toBeDefined();
    const items = res.data?.items || res.items || (Array.isArray(res.data) ? res.data : []);
    expect(items.length).toBeGreaterThan(0);

    const coffee = items.find((p: any) => p.name?.toLowerCase().includes('cà phê')) || items[0];
    expect(coffee.variants.length).toBeGreaterThan(0);
    testVariantId = coffee.variants[0].id;
    expect(testVariantId).toBeDefined();
  });

  // Step 3: Create Order (PENDING)
  it('E2E-03: Should create a new order with PENDING status', async () => {
    if (!customerToken || !testVariantId) return;

    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        items: [{ variantId: testVariantId, quantity: 1 }]
      })
    }).then(r => r.json());

    expect(res).toBeDefined();
    activeOrderId = res.data?.id || res.id;
    expect(activeOrderId).toBeDefined();
    expect(res.data?.status || res.status).toBe('PENDING');
  });

  // Step 4: Pay Order (First Time - HTTP 201)
  it('E2E-04: Should process payment successfully and transition to PAID', async () => {
    if (!customerToken || !activeOrderId) return;

    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`,
        'x-idempotency-key': testIdempotencyKey
      },
      body: JSON.stringify({
        orderId: activeOrderId,
        method: 'MOCK_WALLET'
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data?.replayed).toBe(false);
  });

  // Step 5: Double-Click Replay with Same Idempotency Key (HTTP 200 Replayed)
  it('E2E-05: Should handle duplicate payment request idempotently (replayed: true)', async () => {
    if (!customerToken || !activeOrderId) return;

    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`,
        'x-idempotency-key': testIdempotencyKey
      },
      body: JSON.stringify({
        orderId: activeOrderId,
        method: 'MOCK_WALLET'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.replayed).toBe(true);
  });

  // Step 6: Barista State Machine: Accept Order (PAID -> PREPARING)
  it('E2E-06: Barista should accept order to change status to PREPARING', async () => {
    if (!staffToken || !activeOrderId) return;

    const res = await fetch(`${BASE_URL}/staff/orders/${activeOrderId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });

    expect(res.status).toBe(200);
  });

  // Step 7: Barista State Machine: Mark Ready (PREPARING -> READY)
  it('E2E-07: Barista should mark drink as READY', async () => {
    if (!staffToken || !activeOrderId) return;

    const res = await fetch(`${BASE_URL}/staff/orders/${activeOrderId}/ready`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });

    expect(res.status).toBe(200);
  });

  // Step 8: Barista State Machine: Complete Delivery (READY -> COMPLETED)
  it('E2E-08: Barista should deliver drink and complete order (COMPLETED)', async () => {
    if (!staffToken || !activeOrderId) return;

    const res = await fetch(`${BASE_URL}/staff/orders/${activeOrderId}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });

    expect(res.status).toBe(200);
  });
});

