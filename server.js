const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 🔹 Cấu hình bảo mật & middleware cơ bản
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// 🔹 Giới hạn tốc độ truy cập
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  limit: 300, // Tối đa 300 requests / phút
});
app.use(limiter);

// 🔹 Phục vụ file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Trả về index.html khi người dùng vào trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔹 Socket.io cơ bản
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// 🔹 Cổng khởi chạy (Render sẽ tự đặt PORT)
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
