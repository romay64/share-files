import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { User } from '../types';

const router = Router();

function toPublic(user: User) {
  const { passwordHash, ...pub } = user;
  return pub;
}

router.get('/me', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const user = db.getUserById(userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(toPublic(user));
});

router.put('/me', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const user = db.getUserById(userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const { bio } = req.body;
  if (typeof bio === 'string') user.bio = bio.slice(0, 200);
  res.json(toPublic(user));
});

router.get('/search', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const query = String(req.query.q || '').trim();
  if (query.length < 2) {
    res.json([]);
    return;
  }
  const results = db.searchUsers(query, userId).slice(0, 20).map(toPublic);
  res.json(results);
});

router.get('/:id', requireAuth, (req, res: Response) => {
  const user = db.getUserById(req.params.id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(toPublic(user));
});

export default router;
