✅ 1. Mục tiêu kiến trúc

* .NET (Microservice): Xử lý các chức năng chuyên biệt, cần khả năng scale tốt, liên quan đến bảo mật, xác thực, phân quyền. 
* Node.js + PostgreSQL (Monolith): Xử lý các chức năng nghiệp vụ tổng hợp, ít yêu cầu scale độc lập từng phần, tập trung trải nghiệm người dùng như chat, therapy, lịch khám, v.v.
---------------------------------------------------

✅ 2. Tách Database theo chức năng

---------🔒 .NET Microservice – Quản lý người dùng & xác thực:-------------

Database riêng hoặc schema riêng, gồm:
- Users
- Roles
- UserRoles
- UserRefreshTokens
- Devices
Lý do: Đây là các bảng nhạy cảm về bảo mật (xác thực, phân quyền), nên tách riêng thành Authentication Service để scale độc lập, audit log rõ ràng, gắn với Firebase hoặc các hệ thống xác thực ngoài.

---------💬 Node.js Monolith – Quản lý nội dung & nghiệp vụ:-------------

PostgreSQL, chứa phần còn lại:
📦 Bảng nghiệp vụ chính:
- Messages (chat giữa user – bác sĩ)
- Schedules, Bookings, Sessions (đặt lịch, buổi trị liệu)
- TherapeuticActivities, FoodActivities, EntertainmentActivities, PhysicalActivities (dữ liệu trị liệu)
- Tests, ServicePackages, QuestionOptions, ClientOptions,...
Lý do: Các bảng này ít thay đổi cấu trúc và gắn chặt với luồng nghiệp vụ => dùng Monolith dễ maintain, giảm overhead DevOps, dễ phát triển tính năng nhanh chóng.
---------------------------------------------------

✅ 3. Phân tích mối quan hệ giữa hai kiến trúc

Kết nối giữa 2 phần: 
-Users.Id từ microservice được dùng làm khóa ngoại (foreign key) ở phần monolith như:
   + Messages.SenderUserId / ReceiverUserId 
   + Schedules.DoctorId, Bookings.UserId, etc. 
-Có thể dùng event-driven hoặc REST để lấy thông tin người dùng khi cần (từ microservice qua API gateway hoặc Message Bus như RabbitMQ).
---------------------------------------------------

✅ 4. Lưu ý

Đảm bảo Users.Id nhất quán giữa cả hai hệ thống. 
Có thể dùng Redis cache để giảm truy cập liên tục giữa 2 hệ thống khi cần thông tin người dùng. 
Xem xét dùng JWT chứa userId & role, giảm phụ thuộc truy xuất thông tin người dùng.
---------------------------------------------------
   ✅  SƠ ĐỒ KIẾN TRÚC HỆ THỐNG ✅
   
                                  +------------------+
                                  |    Frontend UI   |
                                  | (Web / Mobile App)|
                                  +--------+---------+
                                           |
                                           v
                              +------------+------------+
                              |    API Gateway / BFF    |
                              +------------+------------+
                                           |
            +------------------------------+------------------------------+
            |                                                             |
            v                                                             v
      +---------------------------+                             +---------------------------+
      | .NET Microservice (Auth)  |                             |   Node.js Monolith App    |
      |---------------------------|                             |---------------------------|
      | - Users                   |                             | - Messages                |
      | - Roles / UserRoles       |                             | - Conversations           |
      | - Devices (Firebase)      |                             | - Therapies / Activities  |
      | - Refresh Tokens          |                             | - Booking / Schedule      |
      | - Login / Register / JWT  |                             | - DASS-21 / Tests         |
      +---------------------------+                             +---------------------------+
                 |                                                              |
                 | <-------------------------> (API/REST or Message Queue) <--> |
                 |            Đồng bộ Users, Role info, v.v...                  |
                 |                                                              |
      +---------------------------+                             +---------------------------+
      |      PostgreSQL DB        |                             |      PostgreSQL DB        |
      +---------------------------+                             +---------------------------+


| Thành phần                   | Mô tả                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**                 | React Web, React Native app. Gửi request về API Gateway.                                                                          |
| **API Gateway**              | Là tầng trung gian định tuyến request đến đúng hệ thống: `.NET` hoặc `Node.js`. Có thể dùng NGINX, Kong, hoặc chính Node làm BFF. |
| **.NET Microservice**        | Xử lý toàn bộ xác thực, cấp JWT, lưu thiết bị, phân quyền, đăng nhập bằng Firebase hoặc OTP.                                      |
| **Node.js Monolith**         | Xử lý nghiệp vụ chính: trị liệu, lịch, chat, chẩn đoán... Giao tiếp với `.NET` khi cần thông tin người dùng.                      |
| **PostgreSQL DB**            | Node.js dùng PostgreSQL để lưu trữ toàn bộ dữ liệu nghiệp vụ. .NET có thể dùng riêng DB hoặc chung DB nhưng schema riêng.         |
| **Giao tiếp giữa 2 service** | Nếu cần lấy info user từ Node → gọi API `GET /users/{id}` ở .NET. Nếu cần đồng bộ → dùng event/message queue.                     |

🎯 Lợi ích kiến trúc này:
- Có thể migrate dần từ microservice sang mono hoặc ngược lại nếu cần.
- Tách biệt bảo mật và nghiệp vụ → rõ ràng, dễ scale.
- Có thể triển khai độc lập từng phần (CI/CD riêng).
- Chuẩn hóa việc xác thực cho nhiều app frontend (SPA, mobile, v.v.)
---------------------------------------------------

