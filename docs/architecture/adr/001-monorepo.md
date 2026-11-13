# ADR 001: Lựa Chọn Cấu Trúc Monorepo Cho Toàn Bộ Hệ Thống
**Trạng thái**: Accepted (Đã chấp thuận)  
**Ngày quyết định**: 13/10/2026  
**Người quyết định**: Nhóm phát triển BrewLite  

---

## 1. Bối Cảnh (Context)
Dự án BrewLite bao gồm cả ứng dụng giao diện người dùng (Frontend Web/PWA), máy chủ xử lý nghiệp vụ (Backend RESTful API) và toàn bộ tài liệu đặc tả, sơ đồ kiến trúc và kịch bản kiểm thử. Nhóm cần lựa chọn mô hình tổ chức mã nguồn: Monorepo (tất cả thành phần trong một repository duy nhất) hay Polyrepo (tách thành nhiều repository riêng biệt).

## 2. Quyết Định (Decision)
Quyết định áp dụng mô hình **Monorepo** với cấu trúc thư mục rõ ràng:
- `frontend/` (hoặc `apps/web`): Ứng dụng Next.js.
- `backend/` (hoặc `apps/api`): Ứng dụng NestJS.
- `docs/`: Toàn bộ tài liệu đặc tả yêu cầu, sơ đồ thiết kế, quyết định kiến trúc và ma trận truy vết.
- `.github/workflows/`: Quy trình CI/CD tích hợp tự động cho cả hệ thống.

## 3. Lý Do & Hệ Quả (Consequences & Trade-offs)
- **Ưu điểm**:
  - Dễ dàng đồng bộ phiên bản giữa API và giao diện; khi một API thay đổi, các DTO và component phía FE được cập nhật đồng thời trong cùng một commit.
  - Quản lý tài liệu và ma trận truy vết tập trung, thuận tiện cho việc nghiệm thu đồ án.
  - Thiết lập một pipeline CI duy nhất để kiểm tra chất lượng của cả hệ thống.
- **Hạn chế**:
  - Cần cấu hình file cấu hình Git, Docker và npm script cẩn thận để tránh xung đột dependencies giữa hai tầng ứng dụng.

