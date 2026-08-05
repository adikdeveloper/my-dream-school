import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import apiService from '../../services/apiService';
import './Substitutions.css';
import TeacherUiIcon from '../teacher/TeacherUiIcon';

// Dars almashtirish (o'rnini bosish) boshqaruvi.
// Rolga qarab ko'rinish: o'qituvchi o'zi belgilaydi/tasdiqlaydi,
// admin/direktor hamma narsani boshqaradi + oylik hisobot ko'radi.
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const Substitutions = ({ accent = '#3b82f6' }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const role = user?.role;
  const isManager = ['admin', 'director', 'supervisor'].includes(role);
  const allowed = can('lesson.substitute');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [mine, setMine] = useState({ asSubstitute: [], asOriginal: [] });
  const [report, setReport] = useState({ substitutions: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null); // {type, text}

  // Belgilash modali
  const [showModal, setShowModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ classId: '', date: toInput(now), periodIndex: '', substituteTeacherId: '', reason: '' });
  const [dayPeriods, setDayPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toInput(d) {
    const dt = new Date(d);
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${m}-${day}`;
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const teacherName = (t) => (t ? `${t.firstName} ${t.lastName}` : '—');
  const flash = (type, text) => { setBanner({ type, text }); setTimeout(() => setBanner(null), 3500); };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (isManager) {
        const r = await apiService.getSubstitutions({ year, month });
        setReport(r || { substitutions: [], summary: [] });
      } else {
        const m = await apiService.getMySubstitutions(year, month);
        setMine(m || { asSubstitute: [], asOriginal: [] });
      }
    } catch (e) {
      flash('error', e.response?.data?.message || 'Maʼlumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [year, month, isManager]);

  useEffect(() => { loadData(); }, [loadData]);

  // Modal ochilganda sinflar (va manager bo'lsa o'qituvchilar) ro'yxati
  const openModal = async () => {
    setForm({ classId: '', date: toInput(new Date()), periodIndex: '', substituteTeacherId: '', reason: '' });
    setDayPeriods([]);
    setShowModal(true);
    try {
      const cls = await apiService.getClasses();
      setClasses(cls.classes || cls || []);
    } catch (e) {
      flash('error', 'Sinflar ro\'yxatini yuklashda xatolik');
    }
    if (isManager) {
      try {
        const t = await apiService.getUsers('teacher', 1, 300);
        const list = t.users || [];
        setTeachers(list);
        if (list.length === 0) flash('error', "O'qituvchilar ro'yxati bo'sh — almashtirishni belgilab bo'lmaydi");
      } catch (e) {
        flash('error', "O'qituvchilar ro'yxatini yuklashda xatolik");
      }
    }
  };

  // Sinf + sana tanlanganda o'sha kungi darslarni yuklash
  const loadDayPeriods = useCallback(async (classId, date) => {
    if (!classId || !date) { setDayPeriods([]); return; }
    try {
      setLoadingPeriods(true);
      const res = await apiService.getClassDayPeriods(classId, date);
      setDayPeriods(res.periods || []);
    } catch (e) {
      setDayPeriods([]);
      flash('error', e.response?.data?.message || 'Bu kun uchun jadval topilmadi');
    } finally {
      setLoadingPeriods(false);
    }
  }, []);

  useEffect(() => {
    if (showModal && form.classId && form.date) loadDayPeriods(form.classId, form.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, form.classId, form.date]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.classId || form.periodIndex === '' || !form.date) {
      flash('error', 'Sinf, sana va darsni tanlang');
      return;
    }
    if (isManager && !form.substituteTeacherId) {
      flash('error', "Kim o'tganini (o'rinbosar) tanlang");
      return;
    }
    // Asl o'qituvchi va o'rinbosar bir xil bo'lmasligi kerak
    if (isManager && form.periodIndex !== '') {
      const selPeriod = dayPeriods.find(p => String(p.periodIndex) === String(form.periodIndex));
      const origId = selPeriod?.teacher?._id ? String(selPeriod.teacher._id) : null;
      if (origId && origId === form.substituteTeacherId) {
        flash('error', "O'qituvchini o'zi bilan almashtirib bo'lmaydi!");
        return;
      }
    }
    try {
      setSubmitting(true);
      await apiService.createSubstitution({
        classId: form.classId,
        date: form.date,
        periodIndex: Number(form.periodIndex),
        reason: form.reason,
        substituteTeacherId: isManager ? form.substituteTeacherId : undefined
      });
      flash('success', "Almashtirish belgilandi" + (isManager ? ' va tasdiqlandi' : ' (tasdiq kutilmoqda)'));
      setShowModal(false);
      loadData();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Belgilashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (fn, id, okText) => {
    try {
      await fn(id);
      flash('success', okText);
      loadData();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Amal bajarilmadi');
    }
  };

  // ---- styles ----
  const card = { background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '1rem' };
  const th = { textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
  const td = { padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
  const btn = (bg) => ({ background: bg, color: '#fff', border: 'none', padding: '0.4rem 0.7rem', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', marginRight: 6 });

  const StatusBadge = ({ status }) => {
    const map = {
      pending: { bg: '#fef3c7', c: '#92400e', t: 'Kutilmoqda' },
      confirmed: { bg: '#dcfce7', c: '#166534', t: 'Tasdiqlangan' },
      rejected: { bg: '#fee2e2', c: '#991b1b', t: 'Rad etilgan' }
    };
    const s = map[status] || map.pending;
    return <span className={`sub-status sub-status-${status || 'pending'}`}>{s.t}</span>;
  };

  const periodLabel = (s) => `${formatDate(s.date)} • ${s.startTime}-${s.endTime}${s.subjectName ? ' • ' + s.subjectName : ''}`;

  if (!allowed) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ color: '#64748b' }}><TeacherUiIcon name="lock" size={34} /></div>
        <h2 style={{ color: '#1e293b' }}>Ruxsat yo'q</h2>
        <p>Dars almashtirish bo'limidan foydalanish uchun sizda ruxsat yo'q. Administrator yoki direktorga murojaat qiling.</p>
      </div>
    );
  }

  return (
    <div className="sub-page">
      <div className="sub-hero">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><TeacherUiIcon name="swap" size={24} /> Dars almashtirish</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            O'qituvchi kelmaganda o'rniga kim o'tganini belgilash va tasdiqlash
          </p>
        </div>
        <button onClick={openModal} className="sub-primary" style={{ '--sub-accent': accent }}>
          ➕ Yangi belgilash
        </button>
      </div>

      {/* Oy/yil tanlash */}
      <div className="sub-filters">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1' }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1' }}>
          {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {banner && (
        <div style={{ padding: '0.7rem 1rem', borderRadius: 8, marginBottom: '1rem', fontWeight: 600, fontSize: '0.85rem',
          background: banner.type === 'error' ? '#fee2e2' : '#dcfce7', color: banner.type === 'error' ? '#991b1b' : '#166534' }}>
          <TeacherUiIcon name={banner.type === 'error' ? 'warning' : 'check'} size={16} /> {banner.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Yuklanmoqda...</div>
      ) : isManager ? (
        /* ========== ADMIN / DIREKTOR KO'RINISHI ========== */
        <>
          {/* Oylik xulosa: kim necha soat */}
          <div style={card} className="sub-card">
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}><TeacherUiIcon name="report" /> {MONTHS[month - 1]} oyi — kim necha soat o'rniga o'tdi</h2>
            {report.summary.length === 0 ? (
              <p style={{ color: '#94a3b8', margin: 0 }}>Bu oyda almashtirishlar yo'q</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={th}>O'qituvchi (o'rinbosar)</th>
                    <th style={th}>Jami soat</th>
                    <th style={th}>Tasdiqlangan</th>
                    <th style={th}>Kutilmoqda</th>
                  </tr></thead>
                  <tbody>
                    {report.summary.map((s) => (
                      <tr key={s.teacherId}>
                        <td style={td}>{s.teacherName}</td>
                        <td style={{ ...td, fontWeight: 700 }}>{s.totalHours} soat</td>
                        <td style={{ ...td, color: '#166534' }}>{s.confirmedHours}</td>
                        <td style={{ ...td, color: '#92400e' }}>{s.pendingHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* To'liq ro'yxat */}
          <div style={card} className="sub-card">
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#0f172a' }}>Barcha almashtirishlar</h2>
            {report.substitutions.length === 0 ? (
              <p style={{ color: '#94a3b8', margin: 0 }}>Yozuvlar yo'q</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={th}>Sana</th>
                    <th style={th}>Sinf / Dars</th>
                    <th style={th}>Asl o'qituvchi</th>
                    <th style={th}>O'rniga o'tgan</th>
                    <th style={th}>Holat</th>
                    <th style={th}>Amal</th>
                  </tr></thead>
                  <tbody>
                    {report.substitutions.map((s) => (
                      <tr key={s._id}>
                        <td style={td}>{formatDate(s.date)}<br /><span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{s.startTime}-{s.endTime}</span></td>
                        <td style={td}>{s.classId?.name || '—'}<br /><span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{s.subject?.name || ''}</span></td>
                        <td style={td}>{teacherName(s.originalTeacher)}</td>
                        <td style={{ ...td, fontWeight: 600, color: accent }}>{teacherName(s.substituteTeacher)}</td>
                        <td style={td}><StatusBadge status={s.status} /></td>
                        <td style={td}>
                          {s.status !== 'confirmed' && <button style={btn('#16a34a')} onClick={() => act(apiService.confirmSubstitution, s._id, 'Tasdiqlandi')}><TeacherUiIcon name="check" size={14} /> Tasdiq</button>}
                          {s.status !== 'rejected' && <button style={btn('#f59e0b')} onClick={() => act(apiService.rejectSubstitution, s._id, 'Rad etildi')}>✕ Rad</button>}
                          <button style={btn('#ef4444')} onClick={() => { if (window.confirm("O'chirilsinmi?")) act(apiService.deleteSubstitution, s._id, "O'chirildi"); }}><TeacherUiIcon name="trash" size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ========== O'QITUVCHI KO'RINISHI ========== */
        <>
          {/* Tasdiqlash kutilayotganlar (mening o'rnimga o'tilgan) */}
          {mine.asOriginal.filter((s) => s.status === 'pending').length > 0 && (
            <div style={{ ...card, borderLeft: '4px solid #f59e0b' }}>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#92400e' }}>⏳ Sizning o'rningizga o'tildi — tasdiqlang</h2>
              {mine.asOriginal.filter((s) => s.status === 'pending').map((s) => (
                <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{teacherName(s.substituteTeacher)} o'tdi</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{s.classId?.name} • {periodLabel({ date: s.date, startTime: s.startTime, endTime: s.endTime, subjectName: s.subject?.name })}</div>
                  </div>
                  <div>
                    <button style={btn('#16a34a')} onClick={() => act(apiService.confirmSubstitution, s._id, 'Tasdiqlandi')}><TeacherUiIcon name="check" size={14} /> Tasdiqlash</button>
                    <button style={btn('#ef4444')} onClick={() => act(apiService.rejectSubstitution, s._id, 'Rad etildi')}>✕ Rad etish</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Men boshqa o'qituvchi o'rniga o'tgan darslar */}
          <div style={card}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}><TeacherUiIcon name="star" /> Men o'rniga o'tgan darslar</h2>
            {mine.asSubstitute.length === 0 ? (
              <p style={{ color: '#94a3b8', margin: 0 }}>Bu oyda yozuvlar yo'q</p>
            ) : mine.asSubstitute.map((s) => (
              <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.classId?.name} • {teacherName(s.originalTeacher)} o'rniga</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{periodLabel({ date: s.date, startTime: s.startTime, endTime: s.endTime, subjectName: s.subject?.name })}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={s.status} />
                  {s.status === 'pending' && <button style={btn('#ef4444')} onClick={() => act(apiService.deleteSubstitution, s._id, "O'chirildi")}><TeacherUiIcon name="trash" size={15} /></button>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ====== Belgilash modali ====== */}
      {showModal && (
        <div className="sub-modal-backdrop" onClick={() => !submitting && setShowModal(false)}>
          <div className="sub-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Yangi almashtirish belgilash</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <form onSubmit={submit} style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                Sinfni va kunni tanlang — o'sha vaqtda jadval bo'yicha kim o'tishi kerakligi avtomatik aniqlanadi.
              </p>

              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Sinf *</label>
              <select required value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value, periodIndex: '' }))}
                style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '0.9rem' }}>
                <option value="">— Sinfni tanlang —</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>

              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Sana *</label>
              <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, periodIndex: '' }))}
                style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '0.9rem' }} />

              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Dars (qaysi soatga o'tdingiz) *</label>
              {loadingPeriods ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.9rem' }}>Yuklanmoqda...</div>
              ) : dayPeriods.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.9rem' }}>
                  {form.classId && form.date ? 'Bu kun uchun dars topilmadi' : 'Avval sinf va sanani tanlang'}
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: '0.9rem', maxHeight: 220, overflowY: 'auto' }}>
                  {dayPeriods.map((p) => {
                    const disabled = !p.teacher || (p.substitution && p.substitution.status !== 'rejected');
                    return (
                      <label key={p.periodIndex} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.7rem', borderBottom: '1px solid #f1f5f9', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
                        <input type="radio" name="period" disabled={disabled} checked={String(form.periodIndex) === String(p.periodIndex)}
                          onChange={() => setForm((f) => ({ ...f, periodIndex: p.periodIndex }))} />
                        <span style={{ flex: 1 }}>
                          <strong>{p.startTime}-{p.endTime}</strong> {p.subject?.name ? `• ${p.subject.name}` : ''}<br />
                          <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                            Jadval bo'yicha: {p.teacher ? p.teacher.name : 'o\'qituvchi yo\'q'}
                            {p.substitution && p.substitution.status !== 'rejected' && ` (allaqachon: ${p.substitution.substituteTeacher || 'belgilangan'})`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {isManager && (() => {
                // Tanlangan period dagi asl o'qituvchi ID — uni o'rinbosar sifatida tanlab bo'lmaydi
                const selectedPeriod = form.periodIndex !== '' ? dayPeriods.find(p => String(p.periodIndex) === String(form.periodIndex)) : null;
                const originalTeacherIdOfPeriod = selectedPeriod?.teacher?._id ? String(selectedPeriod.teacher._id) : null;
                return (
                  <>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>O'rniga o'tgan o'qituvchi *</label>
                    <select required value={form.substituteTeacherId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && originalTeacherIdOfPeriod && val === originalTeacherIdOfPeriod) return;
                        setForm((f) => ({ ...f, substituteTeacherId: val }));
                      }}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '0.9rem' }}>
                      <option value="">— Kim o'tdi —</option>
                      {teachers.map((t) => {
                        const isOriginal = originalTeacherIdOfPeriod && String(t._id) === originalTeacherIdOfPeriod;
                        return (
                          <option key={t._id} value={t._id} disabled={isOriginal}>
                            {t.firstName} {t.lastName}{isOriginal ? ' (asl o\'qituvchi — tanlab bo\'lmaydi)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {originalTeacherIdOfPeriod && form.substituteTeacherId === originalTeacherIdOfPeriod && (
                      <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: -8, marginBottom: '0.9rem' }}>
                        ⚠️ O'qituvchini o'zi bilan almashtirib bo'lmaydi!
                      </p>
                    )}
                  </>
                );
              })()}

              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Sabab (ixtiyoriy)</label>
              <input type="text" value={form.reason} maxLength={300} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="masalan: kasal bo'lib qoldi" style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '1.1rem' }} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={submitting} style={{ ...btn(accent), flex: 1, padding: '0.65rem', marginRight: 0, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Saqlanmoqda...' : 'Belgilash'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} disabled={submitting} style={{ ...btn('#64748b'), flex: 1, padding: '0.65rem', marginRight: 0 }}>
                  Bekor qilish
                </button>
              </div>
              {!isManager && (
                <p style={{ margin: '0.9rem 0 0', color: '#94a3b8', fontSize: '0.78rem' }}>
                  Eslatma: belgilagandan so'ng asl o'qituvchi yoki admin/direktor tasdiqlaydi. Tasdiqdan oldin ham o'sha sinf jurnali sizga ochiq bo'ladi.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Substitutions;
