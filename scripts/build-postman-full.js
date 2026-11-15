const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');

const fullCollectionPath = path.join(docsDir, 'BrewLite_Full_API_Collection.postman_collection.json');
const localEnvPath = path.join(docsDir, 'BrewLite_Environment.postman_environment.json');
const prodEnvPath = path.join(docsDir, 'BrewLite_Production_Environment.postman_environment.json');

function makeEvent(listen, lines) {
  return {
    listen,
    script: {
      type: 'text/javascript',
      exec: lines,
    },
  };
}

function makeReq({ name, method, url, headers = [], body, prerequest, test }) {
  const events = [];
  if (prerequest && prerequest.length > 0) events.push(makeEvent('prerequest', prerequest));
  if (test && test.length > 0) events.push(makeEvent('test', test));

  const request = {
    method,
    header: headers,
    url,
  };

  if (body !== undefined) {
    request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  return {
    name,
    ...(events.length > 0 ? { event: events } : {}),
    request,
  };
}

const syncVar = (key, expr) => [
  `pm.environment.set(${JSON.stringify(key)}, ${expr});`,
  `pm.collectionVariables.set(${JSON.stringify(key)}, ${expr});`,
];

const jsonHeaders = [{ key: 'Content-Type', value: 'application/json' }];
const authHeaders = (tokenVar, withJson = false) => [
  { key: 'Authorization', value: `Bearer {{${tokenVar}}}` },
  ...(withJson ? [{ key: 'Content-Type', value: 'application/json' }] : []),
];

// ---------------------------------------------------------------------------
// Folder 0: Root, Health Check & Authentication (A-Z + Negative)
// ---------------------------------------------------------------------------
const folder0 = {
  name: '0. Khởi tạo, Health Check & Authentication (A-Z)',
  item: [
    makeReq({
      name: '0.1 [Root] Kiểm tra GET / (tránh lỗi 404 gốc)',
      method: 'GET',
      url: '{{serverRoot}}/',
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("GET / trả HTTP 200 OK và kết nối PostgreSQL", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(payload.status).to.eql("ok");',
        '    pm.expect(payload.database).to.eql("connected");',
        '});',
      ],
    }),
    makeReq({
      name: '0.2 [Root] Kiểm tra GET /api (API Prefix Root)',
      method: 'GET',
      url: '{{baseUrl}}',
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("GET /api trả HTTP 200 OK", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(payload.status).to.eql("ok");',
        '});',
      ],
    }),
    makeReq({
      name: '0.3 [Health] Kiểm tra GET /health',
      method: 'GET',
      url: '{{serverRoot}}/health',
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("GET /health trả HTTP 200 OK", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(payload.status).to.eql("ok");',
        '});',
      ],
    }),
    makeReq({
      name: '0.4 [Health] Kiểm tra GET /api/health',
      method: 'GET',
      url: '{{baseUrl}}/health',
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("GET /api/health trả HTTP 200 OK và DB connected", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(payload.status).to.eql("ok");',
        '    pm.expect(payload.database).to.eql("connected");',
        '});',
      ],
    }),
    makeReq({
      name: '0.5 [Negative] Route không tồn tại trả 404 Not Found',
      method: 'GET',
      url: '{{baseUrl}}/non-existent-endpoint-check',
      test: [
        'pm.test("Route sai trả HTTP 404 Not Found", () => {',
        '    pm.response.to.have.status(404);',
        '});',
      ],
    }),
    makeReq({
      name: '0.6 [Negative] Đăng nhập DTO rỗng -> 400 Bad Request',
      method: 'POST',
      url: '{{baseUrl}}/auth/login',
      headers: jsonHeaders,
      body: { username: '', password: '' },
      test: [
        'pm.test("Chặn DTO rỗng với HTTP 400 Bad Request", () => {',
        '    pm.response.to.have.status(400);',
        '});',
      ],
    }),
    makeReq({
      name: '0.7 [Negative] Đăng nhập sai mật khẩu -> 401 Unauthorized',
      method: 'POST',
      url: '{{baseUrl}}/auth/login',
      headers: jsonHeaders,
      body: { username: 'customer1', password: 'wrong_password_123' },
      test: [
        'pm.test("Sai mật khẩu trả HTTP 401 Unauthorized", () => {',
        '    pm.response.to.have.status(401);',
        '});',
      ],
    }),
    makeReq({
      name: '0.8 Đăng nhập Customer (customer1) -> Lưu Token',
      method: 'POST',
      url: '{{baseUrl}}/auth/login',
      headers: jsonHeaders,
      body: { username: 'customer1', password: '123456' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'const token = payload.accessToken;',
        'const refresh = payload.refreshToken;',
        ...syncVar('customerToken', 'token'),
        ...syncVar('customerRefreshToken', 'refresh'),
        'pm.test("Đăng nhập Customer thành công (HTTP 200, role=CUSTOMER)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(token).to.be.a("string").and.not.be.empty;',
        '    pm.expect(payload.user.role).to.eql("CUSTOMER");',
        '});',
      ],
    }),
    makeReq({
      name: '0.9 Đăng nhập Barista (barista1) -> Lưu staffToken',
      method: 'POST',
      url: '{{baseUrl}}/auth/login',
      headers: jsonHeaders,
      body: { username: 'barista1', password: '123456' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'const token = payload.accessToken;',
        ...syncVar('staffToken', 'token'),
        'pm.test("Đăng nhập Barista thành công (HTTP 200, role=STAFF)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(token).to.be.a("string").and.not.be.empty;',
        '    pm.expect(payload.user.role).to.eql("STAFF");',
        '});',
      ],
    }),
    makeReq({
      name: '0.10 Đăng nhập Admin (admin) -> Lưu adminToken',
      method: 'POST',
      url: '{{baseUrl}}/auth/login',
      headers: jsonHeaders,
      body: { username: 'admin', password: '123456' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'const token = payload.accessToken;',
        ...syncVar('adminToken', 'token'),
        'pm.test("Đăng nhập Admin thành công (HTTP 200, role=ADMIN)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(token).to.be.a("string").and.not.be.empty;',
        '    pm.expect(payload.user.role).to.eql("ADMIN");',
        '});',
      ],
    }),
    makeReq({
      name: '0.11 Làm mới JWT Access Token (POST /auth/refresh)',
      method: 'POST',
      url: '{{baseUrl}}/auth/refresh',
      headers: jsonHeaders,
      body: { refreshToken: '{{customerRefreshToken}}' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'if (payload.accessToken) {',
        ...syncVar('customerToken', 'payload.accessToken').map((l) => `    ${l}`),
        '}',
        'pm.test("Cấp mới Access Token bằng Refresh Token thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(payload.accessToken).to.be.a("string").and.not.be.empty;',
        '});',
      ],
    }),
    makeReq({
      name: '0.12 Xem Profile hiện tại (/auth/me)',
      method: 'GET',
      url: '{{baseUrl}}/auth/me',
      headers: authHeaders('customerToken'),
      test: [
        'const res = pm.response.json();',
        'const user = res.data || res;',
        'pm.test("Lấy profile customer1 thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(user.role).to.eql("CUSTOMER");',
        '    pm.expect(user.username).to.eql("customer1");',
        '});',
      ],
    }),
    makeReq({
      name: '0.13 Đăng ký tài khoản test tạm (/auth/register -> 201)',
      method: 'POST',
      url: '{{baseUrl}}/auth/register',
      headers: jsonHeaders,
      prerequest: [
        'const suffix = Date.now() + "_" + Math.floor(1000 + Math.random() * 9000);',
        'const uname = "pm_e2e_" + suffix;',
        ...syncVar('tempUsername', 'uname'),
        ...syncVar('tempEmail', 'uname + "@brewlite.test"'),
        ...syncVar('tempPassword', '"Password123!"'),
      ],
      body: {
        username: '{{tempUsername}}',
        password: '{{tempPassword}}',
        fullName: 'Postman E2E Temp User',
        email: '{{tempEmail}}',
      },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        ...syncVar('tempCustomerToken', 'payload.accessToken'),
        ...syncVar('tempAccountId', 'payload.user.accountId'),
        'pm.test("Đăng ký khách hàng mới thành công (HTTP 201) và có accountId", () => {',
        '    pm.response.to.have.status(201);',
        '    pm.expect(payload.accessToken).to.be.a("string").and.not.be.empty;',
        '    pm.expect(payload.user.accountId).to.be.a("string").and.not.be.empty;',
        '});',
      ],
    }),
    makeReq({
      name: '0.14 Tài khoản mới kiểm tra lịch sử đơn rỗng (GET /orders/me -> [])',
      method: 'GET',
      url: '{{baseUrl}}/orders/me',
      headers: authHeaders('tempCustomerToken'),
      test: [
        'const res = pm.response.json();',
        'const orders = res.data || res;',
        'pm.test("Tài khoản mới trên PostgreSQL trả về mảng đơn rỗng [] (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(orders).to.be.an("array").with.lengthOf(0);',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Folder 1: Menu & Promotions
// ---------------------------------------------------------------------------
const folder1 = {
  name: '1. Thực đơn, Biến thể & Khuyến mãi (Menu & Promotions)',
  item: [
    makeReq({
      name: '1.1 Lấy danh sách Menu (/products?limit=20) & Lưu ID sản phẩm',
      method: 'GET',
      url: '{{baseUrl}}/products?limit=20',
      test: [
        'const res = pm.response.json();',
        'const items = res.items || res.data?.items || (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));',
        'pm.test("Lấy danh sách sản phẩm thành công (HTTP 200, >= 2 món)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(items).to.be.an("array");',
        '    pm.expect(items.length).to.be.at.least(2);',
        '});',
        'const available = items.filter(p => !p.isOutOfStock && p.variants && p.variants.length > 0);',
        'const coffeeProd =',
        '    available.find(p => p.name && p.name.toLowerCase().includes("cà phê sữa đá")) ||',
        '    available.find(p => p.name && p.name.toLowerCase().includes("cà phê")) ||',
        '    available[0] ||',
        '    items[0];',
        'const otherProd = available.find(p => p.id !== coffeeProd.id) || items.find(p => p.id !== coffeeProd.id) || coffeeProd;',
        ...syncVar('testProductId', 'coffeeProd.id'),
        ...syncVar('unpurchasedProductId', 'otherProd.id'),
        'if (coffeeProd.variants && coffeeProd.variants.length > 0) {',
        '    const varS =',
        '        coffeeProd.variants.find(v => v.size === "S" && (!v.topping || v.topping === "Tiêu chuẩn")) ||',
        '        coffeeProd.variants.find(v => v.size === "S") ||',
        '        coffeeProd.variants[0];',
        ...syncVar('testVariantId', 'varS.id').map((l) => `    ${l}`),
        '}',
      ],
    }),
    makeReq({
      name: '1.2 Xem chi tiết sản phẩm theo ID (/products/:id)',
      method: 'GET',
      url: '{{baseUrl}}/products/{{testProductId}}',
      test: [
        'const res = pm.response.json();',
        'const prod = res.data || res;',
        'pm.test("Xem chi tiết sản phẩm thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(prod.id).to.eql(pm.environment.get("testProductId") || pm.collectionVariables.get("testProductId"));',
        '    pm.expect(prod.variants).to.be.an("array").that.is.not.empty;',
        '});',
      ],
    }),
    makeReq({
      name: '1.3 [Negative] Xem sản phẩm không tồn tại -> 404 Not Found',
      method: 'GET',
      url: '{{baseUrl}}/products/non-existent-product-id',
      test: [
        'pm.test("Sản phẩm không tồn tại trả HTTP 404 Not Found", () => {',
        '    pm.response.to.have.status(404);',
        '});',
      ],
    }),
    makeReq({
      name: '1.4 Lấy danh sách Topping (/products/toppings)',
      method: 'GET',
      url: '{{baseUrl}}/products/toppings',
      test: [
        'const res = pm.response.json();',
        'const list = res.data || res;',
        'pm.test("Lấy danh sách Topping thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(list).to.be.an("array").that.is.not.empty;',
        '});',
      ],
    }),
    makeReq({
      name: '1.5 Danh sách Voucher khả dụng (/promotions/available?subtotal=50000)',
      method: 'GET',
      url: '{{baseUrl}}/promotions/available?subtotal=50000',
      test: [
        'const res = pm.response.json();',
        'const list = res.data || res;',
        'pm.test("Lấy Voucher khả dụng thành công (HTTP 200, có BANMOI = 15000)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(list).to.be.an("array");',
        '    const banMoi = list.find(v => v.code === "BANMOI");',
        '    pm.expect(banMoi).to.not.be.undefined;',
        '    pm.expect(banMoi.discountValue).to.eql(15000);',
        '    pm.expect(banMoi.isEligible).to.eql(true);',
        '});',
      ],
    }),
    makeReq({
      name: '1.6 Kiểm tra hợp lệ Voucher BREW10 (/promotions/validate -> 200/201)',
      method: 'POST',
      url: '{{baseUrl}}/promotions/validate',
      headers: jsonHeaders,
      body: { code: 'BREW10', orderSubtotal: 50000 },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("Validate mã BREW10 thành công", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '    pm.expect(payload.valid).to.eql(true);',
        '    pm.expect(payload.discountAmount).to.be.above(0);',
        '});',
      ],
    }),
    makeReq({
      name: '1.7 [Negative] Validate Voucher không tồn tại -> 404 Not Found',
      method: 'POST',
      url: '{{baseUrl}}/promotions/validate',
      headers: jsonHeaders,
      body: { code: 'INVALID_VOUCHER_XYZ', orderSubtotal: 50000 },
      test: [
        'pm.test("Mã Voucher không tồn tại trả HTTP 404 Not Found", () => {',
        '    pm.response.to.have.status(404);',
        '});',
      ],
    }),
    makeReq({
      name: '1.8 [Negative] Validate Voucher chưa đạt giá trị đơn tối thiểu -> 400 Bad Request',
      method: 'POST',
      url: '{{baseUrl}}/promotions/validate',
      headers: jsonHeaders,
      body: { code: 'BREW10', orderSubtotal: 10000 },
      test: [
        'pm.test("Đơn hàng dưới mức tối thiểu bị chặn HTTP 400 Bad Request", () => {',
        '    pm.response.to.have.status(400);',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Folder 2: RBAC Security & Negative Validation Guards
// ---------------------------------------------------------------------------
const folder2 = {
  name: '2. Bảo mật RBAC & Kiểm tra ràng buộc (Negative Guards)',
  item: [
    makeReq({
      name: '2.1 [Security 401] Tạo đơn chưa đăng nhập -> 401 Unauthorized',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: jsonHeaders,
      body: { items: [{ variantId: '{{testVariantId}}', quantity: 1 }] },
      test: [
        'pm.test("Chưa đăng nhập bị chặn HTTP 401 Unauthorized", () => {',
        '    pm.response.to.have.status(401);',
        '});',
      ],
    }),
    makeReq({
      name: '2.2 [Business Rule 400] Chặn cộng dồn 2 mã ORDER_DISCOUNT -> 400',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: authHeaders('tempCustomerToken', true),
      body: {
        items: [{ variantId: '{{testVariantId}}', quantity: 2 }],
        promotionCode: 'BREW10,GIAM20K',
      },
      test: [
        'pm.test("Chặn stacking 2 mã giảm giá với HTTP 400 Bad Request", () => {',
        '    pm.response.to.have.status(400);',
        '});',
      ],
    }),
    makeReq({
      name: '2.3 [RBAC 403] Customer gọi API Barista (/staff/orders) -> 403',
      method: 'GET',
      url: '{{baseUrl}}/staff/orders',
      headers: authHeaders('customerToken'),
      test: [
        'pm.test("Customer bị chặn truy cập Staff API với HTTP 403 Forbidden", () => {',
        '    pm.response.to.have.status(403);',
        '});',
      ],
    }),
    makeReq({
      name: '2.4 [RBAC 403] Customer gọi API Admin (/admin/accounts) -> 403',
      method: 'GET',
      url: '{{baseUrl}}/admin/accounts',
      headers: authHeaders('customerToken'),
      test: [
        'pm.test("Customer bị chặn truy cập Admin API với HTTP 403 Forbidden", () => {',
        '    pm.response.to.have.status(403);',
        '});',
      ],
    }),
    makeReq({
      name: '2.5 [RBAC 403] Barista gọi API Admin (/admin/accounts) -> 403',
      method: 'GET',
      url: '{{baseUrl}}/admin/accounts',
      headers: authHeaders('staffToken'),
      test: [
        'pm.test("Barista bị chặn truy cập Admin API với HTTP 403 Forbidden", () => {',
        '    pm.response.to.have.status(403);',
        '});',
      ],
    }),
    makeReq({
      name: '2.6 [Verified-Purchase Guard 403] Chưa mua món gửi Review -> 403',
      method: 'POST',
      url: '{{baseUrl}}/reviews',
      headers: authHeaders('tempCustomerToken', true),
      body: {
        productId: '{{unpurchasedProductId}}',
        stars: 5,
        content: 'Test chưa mua hàng không thể review',
      },
      test: [
        'pm.test("Khách chưa mua món ở trạng thái COMPLETED bị chặn HTTP 403", () => {',
        '    pm.response.to.have.status(403);',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Folder 3: Order Lifecycle & Paid-Order Cancel Rollback
// ---------------------------------------------------------------------------
const folder3 = {
  name: '3. Đặt hàng, Chi tiết đơn & Hủy đơn hoàn điểm (Orders)',
  item: [
    makeReq({
      name: '3.1 Tạo đơn hàng áp dụng Voucher BREW10 (POST /orders -> 201 PENDING)',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: authHeaders('tempCustomerToken', true),
      body: {
        items: [{ variantId: '{{testVariantId}}', quantity: 2 }],
        promotionCode: 'BREW10',
      },
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        ...syncVar('pendingOrderId', 'order.id'),
        'pm.test("Tạo đơn hàng thành công (HTTP 201, PENDING, có giảm giá)", () => {',
        '    pm.response.to.have.status(201);',
        '    pm.expect(order.id).to.be.a("string").and.not.be.empty;',
        '    pm.expect(order.status).to.eql("PENDING");',
        '    pm.expect(Number(order.discountAmount)).to.be.above(0);',
        '});',
      ],
    }),
    makeReq({
      name: '3.2 Chủ đơn xem chi tiết đơn hàng (GET /orders/:id -> 200)',
      method: 'GET',
      url: '{{baseUrl}}/orders/{{pendingOrderId}}',
      headers: authHeaders('tempCustomerToken'),
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        'pm.test("Chủ đơn xem chi tiết đơn hàng thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(order.id).to.eql(pm.environment.get("pendingOrderId") || pm.collectionVariables.get("pendingOrderId"));',
        '});',
      ],
    }),
    makeReq({
      name: '3.3 [RBAC 403] Khách hàng khác xem trộm đơn -> 403 Forbidden',
      method: 'GET',
      url: '{{baseUrl}}/orders/{{pendingOrderId}}',
      headers: authHeaders('customerToken'),
      test: [
        'pm.test("Chặn khách hàng khác xem chi tiết đơn với HTTP 403 Forbidden", () => {',
        '    pm.response.to.have.status(403);',
        '});',
      ],
    }),
    makeReq({
      name: '3.4 Hủy đơn hàng PENDING (/orders/:id/cancel -> CANCELLED)',
      method: 'POST',
      url: '{{baseUrl}}/orders/{{pendingOrderId}}/cancel',
      headers: authHeaders('tempCustomerToken'),
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        'pm.test("Hủy đơn PENDING thành công -> status CANCELLED", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '    pm.expect(order.status).to.eql("CANCELLED");',
        '});',
      ],
    }),
    makeReq({
      name: '3.5a [Paid-Cancel] Tạo đơn #2 để test Hủy đơn đã thanh toán',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: authHeaders('tempCustomerToken', true),
      body: { items: [{ variantId: '{{testVariantId}}', quantity: 1 }] },
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        ...syncVar('paidCancelOrderId', 'order.id'),
        'pm.test("Tạo đơn #2 PENDING thành công (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '});',
      ],
    }),
    makeReq({
      name: '3.5b [Paid-Cancel] Thanh toán WALLET cho đơn #2 (201 PAID)',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{$guid}}' },
      ],
      body: { orderId: '{{paidCancelOrderId}}', method: 'WALLET' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("Thanh toán đơn #2 thành công (HTTP 201, PAID)", () => {',
        '    pm.response.to.have.status(201);',
        '    pm.expect(payload.success).to.eql(true);',
        '    pm.expect(payload.order.status).to.eql("PAID");',
        '});',
      ],
    }),
    makeReq({
      name: '3.5c [Paid-Cancel] Hủy đơn đã PAID -> Rollback tồn kho & điểm thưởng',
      method: 'POST',
      url: '{{baseUrl}}/orders/{{paidCancelOrderId}}/cancel',
      headers: authHeaders('tempCustomerToken'),
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        'pm.test("Hủy đơn đã PAID thành công -> CANCELLED", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '    pm.expect(order.status).to.eql("CANCELLED");',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Folder 4: Payment Idempotency, Error Retry & MBBank VietQR (Task 8)
// ---------------------------------------------------------------------------
const folder4 = {
  name: '4. Thanh toán Idempotency, Error Retry & MBBank (Task 8)',
  item: [
    makeReq({
      name: '4.1 Chuẩn bị đơn hàng để test Thanh toán + Sinh Idempotency-Key',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: authHeaders('tempCustomerToken', true),
      prerequest: [
        'const newKey = "PM_IDEMP_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);',
        ...syncVar('fixedIdempotencyKey', 'newKey'),
      ],
      body: { items: [{ variantId: '{{testVariantId}}', quantity: 1 }] },
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        ...syncVar('idempOrderId', 'order.id'),
        'pm.test("Tạo đơn test thanh toán thành công (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '    pm.expect(order.status).to.eql("PENDING");',
        '});',
      ],
    }),
    makeReq({
      name: '4.2 [Mô phỏng lỗi Gateway] simulateError=FAIL -> 400 (Rollback kho, giữ đơn Retry)',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{$guid}}' },
      ],
      body: {
        orderId: '{{idempOrderId}}',
        method: 'WALLET',
        simulateError: 'FAIL',
      },
      test: [
        'pm.test("Lỗi cổng thanh toán trả HTTP 400 Bad Request", () => {',
        '    pm.response.to.have.status(400);',
        '});',
      ],
    }),
    makeReq({
      name: '4.2b [Mô phỏng Timeout Gateway] simulateError=TIMEOUT -> 408 Request Timeout',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{$guid}}' },
      ],
      body: {
        orderId: '{{idempOrderId}}',
        method: 'WALLET',
        simulateError: 'TIMEOUT',
      },
      test: [
        'pm.test("Timeout cổng thanh toán trả HTTP 408 Request Timeout", () => {',
        '    pm.response.to.have.status(408);',
        '});',
      ],
    }),
    makeReq({
      name: '4.3 [Thanh toán Lần 1 - Retry thành công] HTTP 201 (replayed: false)',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{fixedIdempotencyKey}}' },
      ],
      body: { orderId: '{{idempOrderId}}', method: 'WALLET' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("Retry thanh toán thành công mới (HTTP 201, replayed=false)", () => {',
        '    pm.response.to.have.status(201);',
        '    pm.expect(payload.success).to.eql(true);',
        '    pm.expect(payload.replayed).to.eql(false);',
        '});',
      ],
    }),
    makeReq({
      name: '4.4 [Click Đúp - Idempotent Replay] Gửi lại đúng Key -> HTTP 200 (replayed: true)',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{fixedIdempotencyKey}}' },
      ],
      body: { orderId: '{{idempOrderId}}', method: 'WALLET' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("Phát hiện Replay -> Trả kết quả cũ HTTP 200, replayed=true", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(payload.replayed).to.eql(true);',
        '});',
      ],
    }),
    makeReq({
      name: '4.5 [Xung đột Key] Trùng Idempotency-Key nhưng đổi method=CARD -> HTTP 422',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{fixedIdempotencyKey}}' },
      ],
      body: { orderId: '{{idempOrderId}}', method: 'CARD' },
      test: [
        'pm.test("Trùng Key nhưng tráo đổi phương thức bị chặn HTTP 422", () => {',
        '    pm.response.to.have.status(422);',
        '});',
      ],
    }),
    makeReq({
      name: '4.6 [MBBank Sync] Giả lập Webhook biến động số dư chuyển khoản QR',
      method: 'POST',
      url: '{{baseUrl}}/payments/mbbank-sync',
      headers: jsonHeaders,
      prerequest: [
        'const code = "BL" + Date.now().toString().slice(-6);',
        ...syncVar('mbTestCode', 'code'),
      ],
      body: {
        amount: 49000,
        content: 'BREWLITE {{mbTestCode}}',
        invoice_code: '{{mbTestCode}}',
        sender: '9999',
        senderName: 'POSTMAN E2E',
        transId: 'TX{{mbTestCode}}',
      },
      test: [
        'pm.test("Nhận webhook MBBank thành công (HTTP 200/201)", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
      ],
    }),
    makeReq({
      name: '4.7 [MBBank Check] Polling xác nhận đã nhận tiền (paid: true)',
      method: 'GET',
      url: '{{baseUrl}}/payments/mbbank-check/{{mbTestCode}}',
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("Kiểm tra MBBank trả paid=true (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(payload.paid).to.eql(true);',
        '});',
      ],
    }),
    makeReq({
      name: '4.8 [MBBank Invalidate] Dọn mã QR tạm sau khi thanh toán',
      method: 'POST',
      url: '{{baseUrl}}/payments/mbbank-invalidate/{{mbTestCode}}',
      test: [
        'pm.test("Hủy mã MBBank tạm thành công (HTTP 200/201)", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
      ],
    }),
    makeReq({
      name: '4.9 [Mock Gateway Direct] Kiểm tra trực tiếp POST /mock-gateway/charge',
      method: 'POST',
      url: '{{baseUrl}}/mock-gateway/charge',
      headers: jsonHeaders,
      body: { amount: 49000, method: 'WALLET' },
      test: [
        'const res = pm.response.json();',
        'const payload = res.data || res;',
        'pm.test("Mock Gateway trả APPROVED (HTTP 200/201)", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '    pm.expect(payload.success).to.eql(true);',
        '    pm.expect(payload.status).to.eql("APPROVED");',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Folder 5: Barista State Machine (Task 9) + Verified Review CRUD + Moderation
// ---------------------------------------------------------------------------
const folder5 = {
  name: '5. Quy trình Barista (Task 9) & Đánh giá món ăn (Reviews)',
  item: [
    makeReq({
      name: '5.1 Barista xem hàng đợi chế biến (GET /staff/orders -> có idempOrderId)',
      method: 'GET',
      url: '{{baseUrl}}/staff/orders',
      headers: authHeaders('staffToken'),
      test: [
        'const res = pm.response.json();',
        'const orders = res.data || res;',
        'const targetId = pm.environment.get("idempOrderId") || pm.collectionVariables.get("idempOrderId");',
        'pm.test("Barista thấy đơn đã thanh toán trong hàng đợi (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(orders).to.be.an("array");',
        '    pm.expect(orders.some(o => o.id === targetId)).to.eql(true);',
        '});',
      ],
    }),
    makeReq({
      name: '5.2 Barista xem công thức pha chế của đơn (GET /staff/orders/:id/recipes)',
      method: 'GET',
      url: '{{baseUrl}}/staff/orders/{{idempOrderId}}/recipes',
      headers: authHeaders('staffToken'),
      test: [
        'pm.test("Barista xem công thức món thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '});',
      ],
    }),
    makeReq({
      name: '5.3 [Happy Path] Barista nhận đơn (PAID -> PREPARING)',
      method: 'POST',
      url: '{{baseUrl}}/staff/orders/{{idempOrderId}}/accept',
      headers: authHeaders('staffToken'),
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        'pm.test("Chuyển trạng thái sang PREPARING thành công", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '    pm.expect(order.status).to.eql("PREPARING");',
        '});',
      ],
    }),
    makeReq({
      name: '5.4 [Happy Path] Barista pha chế xong (PREPARING -> READY)',
      method: 'POST',
      url: '{{baseUrl}}/staff/orders/{{idempOrderId}}/ready',
      headers: authHeaders('staffToken'),
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        'pm.test("Chuyển trạng thái sang READY thành công", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '    pm.expect(order.status).to.eql("READY");',
        '});',
      ],
    }),
    makeReq({
      name: '5.5 [Happy Path] Hoàn thành giao khách (READY -> COMPLETED)',
      method: 'POST',
      url: '{{baseUrl}}/staff/orders/{{idempOrderId}}/complete',
      headers: authHeaders('staffToken'),
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        'pm.test("Chuyển trạng thái sang COMPLETED thành công", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '    pm.expect(order.status).to.eql("COMPLETED");',
        '});',
      ],
    }),
    makeReq({
      name: '5.6 [Kịch bản LỖI] Tạo đơn PENDING để test chặn nhảy cóc State Machine',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: authHeaders('tempCustomerToken', true),
      body: { items: [{ variantId: '{{testVariantId}}', quantity: 1 }] },
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        ...syncVar('jumpOrderId', 'order.id'),
        'pm.test("Tạo đơn PENDING thành công (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '});',
      ],
    }),
    makeReq({
      name: '5.7 [Kịch bản LỖI] Nhảy cóc PENDING -> COMPLETED bị chặn HTTP 409 Conflict',
      method: 'POST',
      url: '{{baseUrl}}/staff/orders/{{jumpOrderId}}/complete',
      headers: authHeaders('staffToken'),
      test: [
        'const res = pm.response.json();',
        'pm.test("State Machine chặn nhảy cóc với HTTP 409 Conflict", () => {',
        '    pm.response.to.have.status(409);',
        '    pm.expect(res.message).to.include("Không thể chuyển từ");',
        '});',
      ],
    }),
    makeReq({
      name: '5.8 [Verified Review] Khách đã mua COMPLETED gửi đánh giá (POST /reviews -> 201)',
      method: 'POST',
      url: '{{baseUrl}}/reviews',
      headers: authHeaders('tempCustomerToken', true),
      body: {
        productId: '{{testProductId}}',
        stars: 5,
        content: 'Cà phê rất thơm và đậm đà (Postman Verified)!',
      },
      test: [
        'const res = pm.response.json();',
        'const rev = res.data || res;',
        ...syncVar('reviewId', 'rev.id'),
        'pm.test("Gửi đánh giá món đã mua thành công (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '    pm.expect(rev.id).to.be.a("string").and.not.be.empty;',
        '    pm.expect(rev.stars).to.eql(5);',
        '});',
      ],
    }),
    makeReq({
      name: '5.9a [Admin Moderation] Ẩn đánh giá (PATCH /admin/reviews/:id/hide -> HIDDEN)',
      method: 'PATCH',
      url: '{{baseUrl}}/admin/reviews/{{reviewId}}/hide',
      headers: authHeaders('adminToken'),
      test: [
        'const res = pm.response.json();',
        'const rev = res.data || res;',
        'pm.test("Admin ẩn đánh giá thành công (HTTP 200, status=HIDDEN)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(rev.status).to.eql("HIDDEN");',
        '});',
      ],
    }),
    makeReq({
      name: '5.9b [Admin Moderation] Mở lại đánh giá (PATCH /admin/reviews/:id/show -> VISIBLE)',
      method: 'PATCH',
      url: '{{baseUrl}}/admin/reviews/{{reviewId}}/show',
      headers: authHeaders('adminToken'),
      test: [
        'const res = pm.response.json();',
        'const rev = res.data || res;',
        'pm.test("Admin mở lại đánh giá thành công (HTTP 200, status=VISIBLE)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(rev.status).to.eql("VISIBLE");',
        '});',
      ],
    }),
    makeReq({
      name: '5.10 Khách cập nhật đánh giá của mình (PATCH /reviews/:id -> 200)',
      method: 'PATCH',
      url: '{{baseUrl}}/reviews/{{reviewId}}',
      headers: authHeaders('tempCustomerToken', true),
      body: {
        stars: 4,
        content: 'Cập nhật lại: Đồ uống ngon, phục vụ nhanh!',
      },
      test: [
        'const res = pm.response.json();',
        'const rev = res.data || res;',
        'pm.test("Cập nhật đánh giá thành công (HTTP 200, stars=4)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(rev.stars).to.eql(4);',
        '});',
      ],
    }),
    makeReq({
      name: '5.11 Khách xóa đánh giá của mình (DELETE /reviews/:id -> 200)',
      method: 'DELETE',
      url: '{{baseUrl}}/reviews/{{reviewId}}',
      headers: authHeaders('tempCustomerToken'),
      test: [
        'pm.test("Xóa đánh giá thành công (HTTP 200)", () => {',
        '    pm.expect([200, 204]).to.include(pm.response.code);',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Folder 6: Task 10.3 Optimistic Locking (Chống âm kho Ly Cuối + Restore)
// ---------------------------------------------------------------------------
const folder6 = {
  name: '6. Task 10.3 - Optimistic Locking (Chống âm kho & Khôi phục)',
  item: [
    makeReq({
      name: '6.1 Xem tồn kho nguyên liệu & Lưu robustaId + mức tồn kho ban đầu',
      method: 'GET',
      url: '{{baseUrl}}/admin/ingredients',
      headers: authHeaders('adminToken'),
      test: [
        'const res = pm.response.json();',
        'const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : (res.items || []));',
        'const robusta = items.find(i => i.name && i.name.toLowerCase().includes("robusta")) || items[0];',
        'const restoreQty = Math.max(30000, Math.round(Number(robusta.stockQuantity || 30000)));',
        ...syncVar('robustaId', 'robusta.id'),
        ...syncVar('robustaRestoreStock', 'restoreQty'),
        'pm.test("Tìm thấy nguyên liệu Robusta và lưu tồn kho khôi phục (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(robusta.id).to.be.a("string").and.not.be.empty;',
        '});',
      ],
    }),
    makeReq({
      name: '6.2 [Kịch bản Ly Cuối] Admin đặt tồn kho Robusta còn đúng 20g (đủ 1 ly)',
      method: 'PATCH',
      url: '{{baseUrl}}/admin/ingredients/{{robustaId}}',
      headers: authHeaders('adminToken', true),
      body: { stockQuantity: 20 },
      test: [
        'pm.test("Admin đặt tồn kho 20g thành công (HTTP 200)", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
      ],
    }),
    makeReq({
      name: '6.3 [Khách 1] Tạo đơn mua 1 ly cà phê cuối -> orderIdLastCup1',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: authHeaders('tempCustomerToken', true),
      body: { items: [{ variantId: '{{testVariantId}}', quantity: 1 }] },
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        ...syncVar('orderIdLastCup1', 'order.id'),
        'pm.test("Khách 1 tạo đơn thành công (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '});',
      ],
    }),
    makeReq({
      name: '6.4 [Khách 1] Thanh toán thành công ly cuối cùng (HTTP 201 PAID)',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{$guid}}' },
      ],
      body: { orderId: '{{orderIdLastCup1}}', method: 'WALLET' },
      test: [
        'pm.test("Khách 1 thanh toán thành công ly cuối (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '});',
      ],
    }),
    makeReq({
      name: '6.5 [Khách 2] Tạo đơn tranh mua khi vừa hết kho -> orderIdLastCup2',
      method: 'POST',
      url: '{{baseUrl}}/orders',
      headers: authHeaders('tempCustomerToken', true),
      body: { items: [{ variantId: '{{testVariantId}}', quantity: 1 }] },
      test: [
        'const res = pm.response.json();',
        'const order = res.data || res;',
        ...syncVar('orderIdLastCup2', 'order.id'),
        'pm.test("Khách 2 tạo đơn PENDING thành công (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '});',
      ],
    }),
    makeReq({
      name: '6.6 [Khách 2 - CHẶN ÂM KHO] Bị chặn đứng với HTTP 409 Conflict',
      method: 'POST',
      url: '{{baseUrl}}/payments',
      headers: [
        ...authHeaders('tempCustomerToken', true),
        { key: 'Idempotency-Key', value: '{{$guid}}' },
      ],
      body: { orderId: '{{orderIdLastCup2}}', method: 'WALLET' },
      test: [
        'const res = pm.response.json();',
        'pm.test("OCC chặn thanh toán âm kho với HTTP 409 Conflict", () => {',
        '    pm.response.to.have.status(409);',
        '    pm.expect(res.message).to.include("không đủ tồn kho");',
        '});',
      ],
    }),
    makeReq({
      name: '6.7 [Khôi phục kho] Admin nạp lại đúng tồn kho Robusta ban đầu',
      method: 'PATCH',
      url: '{{baseUrl}}/admin/ingredients/{{robustaId}}',
      headers: authHeaders('adminToken', true),
      body: '{{robustaRestorePayload}}',
      prerequest: [
        'const qty = Number(pm.environment.get("robustaRestoreStock") || pm.collectionVariables.get("robustaRestoreStock") || 30000);',
        'pm.variables.set("robustaRestorePayload", JSON.stringify({ stockQuantity: qty }));',
      ],
      test: [
        'pm.test("Khôi phục tồn kho Robusta thành công (HTTP 200)", () => {',
        '    pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Folder 7: Admin Portal Stats, CRUD Lifecycle & Auto-Cleanup
// ---------------------------------------------------------------------------
const folder7 = {
  name: '7. Quản trị hệ thống (Admin Portal) & Dọn dữ liệu Test',
  item: [
    makeReq({
      name: '7.1 Thống kê tổng quan (/admin/stats/overview)',
      method: 'GET',
      url: '{{baseUrl}}/admin/stats/overview',
      headers: authHeaders('adminToken'),
      test: ['pm.test("Stats overview HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.2 Doanh thu theo ngày (/admin/stats/revenue)',
      method: 'GET',
      url: '{{baseUrl}}/admin/stats/revenue',
      headers: authHeaders('adminToken'),
      test: ['pm.test("Stats revenue HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.3 Top sản phẩm bán chạy (/admin/stats/top-products)',
      method: 'GET',
      url: '{{baseUrl}}/admin/stats/top-products',
      headers: authHeaders('adminToken'),
      test: ['pm.test("Top products HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.4 Tỷ trọng đơn hàng theo trạng thái (/admin/stats/orders-by-status)',
      method: 'GET',
      url: '{{baseUrl}}/admin/stats/orders-by-status',
      headers: authHeaders('adminToken'),
      test: ['pm.test("Orders by status HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.5a Danh sách tài khoản (/admin/accounts)',
      method: 'GET',
      url: '{{baseUrl}}/admin/accounts',
      headers: authHeaders('adminToken'),
      test: ['pm.test("GET /admin/accounts HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.5b Danh sách nhân viên (/admin/staff)',
      method: 'GET',
      url: '{{baseUrl}}/admin/staff',
      headers: authHeaders('adminToken'),
      test: ['pm.test("GET /admin/staff HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.5c Danh sách công thức (/admin/recipes)',
      method: 'GET',
      url: '{{baseUrl}}/admin/recipes',
      headers: authHeaders('adminToken'),
      test: ['pm.test("GET /admin/recipes HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.5d Danh sách khuyến mãi (/admin/promotions)',
      method: 'GET',
      url: '{{baseUrl}}/admin/promotions',
      headers: authHeaders('adminToken'),
      test: ['pm.test("GET /admin/promotions HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.5e Danh sách nhà cung cấp (/admin/suppliers)',
      method: 'GET',
      url: '{{baseUrl}}/admin/suppliers',
      headers: authHeaders('adminToken'),
      test: ['pm.test("GET /admin/suppliers HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.5f Danh sách phiếu nhập kho (/admin/import-receipts)',
      method: 'GET',
      url: '{{baseUrl}}/admin/import-receipts',
      headers: authHeaders('adminToken'),
      test: ['pm.test("GET /admin/import-receipts HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.5g Danh sách kiểm duyệt đánh giá (/admin/reviews)',
      method: 'GET',
      url: '{{baseUrl}}/admin/reviews',
      headers: authHeaders('adminToken'),
      test: ['pm.test("GET /admin/reviews HTTP 200", () => pm.response.to.have.status(200));'],
    }),
    makeReq({
      name: '7.6a [Account Lock] Admin khóa tài khoản tạm (/admin/accounts/:id/lock)',
      method: 'PATCH',
      url: '{{baseUrl}}/admin/accounts/{{tempAccountId}}/lock',
      headers: authHeaders('adminToken'),
      test: [
        'const res = pm.response.json();',
        'const acc = res.data || res;',
        'pm.test("Khóa tài khoản tạm thành công (HTTP 200, status=LOCKED)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(acc.status).to.eql("LOCKED");',
        '});',
      ],
    }),
    makeReq({
      name: '7.6b [Account Lock] Tài khoản bị khóa đăng nhập bị chặn HTTP 401',
      method: 'POST',
      url: '{{baseUrl}}/auth/login',
      headers: jsonHeaders,
      body: { username: '{{tempUsername}}', password: '{{tempPassword}}' },
      test: [
        'pm.test("Tài khoản LOCKED bị chặn đăng nhập HTTP 401", () => {',
        '    pm.response.to.have.status(401);',
        '});',
      ],
    }),
    makeReq({
      name: '7.6c [Account Unlock] Admin mở khóa tài khoản (/admin/accounts/:id/unlock)',
      method: 'PATCH',
      url: '{{baseUrl}}/admin/accounts/{{tempAccountId}}/unlock',
      headers: authHeaders('adminToken'),
      test: [
        'const res = pm.response.json();',
        'const acc = res.data || res;',
        'pm.test("Mở khóa tài khoản thành công (HTTP 200, status=ACTIVE)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(acc.status).to.eql("ACTIVE");',
        '});',
      ],
    }),
    makeReq({
      name: '7.6d [Change Password] Đổi mật khẩu tài khoản tạm (POST /auth/change-password)',
      method: 'POST',
      url: '{{baseUrl}}/auth/change-password',
      headers: authHeaders('tempCustomerToken', true),
      body: { oldPassword: '{{tempPassword}}', newPassword: 'Password456!' },
      test: [
        'pm.test("Đổi mật khẩu thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '});',
      ],
    }),
    makeReq({
      name: '7.6e [Verify New Password] Đăng nhập lại bằng mật khẩu mới -> HTTP 200',
      method: 'POST',
      url: '{{baseUrl}}/auth/login',
      headers: jsonHeaders,
      body: { username: '{{tempUsername}}', password: 'Password456!' },
      test: [
        'pm.test("Đăng nhập mật khẩu mới thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '});',
      ],
    }),
    makeReq({
      name: '7.7a [Admin Promo CRUD] Tạo mã khuyến mãi tạm (POST /admin/promotions -> 201)',
      method: 'POST',
      url: '{{baseUrl}}/admin/promotions',
      headers: authHeaders('adminToken', true),
      prerequest: [
        'const code = "PMTEST" + Date.now().toString().slice(-6);',
        ...syncVar('tempPromoCode', 'code'),
      ],
      body: {
        code: '{{tempPromoCode}}',
        name: 'Postman Temp Promotion',
        discountType: 'FIXED',
        discountValue: 10000,
        quantity: 5,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2027-12-31T23:59:59.000Z',
        status: 'ACTIVE',
      },
      test: [
        'const res = pm.response.json();',
        'const promo = res.data || res;',
        ...syncVar('tempPromoId', 'promo.id'),
        'pm.test("Admin tạo mã khuyến mãi tạm thành công (HTTP 201)", () => {',
        '    pm.response.to.have.status(201);',
        '    pm.expect(promo.id).to.be.a("string").and.not.be.empty;',
        '});',
      ],
    }),
    makeReq({
      name: '7.7b [Admin Promo CRUD] Cập nhật mã khuyến mãi tạm (PATCH -> 200)',
      method: 'PATCH',
      url: '{{baseUrl}}/admin/promotions/{{tempPromoId}}',
      headers: authHeaders('adminToken', true),
      body: { name: 'Postman Temp Promotion Updated', discountValue: 12000 },
      test: [
        'const res = pm.response.json();',
        'const promo = res.data || res;',
        'pm.test("Admin cập nhật khuyến mãi thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '    pm.expect(Number(promo.discountValue)).to.eql(12000);',
        '});',
      ],
    }),
    makeReq({
      name: '7.7c [Admin Promo CRUD] Xóa sạch mã khuyến mãi tạm (DELETE -> 200)',
      method: 'DELETE',
      url: '{{baseUrl}}/admin/promotions/{{tempPromoId}}',
      headers: authHeaders('adminToken'),
      test: [
        'pm.test("Admin xóa khuyến mãi tạm thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '});',
      ],
    }),
    makeReq({
      name: '7.8 [Cleanup] Xóa tài khoản test tạm & toàn bộ đơn tạm (DELETE /admin/accounts/:id)',
      method: 'DELETE',
      url: '{{baseUrl}}/admin/accounts/{{tempAccountId}}',
      headers: authHeaders('adminToken'),
      test: [
        'pm.test("Dọn sạch tài khoản test tạm và dữ liệu liên quan thành công (HTTP 200)", () => {',
        '    pm.response.to.have.status(200);',
        '});',
      ],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Assemble Full Collection & Environments
// ---------------------------------------------------------------------------
const variableKeys = [
  ['baseUrl', 'http://127.0.0.1:3001/api', 'default'],
  ['customerToken', '', 'secret'],
  ['customerRefreshToken', '', 'secret'],
  ['staffToken', '', 'secret'],
  ['adminToken', '', 'secret'],
  ['tempCustomerToken', '', 'secret'],
  ['tempAccountId', '', 'default'],
  ['tempUsername', '', 'default'],
  ['tempEmail', '', 'default'],
  ['tempPassword', 'Password123!', 'secret'],
  ['testProductId', '', 'default'],
  ['unpurchasedProductId', '', 'default'],
  ['testVariantId', '', 'default'],
  ['pendingOrderId', '', 'default'],
  ['paidCancelOrderId', '', 'default'],
  ['idempOrderId', '', 'default'],
  ['jumpOrderId', '', 'default'],
  ['orderIdLastCup1', '', 'default'],
  ['orderIdLastCup2', '', 'default'],
  ['robustaId', '', 'default'],
  ['robustaRestoreStock', '30000', 'default'],
  ['reviewId', '', 'default'],
  ['mbTestCode', '', 'default'],
  ['tempPromoCode', '', 'default'],
  ['tempPromoId', '', 'default'],
  ['fixedIdempotencyKey', 'POSTMAN_IDEMP_TEST_9999', 'default'],
];

const fullCollection = {
  info: {
    _postman_id: 'brewlite-full-api-collection-2026',
    name: 'BrewLite Coffee - Full API Collection (A-Z)',
    description:
      'Bộ sưu tập kiểm thử API A-Z hoàn chỉnh của đồ án BrewLite Coffee:\n' +
      '- Bao phủ toàn bộ Root/Health, Auth (Login/Register/Refresh/ChangePassword), Menu/Toppings/Promotions.\n' +
      '- Kiểm thử bảo mật RBAC (401/403), Validation (400), Verified-Purchase Review (403/201/200).\n' +
      '- Task 8 (Idempotent Payment 201/200/422, Gateway Failure Recovery, MBBank VietQR Sync).\n' +
      '- Task 9 (Order State Machine, Jump Guard 409, Paid-Order Cancel Rollback).\n' +
      '- Task 10.3 (OCC Last-Cup Conflict 409 + tự khôi phục tồn kho ban đầu).\n' +
      '- Admin Portal Stats, CRUD Promotion, Lock/Unlock Account & tự dọn dữ liệu test.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  event: [
    makeEvent('prerequest', [
      'const rawBase = pm.environment.get("baseUrl") || pm.collectionVariables.get("baseUrl") || "http://127.0.0.1:3001/api";',
      'const cleanBase = String(rawBase).replace(/\\/+$/, "");',
      'const root = cleanBase.replace(/\\/api$/i, "");',
      'pm.variables.set("serverRoot", root);',
    ]),
  ],
  variable: variableKeys.map(([key, value]) => ({
    key,
    value,
    type: 'string',
  })),
  item: [folder0, folder1, folder2, folder3, folder4, folder5, folder6, folder7],
};

function makeEnvironment(id, name, baseUrl) {
  return {
    id,
    name,
    values: variableKeys.map(([key, value, type]) => ({
      key,
      value: key === 'baseUrl' ? baseUrl : value,
      type,
      enabled: true,
    })),
    _postman_variable_scope: 'environment',
  };
}

fs.writeFileSync(fullCollectionPath, JSON.stringify(fullCollection, null, 2), 'utf8');
fs.writeFileSync(
  localEnvPath,
  JSON.stringify(makeEnvironment('brewlite-local-env-2026', 'BrewLite - Local Environment', 'http://127.0.0.1:3001/api'), null, 2),
  'utf8',
);
fs.writeFileSync(
  prodEnvPath,
  JSON.stringify(
    makeEnvironment('brewlite-prod-env-2026', 'BrewLite - Production (Render)', 'https://brewlite-api-hj1i.onrender.com/api'),
    null,
    2,
  ),
  'utf8',
);

console.log('Generated:');
console.log(' - ' + fullCollectionPath);
console.log(' - ' + localEnvPath);
console.log(' - ' + prodEnvPath);
