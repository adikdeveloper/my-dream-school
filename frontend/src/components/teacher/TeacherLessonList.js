import React, { useEffect, useMemo, useState } from 'react';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import styles from './TeacherLessonList.module.css';

const DAYS = [
  ['Monday', 'Dushanba'], ['Tuesday', 'Seshanba'], ['Wednesday', 'Chorshanba'],
  ['Thursday', 'Payshanba'], ['Friday', 'Juma'], ['Saturday', 'Shanba']
];

const Icon = ({ name, size = 18 }) => {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    class: <><path d="M4 21V5l8-3 8 3v16M9 21v-4h6v4" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

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

  const selectedClass = useMemo(() => options.find(item => item._id === form.classId), [options, form.classId]);
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
        // Vercel frontend Render backenddan oldin deploy bo'lsa, mavjud sinflar
        // endpointidan vaqtinchalik foydalanamiz. Yangi endpoint ishga tushgach
        // keyingi yuklashda avtomatik ravishda asosiy API ishlaydi.
        const classResponse = await apiService.getClasses();
        const allClasses = classResponse?.classes || [];
        const teacherId = String(user?._id || '');
        const fallbackOptions = allClasses.map(cls => ({
          ...cls,
          subjects: (cls.subjects || [])
            .filter(item => String(item.teacher?._id || item.teacher || '') === teacherId)
            .map(item => item.subject)
            .filter(Boolean)
        })).filter(cls => cls.subjects.length > 0);
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

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setError(''); };

  const handleClassChange = (classId) => {
    const cls = options.find(item => item._id === classId);
    setForm(prev => ({ ...prev, classId, subject: cls?.subjects?.[0]?._id || '', room: cls?.room || '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.classId || !form.subject) return setError('Sinf va fanni tanlang');
    try {
      setSaving(true); setError(''); setSuccess('');
      if (editingId) await apiService.updateTeacherLesson(editingId, form);
      else await apiService.createTeacherLesson(form);
      setSuccess(editingId ? 'Dars yangilandi' : "Dars ro'yxatga qo'shildi");
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Darsni saqlashda xatolik');
    } finally { setSaving(false); }
  };

  const startEdit = (lesson) => {
    setEditingId(lesson._id);
    setForm({
      classId: lesson.classId?._id || '', subject: lesson.subject?._id || '', day: lesson.day,
      startTime: lesson.startTime, endTime: lesson.endTime, room: lesson.room || '', note: lesson.note || ''
    });
    setError(''); setSuccess(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeLesson = async (id) => {
    if (!window.confirm("Darsni ro'yxatdan o'chirasizmi?")) return;
    try {
      setError(''); setSuccess('');
      await apiService.deleteTeacherLesson(id);
      setLessons(prev => prev.filter(item => item._id !== id));
      if (editingId === id) resetForm();
      setSuccess("Dars ro'yxatdan o'chirildi");
    } catch (err) { setError(err.response?.data?.message || "Darsni o'chirishda xatolik"); }
  };

  const grouped = DAYS.map(([key, label]) => ({ key, label, lessons: lessons.filter(item => item.day === key) }));

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div><h1><Icon name="calendar" size={25} /> Dars ro'yxati</h1><p>Haftalik darslaringizni sinf va vaqt bo'yicha boshqaring.</p></div>
        <span className={styles.count}>{lessons.length} ta dars</span>
      </header>

      <section className={styles.formCard}>
        <div className={styles.cardHead}><div><h2>{editingId ? 'Darsni tahrirlash' : "Yangi dars qo'shish"}</h2><p>Faqat sizga biriktirilgan sinf va fanlar ko‘rsatiladi.</p></div>{editingId && <button className={styles.iconButton} onClick={resetForm} title="Bekor qilish"><Icon name="close" /></button>}</div>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <label><span>Sinf</span><select value={form.classId} onChange={e => handleClassChange(e.target.value)} required><option value="">Sinfni tanlang</option>{options.map(cls => <option key={cls._id} value={cls._id}>{cls.name}</option>)}</select></label>
          <label><span>Fan</span><select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required disabled={!form.classId}><option value="">Fanni tanlang</option>{subjects.map(subject => <option key={subject._id} value={subject._id}>{subject.name}</option>)}</select></label>
          <label><span>Hafta kuni</span><select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{DAYS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>Boshlanish vaqti</span><input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required /></label>
          <label><span>Tugash vaqti</span><input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required /></label>
          <label><span>Xona</span><input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} maxLength="60" placeholder="Masalan: 12-xona" /></label>
          <label className={styles.noteField}><span>Izoh</span><input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} maxLength="300" placeholder="Ixtiyoriy izoh" /></label>
          <div className={styles.formActions}>{editingId && <button type="button" className={styles.secondaryButton} onClick={resetForm}>Bekor qilish</button>}<button type="submit" className={styles.primaryButton} disabled={saving || options.length === 0}><Icon name={editingId ? 'edit' : 'plus'} /> {saving ? 'Saqlanmoqda...' : editingId ? 'Yangilash' : "Dars qo'shish"}</button></div>
        </form>
      </section>

      <section className={styles.listCard}>
        <div className={styles.cardHead}><div><h2>Haftalik ro'yxat</h2><p>Darslar kun va boshlanish vaqti bo‘yicha tartiblangan.</p></div></div>
        {loading ? <div className={styles.empty}>Yuklanmoqda...</div> : lessons.length === 0 ? <div className={styles.empty}><Icon name="calendar" size={30} /><strong>Hozircha dars qo‘shilmagan</strong><span>Yuqoridagi forma orqali birinchi darsni qo‘shing.</span></div> : <div className={styles.days}>{grouped.map(day => day.lessons.length > 0 && <div className={styles.dayGroup} key={day.key}><h3>{day.label}<span>{day.lessons.length}</span></h3><div className={styles.lessonRows}>{day.lessons.map(lesson => <article className={styles.lessonRow} key={lesson._id}><div className={styles.time}><Icon name="clock" size={16} /><strong>{lesson.startTime}</strong><span>{lesson.endTime}</span></div><div className={styles.lessonMain}><strong>{lesson.subject?.name || 'Fan'}</strong><span><Icon name="class" size={15} /> {lesson.classId?.name || 'Sinf'}{lesson.room ? ` · ${lesson.room}` : ''}</span>{lesson.note && <small>{lesson.note}</small>}</div><div className={styles.rowActions}><button onClick={() => startEdit(lesson)} title="Tahrirlash"><Icon name="edit" size={17} /></button><button className={styles.deleteButton} onClick={() => removeLesson(lesson._id)} title="O'chirish"><Icon name="trash" size={17} /></button></div></article>)}</div></div>)}</div>}
      </section>
    </main>
  );
};

export default TeacherLessonList;
