# MA TRẬN TRUY VẾT YÊU CẦU PHẦN MỀM (TRACEABILITY MATRIX)
**Dự án**: Hệ thống Đặt & Quản lý Đồ uống Trực tuyến BrewLite Coffee  
**Môn học**: Công nghệ Phần mềm — Assignment 2 (Mục 8.1 - Bắt buộc)  
**Phiên bản**: Ver 1.0  

---

## 1. Giới Thiệu & Mục Đích

Tài liệu này thiết lập mối liên kết hai chiều (Bi-directional Traceability) từ **Yêu cầu nghiệp vụ (FR/NFR)** ➔ **Use-Case / User Story** ➔ **Tạo phẩm Thiết kế / Sơ đồ (UML Diagrams)** ➔ **Mã nguồn Hiện thực (Code/API)** ➔ **Kiểm thử Tự động (Unit Test / Postman / E2E Test)**.

Mọi chức năng trong hệ thống đều được kiểm chứng và có bằng chứng thực thi tương ứng, đảm bảo đáp ứng trọn vẹn tiêu chí đánh giá của đề tài.

---

## 2. Bảng Ma Trận Truy Vết Yêu Cầu Chức Năng (Functional Requirements - FR)

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ tương ứng | Thành phần Hiện thực (Code / API) | Kịch bản Kiểm thử (Test Cases) | Trạng thái Nghiệm thu |
|:---:|---|---|---|---|:---:|
| **FR-01** | **US-01 / UC-01**: Khách hàng xem danh sách thực đơn đồ uống và tìm kiếm | `activity-end-to-end.puml`<br>`class-diagram.puml` (`Product`) | **Backend**: `GET /api/products`<br>`products.controller.ts`<br>**Frontend**: `frontend/src/app/menu/page.tsx` | • Postman: `1.1 Lấy danh sách sản phẩm Menu`<br>• Jest: `products.service.spec.ts` | **PASSED (100%)** |
| **FR-02** | **US-02 / UC-02**: Xem chi tiết đồ uống, chọn kích cỡ (S/M/L) và danh sách Topping | `class-diagram.puml` (`ProductVariant`, `Product`) | **Backend**: `GET /api/products/:id`<br>`GET /api/products/toppings`<br>**Frontend**: `frontend/src/components/ProductModal.tsx` | • Postman: `1.2 Xem chi tiết sản phẩm`<br>• Postman: `1.3 Lấy danh sách Topping` | **PASSED (100%)** |
| **FR-03** | **US-03 / UC-03**: Quản lý giỏ hàng, tăng giảm số lượng, tính tổng tiền tức thời | `activity-end-to-end.puml`<br>`class-diagram.puml` (`OrderItem`) | **Frontend**: `frontend/src/context/CartContext.tsx`<br>`frontend/src/app/cart/page.tsx` | • Jest: `cart.context.spec.tsx`<br>• E2E: `order-checkout.e2e-spec.ts` | **PASSED (100%)** |
| **FR-04** | **US-04 / UC-04**: Đăng ký, Đăng nhập, cấp JWT Token và phân quyền (Customer, Staff, Admin) | `activity-end-to-end.puml`<br>`sequence-checkout.puml` (JWT check) | **Backend**: `POST /api/auth/register`<br>`POST /api/auth/login`<br>`GET /api/auth/me`<br>`auth.service.ts` (Bcrypt 10 rounds) | • Postman: `0.1 Đăng nhập Customer`<br>• Postman: `0.2 Đăng nhập Barista`<br>• Postman: `0.3 Đăng nhập Admin`<br>• Jest: `auth.service.spec.ts` (9/9 pass) | **PASSED (100%)** |
| **FR-05** | **US-05 / UC-05**: Khách hàng áp dụng mã khuyến mãi (Voucher) để được khấu trừ tiền | `class-diagram.puml` (`Promotion`, `Order`) | **Backend**: `GET /api/promotions/available`<br>`POST /api/promotions/validate`<br>`promotions.service.ts` | • Postman: `1.4 Danh sách Voucher`<br>• Postman: `1.5 Kiểm tra hợp lệ Voucher` | **PASSED (100%)** |
| **FR-06** | **US-06 / UC-06**: Khởi tạo đơn hàng mới ở trạng thái khởi tạo PENDING | `sequence-checkout.puml` (Step 1)<br>`class-diagram.puml` (`Order`, `OrderItem`) | **Backend**: `POST /api/orders`<br>`orders.controller.ts`<br>`orders.service.ts` | • Postman: `2.1 Tạo đơn hàng mới`<br>• Postman: `1.1 Tạo Đơn Hàng mới (PENDING)`<br>• Jest: `orders.service.spec.ts` | **PASSED (100%)** |
| **FR-07** | **US-07 / UC-06 (Task 8)**: Thanh toán trực tuyến đảm bảo Idempotency (Chống trừ tiền 2 lần) | `sequence-checkout.puml` (Step 2 & Step 4)<br>`class-diagram.puml` (`Payment`) | **Backend**: `POST /api/payments`<br>`x-idempotency-key` header<br>`payment.service.ts` | • Postman: `2.2 Gửi Thanh Toán Lần 1 (HTTP 201)`<br>• Postman: `2.3 Gửi Lại Cùng Key (HTTP 200 Replay)`<br>• Jest: `payment.service.spec.ts` (14/14 pass) | **PASSED (100%)** |
| **FR-08** | **US-08 / UC-11 (Task 9)**: Máy trạng thái đơn hàng (Order State Machine), chặn nhảy cóc | `activity-end-to-end.puml`<br>`class-diagram.puml` (`OrderStatus`) | **Backend**: `staff.controller.ts`<br>`/staff/orders/:id/accept`<br>`/staff/orders/:id/ready`<br>`/staff/orders/:id/complete` | • Postman: `1.1 - 1.5 Happy Path State Flow`<br>• Postman: `1.7 Chặn Nhảy Cóc (HTTP 409 Conflict)`<br>• Jest: `orders.service.spec.ts` (State checks) | **PASSED (100%)** |
| **FR-09** | **US-09 / UC-12 (Task 10.3)**: Kiểm soát trừ kho nguyên liệu bằng Optimistic Locking (OCC) | `sequence-checkout.puml` (Step 3)<br>`class-diagram.puml` (`Ingredient`) | **Backend**: `payment.service.ts`<br>`prisma.$transaction`<br>`version` column in `Ingredient` | • Postman: `3.1 - 3.5 Optimistic Locking Tests`<br>• Postman: `3.5 Khách 2 bị CHẶN ĐỨNG (HTTP 409)`<br>• Node: `scripts/test-race-condition.js` | **PASSED (100%)** |
| **FR-10** | **US-10 / UC-07**: Khách hàng xem danh sách lịch sử đơn hàng và chi tiết tiến độ | `class-diagram.puml` (`Order`) | **Backend**: `GET /api/orders/me`<br>`GET /api/orders/:id`<br>**Frontend**: `frontend/src/app/orders/page.tsx` | • Postman: `2.2 Xem lịch sử đơn của tôi`<br>• Postman: `2.3 Xem chi tiết 1 đơn hàng` | **PASSED (100%)** |
| **FR-11** | **US-11 / UC-08**: Khách hàng hủy đơn hàng khi đơn chưa được chế biến | `class-diagram.puml` (`OrderStatus.CANCELLED`) | **Backend**: `POST /api/orders/:id/cancel`<br>`orders.service.ts` | • Postman: `2.4 Hủy đơn hàng PENDING`<br>• Jest: `orders.service.spec.ts` | **PASSED (100%)** |
| **FR-12** | **US-12 / UC-09**: Khách hàng viết đánh giá (1-5 sao) cho đồ uống đã mua | `class-diagram.puml` (`Review`) | **Backend**: `POST /api/reviews`<br>`PATCH /api/reviews/:id`<br>`DELETE /api/reviews/:id`<br>`reviews.service.ts` | • Postman: `3.1 Gửi đánh giá món`<br>• Postman: `3.2 Cập nhật đánh giá món`<br>• Postman: `3.3 Xóa đánh giá món` | **PASSED (100%)** |
| **FR-13** | **US-13 / UC-13**: Quản lý cửa hàng xem thống kê doanh thu, tồn kho và tài khoản | `deployment-diagram.puml`<br>`class-diagram.puml` | **Backend**: `admin.controller.ts`<br>`GET /api/admin/stats/overview`<br>`GET /api/admin/stats/revenue`<br>`GET /api/admin/ingredients` | • Postman: `5.1 - 5.10 Quản trị hệ thống`<br>• Postman: `5.5 Xem tồn kho Robusta` | **PASSED (100%)** |

