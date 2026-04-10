import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';

const router = Router();

// GET /messages/:friendId — conversation history
router.get('/:friendId', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { friendId } = req.params;

  if (!db.areFriends(userId, friendId)) {
    res.status(403).json({ error: 'Must be friends to view messages' }); return;
  }

  const messages = db.getConversation(userId, friendId);
  res.json(messages);
});

export default router;
