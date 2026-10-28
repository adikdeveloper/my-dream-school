import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function classLabel(classItem) {
  if (!classItem) return '';
  if (classItem.grade !== null && classItem.grade !== undefined && classItem.grade !== '') {
    return `${classItem.grade}-${classItem.section}`;
  }
  return classItem.name || classItem.section || 'Sinf';
}

function gradeTone(grade) {
  if (grade === null || grade === undefined) return 'empty';
  if (grade >= 9) return 'excellent';
  if (grade >= 7) return 'good';
  if (grade >= 5) return 'average';
  return 'low';
}

const QUARTER_OPTIONS = [
  { value: 1, label: '1-chorak' },
  { value: 2, label: '2-chorak' },
  { value: 3, label: '3-chorak' },
  { value: 4, label: '4-chorak' }
];

const GradeCell = ({ subject, compact = false }) => {
  if (!subject || subject.grade === null || subject.grade === undefined) {
    return <span className="qg-empty" title="Bu chorakda baho yo'q">—</span>;
  }

  const title = [
    `${subject.name || 'Fan'}: ${subject.grade} ball`,
    `${subject.percent}%`,
    subject.gradeCount ? `${subject.gradeCount} ta baho` : null,
    subject.dailyCount ? `Kunlik: ${subject.dailyPercent}%` : null,
    subject.examCount ? `Imtihon: ${subject.examPercent}%` : null
  ].filter(Boolean).join(' • ');

  return (
    <div className={`qg-grade ${gradeTone(subject.grade)} ${compact ? 'compact' : ''}`} title={title}>
      <strong>{subject.grade}</strong>
      <small>{subject.percent}%</small>
    </div>
  );
};

