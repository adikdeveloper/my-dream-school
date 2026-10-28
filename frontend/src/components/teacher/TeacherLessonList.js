import React, { useEffect, useMemo, useState } from 'react';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import TeacherUiIcon from './TeacherUiIcon';
import styles from './TeacherLessonList.module.css';

const DAYS = [
  ['Monday', 'Dushanba'], ['Tuesday', 'Seshanba'], ['Wednesday', 'Chorshanba'],
  ['Thursday', 'Payshanba'], ['Friday', 'Juma'], ['Saturday', 'Shanba']
];

const EMPTY_FORM = { classId: '', subject: '', day: 'Monday', startTime: '08:00', endTime: '08:45', room: '', note: '' };

const TeacherLessonList = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const selectedClass = useMemo(() => options.find((item) => item._id === form.classId), [options, form.classId]);
  const subjects = selectedClass?.subjects || [];

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [lessonResult, optionResult] = await Promise.allSettled([
        apiService.getTeacherLessonList(), apiService.getTeacherLessonOptions()
      ]);
      setLessons(lessonResult.status === 'fulfilled' && Array.isArray(lessonResult.value) ? lessonResult.value : []);

      if (optionResult.status === 'fulfilled') {
        setOptions(Array.isArray(optionResult.value) ? optionResult.value : []);
      } else {
        const classResponse = await apiService.getClasses();
        const allClasses = classResponse?.classes || [];
        const teacherId = String(user?._id || '');
        const fallbackOptions = allClasses.map((cls) => ({
          ...cls,
          subjects: (cls.subjects || [])
            .filter((item) => String(item.teacher?._id || item.teacher || '') === teacherId)
            .map((item) => item.subject)
            .filter(Boolean)
        })).filter((cls) => cls.subjects.length > 0);
        setOptions(fallbackOptions);
      }

      if (lessonResult.status === 'rejected' && lessonResult.reason?.response?.status !== 404) {
        setError(lessonResult.reason?.response?.data?.message || "Darslar ro'yxatini yuklashda xatolik");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?._id]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleClassChange = (classId) => {
    const cls = options.find((item) => item._id === classId);
    setForm((prev) => ({ ...prev, classId, subject: cls?.subjects?.[0]?._id || '', room: cls?.room || '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.classId || !form.subject) {
      setError('Sinf va fanni tanlang');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      if (editingId) await apiService.updateTeacherLesson(editingId, form);
      else await apiService.createTeacherLesson(form);
      setSuccess(editingId ? 'Dars yangilandi' : "Dars ro'yxatga qo'shildi");
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Darsni saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (lesson) => {
    setEditingId(lesson._id);
    setForm({
      classId: lesson.classId?._id || '',
      subject: lesson.subject?._id || '',
      day: lesson.day,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      room: lesson.room || '',
      note: lesson.note || ''
    });
    setError('');
    setSuccess('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeLesson = async (id) => {
    if (!window.confirm("Darsni ro'yxatdan o'chirasizmi?")) return;
    try {
      setError('');
      setSuccess('');
      await apiService.deleteTeacherLesson(id);
      setLessons((prev) => prev.filter((item) => item._id !== id));
      if (editingId === id) closeForm();
      setSuccess("Dars ro'yxatdan o'chirildi");
    } catch (err) {
      setError(err.response?.data?.message || "Darsni o'chirishda xatolik");
    }
  };

  const grouped = DAYS.map(([key, label]) => ({
    key,
    label,
    lessons: lessons
      .filter((item) => item.day === key)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }));

  const activeDays = grouped.filter((day) => day.lessons.length > 0).length;
  const totalMinutes = lessons.reduce((sum, lesson) => {
    const [sh, sm] = (lesson.startTime || '0:0').split(':').map(Number);
    const [eh, em] = (lesson.endTime || '0:0').split(':').map(Number);
    return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  }, 0);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Ta'lim</p>
          <h1 className={styles.title}>Dars ro'yxati</h1>
          <p className={styles.subtitle}>Haftalik darslaringizni sinf va vaqt bo'yicha boshqaring.</p>
        </div>
        <button
          type="button"
          className="td-btn td-btn--gold"
          onClick={() => { if (showForm) closeForm(); else setShowForm(true); }}
        >
          <TeacherUiIcon name={showForm ? 'close' : 'plus'} size={15} />
          {showForm ? 'Bekor qilish' : "Dars qo'shish"}
        </button>
      </header>

      <section className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><TeacherUiIcon name="grid" size={17} /></span>
          <div><strong>{lessons.length}</strong><span>Jami darslar</span></div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><TeacherUiIcon name="calendar" size={17} /></span>
          <div><strong>{activeDays}</strong><span>Faol kunlar</span></div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><TeacherUiIcon name="clock" size={17} /></span>
          <div><strong>{Math.floor(totalMinutes / 60)} soat {totalMinutes % 60} daq</strong><span>Haftalik yuklama</span></div>
        </div>
      </section>

      {error && <div className="td-alert td-alert--error"><TeacherUiIcon name="warning" size={15} /> {error}</div>}
      {success && <div className="td-alert td-alert--success"><TeacherUiIcon name="check" size={15} /> {success}</div>}

      <div className={`${styles.layout} ${showForm ? styles.layoutWithForm : ''}`}>
        {showForm && (
          <section className={`td-card ${styles.formCard}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">{editingId ? 'Darsni tahrirlash' : "Yangi dars qo'shish"}</h2>
                <p className="td-card-sub">Sizga biriktirilgan sinf va fanlar</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className="td-label">
                Sinf
                <select className="td-select" value={form.classId} onChange={(event) => handleClassChange(event.target.value)} required>
                  <option value="">Sinfni tanlang</option>
                  {options.map((cls) => <option key={cls._id} value={cls._id}>{cls.name}</option>)}
                </select>
              </label>
              <label className="td-label">
                Fan
                <select className="td-select" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required disabled={!form.classId}>
                  <option value="">Fanni tanlang</option>
                  {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
                </select>
              </label>
              <label className="td-label">
                Hafta kuni
                <select className="td-select" value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>
                  {DAYS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <div className={styles.timeRow}>
                <label className="td-label">
                  Boshlanish
                  <input className="td-input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required />
                </label>
                <label className="td-label">
                  Tugash
                  <input className="td-input" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required />
                </label>
              </div>
              <label className="td-label">
                Xona
                <input className="td-input" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} maxLength="60" placeholder="Masalan: 12-xona" />
              </label>
              <label className="td-label">
                Izoh
                <input className="td-input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} maxLength="300" placeholder="Ixtiyoriy izoh" />
              </label>
              <div className={styles.formActions}>
                <button type="button" className="td-btn td-btn--ghost" onClick={closeForm}>Bekor qilish</button>
                <button type="submit" className="td-btn td-btn--gold" disabled={saving || options.length === 0}>
                  <TeacherUiIcon name={editingId ? 'edit' : 'plus'} size={14} />
                  {saving ? 'Saqlanmoqda...' : editingId ? 'Yangilash' : "Qo'shish"}
                </button>
              </div>
              {options.length === 0 && !loading && (
                <p className={styles.formHint}>Sizga biriktirilgan sinflar topilmadi. Administrator bilan bog'laning.</p>
              )}
            </form>
          </section>
        )}

        <section className={`td-card ${styles.listCard}`}>
          <div className="td-card-head">
            <div>
              <h2 className="td-card-title">Haftalik jadval</h2>
              <p className="td-card-sub">Darslar kun va boshlanish vaqti bo'yicha</p>
            </div>
            <span className="td-chip td-chip--gray">{lessons.length} ta dars</span>
          </div>

          {loading ? (
            <div className={styles.loading}>
              {[1, 2, 3, 4].map((item) => <div className={`td-skeleton ${styles.loadingRow}`} key={item} />)}
            </div>
          ) : lessons.length === 0 ? (
            <div className="td-empty">
              <span className="td-empty-icon"><TeacherUiIcon name="calendar" size={20} /></span>
              <strong>Hozircha dars qo'shilmagan</strong>
              <span>Yuqoridagi tugma orqali birinchi darsni qo'shing.</span>
            </div>
          ) : (
            <div className={styles.days}>
              {grouped.map((day) => (
                day.lessons.length > 0 && (
                  <div className={styles.day} key={day.key}>
                    <div className={styles.dayHead}>
                      <span>{day.label}</span>
                      <small>{day.lessons.length} ta dars</small>
                    </div>
                    <div className={styles.rows}>
                      {day.lessons.map((lesson) => (
                        <article className={styles.row} key={lesson._id}>
                          <div className={styles.time}>
                            <strong>{lesson.startTime}</strong>
                            <span>{lesson.endTime}</span>
                          </div>
                          <span className={styles.rowDot} />
                          <div className={styles.lessonInfo}>
                            <strong>{lesson.subject?.name || 'Fan'}</strong>
                            <span>
                              {lesson.classId?.name || 'Sinf'}
                              {lesson.room ? ` · ${lesson.room}` : ''}
                            </span>
                            {lesson.note && <small>{lesson.note}</small>}
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" onClick={() => startEdit(lesson)} title="Tahrirlash" aria-label="Tahrirlash">
                              <TeacherUiIcon name="edit" size={15} />
                            </button>
                            <button type="button" className={styles.deleteBtn} onClick={() => removeLesson(lesson._id)} title="O'chirish" aria-label="O'chirish">
                              <TeacherUiIcon name="trash" size={15} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TeacherLessonList;
