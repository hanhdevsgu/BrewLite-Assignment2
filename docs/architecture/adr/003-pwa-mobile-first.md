# ADR 003: Thiết Kế Frontend Theo Định Hướng Next.js Mobile-First & PWA
**Trạng thái**: Accepted (Đã chấp thuận)  
**Ngày quyết định**: 13/10/2026  
**Người quyết định**: Nhóm phát triển BrewLite  

---

## 1. Bối Cảnh (Context)
Khách hàng uống cà phê tại quán chủ yếu sử dụng điện thoại thông minh để quét mã QR tại bàn gọi đồ uống. Việc yêu cầu khách hàng phải tải ứng dụng dung lượng lớn (Native App trên App Store/Google Play) tạo ra rào cản rất lớn, làm giảm tỷ lệ chuyển đổi đơn hàng.

## 2. Quyết Định (Decision)
Lựa chọn **Next.js (React/TypeScript)** kết hợp phong cách thiết kế **Mobile-First và Progressive Web App (PWA)**:
- Giao diện tối ưu hóa cho màn hình cảm ứng di động (Bottom Navigation, Touch-friendly buttons, Cart Drawer).
- Cấu hình Web App Manifest và Service Worker cho phép cài đặt trực tiếp lên màn hình chính (Add to Home Screen).

## 3. Lý Do & Hệ Quả (Consequences & Trade-offs)
- **Ưu điểm**:
  - Không tốn thời gian và chi phí phát hành lên kho ứng dụng của Apple/Google.
  - Tải trang tức thì nhờ Server-Side Rendering (SSR) và Client-side caching.
  - Khách hàng quét mã QR là vào thẳng menu gọi món trong vòng 2 giây.
- **Hạn chế**:
  - Các tính năng đặc thù sâu của hệ điều hành (như Bluetooth Scanner phần cứng) bị giới hạn hơn so với ứng dụng Native.
