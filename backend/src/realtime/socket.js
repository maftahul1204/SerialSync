const { Server } = require('socket.io');
const env = require('../config/env');
const { originCheck } = require('../config/cors');
const { COOKIE_NAME, verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models/User');

let io = null;

function parseCookie(header, name) {
  if (!header) return null;
  const parts = header.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

function initSocket(httpServer, app) {
  io = new Server(httpServer, {
    cors: { origin: originCheck, credentials: true },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token =
        parseCookie(socket.handshake.headers.cookie, COOKIE_NAME) ||
        socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (!user?.isActive) return next(new Error('Invalid session'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_queue', ({ sessionId }) => {
      if (sessionId) socket.join(`queue:${sessionId}`);
    });
    socket.on('leave_queue', ({ sessionId }) => {
      if (sessionId) socket.leave(`queue:${sessionId}`);
    });
  });

  app.set('io', io);
  return io;
}

function getIo() {
  return io;
}

module.exports = { initSocket, getIo };
