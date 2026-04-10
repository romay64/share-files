import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { User, Message } from '../types';
import './ChatPage.css';

export default function ChatPage() {
  const { user } = useAuth();
  const { friendId } = useParams<{ friendId?: string }>();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<User[]>([]);
  const [activeFriend, setActiveFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [socketReady, setSocketReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load friends
  useEffect(() => {
    api.get<User[]>('/friends').then(r => setFriends(r.data)).catch(() => {});
  }, []);

  // Connect socket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const serverUrl = process.env.REACT_APP_API_URL ||
      (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:4000');
    const socket = io(serverUrl, {
      auth: { token },
    });
    socketRef.current = socket;
    socket.on('connect', () => setSocketReady(true));
    socket.on('new_message', (msg: Message) => {
      setMessages(prev =>
        prev.some(m => m.id === msg.id) ? prev : [...prev, msg]
      );
    });
    socket.on('message_sent', (msg: Message) => {
      setMessages(prev =>
        prev.some(m => m.id === msg.id) ? prev : [...prev, msg]
      );
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  // Set active friend from URL param
  useEffect(() => {
    if (!friendId || friends.length === 0) return;
    const f = friends.find(f => f.id === friendId);
    if (f) setActiveFriend(f);
  }, [friendId, friends]);

  // Load messages when active friend changes
  useEffect(() => {
    if (!activeFriend) return;
    api.get<Message[]>(`/messages/${activeFriend.id}`)
      .then(r => setMessages(r.data))
      .catch(() => setMessages([]));
  }, [activeFriend]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectFriend = (f: User) => {
    setActiveFriend(f);
    navigate(`/chat/${f.id}`);
  };

  const sendMessage = () => {
    if (!input.trim() || !activeFriend || !socketRef.current) return;
    socketRef.current.emit('send_message', {
      receiverId: activeFriend.id,
      content: input.trim(),
    });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const date = formatDate(m.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(m);
    else grouped.push({ date, msgs: [m] });
  });

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Messages</h2>
        </div>
        <div className="chat-friends-list">
          {friends.length === 0 && (
            <div className="chat-empty-friends">
              <p>Add friends to start chatting.</p>
            </div>
          )}
          {friends.map(f => (
            <button
              key={f.id}
              className={`chat-friend-btn ${activeFriend?.id === f.id ? 'chat-friend-btn--active' : ''}`}
              onClick={() => selectFriend(f)}
            >
              <div className="avatar avatar-sm" style={{ background: f.avatarColor }}>
                {f.username[0].toUpperCase()}
              </div>
              <span>{f.username}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {!activeFriend ? (
          <div className="chat-placeholder">
            <div style={{ fontSize: 48, opacity: 0.3 }}>💬</div>
            <p>Select a friend to start chatting</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="avatar avatar-sm" style={{ background: activeFriend.avatarColor }}>
                {activeFriend.username[0].toUpperCase()}
              </div>
              <div>
                <div className="chat-friend-name">{activeFriend.username}</div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-no-messages">
                  No messages yet. Say hi to {activeFriend.username}!
                </div>
              )}
              {grouped.map(group => (
                <div key={group.date}>
                  <div className="chat-date-divider">
                    <span>{group.date}</span>
                  </div>
                  {group.msgs.map((msg, i) => {
                    const isOwn = msg.senderId === user?.id;
                    const prevMsg = group.msgs[i - 1];
                    const showAvatar = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);
                    return (
                      <div key={msg.id} className={`chat-message ${isOwn ? 'chat-message--own' : ''}`}>
                        {!isOwn && (
                          <div className={`chat-message-avatar ${showAvatar ? '' : 'chat-message-avatar--hidden'}`}>
                            <div className="avatar avatar-sm" style={{ background: activeFriend.avatarColor }}>
                              {activeFriend.username[0].toUpperCase()}
                            </div>
                          </div>
                        )}
                        <div className="chat-bubble-wrap">
                          <div className="chat-bubble">{msg.content}</div>
                          <div className="chat-time">{formatTime(msg.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <textarea
                className="chat-input"
                placeholder={`Message ${activeFriend.username}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="btn btn-primary btn-icon send-btn"
                onClick={sendMessage}
                disabled={!input.trim()}
                title="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
