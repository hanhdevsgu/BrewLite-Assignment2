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
| **Frontend PWA (Next.js)** | 3000 | 3000 (Local) / 443 (Prod) | HTTP / HTTPS | Công khai cho người dùng qua SSL TLS 1.3 |
| **Backend API (NestJS)** | 3001 | 3001 (Local) / 443 (Prod) | HTTP / HTTPS | Yêu cầu JWT Bearer Token cho các API nghiệp vụ |
| **Database (PostgreSQL)** | 5432 | 5432 (Local) / **KHÔNG PUBLIC** (Prod) | TCP (PostgreSQL) | Chỉ cho phép Backend kết nối nội bộ qua mạng Docker |
| **Health Check Endpoint** | 3001 | `/api/health` hoặc `/health` | HTTP / HTTPS | Trả về `HTTP 200 { status: 'ok', database: 'connected' }` |

---

## 3. Quản Lý Biến Môi Trường (Secret & Environment Variables)

> [!IMPORTANT]
> Toàn bộ thông tin nhạy cảm (JWT Secret, Database Password) **tuyệt đối không được commit lên GitHub công khai**, mà được quản lý qua file `.env` local hoặc GitHub Repository Secrets trong CI/CD.

### Bảng biến môi trường chuẩn (`.env`):
```env
# Database Connection (Docker Local hoặc Cloud Host)
DATABASE_URL="postgresql://postgres:postgrespassword@127.0.0.1:5432/brewlite_db?schema=public"

# Backend Configuration
PORT=3001
NODE_ENV=production

# JWT Authentication Secrets
JWT_SECRET="brewlite_super_secret_jwt_key_2026"
JWT_REFRESH_SECRET="brewlite_refresh_secret_key_2026"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Frontend Integration
FRONTEND_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

## 4. Hướng Dẫn Khởi Chạy Local Bằng Docker Compose (Chỉ Cần 1 Lệnh)

### 4.1. Khởi chạy toàn bộ hệ thống
Mở terminal tại thư mục gốc của dự án:
```bash
# 1. Khởi chạy container PostgreSQL
docker compose up -d postgres

# 2. Đồng bộ lược đồ CSDL và nạp dữ liệu mẫu ban đầu (Seed)
npm run db:setup

# 3. Khởi chạy đồng thời cả Frontend và Backend
npm run dev
```

### 4.2. Kiểm tra trạng thái hoạt động:
- **Giao diện người dùng**: Truy cập `http://localhost:3000`
- **Tài liệu Swagger API**: Truy cập `http://localhost:3001/api/docs`
- **Kiểm tra sức khỏe hệ thống (Health Check)**: Truy cập `http://localhost:3001/api/health`

---

## 5. Quy Trình Triển Khai Production (Cloudflare Tunnel / Cloud Host)

Dự án hỗ trợ triển khai ra Internet bảo mật có HTTPS thông qua **Cloudflare Tunnel**:
1. Khởi chạy Backend và Frontend ở chế độ Production:
   ```bash
   npm run build
   npm run start
   ```
2. Khởi chạy đường hầm bảo mật HTTPS:
   ```bash
   node scripts/tunnel.js
   ```
3. Cloudflare cấp phát URL HTTPS công khai (ví dụ: `https://brewlite.trycloudflare.com`), tự động mã hóa đầu cuối và chặn hoàn toàn truy cập trực tiếp vào CSDL.

