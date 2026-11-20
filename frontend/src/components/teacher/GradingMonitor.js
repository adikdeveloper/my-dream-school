import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/authService';
import styles from './GradingMonitor.module.css';

const schoolDate = () => new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);

export default function GradingMonitor({ compact = false }) {
  const [date, setDate] = useState(schoolDate);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { data } = await api.get('/stats/teacher/grading-monitor', { params: { date }, signal: controller.signal });
        if (!controller.signal.aborted) {
          setLessons(data.lessons);
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.data?.message || "Baholash holatini yuklab bo'lmadi");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [date, refresh]);

  const pending = lessons.filter((lesson) => !lesson.completed);
  const rows = compact ? pending.slice(0, 4) : [...pending, ...lessons.filter((lesson) => lesson.completed)];

  return (
    <section className={styles.panel} aria-label="Baholash nazorati">
      <header className={styles.header}>
        <div>
          <h2>Baholash nazorati</h2>
          <p>Biriktirilgan sinflardagi yakunlangan darslar</p>
        </div>
        {compact ? <Link to="/teacher/grading-monitor">Barchasini ko'rish</Link> : (
          <label>Sana <input type="date" value={date} max={schoolDate()} onChange={(event) => {
            if (!event.target.value) return;
            setLoading(true);
            setDate(event.target.value);
          }} /></label>
        )}
      </header>
      {loading ? <p role="status">Yuklanmoqda…</p> : error ? (
        <p role="status">{error} <button type="button" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Qayta yuklash</button></p>
      ) : (
        <>
          <p className={styles.summary}>{pending.length} ta darsda baholar yetishmaydi · {lessons.length - pending.length} ta darsda me’yor bajarilgan</p>
          {rows.length ? (
            <div className={styles.scroll}>
              <table>
                <thead><tr><th>Sinf</th><th>Fan</th><th>O'qituvchi</th><th>Baho / me’yor</th><th>Holat</th></tr></thead>
                <tbody>{rows.map((lesson) => (
                  <tr key={`${lesson.classId}|${lesson.subjectId}|${lesson.teacherId}`}>
                    <td>{lesson.className}</td>
                    <td>{lesson.subjectName}</td>
                    <td>{lesson.teacherName}</td>
                    <td>{lesson.graded} / {lesson.required}</td>
                    <td><span className={lesson.completed ? styles.complete : styles.pending}>{lesson.completed ? 'Bajarilgan' : 'Yetishmaydi'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p>{lessons.length ? 'Baholar yetishmayotgan darslar yo‘q.' : 'Bu sanada yakunlangan darslar topilmadi.'}</p>}
        </>
      )}
    </section>
  );
}
