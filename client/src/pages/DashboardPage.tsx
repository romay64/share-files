import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { Project, User, FriendRequest } from '../types';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    api.get<Project[]>('/projects').then(r => setProjects(r.data)).catch(() => {});
    api.get<User[]>('/friends').then(r => setFriends(r.data)).catch(() => {});
    api.get<FriendRequest[]>('/friends/requests').then(r => setRequests(r.data)).catch(() => {});
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-greeting">
        <div className="avatar avatar-lg" style={{ background: user?.avatarColor }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1>Welcome back, {user?.username}!</h1>
          <p>Here's what's happening today.</p>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon stat-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div className="stat-number">{projects.length}</div>
            <div className="stat-label">Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div className="stat-number">{friends.length}</div>
            <div className="stat-label">Friends</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div>
            <div className="stat-number">{requests.length}</div>
            <div className="stat-label">Pending requests</div>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Recent Projects</h2>
            <Link to="/projects" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📁</div>
              <p>No projects yet.<br /><Link to="/projects">Create your first project</Link></p>
            </div>
          ) : (
            <div className="project-list">
              {projects.slice(0, 4).map(p => (
                <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
                  <div className="project-card-icon">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="project-name">{p.name}</div>
                    <div className="project-meta">{p.members.length + 1} member{p.members.length !== 0 ? 's' : ''}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>Friends</h2>
            <Link to="/friends" className="btn btn-ghost btn-sm">Manage</Link>
          </div>
          {requests.length > 0 && (
            <Link to="/friends" className="requests-notice">
              <span>🔔</span> {requests.length} pending friend request{requests.length > 1 ? 's' : ''}
            </Link>
          )}
          {friends.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <p>No friends yet.<br /><Link to="/friends">Find people</Link></p>
            </div>
          ) : (
            <div className="friends-list">
              {friends.slice(0, 6).map(f => (
                <Link key={f.id} to={`/chat/${f.id}`} className="friend-item">
                  <div className="avatar avatar-sm" style={{ background: f.avatarColor }}>
                    {f.username[0].toUpperCase()}
                  </div>
                  <span>{f.username}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
