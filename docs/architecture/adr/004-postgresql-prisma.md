# ADR 004: Sử Dụng PostgreSQL 16 & Prisma ORM Cho Quản Lý Dữ Liệu Giao Dịch
**Trạng thái**: Accepted (Đã chấp thuận)  
**Ngày quyết định**: 13/10/2026  
**Người quyết định**: Nhóm phát triển BrewLite  

---

## 1. Bối Cảnh (Context)
Dự án có các nghiệp vụ tài chính và kho hàng quan trọng: Tạo đơn, áp dụng khuyến mãi, thanh toán, khấu trừ tồn kho nguyên liệu. Dữ liệu đòi hỏi tính toàn vẹn cao, quan hệ chặt chẽ giữa các thực thể và bắt buộc phải hỗ trợ ACID Transaction để ngăn ngừa sai lệch tài chính và âm kho.

## 2. Quyết Định (Decision)
Lựa chọn hệ quản trị cơ sở dữ liệu quan hệ **PostgreSQL 16** kết hợp với **Prisma ORM**:
- Chạy PostgreSQL trong Docker Container ở môi trường phát triển và kiểm thử.
- Sử dụng Prisma Client để sinh TypeScript Types tự động, quản lý Schema và Migration.

## 3. Lý Do & Hệ Quả (Consequences & Trade-offs)
- **Ưu điểm**:
  - Đảm bảo tính toàn vẹn dữ liệu quan hệ (Foreign Keys, Constraints, Enums).
  - Hỗ trợ Interactive Transactions (`prisma.$transaction`) thực hiện nhiều thao tác CSDL nguyên tử.
  - Tích hợp kiểm soát phiên bản `version` hỗ trợ thuật toán Optimistic Concurrency Control (OCC).
  - Tự động hóa việc tạo và chạy seed dữ liệu mẫu phục vụ kiểm thử nhanh chóng.
- **Hạn chế**:
  - Cần duy trì cấu hình môi trường Docker cho PostgreSQL trong cả quy trình phát triển local lẫn pipeline CI.
