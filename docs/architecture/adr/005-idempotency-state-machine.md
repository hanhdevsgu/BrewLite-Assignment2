# ADR 005: Kiểm Soát Thanh Toán Bằng Idempotency-Key & Máy Trạng Thái Đơn Hàng (State Machine)
**Trạng thái**: Accepted (Đã chấp thuận)  
**Ngày quyết định**: 02/11/2026  
**Người quyết định**: Nhóm phát triển BrewLite (Task 8 & Task 9)  

---

## 1. Bối Cảnh (Context)
Trong môi trường mạng di động, khách hàng thường gặp sự cố kết nối chậm hoặc chập chờn dẫn đến việc bấm nút thanh toán nhiều lần. Điều này tiềm ẩn nguy cơ trừ tiền tài khoản 2 lần (Race condition / Double-charging). Đồng thời, nhân viên quầy có thể thao tác sai thứ tự chuyển trạng thái đơn hàng (ví dụ: chuyển thẳng từ PENDING sang COMPLETED).

## 2. Quyết Định (Decision)
1. **Idempotency-Key (Task 8)**: Toàn bộ request gọi đến `POST /api/payments` phải đính kèm tiêu đề HTTP `x-idempotency-key`. Hệ thống lưu trữ key và trạng thái xử lý trong CSDL:
   - Request lần 1: Thực hiện thanh toán và trả về `HTTP 201 Created` (`replayed: false`).
   - Request lần 2 (cùng key): Hệ thống bỏ qua bước xử lý tiền/kho, lập tức trả về kết quả cũ với mã `HTTP 200 OK` (`replayed: true`).
2. **Order State Machine (Task 9)**: Áp dụng máy trạng thái hữu hạn cho vòng đời đơn hàng:
   $$\text{PENDING} \longrightarrow \text{PAID} \longrightarrow \text{PREPARING} \longrightarrow \text{READY} \longrightarrow \text{COMPLETED}$$
   Mọi hành vi chuyển trạng thái không hợp lệ (nhảy cóc) đều bị chặn đứng và ném ngoại lệ `HTTP 409 Conflict`.

## 3. Lý Do & Hệ Quả (Consequences & Trade-offs)
- **Ưu điểm**:
  - Triệt tiêu 100% rủi ro trừ tiền 2 lần khi mạng lag hoặc người dùng click đúp.
  - Bảo vệ tính đúng đắn của dữ liệu nghiệp vụ, không để đơn hàng ở trạng thái mâu thuẫn.
  - Cung cấp kịch bản kiểm thử rõ ràng, dễ dàng biểu diễn và bảo vệ trước Hội đồng chấm thi.
- **Hạn chế**:
  - Cần thêm cột `idempotencyKey` và chỉ mục duy nhất (Unique Index) trong bảng `Payment` của CSDL.