---

## 3. Bảng Ma Trận Truy Vết Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)

| Mã yêu cầu | Nhóm thuộc tính | Yêu cầu kỹ thuật | Thành phần Hiện thực (Architecture / Code) | Phương thức Kiểm chứng (Verification) | Trạng thái |
|:---:|---|---|---|---|:---:|
| **NFR-01** | **Hiệu Năng (Performance)** | Thời gian phản hồi trung bình API ≤ 200ms | • NestJS tối ưu Express Engine.<br>• Prisma Connection Pooling.<br>• PostgreSQL Indexing. | • Newman CLI Run: **Thời gian trung bình 20ms/request (vượt chuẩn 10 lần)**.<br>• Toàn bộ 49 requests chạy trong 4 giây. | **ĐẠT** |
| **NFR-02** | **Bảo Mật (Security)** | Mật khẩu băm Bcrypt 10 rounds, xác thực JWT, phân quyền Role chặt chẽ | • `bcrypt.hash(password, 10)` trong `auth.service.ts`.<br>• `JwtAuthGuard` & `RolesGuard`. | • Unit Test: `auth.service.spec.ts` kiểm tra Bcrypt băm và so khớp.<br>• Postman: Kiểm tra chặn HTTP 401 khi không có token. | **ĐẠT** |
| **NFR-03** | **Tính Khả Dụng (Usability & PWA)** | Thiết kế Mobile-First, hỗ trợ PWA offline caching | • Next.js App Router, Tailwind CSS.<br>• `manifest.json`, Service Worker. | • Giao diện đáp ứng mượt mà trên iPhone/Android.<br>• Không bị vỡ khung hình, hỗ trợ Add to Home Screen. | **ĐẠT** |
| **NFR-04** | **Toàn Vẹn Dữ Liệu (ACID)** | Đảm bảo tính nguyên tử: Trừ tiền + Trừ kho + Chuyển trạng thái | • `prisma.$transaction(async (tx) => { ... })`<br>• Cơ chế Optimistic Locking `version`. | • Test Task 10.3: Tranh chấp kho giữa 2 khách hàng, chặn 100% tình trạng âm kho (HTTP 409). | **ĐẠT** |
| **NFR-05** | **Khả Năng Triển Khai (DevOps)** | Container hóa và CI/CD tự động hóa kiểm tra mã nguồn | • `docker-compose.yml`<br>• `.github/workflows/ci.yml`<br>• `.github/workflows/cd.yml` | • Chạy `docker compose up` khởi động đầy đủ môi trường.<br>• Pipeline CI chạy tự động khi tạo Pull Request. | **ĐẠT** |
| **NFR-06** | **Giám Sát (Observability)** | Cung cấp Health check endpoint cho container | • `app.controller.ts`: `@Get(['health', 'api/health'])`<br>• Ping CSDL `SELECT 1`. | • Postman Test: `0.6 Health Check` trả về HTTP 200 `{ status: 'ok', database: 'connected' }`. | **ĐẠT** |
