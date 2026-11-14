# Release Notes — BrewLite `v1.0.0`

**Ngày phát hành**: 14/11/2026  
**Nhánh / Tag**: `develop` → `v1.0.0`  
**Phạm vi**: Hoàn thành Assignment 2 (Requirements to Deployment — Task 1 đến Task 5)

---

## 1. Tính năng nổi bật (MVP Sprint 1 & Sprint 2)
- **Thực đơn & Tùy chọn đồ uống (Next.js PWA Mobile-First)**:
  - Duyệt danh mục, tìm kiếm, xem chi tiết món, chọn kích cỡ (`S/M/L`), topping, mức đường/đá.
  - Hỗ trợ đầy đủ trạng thái Loading, Empty và Error.
- **Xác thực & Phân quyền (NestJS + JWT + Bcrypt)**:
  - Đăng ký, đăng nhập, làm mới token, đổi mật khẩu, phân quyền `CUSTOMER`, `STAFF`, `ADMIN`.
- **Đặt đơn & Thanh toán Idempotent**:
  - Khởi tạo đơn hàng (`POST /api/orders`) hỗ trợ mã khuyến mãi và điểm thưởng (`loyaltyPointsToUse`).
  - Thanh toán chống trùng lặp qua header `Idempotency-Key` (`POST /api/payments`), tích hợp đồng bộ MBBank VietQR mô phỏng.
  - Khấu trừ kho nguyên liệu theo công thức bằng **Optimistic Concurrency Control (`version`)** với retry tối đa 3 lần, ngăn xuất vượt quá tồn kho.
  - Hủy đơn hàng (`POST /api/orders/:id/cancel`) ở trạng thái `PENDING`/`PAID` tự động hoàn kho, hoàn tiền và thu hồi điểm Loyalty.
- **Quầy pha chế (Barista) & Quản trị (Admin)**:
  - Bảng Kanban pha chế theo FIFO, xem công thức định lượng từng ly, máy trạng thái nghiêm ngặt (`PAID → PREPARING → READY → COMPLETED`).
  - Thống kê doanh thu, quản lý kho & phiếu nhập, sản phẩm & công thức, mã khuyến mãi, kiểm duyệt đánh giá và quản lý tài khoản.

## 2. Kiểm thử & Chất lượng
- Unit & Integration tests Backend (`backend/src/**/*.spec.ts`): Auth, Order State Machine, Orders, Payment (Idempotency & OCC), Promotions, Staff.
- End-to-End test (`tests/e2e/order-checkout.e2e-spec.ts`).
- Health Check endpoint: `GET /health` và `GET /api/health`.
- CI/CD Workflows: `.github/workflows/ci.yml` (Install → Lint → Test → Build) và `.github/workflows/cd.yml` (Docker Build/Push `ghcr.io` → Deploy → Smoke Test → Rollback).

## 3. Tài liệu & Sơ đồ đồng bộ
- **Task 1**: `docs/requirements/context-and-scope.md`, `srs.md`, `use-case-checkout.md`, Use-case `01` (Tổng quát) & `03` (Trọng tâm).
- **Task 2**: Activity (`activity-end-to-end.drawio`), Sequence (`docs/sequence.drawio`), Class (`class-diagram.drawio`).
- **Task 3**: `docs/architecture/architecture.md`, 5 ADR (`001..005`), Deployment (`deployment-diagram.drawio`, `docs/deployment.md`).
- **Truy vết & Vận hành**: `docs/traceability-matrix.md`, `docs/rollback-guide.md`.
