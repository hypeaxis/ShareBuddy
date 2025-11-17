-- ShareBuddy Sample Data
-- Run this after init_database.sql

-- Insert sample users
INSERT INTO users (email, password_hash, username, full_name, university, major, role, credits, is_verified_author) VALUES
('admin@sharebuddy.com', '$2b$10$example_hash_for_admin', 'admin', 'System Administrator', 'ShareBuddy University', 'Computer Science', 'admin', 1000, TRUE),
('john.doe@student.edu', '$2b$10$example_hash_for_john', 'johndoe', 'John Doe', 'Đại học Bách khoa Hà Nội', 'Công nghệ thông tin', 'user', 15, FALSE),
('jane.smith@teacher.edu', '$2b$10$example_hash_for_jane', 'janesmith', 'Jane Smith', 'Đại học Quốc gia Hà Nội', 'Toán học', 'user', 25, TRUE),
('moderator@sharebuddy.com', '$2b$10$example_hash_for_mod', 'moderator1', 'Moderator One', 'ShareBuddy University', 'Information Systems', 'moderator', 500, TRUE),
('alice.nguyen@hust.edu.vn', '$2b$10$example_hash_for_alice', 'alicenguyen', 'Nguyễn Thị Alice', 'Đại học Bách khoa Hà Nội', 'Kỹ thuật điện tử', 'user', 20, FALSE),
('bob.tran@vnu.edu.vn', '$2b$10$example_hash_for_bob', 'bobtran', 'Trần Văn Bob', 'Đại học Quốc gia Hà Nội', 'Vật lý', 'user', 18, FALSE);

-- Insert sample documents
INSERT INTO documents (title, description, file_name, file_path, file_size, file_type, university, subject, author_id, credit_cost, is_public) VALUES
('Cấu trúc dữ liệu và Giải thuật - Bài giảng 1', 'Bài giảng đầu tiên về cấu trúc dữ liệu, bao gồm mảng, danh sách liên kết và stack.', 'ctdl-bai1.pdf', '/uploads/documents/ctdl-bai1.pdf', 2048576, 'pdf', 'Đại học Bách khoa Hà Nội', 'Cấu trúc dữ liệu và Giải thuật', (SELECT user_id FROM users WHERE username = 'janesmith'), 1, TRUE),
('Lập trình hướng đối tượng với Java', 'Tài liệu hướng dẫn lập trình Java từ cơ bản đến nâng cao, bao gồm các design patterns.', 'java-oop-guide.docx', '/uploads/documents/java-oop-guide.docx', 1536000, 'docx', 'Đại học Bách khoa Hà Nội', 'Lập trình hướng đối tượng', (SELECT user_id FROM users WHERE username = 'johndoe'), 2, TRUE),
('Toán rời rạc - Chương 3: Đồ thị', 'Chương 3 của môn Toán rời rạc, tập trung vào lý thuyết đồ thị và các thuật toán liên quan.', 'toan-roi-rac-chuong3.pdf', '/uploads/documents/toan-roi-rac-chuong3.pdf', 3072000, 'pdf', 'Đại học Quốc gia Hà Nội', 'Toán rời rạc', (SELECT user_id FROM users WHERE username = 'janesmith'), 1, TRUE),
('Báo cáo thực hành Mạng máy tính', 'Báo cáo thực hành các giao thức mạng và cấu hình router/switch.', 'bao-cao-mang.docx', '/uploads/documents/bao-cao-mang.docx', 1024000, 'docx', 'Đại học Bách khoa Hà Nội', 'Mạng máy tính', (SELECT user_id FROM users WHERE username = 'alicenguyen'), 1, TRUE),
('Slide thuyết trình Cơ sở dữ liệu', 'Slide về thiết kế cơ sở dữ liệu quan hệ và chuẩn hóa.', 'csdl-slide.pptx', '/uploads/documents/csdl-slide.pptx', 4096000, 'pptx', 'Đại học Quốc gia Hà Nội', 'Cơ sở dữ liệu', (SELECT user_id FROM users WHERE username = 'bobtran'), 2, TRUE),
('Đề thi giữa kỳ Vật lý đại cương', 'Đề thi giữa kỳ môn Vật lý đại cương năm 2023 với đáp án chi tiết.', 'de-thi-vat-ly.pdf', '/uploads/documents/de-thi-vat-ly.pdf', 512000, 'pdf', 'Đại học Quốc gia Hà Nội', 'Vật lý đại cương', (SELECT user_id FROM users WHERE username = 'bobtran'), 3, TRUE);

