import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiService from '../../services/apiService';
import './ParentContacts.css';

// Sinf yorlig'i - sinf darajasi ixtiyoriy bo'lgani uchun bo'lmasa nom/bo'limga qaytamiz
const classLabel = (c) => {
  if (!c) return '';
  if (c.grade !== null && c.grade !== undefined && c.grade !== '') {
    return `${c.grade}-${c.section}`;
  }
  return c.name || c.section || '';
};

// ─── Konstanta ko'rsatkichlari ───────────────────────────────────────────────
const STATUS_META = {
  contacted:   { label: "Gaplashildi",       color: '#059669', soft: '#d1fae5', icon: '✅' },
  attempted:   { label: "Urinish bo'ldi",    color: '#d97706', soft: '#fef3c7', icon: '📞' },
  not_reached: { label: "Yetib bormadi",     color: '#dc2626', soft: '#fee2e2', icon: '⛔' },
  refused:     { label: "Rad etdi",          color: '#7c2d12', soft: '#fed7aa', icon: '🚫' },
  pending:     { label: "Hali qilinmagan",   color: '#475569', soft: '#e2e8f0', icon: '⏳' }
};

const CHANNEL_LABELS = {
  call:     "Qo'ng'iroq",
  visit:    'Tashrif',
  sms:      'SMS',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  meeting:  'Yig\'ilish',
  other:    'Boshqa'
};

const TOPIC_LABELS = {
  progress:     "O'zlashtirish",
  attendance:   'Davomat',
  behavior:     'Xulq',
  payment:      "To'lov",
  health:       'Sog\'liq',
  announcement: 'E\'lon / yangilik',
  complaint:    'Shikoyat',
  praise:       'Maqtov',
  general:      'Umumiy'
};

const SENTIMENT_META = {
  positive: { label: 'Ijobiy',    color: '#059669', icon: '😊' },
  neutral:  { label: 'Neytral',   color: '#475569', icon: '😐' },
  negative: { label: 'Salbiy',    color: '#dc2626', icon: '😟' }
};

const formatMonthLabel = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const names = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  return `${names[Number(mo) - 1]} ${y}`;
};

const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthOptions = (count = 12) => {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
};

