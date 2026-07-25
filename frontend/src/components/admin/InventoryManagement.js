import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Can } from '../../context/PermissionsContext';
import apiService from '../../services/apiService';

// Xona turlari
const ROOM_TYPES = [
  { value: 'classroom', label: 'Sinfxona', icon: '🏫' },
  { value: 'lab', label: 'Laboratoriya', icon: '🔬' },
  { value: 'office', label: 'Ofis / Kabinet', icon: '🗄️' },
  { value: 'library', label: 'Kutubxona', icon: '📚' },
  { value: 'gym', label: 'Sport zali', icon: '🤸' },
  { value: 'cafeteria', label: 'Oshxona', icon: '🍽️' },
  { value: 'storage', label: 'Ombor', icon: '📦' },
  { value: 'restroom', label: 'Hojatxona', icon: '🚻' },
  { value: 'hall', label: "Yo'lak / Zal", icon: '🚪' },
  { value: 'other', label: 'Boshqa', icon: '🏠' }
];

// Jihoz holatlari
const CONDITIONS = [
  { value: 'good', label: 'Yaroqli', color: '#10b981' },
  { value: 'needs_repair', label: "Ta'mir kerak", color: '#f59e0b' },
  { value: 'broken', label: 'Buzilgan', color: '#ef4444' }
];

// Tez qo'shish uchun keng tarqalgan jihozlar
const COMMON_ITEMS = ['Parta', 'Stul', 'Doska', 'Shkaf', 'Stol', 'Proyektor', 'Kompyuter', 'Konditsioner'];

const typeMeta = (t) => ROOM_TYPES.find((x) => x.value === t) || ROOM_TYPES[ROOM_TYPES.length - 1];
const condMeta = (c) => CONDITIONS.find((x) => x.value === c) || CONDITIONS[0];

const emptyForm = {
  floor: '',
  roomNumber: '',
  name: '',
  type: 'classroom',
  capacity: '',
  responsible: '',
  note: '',
  items: []
};

