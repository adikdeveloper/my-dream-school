import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import './ChatLayout.css';

const POLL_INTERVAL_MS = 4000;
const ROOMS_POLL_MS = 8000;

const ROOM_TYPE_LABEL = {
  class: 'Sinf guruhi',
  private: '',
  teachers_group: "O'qituvchilar guruhi",
  staff_group: 'Xodimlar guruhi',
  custom_group: 'Guruh'
};

const ROLE_LABEL = {
  admin: 'Admin',
  director: 'Direktor',
  teacher: "O'qituvchi",
  student: "O'quvchi",
  supervisor: 'Nazoratchi',
  accountant: 'Hisobchi',
  hr: 'HR',
  reception: 'Resepshen',
  callcenter: 'Call-center'
};

const STAFF_ROLE_CLASS = (role) => {
  if (role === 'student') return 'student';
  if (role === 'teacher') return 'teacher';
  if (role === 'admin') return 'admin';
  if (role === 'director') return 'director';
  return 'staff';
};

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
};

const formatRoomDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return formatTime(d);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Kecha';
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
};

const formatDayDivider = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugun';
  if (d.toDateString() === yest.toDateString()) return 'Kecha';
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
};

const getInitials = (firstName = '', lastName = '') => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
};

const RoomAvatar = ({ room, displayName, displayAvatar, size }) => {
  const apiHost = (process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api').replace(/\/api$/, '');
  const style = {};
  let initials = '?';
  if (room.type === 'private') {
    initials = (displayName || '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
    if (displayAvatar) {
      style.backgroundImage = `url(${apiHost}${displayAvatar})`;
    }
  } else if (room.type === 'class') {
    initials = '🎓';
  } else if (room.type === 'teachers_group') {
    initials = '👨‍🏫';
  } else if (room.type === 'staff_group') {
    initials = '🧑‍💼';
  } else if (room.type === 'custom_group') {
    initials = '👥';
  }
  return (
    <div
      className={`chat-room-avatar ${room.type}`}
      style={{ ...style, width: size, height: size, minWidth: size }}
    >
      {!displayAvatar && initials}
    </div>
  );
};

const RoomItem = ({ room, active, onClick, currentUserId }) => {
  const lastMsg = room.lastMessage || {};
  const previewText = lastMsg.text
    ? (lastMsg.sender && String(lastMsg.sender) === String(currentUserId) ? 'Siz: ' : (lastMsg.senderName ? `${lastMsg.senderName.split(' ')[0]}: ` : '')) + lastMsg.text
    : ROOM_TYPE_LABEL[room.type] || '';
  return (
    <div className={`chat-room-item ${active ? 'active' : ''}`} onClick={onClick}>
      <RoomAvatar room={room} displayName={room.displayName} displayAvatar={room.displayAvatar} />
      <div className="chat-room-info">
        <div className="chat-room-name">{room.displayName || room.name}</div>
        <div className="chat-room-preview">{previewText || 'Hali xabarlar yo\'q'}</div>
      </div>
      <div className="chat-room-meta">
        {lastMsg.timestamp && <span className="chat-room-time">{formatRoomDate(lastMsg.timestamp)}</span>}
        {room.unreadCount > 0 && <span className="chat-room-unread">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span>}
      </div>
    </div>
  );
};

const NewChatModal = ({ onClose, onPick }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const c = await apiService.getChatContacts();
        if (active) setContacts(c);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = contacts.filter((c) => {
    const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  return (
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header">
          <h3 className="chat-modal-title">Yangi suhbat</h3>
          <button className="chat-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="chat-modal-search">
          <input
            type="text"
            placeholder="Foydalanuvchi qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="chat-modal-list">
          {loading && <div className="chat-loading"><div className="chat-spinner" /></div>}
          {!loading && filtered.length === 0 && (
            <div className="chat-empty-list">Mavjud kontaktlar yo'q</div>
          )}
          {!loading && filtered.map((c) => (
            <div key={c._id} className="chat-contact-row" onClick={() => onPick(c)}>
              <div className="chat-room-avatar" style={{ width: 40, height: 40, minWidth: 40, fontSize: '.875rem' }}>
                {getInitials(c.firstName, c.lastName)}
              </div>
              <div className="chat-contact-info">
                <div className="chat-contact-name">{c.firstName} {c.lastName}</div>
                <div className="chat-contact-role">
                  {c.classId?.name ? `${c.classId.name} sinfi` : ''}
                </div>
              </div>
              <span className={`chat-role-badge ${STAFF_ROLE_CLASS(c.role)}`}>{ROLE_LABEL[c.role] || c.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const STICKER_PACKS = {
  'Reaktsiya': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  'Maktab': ['📚', '📖', '✏️', '🖊️', '🖋️', '📝', '📐', '📏', '🧮', '📊', '📈', '📉', '🗂️', '📂', '📁', '📋', '📌', '📍', '🎓', '🏫', '🧑‍🎓', '👨‍🏫', '👩‍🏫', '🍎', '⭐', '🌟', '✨', '💡', '🎯', '🚀', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '🔔', '📣', '📢', '⏰', '⏱️', '📅', '📆'],
  'Yurak': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '🌹', '🌷', '🌸', '🌺', '🌻', '🌼', '💐', '💌'],
  'Qo\'l': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝', '🙏', '✍️', '💪', '🦾', '🤳', '👊', '✊'],
  'Hayvon': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦞', '🐠', '🐟', '🐡', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆'],
  'Tabiat': ['🌳', '🌴', '🌲', '🌱', '🌿', '☘️', '🍀', '🎋', '🎍', '🌾', '🌵', '🌎', '🌍', '🌏', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '🌊'],
  'Ovqat': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🌮', '🌯', '🥙'],
  'Mavzu': ['🎉', '🎊', '🎈', '🎁', '🎀', '🪄', '🎆', '🎇', '🧨', '✨', '🎃', '🎄', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🥇', '🥈', '🥉', '🏆', '🎖️', '🏅', '🎯', '🎮', '🕹️', '🎰', '🎲', '🧩', '🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🎷', '🎺', '🎸', '🎻', '🎹']
};

const STICKER_TABS = Object.keys(STICKER_PACKS);

const StickerPicker = ({ onPick, onClose }) => {
  const [tab, setTab] = useState(STICKER_TABS[0]);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className="chat-sticker-panel" ref={ref}>
      <div className="chat-sticker-tabs">
        {STICKER_TABS.map((t) => (
          <button
            key={t}
            className={`chat-sticker-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            title={t}
          >
            {STICKER_PACKS[t][0]}
          </button>
        ))}
      </div>
      <div className="chat-sticker-grid">
        {STICKER_PACKS[tab].map((s, idx) => (
          <button key={idx} className="chat-sticker-item" onClick={() => onPick(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, prevMessage, currentUserId, onReply, onEdit, onDelete, roomType, activeMenuMsgId, setActiveMenuMsgId }) => {
  const isOwn = String(message.sender?._id) === String(currentUserId);
  const showSender = !isOwn && roomType !== 'private' && (!prevMessage || String(prevMessage.sender?._id) !== String(message.sender?._id));
  const sender = message.sender || {};
  const apiHost = (process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api').replace(/\/api$/, '');
  const menuRef = useRef(null);
  const isMenuOpen = activeMenuMsgId === message._id;
  const isSticker = message.messageType === 'sticker' && message.sticker;
  const canEdit = isOwn && !message.isDeleted && !isSticker;

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenuMsgId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen, setActiveMenuMsgId]);

  if (message.isSystem) {
    return (
      <div className="chat-day-divider">
        <span>{message.text}</span>
      </div>
    );
  }

  return (
    <div className={`chat-msg ${isOwn ? 'own' : ''}`}>
      {!isOwn && roomType !== 'private' && (
        <div className="chat-msg-avatar" style={sender.profileImage ? { backgroundImage: `url(${apiHost}${sender.profileImage})` } : undefined}>
          {!sender.profileImage && getInitials(sender.firstName, sender.lastName)}
        </div>
      )}
      <div className={`chat-msg-bubble ${isSticker ? 'is-sticker' : ''}`}>
        {showSender && !isSticker && (
          <div className="chat-msg-sender">{sender.firstName} {sender.lastName}</div>
        )}
        {message.replyTo && (
          <div className="chat-msg-reply">
            <div className="chat-msg-reply-author">{message.replyTo.sender?.firstName || ''} {message.replyTo.sender?.lastName || ''}</div>
            <div className="chat-msg-reply-text">
              {message.replyTo.messageType === 'sticker'
                ? `${message.replyTo.sticker || '🖼'} Stiker`
                : (message.replyTo.text || '...')}
            </div>
          </div>
        )}
        {message.isDeleted ? (
          <div className="chat-msg-deleted">Xabar o'chirildi</div>
        ) : isSticker ? (
          <div className="chat-msg-sticker">{message.sticker}</div>
        ) : (
          <div className="chat-msg-text">{message.text}</div>
        )}
        <div className="chat-msg-time">
          {formatTime(message.createdAt)}
          {message.editedAt && <span className="chat-msg-edited-mark">tahrirlangan</span>}
        </div>
        {!message.isDeleted && (
          <div className="chat-msg-actions">
            <button className="chat-msg-action-btn" title="Javob berish" onClick={() => onReply(message)}>↩</button>
            <button className="chat-msg-action-btn" title="Ko'proq" onClick={(e) => { e.stopPropagation(); setActiveMenuMsgId(isMenuOpen ? null : message._id); }}>⋮</button>
          </div>
        )}
        {isMenuOpen && (
          <div className="chat-msg-context-menu" ref={menuRef}>
            <button className="chat-msg-menu-item" onClick={() => { onReply(message); setActiveMenuMsgId(null); }}>
              <span className="chat-msg-menu-icon">↩</span> Javob berish
            </button>
            {canEdit && (
              <button className="chat-msg-menu-item" onClick={() => { onEdit(message); setActiveMenuMsgId(null); }}>
                <span className="chat-msg-menu-icon">✏️</span> Tahrirlash
              </button>
            )}
            <button className="chat-msg-menu-item" onClick={() => { navigator.clipboard?.writeText(isSticker ? message.sticker : message.text); setActiveMenuMsgId(null); }}>
              <span className="chat-msg-menu-icon">📋</span> Nusxa olish
            </button>
            <div className="chat-msg-menu-divider" />
            <button className="chat-msg-menu-item danger" onClick={() => { onDelete(message); setActiveMenuMsgId(null); }}>
              <span className="chat-msg-menu-icon">🗑</span> O'chirish
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DeleteModal = ({ message, isOwn, onConfirm, onCancel }) => {
  return (
    <div className="chat-modal-backdrop" onClick={onCancel}>
      <div className="chat-delete-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Xabarni o'chirish</h3>
        <p>
          {isOwn
            ? "Xabarni o'zingiz uchun yoki barcha qatnashchilar uchun o'chirishingiz mumkin."
            : "Bu xabar faqat sizning ko'rishingizdan yashiriladi."}
        </p>
        <div className="chat-delete-options">
          {isOwn && (
            <button className="chat-delete-option danger" onClick={() => onConfirm('everyone')}>
              🗑 Hammasi uchun o'chirish
            </button>
          )}
          <button className="chat-delete-option danger" onClick={() => onConfirm('me')}>
            👁 O'zim uchun o'chirish
          </button>
          <button className="chat-delete-option cancel" onClick={onCancel}>
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileOpenRoom, setMobileOpenRoom] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const loadRooms = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingRooms(true);
      const r = await apiService.getChatRooms();
      setRooms(r);
    } catch (err) {
      console.error('loadRooms:', err);
    } finally {
      if (!silent) setLoadingRooms(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId, silent = false) => {
    if (!roomId) return;
    try {
      if (!silent) setLoadingMessages(true);
      const m = await apiService.getChatMessages(roomId, { limit: 60 });
      setMessages(m);
      if (m.length > 0) lastMessageIdRef.current = m[m.length - 1]._id;
      await apiService.markChatRead(roomId).catch(() => {});
    } catch (err) {
      console.error('loadMessages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  const pollNewMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      // 1. Yangi xabarlar
      if (lastMessageIdRef.current) {
        const newMsgs = await apiService.getChatMessages(roomId, { after: lastMessageIdRef.current, limit: 50 });
        if (newMsgs.length > 0) {
          setMessages((prev) => [...prev, ...newMsgs]);
          lastMessageIdRef.current = newMsgs[newMsgs.length - 1]._id;
          await apiService.markChatRead(roomId).catch(() => {});
        }
      }
      // 2. Mavjud xabarlarni edit/delete uchun qayta yuklash (kichik dasta)
      const refreshed = await apiService.getChatMessages(roomId, { limit: 30 });
      if (refreshed.length > 0) {
        setMessages((prev) => {
          if (prev.length === 0) return refreshed;
          // Yangilarini birlashtiramiz, faqat farqlilarini almashtiramiz
          const byId = new Map(prev.map((m) => [String(m._id), m]));
          let changed = false;
          refreshed.forEach((m) => {
            const ex = byId.get(String(m._id));
            if (!ex) return; // yangilari yuqorida qo'shilgan
            // Edit yoki delete bo'lganini tekshirish
            if (ex.editedAt !== m.editedAt || ex.isDeleted !== m.isDeleted || ex.text !== m.text) {
              byId.set(String(m._id), m);
              changed = true;
            }
          });
          return changed ? prev.map((m) => byId.get(String(m._id)) || m) : prev;
        });
      }
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Polling rooms list (for new lastMessage / unread counts)
  useEffect(() => {
    const interval = setInterval(() => loadRooms(true), ROOMS_POLL_MS);
    return () => clearInterval(interval);
  }, [loadRooms]);

  // Load active room messages — faqat activeRoomId o'zgarganda
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      lastMessageIdRef.current = null;
      return;
    }
    loadMessages(activeRoomId);
  }, [activeRoomId, loadMessages]);

  // Active room metadata'ni rooms ro'yxatidan ajratib olish (polling'ga aralashmaydi)
  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      return;
    }
    const r = rooms.find((x) => String(x._id) === String(activeRoomId));
    if (r) setActiveRoom(r);
  }, [activeRoomId, rooms]);

  // Polling active room messages
  useEffect(() => {
    if (!activeRoomId) return;
    const interval = setInterval(() => pollNewMessages(activeRoomId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeRoomId, pollNewMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeRoomId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !activeRoomId) return;
    setSending(true);
    try {
      if (editingMsg) {
        // Tahrirlash rejimi
        const updated = await apiService.editChatMessage(editingMsg._id, text);
        setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
        setEditingMsg(null);
      } else {
        const newMsg = await apiService.sendChatMessage(activeRoomId, {
          text,
          replyTo: replyTo?._id || null
        });
        setMessages((prev) => [...prev, newMsg]);
        lastMessageIdRef.current = newMsg._id;
        setReplyTo(null);
      }
      setInput('');
      loadRooms(true);
    } catch (err) {
      console.error('send:', err);
      alert((editingMsg ? 'Tahrirlash' : 'Xabar yuborish') + ' xatosi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleSendSticker = async (sticker) => {
    if (!activeRoomId || sending) return;
    setShowStickers(false);
    setSending(true);
    try {
      const newMsg = await apiService.sendChatMessage(activeRoomId, {
        messageType: 'sticker',
        sticker,
        replyTo: replyTo?._id || null
      });
      setMessages((prev) => [...prev, newMsg]);
      lastMessageIdRef.current = newMsg._id;
      setReplyTo(null);
      loadRooms(true);
    } catch (err) {
      console.error('sticker:', err);
      alert('Stiker yuborilmadi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (msg) => {
    setEditingMsg(msg);
    setInput(msg.text || '');
    setReplyTo(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && editingMsg) {
      e.preventDefault();
      handleCancelEdit();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChatPick = async (contact) => {
    setShowNewChat(false);
    try {
      const newRoom = await apiService.createChatRoom({ type: 'private', userId: contact._id });
      await loadRooms(true);
      setActiveRoomId(newRoom._id);
      setMobileOpenRoom(true);
    } catch (err) {
      console.error('createRoom:', err);
      alert(err.response?.data?.message || 'Suhbat yaratilmadi');
    }
  };

  const handleDeleteRequest = (msg) => {
    setDeleteTarget(msg);
  };

  const handleDeleteConfirm = async (scope) => {
    const msg = deleteTarget;
    setDeleteTarget(null);
    if (!msg) return;
    try {
      await apiService.deleteChatMessage(msg._id, scope);
      if (scope === 'everyone') {
        setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, isDeleted: true, text: '', sticker: null, messageType: 'text' } : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      }
      loadRooms(true);
    } catch (err) {
      console.error('delete:', err);
      alert(err.response?.data?.message || 'O\'chirishda xatolik');
    }
  };

  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms;
    const s = search.toLowerCase();
    return rooms.filter((r) => (r.displayName || r.name || '').toLowerCase().includes(s));
  }, [rooms, search]);

  // Group messages by day
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDay = null;
    messages.forEach((m, idx) => {
      const dayKey = new Date(m.createdAt).toDateString();
      if (dayKey !== currentDay) {
        groups.push({ type: 'divider', date: m.createdAt, key: `d-${dayKey}` });
        currentDay = dayKey;
      }
      const prev = idx > 0 ? messages[idx - 1] : null;
      groups.push({ type: 'message', message: m, prevMessage: prev, key: m._id });
    });
    return groups;
  }, [messages]);

  return (
    <div className="chat-page">
      <aside className={`chat-sidebar ${mobileOpenRoom ? 'mobile-hidden' : ''}`}>
        <div className="chat-sidebar-header">
          <h2 className="chat-sidebar-title">💬 Chatlar</h2>
          <button className="chat-new-btn" onClick={() => setShowNewChat(true)} title="Yangi suhbat">+</button>
        </div>
        <div className="chat-search">
          <input
            type="text"
            placeholder="🔍 Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="chat-room-list">
          {loadingRooms && <div className="chat-loading"><div className="chat-spinner" /></div>}
          {!loadingRooms && filteredRooms.length === 0 && (
            <div className="chat-empty-list">
              Hali chatlar yo'q.<br />
              <small>Yangi suhbat boshlash uchun "+" tugmasini bosing</small>
            </div>
          )}
          {!loadingRooms && filteredRooms.map((r) => (
            <RoomItem
              key={r._id}
              room={r}
              active={String(activeRoomId) === String(r._id)}
              currentUserId={user?._id}
              onClick={() => { setActiveRoomId(r._id); setMobileOpenRoom(true); }}
            />
          ))}
        </div>
      </aside>

      <section className={`chat-conversation ${!mobileOpenRoom ? 'mobile-hidden' : ''}`}>
        {!activeRoom ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <div className="chat-empty-title">Suhbatni tanlang</div>
            <div>Chap tarafdagi ro'yxatdan biror chatni tanlang yoki yangisini yarating</div>
          </div>
        ) : (
          <>
            <div className="chat-conv-header">
              <button className="chat-back-btn" onClick={() => setMobileOpenRoom(false)}>‹</button>
              <RoomAvatar room={activeRoom} displayName={activeRoom.displayName} displayAvatar={activeRoom.displayAvatar} />
              <div className="chat-conv-header-info">
                <h3 className="chat-conv-name">{activeRoom.displayName || activeRoom.name}</h3>
                <p className="chat-conv-sub">
                  {activeRoom.type === 'private'
                    ? 'Shaxsiy chat'
                    : `${activeRoom.participants?.length || 0} a'zo • ${ROOM_TYPE_LABEL[activeRoom.type] || ''}`}
                </p>
              </div>
            </div>

            <div className="chat-messages">
              {loadingMessages && <div className="chat-loading"><div className="chat-spinner" /></div>}
              {!loadingMessages && messages.length === 0 && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">👋</div>
                  <div>Bu yerda hali xabarlar yo'q.<br />Birinchi bo'lib salom bering!</div>
                </div>
              )}
              {!loadingMessages && groupedMessages.map((item) => {
                if (item.type === 'divider') {
                  return (
                    <div key={item.key} className="chat-day-divider">
                      <span>{formatDayDivider(item.date)}</span>
                    </div>
                  );
                }
                return (
                  <MessageBubble
                    key={item.key}
                    message={item.message}
                    prevMessage={item.prevMessage?.isSystem ? null : item.prevMessage}
                    currentUserId={user?._id}
                    onReply={(m) => { setReplyTo(m); setEditingMsg(null); }}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                    roomType={activeRoom.type}
                    activeMenuMsgId={activeMenuMsgId}
                    setActiveMenuMsgId={setActiveMenuMsgId}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <button
                className="chat-sticker-btn"
                onClick={() => setShowStickers((s) => !s)}
                title="Stikerlar"
                type="button"
              >
                😀
              </button>
              <div style={{ flex: 1, position: 'relative' }}>
                {showStickers && (
                  <StickerPicker onPick={handleSendSticker} onClose={() => setShowStickers(false)} />
                )}
                {editingMsg && (
                  <div className="chat-input-edit-bar">
                    <div className="edit-text">
                      ✏️ Tahrirlash: {editingMsg.text?.slice(0, 60) || '...'}
                    </div>
                    <button className="edit-close" onClick={handleCancelEdit}>×</button>
                  </div>
                )}
                {!editingMsg && replyTo && (
                  <div className="chat-input-reply-bar">
                    <div className="reply-text">
                      <strong>{replyTo.sender?.firstName}: </strong>
                      {replyTo.messageType === 'sticker'
                        ? `${replyTo.sticker || '🖼'} Stiker`
                        : (replyTo.text?.slice(0, 60) || '...')}
                    </div>
                    <button className="reply-close" onClick={() => setReplyTo(null)}>×</button>
                  </div>
                )}
                <div className="chat-input-wrapper">
                  <textarea
                    ref={textareaRef}
                    className="chat-input"
                    placeholder={editingMsg ? "Tahrirlangan matn..." : "Xabar yozing..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                </div>
              </div>
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                title={editingMsg ? 'Saqlash' : 'Yuborish'}
              >
                {editingMsg ? '✓' : '➤'}
              </button>
            </div>
          </>
        )}
      </section>

      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onPick={handleNewChatPick} />
      )}

      {deleteTarget && (
        <DeleteModal
          message={deleteTarget}
          isOwn={String(deleteTarget.sender?._id) === String(user?._id)}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ChatPage;
