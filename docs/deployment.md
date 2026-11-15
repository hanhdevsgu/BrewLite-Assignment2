# TÀI LIỆU HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG (DEPLOYMENT GUIDE)
**Dự án**: Hệ thống Đặt & Quản lý Đồ uống Trực tuyến BrewLite Coffee  
**Môn học**: Công nghệ Phần mềm — Assignment 2 (Task 3.2 & Task 5.4)  
**Phiên bản**: Ver 1.0  

---

## 1. Mô Hình Triển Khai Thực Tế (Deployment Architecture)

Hệ thống BrewLite được thiết kế để triển khai linh hoạt giữa 3 môi trường phân định rõ ràng:

```mermaid
graph LR
    subgraph LocalEnv["1. Môi Trường Local Development"]
        LocalWeb["Next.js Web (localhost:3000)"]
        LocalApi["NestJS API (localhost:3001)"]
        LocalDB["Docker PostgreSQL (localhost:5432)"]
    end

    subgraph CIEnv["2. Môi Trường CI / Quality Gate"]
        GitHubActions["GitHub Actions Runner"]
        TestDB["PostgreSQL Service Container (CI)"]
        UnitTests["Jest Unit & Integration Tests"]
    end

    subgraph ProdEnv["3. Môi Trường Production Live"]
        Cloudflare["Cloudflare SSL / Tunnel (HTTPS 443)"]
        ProdWeb["Frontend Container / Host"]
        ProdApi["Backend Container / Host (Health: /api/health)"]
        ProdDB["PostgreSQL Isolated Database (Internal Network)"]
    end

    LocalEnv -->|Git Push & Pull Request| CIEnv
    CIEnv -->|Merge to develop/main & Release Tag| ProdEnv
```

---

## 2. Thông Tin Cấu Hình & Các Cổng Mạng (Network & Ports)

| Dịch vụ / Container | Cổng nội bộ (Internal) | Cổng bên ngoài (Host/Public) | Giao thức | Bảo mật & Phân quyền |
|---|:---:|:---:|:---:|---|
| **Frontend Web (`brewlite_frontend`, Next.js 14.2.5)** | 3000 | 3000 (Local) / 443 (Prod HTTPS Edge) | HTTP / HTTPS | Công khai qua Cloudflare Tunnel (`cloudflared` TLS 1.3) / Reverse Proxy; xử lý `/mbbank-sync` & rewrite `/api/:path*` nội bộ sang `:3001` |
| **Backend API (`brewlite_backend`, `dist/src/main.js`)** | 3001 | 3001 (Local) / Internal Only (Prod) | HTTP (`brewlite_network`) | Nhận API từ `brewlite_frontend` (hoặc `:3001` local); JWT Bearer (`15m`/`7d`), RBAC, `AllExceptionsFilter`, `MockGatewayService` nội bộ |
| **Database (`brewlite_postgres`, PostgreSQL 16)** | 5432 | 5432 (Local) / **KHÔNG PUBLIC** (Prod) | TCP/IP | Chỉ cho phép `brewlite_backend` kết nối nội bộ qua `brewlite_network` + Volume `brewlite_postgres_data` (`/var/lib/postgresql/data`) |
| **Health Check Endpoint** | 3001 | `/api/health` hoặc `/health` | HTTP / HTTPS | Trả về `HTTP 200 { status, timestamp, uptime, database, service, version }` (`SELECT 1`) |
| **CI/CD & Container Registry** | — | GitHub Actions (`ci.yml`, `cd.yml`) | HTTPS | Đóng gói đa tầng `node:20-alpine` đẩy lên `ghcr.io` (`brewlite-backend`, `brewlite-frontend`), smoke test `/api/health` |

---

## 3. Quản Lý Biến Môi Trường (Secret & Environment Variables)

> [!IMPORTANT]
> Toàn bộ thông tin nhạy cảm (JWT Secret, Database Password, `DEPLOY_WEBHOOK_URL`) **tuyệt đối không được commit lên GitHub công khai**, mà được quản lý qua file `.env` local hoặc GitHub Repository Secrets / PaaS Environment trong CI/CD.

### Bảng biến môi trường chuẩn (`.env`):
```env
# Database Connection (Docker dùng host postgres:5432, Local host dùng 127.0.0.1:5432)
DATABASE_URL="postgresql://postgres:postgrespassword@127.0.0.1:5432/brewlite_db?schema=public"

# Backend Configuration
PORT=3001
NODE_ENV=production

# JWT Authentication Secrets
JWT_SECRET="brewlite_super_secret_jwt_key_2026"
JWT_REFRESH_SECRET="brewlite_refresh_secret_key_2026"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Frontend Integration & Next.js Rewrite
FRONTEND_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
INTERNAL_BACKEND_URL="http://backend:3001/api/:path*"
```

---

## 4. Hướng Dẫn Khởi Chạy Local Bằng Docker Compose

### 4.1. Khởi chạy toàn bộ 3 container (Chỉ 1 lệnh)
Mở terminal tại thư mục gốc của dự án để khởi động đồng bộ PostgreSQL 16 (kèm Persistent Volume `brewlite_postgres_data` tại `/var/lib/postgresql/data` và healthcheck `pg_isready`), Backend NestJS (`:3001`) và Frontend Next.js (`:3000`):
```bash
npm run docker:all
# Hoặc build lại toàn bộ image từ Dockerfile:
npm run docker:build
```

### 4.2. Chế độ phát triển Hybrid (Chỉ DB trong Docker, Code chạy hot-reload)
```bash
# 1. Khởi chạy container PostgreSQL
npm run docker:up

# 2. Đồng bộ lược đồ CSDL (17 bảng) và nạp dữ liệu mẫu (Seed)
npm run db:setup

# 3. Mở 2 terminal chạy song song Backend & Frontend
npm run dev:backend
npm run dev:frontend
```

### 4.3. Kiểm tra trạng thái hoạt động:
- **Giao diện người dùng**: Truy cập `http://localhost:3000` (hoặc `/mbbank` cho trang mô phỏng VietQR)
- **Tài liệu Swagger API**: Truy cập `http://localhost:3001/api/docs`
- **Kiểm tra sức khỏe hệ thống (Health Check)**: Truy cập `http://localhost:3001/api/health`

---

## 5. Quy Trình Triển Khai Production (Cloudflare Tunnel / CI-CD & Cloud Host)

Dự án hỗ trợ 2 phương thức công bố Production:
1. **CI/CD Tự động qua GitHub Actions (`cd.yml`)**: Push lên `main` hoặc gắn tag `v*.*.*` sẽ chạy Quality Gate -> build & push Docker image (`brewlite-backend`, `brewlite-frontend`) lên `ghcr.io` -> gọi `DEPLOY_WEBHOOK_URL` -> chạy smoke test `PROD_HEALTH_URL` (`/api/health`).
2. **Triển khai qua Cloudflare Tunnel (`scripts/tunnel.js`)** từ máy chủ / VPS:
   ```bash
   # Biên dịch và khởi chạy Production tại thư mục gốc
   npm run build:backend
   npm run build:frontend
   npm --prefix apps/api run start:prod   # Chạy node dist/src/main
   npm run start:frontend
   ```
   Sau đó mở đường hầm HTTPS TLS 1.3 (port 443 -> Next.js `:3000`, Next.js rewrite `/api/:path*` nội bộ sang `:3001`):
   ```bash
   npm run tunnel
   ```
   Cloudflare cấp phát URL HTTPS công khai (ví dụ: `https://brewlite.trycloudflare.com`), mã hóa TLS 1.3 và không phơi bày cổng PostgreSQL `5432` ra ngoài Internet.

