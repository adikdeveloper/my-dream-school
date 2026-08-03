import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import TeacherUiIcon from '../teacher/TeacherUiIcon';

const PRIORITY_COLORS = {
  low: '#94a3b8',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444'
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
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      <div className="inbox-header">
        <div>
          <h1 className="inbox-title"><TeacherUiIcon name="bell" size={24} /> Bildirishnomalar</h1>
          <p className="inbox-subtitle">{unreadCount > 0 ? `${unreadCount} ta o'qilmagan` : "Yangiliklar yo'q"}</p>
        </div>
        {unreadCount > 0 && (
          <button className="inbox-mark-all" onClick={handleMarkAllRead}>
            <TeacherUiIcon name="check" size={16} /> Hammasini o'qilgan deb belgilash
          </button>
        )}
      </div>

      <div className="inbox-filters">
        <button className={`inbox-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Hammasi
        </button>
        <button className={`inbox-filter ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          O'qilmagan {unreadCount > 0 && <span className="inbox-badge">{unreadCount}</span>}
        </button>
        <button className="inbox-filter-refresh" onClick={load}>↻</button>
      </div>

      {loading && <div className="inbox-loading">Yuklanmoqda...</div>}
      {!loading && items.length === 0 && (
        <div className="inbox-empty">
          <div className="inbox-empty-icon"><TeacherUiIcon name="bell" size={25} /></div>
          <div className="inbox-empty-title">{filter === 'unread' ? 'O\'qilmagan bildirishnomalar yo\'q' : 'Hali bildirishnomalar kelmagan'}</div>
        </div>
      )}

      <div className="inbox-list">
        {items.map((n) => (
          <div
            key={n._id}
            className={`inbox-item ${!n.isRead ? 'unread' : ''}`}
            onClick={() => handleClick(n)}
            style={{ borderLeftColor: PRIORITY_COLORS[n.priority] || '#3b82f6' }}
          >
            <div className="inbox-item-icon"><TeacherUiIcon name="bell" size={19} /></div>
            <div className="inbox-item-body">
              <div className="inbox-item-head">
                <h4 className="inbox-item-title">{n.title}</h4>
                {n.priority !== 'normal' && (
                  <span className="inbox-pri-badge" style={{ background: PRIORITY_COLORS[n.priority] + '20', color: PRIORITY_COLORS[n.priority] }}>
                    {PRIORITY_LABELS[n.priority]}
                  </span>
                )}
                {!n.isRead && <span className="inbox-new-dot" title="Yangi" />}
              </div>
              <p className="inbox-item-text">{n.message}</p>
              <div className="inbox-item-meta">
                <span><TeacherUiIcon name="profile" size={14} /> {n.sender?.firstName} {n.sender?.lastName}</span>
                <span><TeacherUiIcon name="clock" size={14} /> {formatRelative(n.createdAt)}</span>
                {n.link && <span className="inbox-link-hint">↗ Havolaga o'tish</span>}
              </div>
            </div>
            <button className="inbox-delete" onClick={(e) => handleDelete(n._id, e)} title="O'chirish"><TeacherUiIcon name="trash" size={17} /></button>
          </div>
        ))}
      </div>

      <style>{`
        .inbox-page { padding: 1.5rem; max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .inbox-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .inbox-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; }
        .inbox-subtitle { color: #64748b; font-size: 0.9375rem; margin: 0.25rem 0 0; }
        .inbox-mark-all {
          background: #fff; border: 1px solid #cbd5e1; padding: 0.5rem 1rem;
          border-radius: 8px; cursor: pointer; font-size: 0.875rem; color: #475569;
          transition: all .15s ease;
        }
        .inbox-mark-all:hover { background: #f1f5f9; border-color: #94a3b8; }

        .inbox-filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: center; }
        .inbox-filter {
          padding: 0.5rem 1rem; border: 1px solid #e2e8f0; background: #fff;
          border-radius: 18px; cursor: pointer; font-size: 0.875rem; color: #475569;
          display: flex; align-items: center; gap: 0.375rem; transition: all .15s ease;
        }
        .inbox-filter:hover { border-color: #94a3b8; }
        .inbox-filter.active { background: linear-gradient(135deg, #2481cc, #1e6cb0); color: #fff; border-color: transparent; }
        .inbox-badge { background: #ef4444; color: #fff; border-radius: 10px; padding: 1px 7px; font-size: 0.6875rem; font-weight: 700; }
        .inbox-filter.active .inbox-badge { background: rgba(255,255,255,.25); }
        .inbox-filter-refresh {
          margin-left: auto; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; background: #fff;
          border-radius: 8px; cursor: pointer; font-size: 1rem; color: #64748b;
        }
        .inbox-filter-refresh:hover { background: #f1f5f9; }

        .inbox-loading, .inbox-empty {
          padding: 3rem 1rem; text-align: center; color: #94a3b8;
          background: #fff; border-radius: 14px; border: 1px solid #e6e8eb;
        }
        .inbox-empty-icon { font-size: 3rem; opacity: 0.4; margin-bottom: 0.5rem; }
        .inbox-empty-title { font-size: 1rem; color: #64748b; }

        .inbox-list { display: flex; flex-direction: column; gap: 0.625rem; }
        .inbox-item {
          display: flex; gap: 1rem; padding: 1rem 1.25rem; background: #fff;
          border: 1px solid #e6e8eb; border-radius: 12px; border-left: 4px solid #cbd5e1;
          cursor: pointer; transition: all .15s ease; position: relative;
        }
        .inbox-item:hover { background: #fafbfc; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .inbox-item.unread { background: linear-gradient(90deg, rgba(36,129,204,.04), #fff); }
        .inbox-item-icon { font-size: 1.75rem; flex-shrink: 0; line-height: 1.2; }
        .inbox-item-body { flex: 1; min-width: 0; }
        .inbox-item-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap; }
        .inbox-item-title { font-size: 0.9375rem; font-weight: 700; color: #0f172a; margin: 0; }
        .inbox-pri-badge { font-size: 0.6875rem; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
        .inbox-new-dot { width: 8px; height: 8px; border-radius: 50%; background: #2481cc; display: inline-block; }
        .inbox-item-text { font-size: 0.875rem; color: #475569; margin: 0 0 0.5rem; line-height: 1.45; white-space: pre-wrap; }
        .inbox-item-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.75rem; color: #94a3b8; }
        .inbox-link-hint { color: #2481cc; font-weight: 600; }
        .inbox-delete {
          background: none; border: none; cursor: pointer; padding: 0.375rem 0.5rem;
          font-size: 0.9375rem; color: #94a3b8; border-radius: 6px; opacity: 0;
          align-self: flex-start; transition: all .15s ease;
        }
        .inbox-item:hover .inbox-delete { opacity: 1; }
        .inbox-delete:hover { background: #fee2e2; color: #b91c1c; }

        @media (max-width: 600px) {
          .inbox-page { padding: 1rem; }
          .inbox-item { padding: 0.875rem 1rem; gap: 0.75rem; }
          .inbox-item-icon { font-size: 1.5rem; }
          .inbox-delete { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default NotificationInbox;
