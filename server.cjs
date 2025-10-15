const path = require('path');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;

// middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// rate limit
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 300 });
app.use(limiter);

// routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// socket.io
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => console.log('User disconnected'));
});

// start server
server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
