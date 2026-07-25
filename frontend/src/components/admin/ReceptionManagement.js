import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';

const EMPTY_FORM = {
  firstName: '', lastName: '', birthDate: '', password: '',
  phone: '', passportSeriesNumber: '', jshshir: '', isActive: true
};

// Phone formatter: +998-90-123-45-67
const formatPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return '+' + digits;
  if (digits.length <= 5) return '+' + digits.slice(0,3) + '-' + digits.slice(3);
  if (digits.length <= 8) return '+' + digits.slice(0,3) + '-' + digits.slice(3,5) + '-' + digits.slice(5);
  if (digits.length <= 10) return '+' + digits.slice(0,3) + '-' + digits.slice(3,5) + '-' + digits.slice(5,8) + '-' + digits.slice(8);
  return '+' + digits.slice(0,3) + '-' + digits.slice(3,5) + '-' + digits.slice(5,8) + '-' + digits.slice(8,10) + '-' + digits.slice(10,12);
};

const ReceptionManagement = () => {
  const { setLoading, setError } = useData();
  const [receptionists, setReceptionists] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modals
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'view' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setLoading(true);
      const res = await apiService.getUsers('reception', 1, 100);
      setReceptionists(res.users || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Xatolik');
    } finally {
      setIsLoadingData(false);
      setLoading(false);
    }
  }, [setLoading, setError]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setModal('add'); };
  const openEdit = (acc) => { setSelected(acc); setForm({ firstName: acc.firstName || '', lastName: acc.lastName || '', birthDate: acc.birthDate ? acc.birthDate.slice(0,10) : '', password: '', phone: acc.phone || '', passportSeriesNumber: acc.passportSeriesNumber || '', jshshir: acc.jshshir || '', isActive: acc.isActive ?? true }); setFormError(''); setModal('edit'); };
  const openView = (acc) => { setSelected(acc); setModal('view'); };
  const openDelete = (acc) => { setSelected(acc); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setFormError(''); };

  const handleSave = async () => {
    const phoneDigits = form.phone.replace(/\D/g,'');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("Ism va Familiya majburiy!");
      return;
    }
    if (!form.phone.trim() || phoneDigits.length < 12) {
      setFormError("Telefon raqam to'liq kiritilishi shart! (+998-XX-XXX-XX-XX)");
      return;
    }
    if (modal === 'add' && !form.password.trim()) {
      setFormError("Parol majburiy!");
      return;
    }
    try {
      setIsSaving(true);
      // Phone is used as username for login
      const payload = { ...form, username: form.phone, role: 'reception' };
      if (modal === 'add') {
        await apiService.createUser(payload);
        showToast("Reception xodimi muvaffaqiyatli qo'shildi!");
      } else {
        if (!payload.password) delete payload.password;
        await apiService.updateUser(selected._id, payload);
        showToast("Reception xodimi ma'lumotlari yangilandi!");
      }
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSaving(true);
      await apiService.deleteUser(selected._id);
      showToast("Reception xodimi o'chirildi!", 'error');
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.response?.data?.message || "O'chirishda xatolik");
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() => receptionists.filter(a => {
    const s = debouncedSearch.toLowerCase();
    const match = (a.firstName + ' ' + a.lastName + ' ' + a.phone + ' ' + a.username).toLowerCase().includes(s);
    if (filter === 'active') return match && a.isActive;
    if (filter === 'inactive') return match && !a.isActive;
    return match;
  }), [receptionists, debouncedSearch, filter]);

  const stats = useMemo(() => ({
    total: receptionists.length,
    active: receptionists.filter(a => a.isActive).length,
    inactive: receptionists.filter(a => !a.isActive).length,
  }), [receptionists]);

  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';

  return (
    <div className="teacher-management">

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '90px', right: '20px', zIndex: 9999, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'slideInRight 0.3s ease' }}>
          {toast.type === 'error' ? '🗑️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[{ icon: '🛎️', val: stats.total, label: 'Jami reception xodimlari', cls: 'stat-total' }, { icon: '✅', val: stats.active, label: 'Faol', cls: 'stat-active' }, { icon: '⏸️', val: stats.inactive, label: 'Nofaol', cls: 'stat-inactive' }].map((s, i) => (
          <div key={i} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-content"><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>
            <div className="stat-decoration"></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-card">
          <div className="filter-left">
            <div className="filter-item">
              <label className="filter-label"><span className="label-icon">🔍</span>Qidiruv</label>
              <div className="search-wrapper">
                <input type="text" placeholder="Ism, familiya, telefon..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" />
                {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}>✕</button>}
              </div>
            </div>
            <div className="filter-item">
              <label className="filter-label"><span className="label-icon">📋</span>Holat</label>
              <select value={filter} onChange={e => setFilter(e.target.value)} className="filter-select">
                <option value="all">Barchasi</option>
                <option value="active">✓ Faol</option>
                <option value="inactive">✗ Nofaol</option>
              </select>
            </div>
            <div className="filter-results">
              <span className="results-count">{filtered.length}</span>
              <span className="results-label">ta natija</span>
            </div>
          </div>
          <button className="btn-add-compact" onClick={openAdd}>
            <span className="add-icon">➕</span>
            <span className="add-text">Yangi reception xodimi</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="teachers-container">
        {isLoadingData ? (
          <div className="loading-state"><div className="spinner"></div><p>Yuklanmoqda...</p></div>
        ) : filtered.length > 0 ? (
          <div className="table-view">
            <table className="teachers-table">
              <thead>
                <tr><th>Reception xodimi (F.I.SH)</th><th>Telefon</th><th>Passport</th><th>Holat</th><th>Amaliyotlar</th></tr>
              </thead>
              <tbody>
                {filtered.map(acc => (
                  <tr key={acc._id} className={!acc.isActive ? 'inactive-row' : ''}>
                    <td>
                      <div className="teacher-cell">
                        <div className="teacher-avatar" style={acc.profileImage ? { backgroundImage: `url(${baseUrl}${acc.profileImage})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : {}}>
                          {!acc.profileImage && <span>{acc.firstName?.charAt(0)}{acc.lastName?.charAt(0)}</span>}
                        </div>
                        <div className="teacher-details">
                          <div className="teacher-name">{acc.firstName} {acc.lastName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{acc.phone || acc.username || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="contact-text">{acc.phone || '—'}</span></td>
                    <td><span className="passport-badge">{acc.passportSeriesNumber || '—'}</span></td>
                    <td><span className={`status-badge ${acc.isActive ? 'status-active' : 'status-inactive'}`}>{acc.isActive ? '✓ Faol' : '✗ Nofaol'}</span></td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view-btn" title="Ko'rish" onClick={() => openView(acc)}><span>👁️</span></button>
                        <button className="action-btn edit-btn" title="Tahrirlash" onClick={() => openEdit(acc)}><span>✏️</span></button>
                        <button className="action-btn delete-btn" title="O'chirish" onClick={() => openDelete(acc)}><span>🗑️</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛎️</div>
            <h3 className="empty-title">Reception xodimlari topilmadi</h3>
            <p className="empty-text">Qidiruv kriteriyalaringizga mos reception xodimi mavjud emas.</p>
          </div>
        )}
      </div>

      {/* ADD / EDIT Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="am-overlay" onClick={closeModal}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-header">
              <div className="am-modal-title">
                <span className="am-modal-icon">{modal === 'add' ? '➕' : '✏️'}</span>
                {modal === 'add' ? "Yangi reception xodimi qo'shish" : "Reception xodimini tahrirlash"}
              </div>
              <button className="am-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="am-modal-body">
              {formError && <div className="am-error"><span>⚠️</span>{formError}</div>}
              <div className="am-form-grid">
                <div className="am-field">
                  <label>Ism <span className="am-required">*</span></label>
                  <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Ism" />
                </div>
                <div className="am-field">
                  <label>Familiya <span className="am-required">*</span></label>
                  <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Familiya" />
                </div>
                <div className="am-field">
                  <label>Telefon raqam <span className="am-required">*</span></label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                    placeholder="+998-90-123-45-67"
                    maxLength={17}
                  />
                </div>
                <div className="am-field">
                  <label>Parol {modal === 'add' && <span className="am-required">*</span>}</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={modal === 'edit' ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Parol"} />
                </div>
                <div className="am-field">
                  <label>Tug'ilgan sana</label>
                  <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
                </div>
                <div className="am-field">
                  <label>Passport seriyasi</label>
                  <input type="text" value={form.passportSeriesNumber} onChange={e => setForm(f => ({ ...f, passportSeriesNumber: e.target.value }))} placeholder="AA1234567" />
                </div>
                <div className="am-field">
                  <label>JSHSHIR</label>
                  <input type="text" value={form.jshshir} onChange={e => setForm(f => ({ ...f, jshshir: e.target.value }))} placeholder="14 raqam" />
                </div>
                <div className="am-field">
                  <label>Holat</label>
                  <select value={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                    <option value="true">✓ Faol</option>
                    <option value="false">✗ Nofaol</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="am-modal-footer">
              <button className="am-btn-cancel" onClick={closeModal} disabled={isSaving}>Bekor qilish</button>
              <button className="am-btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '⏳ Saqlanmoqda...' : modal === 'add' ? "➕ Qo'shish" : '✅ Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW Modal */}
      {modal === 'view' && selected && (
        <div className="am-overlay" onClick={closeModal}>
          <div className="am-modal am-modal-view" onClick={e => e.stopPropagation()}>
            <div className="am-modal-header am-header-view">
              <div className="am-modal-title"><span className="am-modal-icon">👁️</span>Reception xodimi ma'lumotlari</div>
              <button className="am-close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="am-modal-body">
              <div className="am-view-profile">
                <div className="am-view-avatar" style={selected.profileImage ? { backgroundImage: `url(${baseUrl}${selected.profileImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!selected.profileImage && `${selected.firstName?.charAt(0)}${selected.lastName?.charAt(0)}`}
                </div>
                <div>
                  <h3 className="am-view-name">{selected.firstName} {selected.lastName}</h3>
                  <span className={`status-badge ${selected.isActive ? 'status-active' : 'status-inactive'}`}>{selected.isActive ? '✓ Faol' : '✗ Nofaol'}</span>
                </div>
              </div>
              <div className="am-view-grid">
                {[['👤', 'Username', selected.username], ['📱', 'Telefon', selected.phone || '—'], ['🛂', 'Passport', selected.passportSeriesNumber || '—'], ['🆔', 'JSHSHIR', selected.jshshir || '—'], ['📅', "Qo'shilgan", selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('uz-UZ') : '—']].map(([icon, label, val], i) => (
                  <div key={i} className="am-view-row">
                    <span className="am-view-icon">{icon}</span>
                    <span className="am-view-label">{label}:</span>
                    <span className="am-view-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="am-modal-footer">
              <button className="am-btn-cancel" onClick={closeModal}>Yopish</button>
              <button className="am-btn-save" onClick={() => { closeModal(); openEdit(selected); }}>✏️ Tahrirlash</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE Modal */}
      {modal === 'delete' && selected && (
        <div className="am-overlay" onClick={closeModal}>
          <div className="am-modal am-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="am-delete-body">
              <div className="am-delete-icon-wrap">🗑️</div>
              <h3 className="am-delete-title">Reception xodimini o'chirish</h3>
              <p className="am-delete-text">
                <strong>{selected.firstName} {selected.lastName}</strong> ni tizimdan butunlay o'chirmoqchimisiz?<br />
                Bu amalni qaytarib bo'lmaydi!
              </p>
              {formError && <div className="am-error"><span>⚠️</span>{formError}</div>}
              <div className="am-delete-actions">
                <button className="am-btn-cancel" onClick={closeModal} disabled={isSaving}>Bekor qilish</button>
                <button className="am-btn-delete-confirm" onClick={handleDelete} disabled={isSaving}>
                  {isSaving ? '⏳...' : "🗑️ Ha, o'chirish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        
        /* ==================== BASE STYLES - O'qituvchi dashboardiga o'xshash kompakt dizayn ==================== */
        .teacher-management {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ==================== LOADING STATE ==================== */
        .loading-state {
          background: white;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 1rem;
          border: 3px solid #e2e8f0;
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state p {
          color: #64748b;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        /* ==================== STATS GRID ==================== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .stat-card {
          background: white;
          padding: 0.625rem 0.75rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-decoration {
          position: absolute;
          right: -10px;
          top: -10px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          opacity: 0.1;
        }

        .stat-total .stat-decoration { background: #3b82f6; }
        .stat-active .stat-decoration { background: #10b981; }
        .stat-inactive .stat-decoration { background: #ef4444; }
        .stat-new .stat-decoration { background: #f59e0b; }

        .stat-icon {
          font-size: 1.125rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .stat-total .stat-icon { background: #dbeafe; }
        .stat-active .stat-icon { background: #d1fae5; }
        .stat-inactive .stat-icon { background: #fee2e2; }
        .stat-new .stat-icon { background: #fef3c7; }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.125rem;
        }

        .stat-label {
          font-size: 0.625rem;
          color: #64748b;
          font-weight: 500;
        }

        /* ==================== FILTERS SECTION ==================== */
        .filters-container {
          margin-bottom: 1rem;
        }

        .filter-card {
          background: white;
          padding: 0.75rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 0.75rem;
        }

        .filter-left {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
          flex: 1;
          flex-wrap: wrap;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-item:first-child {
          flex: 1;
          min-width: 150px;
        }

        .filter-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .label-icon {
          font-size: 0.75rem;
        }

        .search-wrapper {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          transition: all 0.2s ease;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1);
        }

        .search-clear {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          background: #ef4444;
          color: white;
          border: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.5rem;
        }

        .filter-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #1e3a8a;
        }

        .filter-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.375rem 0.5rem;
          background: #dbeafe;
          border-radius: 6px;
          min-width: 50px;
        }

        .results-count {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e40af;
          line-height: 1;
        }

        .results-label {
          font-size: 0.5rem;
          color: #3b82f6;
          font-weight: 500;
        }

        .btn-add-compact {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-add-compact:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
        }

        .add-icon {
          font-size: 0.75rem;
        }

        .add-text {
          font-size: 0.75rem;
        }

        /* ==================== TABLE VIEW ==================== */
        .teachers-container {
        }

        .table-view {
          display: block;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .card-view {
          display: none;
        }

        .teachers-table {
          width: 100%;
          border-collapse: collapse;
        }

        .teachers-table thead {
          background: linear-gradient(135deg, #1e3a8a, #1e40af);
          color: white;
        }

        .teachers-table th {
          padding: 0.625rem 0.75rem;
          text-align: left;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .teachers-table tbody tr {
          transition: background-color 0.2s ease;
          border-bottom: 1px solid #e2e8f0;
        }

        .teachers-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .teachers-table tbody tr:last-child {
          border-bottom: none;
        }

        .teachers-table tbody tr.inactive-row {
          opacity: 0.5;
          background: #fafafa;
        }

        .teachers-table td {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #334155;
        }

        .teacher-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .teacher-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.625rem;
          flex-shrink: 0;
        }

        .teacher-name {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.75rem;
        }

        .contact-text {
          color: #64748b;
          font-size: 0.6875rem;
        }

        .passport-badge {
          background: #e0e7ff;
          color: #3730a3;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.625rem;
          display: inline-block;
        }

        .passport-text {
          font-weight: 700;
          color: #3730a3;
          letter-spacing: 0.5px;
        }

        .date-text {
          color: #64748b;
          font-size: 0.6875rem;
        }

        .status-badge {
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          display: inline-block;
        }

        .status-badge.status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
        }

        .action-btn {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-size: 0.75rem;
        }

        .view-btn { background: #dbeafe; color: #1e40af; }
        .view-btn:hover { background: #3b82f6; color: white; }

        .salary-btn { background: #d1fae5; color: #065f46; }
        .salary-btn:hover { background: #10b981; color: white; }

        .edit-btn { background: #fef3c7; color: #92400e; }
        .edit-btn:hover { background: #f59e0b; color: white; }

        .delete-btn { background: #fee2e2; color: #991b1b; }
        .delete-btn:hover { background: #ef4444; color: white; }

        /* ==================== CARD VIEW (Mobile/Tablet) ==================== */
        .teacher-card {
          background: white;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .teacher-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .teacher-card.card-inactive {
          opacity: 0.6;
          background: #fafafa;
        }

        .card-header {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          align-items: flex-start;
        }

        .card-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .card-info {
          flex: 1;
        }

        .card-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .card-status {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .card-status.status-active { background: #d1fae5; color: #065f46; }
        .card-status.status-inactive { background: #fee2e2; color: #991b1b; }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          padding: 0.625rem;
          background: #f8fafc;
          border-radius: 6px;
        }

        .card-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
        }

        .row-icon {
          font-size: 0.875rem;
          width: 20px;
          flex-shrink: 0;
        }

        .row-label {
          color: #64748b;
          font-weight: 500;
          min-width: 60px;
          font-size: 0.6875rem;
        }

        .row-value {
          color: #1e293b;
          font-weight: 500;
          flex: 1;
          font-size: 0.75rem;
          word-break: break-word;
        }

        .card-footer {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.375rem;
        }

        .card-action-btn {
          padding: 0.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          font-size: 0.5625rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .card-action-btn span:first-child {
          font-size: 0.875rem;
        }

        .card-action-btn.view { background: #dbeafe; color: #1e40af; }
        .card-action-btn.view:hover { background: #3b82f6; color: white; }

        .card-action-btn.salary { background: #d1fae5; color: #065f46; }
        .card-action-btn.salary:hover { background: #10b981; color: white; }

        .card-action-btn.edit { background: #fef3c7; color: #92400e; }
        .card-action-btn.edit:hover { background: #f59e0b; color: white; }

        .card-action-btn.delete { background: #fee2e2; color: #991b1b; }
        .card-action-btn.delete:hover { background: #ef4444; color: white; }

        /* ==================== PAGINATION ==================== */
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .pagination-pages {
          display: flex;
          gap: 0.25rem;
        }

        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          border: none;
          background: none;
        }

        .pagination-ellipsis.clickable {
          cursor: pointer;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .pagination-ellipsis.clickable:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f0f9ff;
        }

        .pagination-page {
          min-width: 28px;
          height: 28px;
          padding: 0 0.375rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-page:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f0f9ff;
        }

        .pagination-page.active {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-color: #3b82f6;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.625rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f0f9ff;
        }

        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pagination-btn span:first-child:not(.btn-text),
        .pagination-btn span:last-child:not(.btn-text) {
          font-size: 0.875rem;
        }

        /* ==================== EMPTY STATE ==================== */
        .empty-state {
          background: white;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.375rem;
        }

        .empty-text {
          font-size: 0.8125rem;
          color: #64748b;
        }

        /* ==================== DELETE MODAL STYLES ==================== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        /* ==================== SALARY MODAL ==================== */
        .salary-modal {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUpModal 0.3s ease-out;
        }

        .salary-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-bottom: 1px solid #93c5fd;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .salary-modal-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e40af;
          margin: 0;
        }

        .modal-close-btn {
          background: #3b82f6;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover {
          background: #2563eb;
          transform: rotate(90deg);
        }

        .salary-modal-body {
          padding: 1rem;
        }

        .month-selector-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding: 0.625rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .month-nav-btn {
          background: #3b82f6;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .month-nav-btn:hover {
          background: #2563eb;
          transform: scale(1.1);
        }

        .current-month-display {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          min-width: 140px;
          text-align: center;
        }

        .salary-rate-section {
          background: #eff6ff;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #bfdbfe;
        }

        .section-title {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .rate-input-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .rate-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          transition: border-color 0.2s ease;
        }

        .rate-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .rate-currency {
          color: #64748b;
          font-weight: 600;
          font-size: 0.75rem;
        }

        .update-rate-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.5rem 0.875rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.6875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .update-rate-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .rate-note {
          margin: 0.375rem 0 0 0;
          color: #64748b;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .balance-section {
          margin-bottom: 1rem;
        }

        .balance-card {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 6px 16px rgba(30, 58, 138, 0.25);
          position: relative;
          overflow: hidden;
        }

        .balance-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }

        .balance-icon {
          font-size: 1.75rem;
          background: rgba(255, 255, 255, 0.2);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .balance-content {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .balance-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.6875rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .balance-amount {
          color: white;
          font-size: 1.5rem;
          font-weight: 900;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          letter-spacing: -0.02em;
        }

        .balance-management {
          background: white;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-top: 0.625rem;
        }

        .balance-input-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .balance-type-select {
          padding: 0.5rem 0.625rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .balance-type-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .balance-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          transition: border-color 0.2s ease;
        }

        .balance-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .balance-currency {
          color: #64748b;
          font-weight: 600;
          font-size: 0.75rem;
        }

        .update-balance-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.6875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .update-balance-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
        }

        .salary-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.625rem;
          margin-bottom: 1rem;
        }

        .salary-stat-card {
          background: white;
          padding: 0.625rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          text-align: center;
          transition: all 0.2s ease;
        }

        .salary-stat-card:hover {
          transform: translateY(-2px);
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
        }

        .salary-stat-card .stat-icon {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }

        .salary-stat-card .stat-value {
          font-size: 0.8125rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .salary-stat-card .stat-label {
          font-size: 0.5625rem;
          color: #64748b;
          font-weight: 600;
        }

        .transactions-section {
          background: #f8fafc;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 250px;
          overflow-y: auto;
        }

        .transaction-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
          border-left: 3px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .transaction-item:hover {
          transform: translateX(2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .transaction-item.positive {
          border-left-color: #10b981;
        }

        .transaction-item.negative {
          border-left-color: #ef4444;
        }

        .transaction-item .transaction-icon {
          font-size: 0.875rem;
          width: 28px;
          height: 28px;
          background: #f8fafc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .transaction-item .transaction-title {
          font-weight: 700;
          font-size: 0.6875rem;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .transaction-item .transaction-info {
          font-size: 0.5625rem;
          color: #64748b;
        }

        .transaction-item .transaction-amount {
          font-size: 0.75rem;
          font-weight: 800;
          text-align: right;
        }

        .transaction-item .transaction-amount.positive {
          color: #10b981;
        }

        .transaction-item .transaction-amount.negative {
          color: #ef4444;
        }

        .no-transactions {
          text-align: center;
          padding: 1.5rem 0.75rem;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .delete-modal {
          background: white;
          border-radius: 12px;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUpModal 0.3s ease-out;
          overflow: hidden;
        }

        @keyframes slideUpModal {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .delete-modal-header {
          padding: 1.25rem 1rem 0.875rem;
          text-align: center;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-bottom: 1px solid #93c5fd;
        }

        .delete-icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .delete-icon {
          font-size: 2rem;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .delete-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e40af;
          margin: 0 0 0.25rem 0;
        }

        .delete-subtitle {
          font-size: 0.75rem;
          color: #3b82f6;
          font-weight: 600;
          margin: 0;
        }

        .delete-modal-body {
          padding: 1rem;
        }

        .teacher-info-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 8px;
          margin-bottom: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .teacher-info-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
          flex-shrink: 0;
        }

        .teacher-info-details {
          flex: 1;
        }

        .teacher-info-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.125rem 0;
        }

        .teacher-info-meta {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
          margin: 0;
        }

        .delete-warning {
          font-size: 0.75rem;
          color: #475569;
          line-height: 1.5;
          text-align: center;
          margin: 0;
          padding: 0.625rem;
          background: #fef9c3;
          border-radius: 6px;
          border-left: 3px solid #f59e0b;
        }

        .delete-modal-footer {
          padding: 0.875rem 1rem 1rem;
          display: flex;
          gap: 0.5rem;
          background: #fafbfc;
          border-top: 1px solid #e2e8f0;
        }

        .modal-btn {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          transition: all 0.2s ease;
        }

        .modal-btn span:first-child {
          font-size: 0.875rem;
        }

        .cancel-btn {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .cancel-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .confirm-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
        }

        .confirm-btn:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
        }

        .confirm-btn:active,
        .cancel-btn:active {
          transform: translateY(0);
        }

        /* ==================== RESPONSIVE: NOUTBUK (769px - 1024px) - kompakt qoladi ==================== */
        @media (min-width: 769px) and (max-width: 1024px) {
          .teacher-management {
            padding: 0.875rem;
          }

          .stats-grid {
            gap: 0.375rem;
          }

          .stat-card {
            padding: 0.5rem 0.625rem;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 1rem;
          }

          .stat-value {
            font-size: 1rem;
          }

          .stat-label {
            font-size: 0.5625rem;
          }

          .filter-card {
            padding: 0.625rem;
          }

          .btn-add-compact {
            padding: 0.375rem 0.625rem;
            font-size: 0.6875rem;
            border-radius: 8px;
            gap: 0.375rem;
          }

          .add-icon {
            font-size: 0.75rem;
          }

          .add-text {
            font-size: 0.6875rem;
          }

          .table-view {
            border-radius: 10px;
          }

          .teachers-table th {
            padding: 0.625rem 0.75rem;
            font-size: 0.5625rem;
          }

          .teachers-table td {
            padding: 0.625rem 0.75rem;
            font-size: 0.6875rem;
          }

          .teacher-cell {
            gap: 0.5rem;
          }

          .teacher-avatar {
            width: 30px;
            height: 30px;
            font-size: 0.625rem;
          }

          .teacher-name {
            font-size: 0.6875rem;
          }

          .passport-badge,
          .status-badge {
            padding: 0.1875rem 0.5rem;
            font-size: 0.5625rem;
            border-radius: 5px;
          }

          .contact-text,
          .date-text {
            font-size: 0.625rem;
          }

          .action-buttons {
            gap: 0.25rem;
          }

          .action-btn {
            width: 24px;
            height: 24px;
            font-size: 0.75rem;
            border-radius: 5px;
          }

          .pagination-container {
            padding: 0.75rem;
            margin-top: 1rem;
            gap: 0.5rem;
            border-radius: 10px;
          }

          .pagination-pages {
            gap: 0.25rem;
          }

          .pagination-page {
            min-width: 28px;
            height: 28px;
            font-size: 0.6875rem;
            border-radius: 6px;
          }

          .pagination-btn {
            padding: 0.375rem 0.625rem;
            font-size: 0.6875rem;
            gap: 0.25rem;
            border-radius: 6px;
          }

          .pagination-btn span:first-child:not(.btn-text),
          .pagination-btn span:last-child:not(.btn-text) {
            font-size: 0.875rem;
          }

          .pagination-ellipsis {
            min-width: 28px;
            height: 28px;
            font-size: 0.875rem;
          }

          .pagination-ellipsis.clickable {
            border-radius: 6px;
          }

          .empty-state {
            padding: 2rem 1rem;
            border-radius: 10px;
          }

          .empty-title {
            font-size: 0.9375rem;
          }

          .empty-text {
            font-size: 0.75rem;
          }
        }

        /* ==================== RESPONSIVE: KATTA EKRAN / DESKTOP (1025px va undan yuqori) ==================== */
        @media (min-width: 1025px) {
          .teacher-management {
            padding: 1.5rem 2rem;
          }

          .stats-grid {
            gap: 0.75rem;
            margin-bottom: 1.25rem;
          }

          .stat-card {
            padding: 0.875rem 1rem;
            border-radius: 10px;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 1.375rem;
            border-radius: 8px;
          }

          .stat-value {
            font-size: 1.375rem;
          }

          .stat-label {
            font-size: 0.75rem;
          }

          .filters-container {
            margin-bottom: 1.25rem;
          }

          .filter-card {
            padding: 1rem;
            border-radius: 10px;
          }

          .filter-label {
            font-size: 0.8125rem;
          }

          .label-icon {
            font-size: 0.9375rem;
          }

          .search-input,
          .filter-select {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            border-radius: 8px;
          }

          .filter-results {
            padding: 0.5rem 0.75rem;
            min-width: 60px;
          }

          .results-count {
            font-size: 1.125rem;
          }

          .results-label {
            font-size: 0.5625rem;
          }

          .btn-add-compact {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            border-radius: 8px;
          }

          .add-icon {
            font-size: 0.875rem;
          }

          .teachers-table th {
            padding: 0.75rem 1rem;
            font-size: 0.75rem;
          }

          .teachers-table td {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .teacher-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }

          .teacher-name {
            font-size: 0.8125rem;
          }

          .passport-badge,
          .status-badge {
            padding: 0.1875rem 0.5rem;
            font-size: 0.6875rem;
          }

          .contact-text,
          .date-text {
            font-size: 0.75rem;
          }

          .action-btn {
            width: 28px;
            height: 28px;
            font-size: 0.875rem;
            border-radius: 6px;
          }

          .pagination-container {
            margin-top: 1.25rem;
          }

          .pagination-page {
            min-width: 32px;
            height: 32px;
            font-size: 0.8125rem;
          }

          .pagination-btn {
            padding: 0.5rem 0.875rem;
            font-size: 0.8125rem;
          }

          .table-view {
            border-radius: 10px;
          }

          .empty-state {
            padding: 3rem 2rem;
          }

          .empty-title {
            font-size: 1.125rem;
          }

          .empty-text {
            font-size: 0.875rem;
          }
        }

        /* ==================== RESPONSIVE: TABLET (481px - 768px) ==================== */
        @media (min-width: 481px) and (max-width: 768px) {
          .teacher-management {
            padding: 0.875rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
            margin-bottom: 0.875rem;
          }

          .stat-card {
            padding: 0.625rem;
            gap: 0.5rem;
            border-radius: 8px;
          }

          .stat-icon {
            width: 32px;
            height: 32px;
            font-size: 1.125rem;
          }

          .stat-value {
            font-size: 1.125rem;
          }

          .stat-label {
            font-size: 0.5625rem;
          }

          .filter-card {
            padding: 0.75rem;
            flex-direction: column;
            align-items: stretch;
            gap: 0.625rem;
          }

          .filter-left {
            width: 100%;
            flex-direction: row;
            gap: 0.625rem;
            flex-wrap: wrap;
          }

          .filter-item {
            flex: 1;
            min-width: 100px;
          }

          .filter-item:first-child {
            min-width: 150px;
            flex: 2;
          }

          .filter-results {
            padding: 0.375rem 0.5rem;
            min-width: 50px;
          }

          .results-count {
            font-size: 0.9375rem;
          }

          .results-label {
            font-size: 0.5rem;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
          }

          /* Switch to Card View */
          .table-view {
            display: none;
          }

          .card-view {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.625rem;
          }

          .teacher-card {
            padding: 0.75rem;
            border-radius: 8px;
            position: relative;
          }

          .card-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.5rem;
          }

          .card-avatar {
            width: 36px;
            height: 36px;
            font-size: 0.75rem;
          }

          .card-info {
            text-align: center;
          }

          .card-name {
            font-size: 0.8125rem;
          }

          .card-status {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            width: 20px;
            height: 20px;
            font-size: 0.625rem;
          }

          .card-body {
            padding: 0.5rem;
            gap: 0.375rem;
          }

          .card-row {
            gap: 0.375rem;
            font-size: 0.6875rem;
          }

          .row-icon {
            font-size: 0.75rem;
            width: 18px;
          }

          .row-label {
            min-width: 50px;
            font-size: 0.625rem;
          }

          .row-value {
            font-size: 0.6875rem;
          }

          .card-footer {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.25rem;
          }

          .card-action-btn {
            padding: 0.375rem;
            font-size: 0.5rem;
            border-radius: 4px;
          }

          .card-action-btn span:first-child {
            font-size: 0.75rem;
          }

          .pagination-container {
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
          }

          .pagination-pages {
            gap: 0.25rem;
            order: 1;
            width: 100%;
            justify-content: center;
          }

          .pagination-page {
            min-width: 28px;
            height: 28px;
            font-size: 0.75rem;
          }

          .pagination-btn {
            padding: 0.375rem 0.625rem;
            font-size: 0.75rem;
          }

          .pagination-prev {
            order: 2;
            flex: 0 0 48%;
          }

          .pagination-next {
            order: 3;
            flex: 0 0 48%;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-title {
            font-size: 0.9375rem;
          }

          .empty-text {
            font-size: 0.75rem;
          }
        }

        /* ==================== RESPONSIVE: MOBIL (max 480px gacha) ==================== */
        @media (max-width: 480px) {
          .teacher-management {
            padding: 0.625rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.375rem;
            margin-bottom: 0.75rem;
          }

          .stat-card {
            padding: 0.5rem;
            gap: 0.375rem;
            border-radius: 6px;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 1rem;
            border-radius: 6px;
          }

          .stat-content {
            text-align: center;
          }

          .stat-value {
            font-size: 1rem;
          }

          .stat-label {
            font-size: 0.5rem;
          }

          .stat-decoration {
            width: 30px;
            height: 30px;
            right: -8px;
            top: -8px;
          }

          .filters-container {
            margin-bottom: 0.75rem;
          }

          .filter-card {
            padding: 0.625rem;
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            border-radius: 6px;
          }

          .filter-left {
            width: 100%;
            flex-direction: column;
            gap: 0.5rem;
          }

          .filter-item {
            width: 100%;
          }

          .filter-item:first-child {
            min-width: 100%;
          }

          .filter-label {
            font-size: 0.625rem;
          }

          .label-icon {
            font-size: 0.75rem;
          }

          .search-input,
          .filter-select {
            padding: 0.5rem 0.625rem;
            font-size: 0.75rem;
            border-radius: 6px;
          }

          .filter-results {
            padding: 0.375rem 0.5rem;
            min-width: 100%;
            flex-direction: row;
            justify-content: center;
            gap: 0.375rem;
          }

          .results-count {
            font-size: 0.875rem;
          }

          .results-label {
            font-size: 0.5rem;
            margin-top: 0;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            border-radius: 6px;
          }

          .add-icon {
            font-size: 0.75rem;
          }

          /* Switch to Card View */
          .table-view {
            display: none;
          }

          .card-view {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .teacher-card {
            padding: 0.625rem;
            border-radius: 6px;
            position: relative;
          }

          .card-header {
            gap: 0.5rem;
            padding-right: 1.5rem;
          }

          .card-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.6875rem;
          }

          .card-info {
            min-width: 0;
          }

          .card-name {
            font-size: 0.75rem;
            word-break: break-word;
          }

          .card-status {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            width: 18px;
            height: 18px;
            font-size: 0.5625rem;
          }

          .card-body {
            padding: 0.5rem;
            gap: 0.375rem;
            border-radius: 6px;
          }

          .card-row {
            gap: 0.375rem;
            font-size: 0.625rem;
          }

          .row-icon {
            font-size: 0.75rem;
            width: 16px;
          }

          .row-label {
            min-width: 50px;
            font-size: 0.5625rem;
          }

          .row-value {
            font-size: 0.625rem;
          }

          .card-footer {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.25rem;
          }

          .card-action-btn {
            flex-direction: column;
            justify-content: center;
            padding: 0.375rem;
            gap: 0.125rem;
            font-size: 0.5rem;
            border-radius: 4px;
          }

          .card-action-btn span:first-child {
            font-size: 0.75rem;
          }

          .empty-state {
            padding: 1.5rem 0.875rem;
            border-radius: 6px;
          }

          .empty-title {
            font-size: 0.875rem;
          }

          .empty-text {
            font-size: 0.6875rem;
          }

          .pagination-container {
            gap: 0.375rem;
            flex-wrap: wrap;
            margin-top: 0.75rem;
          }

          .pagination-pages {
            gap: 0.1875rem;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
            order: 1;
          }

          .pagination-page {
            min-width: 24px;
            height: 24px;
            font-size: 0.6875rem;
            border-radius: 4px;
          }

          .pagination-btn {
            padding: 0.375rem 0.5rem;
            font-size: 0.6875rem;
            flex: 0 0 48%;
            justify-content: center;
          }

          .pagination-prev {
            order: 2;
          }

          .pagination-next {
            order: 3;
          }

          .pagination-btn .btn-text {
            display: none;
          }

          .pagination-btn span:first-child:not(.btn-text),
          .pagination-btn span:last-child:not(.btn-text) {
            font-size: 0.875rem;
          }

          .pagination-ellipsis {
            min-width: 24px;
            height: 24px;
            font-size: 0.75rem;
          }

          .pagination-ellipsis.clickable {
            border-radius: 4px;
          }

          /* Delete Modal for Mobile */
          .delete-modal {
            width: 95%;
            max-width: none;
            border-radius: 12px;
          }

          .delete-modal-header {
            padding: 1.25rem 1rem 0.875rem;
          }

          .delete-icon {
            font-size: 2rem;
          }

          .delete-title {
            font-size: 1rem;
          }

          .delete-subtitle {
            font-size: 0.75rem;
          }

          .delete-modal-body {
            padding: 1rem;
          }

          .teacher-info-card {
            padding: 0.75rem;
            gap: 0.75rem;
            border-radius: 8px;
          }

          .teacher-info-avatar {
            width: 40px;
            height: 40px;
            font-size: 0.875rem;
          }

          .teacher-info-name {
            font-size: 0.875rem;
          }

          .teacher-info-meta {
            font-size: 0.6875rem;
          }

          .delete-warning {
            font-size: 0.75rem;
            padding: 0.625rem;
            border-radius: 6px;
          }

          .delete-modal-footer {
            padding: 0.875rem 1rem 1rem;
            gap: 0.5rem;
          }

          .modal-btn {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            border-radius: 6px;
          }

          .modal-btn span:first-child {
            font-size: 0.875rem;
          }
        }
      
        @keyframes slideInRight { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0); } }
        @keyframes fadeInScale { from { opacity:0; transform: scale(0.92); } to { opacity:1; transform: scale(1); } }

        .am-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; backdrop-filter: blur(6px); padding: 1rem;
        }
        .am-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 620px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,0.25);
          animation: fadeInScale 0.25s ease;
        }
        .am-modal-view { max-width: 480px; }
        .am-modal-delete { max-width: 420px; }
        .am-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem; background: linear-gradient(135deg,#1e3a8a,#3b82f6);
          border-radius: 16px 16px 0 0;
        }
        .am-header-view { background: linear-gradient(135deg,#0f766e,#14b8a6); }
        .am-modal-title { display:flex; align-items:center; gap:0.6rem; color:#fff; font-weight:700; font-size:1rem; }
        .am-modal-icon { font-size:1.2rem; }
        .am-close-btn { background:rgba(255,255,255,0.2); border:none; color:#fff; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
        .am-close-btn:hover { background:rgba(255,255,255,0.35); transform:rotate(90deg); }
        .am-modal-body { padding: 1.5rem; }
        .am-error { background:#fef2f2; border:1px solid #fca5a5; color:#b91c1c; padding:0.75rem 1rem; border-radius:8px; margin-bottom:1rem; font-size:0.8125rem; display:flex; align-items:center; gap:0.5rem; }
        .am-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .am-field { display:flex; flex-direction:column; gap:0.35rem; }
        .am-field label { font-size:0.75rem; font-weight:600; color:#475569; }
        .am-required { color:#ef4444; }
        .am-field input, .am-field select {
          padding:0.55rem 0.75rem; border:1.5px solid #e2e8f0; border-radius:8px;
          font-size:0.8125rem; background:#f8fafc; transition:all 0.2s; outline:none;
        }
        .am-field input:focus, .am-field select:focus { border-color:#3b82f6; background:#fff; box-shadow:0 0 0 3px rgba(59,130,246,0.12); }
        .am-modal-footer { padding:1rem 1.5rem; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:0.75rem; background:#fafafa; border-radius:0 0 16px 16px; }
        .am-btn-cancel { padding:0.55rem 1.25rem; border:1.5px solid #e2e8f0; background:#fff; border-radius:8px; font-size:0.8125rem; font-weight:600; color:#64748b; cursor:pointer; transition:all 0.2s; }
        .am-btn-cancel:hover { border-color:#94a3b8; color:#334155; }
        .am-btn-save { padding:0.55rem 1.5rem; background:linear-gradient(135deg,#1e3a8a,#3b82f6); color:#fff; border:none; border-radius:8px; font-size:0.8125rem; font-weight:700; cursor:pointer; transition:all 0.2s; }
        .am-btn-save:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(59,130,246,0.35); }
        .am-btn-save:disabled, .am-btn-cancel:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        /* View modal */
        .am-view-profile { display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid #f1f5f9; }
        .am-view-avatar { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#14b8a6,#0f766e); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:700; flex-shrink:0; }
        .am-view-name { font-size:1.125rem; font-weight:700; color:#1e293b; margin:0 0 0.35rem; }
        .am-view-grid { display:flex; flex-direction:column; gap:0.625rem; }
        .am-view-row { display:flex; align-items:center; gap:0.75rem; padding:0.5rem 0.75rem; background:#f8fafc; border-radius:8px; font-size:0.8125rem; }
        .am-view-icon { font-size:1rem; width:24px; }
        .am-view-label { color:#64748b; font-weight:500; min-width:80px; }
        .am-view-val { color:#1e293b; font-weight:600; }

        /* Delete modal */
        .am-delete-body { padding:2rem 1.5rem; text-align:center; }
        .am-delete-icon-wrap { font-size:3.5rem; margin-bottom:1rem; }
        .am-delete-title { font-size:1.25rem; font-weight:700; color:#1e293b; margin:0 0 0.75rem; }
        .am-delete-text { font-size:0.875rem; color:#64748b; margin:0 0 1.5rem; line-height:1.6; }
        .am-delete-actions { display:flex; gap:0.75rem; justify-content:center; }
        .am-btn-delete-confirm { padding:0.6rem 1.5rem; background:linear-gradient(135deg,#dc2626,#ef4444); color:#fff; border:none; border-radius:8px; font-size:0.875rem; font-weight:700; cursor:pointer; transition:all 0.2s; }
        .am-btn-delete-confirm:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(239,68,68,0.35); }
        .am-btn-delete-confirm:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        @media (max-width: 640px) {
          .am-form-grid { grid-template-columns:1fr; }
          .am-modal { border-radius:12px; }
        }
      `}</style>
    </div>
  );
};

export default ReceptionManagement;

