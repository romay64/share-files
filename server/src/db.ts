import { User, FriendRequest, Message, Project, Document } from './types';

class Database {
  users: Map<string, User> = new Map();
  friendRequests: Map<string, FriendRequest> = new Map();
  messages: Map<string, Message> = new Map();
  projects: Map<string, Project> = new Map();
  documents: Map<string, Document> = new Map();

  // Users
  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  searchUsers(query: string, excludeId: string): User[] {
    const q = query.toLowerCase();
    return Array.from(this.users.values()).filter(
      u => u.id !== excludeId && (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    );
  }

  // Friend Requests
  createFriendRequest(req: FriendRequest): FriendRequest {
    this.friendRequests.set(req.id, req);
    return req;
  }

  getFriendRequest(fromId: string, toId: string): FriendRequest | undefined {
    return Array.from(this.friendRequests.values()).find(
      r => r.fromUserId === fromId && r.toUserId === toId
    );
  }

  getFriendRequestById(id: string): FriendRequest | undefined {
    return this.friendRequests.get(id);
  }

  updateFriendRequest(id: string, status: FriendRequest['status']): FriendRequest | undefined {
    const req = this.friendRequests.get(id);
    if (!req) return undefined;
    req.status = status;
    return req;
  }

  getPendingRequestsForUser(userId: string): FriendRequest[] {
    return Array.from(this.friendRequests.values()).filter(
      r => r.toUserId === userId && r.status === 'pending'
    );
  }

  getSentRequestsForUser(userId: string): FriendRequest[] {
    return Array.from(this.friendRequests.values()).filter(
      r => r.fromUserId === userId && r.status === 'pending'
    );
  }

  getFriendsOfUser(userId: string): string[] {
    const accepted = Array.from(this.friendRequests.values()).filter(
      r => r.status === 'accepted' && (r.fromUserId === userId || r.toUserId === userId)
    );
    return accepted.map(r => r.fromUserId === userId ? r.toUserId : r.fromUserId);
  }

  areFriends(userId1: string, userId2: string): boolean {
    return Array.from(this.friendRequests.values()).some(
      r => r.status === 'accepted' && (
        (r.fromUserId === userId1 && r.toUserId === userId2) ||
        (r.fromUserId === userId2 && r.toUserId === userId1)
      )
    );
  }

  // Messages
  createMessage(msg: Message): Message {
    this.messages.set(msg.id, msg);
    return msg;
  }

  getConversation(userId1: string, userId2: string): Message[] {
    return Array.from(this.messages.values())
      .filter(m =>
        (m.senderId === userId1 && m.receiverId === userId2) ||
        (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Projects
  createProject(project: Project): Project {
    this.projects.set(project.id, project);
    return project;
  }

  getProjectById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const project = this.projects.get(id);
    if (!project) return undefined;
    Object.assign(project, updates, { updatedAt: new Date().toISOString() });
    return project;
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  getProjectsForUser(userId: string): Project[] {
    return Array.from(this.projects.values()).filter(
      p => p.ownerId === userId || p.memberIds.includes(userId)
    );
  }

  // Documents
  createDocument(doc: Document): Document {
    this.documents.set(doc.id, doc);
    return doc;
  }

  getDocumentById(id: string): Document | undefined {
    return this.documents.get(id);
  }

  updateDocument(id: string, updates: Partial<Document>): Document | undefined {
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
    return doc;
  }

  deleteDocument(id: string): boolean {
    return this.documents.delete(id);
  }

  getDocumentsForProject(projectId: string): Document[] {
    return Array.from(this.documents.values())
      .filter(d => d.projectId === projectId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  deleteDocumentsForProject(projectId: string): void {
    Array.from(this.documents.values())
      .filter(d => d.projectId === projectId)
      .forEach(d => this.documents.delete(d.id));
  }
}

export const db = new Database();
