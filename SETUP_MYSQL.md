# Hướng dẫn cài đặt MySQL và phpMyAdmin cho IntroAqua Backend

## 1. Cài đặt MySQL

### Windows
1. Tải MySQL Installer từ: https://dev.mysql.com/downloads/installer/
2. Chọn "MySQL Installer for Windows"
3. Chọn "Full" installation
4. Thiết lập root password
5. Khởi động MySQL service

### macOS
```bash
# Sử dụng Homebrew
brew install mysql
brew services start mysql

# Hoặc tải MySQL Workbench từ mysql.com
```

### Ubuntu/Linux
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
sudo systemctl start mysql
sudo systemctl enable mysql
```

## 2. Cài đặt phpMyAdmin

### Cách 1: Sử dụng XAMPP (Khuyến nghị cho Windows)
1. Tải XAMPP từ: https://www.apachefriends.org/
2. Cài đặt XAMPP
3. Khởi động Apache và MySQL từ XAMPP Control Panel
4. Truy cập phpMyAdmin tại: http://localhost/phpmyadmin

### Cách 2: Cài đặt riêng phpMyAdmin
```bash
# Ubuntu
sudo apt install phpmyadmin

# macOS với Homebrew
brew install phpmyadmin
```

## 3. Tạo Database

### Qua phpMyAdmin:
1. Mở phpMyAdmin (http://localhost/phpmyadmin)
2. Click "New" để tạo database mới
3. Đặt tên: `introaqua`
4. Chọn Collation: `utf8mb4_unicode_ci`
5. Click "Create"

### Qua MySQL Command Line:
```sql
mysql -u root -p
CREATE DATABASE introaqua CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
EXIT;
```

## 4. Cấu hình Backend

### Tạo file .env:
```bash
cd backend
cp .env.example .env
```

### Cập nhật .env với thông tin MySQL:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=introaqua
DB_USER=root
DB_PASSWORD=your_mysql_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## 5. Cài đặt Dependencies và Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy server (sẽ tự động tạo tables)
npm run dev

# Hoặc seed dữ liệu mẫu
npm run seed
```

## 6. Kiểm tra Kết nối

### Kiểm tra qua API:
```bash
curl http://localhost:5000/health
```

### Kiểm tra qua phpMyAdmin:
1. Mở phpMyAdmin
2. Chọn database `introaqua`
3. Kiểm tra các bảng đã được tạo:
   - users
   - bills
   - reports
   - news

## 7. Troubleshooting

### Lỗi kết nối MySQL:
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Giải pháp:**
- Kiểm tra MySQL service đang chạy
- Kiểm tra port 3306 có bị block không
- Kiểm tra username/password trong .env

### Lỗi quyền truy cập:
```
Error: Access denied for user 'root'@'localhost'
```
**Giải pháp:**
```sql
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Lỗi charset:
```
Error: Incorrect string value
```
**Giải pháp:**
- Đảm bảo database sử dụng utf8mb4
- Kiểm tra collation trong phpMyAdmin

## 8. Tài khoản mẫu

Sau khi chạy `npm run seed`, bạn sẽ có các tài khoản:

- **Admin:** admin@introaqua.vn / admin123
- **Customer:** customer1@example.com / customer123  
- **Staff:** staff1@introaqua.vn / staff123

## 9. Cấu trúc Tables

### users
- id (Primary Key)
- username, email, password
- fullName, phone, address
- role (customer/admin/staff)
- customerId, isActive

### bills
- id (Primary Key)
- billNumber, customerId
- billingPeriod, waterUsage
- rates, amounts
- status, dueDate

### reports
- id (Primary Key)
- reportNumber, customerId
- reportType, priority
- title, description, location
- status, assignedTo

### news
- id (Primary Key)
- title, slug, summary, content
- author, category, tags
- status, isFeatured, isPinned

## 10. Backup và Restore

### Backup:
```bash
mysqldump -u root -p introaqua > backup.sql
```

### Restore:
```bash
mysql -u root -p introaqua < backup.sql
```

Hoặc sử dụng phpMyAdmin:
1. Export → Custom → Select All
2. Import → Choose File → Go
