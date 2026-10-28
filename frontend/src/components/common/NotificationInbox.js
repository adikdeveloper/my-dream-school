import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import { formatUzShortDate } from '../../utils/uzDate';
import TeacherUiIcon from '../teacher/TeacherUiIcon';
import './NotificationInbox.css';

const PRIORITY_COLORS = {
  low: '#98a2b3',
  normal: '#2f6fdb',
  high: '#c98a18',
  urgent: '#c5453b'
};

const PRIORITY_LABELS = {
  low: 'Past',
  normal: 'Oddiy',
  high: 'Yuqori',
  urgent: 'Shoshilinch'
};

const formatRelative = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Hozirgina';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} soat oldin`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} kun oldin`;
  return formatUzShortDate(d, { year: true });
};

const NotificationInbox = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiService.getInboxNotifications(filter === 'unread');
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('inbox load:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleMarkRead = async (id) => {
    try {
      await apiService.markPushNotificationRead(id);
      setItems((arr) => arr.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) { console.error(err); }
  };

  const handleClick = async (n) => {
    if (!n.isRead) await handleMarkRead(n._id);
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllInboxRead();
      if (filter === 'unread') {
        setItems([]);
      } else {
        setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
      }
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("O'chirilsinmi?")) return;
    try {
      await apiService.deleteInboxNotification(id);
      setItems((arr) => arr.filter((n) => n._id !== id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="inbox-page">
      <header className="inbox-header">
        <div>
          <p className="inbox-eyebrow">Xabarnomalar</p>
          <h1 className="inbox-title">Bildirishnomalar</h1>
          <p className="inbox-subtitle">{unreadCount > 0 ? `${unreadCount} ta o'qilmagan xabar` : "Barcha xabarlar o'qilgan"}</p>
        </div>
        {unreadCount > 0 && (
          <button className="inbox-mark-all" onClick={handleMarkAllRead}>
            <TeacherUiIcon name="check" size={15} /> Hammasini o'qilgan deb belgilash
          </button>
        )}
      </header>

      <div className="inbox-filters">
        <button className={`inbox-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Hammasi
        </button>
        <button className={`inbox-filter ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          O'qilmagan {unreadCount > 0 && <span className="inbox-badge">{unreadCount}</span>}
        </button>
        <button className="inbox-filter-refresh" onClick={() => load()} title="Yangilash" aria-label="Yangilash">
          <TeacherUiIcon name="swap" size={15} />
        </button>
      </div>

      {loading && <div className="inbox-loading"><span className="inbox-spinner" /> Yuklanmoqda...</div>}
      {!loading && items.length === 0 && (
        <div className="inbox-empty">
          <span className="inbox-empty-icon"><TeacherUiIcon name="bell" size={22} /></span>
          <strong className="inbox-empty-title">{filter === 'unread' ? "O'qilmagan bildirishnomalar yo'q" : 'Hali bildirishnomalar kelmagan'}</strong>
          <span>Yangi xabarlar shu yerda ko'rinadi.</span>
        </div>
      )}

      <div className="inbox-list">
        {items.map((n) => (
          <article
            key={n._id}
            className={`inbox-item ${!n.isRead ? 'unread' : ''}`}
            onClick={() => handleClick(n)}
            style={{ '--inbox-accent': PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.normal }}
          >
            <span className="inbox-item-icon"><TeacherUiIcon name="bell" size={17} /></span>
            <div className="inbox-item-body">
              <div className="inbox-item-head">
                <h4 className="inbox-item-title">{n.title}</h4>
                {n.priority !== 'normal' && (
                  <span className={`inbox-pri-badge inbox-pri--${n.priority || 'normal'}`}>
                    {PRIORITY_LABELS[n.priority]}
                  </span>
                )}
                {!n.isRead && <span className="inbox-new-dot" title="Yangi" />}
              </div>
              <p className="inbox-item-text">{n.message}</p>
              <div className="inbox-item-meta">
                <span><TeacherUiIcon name="profile" size={13} /> {n.sender?.firstName} {n.sender?.lastName}</span>
                <span><TeacherUiIcon name="clock" size={13} /> {formatRelative(n.createdAt)}</span>
                {n.link && <span className="inbox-link-hint">Havolaga o'tish <TeacherUiIcon name="arrow" size={12} /></span>}
              </div>
            </div>
            <button className="inbox-delete" onClick={(e) => handleDelete(n._id, e)} title="O'chirish" aria-label="O'chirish">
              <TeacherUiIcon name="trash" size={16} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};

export default NotificationInbox;
