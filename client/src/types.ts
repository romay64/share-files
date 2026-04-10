export interface User {
  id: string;
  username: string;
  email: string;
  bio: string;
  avatarColor: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  from?: User;
  to?: User;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  owner: User;
  members: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: 'document' | 'book';
  authorId: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}