✅ 5. Chứng thực và bảo mật giữa 2 service

   - Node.js gọi .NET luôn kèm theo Admin API Key hoặc JWT Service Token
   - Dùng Axios + Retry + Circuit Breaker để đảm bảo call an toàn
---------------------------------------------------

✅ 6. Giao tiếp bằng Queue (tuỳ chọn nâng cao)

 Dùng RabbitMQ... có thể làm:
| Tình huống         | Event                                                                           |
| ------------------ | ------------------------------------------------------------------------------- |
| User đăng ký mới   | `.NET` gửi event `user.created` cho queue → `Node` bắt và tạo bản sao User info |
| User đổi tên       | `user.updated`                                                                  |
| Firebase token mới | `device.updated`                                                                |
---------------------------------------------------

✅ 7. PHÂN CHIA CHỨC NĂNG GIỮA .NET VÀ NODE.JS

📌 I. Phần thuộc về .NET (Microservice - Auth)
| Chức năng                          | Ghi chú                                    |
| ---------------------------------- | ------------------------------------------ |
| Đăng ký / Đăng nhập                | Email, phone, password, OAuth              |
| Refresh Token                      | Xử lý access token, session                |
| Phân quyền (role: Doctor, Patient) | RBAC, gán vai trò                          |
| Quản lý thông tin user cơ bản      | Tên, email, avatar                         |
| Gửi OTP, xác thực Firebase         | Firebase, SMS/Email                        |
| Quản lý thiết bị (device token)    | Dùng cho push notification                 |
| Giao tiếp qua API đến Node         | `GET /users`, `GET /roles`, `GET /devices` |

📌 II. Phần thuộc về Node.js (Monolith - Nghiệp vụ)
| Chức năng                             | Ghi chú                               |
| ------------------------------------- | ------------------------------------- |
| Chat realtime giữa bệnh nhân & bác sĩ | Socket.IO hoặc WebSocket              |
| Quản lý tin nhắn (Messages)           | Gắn senderId, receiverId ← từ .NET    |
| Bài test tâm lý (BDI, BAI, DASS-21)   | Đánh giá điểm, phân tích stress       |
| Gợi ý hoạt động (AI đề xuất)          | Gợi ý theo kết quả test               |
| Quản lý lộ trình trị liệu             | Lưu các bước và hướng dẫn             |
| Quản lý booking, lịch hẹn             | Bác sĩ & bệnh nhân                    |
| Gợi ý dinh dưỡng, hoạt động, giải trí | Dựa vào stress level                  |
| Gửi thông báo cho user                | Gọi sang API .NET để lấy device token |
| Lưu các kết quả đánh giá              | Đính kèm theo userId (từ .NET)        |
| Quản lý thống kê (dashboard)          | Admin panel                           |

---------------------------------------------------
✅ 8. QUẢN LÍ CÁC PACKED VÀ DEPENDENCE
  1. Core Backend & Framework
     
| Package       | Mục đích                                                   |
| ------------- | ---------------------------------------------------------- |
| `express`     | Framework chính để xây dựng API                            |
| `cors`        | Cho phép truy cập từ frontend (cross-origin)               |
| `dotenv`      | Quản lý biến môi trường `.env`                             |
| `morgan`      | Ghi log HTTP request (debug tốt)                           |
| `helmet`      | Bảo mật headers HTTP                                       |
| `compression` | Gzip nén response – tăng hiệu suất                         |
| `body-parser` | Phân tích JSON, form, urlencoded (nếu dùng express < 4.16) |
  2. Database – PostgreSQL
  3. Auth / Security
  
| Package          | Mục đích               |
| ---------------- | ---------------------- |
| `jsonwebtoken`   | Tạo và xác minh JWT    |
| `bcryptjs`       | Hash password          |
| `cookie-parser`  | Đọc cookie từ client   |
| `firebase-admin` | Nếu dùng Firebase Auth |
  4. Middleware / Tiện ích
  
  | Package             | Mục đích                                      |
| ------------------- | --------------------------------------------- |
| `express-validator` | Validate input đầu vào                        |
| `uuid`              | Tạo ID unique nếu không dùng database auto ID |
| `dayjs`             | Xử lý ngày giờ nhẹ hơn moment.js              |
| `axios`             | Gọi API từ server tới dịch vụ khác            |
| `multer`            | Xử lý upload file (nếu cần)                   |
  5. Dev Tools
  
| Package                                  | Mục đích                            |
| ---------------------------------------- | ----------------------------------- |
| `nodemon`                                | Tự restart server khi thay đổi code |
| `eslint` & `prettier`                    | Format và lint code nhất quán       |
| `swagger-jsdoc` & `swagger-ui-express`   | Tạo API docs từ comment             |
| `jest` hoặc `mocha`, `chai`, `supertest` | Testing                             |

npm install express cors dotenv morgan helmet compression jsonwebtoken bcryptjs cookie-parser express-validator uuid dayjs axios multer @prisma/client
npm install --save-dev prisma nodemon eslint prettier
npx prisma init

🧨 Chi tiết lỗi: HIỆN TẠI CÓ MỘT SỐ PHIÊN BẢN SẼ BỊ LỖI KHI TRIỂN KHAI INSTALL THEO HỆ THỐNG - XUẤT HIỆN MỘT SỐ LỖI MÀ RED HAT SẼ PHÁT HIỆN VÀ THÔNG BÁO, HIỆN TẠI ĐÃ FIX NẾU THẤY GÌ THÌ THÔNG BÁO LẠI 

