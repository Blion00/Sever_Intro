# IntroAqua Backend API

Backend server cho ứng dụng dịch vụ nước IntroAqua, được xây dựng với Node.js và Express.

## Tính năng chính

- **Quản lý người dùng**: Đăng ký, đăng nhập, quản lý profile
- **Tra cứu hóa đơn**: Xem lịch sử hóa đơn, thanh toán
- **Báo cáo sự cố**: Tạo và theo dõi báo cáo về các vấn đề nước
- **Tin tức**: Quản lý và hiển thị tin tức, thông báo
- **Quản trị**: Dashboard và thống kê cho admin

## Cài đặt

### Yêu cầu hệ thống
- Node.js >= 16.0.0
- MySQL >= 8.0 hoặc MariaDB >= 10.3
- phpMyAdmin (tùy chọn, để quản lý database)
- npm hoặc yarn

### Cài đặt dependencies

```bash
cd backend
npm install
```

### Cấu hình môi trường

1. Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

2. Cập nhật các biến môi trường trong file `.env`:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=introaqua
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
```

### Chạy ứng dụng

#### Development mode
```bash
npm run dev
```

#### Production mode
```bash
npm start
```

Server sẽ chạy tại `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `PUT /api/auth/profile` - Cập nhật profile
- `POST /api/auth/change-password` - Đổi mật khẩu

### Bills (Hóa đơn)
- `GET /api/bills` - Lấy danh sách hóa đơn
- `GET /api/bills/:id` - Lấy chi tiết hóa đơn
- `GET /api/bills/customer/:customerId` - Lấy hóa đơn theo customer ID
- `POST /api/bills` - Tạo hóa đơn mới (Admin)
- `PUT /api/bills/:id/status` - Cập nhật trạng thái hóa đơn (Admin)
- `GET /api/bills/stats/summary` - Thống kê hóa đơn (Admin)

### Reports (Báo cáo)
- `POST /api/reports` - Tạo báo cáo mới
- `GET /api/reports` - Lấy danh sách báo cáo
- `GET /api/reports/:id` - Lấy chi tiết báo cáo
- `PUT /api/reports/:id/status` - Cập nhật trạng thái báo cáo
- `PUT /api/reports/:id/assign` - Giao báo cáo cho nhân viên (Admin)
- `PUT /api/reports/:id/resolution` - Thêm thông tin xử lý
- `GET /api/reports/stats/summary` - Thống kê báo cáo (Admin)

### News (Tin tức)
- `GET /api/news` - Lấy danh sách tin tức (Public)
- `GET /api/news/:slug` - Lấy chi tiết tin tức (Public)
- `POST /api/news` - Tạo tin tức mới (Admin)
- `PUT /api/news/:id` - Cập nhật tin tức (Admin)
- `DELETE /api/news/:id` - Xóa tin tức (Admin)
- `GET /api/news/admin/all` - Lấy tất cả tin tức (Admin)
- `POST /api/news/:id/like` - Like tin tức (Public)

### Users (Người dùng)
- `GET /api/users` - Lấy danh sách người dùng (Admin)
- `GET /api/users/:id` - Lấy thông tin người dùng
- `PUT /api/users/:id` - Cập nhật thông tin người dùng
- `DELETE /api/users/:id` - Xóa người dùng (Admin)
- `GET /api/users/stats/summary` - Thống kê người dùng (Admin)
- `POST /api/users/:id/avatar` - Upload avatar

### Health Check
- `GET /health` - Kiểm tra trạng thái server

## Cấu trúc Database (MySQL)

### Bảng users
- Thông tin cá nhân (tên, email, số điện thoại, địa chỉ)
- Vai trò (customer, admin, staff)
- Trạng thái hoạt động
- Customer ID tự động

### Bảng bills
- Thông tin khách hàng
- Kỳ thanh toán
- Chỉ số nước (trước, sau, tiêu thụ)
- Biểu giá và tính toán
- Trạng thái thanh toán

### Bảng reports
- Loại báo cáo (rò rỉ, chất lượng nước, v.v.)
- Mức độ ưu tiên
- Vị trí và mô tả
- File đính kèm
- Quy trình xử lý

### Bảng news
- Nội dung tin tức
- Phân loại và tags
- Hình ảnh và file đính kèm
- SEO và metadata
- Thống kê tương tác

### Cài đặt MySQL và phpMyAdmin

1. **Cài đặt MySQL:**
   - Windows: Tải MySQL Installer từ mysql.com
   - macOS: `brew install mysql`
   - Ubuntu: `sudo apt install mysql-server`

2. **Cài đặt phpMyAdmin:**
   - Tải từ phpmyadmin.net
   - Hoặc sử dụng XAMPP/WAMP (bao gồm cả MySQL và phpMyAdmin)

3. **Tạo database:**
   ```sql
   CREATE DATABASE introaqua CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **Cấu hình kết nối:**
   - Đảm bảo MySQL service đang chạy
   - Cập nhật thông tin kết nối trong file `.env`

## Bảo mật

- JWT Authentication
- Password hashing với bcrypt
- Input validation với express-validator
- CORS configuration
- Helmet security headers
- File upload validation

## Middleware

- **auth.js**: Xác thực JWT token
- **errorHandler.js**: Xử lý lỗi tập trung
- **upload.js**: Xử lý upload file với multer

## Scripts

- `npm start`: Chạy production server
- `npm run dev`: Chạy development server với nodemon
- `npm test`: Chạy tests

## Cấu trúc thư mục

```
backend/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── uploads/         # Uploaded files
├── server.js        # Main server file
├── package.json     # Dependencies
└── README.md        # Documentation
```

## Liên hệ

Để được hỗ trợ, vui lòng liên hệ team phát triển IntroAqua.
