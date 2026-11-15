# Release Notes — BrewLite `v1.0.0`

**Ngày phát hành**: 14/11/2026  
**Nhánh / Tag**: `develop` → `v1.0.0`  
**Phạm vi**: Hoàn thành Assignment 2 (Requirements to Deployment — Task 1 đến Task 5)

---

## 1. Tính năng nổi bật (MVP Sprint 1 & Sprint 2)
- **Thực đơn & Tùy chọn đồ uống (Next.js Mobile-First + Web App Manifest)**:
  - Duyệt danh mục, tìm kiếm, xem chi tiết món, chọn kích cỡ (`S/M/L`), topping, mức đường/đá.
  - Hỗ trợ đầy đủ trạng thái Loading, Empty và Error.
- **Xác thực & Phân quyền (NestJS + JWT + Bcrypt)**:
  - Đăng ký, đăng nhập, làm mới token, đổi mật khẩu, phân quyền `CUSTOMER`, `STAFF`, `ADMIN`.
- **Đặt đơn & Thanh toán Idempotent**:
  - Khởi tạo đơn hàng (`POST /api/orders`) hỗ trợ mã khuyến mãi và điểm thưởng (`loyaltyPointsToUse`).
  - Thanh toán chống trùng lặp qua header `Idempotency-Key` (`POST /api/payments`), tích hợp đồng bộ MBBank VietQR mô phỏng.
  - Khấu trừ kho nguyên liệu theo công thức bằng **Optimistic Concurrency Control (`version`)** với retry tối đa 3 lần, ngăn xuất vượt quá tồn kho.
  - Hủy đơn hàng (`POST /api/orders/:id/cancel`) ở trạng thái `PENDING`/`PAYMENT_FAILED`/`PAID` hoàn điểm đã dùng; nếu đã `PAID` tự động hoàn kho, hoàn lượt voucher và thu hồi điểm Loyalty.
- **Quầy pha chế (Barista) & Quản trị (Admin)**:
  - Bảng Kanban pha chế theo FIFO, xem công thức định lượng từng ly, máy trạng thái nghiêm ngặt (`PAID → PREPARING → READY → COMPLETED`).
  - Thống kê doanh thu, quản lý kho & phiếu nhập, sản phẩm & công thức, mã khuyến mãi, kiểm duyệt đánh giá và quản lý tài khoản.

## 2. Kiểm thử & Chất lượng
- Unit tests Backend (`backend/src/**/*.spec.ts` — 11 suites / 113 tests): Auth (`15m`/`7d` JWT), Order State Machine, Orders, Payment (Idempotency & OCC), Promotions, Reviews (`KiemTraDaMua` bắt buộc `COMPLETED`), Staff.
- HTTP Integration tests (`backend/test/app.e2e-spec.ts` — 8 test cases via Supertest) & Full-Stack E2E (`tests/e2e/order-checkout.e2e-spec.ts` — 8 cases).
- Health Check endpoint: `GET /health` và `GET /api/health`.
- CI/CD Workflows: `.github/workflows/ci.yml` (Install → Lint → Unit & HTTP Integration Tests → Build) và `.github/workflows/cd.yml` (Quality Gate → Docker Build/Push `ghcr.io` → `prisma validate`/`migrate deploy` → Deploy → Smoke Test → Rollback).

## 3. Tài liệu & Sơ đồ đồng bộ
- **Task 1**: `docs/requirements/context-and-scope.md`, `srs.md`, `use-case-checkout.md`, Use-case `01` ([01-usecase-overall.drawio](./diagrams/usecases/01-usecase-overall.drawio)) & `03` ([03-subsystem-order-payment.drawio](./diagrams/usecases/03-subsystem-order-payment.drawio)).
- **Task 2**: Activity (`docs/diagrams/activity-end-to-end.drawio` / `.puml`), Sequence (`docs/diagrams/sequence-checkout.drawio` / `.puml`), Class (`docs/diagrams/class-diagram.drawio` / `.puml`).
- **Task 3**: `docs/architecture/architecture.md`, 5 ADR (`001..005`), Deployment (`docs/diagrams/deployment-diagram.drawio` / `.puml`, `docs/deployment.md`).
- **Truy vết & Vận hành**: `docs/traceability-matrix.md`, `docs/rollback-guide.md`.
