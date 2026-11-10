# ĐẶC TẢ YÊU CẦU PHẦN MỀM RÚT GỌN (SOFTWARE REQUIREMENTS SPECIFICATION - SRS)
**Dự án**: Hệ thống Đặt & Quản lý Đồ uống Trực tuyến BrewLite Coffee  
**Môn học**: Công nghệ Phần mềm — Assignment 2  
**Phiên bản**: Ver 1.0  
**Chuẩn phân loại**: MoSCoW (Must, Should, Could, Won't)  

---

## 1. Sơ Đồ Use-Case Tổng Quát Toàn Hệ Thống

```mermaid
graph TD
    subgraph Actors["Tác Nhân Hệ Thống (Actors)"]
        Customer["Khách Hàng (Customer)"]
        Staff["Nhân Viên Quầy (Barista / Staff)"]
        Admin["Quản Trị Viên (Admin)"]
        PaymentGW["Cổng Thanh Toán (Mock Gateway)"]
    end

    subgraph System["Hệ Thống BrewLite Coffee"]
        UC01["UC-01: Xem & Tìm Kiếm Thực Đơn"]
        UC02["UC-02: Tùy Chọn Size & Topping"]
        UC03["UC-03: Quản Lý Giỏ Hàng"]
        UC04["UC-04: Đăng Ký & Đăng Nhập (JWT)"]
        UC05["UC-05: Đặt & Tạo Đơn Hàng"]
        UC06["UC-06: Thanh Toán Trực Tuyến (Idempotency)"]
        UC07["UC-07: Xem Lịch Sử & Chi Tiết Đơn"]
        UC08["UC-08: Hủy Đơn Hàng Hợp Lệ"]
        UC09["UC-09: Đánh Giá & Nhận Xét Món Ăn"]
        UC10["UC-10: Barista Xem Danh Sách & Công Thức Pha Chế"]
        UC11["UC-11: Cập Nhật Vòng Đời Đơn Hàng (State Machine)"]
        UC12["UC-12: Quản Lý Tồn Kho & Kiểm Soát Tranh Chấp (OCC)"]
        UC13["UC-13: Xem Báo Cáo Thống Kê & Doanh Thu"]
        UC14["UC-14: Quản Lý Tài Khoản & Nhân Viên"]
    end

    Customer --> UC01
    Customer --> UC02
    Customer --> UC03
    Customer --> UC04
    Customer --> UC05
    Customer --> UC06
    Customer --> UC07
    Customer --> UC08
    Customer --> UC09

    Staff --> UC04
    Staff --> UC10
    Staff --> UC11

    Admin --> UC04
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14

    PaymentGW --> UC06
```

---

## 2. Bảng Yêu Cầu Chức Năng (Functional Requirements - FR)

| Mã FR | Tên chức năng | Mô tả chi tiết | Mức ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria - AC) |
|:---:|---|---|:---:|---|
| **FR-01** | **Duyệt & Tìm kiếm Thực đơn (Menu)** | Hiển thị danh sách đồ uống phân theo danh mục (Cà phê, Trà, Đá xay); hỗ trợ tìm kiếm theo tên và lọc theo danh mục. | **Must** | • API `GET /api/products` trả về status 200 kèm danh sách sản phẩm và các biến thể.<br>• Phản hồi dưới 200ms.<br>• Có trạng thái Loading khi tải và Empty state khi không tìm thấy kết quả. |
| **FR-02** | **Xem Chi tiết & Biến thể sản phẩm** | Xem thông tin chi tiết một món đồ uống, danh sách kích cỡ (Size S/M/L) kèm mức giá tương ứng và các tùy chọn topping. | **Must** | • API `GET /api/products/:id` trả về thông tin món, ảnh, mô tả và bảng giá size.<br>• API `GET /api/products/toppings` trả về đầy đủ các loại topping có sẵn. |
| **FR-03** | **Quản lý Giỏ hàng (Cart)** | Cho phép khách hàng thêm món, tăng/giảm số lượng, chọn size/topping, tự động tính tổng tiền tạm tính. | **Must** | • Giỏ hàng được lưu trữ persistent (Local Storage) ở client.<br>• Cập nhật tổng tiền tức thời khi thay đổi số lượng hoặc chọn topping. |
| **FR-04** | **Xác thực & Phân quyền (Auth)** | Đăng ký tài khoản mới, Đăng nhập hệ thống, cấp phát JWT Access Token và Refresh Token; phân định rõ Role: `CUSTOMER`, `STAFF`, `ADMIN`. | **Must** | • API `POST /api/auth/register` mã hóa mật khẩu bằng Bcrypt 10 rounds.<br>• API `POST /api/auth/login` trả về access token có hạn dùng hợp lý và thông tin user kèm Role.<br>• Chặn truy cập trái phép bằng `JwtAuthGuard` và `RolesGuard` với HTTP 401/403. |
| **FR-05** | **Áp dụng Mã Khuyến Mãi (Voucher)** | Khách hàng nhập mã giảm giá (voucher) để được khấu trừ tiền hàng theo % hoặc số tiền cố định. | **Should** | • API `POST /api/promotions/validate` kiểm tra tính hợp lệ của mã, hạn sử dụng và giá trị đơn tối thiểu.<br>• Trả về số tiền được giảm chính xác. |
| **FR-06** | **Tạo Đơn Hàng (Create Order)** | Khách hàng xác nhận giỏ hàng để tạo đơn hàng mới ở trạng thái khởi tạo `PENDING`. | **Must** | • API `POST /api/orders` tạo đơn hàng thành công (HTTP 201).<br>• Lưu chi tiết từng món (`OrderItem`), size, topping và tổng tiền vào Database. |
| **FR-07** | **Thanh Toán Đảm Bảo Idempotency (Task 8)** | Thực hiện thanh toán cho đơn hàng qua Cổng thanh toán mô phỏng kèm theo tiêu đề `x-idempotency-key`. | **Must** | • Request lần 1: Thanh toán thành công, đơn chuyển sang `PAID` (HTTP 201, `replayed: false`).<br>• Request lần 2 (cùng key): Hệ thống phát hiện trùng lặp, trả về kết quả cũ mà không trừ tiền lần 2 (HTTP 200, `replayed: true`). |
| **FR-08** | **Máy Trạng Thái Đơn Hàng (State Machine - Task 9)** | Vòng đời đơn hàng phải chuyển tuần tự theo đúng quy trình nghiệp vụ: `PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`. | **Must** | • Nhân viên quầy nhận đơn: `PAID` ➔ `PREPARING` (API `/staff/orders/:id/accept`).<br>• Pha xong: `PREPARING` ➔ `READY` (API `/staff/orders/:id/ready`).<br>• Giao nước: `READY` ➔ `COMPLETED` (API `/staff/orders/:id/complete`).<br>• **Chặn nhảy cóc**: Mọi hành vi chuyển trạng thái sai quy tắc (VD: `PENDING` ➔ `COMPLETED`) đều bị chặn đứng với mã lỗi `HTTP 409 Conflict`. |
| **FR-09** | **Kiểm Soát Tranh Chấp Kho (Optimistic Locking - Task 10.3)** | Trừ kho nguyên liệu khi đơn hàng được thanh toán, sử dụng khóa lạc quan (OCC) để chống tình trạng bán âm kho. | **Must** | • Mỗi nguyên liệu (`Ingredient`) có cột `version`.<br>• Khi 2 khách cùng mua 1 ly cà phê cuối cùng: Khách 1 thanh toán thành công, Khách 2 bị chặn lại với `HTTP 409 Conflict` (Thông báo hết hàng) mà không làm âm kho. |
| **FR-10** | **Xem Lịch Sử & Chi Tiết Đơn Hàng** | Khách hàng xem danh sách các đơn hàng đã đặt và theo dõi tiến độ pha chế của từng đơn theo thời gian thực. | **Must** | • API `GET /api/orders/me` trả về danh sách đơn của chính tài khoản đó.<br>• API `GET /api/orders/:id` trả về chi tiết món và trạng thái hiện tại. |
| **FR-11** | **Hủy Đơn Hàng (Cancel Order)** | Cho phép khách hàng hủy đơn hàng khi đơn chưa được chế biến (ở trạng thái `PENDING` hoặc `PAYMENT_FAILED`). | **Should** | • API `POST /api/orders/:id/cancel` chuyển trạng thái đơn sang `CANCELLED`.<br>• Không cho phép hủy khi đơn đã được Barista nhận pha chế (`PREPARING`). |
| **FR-12** | **Đánh Giá & Nhận Xét Món Ăn (Reviews)** | Khách hàng viết đánh giá (1-5 sao kèm bình luận) cho các sản phẩm đã mua thành công. | **Could** | • Kiểm tra điều kiện đã từng mua sản phẩm (`KiemTraDaMua`).<br>• Hỗ trợ tạo mới, cập nhật và xóa đánh giá cá nhân. |
| **FR-13** | **Quản Trị Hệ Thống & Báo Cáo (Admin Portal)** | Bảng điều khiển dành cho Quản lý cửa hàng: Xem biểu đồ doanh thu, thống kê top đồ uống bán chạy, quản lý tồn kho nguyên liệu. | **Should** | • API `GET /api/admin/stats/overview` và `GET /api/admin/stats/revenue` trả về số liệu chuẩn xác.<br>• Hỗ trợ nhập và cập nhật kho nguyên liệu (`PATCH /api/admin/ingredients/:id`). |

