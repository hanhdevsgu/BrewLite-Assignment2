# ADR 002: Lựa Chọn NestJS Làm Nền Tảng Backend RESTful API
**Trạng thái**: Accepted (Đã chấp thuận)  
**Ngày quyết định**: 13/10/2026  
**Người quyết định**: Nhóm phát triển BrewLite  

---

## 1. Bối Cảnh (Context)
Hệ thống BrewLite đòi hỏi một máy chủ Backend có cấu trúc chặt chẽ, hỗ trợ Dependency Injection, xử lý phân quyền phức tạp (Role-Based Access Control), xác thực JWT và tích hợp tự động với tài liệu OpenAPI/Swagger phục vụ nghiệm thu.

## 2. Quyết Định (Decision)
Lựa chọn **NestJS Framework (TypeScript)** chạy trên nền Node.js làm kiến trúc chính cho tầng Backend API.

## 3. Lý Do & Hệ Quả (Consequences & Trade-offs)
- **Ưu điểm**:
  - Kiến trúc phân rã theo Module rõ ràng (`AuthModule`, `ProductsModule`, `OrdersModule`, `PaymentModule`, `StaffModule`, `AdminModule`).
  - Hỗ trợ cơ chế Guard (`JwtAuthGuard`, `RolesGuard`), Interceptor và Exception Filter toàn cục giúp xử lý lỗi phòng thủ (Defensive Programming).
  - Tích hợp sẵn Swagger Module (`@nestjs/swagger`), tự động sinh tài liệu API trực quan tại `/api/docs` từ mã nguồn TypeScript và Decorator.
- **Hạn chế**:
  - Đường cong học tập ban đầu cao hơn so với Express.js truyền thống do yêu cầu hiểu biết về Dependency Injection và Decorators.
