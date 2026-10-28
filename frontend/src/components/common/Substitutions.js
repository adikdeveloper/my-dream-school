import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import apiService from '../../services/apiService';
import { formatUzLongDate } from '../../utils/uzDate';
import './Substitutions.css';
import TeacherUiIcon from '../teacher/TeacherUiIcon';

// Dars almashtirish (o'rnini bosish) boshqaruvi.
// Rolga qarab ko'rinish: o'qituvchi o'zi belgilaydi/tasdiqlaydi,
// admin/direktor hamma narsani boshqaradi + oylik hisobot ko'radi.
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const Substitutions = ({ accent = '#d9a441' }) => {
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
  const [banner, setBanner] = useState(null);

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

  const formatDate = (d) => formatUzLongDate(d, { year: true }) || '—';
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

  const StatusBadge = ({ status }) => {
    const map = {
      pending: { c: 'pending', t: 'Kutilmoqda' },
      confirmed: { c: 'confirmed', t: 'Tasdiqlangan' },
      rejected: { c: 'rejected', t: 'Rad etilgan' }
    };
    const s = map[status] || map.pending;
    return <span className={`sub-status sub-status-${s.c}`}>{s.t}</span>;
  };

  const periodLabel = (s) => `${formatDate(s.date)} · ${s.startTime}-${s.endTime}${s.subjectName ? ' · ' + s.subjectName : ''}`;
  const pendingOriginal = mine.asOriginal.filter((s) => s.status === 'pending');

  if (!allowed) {
    return (
      <div className="sub-page">
        <div className="sub-locked">
          <span className="sub-locked-icon"><TeacherUiIcon name="lock" size={24} /></span>
          <h2>Ruxsat yo'q</h2>
          <p>Dars almashtirish bo'limidan foydalanish uchun sizda ruxsat yo'q. Administrator yoki direktorga murojaat qiling.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sub-page" style={{ '--sub-accent': accent }}>
      <header className="sub-head">
        <div>
          <p className="sub-eyebrow">Dars jarayoni</p>
          <h1 className="sub-title">Dars almashtirish</h1>
          <p className="sub-subtitle">O'qituvchi kelmaganda o'rniga kim o'tganini belgilang va tasdiqlang.</p>
        </div>
        <button type="button" onClick={openModal} className="sub-primary">
          <TeacherUiIcon name="plus" size={15} /> Yangi belgilash
        </button>
      </header>

      <div className="sub-filters">
        <span className="sub-filters-label"><TeacherUiIcon name="calendar" size={15} /> Davr</span>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Oy">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Yil">
          {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {banner && (
        <div className={`sub-alert sub-alert--${banner.type}`}>
          <TeacherUiIcon name={banner.type === 'error' ? 'warning' : 'check'} size={16} />
          <span>{banner.text}</span>
        </div>
      )}

      {loading ? (
        <div className="sub-loading">
          <span className="sub-spinner" />
          <span>Yuklanmoqda...</span>
        </div>
      ) : isManager ? (
        <>
          <section className="sub-card">
            <div className="sub-card-head">
              <div>
                <h2>{MONTHS[month - 1]} oyi — kim necha soat o'rniga o'tdi</h2>
                <p>O'qituvchilar bo'yicha oylik yuklama</p>
              </div>
              <span className="sub-chip">{report.summary.length} o'qituvchi</span>
            </div>
            {report.summary.length === 0 ? (
              <div className="sub-empty">
                <span className="sub-empty-icon"><TeacherUiIcon name="report" size={20} /></span>
                <strong>Bu oyda almashtirishlar yo'q</strong>
                <span>Belgilangan darslar shu yerda jamlanadi.</span>
              </div>
            ) : (
              <div className="sub-table-wrap">
                <table className="sub-table">
                  <thead><tr>
                    <th>O'qituvchi (o'rinbosar)</th>
                    <th>Jami soat</th>
                    <th>Tasdiqlangan</th>
                    <th>Kutilmoqda</th>
                  </tr></thead>
                  <tbody>
                    {report.summary.map((s) => (
                      <tr key={s.teacherId}>
                        <td className="sub-strong">{s.teacherName}</td>
                        <td className="sub-strong">{s.totalHours} soat</td>
                        <td className="sub-positive">{s.confirmedHours}</td>
                        <td className="sub-pending">{s.pendingHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="sub-card">
            <div className="sub-card-head">
              <div>
                <h2>Barcha almashtirishlar</h2>
                <p>{MONTHS[month - 1]} {year} · {report.substitutions.length} ta yozuv</p>
              </div>
            </div>
            {report.substitutions.length === 0 ? (
              <div className="sub-empty">
                <span className="sub-empty-icon"><TeacherUiIcon name="swap" size={20} /></span>
                <strong>Yozuvlar yo'q</strong>
                <span>Yangi almashtirish belgilanganda ro'yxat shakllanadi.</span>
              </div>
            ) : (
              <div className="sub-table-wrap">
                <table className="sub-table">
                  <thead><tr>
                    <th>Sana</th>
                    <th>Sinf / Dars</th>
                    <th>Asl o'qituvchi</th>
                    <th>O'rniga o'tgan</th>
                    <th>Holat</th>
                    <th>Amal</th>
                  </tr></thead>
                  <tbody>
                    {report.substitutions.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <span className="sub-cell-main">{formatDate(s.date)}</span>
                          <span className="sub-cell-sub">{s.startTime}-{s.endTime}</span>
                        </td>
                        <td>
                          <span className="sub-cell-main">{s.classId?.name || '—'}</span>
                          <span className="sub-cell-sub">{s.subject?.name || ''}</span>
                        </td>
                        <td>{teacherName(s.originalTeacher)}</td>
                        <td className="sub-accent-text">{teacherName(s.substituteTeacher)}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>
                          <div className="sub-actions">
                            {s.status !== 'confirmed' && (
                              <button type="button" className="sub-btn sub-btn--success" onClick={() => act(apiService.confirmSubstitution, s._id, 'Tasdiqlandi')}>
                                <TeacherUiIcon name="check" size={14} /> Tasdiq
                              </button>
                            )}
                            {s.status !== 'rejected' && (
                              <button type="button" className="sub-btn sub-btn--warn" onClick={() => act(apiService.rejectSubstitution, s._id, 'Rad etildi')}>
                                <TeacherUiIcon name="close" size={14} /> Rad
                              </button>
                            )}
                            <button
                              type="button"
                              className="sub-btn sub-btn--icon"
                              title="O'chirish"
                              aria-label="O'chirish"
                              onClick={() => { if (window.confirm("O'chirilsinmi?")) act(apiService.deleteSubstitution, s._id, "O'chirildi"); }}
                            >
                              <TeacherUiIcon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {pendingOriginal.length > 0 && (
            <section className="sub-card sub-card--attention">
              <div className="sub-card-head">
                <div>
                  <h2><TeacherUiIcon name="clock2" size={17} /> Sizning o'rningizga o'tildi — tasdiqlang</h2>
                  <p>{pendingOriginal.length} ta yozuv tasdiq kutmoqda</p>
                </div>
              </div>
              <div className="sub-list">
                {pendingOriginal.map((s) => (
                  <div className="sub-list-row" key={s._id}>
                    <span className="sub-list-icon"><TeacherUiIcon name="swap" size={16} /></span>
                    <div className="sub-list-info">
                      <strong>{teacherName(s.substituteTeacher)} o'tdi</strong>
                      <span>{s.classId?.name} · {periodLabel({ date: s.date, startTime: s.startTime, endTime: s.endTime, subjectName: s.subject?.name })}</span>
                    </div>
                    <div className="sub-actions">
                      <button type="button" className="sub-btn sub-btn--success" onClick={() => act(apiService.confirmSubstitution, s._id, 'Tasdiqlandi')}>
                        <TeacherUiIcon name="check" size={14} /> Tasdiqlash
                      </button>
                      <button type="button" className="sub-btn sub-btn--warn" onClick={() => act(apiService.rejectSubstitution, s._id, 'Rad etildi')}>
                        <TeacherUiIcon name="close" size={14} /> Rad etish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="sub-card">
            <div className="sub-card-head">
              <div>
                <h2><TeacherUiIcon name="star" size={17} /> Men o'rniga o'tgan darslar</h2>
                <p>{MONTHS[month - 1]} {year} · {mine.asSubstitute.length} ta yozuv</p>
              </div>
            </div>
            {mine.asSubstitute.length === 0 ? (
              <div className="sub-empty">
                <span className="sub-empty-icon"><TeacherUiIcon name="star" size={20} /></span>
                <strong>Bu oyda yozuvlar yo'q</strong>
                <span>Boshqa o'qituvchi o'rniga dars o'tsangiz, shu yerda ko'rinadi.</span>
              </div>
            ) : (
              <div className="sub-list">
                {mine.asSubstitute.map((s) => (
                  <div className="sub-list-row" key={s._id}>
                    <span className="sub-list-icon sub-list-icon--gold"><TeacherUiIcon name="book" size={16} /></span>
                    <div className="sub-list-info">
                      <strong>{s.classId?.name} · {teacherName(s.originalTeacher)} o'rniga</strong>
                      <span>{periodLabel({ date: s.date, startTime: s.startTime, endTime: s.endTime, subjectName: s.subject?.name })}</span>
                    </div>
                    <div className="sub-actions">
                      <StatusBadge status={s.status} />
                      {s.status === 'pending' && (
                        <button
                          type="button"
                          className="sub-btn sub-btn--icon"
                          title="O'chirish"
                          aria-label="O'chirish"
                          onClick={() => act(apiService.deleteSubstitution, s._id, "O'chirildi")}
                        >
                          <TeacherUiIcon name="trash" size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showModal && (
        <div className="sub-modal-backdrop" onClick={() => !submitting && setShowModal(false)}>
          <div className="sub-modal" role="dialog" aria-modal="true" aria-labelledby="sub-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="sub-modal-head">
              <div>
                <h2 id="sub-modal-title">Yangi almashtirish belgilash</h2>
                <p>Sinf va sanani tanlang — jadval bo'yicha darslar avtomatik aniqlanadi.</p>
              </div>
              <button type="button" className="sub-modal-close" onClick={() => setShowModal(false)} aria-label="Yopish">
                <TeacherUiIcon name="close" size={17} />
              </button>
            </div>
            <form onSubmit={submit} className="sub-form">
              <label className="sub-label">
                Sinf <span>*</span>
                <select
                  required
                  value={form.classId}
                  onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value, periodIndex: '' }))}
                >
                  <option value="">— Sinfni tanlang —</option>
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </label>

              <label className="sub-label">
                Sana <span>*</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, periodIndex: '' }))}
                />
              </label>

              <div className="sub-label">
                Dars (qaysi soatga o'tdingiz) <span>*</span>
                {loadingPeriods ? (
                  <div className="sub-hint">Yuklanmoqda...</div>
                ) : dayPeriods.length === 0 ? (
                  <div className="sub-hint">{form.classId && form.date ? 'Bu kun uchun dars topilmadi' : 'Avval sinf va sanani tanlang'}</div>
                ) : (
                  <div className="sub-periods">
                    {dayPeriods.map((p) => {
                      const disabled = !p.teacher || (p.substitution && p.substitution.status !== 'rejected');
                      return (
                        <label key={p.periodIndex} className={`sub-period ${disabled ? 'is-disabled' : ''}`}>
                          <input
                            type="radio"
                            name="period"
                            disabled={disabled}
                            checked={String(form.periodIndex) === String(p.periodIndex)}
                            onChange={() => setForm((f) => ({ ...f, periodIndex: p.periodIndex }))}
                          />
                          <span>
                            <strong>{p.startTime}-{p.endTime}</strong> {p.subject?.name ? `· ${p.subject.name}` : ''}
                            <small>
                              Jadval bo'yicha: {p.teacher ? p.teacher.name : "o'qituvchi yo'q"}
                              {p.substitution && p.substitution.status !== 'rejected' && ` (allaqachon: ${p.substitution.substituteTeacher || 'belgilangan'})`}
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {isManager && (() => {
                const selectedPeriod = form.periodIndex !== '' ? dayPeriods.find(p => String(p.periodIndex) === String(form.periodIndex)) : null;
                const originalTeacherIdOfPeriod = selectedPeriod?.teacher?._id ? String(selectedPeriod.teacher._id) : null;
                return (
                  <>
                    <label className="sub-label">
                      O'rniga o'tgan o'qituvchi <span>*</span>
                      <select
                        required
                        value={form.substituteTeacherId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && originalTeacherIdOfPeriod && val === originalTeacherIdOfPeriod) return;
                          setForm((f) => ({ ...f, substituteTeacherId: val }));
                        }}
                      >
                        <option value="">— Kim o'tdi —</option>
                        {teachers.map((t) => {
                          const isOriginal = originalTeacherIdOfPeriod && String(t._id) === originalTeacherIdOfPeriod;
                          return (
                            <option key={t._id} value={t._id} disabled={isOriginal}>
                              {t.firstName} {t.lastName}{isOriginal ? " (asl o'qituvchi — tanlab bo'lmaydi)" : ''}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    {originalTeacherIdOfPeriod && form.substituteTeacherId === originalTeacherIdOfPeriod && (
                      <p className="sub-error">O'qituvchini o'zi bilan almashtirib bo'lmaydi!</p>
                    )}
                  </>
                );
              })()}

              <label className="sub-label">
                Sabab (ixtiyoriy)
                <input
                  type="text"
                  value={form.reason}
                  maxLength={300}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="masalan: kasal bo'lib qoldi"
                />
              </label>

              <div className="sub-form-actions">
                <button type="button" className="sub-btn sub-btn--ghost" onClick={() => setShowModal(false)} disabled={submitting}>
                  Bekor qilish
                </button>
                <button type="submit" className="sub-btn sub-btn--primary" disabled={submitting}>
                  {submitting ? 'Saqlanmoqda...' : 'Belgilash'}
                </button>
              </div>

              {!isManager && (
                <p className="sub-note">
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
