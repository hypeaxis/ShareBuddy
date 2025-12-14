# ShareBuddy - Ứng dụng Chia sẻ Tài liệu

## Mô tả
ShareBuddy là một nền tảng trực tuyến cho phép sinh viên, giảng viên và người học chia sẻ, tìm kiếm, tải xuống cũng như đánh giá các tài liệu học tập.

## Công nghệ sử dụng
- **Frontend**: ReactJS + Bootstrap 5
- **Backend**: NodeJS + Express
- **Database**: PostgreSQL
- **Authentication**: JWT + OAuth (Google, Facebook)
- **File Storage**: Local storage / Cloud storage
- **Styling**: CSS3 với Dark Theme và Pastel Colors

## Tính năng chính
- Đăng ký/Đăng nhập (Email + OAuth)
- Upload/Download tài liệu với hệ thống điểm
- Tìm kiếm nâng cao theo trường học, môn học, tags
- Đánh giá và bình luận tài liệu
- Hệ thống theo dõi tác giả
- Bookmark tài liệu yêu thích
- Q&A cho từng tài liệu
- Admin panel quản trị
- Hệ thống thông báo
- Gợi ý tài liệu thông minh

## Cài đặt và Chạy

### 1. Cài đặt Database
```bash
# Tạo database PostgreSQL
createdb sharebuddy_db

# Chạy script khởi tạo
psql -d sharebuddy_db -f docs/database-design/init_database.sql
psql -d sharebuddy_db -f docs/database-design/sample_data.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Cấu hình biến môi trường trong file .env
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Cấu trúc thư mục
```
ShareBuddy/
├── README.md
├── .gitignore
├── docs/
│   ├── database-design/
│   │   ├── ER-Diagram.md
│   │   ├── init_database.sql
│   │   └── sample_data.sql
│   └── api-documentation/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   └── uploads/
│       └── documents/
└── frontend/
    ├── package.json
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   ├── styles/
    │   └── utils/
    └── build/
```

## API Endpoints
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/documents` - Lấy danh sách tài liệu
- `POST /api/documents` - Upload tài liệu
- `GET /api/documents/:id` - Chi tiết tài liệu
- `POST /api/documents/:id/download` - Tải xuống
- `POST /api/documents/:id/ratings` - Đánh giá
- `POST /api/documents/:id/comments` - Bình luận

