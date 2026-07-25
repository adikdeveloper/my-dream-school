import React, { useEffect, useState, useCallback, useMemo } from 'react';
import apiService from '../../services/apiService';

const ROLE_LABELS = {
  admin: '🛡️ Admin',
  director: '👔 Direktor',
  teacher: "👨‍🏫 O'qituvchi",
  student: "👨‍🎓 O'quvchi",
  supervisor: '👁️ Nazoratchi',
  accountant: '💰 Hisobchi',
  hr: '📋 HR',
  reception: '🛎️ Reception',
  callcenter: '📞 Call-center'
};

const DirectorPermissions = () => {
  const [catalog, setCatalog] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('teacher');
  const [search, setSearch] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, perms] = await Promise.all([
        apiService.getPermissionsCatalog(),
        apiService.getAllPermissions()
      ]);
      setCatalog(cat);
      setPermissions(perms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (role, key, value) => {
    setSavingKey(`${role}:${key}`);
    // Optimistik update
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [key]: value }
    }));
    try {
      await apiService.togglePermission(role, key, value);
      setSavedAt(new Date());
    } catch (err) {
      console.error(err);
      // Qaytarish
      setPermissions((prev) => ({
        ...prev,
        [role]: { ...(prev[role] || {}), [key]: !value }
      }));
      alert("Saqlashda xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = async (role) => {
    setResetConfirm(null);
    try {
      const data = await apiService.resetRolePermissions(role);
      setPermissions((prev) => ({ ...prev, [role]: data.permissions }));
      setSavedAt(new Date());
    } catch (err) {
      alert("Qaytarishda xatolik");
    }
  };

  const handleToggleAll = async (role, category, value) => {
    const keys = (catalog?.grouped[category] || []).map((p) => p.key);
    if (!keys.length) return;
    const newPerms = { ...(permissions[role] || {}) };
    keys.forEach((k) => { newPerms[k] = value; });
    setPermissions((prev) => ({ ...prev, [role]: newPerms }));
    try {
      await apiService.updateRolePermissions(role, newPerms);
      setSavedAt(new Date());
    } catch (err) {
      console.error(err);
      // Qaytarish — qayta yuklash
      load();
    }
  };

  const filteredGroups = useMemo(() => {
    if (!catalog) return {};
    if (!search.trim()) return catalog.grouped;
    const s = search.toLowerCase();
    const out = {};
    Object.entries(catalog.grouped).forEach(([cat, items]) => {
      const filtered = items.filter((p) =>
        p.label.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.key.toLowerCase().includes(s) ||
        cat.toLowerCase().includes(s)
      );
      if (filtered.length) out[cat] = filtered;
    });
    return out;
  }, [catalog, search]);

  if (loading) {
    return <div className="dp-loading">Ruxsatlar yuklanmoqda...</div>;
  }

  if (!catalog) {
    return <div className="dp-error">Yuklashda xatolik</div>;
  }

  const rolePerms = permissions[activeRole] || {};
  const grantedCount = Object.values(rolePerms).filter(Boolean).length;
  const totalCount = catalog.permissions.length;

  return (
    <div className="dp-page">
      <div className="dp-header">
        <div>
          <h1 className="dp-title">🔑 Ruxsatlar boshqaruvi</h1>
          <p className="dp-subtitle">Har bir rol uchun ruxsatlarni sozlang</p>
        </div>
        {savedAt && (
          <div className="dp-saved">
            ✓ Saqlandi {savedAt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>

      <div className="dp-role-tabs">
        {catalog.roles.map((r) => {
          const cnt = Object.values(permissions[r] || {}).filter(Boolean).length;
          return (
            <button
              key={r}
              className={`dp-role-tab ${activeRole === r ? 'active' : ''}`}
              onClick={() => setActiveRole(r)}
            >
              {ROLE_LABELS[r] || r}
              <span className="dp-role-count">{cnt}</span>
            </button>
          );
        })}
      </div>

      <div className="dp-toolbar">
        <input
          className="dp-search"
          placeholder="🔍 Ruxsat qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="dp-stats">
          <strong>{grantedCount}</strong> / {totalCount} ta ruxsat berilgan
        </div>
        <button className="dp-reset-btn" onClick={() => setResetConfirm(activeRole)}>
          ↺ Default'ga qaytarish
        </button>
      </div>

      {(activeRole === 'admin' || activeRole === 'director') && (
        <div className="dp-warning">
          ⚠️ Admin va Direktor uchun ruxsatlar — defaultda barchasi yoqilgan. O'chirish o'zingizni cheklab qo'yishi mumkin.
        </div>
      )}

      <div className="dp-categories">
        {Object.keys(filteredGroups).length === 0 && (
          <div className="dp-empty">Qidiruv bo'yicha ruxsat topilmadi</div>
        )}
        {Object.entries(filteredGroups).map(([cat, items]) => {
          const catGranted = items.filter((p) => rolePerms[p.key]).length;
          const allOn = catGranted === items.length;
          return (
            <div key={cat} className="dp-category">
              <div className="dp-cat-head">
                <h3 className="dp-cat-title">{cat}</h3>
                <div className="dp-cat-actions">
                  <span className="dp-cat-count">{catGranted}/{items.length}</span>
                  <button
                    className="dp-cat-btn"
                    onClick={() => handleToggleAll(activeRole, cat, !allOn)}
                  >
                    {allOn ? "Hammasini o'chir" : "Hammasini yoq"}
                  </button>
                </div>
              </div>
              <div className="dp-perm-list">
                {items.map((p) => {
                  const checked = !!rolePerms[p.key];
                  const saving = savingKey === `${activeRole}:${p.key}`;
                  return (
                    <label key={p.key} className={`dp-perm-row ${checked ? 'on' : 'off'}`}>
                      <div className="dp-perm-info">
                        <div className="dp-perm-label">{p.label}</div>
                        <div className="dp-perm-desc">{p.description}</div>
                        <div className="dp-perm-key">{p.key}</div>
                      </div>
                      <div className="dp-perm-toggle">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={saving}
                          onChange={(e) => handleToggle(activeRole, p.key, e.target.checked)}
                        />
                        <span className="dp-switch" />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {resetConfirm && (
        <div className="dp-modal-backdrop" onClick={() => setResetConfirm(null)}>
          <div className="dp-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Default'ga qaytarish</h3>
            <p>{ROLE_LABELS[resetConfirm]} rolining barcha ruxsatlari boshlang'ich qiymatlariga qaytariladi. Bu o'zgartirishlarni bekor qiladi.</p>
            <div className="dp-modal-actions">
              <button className="dp-btn-cancel" onClick={() => setResetConfirm(null)}>Bekor qilish</button>
              <button className="dp-btn-danger" onClick={() => handleReset(resetConfirm)}>↺ Qaytarish</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dp-page { padding: 1.5rem; max-width: 1300px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .dp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .dp-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; }
        .dp-subtitle { color: #64748b; font-size: 0.9375rem; margin: 0.25rem 0 0; }
        .dp-saved { color: #059669; font-size: 0.875rem; background: #d1fae5; padding: 0.375rem 0.875rem; border-radius: 20px; font-weight: 600; }

        .dp-loading, .dp-error, .dp-empty {
          padding: 3rem; text-align: center; color: #94a3b8; background: #fff;
          border-radius: 14px; border: 1px solid #e6e8eb;
        }
        .dp-error { color: #dc2626; }

        .dp-role-tabs {
          display: flex; gap: 0.375rem; flex-wrap: wrap; margin-bottom: 1.25rem;
          padding: 0.5rem; background: #fff; border-radius: 12px;
          border: 1px solid #e6e8eb;
        }
        .dp-role-tab {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 0.875rem; border: 1px solid transparent;
          background: none; cursor: pointer; border-radius: 8px;
          font-size: 0.875rem; color: #475569; font-weight: 500;
          transition: all .15s ease;
        }
        .dp-role-tab:hover { background: #f1f5f9; }
        .dp-role-tab.active {
          background: linear-gradient(135deg, #2481cc, #1e6cb0); color: white;
          box-shadow: 0 2px 6px rgba(36,129,204,.3);
        }
        .dp-role-count {
          background: rgba(0,0,0,.1); padding: 1px 8px; border-radius: 10px;
          font-size: 0.6875rem; font-weight: 700;
        }
        .dp-role-tab.active .dp-role-count { background: rgba(255,255,255,.25); }

        .dp-toolbar {
          display: flex; gap: 0.75rem; align-items: center;
          margin-bottom: 1rem; flex-wrap: wrap;
        }
        .dp-search {
          flex: 1; min-width: 200px; padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0; border-radius: 10px;
          background: #fff; font-size: 0.875rem; outline: none;
        }
        .dp-search:focus { border-color: #2481cc; box-shadow: 0 0 0 3px rgba(36,129,204,.1); }
        .dp-stats { color: #475569; font-size: 0.875rem; }
        .dp-stats strong { color: #2481cc; font-size: 1rem; }
        .dp-reset-btn {
          padding: 0.5rem 0.875rem; border: 1px solid #fca5a5; background: #fef2f2;
          color: #b91c1c; border-radius: 8px; cursor: pointer; font-size: 0.8125rem;
          font-weight: 600; transition: all .15s ease;
        }
        .dp-reset-btn:hover { background: #fee2e2; }

        .dp-warning {
          padding: 0.75rem 1rem; background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 10px; color: #92400e; font-size: 0.875rem; margin-bottom: 1rem;
        }

        .dp-categories { display: flex; flex-direction: column; gap: 1rem; }
        .dp-category {
          background: #fff; border: 1px solid #e6e8eb; border-radius: 14px; overflow: hidden;
        }
        .dp-cat-head {
          padding: 0.875rem 1.25rem; background: linear-gradient(180deg, #fafbfc, #fff);
          border-bottom: 1px solid #eef0f2;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;
        }
        .dp-cat-title { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }
        .dp-cat-actions { display: flex; gap: 0.625rem; align-items: center; }
        .dp-cat-count { font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; }
        .dp-cat-btn {
          font-size: 0.75rem; padding: 0.375rem 0.75rem;
          border: 1px solid #e2e8f0; background: #fff; color: #475569;
          border-radius: 6px; cursor: pointer;
        }
        .dp-cat-btn:hover { background: #f1f5f9; }

        .dp-perm-list { padding: 0.5rem; display: flex; flex-direction: column; gap: 4px; }
        .dp-perm-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; padding: 0.75rem 0.875rem; border-radius: 8px;
          cursor: pointer; transition: background .1s ease; border: 1px solid transparent;
        }
        .dp-perm-row:hover { background: #f8fafc; }
        .dp-perm-row.on { background: linear-gradient(90deg, #f0fdf4, #fff); border-color: #d1fae5; }
        .dp-perm-info { flex: 1; min-width: 0; }
        .dp-perm-label { font-weight: 600; color: #0f172a; font-size: 0.9375rem; }
        .dp-perm-desc { font-size: 0.8125rem; color: #64748b; margin-top: 2px; }
        .dp-perm-key { font-family: 'SF Mono', Consolas, monospace; font-size: 0.6875rem; color: #94a3b8; margin-top: 2px; }

        .dp-perm-toggle {
          position: relative;
          flex-shrink: 0;
        }
        .dp-perm-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .dp-switch {
          display: block; width: 44px; height: 24px;
          background: #cbd5e1; border-radius: 12px;
          transition: background .2s ease;
          position: relative; cursor: pointer;
        }
        .dp-switch::before {
          content: ''; position: absolute; left: 2px; top: 2px;
          width: 20px; height: 20px; background: white; border-radius: 50%;
          transition: transform .2s ease; box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }
        .dp-perm-toggle input:checked + .dp-switch { background: #10b981; }
        .dp-perm-toggle input:checked + .dp-switch::before { transform: translateX(20px); }
        .dp-perm-toggle input:disabled + .dp-switch { opacity: 0.5; cursor: wait; }

        .dp-modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,.5);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .dp-modal {
          background: #fff; border-radius: 14px; padding: 1.5rem;
          width: min(440px, 92vw); box-shadow: 0 20px 60px rgba(0,0,0,.3);
        }
        .dp-modal h3 { margin: 0 0 0.5rem; color: #0f172a; }
        .dp-modal p { margin: 0 0 1.25rem; color: #64748b; font-size: 0.875rem; line-height: 1.5; }
        .dp-modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .dp-btn-cancel, .dp-btn-danger {
          padding: 0.625rem 1rem; border-radius: 8px; cursor: pointer;
          font-weight: 600; font-size: 0.875rem; border: 1px solid;
        }
        .dp-btn-cancel { background: #fff; color: #475569; border-color: #e2e8f0; }
        .dp-btn-danger { background: #ef4444; color: #fff; border-color: #dc2626; }
        .dp-btn-danger:hover { background: #dc2626; }
      `}</style>
    </div>
  );
};

export default DirectorPermissions;
