import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './ProjectsPage.css';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Project[]>('/projects').then(r => setProjects(r.data)).catch(() => {});
  }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const r = await api.post<Project>('/projects', { name, description });
      setProjects(prev => [r.data, ...prev]);
      setShowModal(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const myProjects = projects.filter(p => p.ownerId === user?.id);
  const sharedProjects = projects.filter(p => p.ownerId !== user?.id);

  return (
    <div className="projects-page">
      <div className="page-header-row">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </button>
      </div>

      {myProjects.length > 0 && (
        <section className="projects-section">
          <h2 className="section-title">My Projects</h2>
          <div className="projects-grid">
            {myProjects.map(p => (
              <ProjectCard key={p.id} project={p} isOwner />
            ))}
          </div>
        </section>
      )}

      {sharedProjects.length > 0 && (
        <section className="projects-section">
          <h2 className="section-title">Shared with Me</h2>
          <div className="projects-grid">
            {sharedProjects.map(p => (
              <ProjectCard key={p.id} project={p} isOwner={false} />
            ))}
          </div>
        </section>
      )}

      {projects.length === 0 && (
        <div className="empty-state">
          <div className="icon">📁</div>
          <p>No projects yet.<br />Create your first project to get started!</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={createProject} className="modal-body">
              {error && <div className="modal-error">{error}</div>}
              <div className="field">
                <label>Project Name</label>
                <input
                  className="input"
                  placeholder="My awesome project"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Description <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
                <textarea
                  className="input textarea"
                  placeholder="What is this project about?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
                  {creating ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, isOwner }: { project: Project; isOwner: boolean }) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#3b82f6', '#f97316'];
  const color = colors[project.name.charCodeAt(0) % colors.length];

  return (
    <Link to={`/projects/${project.id}`} className="project-card-full">
      <div className="project-card-top" style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}>
        <div className="project-card-icon-lg" style={{ background: color }}>
          {project.name[0].toUpperCase()}
        </div>
        {isOwner && <span className="badge badge-primary">Owner</span>}
      </div>
      <div className="project-card-body">
        <div className="project-card-name">{project.name}</div>
        {project.description && (
          <div className="project-card-desc">{project.description}</div>
        )}
        <div className="project-card-footer">
          <div className="project-members">
            {[project.owner, ...project.members].slice(0, 4).map((m, i) => (
              <div
                key={m.id}
                className="avatar avatar-sm member-avatar"
                style={{ background: m.avatarColor, marginLeft: i > 0 ? -8 : 0 }}
                title={m.username}
              >
                {m.username[0].toUpperCase()}
              </div>
            ))}
            {project.members.length > 3 && (
              <div className="avatar avatar-sm member-avatar member-more" style={{ marginLeft: -8 }}>
                +{project.members.length - 3}
              </div>
            )}
          </div>
          <span className="project-updated">
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
