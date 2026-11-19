# 🌳 Sơ Đồ Cây Dự Án BrewLite (Assigment2 - Monorepo)

```text
Assigment2/
├── .github/                  # CI/CD GitHub Actions (lint, migrate, seed, test)
├── apps/
│   ├── backend/              # NestJS 10 REST API
│   │   ├── prisma/           # schema.prisma, migrations/, seed.ts, reset-orders.ts
│   │   └── src/
│   │       ├── common/       # Guards (JwtAuthGuard, RolesGuard), Decorators
│   │       ├── prisma/       # PrismaService (kết nối DB)
│   │       └── modules/      # auth, products, orders, payment, staff, admin
│   └── frontend/             # Next.js 14 App Router (Web App)
├── docs/                     # Tài liệu & Postman Collections
├── scripts/                  # Script test đồng thời
├── docker-compose.yml        # Chạy 3 container (postgres, backend, frontend)
└── render.yaml               # Cấu hình deploy Backend lên Render
```

---

## 📌 Bản Đồ Vị Trí Code Theo 10 Task (Ôn Bảo Vệ Nhanh)

| Task | Nội dung chính | File & Dòng (tầm) |
|---|---|---|
| **Task 1** | Khởi tạo Monorepo, DB Schema, Seed, Docker | `apps/backend/prisma/schema.prisma` · `apps/backend/prisma/seed.ts` · `docker-compose.yml` |
| **Task 2 & 3** | Menu, Tìm kiếm (`search`), Lọc (`category`), Phân trang | `apps/backend/src/modules/products/products.controller.ts` |
| **Task 4** | Chi tiết món, Size, Bảng giá & nguyên liệu Topping | `apps/backend/src/modules/products/constants/toppings.constant.ts` |
| **Task 5 & 6** | Đặt hàng, tính giá Server-side (Never Trust Client) | `apps/backend/src/modules/orders/orders.service.ts` |
| **Task 7** | Auth JWT (`accessToken`/`refreshToken`), RBAC | `apps/backend/src/modules/auth/auth.service.ts` · `apps/backend/src/common/guards/roles.guard.ts` |
| **Task 8** | Thanh toán, `Idempotency-Key`, MBBank Sync + Secret | `apps/backend/src/modules/payment/payment.controller.ts`<br>`apps/backend/src/modules/payment/payment.service.ts` (`mbbank-sync` & `x-mbbank-secret`) |
| **⭐ Task 9** | **Order State Machine & Audit Log gian lận** | `apps/backend/src/modules/orders/order-state-machine.ts` (`VALID_TRANSITIONS`)<br>`apps/backend/src/modules/staff/staff.controller.ts` (`@Roles(Role.STAFF)`)<br>`apps/backend/src/modules/staff/staff.service.ts` (chặn nhảy cóc & ghi `OrderStatusHistory`) |
| **⭐ Task 10** | **OCC Chống Âm Kho, Docker 3 container & Unit Test** | `apps/backend/src/modules/payment/payment.service.ts` (Retry + `version` + `stockQuantity >= qty`)<br>`docker-compose.yml` (`postgres`, `backend`, `frontend`)<br>`apps/backend/src/modules/*/*.spec.ts` (Unit Test Jest, chạy `npm test`) |
