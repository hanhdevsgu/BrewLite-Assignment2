# BIÊN BẢN SPRINT REVIEW & SPRINT RETROSPECTIVE
**Dự án**: Hệ thống Đặt & Quản lý Đồ uống Trực tuyến BrewLite Coffee  
**Môn học**: Công nghệ Phần mềm — Assignment 2 (Task 5.4)  
**Phương pháp áp dụng**: Scrum / Agile Software Development  

---

## 1. SPRINT 1: NỀN TẢNG KỸ THUẬT & MVP XEM THỰC ĐƠN (WEEKS 1 - 2)

### 1.1. Mục Tiêu Sprint (Sprint Goal)
Xây dựng nền tảng kỹ thuật vững chắc (Monorepo, Docker PostgreSQL, NestJS Backend, Next.js Frontend), thiết lập quy trình CI cơ bản và phát hành phiên bản MVP đầu tiên phục vụ tính năng duyệt Menu đồ uống trên thiết bị di động.

### 1.2. Kết Quả Nghiệm Thu (Sprint Review)
- **Tạo phẩm đạt được**:
  - Khởi tạo thành công repository monorepo với cấu trúc phân tầng `frontend/`, `backend/`, `docs/`.
  - Cấu hình file `docker-compose.yml` khởi chạy PostgreSQL 16.
  - Hiện thực API danh mục và đồ uống: `GET /api/products`, `GET /api/products/:id`, `GET /api/products/toppings`.
  - Giao diện thực đơn Mobile-First bằng Next.js: Hỗ trợ tìm kiếm, lọc danh mục, hiển thị đầy đủ trạng thái Loading và Empty state.
  - Seed dữ liệu chuẩn gồm 12 món đồ uống và kho nguyên liệu ban đầu.
- **Tình trạng nghiệm thu**: **100% Hoàn thành (Accepted)**.

### 1.3. Đánh Giá Cải Tiến (Sprint Retrospective)
| Phân loại | Nội dung chi tiết |
|---|---|
| **What went well (Làm tốt)** | • Giao diện Mobile-First (kèm `manifest.webmanifest`) hiển thị rõ ràng, mượt mà trên cả trình duyệt mobile và desktop.<br>• Phân chia nhiệm vụ rõ ràng trong `docs/TASK-ALLOCATION.md` và đối soát `docs/traceability-matrix.md`. |
| **What could be improved (Cần cải thiện)** | • Cần thiết lập sớm quy trình kiểm thử tự động CI ngay từ Sprint đầu để tránh lỗi tích hợp.<br>• Tài liệu thiết kế lúc đầu còn để phân tán, cần gom nhóm chuẩn hóa theo thư mục `docs/`. |
| **Action Items (Hành động cho Sprint 2)** | • Bổ sung bộ kiểm thử tự động toàn diện (Jest Unit Test + Postman Collection).<br>• Tập trung xử lý các nghiệp vụ phức tạp: Idempotent Payment, State Machine và Optimistic Locking. |

---

## 2. SPRINT 2: HOÀN THIỆN NGHIỆP VỤ LÕI, CI/CD & DELIVERY (WEEKS 3 - 4)

### 2.1. Mục Tiêu Sprint (Sprint Goal)
Hoàn thành luồng mua hàng và xử lý đơn hàng trọn vẹn (End-to-End: Giỏ hàng ➔ Đặt đơn ➔ Thanh toán Idempotent ➔ Barista nhận đơn ➔ Giao hàng), xử lý chống bán âm kho (OCC), thiết lập pipeline CI/CD và bàn giao hệ thống kèm kịch bản kiểm thử bảo vệ đồ án.

### 2.2. Kết Quả Nghiệm Thu (Sprint Review)
- **Tạo phẩm đạt được**:
  - Hoàn thiện module Xác thực JWT (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`), băm mật khẩu Bcrypt 10 rounds, phân quyền 3 Role (`CUSTOMER`, `STAFF`, `ADMIN`).
  - Hiện thực **Task 8 (Idempotent Payment)**: Header `Idempotency-Key` (`idempotency-key`) xử lý click đúp an toàn (Lần 1 trả HTTP 201, Lần 2 trả HTTP 200 Replayed).
  - Hiện thực **Task 9 (Order State Machine)**: Chuyển đổi trạng thái đơn tuần tự từ `PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`, chặn đứng nhảy cóc với `HTTP 409 Conflict`.
  - Hiện thực **Task 10.3 (Optimistic Concurrency Control)**: Cột `version` trong bảng `Ingredient` chống bán âm kho khi 2 khách hàng cùng tranh mua ly cà phê cuối cùng.
  - Bộ kiểm thử tự động hoàn chỉnh: **11 Unit test suites Jest (`113` tests pass 100%)** + **NestJS HTTP Integration Suite (`backend/test/app.e2e-spec.ts` — 8 test cases pass)** + **Full-Stack E2E (`tests/e2e/order-checkout.e2e-spec.ts` — 8 cases)** + **Postman Collection 49 API requests**.
  - Pipeline GitHub Actions CI/CD (`.github/workflows/ci.yml`, `cd.yml`).
  - Toàn bộ hồ sơ tài liệu theo chuẩn Assignment 2: `context-and-scope.md`, `srs.md`, `use-case-checkout.md`, `architecture.md`, 5 file ADR, `traceability-matrix.md`, `deployment.md`, `rollback-guide.md`.
- **Tình trạng nghiệm thu**: **100% Hoàn thành (Accepted)**.

### 2.3. Đánh Giá Cải Tiến (Sprint Retrospective)
| Phân loại | Nội dung chi tiết |
|---|---|
| **What went well (Làm tốt)** | • Giải quyết triệt để các bài toán kỹ thuật trọng tâm (Idempotency-Key chống trừ trùng, Optimistic Locking chống âm kho, Order State Machine, `KiemTraDaMua` chỉ mở đánh giá sau `COMPLETED`).<br>• Chuẩn hóa bộ Postman Collection 49 API requests (`docs/BrewLite_Full_API_Collection.postman_collection.json`), Supertest Integration Suite (`npm --prefix backend run test:e2e`) và E2E full-stack (`tests/e2e/order-checkout.e2e-spec.ts`).<br>• Ma trận truy vết (`docs/traceability-matrix.md`) đồng bộ giữa yêu cầu, sơ đồ UML và mã nguồn. |
| **What we learned (Bài học rút ra)** | • Hiểu sâu sắc về thiết kế hệ thống phân tán, cơ chế khóa lạc quan (OCC) và tầm quan trọng của việc kiểm thử phòng thủ (Defensive Programming). |
| **Conclusion (Kết luận)** | Hệ thống BrewLite Coffee đã sẵn sàng 100% cho buổi bảo vệ đồ án trước Hội đồng chấm thi môn Công nghệ Phần mềm! |

