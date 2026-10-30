# Thiệp cưới Hoàng Long & Bảo Ngọc

Website gồm hai phần:

- `BE`: Node.js + Express REST API, lưu dữ liệu trong MySQL.
- `FE`: React 19 + Vite, giao diện responsive theo phong cách thiệp cưới burgundy/ivory.

## Chạy dự án

MySQL local dùng tài khoản `root`, mật khẩu `123456`. Cấu hình có thể đổi trong file `.env` của backend.

```powershell
# Terminal 1 - backend
cd F:\webthuy\SWD\Thiepcuoinew\BE
npm install
npm run db:init
npm run dev

# Terminal 2 - frontend
cd F:\webthuy\SWD\Thiepcuoinew\FE
npm install
npm run dev
```

Mở `http://localhost:5173`. API chạy tại `http://localhost:8080/api`.

## Trang quản trị

Mở `http://localhost:5173/admin` và đăng nhập bằng hai giá trị `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong `BE/.env`.
Trang quản trị cho phép:

- Sửa tên cô dâu/chú rể, ngày giờ, ảnh bìa và trạng thái xuất bản.
- Sửa riêng nhà chú rể, nhà cô dâu, Google Maps và link chỉ đường của từng nơi.
- Thêm, xóa, sắp xếp ảnh album và lịch trình ngày cưới.
- Tải trực tiếp ảnh JPG, PNG, WEBP hoặc GIF (tối đa 8 MB) cho ảnh bìa và album; file được lưu trong `BE/uploads`.
- Chỉnh màu dress code và thông tin tài khoản mừng cưới.
- Xem RSVP, tổng số khách và ẩn/hiện lời chúc.

Phiên đăng nhập tồn tại 8 giờ và được ký bằng `ADMIN_SESSION_SECRET`. Hãy đổi cả hai giá trị quản trị trong `.env` trước khi triển khai công khai.

## Dữ liệu

Lệnh `npm run db:init` tạo database `thiep_cuoi_app` và seed thiệp mẫu. Có thể chạy lại an toàn. Lệnh này không ghi đè nội dung đã chỉnh trong trang admin, đồng thời tự dọn bản ghi seed trùng và tạo ràng buộc để dữ liệu không bị nhân đôi. Các bảng chính:

- `invitations`: thông tin thiệp, ngày cưới, địa điểm, dress code và thông tin quà mừng.
- `families`: thông tin hai gia đình.
- `gallery_images`: ảnh album.
- `wedding_schedule`: lịch trình ngày cưới.
- `wishes`: lời chúc từ khách mời.
- `rsvps`: xác nhận tham dự.

## API chính

- `GET /api/health`
- `GET /api/invitations/hoang-long-bao-ngoc`
- `GET /api/invitations/hoang-long-bao-ngoc/wishes`
- `POST /api/invitations/hoang-long-bao-ngoc/wishes`
- `POST /api/invitations/hoang-long-bao-ngoc/rsvps`
- `POST /api/admin/login`
- `GET|PUT /api/admin/invitations/hoang-long-bao-ngoc`
- `GET /api/admin/invitations/hoang-long-bao-ngoc/submissions`
- `PATCH /api/admin/invitations/hoang-long-bao-ngoc/wishes/:id`

Giao diện vẫn hiển thị dữ liệu mẫu nếu API chưa chạy, đồng thời hiện thông báo ở cuối trang. Muốn gửi lời chúc hoặc RSVP thì backend và MySQL phải hoạt động.

## Kiểm tra

```powershell
cd F:\webthuy\SWD\Thiepcuoinew\BE
npm run check

cd F:\webthuy\SWD\Thiepcuoinew\FE
npm run check
npm run build
```