---

## 3. Bảng Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)

| Mã NFR | Phân nhóm | Mô tả yêu cầu | Mức ưu tiên | Tiêu chí chấp nhận & Đo lường (Verification) |
|:---:|---|---|:---:|---|
| **NFR-01** | **Hiệu Năng (Performance)** | Thời gian phản hồi của các API truy vấn dữ liệu (Menu, Chi tiết món, Lịch sử) phải nhanh chóng, tối ưu hóa trải nghiệm người dùng di động. | **Must** | • 95% số lượng request đọc (Read requests) có thời gian phản hồi ≤ 200ms trong điều kiện mạng thông thường.<br>• Thời gian phản hồi trung bình qua Newman CLI ≤ 50ms. |
| **NFR-02** | **Bảo Mật (Security)** | Đảm bảo tính toàn vẹn dữ liệu, chống tấn công phổ biến (SQL Injection, XSS, CSRF) và bảo vệ thông tin đăng nhập. | **Must** | • Toàn bộ mật khẩu lưu trữ trong CSDL phải được băm bằng thuật toán **Bcrypt với Salt rounds = 10**.<br>• Mọi API nhạy cảm phải yêu cầu JWT Bearer Token hợp lệ.<br>• Phân quyền chặt chẽ giữa khách hàng và nhân viên quầy. |
| **NFR-03** | **Tính Khả Dụng & Trải Nghiệm (Usability & PWA)** | Ứng dụng Frontend thiết kế theo định hướng Mobile-First, giao diện thích ứng mượt mà trên màn hình di động (Responsive). | **Must** | • Đạt điểm Google Lighthouse Accessibility ≥ 90.<br>• Cung cấp đầy đủ trạng thái tương tác: Loading spinner, Empty state thông báo rõ ràng, Error boundary bắt lỗi thân thiện. |
| **NFR-04** | **Toàn Vẹn Dữ Liệu & Giao Dịch (Data Integrity)** | Các thao tác tạo đơn, trừ tiền và trừ kho nguyên liệu phải đảm bảo tính chất **ACID Transaction**. | **Must** | • Sử dụng Prisma Interactive Transaction (`prisma.$transaction`).<br>• Không bao giờ để xảy ra tình trạng: Tiền đã trừ nhưng kho không cập nhật, hoặc kho bị trừ âm. |
| **NFR-05** | **Khả Năng Triển Khai (Deployability & DevOps)** | Toàn bộ mã nguồn phải có khả năng đóng gói bằng Docker và triển khai tự động qua quy trình CI/CD. | **Must** | • Có `docker-compose.yml` khởi chạy đồng thời Web, API và Database ở local bằng 1 lệnh duy nhất.<br>• Pipeline GitHub Actions tự động kiểm tra Lint, Test và Build trên mỗi Pull Request. |
| **NFR-06** | **Giám Sát & Sức Khỏe Hệ Thống (Observability)** | Hệ thống phải có cơ chế kiểm tra tình trạng sống (Liveness/Readiness) phục vụ giám sát container và tự động phục hồi. | **Must** | • Cung cấp endpoint `GET /api/health` và `GET /health` trả về trạng thái hoạt động của server và kết nối CSDL (HTTP 200 OK). |
