import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';

const router = Router();

function projectWithMembers(project: ReturnType<typeof db.getProjectById>) {
  if (!project) return null;
  const owner = db.getUserById(project.ownerId);
  const members = project.memberIds.map(id => {
    const u = db.getUserById(id);
    if (!u) return null;
    const { passwordHash, ...pub } = u;
    return pub;
  }).filter(Boolean);
  const ownerPub = owner ? (({ passwordHash, ...p }) => p)(owner) : null;
  return { ...project, owner: ownerPub, members };
}

// GET /projects
router.get('/', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const projects = db.getProjectsForUser(userId).map(projectWithMembers);
  res.json(projects);
});

// POST /projects
router.post('/', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { name, description } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

  const project = db.createProject({
    id: uuidv4(),
    name: name.trim().slice(0, 100),
    description: (description || '').slice(0, 500),
    ownerId: userId,
    memberIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(projectWithMembers(project));
});

// GET /projects/:id
router.get('/:id', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const project = db.getProjectById(req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (project.ownerId !== userId && !project.memberIds.includes(userId)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  res.json(projectWithMembers(project));
});

// PUT /projects/:id
router.put('/:id', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const project = db.getProjectById(req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (project.ownerId !== userId) { res.status(403).json({ error: 'Only the owner can edit' }); return; }

  const { name, description } = req.body;
  const updates: Partial<typeof project> = {};
  if (name?.trim()) updates.name = name.trim().slice(0, 100);
  if (typeof description === 'string') updates.description = description.slice(0, 500);

  const updated = db.updateProject(req.params.id, updates);
  res.json(projectWithMembers(updated));
});

// DELETE /projects/:id
router.delete('/:id', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const project = db.getProjectById(req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (project.ownerId !== userId) { res.status(403).json({ error: 'Only the owner can delete' }); return; }

  db.deleteDocumentsForProject(req.params.id);
  db.deleteProject(req.params.id);
  res.json({ success: true });
});

// POST /projects/:id/members — add a friend as member
router.post('/:id/members', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const project = db.getProjectById(req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (project.ownerId !== userId) { res.status(403).json({ error: 'Only the owner can add members' }); return; }

  const { memberId } = req.body;
  if (!memberId) { res.status(400).json({ error: 'memberId is required' }); return; }
  if (!db.getUserById(memberId)) { res.status(404).json({ error: 'User not found' }); return; }
  if (!db.areFriends(userId, memberId)) {
    res.status(403).json({ error: 'User must be your friend to add to project' }); return;
  }
  if (project.memberIds.includes(memberId)) {
    res.status(409).json({ error: 'Already a member' }); return;
  }

  project.memberIds.push(memberId);
  project.updatedAt = new Date().toISOString();
  res.json(projectWithMembers(project));
});

// DELETE /projects/:id/members/:memberId
router.delete('/:id/members/:memberId', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const project = db.getProjectById(req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  if (project.ownerId !== userId) { res.status(403).json({ error: 'Only the owner can remove members' }); return; }

  project.memberIds = project.memberIds.filter(id => id !== req.params.memberId);
  project.updatedAt = new Date().toISOString();
  res.json(projectWithMembers(project));
});

export default router;