-- Insert document tags
INSERT INTO document_tags (document_id, tag_name) VALUES
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), 'cấu trúc dữ liệu'),
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), 'giải thuật'),
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), 'bài giảng'),
((SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), 'java'),
((SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), 'oop'),
((SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), 'lập trình'),
((SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), 'toán học'),
((SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), 'đồ thị'),
((SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), 'toán rời rạc'),
((SELECT document_id FROM documents WHERE title = 'Báo cáo thực hành Mạng máy tính'), 'mạng'),
((SELECT document_id FROM documents WHERE title = 'Báo cáo thực hành Mạng máy tính'), 'thực hành'),
((SELECT document_id FROM documents WHERE title = 'Báo cáo thực hành Mạng máy tính'), 'router'),
((SELECT document_id FROM documents WHERE title = 'Slide thuyết trình Cơ sở dữ liệu'), 'cơ sở dữ liệu'),
((SELECT document_id FROM documents WHERE title = 'Slide thuyết trình Cơ sở dữ liệu'), 'sql'),
((SELECT document_id FROM documents WHERE title = 'Slide thuyết trình Cơ sở dữ liệu'), 'slide'),
((SELECT document_id FROM documents WHERE title = 'Đề thi giữa kỳ Vật lý đại cương'), 'đề thi'),
((SELECT document_id FROM documents WHERE title = 'Đề thi giữa kỳ Vật lý đại cương'), 'vật lý'),
((SELECT document_id FROM documents WHERE title = 'Đề thi giữa kỳ Vật lý đại cương'), 'giữa kỳ');

-- Insert ratings
INSERT INTO ratings (document_id, user_id, rating) VALUES
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), (SELECT user_id FROM users WHERE username = 'johndoe'), 5),
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), (SELECT user_id FROM users WHERE username = 'alicenguyen'), 4),
((SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), (SELECT user_id FROM users WHERE username = 'janesmith'), 5),
((SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), (SELECT user_id FROM users WHERE username = 'bobtran'), 4),
((SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), (SELECT user_id FROM users WHERE username = 'johndoe'), 5),
((SELECT document_id FROM documents WHERE title = 'Báo cáo thực hành Mạng máy tính'), (SELECT user_id FROM users WHERE username = 'johndoe'), 4),
((SELECT document_id FROM documents WHERE title = 'Slide thuyết trình Cơ sở dữ liệu'), (SELECT user_id FROM users WHERE username = 'alicenguyen'), 5);

-- Insert comments
INSERT INTO comments (document_id, user_id, content, is_question) VALUES
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), (SELECT user_id FROM users WHERE username = 'johndoe'), 'Bài giảng rất hay và dễ hiểu! Cảm ơn tác giả đã chia sẻ.', FALSE),
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), (SELECT user_id FROM users WHERE username = 'alicenguyen'), 'Có thể giải thích thêm về độ phức tạp của thuật toán không?', TRUE),
((SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), (SELECT user_id FROM users WHERE username = 'bobtran'), 'Tài liệu này có đầy đủ ví dụ code, rất hữu ích cho người mới học.', FALSE),
((SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), (SELECT user_id FROM users WHERE username = 'johndoe'), 'Chương này khó quá, có tài liệu bài tập thêm không?', TRUE);

-- Insert reply comments
INSERT INTO comments (document_id, user_id, parent_comment_id, content, is_answer) VALUES
((SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), (SELECT user_id FROM users WHERE username = 'janesmith'), (SELECT comment_id FROM comments WHERE content = 'Có thể giải thích thêm về độ phức tạp của thuật toán không?'), 'Mình sẽ upload thêm bài giảng về Big O notation trong tuần tới nhé!', TRUE);

-- Insert comment likes
INSERT INTO comment_likes (comment_id, user_id) VALUES
((SELECT comment_id FROM comments WHERE content = 'Bài giảng rất hay và dễ hiểu! Cảm ơn tác giả đã chia sẻ.'), (SELECT user_id FROM users WHERE username = 'janesmith')),
((SELECT comment_id FROM comments WHERE content = 'Bài giảng rất hay và dễ hiểu! Cảm ơn tác giả đã chia sẻ.'), (SELECT user_id FROM users WHERE username = 'bobtran')),
((SELECT comment_id FROM comments WHERE content = 'Tài liệu này có đầy đủ ví dụ code, rất hữu ích cho người mới học.'), (SELECT user_id FROM users WHERE username = 'alicenguyen'));

-- Insert follows
INSERT INTO follows (follower_id, following_id) VALUES
((SELECT user_id FROM users WHERE username = 'johndoe'), (SELECT user_id FROM users WHERE username = 'janesmith')),
((SELECT user_id FROM users WHERE username = 'alicenguyen'), (SELECT user_id FROM users WHERE username = 'janesmith')),
((SELECT user_id FROM users WHERE username = 'bobtran'), (SELECT user_id FROM users WHERE username = 'johndoe')),
((SELECT user_id FROM users WHERE username = 'alicenguyen'), (SELECT user_id FROM users WHERE username = 'bobtran'));

