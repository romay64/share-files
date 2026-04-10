import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { User } from '../types';

const router = Router();

function toPublic(user: User) {
  const { passwordHash, ...pub } = user;
  return pub;
}

// GET /friends — list of friends
router.get('/', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const friendIds = db.getFriendsOfUser(userId);
  const friends = friendIds.map(id => db.getUserById(id)).filter(Boolean).map(u => toPublic(u!));
  res.json(friends);
});

// GET /friends/requests — incoming pending requests
router.get('/requests', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const pending = db.getPendingRequestsForUser(userId);
  const enriched = pending.map(r => {
    const from = db.getUserById(r.fromUserId);
    return { ...r, from: from ? toPublic(from) : null };
  });
  res.json(enriched);
});

// GET /friends/sent — outgoing pending requests
router.get('/sent', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const sent = db.getSentRequestsForUser(userId);
  const enriched = sent.map(r => {
    const to = db.getUserById(r.toUserId);
    return { ...r, to: to ? toPublic(to) : null };
  });
  res.json(enriched);
});

// POST /friends/request — send a friend request
router.post('/request', requireAuth, (req, res: Response) => {
  const fromUserId = (req as AuthenticatedRequest).userId;
  const { toUserId } = req.body;

  if (!toUserId) { res.status(400).json({ error: 'toUserId is required' }); return; }
  if (toUserId === fromUserId) { res.status(400).json({ error: 'Cannot add yourself' }); return; }
  if (!db.getUserById(toUserId)) { res.status(404).json({ error: 'User not found' }); return; }
  if (db.areFriends(fromUserId, toUserId)) { res.status(409).json({ error: 'Already friends' }); return; }

  const existing = db.getFriendRequest(fromUserId, toUserId)
    || db.getFriendRequest(toUserId, fromUserId);
  if (existing?.status === 'pending') {
    res.status(409).json({ error: 'Friend request already pending' }); return;
  }

  const friendReq = db.createFriendRequest({
    id: uuidv4(),
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(friendReq);
});

// PUT /friends/request/:id — accept or decline
router.put('/request/:id', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { status } = req.body;

  if (!['accepted', 'declined'].includes(status)) {
    res.status(400).json({ error: 'status must be accepted or declined' }); return;
  }

  const friendReq = db.getFriendRequestById(req.params.id);
  if (!friendReq) { res.status(404).json({ error: 'Request not found' }); return; }
  if (friendReq.toUserId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (friendReq.status !== 'pending') { res.status(409).json({ error: 'Request already handled' }); return; }

  const updated = db.updateFriendRequest(req.params.id, status);
  res.json(updated);
});

// DELETE /friends/:id — remove a friend
router.delete('/:id', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const friendId = req.params.id;

  if (!db.areFriends(userId, friendId)) {
    res.status(404).json({ error: 'Not friends' }); return;
  }

  // Mark the friendship request as declined to remove it
  const reqs = Array.from(db.friendRequests.values()).filter(
    r => r.status === 'accepted' && (
      (r.fromUserId === userId && r.toUserId === friendId) ||
      (r.fromUserId === friendId && r.toUserId === userId)
    )
  );
  reqs.forEach(r => db.updateFriendRequest(r.id, 'declined'));
  res.json({ success: true });
});

export default router;
