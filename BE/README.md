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

## Dữ liệu

Lệnh `npm run db:init` tạo database `thiep_cuoi_app` và seed thiệp mẫu. Có thể chạy lại an toàn. Các bảng chính:

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

Giao diện vẫn hiển thị dữ liệu mẫu nếu API chưa chạy, đồng thời hiện thông báo ở cuối trang. Muốn gửi lời chúc hoặc RSVP thì backend và MySQL phải hoạt động.

## Kiểm tra

```powershell
cd F:\webthuy\SWD\Thiepcuoinew\BE
npm run check

cd F:\webthuy\SWD\Thiepcuoinew\FE
npm run check
npm run build
```
