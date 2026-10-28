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

function gradeTone(grade) {
  if (grade === null || grade === undefined) return 'empty';
  if (grade >= 9) return 'excellent';
  if (grade >= 7) return 'good';
  if (grade >= 5) return 'average';
  return 'low';
}

function quarterStatus(quarter, currentQuarter) {
  if (currentQuarter?.quarter === quarter.quarter) {
    if (currentQuarter.status === 'current') return { key: 'current', label: 'Joriy chorak' };
    if (currentQuarter.status === 'upcoming') return { key: 'upcoming', label: 'Kelgusi' };
    return { key: 'past', label: 'Tugagan' };
  }

  const end = new Date(quarter.endDate);
  if (!Number.isNaN(end.getTime())) {
    end.setUTCHours(23, 59, 59, 999);
    if (end < new Date()) {
      return { key: 'past', label: 'Tugagan' };
    }
  }
  return { key: 'upcoming', label: 'Kelgusi' };
}

const StudentQuarterGrades = () => {
  const { user } = useAuth();
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const [data, setData] = useState(null);
  const [activeQuarter, setActiveQuarter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const yearOptions = useMemo(() => {
    const currentStartYear = parseInt(getCurrentAcademicYear().slice(0, 4), 10);
    return [currentStartYear - 1, currentStartYear, currentStartYear + 1]
      .map(year => `${year}-${year + 1}`);
  }, []);

  const load = useCallback(async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiService.getStudentQuarterGrades(user._id, { academicYear });
      setData(response);

      const quarters = response?.quarters || [];
      const currentQuarter = response?.calendar?.currentQuarter?.quarter;
      const withGrades = quarters.find(quarter => quarter.subjects?.length > 0);

      setActiveQuarter(String(currentQuarter || withGrades?.quarter || quarters[0]?.quarter || 1));
    } catch (err) {
      setData(null);
      setError(err.response?.data?.message || 'Chorak baholarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [academicYear, user?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const quarters = data?.quarters || [];
  const currentQuarter = data?.calendar?.currentQuarter;
  const selectedQuarter = quarters.find(quarter => Number(quarter.quarter) === Number(activeQuarter)) || quarters[0];
  const status = selectedQuarter ? quarterStatus(selectedQuarter, currentQuarter) : null;

  return (
    <div className="sq-page">
      <header className="sq-header">
        <div>
          <span className="sq-eyebrow">Mening natijalarim</span>
          <h1>Chorak baholari</h1>
          <p>
            {user?.firstName} {user?.lastName} — choraklik baholar o'qituvchi qo'ygan
            baholar asosida avtomatik shakllanadi.
          </p>
        </div>
        <div className="sq-year">
          <label htmlFor="sq-year">O'quv yili</label>
          <select
            id="sq-year"
            value={academicYear}
            onChange={event => setAcademicYear(event.target.value)}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </header>

      {error && <div className="sq-alert">{error}</div>}

      {loading ? (
        <div className="sq-loading">
          <span className="sq-spinner" />
          <p>Chorak baholari yuklanmoqda...</p>
        </div>
      ) : quarters.length === 0 ? (
        <div className="sq-empty">
          <span className="sq-empty-icon">📘</span>
          <h2>Chorak baholari topilmadi</h2>
          <p>Bu o'quv yilida hali baholar kiritilmagan.</p>
        </div>
      ) : (
        <>
          <div className="sq-tabs" role="tablist" aria-label="Choraklar">
            {quarters.map(quarter => {
              const quarterState = quarterStatus(quarter, currentQuarter);
              const isActive = Number(activeQuarter) === Number(quarter.quarter);

              return (
                <button
                  key={quarter.quarter}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`sq-tab ${isActive ? 'active' : ''} ${quarterState.key}`}
                  onClick={() => setActiveQuarter(String(quarter.quarter))}
                >
                  <span className="sq-tab-top">
                    <span>{quarter.label}</span>
                    <i className={`sq-dot ${quarterState.key}`} title={quarterState.label} />
                  </span>
                  <strong>{quarter.overallGrade ?? '—'}</strong>
                  <small>
                    {quarter.overallPercent !== null && quarter.overallPercent !== undefined
                      ? `${quarter.overallPercent}%`
                      : "Baho yo'q"}
                  </small>
                </button>
              );
            })}
          </div>

          {selectedQuarter && (
            <>
              <section className="sq-overview">
                <div className="sq-overview-main">
                  <div className={`sq-ring ${gradeTone(selectedQuarter.overallGrade)}`}>
                    <span>{selectedQuarter.overallGrade ?? '—'}</span>
                  </div>
                  <div className="sq-overview-text">
                    <span className="sq-status">{status?.label}</span>
                    <h2>{selectedQuarter.label} yakuni</h2>
                    <p>
                      {formatDate(selectedQuarter.startDate)} — {formatDate(selectedQuarter.endDate)}
                    </p>
                  </div>
                </div>

                <div className="sq-overview-stats">
                  <div>
                    <span>O'rtacha</span>
                    <strong>
                      {selectedQuarter.overallPercent !== null && selectedQuarter.overallPercent !== undefined
                        ? `${selectedQuarter.overallPercent}%`
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Baholar</span>
                    <strong>{selectedQuarter.gradeCount || 0}</strong>
                  </div>
                  <div>
                    <span>Kunlik</span>
                    <strong>{selectedQuarter.dailyCount || 0}</strong>
                  </div>
                  <div>
                    <span>Imtihon</span>
                    <strong>{selectedQuarter.examCount || 0}</strong>
                  </div>
                </div>
              </section>

              <section className="sq-subjects-card">
                <div className="sq-subjects-head">
                  <div>
                    <h2>Fanlar bo'yicha chorak bahosi</h2>
                    <p>Har bir fan uchun o'rtacha foiz va 10 ballik baho</p>
                  </div>
                  <span className="sq-formula">80% → 8 · 70% → 7</span>
                </div>

                {selectedQuarter.subjects.length === 0 ? (
                  <div className="sq-empty compact">
                    <span className="sq-empty-icon">📭</span>
                    <h2>Bu chorakda baholar yo'q</h2>
                    <p>Baholar kiritilgach, chorak bahosi avtomatik paydo bo'ladi.</p>
                  </div>
                ) : (
                  <div className="sq-table">
                    <div className="sq-row sq-head">
                      <span>Fan</span>
                      <span>O'rtacha</span>
                      <span>Kunlik</span>
                      <span>Imtihon</span>
                      <span>Baholar</span>
                      <span>Chorak</span>
                    </div>

                    {selectedQuarter.subjects.map(subject => (
                      <div className="sq-row" key={subject._id}>
                        <span className="sq-subject">
                          <strong>{subject.name}</strong>
                          {subject.code && <small>{subject.code}</small>}
                        </span>
                        <span className="sq-percent">{subject.percent}%</span>
                        <span className="sq-muted">
                          {subject.dailyPercent !== null && subject.dailyPercent !== undefined
                            ? `${subject.dailyPercent}%`
                            : '—'}
                        </span>
                        <span className="sq-muted">
                          {subject.examPercent !== null && subject.examPercent !== undefined
                            ? `${subject.examPercent}%`
                            : '—'}
                        </span>
                        <span className="sq-muted">{subject.gradeCount} ta</span>
                        <span className={`sq-grade ${gradeTone(subject.grade)}`}>
                          {subject.grade}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="sq-note">
                <span>ⓘ</span>
                <p>
                  Chorak bahosi kunlik va imtihon baholarini foizga aylantirib, ularning
                  o'rtachasidan hisoblanadi. Natija 10 ballik tizimga yaxlitlanadi:
                  <b> 80% → 8</b>, <b>70% → 7</b>.
                </p>
              </div>
            </>
          )}
        </>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .sq-page {
    --sq-green: #047857;
    --sq-green-dark: #065f46;
    --sq-slate-50: #f8fafc;
    --sq-slate-100: #f1f5f9;
    --sq-slate-200: #e2e8f0;
    --sq-slate-500: #64748b;
    --sq-slate-700: #334155;
    --sq-slate-900: #0f172a;
    min-height: 100%;
    padding: 1.75rem;
    background: linear-gradient(135deg, #f8fafc 0%, #eef7f2 100%);
    color: var(--sq-slate-900);
  }

  .sq-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.75rem 2rem;
    margin-bottom: 1.25rem;
    color: #fff;
    background: linear-gradient(135deg, #064e3b 0%, #047857 55%, #10b981 100%);
    border-radius: 20px;
    box-shadow: 0 16px 40px rgba(6, 78, 59, .24);
  }

  .sq-eyebrow {
    display: inline-block;
    margin-bottom: .5rem;
    color: #a7f3d0;
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .sq-header h1 {
    margin: 0 0 .4rem;
    font-size: 1.65rem;
    font-weight: 800;
    letter-spacing: -.02em;
  }

  .sq-header p {
    max-width: 620px;
    margin: 0;
    color: #d1fae5;
    font-size: .92rem;
    line-height: 1.55;
  }

  .sq-year {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    min-width: 160px;
    padding: .75rem .9rem;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 14px;
  }

  .sq-year label {
    color: #a7f3d0;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .sq-year select {
    width: 100%;
    padding: .55rem .65rem;
    color: #0f172a;
    background: #fff;
    border: 1px solid transparent;
    border-radius: 9px;
    font-size: .9rem;
    font-weight: 700;
    cursor: pointer;
  }

  .sq-alert {
    padding: .85rem 1rem;
    margin-bottom: 1rem;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    font-size: .85rem;
    font-weight: 600;
  }

  .sq-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    min-height: 280px;
    color: var(--sq-slate-500);
    background: #fff;
    border: 1px solid var(--sq-slate-200);
    border-radius: 16px;
  }

  .sq-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid #e2e8f0;
    border-top-color: var(--sq-green);
    border-radius: 50%;
    animation: sq-spin .8s linear infinite;
  }

  @keyframes sq-spin {
    to { transform: rotate(360deg); }
  }

  .sq-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: .75rem;
    margin-bottom: 1.25rem;
  }

  .sq-tab {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: .2rem;
    padding: .85rem .95rem;
    text-align: left;
    background: #fff;
    border: 1px solid var(--sq-slate-200);
    border-radius: 14px;
    cursor: pointer;
    transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
  }

  .sq-tab:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(15, 23, 42, .06);
  }

  .sq-tab.active {
    border-color: var(--sq-green);
    box-shadow: 0 0 0 3px rgba(4, 120, 87, .12), 0 10px 24px rgba(6, 95, 70, .12);
  }

  .sq-tab-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    color: var(--sq-slate-500);
    font-size: .72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .sq-tab strong {
    color: var(--sq-green-dark);
    font-size: 1.5rem;
    font-weight: 900;
    line-height: 1.1;
  }

  .sq-tab small {
    color: var(--sq-slate-500);
    font-size: .72rem;
    font-weight: 600;
  }

  .sq-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #cbd5e1;
  }

  .sq-dot.current { background: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, .16); }
  .sq-dot.upcoming { background: #f59e0b; }
  .sq-dot.past { background: #94a3b8; }

  .sq-overview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
    padding: 1.35rem 1.5rem;
    margin-bottom: 1.25rem;
    background: #fff;
    border: 1px solid var(--sq-slate-200);
    border-left: 5px solid var(--sq-green);
    border-radius: 18px;
    box-shadow: 0 4px 20px rgba(15, 23, 42, .04);
  }

  .sq-overview-main {
    display: flex;
    align-items: center;
    gap: 1.1rem;
  }

  .sq-ring {
    display: grid;
    width: 84px;
    height: 84px;
    flex: 0 0 84px;
    place-items: center;
    color: #fff;
    border-radius: 50%;
    font-size: 1.9rem;
    font-weight: 900;
    box-shadow: 0 8px 22px rgba(15, 23, 42, .16);
  }

  .sq-ring.excellent { background: linear-gradient(135deg, #15803d, #22c55e); }
  .sq-ring.good { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
  .sq-ring.average { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
  .sq-ring.low { background: linear-gradient(135deg, #b91c1c, #ef4444); }
  .sq-ring.empty { background: #e2e8f0; color: #94a3b8; }

  .sq-status {
    display: inline-block;
    margin-bottom: .25rem;
    padding: .2rem .55rem;
    color: #065f46;
    background: #d1fae5;
    border-radius: 999px;
    font-size: .68rem;
    font-weight: 800;
  }

  .sq-overview-text h2 {
    margin: 0 0 .2rem;
    color: var(--sq-slate-900);
    font-size: 1.2rem;
    font-weight: 800;
  }

  .sq-overview-text p {
    margin: 0;
    color: var(--sq-slate-500);
    font-size: .8rem;
  }

  .sq-overview-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(70px, 1fr));
    gap: .6rem;
  }

  .sq-overview-stats > div {
    padding: .65rem .8rem;
    background: var(--sq-slate-50);
    border: 1px solid var(--sq-slate-100);
    border-radius: 11px;
    text-align: center;
  }

  .sq-overview-stats span {
    display: block;
    margin-bottom: .2rem;
    color: var(--sq-slate-500);
    font-size: .66rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .sq-overview-stats strong {
    color: var(--sq-green-dark);
    font-size: 1.1rem;
    font-weight: 900;
  }

  .sq-subjects-card {
    background: #fff;
    border: 1px solid var(--sq-slate-200);
    border-radius: 16px;
    box-shadow: 0 4px 18px rgba(15, 23, 42, .04);
    overflow: hidden;
  }

  .sq-subjects-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.15rem 1.25rem;
    border-bottom: 1px solid var(--sq-slate-100);
  }

  .sq-subjects-head h2 {
    margin: 0 0 .2rem;
    color: var(--sq-slate-900);
    font-size: 1rem;
    font-weight: 800;
  }

  .sq-subjects-head p {
    margin: 0;
    color: var(--sq-slate-500);
    font-size: .78rem;
  }

  .sq-formula {
    padding: .35rem .7rem;
    color: #065f46;
    background: #d1fae5;
    border-radius: 999px;
    font-size: .7rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .sq-table {
    display: flex;
    flex-direction: column;
  }

  .sq-row {
    display: grid;
    grid-template-columns: 2fr .8fr .8fr .8fr .8fr .7fr;
    gap: .75rem;
    align-items: center;
    padding: .75rem 1.25rem;
    border-bottom: 1px solid var(--sq-slate-100);
    font-size: .82rem;
  }

  .sq-row:last-child { border-bottom: 0; }

  .sq-row.sq-head {
    color: var(--sq-slate-500);
    background: var(--sq-slate-50);
    font-size: .68rem;
    font-weight: 800;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .sq-subject strong {
    display: block;
    color: var(--sq-slate-900);
    font-size: .84rem;
    font-weight: 700;
  }

  .sq-subject small {
    color: #94a3b8;
    font-size: .66rem;
  }

  .sq-percent {
    color: var(--sq-green-dark);
    font-weight: 800;
  }

  .sq-muted { color: var(--sq-slate-500); font-weight: 600; }

  .sq-grade {
    display: inline-grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 900;
  }

  .sq-grade.excellent { color: #166534; background: #dcfce7; }
  .sq-grade.good { color: #1e40af; background: #dbeafe; }
  .sq-grade.average { color: #92400e; background: #fef3c7; }
  .sq-grade.low { color: #991b1b; background: #fee2e2; }
  .sq-grade.empty { color: #94a3b8; background: #f1f5f9; }

  .sq-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    min-height: 300px;
    padding: 2rem;
    text-align: center;
    background: #fff;
    border: 1px solid var(--sq-slate-200);
    border-radius: 16px;
  }

  .sq-empty.compact {
    min-height: 200px;
    border: 0;
    border-radius: 0;
  }

  .sq-empty-icon { font-size: 2.4rem; }

  .sq-empty h2 {
    margin: 0;
    color: var(--sq-slate-900);
    font-size: 1rem;
    font-weight: 800;
  }

  .sq-empty p {
    margin: 0;
    color: var(--sq-slate-500);
    font-size: .82rem;
  }

  .sq-note {
    display: flex;
    gap: .75rem;
    margin-top: 1rem;
    padding: .9rem 1rem;
    color: var(--sq-slate-500);
    background: #fff;
    border: 1px solid var(--sq-slate-200);
    border-left: 4px solid var(--sq-green);
    border-radius: 12px;
    font-size: .78rem;
    line-height: 1.55;
  }

  .sq-note > span { color: var(--sq-green); font-weight: 900; }
  .sq-note p { margin: 0; }
  .sq-note b { color: var(--sq-slate-700); }

  @media (max-width: 900px) {
    .sq-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sq-overview-stats { grid-template-columns: repeat(2, minmax(70px, 1fr)); }
  }

  @media (max-width: 700px) {
    .sq-page { padding: 1rem; }
    .sq-header { flex-direction: column; padding: 1.35rem; }
    .sq-year { width: 100%; }
    .sq-overview { flex-direction: column; align-items: stretch; }
    .sq-row { grid-template-columns: 1.6fr .8fr .7fr; gap: .5rem; padding: .7rem .85rem; }
    .sq-row > span:nth-child(3),
    .sq-row > span:nth-child(4),
    .sq-row > span:nth-child(5) { display: none; }
    .sq-row.sq-head > span:nth-child(3),
    .sq-row.sq-head > span:nth-child(4),
    .sq-row.sq-head > span:nth-child(5) { display: none; }
  }
`;

export default StudentQuarterGrades;