const formatDateUz = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Komponent ─────────────────────────────────────────────────────────────
const ParentContacts = () => {
  const [month, setMonth] = useState(currentMonthStr());
  const [stats, setStats] = useState(null);
  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [modalStudent, setModalStudent] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // ─── Toast helper ───
  const flashToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Data fetching ───
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, c] = await Promise.all([
        apiService.getParentContactStats(month),
        apiService.getParentContactMonthlyCoverage(6)
      ]);
      setStats(s);
      setCoverage(c.series || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Computed lists ───
  const filteredStudents = useMemo(() => {
    if (!stats?.students) return [];
    let rows = stats.students;
    if (filterStatus !== 'all') rows = rows.filter((s) => s.latestStatus === filterStatus);
    if (filterClass !== 'all') {
      rows = rows.filter((s) => (s.classId?._id || 'no_class') === filterClass);
    }
    const q = searchText.trim().toLowerCase();
    if (q) {
      rows = rows.filter((s) => {
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        const sid = (s.studentId || '').toLowerCase();
        const parent = (s.parentName || '').toLowerCase();
        return fullName.includes(q) || sid.includes(q) || parent.includes(q);
      });
    }
    return rows;
  }, [stats, filterStatus, filterClass, searchText]);

  // ─── Modal: contact form ───
  const openCreateModal = (student = null, existingContact = null) => {
    setModalStudent(student);
    setEditingContact(existingContact);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalStudent(null);
    setEditingContact(null);
  };

  const handleSave = async (formValues) => {
    setSaving(true);
    try {
      if (editingContact) {
        await apiService.updateParentContact(editingContact._id, formValues);
        flashToast("Yozuv yangilandi");
      } else {
        await apiService.createParentContact(formValues);
        flashToast("Yangi aloqa yozuvi qo'shildi");
      }
      closeModal();
      await fetchStats();
    } catch (err) {
      flashToast(err?.response?.data?.message || 'Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── History panel ───
  const openHistory = async (student) => {
    setHistoryStudent(student);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await apiService.getParentContactsForStudent(student._id);
      setHistoryData(data.contacts || []);
    } catch (err) {
      setHistoryData([]);
      flashToast(err?.response?.data?.message || 'Tarixni yuklab bo\'lmadi', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryStudent(null);
    setHistoryData([]);
  };

  // ─── Delete ───
  const requestDelete = (contact) => setConfirmDelete(contact);
  const performDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiService.deleteParentContact(confirmDelete._id);
      flashToast('Yozuv o\'chirildi');
      if (historyOpen && historyStudent) {
        openHistory(historyStudent);
      }
      await fetchStats();
    } catch (err) {
      flashToast(err?.response?.data?.message || 'O\'chirishda xatolik', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  // ─── Render ───
  const totals = stats?.totals || {
    totalStudents: 0, contacted: 0, attempted: 0, notReached: 0,
    refused: 0, pending: 0, coveragePercent: 0, positiveSentiment: 0, negativeSentiment: 0
  };

  return (
    <div className="pc-page">
      {/* ── Hero ── */}
      <div className="pc-hero">
        <div className="pc-hero-left">
          <div className="pc-hero-icon">👨‍👩‍👧‍👦</div>
          <div>
            <h1 className="pc-hero-title">Ota-onalar bilan aloqa</h1>
            <p className="pc-hero-subtitle">
              Har oyda har bir o'quvchi ota-onasi bilan suhbat hisoboti.
              Maktabning aloqaviy javobgarligini kuzatib boring.
            </p>
          </div>
        </div>
        <div className="pc-hero-right">
          <div className="pc-month-picker">
            <label>Hisobot oyi</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions(12).map((m) => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>
          <button className="pc-btn-primary" onClick={() => openCreateModal()}>
            <span>＋</span> Yangi aloqa
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`pc-toast pc-toast-${toast.kind}`}>
          <span>{toast.kind === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}

      {error && (
        <div className="pc-error">⚠️ {error}</div>
      )}

      {loading ? (
        <div className="pc-loading">
          <div className="pc-spinner" />
          <span>Hisobot tayyorlanmoqda…</span>
        </div>
      ) : (
        <>
          {/* ── KPI cards ── */}
          <div className="pc-kpi-grid">
            <KpiCard
              icon="👥"
              label="Jami o'quvchilar"
              value={totals.totalStudents}
              accent="#1e3a8a"
            />
            <KpiCard
              icon="✅"
              label="Gaplashildi"
              value={totals.contacted}
              accent="#059669"
              suffix={`${totals.coveragePercent}%`}
            />
            <KpiCard
              icon="📞"
              label="Urinish"
              value={totals.attempted}
              accent="#d97706"
            />
            <KpiCard
              icon="⛔"
              label="Yetib bormadi"
              value={totals.notReached + totals.refused}
              accent="#dc2626"
            />
            <KpiCard
              icon="⏳"
              label="Hali qilinmagan"
              value={totals.pending}
              accent="#475569"
              highlight={totals.pending > 0}
            />
            <KpiCard
              icon="😊"
              label="Ijobiy / Salbiy"
              value={`${totals.positiveSentiment} / ${totals.negativeSentiment}`}
              accent="#0e7490"
            />
          </div>

          {/* ── Coverage gauge ── */}
          <div className="pc-coverage-card">
            <div className="pc-coverage-head">
              <div>
                <h3>{formatMonthLabel(month)} oyi qamrovi</h3>
                <p>Faol o'quvchilarning necha foizi bilan gaplashilgan</p>
              </div>
              <div className="pc-coverage-value">
                <span className="pc-coverage-percent">{totals.coveragePercent}%</span>
                <span className="pc-coverage-fraction">{totals.contacted} / {totals.totalStudents}</span>
              </div>
            </div>
            <div className="pc-progress">
              <div className="pc-progress-segment" style={{ width: `${totals.totalStudents ? (totals.contacted / totals.totalStudents) * 100 : 0}%`, background: '#10b981' }} />
              <div className="pc-progress-segment" style={{ width: `${totals.totalStudents ? (totals.attempted / totals.totalStudents) * 100 : 0}%`, background: '#f59e0b' }} />
              <div className="pc-progress-segment" style={{ width: `${totals.totalStudents ? ((totals.notReached + totals.refused) / totals.totalStudents) * 100 : 0}%`, background: '#ef4444' }} />
            </div>
            <div className="pc-progress-legend">
              <span><i style={{ background: '#10b981' }} /> Gaplashildi</span>
              <span><i style={{ background: '#f59e0b' }} /> Urinish</span>
              <span><i style={{ background: '#ef4444' }} /> Yetib bormadi</span>
              <span><i style={{ background: '#e2e8f0' }} /> Hali qilinmagan</span>
            </div>
          </div>

          {/* ── Last 6 months trend ── */}
          {coverage.length > 0 && (
            <div className="pc-trend-card">
              <h3>So'nggi {coverage.length} oy qamrovi</h3>
              <div className="pc-trend-bars">
                {coverage.map((point) => (
                  <div key={point.month} className={`pc-trend-bar ${point.month === month ? 'is-current' : ''}`}>
                    <div className="pc-trend-bar-wrap">
                      <div
                        className="pc-trend-bar-fill"
                        style={{ height: `${Math.max(4, point.coveragePercent)}%` }}
                        title={`${point.contacted}/${point.totalActive} = ${point.coveragePercent}%`}
                      >
                        <span>{point.coveragePercent}%</span>
                      </div>
                    </div>
                    <div className="pc-trend-label">{formatMonthLabel(point.month).split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Class coverage table ── */}
          <div className="pc-card">
            <div className="pc-card-head">
              <h3>Sinflar bo'yicha qamrov — {formatMonthLabel(month)}</h3>
              <span className="pc-card-subtitle">Har bir sinf qancha ota-ona bilan gaplashilganini ko'rsatadi</span>
            </div>
            {stats?.classes?.length ? (
              <div className="pc-class-grid">
                {stats.classes.map((cls) => (
                  <div key={cls.classId || cls.className} className="pc-class-tile">
                    <div className="pc-class-tile-head">
                      <span className="pc-class-name">{cls.className}</span>
                      <span className={`pc-class-percent ${cls.coveragePercent >= 80 ? 'good' : cls.coveragePercent >= 50 ? 'mid' : 'bad'}`}>
                        {cls.coveragePercent}%
                      </span>
                    </div>
                    <div className="pc-class-progress">
                      <div className="pc-class-progress-fill" style={{ width: `${cls.coveragePercent}%` }} />
                    </div>
                    <div className="pc-class-meta">
                      <span>✅ {cls.contacted}</span>
                      <span>📞 {cls.attempted}</span>
                      <span>⛔ {cls.notReached + cls.refused}</span>
                      <span>⏳ {cls.pending}</span>
                      <span className="pc-class-total">/ {cls.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pc-empty">Sinflar topilmadi</div>
            )}
          </div>

          {/* ── Topic & channel breakdown ── */}
          {stats && (Object.keys(stats.byTopic || {}).length > 0 || Object.keys(stats.byChannel || {}).length > 0) && (
            <div className="pc-grid-two">
              <div className="pc-card">
                <div className="pc-card-head">
                  <h3>Mavzular taqsimoti</h3>
                  <span className="pc-card-subtitle">Suhbatlarda eng ko'p ko'tarilgan mavzular</span>
                </div>
                <ul className="pc-list">
                  {Object.entries(stats.byTopic || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, count]) => (
                      <li key={key}>
                        <span>{TOPIC_LABELS[key] || key}</span>
                        <strong>{count}</strong>
                      </li>
                    ))}
                  {Object.keys(stats.byTopic || {}).length === 0 && (
                    <li className="pc-list-empty">Hali ma'lumot yo'q</li>
                  )}
                </ul>
              </div>
              <div className="pc-card">
                <div className="pc-card-head">
                  <h3>Aloqa kanali</h3>
                  <span className="pc-card-subtitle">Kanal bo'yicha aloqalar</span>
                </div>
                <ul className="pc-list">
                  {Object.entries(stats.byChannel || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, count]) => (
                      <li key={key}>
                        <span>{CHANNEL_LABELS[key] || key}</span>
                        <strong>{count}</strong>
                      </li>
                    ))}
                  {Object.keys(stats.byChannel || {}).length === 0 && (
                    <li className="pc-list-empty">Hali ma'lumot yo'q</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* ── Filters + student rows ── */}
          <div className="pc-card">
            <div className="pc-card-head pc-students-head">
              <div>
                <h3>O'quvchilar ro'yxati — {formatMonthLabel(month)}</h3>
                <span className="pc-card-subtitle">{filteredStudents.length} ta yozuv ko'rsatilmoqda</span>
              </div>
              <div className="pc-filters">
                <div className="pc-search">
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Ism, ID yoki ota-ona ismi bo'yicha qidirish…"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">Barcha holatlar</option>
                  <option value="contacted">Gaplashildi</option>
                  <option value="attempted">Urinish</option>
                  <option value="not_reached">Yetib bormadi</option>
                  <option value="refused">Rad etdi</option>
                  <option value="pending">Hali qilinmagan</option>
                </select>
                <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                  <option value="all">Barcha sinflar</option>
                  {stats?.classes?.map((c) => (
                    <option key={c.classId || c.className} value={c.classId || 'no_class'}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pc-table-wrap">
              <table className="pc-table">
                <thead>
                  <tr>
                    <th>O'quvchi</th>
                    <th>Sinf</th>
                    <th>Ota-ona</th>
                    <th>Holat</th>
                    <th>Aloqa kanali</th>
                    <th>Mavzu</th>
                    <th>Sana</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan="8" className="pc-table-empty">O'quvchilar topilmadi</td></tr>
                  ) : filteredStudents.map((s) => {
                    const meta = STATUS_META[s.latestStatus];
                    const initials = `${(s.firstName || '?').charAt(0)}${(s.lastName || '').charAt(0)}`.toUpperCase();
                    return (
                      <tr key={s._id}>
                        <td>
                          <div className="pc-student-cell">
                            <div className="pc-avatar">{initials}</div>
                            <div>
                              <div className="pc-student-name">{s.firstName} {s.lastName}</div>
                              <div className="pc-student-sub">{s.studentId || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="pc-cls-badge">{s.classId ? classLabel(s.classId) : '—'}</span>
                        </td>
                        <td>
                          <div className="pc-parent-cell">
                            <div>{s.parentName || <span className="pc-muted">ko'rsatilmagan</span>}</div>
                            <div className="pc-muted small">{s.parentPhone || s.phone || '—'}</div>
                          </div>
                        </td>
                        <td>
                          <span className="pc-status-badge" style={{ color: meta.color, background: meta.soft }}>
                            <span>{meta.icon}</span> {meta.label}
                          </span>
                        </td>
                        <td>{s.latestContact ? (CHANNEL_LABELS[s.latestContact.channel] || s.latestContact.channel) : '—'}</td>
                        <td>{s.latestContact ? (TOPIC_LABELS[s.latestContact.topic] || s.latestContact.topic) : '—'}</td>
                        <td>{s.latestContact ? formatDateUz(s.latestContact.contactDate) : <span className="pc-muted">—</span>}</td>
                        <td>
                          <div className="pc-row-actions">
                            <button
                              className="pc-row-btn primary"
                              onClick={() => openCreateModal(s, s.latestContact && s.latestContact.reportMonth === month ? s.latestContact : null)}
                              title={s.latestContact && s.latestContact.reportMonth === month ? 'Yozuvni tahrirlash' : 'Yangi yozuv qo\'shish'}
                            >
                              {s.latestContact && s.latestContact.reportMonth === month ? '✎' : '＋'}
                            </button>
                            <button
                              className="pc-row-btn"
                              onClick={() => openHistory(s)}
                              title="Aloqa tarixini ko'rish"
                            >
                              📜
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Contact form ── */}
      {modalOpen && (
        <ContactFormModal
          student={modalStudent}
          editingContact={editingContact}
          month={month}
          allStudents={stats?.students || []}
          onClose={closeModal}
          onSubmit={handleSave}
          saving={saving}
        />
      )}

      {/* ── History panel ── */}
      {historyOpen && historyStudent && (
        <HistoryPanel
          student={historyStudent}
          contacts={historyData}
          loading={historyLoading}
          onClose={closeHistory}
          onEdit={(contact) => { closeHistory(); openCreateModal(historyStudent, contact); }}
          onDelete={requestDelete}
        />
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div className="pc-modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="pc-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="pc-confirm-icon">🗑</div>
            <h3>Yozuvni o'chirilsinmi?</h3>
            <p>
              {formatMonthLabel(confirmDelete.reportMonth)} oyi uchun aloqa yozuvi bekor qaytmaydigan ravishda o'chiriladi.
            </p>
            <div className="pc-confirm-actions">
              <button className="pc-btn-ghost" onClick={() => setConfirmDelete(null)}>Bekor qilish</button>
              <button className="pc-btn-danger" onClick={performDelete}>O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── KPI Card ───────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, accent, suffix, highlight }) => (
  <div className={`pc-kpi ${highlight ? 'pc-kpi-warn' : ''}`} style={{ borderLeft: `4px solid ${accent}` }}>
    <div className="pc-kpi-icon" style={{ background: `${accent}1a`, color: accent }}>{icon}</div>
    <div className="pc-kpi-body">
      <div className="pc-kpi-label">{label}</div>
      <div className="pc-kpi-row">
        <span className="pc-kpi-value">{value}</span>
        {suffix && <span className="pc-kpi-suffix" style={{ color: accent }}>{suffix}</span>}
      </div>
    </div>
  </div>
);

// ─── Contact form modal ────────────────────────────────────────────────────
const ContactFormModal = ({ student, editingContact, month, allStudents, onClose, onSubmit, saving }) => {
  const isEditing = !!editingContact;
  const [form, setForm] = useState({
    student: student?._id || editingContact?.student?._id || '',
    reportMonth: editingContact?.reportMonth || month,
    status: editingContact?.status || 'contacted',
    channel: editingContact?.channel || 'call',
    topic: editingContact?.topic || 'general',
    sentiment: editingContact?.sentiment || 'neutral',
    parentName: editingContact?.parentName || student?.parentName || '',
    parentPhone: editingContact?.parentPhone || student?.parentPhone || student?.phone || '',
    contactDate: editingContact?.contactDate
      ? new Date(editingContact.contactDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    durationMinutes: editingContact?.durationMinutes ?? '',
    summary: editingContact?.summary || '',
    followUpRequired: editingContact?.followUpRequired || false,
    followUpDate: editingContact?.followUpDate ? new Date(editingContact.followUpDate).toISOString().slice(0, 10) : '',
    followUpNotes: editingContact?.followUpNotes || ''
  });
  const [formError, setFormError] = useState('');

  const studentOptions = useMemo(() => {
    return [...allStudents].sort((a, b) =>
      (a.firstName || '').localeCompare(b.firstName || '')
    );
  }, [allStudents]);

  const handle = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.student) { setFormError("O'quvchi tanlanmagan"); return; }
    if (!form.reportMonth) { setFormError('Hisobot oyi kerak'); return; }
    const payload = {
      ...form,
      durationMinutes: form.durationMinutes === '' ? null : Number(form.durationMinutes),
      followUpDate: form.followUpRequired ? form.followUpDate || null : null
    };
    onSubmit(payload);
  };

  const selectedStudent = student || studentOptions.find((s) => s._id === form.student);

  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal pc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-head">
          <div>
            <div className="pc-modal-eyebrow">{isEditing ? 'Tahrirlash' : 'Yangi aloqa yozuvi'}</div>
            <h2>
              {selectedStudent
                ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                : 'Aloqa yozuvi'}
            </h2>
            {selectedStudent && (
              <div className="pc-modal-sub">
                <span>{selectedStudent.studentId || '—'}</span>
                <span>•</span>
                <span>{selectedStudent.classId ? classLabel(selectedStudent.classId) : 'Sinfsiz'}</span>
              </div>
            )}
          </div>
          <button className="pc-modal-close" onClick={onClose}>✕</button>
        </div>

        {formError && <div className="pc-form-error">{formError}</div>}

        <form className="pc-form" onSubmit={submit}>
          {!student && !isEditing && (
            <div className="pc-form-row">
              <label className="pc-form-field" style={{ gridColumn: '1 / -1' }}>
                <span>O'quvchi</span>
                <select value={form.student} onChange={(e) => handle('student', e.target.value)} required>
                  <option value="">— tanlang —</option>
                  {studentOptions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.firstName} {s.lastName} {s.studentId ? `(${s.studentId})` : ''} {s.classId ? `— ${classLabel(s.classId)}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="pc-form-row">
            <label className="pc-form-field">
              <span>Hisobot oyi</span>
              <select value={form.reportMonth} onChange={(e) => handle('reportMonth', e.target.value)}>
                {monthOptions(12).map((m) => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
            </label>
            <label className="pc-form-field">
              <span>Aloqa sanasi</span>
              <input type="date" value={form.contactDate} onChange={(e) => handle('contactDate', e.target.value)} />
            </label>
          </div>

          <div className="pc-status-grid">
            {Object.entries(STATUS_META).filter(([k]) => k !== 'pending').map(([key, m]) => (
              <button
                key={key}
                type="button"
                className={`pc-status-tile ${form.status === key ? 'is-selected' : ''}`}
                onClick={() => handle('status', key)}
                style={form.status === key ? { borderColor: m.color, background: m.soft, color: m.color } : {}}
              >
                <span>{m.icon}</span>
                <strong>{m.label}</strong>
              </button>
            ))}
          </div>

          <div className="pc-form-row">
            <label className="pc-form-field">
              <span>Aloqa kanali</span>
              <select value={form.channel} onChange={(e) => handle('channel', e.target.value)}>
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="pc-form-field">
              <span>Asosiy mavzu</span>
              <select value={form.topic} onChange={(e) => handle('topic', e.target.value)}>
                {Object.entries(TOPIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="pc-form-field">
              <span>Suhbat davomiyligi (min)</span>
              <input
                type="number"
                min="0"
                max="480"
                value={form.durationMinutes}
                onChange={(e) => handle('durationMinutes', e.target.value)}
                placeholder="ixtiyoriy"
              />
            </label>
          </div>

          <div className="pc-form-row">
            <label className="pc-form-field">
              <span>Ota-ona ismi</span>
              <input type="text" value={form.parentName} onChange={(e) => handle('parentName', e.target.value)} />
            </label>
            <label className="pc-form-field">
              <span>Ota-ona telefoni</span>
              <input type="text" value={form.parentPhone} onChange={(e) => handle('parentPhone', e.target.value)} placeholder="+998..." />
            </label>
          </div>

          <div className="pc-sentiment-row">
            <span className="pc-form-field-label">Ota-ona reaktsiyasi</span>
            <div className="pc-sentiment-buttons">
              {Object.entries(SENTIMENT_META).map(([key, m]) => (
                <button
                  key={key}
                  type="button"
                  className={`pc-sentiment-btn ${form.sentiment === key ? 'is-selected' : ''}`}
                  onClick={() => handle('sentiment', key)}
                  style={form.sentiment === key ? { borderColor: m.color, color: m.color, background: `${m.color}15` } : {}}
                >
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          <label className="pc-form-field">
            <span>Suhbat mazmuni / xulosa</span>
            <textarea
              rows={4}
              value={form.summary}
              onChange={(e) => handle('summary', e.target.value)}
              placeholder="Suhbatda nima muhokama qilindi? Qaror nima bo'ldi?"
              maxLength={2000}
            />
            <div className="pc-form-hint">{form.summary.length} / 2000 belgi</div>
          </label>

          <label className="pc-checkbox">
            <input
              type="checkbox"
              checked={form.followUpRequired}
              onChange={(e) => handle('followUpRequired', e.target.checked)}
            />
            <span>Keyingi aloqa kerak (follow-up)</span>
          </label>

          {form.followUpRequired && (
            <div className="pc-form-row">
              <label className="pc-form-field">
                <span>Keyingi aloqa sanasi</span>
                <input type="date" value={form.followUpDate} onChange={(e) => handle('followUpDate', e.target.value)} />
              </label>
              <label className="pc-form-field" style={{ gridColumn: 'span 2' }}>
                <span>Izoh</span>
                <input type="text" value={form.followUpNotes} onChange={(e) => handle('followUpNotes', e.target.value)} />
              </label>
            </div>
          )}

          <div className="pc-modal-actions">
            <button type="button" className="pc-btn-ghost" onClick={onClose}>Bekor qilish</button>
            <button type="submit" className="pc-btn-primary" disabled={saving}>
              {saving ? 'Saqlanmoqda…' : isEditing ? 'Yangilash' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── History panel ─────────────────────────────────────────────────────────
const HistoryPanel = ({ student, contacts, loading, onClose, onEdit, onDelete }) => {
  return (
    <div className="pc-modal-backdrop" onClick={onClose}>
      <div className="pc-modal pc-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="pc-modal-head">
          <div>
            <div className="pc-modal-eyebrow">Aloqa tarixi</div>
            <h2>{student.firstName} {student.lastName}</h2>
            <div className="pc-modal-sub">
              <span>{student.studentId || '—'}</span>
              <span>•</span>
              <span>{student.classId ? classLabel(student.classId) : 'Sinfsiz'}</span>
              <span>•</span>
              <span>{student.parentName || 'Ota-ona ismi yo\'q'}</span>
              <span>•</span>
              <span>{student.parentPhone || student.phone || 'Telefon yo\'q'}</span>
            </div>
          </div>
          <button className="pc-modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="pc-loading"><div className="pc-spinner" />Yuklanmoqda…</div>
        ) : contacts.length === 0 ? (
          <div className="pc-empty pc-empty-padded">
            Bu o'quvchi uchun hali aloqa yozuvi yo'q.
          </div>
        ) : (
          <div className="pc-history-timeline">
            {contacts.map((c) => {
              const meta = STATUS_META[c.status] || STATUS_META.pending;
              const sentMeta = SENTIMENT_META[c.sentiment] || SENTIMENT_META.neutral;
              return (
                <div key={c._id} className="pc-history-item">
                  <div className="pc-history-dot" style={{ background: meta.color }}>{meta.icon}</div>
                  <div className="pc-history-body">
                    <div className="pc-history-head">
                      <div>
                        <span className="pc-history-month">{formatMonthLabel(c.reportMonth)}</span>
                        <span className="pc-status-badge" style={{ color: meta.color, background: meta.soft }}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="pc-history-actions">
                        <button className="pc-row-btn primary small" onClick={() => onEdit(c)}>✎</button>
                        <button className="pc-row-btn danger small" onClick={() => onDelete(c)}>🗑</button>
                      </div>
                    </div>
                    <div className="pc-history-meta">
                      <span>{formatDateUz(c.contactDate)}</span>
                      <span>•</span>
                      <span>{CHANNEL_LABELS[c.channel] || c.channel}</span>
                      <span>•</span>
                      <span>{TOPIC_LABELS[c.topic] || c.topic}</span>
                      {c.durationMinutes != null && c.durationMinutes > 0 && (
                        <>
                          <span>•</span>
                          <span>{c.durationMinutes} daq.</span>
                        </>
                      )}
                      <span>•</span>
                      <span style={{ color: sentMeta.color }}>{sentMeta.icon} {sentMeta.label}</span>
                    </div>
                    {c.summary && (
                      <div className="pc-history-summary">{c.summary}</div>
                    )}
                    {c.followUpRequired && (
                      <div className="pc-history-followup">
                        <strong>⏰ Follow-up:</strong> {c.followUpDate ? formatDateUz(c.followUpDate) : 'sana ko\'rsatilmagan'}{c.followUpNotes ? ` — ${c.followUpNotes}` : ''}
                      </div>
                    )}
                    <div className="pc-history-footer">
                      Qayd qildi: <strong>{c.recordedBy ? `${c.recordedBy.firstName} ${c.recordedBy.lastName}` : '—'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentContacts;
