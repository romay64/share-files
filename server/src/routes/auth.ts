import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { signToken } from '../middleware/auth';
import { User } from '../types';

const router = Router();

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

function toPublic(user: User) {
  const { passwordHash, ...pub } = user;
  return pub;
}

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'username, email, and password are required' });
    return;
  }
  if (username.length < 3 || username.length > 24) {
    res.status(400).json({ error: 'Username must be 3–24 characters' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  if (db.getUserByEmail(email)) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }
  if (db.getUserByUsername(username)) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const user: User = {
    id: uuidv4(),
    username,
    email: email.toLowerCase(),
    passwordHash,
    bio: '',
    avatarColor: color,
    createdAt: new Date().toISOString(),
  };
  db.createUser(user);
  const token = signToken(user.id);
  res.status(201).json({ token, user: toPublic(user) });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  const user = db.getUserByEmail(email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = signToken(user.id);
  res.json({ token, user: toPublic(user) });
});

export default router;
