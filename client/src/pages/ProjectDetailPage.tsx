import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Project, Document, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './ProjectDetailPage.css';

type View = 'docs' | 'members';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [view, setView] = useState<View>('docs');
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<'document' | 'book'>('document');
  const [showAddMember, setShowAddMember] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwner = project?.ownerId === user?.id;

  useEffect(() => {
    if (!projectId) return;
    api.get<Project>(`/projects/${projectId}`)
      .then(r => setProject(r.data))
      .catch(() => navigate('/projects'));
    api.get<Document[]>(`/projects/${projectId}/documents`)
      .then(r => setDocuments(r.data))
      .catch(() => {});
  }, [projectId, navigate]);

  useEffect(() => {
    api.get<User[]>('/friends').then(r => setFriends(r.data)).catch(() => {});
  }, []);

  const openDoc = (doc: Document) => {
    setActiveDoc(doc);
    setEditorContent(doc.content);
    setEditorTitle(doc.title);
  };

  const autoSave = (content: string, title: string) => {
    if (!activeDoc || !projectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingDoc(true);
      try {
        const r = await api.put<Document>(`/projects/${projectId}/documents/${activeDoc.id}`, { content, title });
        setDocuments(prev => prev.map(d => d.id === r.data.id ? r.data : d));
        setActiveDoc(r.data);
      } catch {}
      setSavingDoc(false);
    }, 800);
  };

  const handleContentChange = (val: string) => {
    setEditorContent(val);
    autoSave(val, editorTitle);
  };

  const handleTitleChange = (val: string) => {
    setEditorTitle(val);
    autoSave(editorContent, val);
  };

  const createDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newDocTitle.trim()) return;
    try {
      const r = await api.post<Document>(`/projects/${projectId}/documents`, {
        title: newDocTitle.trim(),
        type: newDocType,
      });
      setDocuments(prev => [r.data, ...prev]);
      setShowNewDocModal(false);
      setNewDocTitle('');
      openDoc(r.data);
    } catch {}
  };

  const deleteDocument = async (docId: string) => {
    if (!projectId || !window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/projects/${projectId}/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (activeDoc?.id === docId) setActiveDoc(null);
    } catch {}
  };

  const deleteProject = async () => {
    if (!projectId || !window.confirm('Delete this entire project and all its documents?')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      navigate('/projects');
    } catch {}
  };

  const addMember = async (memberId: string) => {
    if (!projectId) return;
    setAddingMember(memberId);
    try {
      const r = await api.post<Project>(`/projects/${projectId}/members`, { memberId });
      setProject(r.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(null);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!projectId || !window.confirm('Remove this member?')) return;
    try {
      const r = await api.delete<Project>(`/projects/${projectId}/members/${memberId}`);
      setProject(r.data);
    } catch {}
  };

  const nonMembers = friends.filter(f =>
    f.id !== project?.ownerId &&
    !project?.memberIds.includes(f.id) &&
    (friendSearch === '' || f.username.toLowerCase().includes(friendSearch.toLowerCase()))
  );

  if (!project) {
    return (
      <div className="empty-state">
        <div className="icon">⏳</div>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="project-detail">
      {/* Left: doc list */}
      <div className="doc-sidebar">
        <div className="doc-sidebar-header">
          <Link to="/projects" className="back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Projects
          </Link>
          <div className="project-title-row">
            <div className="project-icon-sm">{project.name[0].toUpperCase()}</div>
            <span className="project-title">{project.name}</span>
          </div>
        </div>

        <div className="doc-sidebar-tabs">
          <button className={`doc-tab ${view === 'docs' ? 'doc-tab--active' : ''}`} onClick={() => setView('docs')}>
            Docs
          </button>
          <button className={`doc-tab ${view === 'members' ? 'doc-tab--active' : ''}`} onClick={() => setView('members')}>
            Members
          </button>
        </div>

        {view === 'docs' && (
          <>
            <button className="new-doc-btn" onClick={() => setShowNewDocModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Document
            </button>
            <div className="doc-list">
              {documents.length === 0 && (
                <div className="doc-list-empty">No documents yet.</div>
              )}
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className={`doc-item ${activeDoc?.id === doc.id ? 'doc-item--active' : ''}`}
                  onClick={() => openDoc(doc)}
                >
                  <span className="doc-type-icon">{doc.type === 'book' ? '📖' : '📄'}</span>
                  <span className="doc-item-title">{doc.title}</span>
                  <button
                    className="doc-delete-btn"
                    onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {isOwner && (
              <button className="delete-project-btn" onClick={deleteProject}>
                Delete Project
              </button>
            )}
          </>
        )}

        {view === 'members' && (
          <div className="members-panel">
            <div className="members-list">
              {/* Owner */}
              <div className="member-row">
                <div className="avatar avatar-sm" style={{ background: project.owner.avatarColor }}>
                  {project.owner.username[0].toUpperCase()}
                </div>
                <div className="member-info">
                  <span className="member-name">{project.owner.username}</span>
                  <span className="badge badge-primary" style={{ fontSize: 10 }}>Owner</span>
                </div>
              </div>
              {project.members.map(m => (
                <div key={m.id} className="member-row">
                  <div className="avatar avatar-sm" style={{ background: m.avatarColor }}>
                    {m.username[0].toUpperCase()}
                  </div>
                  <span className="member-name">{m.username}</span>
                  {isOwner && (
                    <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isOwner && (
              <div className="add-member-section">
                <div className="add-member-header">
                  <span className="add-member-title">Add Friend</span>
                </div>
                <input
                  className="input"
                  style={{ fontSize: 13 }}
                  placeholder="Search friends…"
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                />
                <div className="add-member-list">
                  {nonMembers.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
                      {friends.length === 0 ? 'Add friends first.' : 'All friends already added.'}
                    </div>
                  )}
                  {nonMembers.map(f => (
                    <div key={f.id} className="add-member-row">
                      <div className="avatar avatar-sm" style={{ background: f.avatarColor }}>
                        {f.username[0].toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: 13 }}>{f.username}</span>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={addingMember === f.id}
                        onClick={() => addMember(f.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: editor */}
      <div className="editor-area">
        {!activeDoc ? (
          <div className="editor-empty">
            <div style={{ fontSize: 48, opacity: 0.2 }}>✍️</div>
            <p>Select a document to open it, or create a new one.</p>
          </div>
        ) : (
          <>
            <div className="editor-toolbar">
              <span className="editor-type-badge">
                {activeDoc.type === 'book' ? '📖 Book' : '📄 Document'}
              </span>
              <span className="editor-author">by {activeDoc.author?.username}</span>
              <span className={`editor-save-status ${savingDoc ? 'editor-save-status--saving' : ''}`}>
                {savingDoc ? 'Saving…' : 'Saved'}
              </span>
            </div>
            <input
              className="editor-title-input"
              value={editorTitle}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Untitled"
              maxLength={200}
            />
            <textarea
              className="editor-content"
              value={editorContent}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="Start writing here…"
            />
          </>
        )}
      </div>

      {/* New doc modal */}
      {showNewDocModal && (
        <div className="modal-overlay" onClick={() => setShowNewDocModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Document</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNewDocModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={createDocument} className="modal-body">
              <div className="field">
                <label>Title</label>
                <input
                  className="input"
                  placeholder="My document"
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  maxLength={200}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Type</label>
                <div className="type-picker">
                  <button
                    type="button"
                    className={`type-option ${newDocType === 'document' ? 'type-option--active' : ''}`}
                    onClick={() => setNewDocType('document')}
                  >
                    <span>📄</span>
                    <span>Document</span>
                  </button>
                  <button
                    type="button"
                    className={`type-option ${newDocType === 'book' ? 'type-option--active' : ''}`}
                    onClick={() => setNewDocType('book')}
                  >
                    <span>📖</span>
                    <span>Book</span>
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewDocModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!newDocTitle.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
