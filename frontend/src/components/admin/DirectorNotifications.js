import React, { useEffect, useMemo, useState, useCallback } from 'react';
import apiService from '../../services/apiService';

const ROLE_OPTIONS = [
  { value: 'student', label: "O'quvchilar", icon: '👨‍🎓' },
  { value: 'teacher', label: "O'qituvchilar", icon: '👨‍🏫' },
  { value: 'admin', label: 'Adminlar', icon: '🛡️' },
  { value: 'director', label: 'Direktorlar', icon: '👔' },
  { value: 'supervisor', label: 'Nazoratchilar', icon: '👁️' },
  { value: 'accountant', label: 'Hisobchilar', icon: '💰' },
  { value: 'hr', label: 'HR', icon: '📋' },
  { value: 'reception', label: 'Reception', icon: '🛎️' },
  { value: 'callcenter', label: 'Call-center', icon: '📞' }
];

const CATEGORY_OPTIONS = [
  { value: 'info', label: "Ma'lumot", color: '#3b82f6' },
  { value: 'announcement', label: "E'lon", color: '#8b5cf6' },
  { value: 'warning', label: 'Ogohlantirish', color: '#f59e0b' },
  { value: 'event', label: 'Tadbir', color: '#10b981' },
  { value: 'reminder', label: 'Eslatma', color: '#ec4899' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Past', color: '#94a3b8' },
  { value: 'normal', label: 'Oddiy', color: '#3b82f6' },
  { value: 'high', label: 'Yuqori', color: '#f59e0b' },
  { value: 'urgent', label: 'Shoshilinch', color: '#ef4444' }
];

const ICON_PRESETS = ['🔔', '📢', '📣', '⚠️', '✅', '📅', '🎉', '💰', '📚', '📋', '⏰', '💡', '❤️', '🎯', '📝'];

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `Bugun, ${d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const DirectorNotifications = () => {
  const [tab, setTab] = useState('compose'); // compose | history
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    message: '',
    icon: '🔔',
    priority: 'normal',
    category: 'info',
    link: ''
  });
  const [filter, setFilter] = useState({
    mode: 'all',
    roles: [],
    classIds: [],
    userIds: []
  });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ search: '', priority: '', mine: false });
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const data = await apiService.getClasses();
      setClasses(data.classes || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      // Backend limit cap 100. Sahifama-sahifa olib, hammasini birlashtiramiz.
      const limit = 100;
      let page = 1;
      let all = [];
      let totalPages = 1;
      do {
        const data = await apiService.getUsers('', page, limit, '');
        all = all.concat(data.users || []);
        totalPages = data.totalPages || 1;
        page++;
      } while (page <= totalPages && page <= 20); // xavfsizlik: maks 2000 user
      setUsers(all);
    } catch (err) { console.error(err); }
    finally { setUsersLoading(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await apiService.listPushNotifications({
        search: historyFilter.search,
        priority: historyFilter.priority,
        mine: historyFilter.mine ? 'true' : '',
        limit: 100
      });
      setHistory(data.notifications || []);
    } catch (err) { console.error(err); }
    finally { setHistoryLoading(false); }
  }, [historyFilter]);

  useEffect(() => {
    loadClasses();
    loadUsers();
  }, [loadClasses, loadUsers]);

  useEffect(() => {
    if (tab !== 'history') return;
    const t = setTimeout(() => loadHistory(), 300);
    return () => clearTimeout(t);
  }, [tab, loadHistory]);

  // Live preview of recipients — faqat compose tab'da
  useEffect(() => {
    if (tab !== 'compose') return;
    let cancel = false;
    const runPreview = async () => {
      try {
        setPreviewLoading(true);
        const data = await apiService.previewPushNotification(filter);
        if (!cancel) setPreview(data);
      } catch (err) { /* silent */ }
      finally { if (!cancel) setPreviewLoading(false); }
    };
    const t = setTimeout(runPreview, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [filter, tab]);

  const toggleRole = (role) => {
    setFilter((f) => {
      const has = f.roles.includes(role);
      const roles = has ? f.roles.filter((r) => r !== role) : [...f.roles, role];
      return { ...f, roles, mode: roles.length || f.classIds.length || f.userIds.length ? 'mixed' : 'all' };
    });
  };

  const toggleClass = (id) => {
    setFilter((f) => {
      const has = f.classIds.includes(id);
      const classIds = has ? f.classIds.filter((c) => c !== id) : [...f.classIds, id];
      return { ...f, classIds, mode: f.roles.length || classIds.length || f.userIds.length ? 'mixed' : 'all' };
    });
  };

  const toggleUser = (id) => {
    setFilter((f) => {
      const has = f.userIds.includes(id);
      const userIds = has ? f.userIds.filter((u) => u !== id) : [...f.userIds, id];
      return { ...f, userIds, mode: f.roles.length || f.classIds.length || userIds.length ? 'mixed' : 'all' };
    });
  };

  const resetFilter = () => setFilter({ mode: 'all', roles: [], classIds: [], userIds: [] });

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      alert("Sarlavha va matn majburiy");
      return;
    }
    if (!preview || preview.count === 0) {
      alert('Hech qanday qabul qiluvchi tanlanmagan');
      return;
    }
    if (!window.confirm(`${preview.count} ta foydalanuvchiga yuborilsinmi?`)) return;

    setSending(true);
    try {
      const result = await apiService.createPushNotification({
        ...form,
        targetFilter: filter
      });
      alert(`✅ ${result.recipientCount} ta foydalanuvchiga yuborildi!`);
      setForm({ title: '', message: '', icon: '🔔', priority: 'normal', category: 'info', link: '' });
      resetFilter();
      setTab('history');
    } catch (err) {
      alert('Xatolik: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bildirishnoma butunlay o'chiriladi. Davom etilsinmi?")) return;
    try {
      await apiService.deletePushNotification(id);
      setHistory((h) => h.filter((x) => x._id !== id));
      if (selectedItem?._id === id) setSelectedItem(null);
    } catch (err) { alert('Xatolik'); }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const n = await apiService.getPushNotification(id);
      setSelectedItem(n);
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const s = userSearch.toLowerCase();
    return users.filter((u) => `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(s));
  }, [users, userSearch]);

  const filteredHistory = useMemo(() => {
    return history;
  }, [history]);

  return (
    <div className="dn-page">
      <div className="dn-header">
        <h1 className="dn-title">📢 Bildirishnomalar</h1>
        <p className="dn-subtitle">Maktab foydalanuvchilariga filtrlangan xabarlar yuborish</p>
      </div>

      <div className="dn-tabs">
        <button className={`dn-tab ${tab === 'compose' ? 'active' : ''}`} onClick={() => setTab('compose')}>
          ✏️ Yangi yuborish
        </button>
        <button className={`dn-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          📜 Tarix
        </button>
      </div>

      {tab === 'compose' && (
        <div className="dn-compose">
          <div className="dn-grid">
            {/* LEFT: form */}
            <div className="dn-card">
              <h3 className="dn-card-title">📝 Xabar matni</h3>

              <label className="dn-label">Sarlavha *</label>
              <input
                className="dn-input"
                type="text"
                placeholder="Masalan: Ertangi tadbir haqida"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
              />

              <label className="dn-label">Xabar matni *</label>
              <textarea
                className="dn-textarea"
                placeholder="Foydalanuvchilarga yetkazmoqchi bo'lgan ma'lumot..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                maxLength={4000}
              />
              <div className="dn-counter">{form.message.length}/4000</div>

              <label className="dn-label">Ikon</label>
              <div className="dn-icons">
                {ICON_PRESETS.map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    className={`dn-icon-btn ${form.icon === ico ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, icon: ico })}
                  >
                    {ico}
                  </button>
                ))}
              </div>

              <div className="dn-row-2">
                <div>
                  <label className="dn-label">Kategoriya</label>
                  <select
                    className="dn-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="dn-label">Muhimlik</label>
                  <select
                    className="dn-input"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="dn-label">Havola (ixtiyoriy)</label>
              <input
                className="dn-input"
                type="text"
                placeholder="/director/payments"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
              />
            </div>

            {/* RIGHT: filter + preview */}
            <div>
              <div className="dn-card">
                <h3 className="dn-card-title">🎯 Kim ko'radi</h3>
                <button className="dn-link-btn" onClick={resetFilter}>↻ Filterni tozalash</button>

                <div className="dn-section">
                  <div className="dn-section-title">Rol bo'yicha</div>
                  <div className="dn-chips">
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className={`dn-chip ${filter.roles.includes(r.value) ? 'active' : ''}`}
                        onClick={() => toggleRole(r.value)}
                      >
                        {r.icon} {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dn-section">
                  <div className="dn-section-title">Sinflar ({filter.classIds.length} tanlangan)</div>
                  <div className="dn-class-list">
                    {classes.length === 0 && <div className="dn-muted">Sinflar yuklanmoqda...</div>}
                    {classes.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        className={`dn-class-row ${filter.classIds.includes(c._id) ? 'active' : ''}`}
                        onClick={() => toggleClass(c._id)}
                      >
                        <span>{c.name}</span>
                        <span className="dn-muted">{c.students?.length || 0} o'quvchi</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dn-section">
                  <div className="dn-section-title">Aniq foydalanuvchilar ({filter.userIds.length} tanlangan)</div>
                  <input
                    className="dn-input"
                    type="text"
                    placeholder="🔍 Ism bo'yicha qidirish"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <div className="dn-user-list">
                    {usersLoading && <div className="dn-muted">Yuklanmoqda...</div>}
                    {!usersLoading && filteredUsers.slice(0, 100).map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        className={`dn-user-row ${filter.userIds.includes(u._id) ? 'active' : ''}`}
                        onClick={() => toggleUser(u._id)}
                      >
                        <span>{u.firstName} {u.lastName}</span>
                        <span className="dn-muted">{u.role}</span>
                      </button>
                    ))}
                    {!usersLoading && filteredUsers.length > 100 && (
                      <div className="dn-muted" style={{ textAlign: 'center', padding: 8 }}>
                        Ko'p natija — qidiruv orqali toraytiring
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="dn-card dn-preview-card">
                <h3 className="dn-card-title">👁️ Ko'rib chiqish</h3>
                {previewLoading && <div className="dn-muted">Hisoblanmoqda...</div>}
                {!previewLoading && preview && (
                  <>
                    <div className="dn-stat-big">
                      <strong>{preview.count}</strong> ta foydalanuvchi xabarni oladi
                    </div>
                    <div className="dn-role-stats">
                      {Object.entries(preview.byRole || {}).map(([role, count]) => (
                        <div key={role} className="dn-role-stat">
                          <span>{ROLE_OPTIONS.find((r) => r.value === role)?.label || role}</span>
                          <strong>{count}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="dn-preview-msg">
                  <div className="dn-preview-icon">{form.icon}</div>
                  <div className="dn-preview-content">
                    <div className="dn-preview-title">{form.title || 'Sarlavha shu yerda'}</div>
                    <div className="dn-preview-text">{form.message || "Xabar matni shu yerda ko'rinadi..."}</div>
                  </div>
                </div>

                <button
                  className="dn-send-btn"
                  onClick={handleSend}
                  disabled={sending || !form.title.trim() || !form.message.trim() || !preview?.count}
                >
                  {sending ? '⏳ Yuborilmoqda...' : `📤 ${preview?.count || 0} ta foydalanuvchiga yuborish`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="dn-history">
          <div className="dn-card">
            <div className="dn-history-filters">
              <input
                className="dn-input"
                type="text"
                placeholder="🔍 Sarlavha/matn bo'yicha qidirish"
                value={historyFilter.search}
                onChange={(e) => setHistoryFilter({ ...historyFilter, search: e.target.value })}
              />
              <select
                className="dn-input"
                value={historyFilter.priority}
                onChange={(e) => setHistoryFilter({ ...historyFilter, priority: e.target.value })}
              >
                <option value="">Barcha muhimlik</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <label className="dn-checkbox-label">
                <input
                  type="checkbox"
                  checked={historyFilter.mine}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, mine: e.target.checked })}
                />
                Faqat mening
              </label>
              <button className="dn-link-btn" onClick={loadHistory}>↻ Yangilash</button>
            </div>
          </div>

          {historyLoading && <div className="dn-loading">Yuklanmoqda...</div>}
          {!historyLoading && filteredHistory.length === 0 && (
            <div className="dn-card dn-empty">Hali bildirishnomalar yo'q</div>
          )}

          <div className="dn-history-list">
            {filteredHistory.map((n) => (
              <div key={n._id} className={`dn-history-item priority-${n.priority}`}>
                <div className="dn-history-icon">{n.icon}</div>
                <div className="dn-history-body">
                  <div className="dn-history-head">
                    <h4 className="dn-history-title">{n.title}</h4>
                    <span className={`dn-pri-badge pri-${n.priority}`}>
                      {PRIORITY_OPTIONS.find((p) => p.value === n.priority)?.label}
                    </span>
                  </div>
                  <p className="dn-history-message">{n.message}</p>
                  <div className="dn-history-meta">
                    <span>👤 {n.sender?.firstName} {n.sender?.lastName}</span>
                    <span>📅 {formatDate(n.createdAt)}</span>
                    <span>🎯 {n.targetFilter?.summary || 'Barchasi'}</span>
                    <span>👥 {n.recipientCount} qabul qiluvchi</span>
                    <span>✓ {n.readCount} ta o'qigan</span>
                  </div>
                </div>
                <div className="dn-history-actions">
                  <button className="dn-icon-action" title="Batafsil" onClick={() => openDetail(n._id)}>👁️</button>
                  <button className="dn-icon-action danger" title="O'chirish" onClick={() => handleDelete(n._id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="dn-modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="dn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dn-modal-header">
              <h3>{selectedItem.icon} {selectedItem.title}</h3>
              <button className="dn-modal-close" onClick={() => setSelectedItem(null)}>×</button>
            </div>
            <div className="dn-modal-body">
              {detailLoading && <div>Yuklanmoqda...</div>}
              <p className="dn-modal-message">{selectedItem.message}</p>
              <div className="dn-modal-stats">
                <div><strong>{selectedItem.recipients?.length || 0}</strong> qabul qildi</div>
                <div><strong>{selectedItem.readBy?.length || 0}</strong> o'qidi</div>
                <div>Yuborildi: {formatDate(selectedItem.createdAt)}</div>
                <div>Filter: {selectedItem.targetFilter?.summary}</div>
              </div>
              <h4>O'qiganlar ({selectedItem.readBy?.length || 0})</h4>
              <div className="dn-modal-users">
                {(selectedItem.readBy || []).map((r) => (
                  <div key={String(r.user?._id || r.user)} className="dn-modal-user">
                    ✓ {r.user?.firstName} {r.user?.lastName} <span className="dn-muted">— {formatDate(r.readAt)}</span>
                  </div>
                ))}
                {(selectedItem.readBy || []).length === 0 && <div className="dn-muted">Hech kim o'qimadi</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dn-page { padding: 1.5rem; max-width: 1400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .dn-header { margin-bottom: 1.5rem; }
        .dn-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; }
        .dn-subtitle { color: #64748b; font-size: 0.9375rem; margin: 0.25rem 0 0; }

        .dn-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid #e2e8f0; }
        .dn-tab {
          background: none; border: none; padding: 0.75rem 1.25rem; cursor: pointer;
          font-size: 0.9375rem; font-weight: 600; color: #64748b; border-bottom: 3px solid transparent;
          margin-bottom: -2px; transition: all .15s ease;
        }
        .dn-tab:hover { color: #1e293b; }
        .dn-tab.active { color: #2481cc; border-bottom-color: #2481cc; }

        .dn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        @media (max-width: 1024px) { .dn-grid { grid-template-columns: 1fr; } }

        .dn-card {
          background: #fff; border-radius: 14px; padding: 1.25rem;
          box-shadow: 0 1px 4px rgba(0,0,0,.04); border: 1px solid #e6e8eb;
          margin-bottom: 1rem;
        }
        .dn-card-title { font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0 0 1rem; }

        .dn-label { display: block; font-size: 0.8125rem; font-weight: 600; color: #475569; margin: 0.75rem 0 0.375rem; }
        .dn-input, .dn-textarea {
          width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #e1e4e8;
          border-radius: 8px; background: #fff; font-size: 0.875rem; font-family: inherit;
          outline: none; transition: all .2s ease; box-sizing: border-box;
        }
        .dn-input:focus, .dn-textarea:focus { border-color: #2481cc; box-shadow: 0 0 0 3px rgba(36,129,204,.1); }
        .dn-textarea { resize: vertical; min-height: 100px; }
        .dn-counter { text-align: right; font-size: 0.6875rem; color: #94a3b8; margin-top: 0.25rem; }

        .dn-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

        .dn-icons { display: flex; flex-wrap: wrap; gap: 0.375rem; }
        .dn-icon-btn {
          width: 36px; height: 36px; border: 1px solid #e1e4e8; background: #fff;
          border-radius: 8px; cursor: pointer; font-size: 1.125rem; transition: all .15s ease;
        }
        .dn-icon-btn:hover { background: #f1f5f9; }
        .dn-icon-btn.active { border-color: #2481cc; background: #eaf4fc; box-shadow: 0 0 0 2px rgba(36,129,204,.15); }

        .dn-link-btn {
          background: none; border: none; color: #2481cc; cursor: pointer; padding: 0.25rem 0.5rem;
          font-size: 0.8125rem; font-weight: 600; border-radius: 6px;
        }
        .dn-link-btn:hover { background: #eaf4fc; }

        .dn-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #e2e8f0; }
        .dn-section:first-of-type { border-top: none; padding-top: 0; }
        .dn-section-title { font-size: 0.8125rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }

        .dn-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
        .dn-chip {
          padding: 0.4375rem 0.875rem; border: 1px solid #e1e4e8; background: #fff;
          border-radius: 18px; cursor: pointer; font-size: 0.8125rem; transition: all .15s ease;
        }
        .dn-chip:hover { background: #f1f5f9; }
        .dn-chip.active { background: linear-gradient(135deg, #2481cc, #1e6cb0); color: #fff; border-color: transparent; }

        .dn-class-list, .dn-user-list { max-height: 200px; overflow-y: auto; border: 1px solid #e1e4e8; border-radius: 8px; padding: 4px; margin-top: 0.5rem; }
        .dn-class-row, .dn-user-row {
          display: flex; justify-content: space-between; align-items: center; width: 100%;
          padding: 0.5rem 0.75rem; border: none; background: none; cursor: pointer;
          text-align: left; border-radius: 6px; font-size: 0.875rem; transition: background .1s ease;
        }
        .dn-class-row:hover, .dn-user-row:hover { background: #f1f5f9; }
        .dn-class-row.active, .dn-user-row.active { background: #eaf4fc; color: #1e6cb0; font-weight: 600; }
        .dn-muted { color: #94a3b8; font-size: 0.75rem; }

        .dn-preview-card { position: sticky; top: 1rem; }
        .dn-stat-big { font-size: 1.25rem; color: #0f172a; padding: 0.75rem; background: #eaf4fc; border-radius: 8px; text-align: center; margin-bottom: 0.75rem; }
        .dn-stat-big strong { font-size: 2rem; color: #2481cc; display: block; }
        .dn-role-stats { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
        .dn-role-stat { padding: 4px 10px; background: #f1f5f9; border-radius: 12px; font-size: 0.75rem; display: flex; gap: 0.5rem; align-items: center; }
        .dn-role-stat strong { color: #2481cc; }

        .dn-preview-msg {
          display: flex; gap: 0.75rem; padding: 0.875rem; background: linear-gradient(135deg, #fafbfc, #fff);
          border: 1px dashed #cbd5e1; border-radius: 10px; margin-bottom: 1rem;
        }
        .dn-preview-icon { font-size: 1.75rem; }
        .dn-preview-content { flex: 1; min-width: 0; }
        .dn-preview-title { font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
        .dn-preview-text { font-size: 0.8125rem; color: #64748b; white-space: pre-wrap; word-wrap: break-word; }

        .dn-send-btn {
          width: 100%; padding: 0.875rem;
          background: linear-gradient(135deg, #2481cc, #1e6cb0);
          color: white; border: none; border-radius: 10px;
          font-size: 0.9375rem; font-weight: 700; cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease;
          box-shadow: 0 2px 8px rgba(36,129,204,.3);
        }
        .dn-send-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(36,129,204,.45); }
        .dn-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .dn-history-filters { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
        .dn-history-filters .dn-input { flex: 1; min-width: 200px; }
        .dn-checkbox-label { display: flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; color: #475569; cursor: pointer; }

        .dn-history-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .dn-history-item {
          display: flex; gap: 1rem; padding: 1rem; background: #fff;
          border: 1px solid #e6e8eb; border-radius: 12px; border-left: 4px solid #cbd5e1;
        }
        .dn-history-item.priority-low { border-left-color: #94a3b8; }
        .dn-history-item.priority-normal { border-left-color: #3b82f6; }
        .dn-history-item.priority-high { border-left-color: #f59e0b; }
        .dn-history-item.priority-urgent { border-left-color: #ef4444; }
        .dn-history-icon { font-size: 2rem; flex-shrink: 0; }
        .dn-history-body { flex: 1; min-width: 0; }
        .dn-history-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
        .dn-history-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
        .dn-history-message { color: #475569; font-size: 0.875rem; margin: 0 0 0.5rem; line-height: 1.5; }
        .dn-history-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.75rem; color: #64748b; }
        .dn-history-actions { display: flex; gap: 0.25rem; align-items: flex-start; }
        .dn-icon-action {
          background: none; border: 1px solid #e1e4e8; border-radius: 6px;
          padding: 0.375rem 0.5rem; cursor: pointer; font-size: 0.875rem; transition: all .15s ease;
        }
        .dn-icon-action:hover { background: #f1f5f9; }
        .dn-icon-action.danger:hover { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

        .dn-pri-badge { font-size: 0.6875rem; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
        .dn-pri-badge.pri-low { background: #f1f5f9; color: #64748b; }
        .dn-pri-badge.pri-normal { background: #dbeafe; color: #1e40af; }
        .dn-pri-badge.pri-high { background: #fef3c7; color: #92400e; }
        .dn-pri-badge.pri-urgent { background: #fee2e2; color: #991b1b; }

        .dn-loading, .dn-empty { padding: 2rem; text-align: center; color: #94a3b8; }

        .dn-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .dn-modal { background: #fff; border-radius: 14px; width: min(640px, 92vw); max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
        .dn-modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .dn-modal-header h3 { margin: 0; font-size: 1.0625rem; color: #0f172a; }
        .dn-modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
        .dn-modal-body { padding: 1.25rem; overflow-y: auto; }
        .dn-modal-message { background: #f8fafc; padding: 0.875rem; border-radius: 8px; color: #334155; margin-bottom: 1rem; white-space: pre-wrap; }
        .dn-modal-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1.25rem; padding: 0.75rem; background: #eaf4fc; border-radius: 8px; font-size: 0.8125rem; }
        .dn-modal-users { max-height: 240px; overflow-y: auto; }
        .dn-modal-user { padding: 0.5rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; }
      `}</style>
    </div>
  );
};

export default DirectorNotifications;