const InventoryManagement = () => {
  const { setLoading } = useData();
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [floorFilter, setFloorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await apiService.getRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) {
      setErrorMessage(e.response?.data?.message || 'Xonalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // ── Hisob-kitoblar ──────────────────────────────────────────────
  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b),
    [rooms]
  );

  const itemsCount = (room) => (room.items || []).reduce((a, i) => a + (i.quantity || 0), 0);

  const totalItems = useMemo(
    () => rooms.reduce((s, r) => s + itemsCount(r), 0),
    [rooms]
  );

  const attentionCount = useMemo(
    () =>
      rooms.reduce(
        (s, r) =>
          s + (r.items || []).filter((i) => i.condition !== 'good').reduce((a, i) => a + (i.quantity || 0), 0),
        0
      ),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rooms.filter((r) => {
      if (floorFilter !== 'all' && String(r.floor) !== String(floorFilter)) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (!q) return true;
      const inItems = (r.items || []).some((i) => (i.name || '').toLowerCase().includes(q));
      return (
        String(r.roomNumber || '').toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.responsible || '').toLowerCase().includes(q) ||
        inItems
      );
    });
  }, [rooms, searchTerm, floorFilter, typeFilter]);

  // ── Forma boshqaruvi ────────────────────────────────────────────
  const openAdd = () => {
    setFormMode('add');
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowFormModal(true);
  };

  const openEdit = (room) => {
    setFormMode('edit');
    setEditingId(room._id);
    setForm({
      floor: room.floor ?? '',
      roomNumber: room.roomNumber || '',
      name: room.name || '',
      type: room.type || 'classroom',
      capacity: room.capacity ?? '',
      responsible: room.responsible || '',
      note: room.note || '',
      items: (room.items || []).map((i) => ({
        name: i.name || '',
        quantity: i.quantity ?? 1,
        condition: i.condition || 'good',
        note: i.note || ''
      }))
    });
    setFormError('');
    setShowFormModal(true);
  };

  const closeForm = () => {
    setShowFormModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const addItem = (name = '') => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { name, quantity: 1, condition: 'good', note: '' }]
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (form.floor === '' || form.floor === null || isNaN(parseInt(form.floor, 10))) {
      setFormError('Qavatni kiriting (masalan: 1)');
      return;
    }
    if (!String(form.roomNumber).trim()) {
      setFormError('Xona raqamini kiriting (masalan: 5)');
      return;
    }

    const cleanedItems = form.items
      .filter((it) => String(it.name).trim())
      .map((it) => ({
        name: String(it.name).trim(),
        quantity: Math.max(0, parseInt(it.quantity, 10) || 0),
        condition: it.condition || 'good',
        note: String(it.note || '').trim()
      }));

    const payload = {
      floor: parseInt(form.floor, 10),
      roomNumber: String(form.roomNumber).trim(),
      name: String(form.name || '').trim(),
      type: form.type,
      capacity: form.capacity === '' || form.capacity === null ? null : parseInt(form.capacity, 10),
      responsible: String(form.responsible || '').trim(),
      note: String(form.note || '').trim(),
      items: cleanedItems
    };

    try {
      setSaving(true);
      if (formMode === 'add') {
        await apiService.createRoom(payload);
        setSuccessMessage('Xona muvaffaqiyatli qo\'shildi');
      } else {
        await apiService.updateRoom(editingId, payload);
        setSuccessMessage('Xona ma\'lumotlari yangilandi');
      }
      closeForm();
      loadRooms();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      setLoading(true);
      await apiService.deleteRoom(roomToDelete._id);
      setSuccessMessage('Xona o\'chirildi');
      setShowDeleteModal(false);
      setRoomToDelete(null);
      loadRooms();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'O\'chirishda xatolik');
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  const roomTitle = (room) => (room.name && room.name.trim() ? room.name : `${room.roomNumber}-xona`);

  return (
    <div className="inv-management">
      {/* Bildirishnomalar */}
      {successMessage && (
        <div className="inv-toast inv-toast-success">
          <span className="inv-toast-icon">✓</span>
          <span className="inv-toast-text">{successMessage}</span>
          <button className="inv-toast-close" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}
      {errorMessage && (
        <div className="inv-toast inv-toast-error">
          <span className="inv-toast-icon">⚠️</span>
          <span className="inv-toast-text">{errorMessage}</span>
          <button className="inv-toast-close" onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Sarlavha */}
      <div className="inv-page-head">
        <div className="inv-page-head-text">
          <h2 className="inv-page-title"><span>🪑</span> Jihozlar va xonalar</h2>
          <p className="inv-page-sub">Maktabdagi barcha jihozlarning qavat va xona bo'yicha joylashuvi</p>
        </div>
        <Can perm="inventory.manage">
          <button className="inv-btn-add" onClick={openAdd}>
            <span>➕</span> Yangi xona
          </button>
        </Can>
      </div>

      {/* Statistika */}
      <div className="inv-stats">
        <div className="inv-stat inv-stat-rooms">
          <div className="inv-stat-icon">🚪</div>
          <div>
            <div className="inv-stat-value">{rooms.length}</div>
            <div className="inv-stat-label">Jami xonalar</div>
          </div>
        </div>
        <div className="inv-stat inv-stat-floors">
          <div className="inv-stat-icon">🏢</div>
          <div>
            <div className="inv-stat-value">{floors.length}</div>
            <div className="inv-stat-label">Qavatlar</div>
          </div>
        </div>
        <div className="inv-stat inv-stat-items">
          <div className="inv-stat-icon">📦</div>
          <div>
            <div className="inv-stat-value">{totalItems.toLocaleString('uz-UZ')}</div>
            <div className="inv-stat-label">Jami jihozlar</div>
          </div>
        </div>
        <div className="inv-stat inv-stat-attention">
          <div className="inv-stat-icon">🛠️</div>
          <div>
            <div className="inv-stat-value">{attentionCount.toLocaleString('uz-UZ')}</div>
            <div className="inv-stat-label">Ta'mir / buzilgan</div>
          </div>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="inv-filters">
        <div className="inv-filter-item inv-filter-search">
          <label>🔍 Qidiruv</label>
          <div className="inv-search-wrap">
            <input
              type="text"
              placeholder="Xona, jihoz nomi, mas'ul..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button className="inv-search-clear" onClick={() => setSearchTerm('')}>✕</button>}
          </div>
        </div>
        <div className="inv-filter-item">
          <label>🏢 Qavat</label>
          <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
            <option value="all">Barchasi</option>
            {floors.map((f) => (
              <option key={f} value={f}>{f}-qavat</option>
            ))}
          </select>
        </div>
        <div className="inv-filter-item">
          <label>🏷️ Tur</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Barchasi</option>
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
        <div className="inv-filter-results">
          <span className="inv-results-count">{filteredRooms.length}</span>
          <span className="inv-results-label">ta xona</span>
        </div>
      </div>

      {/* Xonalar ro'yxati */}
      {filteredRooms.length > 0 ? (
        <div className="inv-grid">
          {filteredRooms.map((room) => {
            const meta = typeMeta(room.type);
            const count = itemsCount(room);
            return (
              <div key={room._id} className="inv-card">
                <div className="inv-card-head">
                  <div className="inv-floor-badge">
                    <span className="inv-floor-num">{room.floor}</span>
                    <span className="inv-floor-txt">qavat</span>
                  </div>
                  <div className="inv-card-titlewrap">
                    <h3 className="inv-card-title">{roomTitle(room)}</h3>
                    <div className="inv-card-meta">
                      <span className="inv-type-badge">{meta.icon} {meta.label}</span>
                      {room.name && room.name.trim() && (
                        <span className="inv-room-no">🚪 {room.roomNumber}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="inv-card-body">
                  {(room.items && room.items.length > 0) ? (
                    <div className="inv-items">
                      {room.items.map((it, idx) => {
                        const cm = condMeta(it.condition);
                        return (
                          <div className="inv-item-chip" key={idx} title={cm.label + (it.note ? ` — ${it.note}` : '')}>
                            <span className="inv-item-dot" style={{ background: cm.color }}></span>
                            <span className="inv-item-name">{it.name}</span>
                            <span className="inv-item-qty">×{it.quantity}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="inv-empty-items">Jihozlar kiritilmagan</div>
                  )}
                </div>

                <div className="inv-card-info">
                  <span>📦 {count} dona</span>
                  {room.capacity ? <span>👥 {room.capacity} o'rin</span> : null}
                  {room.responsible ? <span>👤 {room.responsible}</span> : null}
                </div>

                {room.note ? <div className="inv-card-note">📝 {room.note}</div> : null}

                <div className="inv-card-foot">
                  <Can perm="inventory.manage">
                    <button className="inv-act inv-act-edit" onClick={() => openEdit(room)}>✏️ Tahrirlash</button>
                  </Can>
                  <Can perm="inventory.manage">
                    <button className="inv-act inv-act-del" onClick={() => { setRoomToDelete(room); setShowDeleteModal(true); }}>🗑️ O'chirish</button>
                  </Can>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="inv-empty">
          <span className="inv-empty-icon">🪑</span>
          <h3>Xonalar topilmadi</h3>
          <p>{rooms.length === 0 ? 'Hali birorta xona qo\'shilmagan. "Yangi xona" tugmasi orqali boshlang.' : 'Filtrlarga mos xona yo\'q.'}</p>
        </div>
      )}

      {/* Qo'shish / Tahrirlash modali */}
      {showFormModal && (
        <div className="inv-overlay" onClick={closeForm}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-head">
              <h3>{formMode === 'add' ? '➕ Yangi xona qo\'shish' : '✏️ Xonani tahrirlash'}</h3>
              <button className="inv-modal-x" onClick={closeForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="inv-modal-body">
                {formError && <div className="inv-form-error">⚠️ {formError}</div>}

                <div className="inv-form-grid">
                  <div className="inv-field">
                    <label>Qavat <span className="inv-req">*</span></label>
                    <input type="number" min="0" value={form.floor} onChange={(e) => setField('floor', e.target.value)} placeholder="1" />
                  </div>
                  <div className="inv-field">
                    <label>Xona raqami <span className="inv-req">*</span></label>
                    <input type="text" value={form.roomNumber} onChange={(e) => setField('roomNumber', e.target.value)} placeholder="5" />
                  </div>
                  <div className="inv-field inv-field-wide">
                    <label>Xona nomi (ixtiyoriy)</label>
                    <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Masalan: Fizika xonasi" />
                  </div>
                  <div className="inv-field">
                    <label>Tur</label>
                    <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
                      {ROOM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="inv-field">
                    <label>Sig'imi (o'rin)</label>
                    <input type="number" min="0" value={form.capacity} onChange={(e) => setField('capacity', e.target.value)} placeholder="30" />
                  </div>
                  <div className="inv-field inv-field-wide">
                    <label>Mas'ul shaxs (ixtiyoriy)</label>
                    <input type="text" value={form.responsible} onChange={(e) => setField('responsible', e.target.value)} placeholder="Masalan: Aliyev A." />
                  </div>
                </div>

                {/* Jihozlar muharriri */}
                <div className="inv-items-editor">
                  <div className="inv-items-editor-head">
                    <span>🪑 Jihozlar</span>
                    <button type="button" className="inv-add-item-btn" onClick={() => addItem()}>➕ Qo'shish</button>
                  </div>

                  <div className="inv-presets">
                    {COMMON_ITEMS.map((name) => (
                      <button type="button" key={name} className="inv-preset" onClick={() => addItem(name)}>+ {name}</button>
                    ))}
                  </div>

                  {form.items.length === 0 ? (
                    <div className="inv-items-empty">Jihoz qo'shish uchun yuqoridagi tugmalardan foydalaning.</div>
                  ) : (
                    <div className="inv-item-rows">
                      <div className="inv-item-row inv-item-row-head">
                        <span>Nomi</span>
                        <span>Soni</span>
                        <span>Holati</span>
                        <span></span>
                      </div>
                      {form.items.map((it, idx) => (
                        <div className="inv-item-row" key={idx}>
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            placeholder="Jihoz nomi"
                          />
                          <input
                            type="number"
                            min="0"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          />
                          <select value={it.condition} onChange={(e) => updateItem(idx, 'condition', e.target.value)}>
                            {CONDITIONS.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          <button type="button" className="inv-item-del" onClick={() => removeItem(idx)} title="O'chirish">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="inv-field">
                  <label>Izoh (ixtiyoriy)</label>
                  <textarea rows="2" value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="Qo'shimcha ma'lumot..."></textarea>
                </div>
              </div>

              <div className="inv-modal-foot">
                <button type="button" className="inv-btn-cancel" onClick={closeForm}>Bekor qilish</button>
                <button type="submit" className="inv-btn-save" disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : (formMode === 'add' ? 'Qo\'shish' : 'Saqlash')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* O'chirish modali */}
      {showDeleteModal && roomToDelete && (
        <div className="inv-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="inv-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inv-delete-head">
              <span className="inv-delete-icon">⚠️</span>
              <h3>Xonani o'chirish</h3>
            </div>
            <div className="inv-delete-body">
              <p>
                <strong>{roomToDelete.floor}-qavat, {roomTitle(roomToDelete)}</strong> xonasini va undagi barcha
                jihozlar ro'yxatini o'chirmoqchimisiz?
              </p>
              <p className="inv-delete-warn">Bu amalni qaytarib bo'lmaydi!</p>
            </div>
            <div className="inv-delete-foot">
              <button className="inv-btn-cancel" onClick={() => setShowDeleteModal(false)}>Bekor qilish</button>
              <button className="inv-btn-del" onClick={confirmDelete}>🗑️ Ha, o'chirish</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inv-management { padding: 1rem; max-width: 1400px; margin: 0 auto; }

        /* Toast */
        .inv-toast {
          position: fixed; top: 100px; right: 1.5rem; z-index: 2000;
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.85rem 1.1rem; border-radius: 12px; color: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18); min-width: 280px; max-width: 460px;
          animation: invSlideIn 0.3s ease-out;
        }
        .inv-toast-success { background: linear-gradient(135deg, #10b981, #059669); }
        .inv-toast-error { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .inv-toast-icon { font-size: 1.15rem; }
        .inv-toast-text { flex: 1; font-size: 0.875rem; font-weight: 600; }
        .inv-toast-close { background: rgba(255,255,255,0.25); border: none; color: #fff; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; }
        @keyframes invSlideIn { from { opacity: 0; transform: translateX(60px);} to { opacity:1; transform: translateX(0);} }

        /* Page head */
        .inv-page-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .inv-page-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
        .inv-page-sub { font-size: 0.8125rem; color: #64748b; margin: 0.25rem 0 0; }
        .inv-btn-add {
          display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #fff; border: none;
          border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          white-space: nowrap;
        }
        .inv-btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30,58,138,0.3); }

        /* Stats */
        .inv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.625rem; margin-bottom: 1rem; }
        .inv-stat { background: #fff; padding: 0.75rem 0.9rem; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.65rem; }
        .inv-stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
        .inv-stat-rooms .inv-stat-icon { background: #dbeafe; }
        .inv-stat-floors .inv-stat-icon { background: #e0e7ff; }
        .inv-stat-items .inv-stat-icon { background: #d1fae5; }
        .inv-stat-attention .inv-stat-icon { background: #fef3c7; }
        .inv-stat-value { font-size: 1.4rem; font-weight: 700; color: #1e293b; line-height: 1; }
        .inv-stat-label { font-size: 0.6875rem; color: #64748b; font-weight: 500; margin-top: 0.2rem; }

        /* Filters */
        .inv-filters { background: #fff; padding: 0.75rem; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1rem; }
        .inv-filter-item { display: flex; flex-direction: column; gap: 0.25rem; }
        .inv-filter-item label { font-size: 0.6875rem; font-weight: 600; color: #475569; }
        .inv-filter-search { flex: 1; min-width: 180px; }
        .inv-search-wrap { position: relative; }
        .inv-filters input, .inv-filters select { padding: 0.5rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8125rem; background: #fff; width: 100%; }
        .inv-filters input:focus, .inv-filters select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.12); }
        .inv-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: #ef4444; color: #fff; border: none; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; font-size: 0.6rem; }
        .inv-filter-results { display: flex; flex-direction: column; align-items: center; padding: 0.4rem 0.7rem; background: #dbeafe; border-radius: 6px; }
        .inv-results-count { font-size: 1.1rem; font-weight: 700; color: #1e40af; line-height: 1; }
        .inv-results-label { font-size: 0.55rem; color: #3b82f6; font-weight: 500; }

        /* Grid */
        .inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.85rem; }
        .inv-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s ease; border: 1px solid #eef2f7; }
        .inv-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.1); }

        .inv-card-head { display: flex; gap: 0.75rem; padding: 0.85rem; background: linear-gradient(135deg, #f8fafc, #eff6ff); border-bottom: 1px solid #eef2f7; align-items: center; }
        .inv-floor-badge { width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
        .inv-floor-num { font-size: 1.25rem; font-weight: 800; line-height: 1; }
        .inv-floor-txt { font-size: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.9; }
        .inv-card-titlewrap { flex: 1; min-width: 0; }
        .inv-card-title { font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0 0 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .inv-card-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
        .inv-type-badge { font-size: 0.625rem; font-weight: 600; padding: 0.15rem 0.45rem; background: #e0e7ff; color: #3730a3; border-radius: 20px; }
        .inv-room-no { font-size: 0.625rem; color: #64748b; font-weight: 600; }

        .inv-card-body { padding: 0.75rem 0.85rem; flex: 1; }
        .inv-items { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .inv-item-chip { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.55rem; background: #f1f5f9; border-radius: 20px; font-size: 0.6875rem; border: 1px solid #e2e8f0; }
        .inv-item-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .inv-item-name { color: #334155; font-weight: 500; }
        .inv-item-qty { color: #1e40af; font-weight: 700; }
        .inv-empty-items { font-size: 0.75rem; color: #94a3b8; font-style: italic; padding: 0.5rem 0; }

        .inv-card-info { display: flex; flex-wrap: wrap; gap: 0.6rem; padding: 0 0.85rem 0.6rem; font-size: 0.6875rem; color: #64748b; font-weight: 500; }
        .inv-card-note { margin: 0 0.85rem 0.6rem; padding: 0.4rem 0.6rem; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 0.6875rem; color: #92400e; }

        .inv-card-foot { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; padding: 0.6rem 0.85rem; background: #f8fafc; border-top: 1px solid #eef2f7; }
        .inv-act { padding: 0.45rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.6875rem; font-weight: 600; transition: all 0.15s ease; }
        .inv-act-edit { background: #fef3c7; color: #92400e; }
        .inv-act-edit:hover { background: #f59e0b; color: #fff; }
        .inv-act-del { background: #fee2e2; color: #991b1b; }
        .inv-act-del:hover { background: #ef4444; color: #fff; }

        /* Empty state */
        .inv-empty { background: #fff; border-radius: 12px; padding: 3rem 1rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .inv-empty-icon { font-size: 3rem; display: block; margin-bottom: 0.75rem; }
        .inv-empty h3 { font-size: 1.05rem; color: #1e293b; margin: 0 0 0.4rem; }
        .inv-empty p { font-size: 0.8125rem; color: #64748b; margin: 0; }

        /* Overlay + modal */
        .inv-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: flex; align-items: center; justify-content: center; z-index: 1500; backdrop-filter: blur(3px); padding: 1rem; }
        .inv-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 640px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: invModalIn 0.25s ease-out; }
        @keyframes invModalIn { from { opacity: 0; transform: translateY(20px) scale(0.98);} to { opacity:1; transform: translateY(0) scale(1);} }
        .inv-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #eef2f7; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border-radius: 14px 14px 0 0; }
        .inv-modal-head h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; }
        .inv-modal-x { background: rgba(255,255,255,0.2); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; }
        .inv-modal-body { padding: 1.25rem; overflow-y: auto; }
        .inv-modal-foot { display: flex; justify-content: flex-end; gap: 0.6rem; padding: 0.9rem 1.25rem; border-top: 1px solid #eef2f7; background: #f8fafc; border-radius: 0 0 14px 14px; }

        .inv-form-error { background: #fee2e2; color: #991b1b; padding: 0.6rem 0.85rem; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; margin-bottom: 1rem; }

        .inv-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
        .inv-field { display: flex; flex-direction: column; gap: 0.3rem; }
        .inv-field-wide { grid-column: span 2; }
        .inv-field label { font-size: 0.75rem; font-weight: 600; color: #475569; }
        .inv-req { color: #ef4444; }
        .inv-field input, .inv-field select, .inv-field textarea { padding: 0.55rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 7px; font-size: 0.8125rem; font-family: inherit; background: #fff; }
        .inv-field input:focus, .inv-field select:focus, .inv-field textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.12); }
        .inv-field textarea { resize: vertical; }

        /* Items editor */
        .inv-items-editor { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 0.85rem; margin-bottom: 1rem; background: #f8fafc; }
        .inv-items-editor-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; font-size: 0.85rem; font-weight: 700; color: #1e293b; }
        .inv-add-item-btn { background: #1e3a8a; color: #fff; border: none; padding: 0.35rem 0.7rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; }
        .inv-add-item-btn:hover { background: #3b82f6; }
        .inv-presets { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.7rem; }
        .inv-preset { background: #fff; border: 1px solid #cbd5e1; color: #475569; padding: 0.25rem 0.55rem; border-radius: 20px; font-size: 0.6875rem; cursor: pointer; transition: all 0.15s ease; }
        .inv-preset:hover { background: #dbeafe; border-color: #3b82f6; color: #1e40af; }
        .inv-items-empty { font-size: 0.75rem; color: #94a3b8; text-align: center; padding: 0.5rem; }

        .inv-item-rows { display: flex; flex-direction: column; gap: 0.4rem; }
        .inv-item-row { display: grid; grid-template-columns: 1fr 70px 120px 32px; gap: 0.4rem; align-items: center; }
        .inv-item-row-head { font-size: 0.625rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }
        .inv-item-row input, .inv-item-row select { padding: 0.45rem 0.55rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.75rem; background: #fff; width: 100%; }
        .inv-item-row input:focus, .inv-item-row select:focus { outline: none; border-color: #3b82f6; }
        .inv-item-del { background: #fee2e2; color: #991b1b; border: none; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
        .inv-item-del:hover { background: #ef4444; color: #fff; }

        .inv-btn-cancel { padding: 0.55rem 1rem; border: 1px solid #e2e8f0; background: #fff; color: #64748b; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
        .inv-btn-cancel:hover { background: #f1f5f9; }
        .inv-btn-save { padding: 0.55rem 1.25rem; border: none; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #fff; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
        .inv-btn-save:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(30,58,138,0.3); }
        .inv-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Delete modal */
        .inv-delete-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; animation: invModalIn 0.25s ease-out; }
        .inv-delete-head { text-align: center; padding: 1.25rem 1rem 0.75rem; background: linear-gradient(135deg, #fee2e2, #fecaca); }
        .inv-delete-icon { font-size: 2.25rem; display: block; margin-bottom: 0.4rem; }
        .inv-delete-head h3 { margin: 0; font-size: 1.05rem; color: #991b1b; }
        .inv-delete-body { padding: 1.1rem 1.25rem; }
        .inv-delete-body p { font-size: 0.8125rem; color: #475569; margin: 0 0 0.5rem; line-height: 1.5; }
        .inv-delete-warn { color: #dc2626 !important; font-weight: 700; }
        .inv-delete-foot { display: flex; gap: 0.6rem; padding: 0.9rem 1.25rem; background: #f8fafc; border-top: 1px solid #eef2f7; }
        .inv-delete-foot button { flex: 1; }
        .inv-btn-del { padding: 0.55rem 1rem; border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
        .inv-btn-del:hover { box-shadow: 0 4px 12px rgba(239,68,68,0.35); }

        /* Responsive */
        @media (max-width: 768px) {
          .inv-stats { grid-template-columns: repeat(2, 1fr); }
          .inv-grid { grid-template-columns: 1fr; }
          .inv-filter-results { display: none; }
        }
        @media (max-width: 480px) {
          .inv-management { padding: 0.5rem; }
          .inv-form-grid { grid-template-columns: 1fr; }
          .inv-field-wide { grid-column: span 1; }
          .inv-item-row { grid-template-columns: 1fr 56px 100px 28px; gap: 0.3rem; }
          .inv-toast { right: 0.5rem; left: 0.5rem; min-width: auto; top: 72px; }
          .inv-page-head { gap: 0.6rem; }
          .inv-btn-add { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default InventoryManagement;