-- Insert bookmarks
INSERT INTO bookmarks (user_id, document_id) VALUES
((SELECT user_id FROM users WHERE username = 'johndoe'), (SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị')),
((SELECT user_id FROM users WHERE username = 'alicenguyen'), (SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1')),
((SELECT user_id FROM users WHERE username = 'bobtran'), (SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'));

-- Insert downloads (some sample download history)
INSERT INTO downloads (user_id, document_id, credits_used) VALUES
((SELECT user_id FROM users WHERE username = 'johndoe'), (SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), 1),
((SELECT user_id FROM users WHERE username = 'alicenguyen'), (SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), 2),
((SELECT user_id FROM users WHERE username = 'bobtran'), (SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), 1);

-- Insert credit transactions
INSERT INTO credit_transactions (user_id, amount, transaction_type, reference_id, description) VALUES
-- Upload bonuses
((SELECT user_id FROM users WHERE username = 'janesmith'), 3, 'upload', (SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), 'Bonus for uploading document'),
((SELECT user_id FROM users WHERE username = 'johndoe'), 3, 'upload', (SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), 'Bonus for uploading document'),
((SELECT user_id FROM users WHERE username = 'janesmith'), 3, 'upload', (SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), 'Bonus for uploading document'),
-- Download costs
((SELECT user_id FROM users WHERE username = 'johndoe'), -1, 'download', (SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'), 'Downloaded document'),
((SELECT user_id FROM users WHERE username = 'alicenguyen'), -2, 'download', (SELECT document_id FROM documents WHERE title = 'Lập trình hướng đối tượng với Java'), 'Downloaded document'),
((SELECT user_id FROM users WHERE username = 'bobtran'), -1, 'download', (SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1'), 'Downloaded document');

-- Insert comment and rating bonuses separately (since comment_id and rating_id are different types)
INSERT INTO credit_transactions (user_id, amount, transaction_type, reference_id, description) VALUES
((SELECT user_id FROM users WHERE username = 'johndoe'), 1, 'comment', (SELECT comment_id FROM comments WHERE content = 'Bài giảng rất hay và dễ hiểu! Cảm ơn tác giả đã chia sẻ.'), 'Bonus for helpful comment');

INSERT INTO credit_transactions (user_id, amount, transaction_type, reference_id, description) VALUES  
((SELECT user_id FROM users WHERE username = 'alicenguyen'), 1, 'rating', (SELECT rating_id FROM ratings WHERE rating = 4 AND document_id = (SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1')), 'Bonus for rating document');

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, content, related_user_id) VALUES
((SELECT user_id FROM users WHERE username = 'janesmith'), 'new_follower', 'Bạn có người theo dõi mới!', 'John Doe đã bắt đầu theo dõi bạn.', (SELECT user_id FROM users WHERE username = 'johndoe'));

INSERT INTO notifications (user_id, type, title, content, related_document_id) VALUES
((SELECT user_id FROM users WHERE username = 'janesmith'), 'new_rating', 'Tài liệu của bạn nhận được đánh giá mới', 'Tài liệu "Cấu trúc dữ liệu và Giải thuật - Bài giảng 1" nhận được đánh giá 5 sao.', (SELECT document_id FROM documents WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1')),
((SELECT user_id FROM users WHERE username = 'johndoe'), 'new_document', 'Có tài liệu mới từ người bạn theo dõi', 'Jane Smith đã tải lên tài liệu mới: "Toán rời rạc - Chương 3: Đồ thị"', (SELECT document_id FROM documents WHERE title = 'Toán rời rạc - Chương 3: Đồ thị'));

-- Update view counts for some documents
UPDATE documents SET view_count = 25 WHERE title = 'Cấu trúc dữ liệu và Giải thuật - Bài giảng 1';
UPDATE documents SET view_count = 18 WHERE title = 'Lập trình hướng đối tượng với Java';
UPDATE documents SET view_count = 15 WHERE title = 'Toán rời rạc - Chương 3: Đồ thị';
UPDATE documents SET view_count = 12 WHERE title = 'Báo cáo thực hành Mạng máy tính';
UPDATE documents SET view_count = 20 WHERE title = 'Slide thuyết trình Cơ sở dữ liệu';
UPDATE documents SET view_count = 30 WHERE title = 'Đề thi giữa kỳ Vật lý đại cương';

-- Display some statistics
SELECT 'Database initialized successfully!' as status;
SELECT 'Total users:', COUNT(*) FROM users;
SELECT 'Total documents:', COUNT(*) FROM documents;
SELECT 'Total ratings:', COUNT(*) FROM ratings;
SELECT 'Total comments:', COUNT(*) FROM comments;
SELECT 'Total downloads:', COUNT(*) FROM downloads;