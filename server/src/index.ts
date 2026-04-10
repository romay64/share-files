import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import friendRoutes from './routes/friends';
import messageRoutes from './routes/messages';
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import { db } from './db';

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'sharefiles-secret-key-change-in-prod';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/friends', friendRoutes);
app.use('/messages', messageRoutes);
app.use('/projects', projectRoutes);
app.use('/projects', documentRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../../client/build');
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Socket.io: real-time chat
const userSockets = new Map<string, string>(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string;
  if (!token) { next(new Error('Authentication error')); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (socket as any).userId = payload.userId;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId as string;
  userSockets.set(userId, socket.id);

  socket.on('send_message', (data: { receiverId: string; content: string }) => {
    if (!data.content?.trim()) return;
    if (!db.areFriends(userId, data.receiverId)) return;

    const message = db.createMessage({
      id: uuidv4(),
      senderId: userId,
      receiverId: data.receiverId,
      content: data.content.trim().slice(0, 2000),
      createdAt: new Date().toISOString(),
    });

    // Send to receiver if online
    const receiverSocketId = userSockets.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_message', message);
    }
    // Confirm back to sender
    socket.emit('message_sent', message);
  });

  socket.on('disconnect', () => {
    userSockets.delete(userId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
