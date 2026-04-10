import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { User, FriendRequest } from '../types';
import './FriendsPage.css';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(() => {
    api.get<User[]>('/friends').then(r => {
      setFriends(r.data);
      setFriendIds(new Set(r.data.map(f => f.id)));
    }).catch(() => {});
    api.get<FriendRequest[]>('/friends/requests').then(r => setRequests(r.data)).catch(() => {});
    api.get<FriendRequest[]>('/friends/sent').then(r => setSentIds(new Set(r.data.map(req => req.toUserId)))).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.get<User[]>(`/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => setSearchResults(r.data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const sendRequest = async (toUserId: string) => {
    try {
      await api.post('/friends/request', { toUserId });
      setSentIds(prev => new Set([...prev, toUserId]));
      setMessage('Friend request sent!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to send request');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRequest = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await api.put(`/friends/request/${id}`, { status });
      refresh();
    } catch {}
  };

  const removeFriend = async (friendId: string) => {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await api.delete(`/friends/${friendId}`);
      refresh();
    } catch {}
  };

  return (
    <div className="friends-page">
      <div className="page-header">
        <h1>Friends</h1>
      </div>

      {message && <div className="toast">{message}</div>}

      <div className="tab-bar">
        <button className={`tab ${tab === 'friends' ? 'tab--active' : ''}`} onClick={() => setTab('friends')}>
          Friends <span className="tab-count">{friends.length}</span>
        </button>
        <button className={`tab ${tab === 'requests' ? 'tab--active' : ''}`} onClick={() => setTab('requests')}>
          Requests {requests.length > 0 && <span className="tab-count tab-count--badge">{requests.length}</span>}
        </button>
        <button className={`tab ${tab === 'search' ? 'tab--active' : ''}`} onClick={() => setTab('search')}>
          Find People
        </button>
      </div>

      {tab === 'friends' && (
        <div className="friends-tab">
          {friends.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <p>No friends yet. Use "Find People" to add some!</p>
            </div>
          ) : (
            <div className="user-list">
              {friends.map(f => (
                <div key={f.id} className="user-row">
                  <div className="avatar avatar-md" style={{ background: f.avatarColor }}>
                    {f.username[0].toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{f.username}</div>
                    {f.bio && <div className="user-bio">{f.bio}</div>}
                  </div>
                  <div className="user-actions">
                    <Link to={`/chat/${f.id}`} className="btn btn-primary btn-sm">
                      Message
                    </Link>
                    <button className="btn btn-danger btn-sm" onClick={() => removeFriend(f.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="requests-tab">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📬</div>
              <p>No pending friend requests.</p>
            </div>
          ) : (
            <div className="user-list">
              {requests.map(req => (
                <div key={req.id} className="user-row">
                  <div className="avatar avatar-md" style={{ background: req.from?.avatarColor }}>
                    {req.from?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{req.from?.username}</div>
                    <div className="user-bio">{req.from?.email}</div>
                  </div>
                  <div className="user-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => handleRequest(req.id, 'accepted')}>
                      Accept
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRequest(req.id, 'declined')}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'search' && (
        <div className="search-tab">
          <input
            className="input search-input"
            type="text"
            placeholder="Search by username or email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="search-hint">Type at least 2 characters to search.</p>
          )}
          {searchResults.length > 0 && (
            <div className="user-list">
              {searchResults.map(u => {
                const isFriend = friendIds.has(u.id);
                const isPending = sentIds.has(u.id);
                return (
                  <div key={u.id} className="user-row">
                    <div className="avatar avatar-md" style={{ background: u.avatarColor }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{u.username}</div>
                      {u.bio && <div className="user-bio">{u.bio}</div>}
                    </div>
                    <div className="user-actions">
                      {isFriend ? (
                        <span className="badge badge-success">Friends</span>
                      ) : isPending ? (
                        <span className="badge badge-warning">Requested</span>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => sendRequest(u.id)}>
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <p>No users found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