const QuarterGrades = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const [quarter, setQuarter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [error, setError] = useState('');

  const yearOptions = useMemo(() => {
    const currentStartYear = parseInt(getCurrentAcademicYear().slice(0, 4), 10);
    return [currentStartYear - 1, currentStartYear, currentStartYear + 1]
      .map(year => `${year}-${year + 1}`);
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [classResponse, calendar] = await Promise.all([
        isTeacher
          ? apiService.getTeacherMyClasses()
          : apiService.getClasses().then(response => response.classes || []),
        apiService.getAcademicCalendar(academicYear)
      ]);

      const list = Array.isArray(classResponse)
        ? classResponse
        : (classResponse?.classes || []);

      setClasses(list);
      setSelectedClass(previous => (
        previous && list.some(item => String(item._id) === String(previous))
          ? previous
          : (list[0]?._id || '')
      ));

      const currentQuarter = calendar?.currentQuarter?.quarter || 1;
      setQuarter(previous => previous || String(currentQuarter));
    } catch (err) {
      setError(err.response?.data?.message || "Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [academicYear, isTeacher]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadGrades = useCallback(async () => {
    if (!selectedClass || !quarter) {
      setData(null);
      return;
    }

    setLoadingGrades(true);
    setError('');

    try {
      const response = await apiService.getClassQuarterGrades(selectedClass, {
        academicYear,
        quarter
      });
      setData(response);
    } catch (err) {
      setData(null);
      setError(err.response?.data?.message || 'Chorak baholarini hisoblashda xatolik yuz berdi');
    } finally {
      setLoadingGrades(false);
    }
  }, [academicYear, quarter, selectedClass]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const selectedClassInfo = classes.find(item => String(item._id) === String(selectedClass));
  const quarterInfo = data?.quarter;
  const subjects = data?.subjects || [];
  const students = data?.students || [];
  const summary = data?.summary || {};

  return (
    <div className="qg-page">
      <header className="qg-header">
        <div>
          <span className="qg-eyebrow">O'quv natijalari</span>
          <h1>Chorak baholari</h1>
          <p>
            Baholar admin yoki direktor belgilagan chorak sanalari asosida avtomatik
            hisoblanadi. Har bir fan bo'yicha 10 ballik chorak bahosi ko'rsatiladi.
          </p>
        </div>
        <div className="qg-header-badge">
          <span>Hisoblash</span>
          <strong>Avtomatik</strong>
          <small>80% → 8 · 70% → 7</small>
        </div>
      </header>

      <div className="qg-filters">
        <div className="qg-filter">
          <label htmlFor="qg-year">O'quv yili</label>
          <select
            id="qg-year"
            value={academicYear}
            onChange={event => setAcademicYear(event.target.value)}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="qg-filter">
          <label htmlFor="qg-quarter">Chorak</label>
          <select
            id="qg-quarter"
            value={quarter}
            onChange={event => setQuarter(event.target.value)}
          >
            {QUARTER_OPTIONS.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="qg-filter qg-filter-wide">
          <label htmlFor="qg-class">Sinf</label>
          <select
            id="qg-class"
            value={selectedClass}
            onChange={event => setSelectedClass(event.target.value)}
          >
            {classes.length === 0 && <option value="">Sinf topilmadi</option>}
            {classes.map(classItem => (
              <option key={classItem._id} value={classItem._id}>
                {classLabel(classItem)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="qg-refresh"
          onClick={loadGrades}
          disabled={loadingGrades || !selectedClass}
          title="Qayta hisoblash"
        >
          ↻ Yangilash
        </button>
      </div>

      {error && <div className="qg-alert">{error}</div>}

      {loading ? (
        <div className="qg-loading">
          <span className="qg-spinner" />
          <p>Sinflar va chorak sanalari yuklanmoqda...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="qg-empty-state">
          <span className="qg-empty-icon">🏫</span>
          <h2>Sinf topilmadi</h2>
          <p>Chorak baholarini ko'rish uchun avval sinf yaratilishi kerak.</p>
        </div>
      ) : (
        <>
          <div className="qg-summary">
            <div className="qg-summary-card primary">
              <span>O'rtacha o'zlashtirish</span>
              <strong>{summary.averagePercent !== null && summary.averagePercent !== undefined ? `${summary.averagePercent}%` : '—'}</strong>
              <small>{quarterInfo ? `${formatDate(quarterInfo.startDate)} — ${formatDate(quarterInfo.endDate)}` : 'Chorak sanalari'}</small>
            </div>
            <div className="qg-summary-card">
              <span>O'rtacha chorak bahosi</span>
              <strong>{summary.averageGrade ?? '—'}</strong>
              <small>{selectedClassInfo ? `${classLabel(selectedClassInfo)} sinf` : 'Sinf tanlanmagan'}</small>
            </div>
            <div className="qg-summary-card">
              <span>O'quvchilar</span>
              <strong>{summary.gradedStudentCount ?? 0}<em>/{summary.studentCount ?? students.length}</em></strong>
              <small>Baholangan / jami</small>
            </div>
            <div className="qg-summary-card">
              <span>Fanlar</span>
              <strong>{summary.subjectCount ?? subjects.length}</strong>
              <small>Chorakda hisoblangan</small>
            </div>
          </div>

          <section className="qg-table-card">
            <div className="qg-table-head">
              <div>
                <h2>{selectedClassInfo ? `${classLabel(selectedClassInfo)} sinf` : 'Sinf'} chorak baholari</h2>
                <p>
                  {quarterInfo ? `${quarterInfo.label} · ${formatDate(quarterInfo.startDate)} — ${formatDate(quarterInfo.endDate)}` : 'Chorak tanlanmagan'}
                </p>
              </div>
              <div className="qg-legend">
                <span><i className="excellent" /> 9–10</span>
                <span><i className="good" /> 7–8</span>
                <span><i className="average" /> 5–6</span>
                <span><i className="low" /> 1–4</span>
              </div>
            </div>

            {loadingGrades ? (
              <div className="qg-table-loading">
                <span className="qg-spinner small" />
                <p>Chorak baholari hisoblanmoqda...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="qg-empty-state compact">
                <span className="qg-empty-icon">📭</span>
                <h2>Ma'lumot yo'q</h2>
                <p>Bu sinfda o'quvchilar yoki chorak baholari topilmadi.</p>
              </div>
            ) : (
              <div className="qg-table-wrap">
                <table className="qg-table" style={{ minWidth: `${360 + subjects.length * 118}px` }}>
                  <thead>
                    <tr>
                      <th className="qg-sticky-col qg-num">№</th>
                      <th className="qg-sticky-col qg-student">O'quvchi</th>
                      {subjects.map(subject => (
                        <th key={subject._id} title={subject.name}>
                          <span className="qg-subject-name">{subject.name}</span>
                          {subject.code && <small>{subject.code}</small>}
                        </th>
                      ))}
                      <th className="qg-overall-head">Umumiy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student._id}>
                        <td className="qg-sticky-col qg-num">{index + 1}</td>
                        <td className="qg-sticky-col qg-student">
                          <div className="qg-student-name">
                            <span className="qg-avatar">
                              {(student.firstName || '?').charAt(0)}
                              {(student.lastName || '').charAt(0)}
                            </span>
                            <span>
                              <strong>{student.firstName} {student.lastName}</strong>
                              {student.studentId && <small>{student.studentId}</small>}
                            </span>
                          </div>
                        </td>
                        {subjects.map(subject => (
                          <td key={`${student._id}-${subject._id}`} className="qg-grade-cell">
                            <GradeCell subject={student.subjects?.[String(subject._id)]} />
                          </td>
                        ))}
                        <td className="qg-overall-cell">
                          <div className={`qg-overall ${gradeTone(student.overallGrade)}`}>
                            <strong>{student.overallGrade ?? '—'}</strong>
                            <small>{student.overallPercent !== null && student.overallPercent !== undefined ? `${student.overallPercent}%` : '—'}</small>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="qg-note">
            <span>ⓘ</span>
            <p>
              Chorak bahosi kunlik va imtihon baholarini foizga aylantirib, ularning
              o'rtachasidan hisoblanadi. Kunlik baho 0.5 yoki 5 ballik shkalada, imtihon
              esa <b>examMaxScore</b> bo'yicha hisobga olinadi. Natija 10 ballik tizimga
              yaxlitlanadi.
            </p>
          </div>
        </>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .qg-page {
    --qg-navy: #1e3a8a;
    --qg-navy-dark: #172554;
    --qg-slate-50: #f8fafc;
    --qg-slate-100: #f1f5f9;
    --qg-slate-200: #e2e8f0;
    --qg-slate-500: #64748b;
    --qg-slate-700: #334155;
    --qg-slate-900: #0f172a;
    min-height: 100%;
    padding: 1.75rem;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
    color: var(--qg-slate-900);
  }

  .qg-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.75rem 2rem;
    margin-bottom: 1.25rem;
    color: #fff;
    background: linear-gradient(135deg, #172554 0%, #1e3a8a 55%, #1d4ed8 100%);
    border-radius: 20px;
    box-shadow: 0 16px 40px rgba(30, 58, 138, .24);
  }

  .qg-eyebrow {
    display: inline-block;
    margin-bottom: .5rem;
    color: #fbbf24;
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .qg-header h1 {
    margin: 0 0 .4rem;
    font-size: 1.65rem;
    font-weight: 800;
    letter-spacing: -.02em;
  }

  .qg-header p {
    max-width: 640px;
    margin: 0;
    color: #dbeafe;
    font-size: .92rem;
    line-height: 1.55;
  }

  .qg-header-badge {
    min-width: 160px;
    padding: .85rem 1rem;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 14px;
  }

  .qg-header-badge span {
    display: block;
    color: #bfdbfe;
    font-size: .68rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .qg-header-badge strong {
    display: block;
    margin: .2rem 0 .15rem;
    color: #fff;
    font-size: 1.1rem;
    font-weight: 800;
  }

  .qg-header-badge small {
    color: #fde68a;
    font-size: .72rem;
    font-weight: 700;
  }

  .qg-filters {
    display: flex;
    align-items: flex-end;
    gap: .85rem;
    flex-wrap: wrap;
    padding: 1rem 1.15rem;
    margin-bottom: 1.25rem;
    background: #fff;
    border: 1px solid var(--qg-slate-200);
    border-radius: 14px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, .04);
  }

  .qg-filter {
    display: flex;
    flex-direction: column;
    gap: .35rem;
    min-width: 140px;
  }

  .qg-filter-wide {
    min-width: 220px;
  }

  .qg-filter label {
    color: var(--qg-slate-500);
    font-size: .7rem;
    font-weight: 800;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .qg-filter select {
    padding: .6rem .7rem;
    color: var(--qg-slate-900);
    background: var(--qg-slate-50);
    border: 1px solid var(--qg-slate-200);
    border-radius: 9px;
    font-size: .85rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .qg-filter select:focus {
    background: #fff;
    border-color: var(--qg-navy);
    box-shadow: 0 0 0 3px rgba(30, 58, 138, .1);
  }

  .qg-refresh {
    min-height: 38px;
    padding: .55rem 1rem;
    margin-left: auto;
    color: var(--qg-navy);
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 9px;
    font-size: .8rem;
    font-weight: 800;
    cursor: pointer;
    transition: background .18s ease, transform .18s ease;
  }

  .qg-refresh:hover:not(:disabled) {
    background: #dbeafe;
    transform: translateY(-1px);
  }

  .qg-refresh:disabled {
    cursor: not-allowed;
    opacity: .55;
  }

  .qg-alert {
    padding: .85rem 1rem;
    margin-bottom: 1rem;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    font-size: .85rem;
    font-weight: 600;
  }

  .qg-loading,
  .qg-table-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    min-height: 260px;
    color: var(--qg-slate-500);
    background: #fff;
    border: 1px solid var(--qg-slate-200);
    border-radius: 16px;
  }

  .qg-table-loading {
    min-height: 180px;
    border: 0;
    border-radius: 0;
  }

  .qg-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid #e2e8f0;
    border-top-color: var(--qg-navy);
    border-radius: 50%;
    animation: qg-spin .8s linear infinite;
  }

  .qg-spinner.small {
    width: 26px;
    height: 26px;
    border-width: 2px;
  }

  @keyframes qg-spin {
    to { transform: rotate(360deg); }
  }

  .qg-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .qg-summary-card {
    padding: 1rem 1.15rem;
    background: #fff;
    border: 1px solid var(--qg-slate-200);
    border-radius: 14px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, .04);
  }

  .qg-summary-card.primary {
    color: #fff;
    background: linear-gradient(135deg, var(--qg-navy-dark), #1d4ed8);
    border-color: transparent;
  }

  .qg-summary-card span {
    display: block;
    margin-bottom: .3rem;
    color: var(--qg-slate-500);
    font-size: .7rem;
    font-weight: 800;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .qg-summary-card.primary span { color: #bfdbfe; }

  .qg-summary-card strong {
    display: block;
    margin-bottom: .2rem;
    color: var(--qg-navy-dark);
    font-size: 1.6rem;
    font-weight: 800;
    line-height: 1.1;
  }

  .qg-summary-card.primary strong { color: #fff; }

  .qg-summary-card strong em {
    color: var(--qg-slate-500);
    font-size: .95rem;
    font-style: normal;
    font-weight: 700;
  }

  .qg-summary-card small {
    color: var(--qg-slate-500);
    font-size: .73rem;
  }

  .qg-summary-card.primary small { color: #dbeafe; }

  .qg-table-card {
    background: #fff;
    border: 1px solid var(--qg-slate-200);
    border-radius: 16px;
    box-shadow: 0 4px 18px rgba(15, 23, 42, .04);
    overflow: hidden;
  }

  .qg-table-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.15rem 1.25rem;
    border-bottom: 1px solid var(--qg-slate-100);
  }

  .qg-table-head h2 {
    margin: 0 0 .2rem;
    color: var(--qg-slate-900);
    font-size: 1rem;
    font-weight: 800;
  }

  .qg-table-head p {
    margin: 0;
    color: var(--qg-slate-500);
    font-size: .78rem;
  }

  .qg-legend {
    display: flex;
    align-items: center;
    gap: .75rem;
    flex-wrap: wrap;
  }

  .qg-legend span {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
    color: var(--qg-slate-500);
    font-size: .7rem;
    font-weight: 700;
  }

  .qg-legend i {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }

  .qg-legend i.excellent { background: #16a34a; }
  .qg-legend i.good { background: #2563eb; }
  .qg-legend i.average { background: #f59e0b; }
  .qg-legend i.low { background: #ef4444; }

  .qg-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .qg-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: .82rem;
  }

  .qg-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: .8rem .6rem;
    color: var(--qg-slate-500);
    background: var(--qg-slate-50);
    border-bottom: 1px solid var(--qg-slate-200);
    font-size: .68rem;
    font-weight: 800;
    letter-spacing: .03em;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .qg-table thead th.qg-student,
  .qg-table thead th.qg-num {
    text-align: left;
  }

  .qg-table thead th.qg-overall-head {
    color: var(--qg-navy);
    background: #eff6ff;
  }

  .qg-subject-name {
    display: block;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .qg-table thead th small {
    display: block;
    margin-top: .12rem;
    color: #94a3b8;
    font-size: .6rem;
    font-weight: 700;
  }

  .qg-table tbody td {
    padding: .55rem .6rem;
    border-bottom: 1px solid var(--qg-slate-100);
    text-align: center;
    vertical-align: middle;
  }

  .qg-table tbody tr:hover td {
    background: #fbfdff;
  }

  .qg-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .qg-sticky-col {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fff;
  }

  .qg-table tbody tr:hover .qg-sticky-col {
    background: #fbfdff;
  }

  .qg-num {
    width: 48px;
    color: #94a3b8;
    font-weight: 700;
  }

  .qg-student {
    min-width: 210px;
    text-align: left !important;
  }

  .qg-student-name {
    display: flex;
    align-items: center;
    gap: .55rem;
    text-align: left;
  }

  .qg-avatar {
    display: grid;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    place-items: center;
    color: var(--qg-navy);
    background: #dbeafe;
    border-radius: 50%;
    font-size: .68rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .qg-student-name strong {
    display: block;
    color: var(--qg-slate-900);
    font-size: .8rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .qg-student-name small {
    display: block;
    color: #94a3b8;
    font-size: .66rem;
  }

  .qg-grade-cell {
    min-width: 104px;
  }

  .qg-grade {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    padding: .3rem .45rem;
    border-radius: 10px;
    line-height: 1;
  }

  .qg-grade strong {
    font-size: 1.05rem;
    font-weight: 800;
  }

  .qg-grade small {
    margin-top: .18rem;
    font-size: .6rem;
    font-weight: 700;
    opacity: .85;
  }

  .qg-grade.excellent { color: #166534; background: #dcfce7; }
  .qg-grade.good { color: #1e40af; background: #dbeafe; }
  .qg-grade.average { color: #92400e; background: #fef3c7; }
  .qg-grade.low { color: #991b1b; background: #fee2e2; }
  .qg-grade.empty { color: #cbd5e1; background: transparent; font-size: 1rem; }

  .qg-overall-cell {
    min-width: 92px;
    background: #f8fbff;
  }

  .qg-overall {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 56px;
    padding: .4rem .55rem;
    border-radius: 11px;
    line-height: 1;
    box-shadow: 0 4px 10px rgba(15, 23, 42, .08);
  }

  .qg-overall strong {
    font-size: 1.15rem;
    font-weight: 900;
  }

  .qg-overall small {
    margin-top: .2rem;
    font-size: .62rem;
    font-weight: 800;
    opacity: .85;
  }

  .qg-overall.excellent { color: #fff; background: linear-gradient(135deg, #15803d, #22c55e); }
  .qg-overall.good { color: #fff; background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
  .qg-overall.average { color: #78350f; background: linear-gradient(135deg, #fde68a, #fbbf24); }
  .qg-overall.low { color: #fff; background: linear-gradient(135deg, #b91c1c, #ef4444); }
  .qg-overall.empty { color: #94a3b8; background: #f1f5f9; box-shadow: none; }

  .qg-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    min-height: 300px;
    padding: 2rem;
    text-align: center;
    background: #fff;
    border: 1px solid var(--qg-slate-200);
    border-radius: 16px;
  }

  .qg-empty-state.compact {
    min-height: 200px;
    border: 0;
    border-radius: 0;
  }

  .qg-empty-icon {
    font-size: 2.4rem;
  }

  .qg-empty-state h2 {
    margin: 0;
    color: var(--qg-slate-900);
    font-size: 1rem;
    font-weight: 800;
  }

  .qg-empty-state p {
    margin: 0;
    color: var(--qg-slate-500);
    font-size: .82rem;
  }

  .qg-note {
    display: flex;
    gap: .75rem;
    margin-top: 1rem;
    padding: .9rem 1rem;
    color: var(--qg-slate-500);
    background: #fff;
    border: 1px solid var(--qg-slate-200);
    border-left: 4px solid var(--qg-navy);
    border-radius: 12px;
    font-size: .78rem;
    line-height: 1.55;
  }

  .qg-note > span {
    color: var(--qg-navy);
    font-weight: 900;
  }

  .qg-note p { margin: 0; }
  .qg-note b { color: var(--qg-slate-700); }

  @media (max-width: 1100px) {
    .qg-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 700px) {
    .qg-page { padding: 1rem; }
    .qg-header { flex-direction: column; padding: 1.35rem; }
    .qg-header-badge { width: 100%; }
    .qg-filters { flex-direction: column; align-items: stretch; }
    .qg-filter, .qg-filter-wide { min-width: 0; }
    .qg-refresh { margin-left: 0; width: 100%; }
    .qg-summary { grid-template-columns: 1fr; }
    .qg-table-head { flex-direction: column; }
    .qg-student { min-width: 170px; }
  }
`;

export default QuarterGrades;
