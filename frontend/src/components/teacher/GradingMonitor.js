import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/authService';
import apiService from '../../services/apiService';
import { getDefaultQuarterNumber, getQuarterErrorMessage } from '../../utils/quarterUi';
import TeacherUiIcon from './TeacherUiIcon';
import styles from './GradingMonitor.module.css';

const schoolDate = () => new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);

const QUARTER_OPTIONS = [
  { value: 1, label: '1-chorak' },
  { value: 2, label: '2-chorak' },
  { value: 3, label: '3-chorak' },
  { value: 4, label: '4-chorak' }
];

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function formatDateKey(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function gradeTone(grade) {
  if (grade === null || grade === undefined) return 'empty';
  if (grade >= 9) return 'excellent';
  if (grade >= 7) return 'good';
  if (grade >= 5) return 'average';
  return 'low';
}

function percentTone(percent) {
  if (percent === null || percent === undefined) return 'empty';
  if (percent >= 80) return 'good';
  if (percent >= 50) return 'average';
  return 'low';
}

function classLabel(classItem) {
  if (!classItem) return '';
  if (classItem.grade !== null && classItem.grade !== undefined && classItem.grade !== '') {
    return `${classItem.grade}-${classItem.section}`;
  }
  return classItem.label || classItem.name || classItem.section || 'Sinf';
}

function TodayGradingWidget() {
  const [date] = useState(schoolDate);
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
  const rows = pending.slice(0, 4);

  return (
    <section className={styles.panel} aria-label="Baholash nazorati">
      <header className={styles.header}>
        <div>
          <h2>Baholash nazorati</h2>
          <p>Biriktirilgan sinfdagi yakunlangan darslar</p>
        </div>
        <Link to="/teacher/grading-monitor">Barchasini ko'rish</Link>
      </header>
      {loading ? <p role="status">Yuklanmoqda…</p> : error ? (
        <p role="status">{error} <button type="button" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Qayta yuklash</button></p>
      ) : (
        <>
          <p className={styles.summary}>{pending.length} ta darsda baholar yetishmaydi · {lessons.length - pending.length} ta darsda me'yor bajarilgan</p>
          {rows.length ? (
            <div className={styles.scroll}>
              <table>
                <thead><tr><th>Sinf</th><th>Fan</th><th>O'qituvchi</th><th>Baho / me'yor</th><th>Holat</th></tr></thead>
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

function SubjectGradingMonitor() {
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classId, setClassId] = useState('');
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const [quarter, setQuarter] = useState('');
  const [overview, setOverview] = useState(null);
  const [quarterGrades, setQuarterGrades] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gradesError, setGradesError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('subjects');
  const [detailSubjectId, setDetailSubjectId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailFilter, setDetailFilter] = useState('missing');
  const [studentSearch, setStudentSearch] = useState('');

  const yearOptions = useMemo(() => {
    const currentStartYear = parseInt(getCurrentAcademicYear().slice(0, 4), 10);
    return [currentStartYear - 1, currentStartYear, currentStartYear + 1]
      .map(year => `${year}-${year + 1}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setClassesLoading(true);
    apiService.getTeacherAssignedClasses()
      .then((list) => {
        if (cancelled) return;
        const items = Array.isArray(list) ? list : [];
        setClasses(items);
        setClassId(previous => (
          previous && items.some(item => String(item._id) === String(previous))
            ? previous
            : (items[0]?._id || '')
        ));
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiService.getAcademicCalendar(academicYear)
      .then((data) => {
        if (cancelled) return;
        const defaultQuarter = getDefaultQuarterNumber(data?.currentQuarter);
        setQuarter(previous => (
          previous && data?.quarters?.some(item => Number(item.quarter) === Number(previous))
            ? previous
            : String(defaultQuarter)
        ));
      })
      .catch((err) => {
        if (cancelled) return;
        setQuarter(previous => previous || '1');
        setError(getQuarterErrorMessage(err, "Chorak sanalarini yuklab bo'lmadi"));
      });
    return () => { cancelled = true; };
  }, [academicYear]);

  useEffect(() => {
    if (!classId || !quarter) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setGradesError('');

    Promise.allSettled([
      apiService.getTeacherGradingMonitorSubjects({ classId, academicYear, quarter }),
      apiService.getTeacherGradingMonitorQuarterGrades({ classId, academicYear, quarter })
    ]).then(([subjectsResult, gradesResult]) => {
      if (cancelled) return;

      if (subjectsResult.status === 'rejected') {
        setOverview(null);
        setQuarterGrades(null);
        setError(getQuarterErrorMessage(subjectsResult.reason, "Baholash nazoratini yuklab bo'lmadi"));
        return;
      }

      setOverview(subjectsResult.value);
      if (gradesResult.status === 'fulfilled') {
        setQuarterGrades(gradesResult.value);
      } else {
        setQuarterGrades(null);
        setGradesError(getQuarterErrorMessage(gradesResult.reason, "Chorak baholarini yuklab bo'lmadi"));
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [classId, quarter, academicYear, refresh]);

  useEffect(() => {
    if (!detailSubjectId || !classId || !quarter) return undefined;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');

    apiService.getTeacherGradingMonitorSubject(detailSubjectId, { classId, academicYear, quarter })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(getQuarterErrorMessage(err, "Fan ma'lumotlarini yuklab bo'lmadi"));
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => { cancelled = true; };
  }, [detailSubjectId, classId, quarter, academicYear, refresh]);

  useEffect(() => {
    setDetailSubjectId('');
    setDetail(null);
    setStudentSearch('');
  }, [classId, academicYear, quarter]);

  const selectedClass = classes.find(item => String(item._id) === String(classId));
  const subjects = useMemo(() => overview?.subjects || [], [overview]);
  const summary = overview?.summary || {};
  const detailSubject = subjects.find(item => String(item._id) === String(detailSubjectId));
  const detailDays = detail?.days || [];

  const missingDays = detailDays.filter(day => !day.graded);
  const gradedDays = detailDays.filter(day => day.graded);
  const visibleDays = detailFilter === 'missing'
    ? missingDays
    : detailFilter === 'graded'
      ? gradedDays
      : detailDays;

  const overallByStudent = useMemo(() => new Map(
    (quarterGrades?.students || []).map(student => [String(student._id), student])
  ), [quarterGrades]);

  const search = studentSearch.trim().toLowerCase();
  const matchesSearch = (student) => (
    !search
    || `${student.firstName || ''} ${student.lastName || ''} ${student.studentId || ''}`.toLowerCase().includes(search)
  );

  const detailStudents = (detail?.students || []).filter(matchesSearch);
  const matrixStudents = (quarterGrades?.students || []).filter(matchesSearch);

  const matrixSubjects = useMemo(() => {
    const map = new Map();
    for (const subject of subjects) {
      map.set(String(subject._id), subject);
    }
    for (const subject of quarterGrades?.subjects || []) {
      if (!map.has(String(subject._id))) map.set(String(subject._id), subject);
    }
    return [...map.values()];
  }, [subjects, quarterGrades]);

  const openSubject = (subject) => {
    setDetailSubjectId(String(subject._id));
    setDetail(null);
    setDetailFilter('missing');
    setStudentSearch('');
  };

  const closeSubject = () => {
    setDetailSubjectId('');
    setDetail(null);
    setDetailError('');
    setStudentSearch('');
  };

  const changeClass = (value) => {
    setClassId(value);
    setActiveTab('subjects');
  };

  if (classesLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} />
          <p>Biriktirilgan sinflar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!classes.length) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}><TeacherUiIcon name="report" size={30} /></span>
          <h2>Sinf biriktirilmagan</h2>
          <p>Baholash nazorati faqat sizga sinf rahbari sifatida biriktirilgan sinf uchun ochiladi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>O'quv nazorati</span>
          <h1>Baholash nazorati</h1>
          <p>
            {classLabel(selectedClass)} sinf bo'yicha fanlar, o'qituvchilar va baholash qamrovi.
            Fan ustiga bosib baholanmagan kunlarni va o'quvchilar chorak baholarini ko'ring.
          </p>
        </div>
        <div className={styles.headerBadge}>
          <span>Umumiy qamrov</span>
          <strong>{summary.gradedPercent !== null && summary.gradedPercent !== undefined ? `${summary.gradedPercent}%` : '—'}</strong>
          <small>{overview?.quarter?.label || 'Chorak'}</small>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filter}>
          <span>Sinf</span>
          <select value={classId} onChange={(event) => changeClass(event.target.value)}>
            {classes.map(item => (
              <option key={item._id} value={item._id}>{classLabel(item)}</option>
            ))}
          </select>
        </label>

        <label className={styles.filter}>
          <span>O'quv yili</span>
          <select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>
            {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        <label className={styles.filter}>
          <span>Chorak</span>
          <select value={quarter} onChange={(event) => setQuarter(event.target.value)}>
            {QUARTER_OPTIONS.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={styles.refresh}
          onClick={() => setRefresh(value => value + 1)}
          disabled={loading}
        >
          <TeacherUiIcon name="swap" size={14} /> Yangilash
        </button>
      </div>

      {error && <div className={styles.alert}>{error}</div>}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Fanlar</span>
          <strong>{summary.subjectCount ?? subjects.length}</strong>
          <small>{overview?.class?.studentsCount ?? 0} ta o'quvchi</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Darslar</span>
          <strong>{summary.totalLessons ?? 0}</strong>
          <small>{summary.totalPeriods ?? 0} soat dars</small>
        </div>
        <div className={`${styles.summaryCard} ${styles.ok}`}>
          <span>Baholangan</span>
          <strong>{summary.coverageGradedLessons ?? summary.gradedLessons ?? 0}</strong>
          <small>o'quvchi-dars</small>
        </div>
        <div className={`${styles.summaryCard} ${styles.warn}`}>
          <span>Baholanmagan</span>
          <strong>{summary.coverageMissingLessons ?? summary.missingLessons ?? 0}</strong>
          <small>o'quvchi-dars</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Chorak</span>
          <strong>{overview?.quarter?.label?.replace('-chorak', '') || '—'}</strong>
          <small>
            {overview?.quarter?.hasStarted === false
              ? 'Hali boshlanmagan'
              : overview?.quarter?.isCompleted ? 'Yakunlangan' : 'Joriy'}
          </small>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Baholash nazorati bo'limlari">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'subjects'}
          className={`${styles.tab} ${activeTab === 'subjects' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          Fanlar bo'yicha
          <span>{subjects.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'students'}
          className={`${styles.tab} ${activeTab === 'students' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('students')}
        >
          O'quvchilar chorak baholari
          <span>{matrixStudents.length}</span>
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingCard}>
          <span className={styles.spinner} />
          <p>Baholash nazorati hisoblanmoqda...</p>
        </div>
      ) : activeTab === 'subjects' ? (
        detailSubjectId ? (
          <section className={styles.detail}>
            <div className={styles.detailHead}>
              <button type="button" className={styles.backButton} onClick={closeSubject}>
                ← Fanlar ro'yxati
              </button>
              <div className={styles.detailTitle}>
                <span className={styles.subjectIcon}><TeacherUiIcon name="book" size={20} /></span>
                <div>
                  <h2>{detail?.subject?.name || detailSubject?.name || 'Fan'}</h2>
                  <p>
                    {(detail?.subject?.teachers || [])
                      .map(teacher => teacher.name)
                      .filter(Boolean)
                      .join(', ') || detailSubject?.teacherName || "O'qituvchi biriktirilmagan"}
                  </p>
                </div>
              </div>
              <div className={styles.detailPercent}>
                <strong>
                  {detail?.summary?.gradedPercent !== null && detail?.summary?.gradedPercent !== undefined
                    ? `${detail.summary.gradedPercent}%`
                    : detailSubject?.gradedPercent !== null && detailSubject?.gradedPercent !== undefined
                      ? `${detailSubject.gradedPercent}%`
                      : '—'}
                </strong>
                <small>o'quvchilar qamrovi</small>
              </div>
            </div>

            {detailError && <div className={styles.alert}>{detailError}</div>}

            {detailLoading ? (
              <div className={styles.loadingCard}>
                <span className={styles.spinner} />
                <p>Fan ma'lumotlari yuklanmoqda...</p>
              </div>
            ) : detail ? (
              <>
                <div className={styles.detailStats}>
                  <div><span>Jami kun</span><strong>{detail.summary.totalLessons}</strong></div>
                  <div><span>Baholangan</span><strong>{detail.summary.gradedLessons}</strong></div>
                  <div><span>Baholanmagan</span><strong>{detail.summary.missingLessons}</strong></div>
                  <div><span>Soat</span><strong>{detail.summary.totalPeriods}</strong></div>
                  <div><span>Chorak bahosi chiqdi</span><strong>{detail.summary.issuedStudentCount}/{detail.summary.studentCount}</strong></div>
                </div>

                <div className={styles.detailSection}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h3>Dars kunlari</h3>
                      <p>Baholanmagan yoki baholangan kunlarni filtrlang</p>
                    </div>
                    <div className={styles.segmented} role="group" aria-label="Kunlar filtri">
                      <button
                        type="button"
                        className={detailFilter === 'missing' ? styles.segmentActive : ''}
                        onClick={() => setDetailFilter('missing')}
                      >
                        Baholanmagan <b>{missingDays.length}</b>
                      </button>
                      <button
                        type="button"
                        className={detailFilter === 'graded' ? styles.segmentActive : ''}
                        onClick={() => setDetailFilter('graded')}
                      >
                        Baholangan <b>{gradedDays.length}</b>
                      </button>
                      <button
                        type="button"
                        className={detailFilter === 'all' ? styles.segmentActive : ''}
                        onClick={() => setDetailFilter('all')}
                      >
                        Barchasi <b>{detailDays.length}</b>
                      </button>
                    </div>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Sana</th>
                          <th>Hafta kuni</th>
                          <th>Dars vaqti</th>
                          <th>O'qituvchi</th>
                          <th>Baholangan o'quvchilar</th>
                          <th>Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDays.map(day => (
                          <tr key={day.dateKey}>
                            <td className={styles.strongCell}>{formatDateKey(day.dateKey)}</td>
                            <td>{day.weekday}</td>
                            <td>{day.time || "—"}</td>
                            <td>{(day.teacherNames || []).join(', ') || '—'}</td>
                            <td>
                              <span className={styles.countCell}>
                                {day.gradedCount} / {day.eligibleCount}
                                {day.targetCount > 0 && (
                                  <small>me'yor {day.targetCount}</small>
                                )}
                              </span>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${day.status === 'missing' ? styles.badgeMissing : day.status === 'partial' ? styles.badgePartial : styles.badgeComplete}`}>
                                {day.status === 'missing' ? 'Baholanmagan' : day.status === 'partial' ? 'Qisman' : 'Bajarilgan'}
                              </span>
                              {day.missingStudents?.length > 0 && (
                                <span className={styles.missingNames} title={day.missingStudents.map(student => student.name).join(', ')}>
                                  {day.missingStudents.length} ta o'quvchi
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!visibleDays.length && (
                          <tr>
                            <td colSpan={6} className={styles.noRows}>
                              {detailDays.length === 0
                                ? "Bu fan bo'yicha chorakda dars jadvali topilmadi."
                                : detailFilter === 'missing'
                                  ? "Baholanmagan kunlar yo'q — barcha darslarga baho kiritilgan."
                                  : "Bu filtr bo'yicha kunlar topilmadi."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h3>O'quvchilar chorak baholari</h3>
                      <p>Fan bo'yicha qamrov va 20% qoidasi asosida chiqarilgan baho</p>
                    </div>
                    <label className={styles.search}>
                      <TeacherUiIcon name="search" size={15} />
                      <input
                        type="search"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="O'quvchini qidirish"
                      />
                    </label>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>O'quvchi</th>
                          <th>Baholangan darslar</th>
                          <th>Qamrov</th>
                          <th>Fan chorak bahosi</th>
                          <th>Umumiy chorak</th>
                          <th>Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailStudents.map(student => {
                          const overall = overallByStudent.get(String(student._id));
                          return (
                            <tr key={student._id} className={student.blocked ? styles.blockedRow : ''}>
                              <td>
                                <div className={styles.studentCell}>
                                  <span className={styles.avatar}>
                                    {(student.firstName || '?').charAt(0)}{(student.lastName || '').charAt(0)}
                                  </span>
                                  <span>
                                    <strong>{student.firstName} {student.lastName}</strong>
                                    {student.studentId && <small>{student.studentId}</small>}
                                  </span>
                                </div>
                              </td>
                              <td>{student.gradedLessons} / {student.totalLessons}</td>
                              <td>
                                <span className={`${styles.coverage} ${styles[percentTone(student.coveragePercent)] || ''}`}>
                                  {student.coveragePercent !== null && student.coveragePercent !== undefined
                                    ? `${student.coveragePercent}%`
                                    : '—'}
                                </span>
                              </td>
                              <td>
                                <span className={`${styles.gradePill} ${styles[gradeTone(student.grade)] || ''}`}>
                                  {student.issued ? student.grade : '—'}
                                </span>
                              </td>
                              <td>
                                <span className={`${styles.gradePill} ${styles[gradeTone(overall?.overallGrade)] || ''}`}>
                                  {overall?.overallGrade ?? '—'}
                                </span>
                              </td>
                              <td>
                                {student.blocked ? (
                                  <span className={styles.blockedText}>
                                    {student.blockedReason || "20% dan ko'p dars baholanmagan"}
                                  </span>
                                ) : student.issued ? (
                                  <span className={styles.issuedText}>Chiqarilgan</span>
                                ) : (
                                  <span className={styles.mutedText}>Baho yo'q</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {!detailStudents.length && (
                          <tr>
                            <td colSpan={6} className={styles.noRows}>O'quvchilar topilmadi.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.note}>
                    <span>i</span>
                    <p>
                      O'quvchining fan bo'yicha dars soatlarining <b>20% dan ko'prog'iga</b> baho
                      qo'yilmagan bo'lsa, ushbu fan bo'yicha chorak bahosi chiqarilmaydi. Darsda
                      qatnashmagan (kelmagan yoki sababli) kunlar hisobga olinmaydi.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        ) : (
          <section className={styles.tableCard}>
            <div className={styles.tableHead}>
              <div>
                <h2>{classLabel(selectedClass)} sinf fanlari</h2>
                <p>Fan ustiga bosing — baholanmagan kunlar va o'quvchilar chorak baholari ochiladi.</p>
              </div>
              <span className={styles.legend}>
                <i className={styles.legendGood} /> 80%+ &nbsp;
                <i className={styles.legendAverage} /> 50–79% &nbsp;
                <i className={styles.legendLow} /> &lt;50%
              </span>
            </div>

            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.subjectsTable}`}>
                <thead>
                  <tr>
                    <th>Fan</th>
                    <th>O'qituvchi</th>
                    <th>Umumiy baholash</th>
                    <th>Dars kunlari</th>
                    <th>Baholanmagan soat</th>
                    <th>Holat</th>
                    <th aria-label="Batafsil" />
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => (
                    <tr
                      key={subject._id}
                      className={styles.clickableRow}
                      tabIndex={0}
                      role="button"
                      onClick={() => openSubject(subject)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openSubject(subject);
                        }
                      }}
                    >
                      <td>
                        <div className={styles.subjectCell}>
                          <span
                            className={styles.subjectDot}
                            style={subject.color ? { background: subject.color } : undefined}
                          />
                          <span>
                            <strong>{subject.name || 'Fan'}</strong>
                            {subject.code && <small>{subject.code}</small>}
                          </span>
                        </div>
                      </td>
                      <td>{subject.teacherName || "Biriktirilmagan"}</td>
                      <td>
                        <div className={styles.progressCell}>
                          <div className={styles.progress}>
                            <span
                              className={styles[percentTone(subject.gradedPercent)] || ''}
                              style={{ width: `${subject.gradedPercent ?? 0}%` }}
                            />
                          </div>
                          <strong>{subject.gradedPercent !== null && subject.gradedPercent !== undefined ? `${subject.gradedPercent}%` : '—'}</strong>
                        </div>
                      </td>
                      <td>{subject.totalLessons} kun</td>
                      <td>
                        <span className={subject.coverage?.missingLessons > 0 ? styles.missingCount : styles.mutedText}>
                          {subject.coverage?.missingLessons ?? subject.missingLessons}
                        </span>
                      </td>
                      <td>
                        {subject.totalLessons === 0 || subject.coverage?.totalLessons === 0 ? (
                          <span className={`${styles.badge} ${styles.badgeNoSchedule}`}>Jadval yo'q</span>
                        ) : subject.gradedPercent !== null && subject.gradedPercent >= 99 ? (
                          <span className={`${styles.badge} ${styles.badgeComplete}`}>To'liq</span>
                        ) : subject.gradedPercent !== null && subject.gradedPercent < 50 ? (
                          <span className={`${styles.badge} ${styles.badgeMissing}`}>Kam</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgePartial}`}>Qisman</span>
                        )}
                      </td>
                      <td className={styles.arrowCell}>→</td>
                    </tr>
                  ))}
                  {!subjects.length && (
                    <tr>
                      <td colSpan={7} className={styles.noRows}>
                        Bu chorakda fanlar yoki dars jadvali topilmadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )
      ) : (
        <section className={styles.tableCard}>
          <div className={styles.tableHead}>
            <div>
              <h2>O'quvchilar chorak baholari</h2>
              <p>
                {overview?.quarter?.label || 'Chorak'} · {classLabel(selectedClass)} sinf.
                Baholanmagan darslar 20% dan oshsa, fan bahosi chiqarilmaydi.
              </p>
            </div>
            <label className={styles.search}>
              <TeacherUiIcon name="search" size={15} />
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="O'quvchini qidirish"
              />
            </label>
          </div>

          {gradesError && <div className={styles.alert}>{gradesError}</div>}

          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.matrixTable}`}>
              <thead>
                <tr>
                  <th className={styles.stickyCol}>O'quvchi</th>
                  {matrixSubjects.map(subject => (
                    <th key={subject._id} title={subject.name}>{subject.name}</th>
                  ))}
                  <th className={styles.overallHead}>Umumiy</th>
                </tr>
              </thead>
              <tbody>
                {matrixStudents.map(student => (
                  <tr key={student._id}>
                    <td className={styles.stickyCol}>
                      <div className={styles.studentCell}>
                        <span className={styles.avatar}>
                          {(student.firstName || '?').charAt(0)}{(student.lastName || '').charAt(0)}
                        </span>
                        <span>
                          <strong>{student.firstName} {student.lastName}</strong>
                          {student.studentId && <small>{student.studentId}</small>}
                        </span>
                      </div>
                    </td>
                    {matrixSubjects.map(subject => {
                      const cell = student.subjects?.[String(subject._id)];
                      const blocked = Boolean(cell?.blocked);
                      const issued = Boolean(cell?.issued);
                      const title = blocked
                        ? `${subject.name}: ${cell.missingLessons} soat (${cell.coveragePercent}% qamrov) — 20% qoidasi bo'yicha baho chiqarilmagan`
                        : cell?.percent !== null && cell?.percent !== undefined
                          ? `${subject.name}: ${cell.percent}%`
                          : `${subject.name}: baho yo'q`;
                      return (
                        <td key={`${student._id}-${subject._id}`}>
                          <span
                            className={`${styles.matrixGrade} ${styles[blocked ? 'blocked' : gradeTone(issued ? cell.grade : null)] || ''}`}
                            title={title}
                          >
                            {issued ? cell.grade : '—'}
                            {issued && cell.percent !== null && cell.percent !== undefined && (
                              <small>{cell.percent}%</small>
                            )}
                          </span>
                        </td>
                      );
                    })}
                    <td>
                      <span className={`${styles.overallGrade} ${styles[gradeTone(student.overallGrade)] || ''}`}>
                        <strong>{student.overallGrade ?? '—'}</strong>
                        {student.overallPercent !== null && student.overallPercent !== undefined && (
                          <small>{student.overallPercent}%</small>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {!matrixStudents.length && (
                  <tr>
                    <td colSpan={matrixSubjects.length + 2} className={styles.noRows}>
                      {quarterGrades ? "O'quvchilar topilmadi." : "Chorak baholari yuklanmadi."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.note}>
            <span>i</span>
            <p>
              Har bir fan bo'yicha o'quvchi dars soatlarining <b>20% dan ko'prog'iga</b> baho
              qo'yilmagan bo'lsa, chorak bahosi ko'rsatilmaydi. Umumiy baho faqat chiqarilgan
              fan baholari asosida hisoblanadi.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

export default function GradingMonitor({ compact = false }) {
  return compact ? <TodayGradingWidget /> : <SubjectGradingMonitor />;
}
