import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';

// Header uchun qo'ng'iroqcha (bell) — o'qilmagan soni badge + ochiladigan ro'yxat.
// accent — paneldagi asosiy rang (default: teal).
const NotificationBell = ({ accent = '#0d9488', viewAllLink }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const loadCount = useCallback(async () => {
    try {
      const count = await apiService.getInboxUnreadCount();
      setUnread(count || 0);
    } catch (e) { /* silent */ }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getInboxNotifications(false);
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch (e) { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  // Dastlabki yuklash + har 30s da sonni yangilab turish
  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 30000);
    return () => clearInterval(t);
  }, [loadCount]);

  // Ochilganda ro'yxatni yuklash
  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Tashqariga bosilganda yopish
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markRead = async (id) => {
    try {
      await apiService.markPushNotificationRead(id);
      setItems((arr) => arr.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnread((c) => Math.max(0, c - 1));
    } catch (e) { /* silent */ }
  };

  const handleClick = async (n) => {
    if (!n.isRead) await markRead(n._id);
    if (n.link) { setOpen(false); navigate(n.link); }
  };

  const markAllRead = async () => {
    try {
      await apiService.markAllInboxRead();
      setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (e) { /* silent */ }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'hozir';
    if (diff < 3600) return `${Math.floor(diff / 60)} daq oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    return new Date(date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button
        className="nb-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Bildirishnomalar"
        title="Bildirishnomalar"
      >
        <span className="nb-icon">🔔</span>
        {unread > 0 && <span className="nb-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-head">
            <span className="nb-title">Bildirishnomalar</span>
            {unread > 0 && (
              <button className="nb-markall" onClick={markAllRead}>Hammasini o'qish</button>
            )}
          </div>

          <div className="nb-list">
            {loading && <div className="nb-state">Yuklanmoqda...</div>}
            {!loading && items.length === 0 && (
              <div className="nb-empty">
                <div className="nb-empty-icon">🔕</div>
                <div className="nb-empty-text">Bildirishnomalar yo'q</div>
              </div>
            )}
            {!loading && items.slice(0, 12).map((n) => (
              <button
                key={n._id}
                className={`nb-item ${n.isRead ? '' : 'nb-unread'}`}
                onClick={() => handleClick(n)}
              >
                {!n.isRead && <span className="nb-dot" />}
                <div className="nb-item-body">
                  <div className="nb-item-title">{n.title || 'Bildirishnoma'}</div>
                  {n.message && <div className="nb-item-msg">{n.message}</div>}
                  <div className="nb-item-time">{timeAgo(n.createdAt)}</div>
                </div>
              </button>
            ))}
          </div>

          {viewAllLink && (
            <button
              className="nb-viewall"
              onClick={() => { setOpen(false); navigate(viewAllLink); }}
            >
              Barchasini ko'rish
            </button>
          )}
        </div>
      )}

      <style>{`
        .nb-wrap { position: relative; --nb-accent: ${accent}; }
        .nb-btn {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          width: 42px; height: 42px; border-radius: 10px;
          background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0; cursor: pointer;
          transition: all 0.2s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .nb-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: var(--nb-accent); }
        .nb-icon { font-size: 1.2rem; line-height: 1; }
        .nb-badge {
          position: absolute; top: -5px; right: -5px;
          min-width: 18px; height: 18px; padding: 0 4px;
          background: #ef4444; color: #fff;
          border-radius: 9px; font-size: 0.65rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff; box-shadow: 0 1px 4px rgba(239,68,68,0.4);
        }
        .nb-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 360px; max-width: calc(100vw - 24px);
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.16);
          z-index: 1200; overflow: hidden;
          animation: nb-pop 0.15s ease-out;
        }
        @keyframes nb-pop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .nb-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.875rem 1rem; border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #f8fafc, #fff);
        }
        .nb-title { font-weight: 800; font-size: 0.95rem; color: #1e293b; }
        .nb-markall {
          background: none; border: none; cursor: pointer;
          color: var(--nb-accent); font-weight: 700; font-size: 0.75rem;
          padding: 0.25rem 0.5rem; border-radius: 6px; transition: background 0.15s;
        }
        .nb-markall:hover { background: #f1f5f9; }
        .nb-list { max-height: 380px; overflow-y: auto; }
        .nb-list::-webkit-scrollbar { width: 5px; }
        .nb-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .nb-state, .nb-empty { padding: 2rem 1rem; text-align: center; color: #94a3b8; font-size: 0.85rem; }
        .nb-empty-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .nb-empty-text { font-size: 0.85rem; font-weight: 600; }
        .nb-item {
          display: flex; align-items: flex-start; gap: 0.5rem; width: 100%;
          padding: 0.75rem 1rem; border: none; border-bottom: 1px solid #f1f5f9;
          background: #fff; cursor: pointer; text-align: left;
          transition: background 0.15s ease;
        }
        .nb-item:hover { background: #f8fafc; }
        .nb-item.nb-unread { background: color-mix(in srgb, var(--nb-accent) 7%, #fff); }
        .nb-item.nb-unread:hover { background: color-mix(in srgb, var(--nb-accent) 12%, #fff); }
        .nb-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--nb-accent); flex-shrink: 0; margin-top: 6px;
        }
        .nb-item-body { flex: 1; min-width: 0; }
        .nb-item-title { font-weight: 700; font-size: 0.82rem; color: #1e293b; margin-bottom: 2px; }
        .nb-item-msg {
          font-size: 0.75rem; color: #64748b; line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .nb-item-time { font-size: 0.68rem; color: #94a3b8; margin-top: 3px; font-weight: 600; }
        .nb-viewall {
          width: 100%; padding: 0.75rem; border: none; cursor: pointer;
          background: #f8fafc; color: var(--nb-accent); font-weight: 700; font-size: 0.8rem;
          transition: background 0.15s;
        }
        .nb-viewall:hover { background: #f1f5f9; }

        @media (max-width: 480px) {
          .nb-btn { width: 38px; height: 38px; }
          .nb-dropdown { width: calc(100vw - 24px); right: -8px; }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
