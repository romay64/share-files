import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';

const router = Router();

function isProjectMember(projectId: string, userId: string): boolean {
  const project = db.getProjectById(projectId);
  if (!project) return false;
  return project.ownerId === userId || project.memberIds.includes(userId);
}

// GET /projects/:projectId/documents
router.get('/:projectId/documents', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { projectId } = req.params;
  if (!isProjectMember(projectId, userId)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const docs = db.getDocumentsForProject(projectId).map(d => {
    const author = db.getUserById(d.authorId);
    return { ...d, author: author ? (({ passwordHash, ...p }) => p)(author) : null };
  });
  res.json(docs);
});

// POST /projects/:projectId/documents
router.post('/:projectId/documents', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { projectId } = req.params;
  if (!isProjectMember(projectId, userId)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const { title, type } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: 'title is required' }); return; }
  if (!['document', 'book'].includes(type)) {
    res.status(400).json({ error: 'type must be document or book' }); return;
  }

  const doc = db.createDocument({
    id: uuidv4(),
    projectId,
    title: title.trim().slice(0, 200),
    content: '',
    type,
    authorId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(doc);
});

// GET /projects/:projectId/documents/:docId
router.get('/:projectId/documents/:docId', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { projectId, docId } = req.params;
  if (!isProjectMember(projectId, userId)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const doc = db.getDocumentById(docId);
  if (!doc || doc.projectId !== projectId) {
    res.status(404).json({ error: 'Document not found' }); return;
  }
  const author = db.getUserById(doc.authorId);
  res.json({ ...doc, author: author ? (({ passwordHash, ...p }) => p)(author) : null });
});

// PUT /projects/:projectId/documents/:docId
router.put('/:projectId/documents/:docId', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { projectId, docId } = req.params;
  if (!isProjectMember(projectId, userId)) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const doc = db.getDocumentById(docId);
  if (!doc || doc.projectId !== projectId) {
    res.status(404).json({ error: 'Document not found' }); return;
  }

  const updates: Partial<typeof doc> = {};
  if (req.body.title?.trim()) updates.title = req.body.title.trim().slice(0, 200);
  if (typeof req.body.content === 'string') updates.content = req.body.content;

  const updated = db.updateDocument(docId, updates);
  res.json(updated);
});

// DELETE /projects/:projectId/documents/:docId
router.delete('/:projectId/documents/:docId', requireAuth, (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { projectId, docId } = req.params;
  const project = db.getProjectById(projectId);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const doc = db.getDocumentById(docId);
  if (!doc || doc.projectId !== projectId) {
    res.status(404).json({ error: 'Document not found' }); return;
  }
  if (project.ownerId !== userId && doc.authorId !== userId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  db.deleteDocument(docId);
  res.json({ success: true });
});

export default router;
