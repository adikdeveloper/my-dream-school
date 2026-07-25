import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const TABS = [
  { id: 'daily', icon: '📅', label: 'Kunlik', desc: 'Tanlangan kun' },
  { id: 'weekly', icon: '📆', label: 'Haftalik', desc: 'Shu hafta' },
  { id: 'monthly', icon: '🗓', label: 'Oylik', desc: 'Tanlangan oy' },
  { id: 'yearly', icon: '📊', label: 'Yillik', desc: "O'quv yili" },
];

const ProgressBar = ({ value, label, height = 10 }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    {label && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
      <span>{label}</span>
      <span style={{ color: value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444', fontWeight: 800 }}>{value}%</span>
    </div>}
    <div style={{ background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', height }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: '100%', borderRadius: 999, transition: 'width 0.8s',
        background: value >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' : value >= 40 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)'
      }} />
    </div>
  </div>
);

const SC = ({ icon, label, value, color }) => {
  const bg = { green: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', blue: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', red: 'linear-gradient(135deg,#fee2e2,#fecaca)', yellow: 'linear-gradient(135deg,#fef3c7,#fde68a)' }[color];
  return <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderRadius: 14, background: bg, minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
    <span style={{ fontSize: '2rem', flexShrink: 0 }}>{icon}</span>
    <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}><small style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</small>
      <strong style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</strong></div>
  </div>;
};

// Calendar component
const Calendar = ({ selectedDate, onChange }) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startIdx = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date();

  const days = [];
  for (let i = 0; i < startIdx; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const prev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); };
  const next = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); };

  const isSelected = (d) => d && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === d;
  const isToday = (d) => d && today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  const isFuture = (d) => d && new Date(viewYear, viewMonth, d) > today;
  const isSunday = (d) => d && new Date(viewYear, viewMonth, d).getDay() === 0;

  return (
    <div className="rp-calendar">
      <div className="rp-cal-header">
        <button onClick={prev} className="rp-cal-nav">◀</button>
        <span className="rp-cal-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={next} className="rp-cal-nav">▶</button>
      </div>
      <div className="rp-cal-weekdays">
        {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="rp-cal-grid">
        {days.map((d, i) => (
          <button key={i} disabled={!d || isFuture(d) || isSunday(d)}
            className={`rp-cal-day ${isSelected(d) ? 'rp-cal-selected' : ''} ${isToday(d) ? 'rp-cal-today' : ''} ${!d ? 'rp-cal-empty' : ''} ${isSunday(d) ? 'rp-cal-sunday' : ''}`}
            onClick={() => d && !isFuture(d) && !isSunday(d) && onChange(new Date(viewYear, viewMonth, d))}>
            {d || ''}
          </button>
        ))}
      </div>
    </div>
  );
};

const Reports = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({});

  useEffect(() => { apiService.getAdminStats().then(s => setStats(s || {})).catch(() => { }); }, []);

  const loadReport = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let result;
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      switch (activeTab) {
        case 'daily': result = await apiService.getDailyReport(dateStr); break;
        case 'weekly': result = await apiService.getWeeklyReport(); break;
        case 'monthly': result = await apiService.getMonthlyReport(selectedMonth, selectedYear); break;
        case 'yearly': result = await apiService.getYearlyReport(); break;
        default: result = {};
      }
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.message || 'Xatolik yuz berdi');
    } finally { setLoading(false); }
  }, [activeTab, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n || 0);

  return (
    <div className="rp-container">
      {error && <div className="rp-error"><span>⚠️ {error}</span><button onClick={() => setError(null)}>✖</button></div>}

      <div className="rp-header">
        <div><h1>📊 Hisobotlar Markazi</h1><p>Kunlik, haftalik, oylik va yillik tahlillar</p></div>
        <div className="rp-stats-mini">
          <div className="rp-stat-mini"><span>{stats.totalStudents || 0}</span><small>O'quvchilar</small></div>
          <div className="rp-stat-mini"><span>{stats.totalTeachers || 0}</span><small>O'qituvchilar</small></div>
          <div className="rp-stat-mini"><span>{stats.totalClasses || 0}</span><small>Sinflar</small></div>
        </div>
      </div>

      <div className="rp-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`rp-tab ${activeTab === t.id ? 'rp-tab-active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <span className="rp-tab-icon">{t.icon}</span>
            <span className="rp-tab-label">{t.label}</span>
            <span className="rp-tab-desc">{t.desc}</span>
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && (
        <div className="rp-filters">
          <div className="rp-filter-group"><label>📅 Yil:</label>
            <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}>
              {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="rp-filter-group"><label>🗓️ Oy:</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="rp-content">
        {/* ======= DAILY ======= */}
        {activeTab === 'daily' && (
          <div className="rp-daily-layout">
            <div className="rp-daily-sidebar">
              <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
              <div className="rp-cal-info">
                <span className="rp-cal-dot rp-cal-dot-today"></span> Bugun
                <span className="rp-cal-dot rp-cal-dot-selected" style={{ marginLeft: 12 }}></span> Tanlangan
              </div>
            </div>
            <div className="rp-daily-main">
              {loading ? <div className="rp-loading"><div className="rp-spinner" /><p>Yuklanmoqda...</p></div> : data ? (<>
                <div className="rp-section-title">
                  <h2>📅 {data.date} — Kunlik hisobot</h2>
                  <span className={`rp-big-badge ${data.progress >= 70 ? 'rp-bb-green' : data.progress >= 40 ? 'rp-bb-yellow' : 'rp-bb-red'}`}>{data.progress}%</span>
                </div>
                <ProgressBar value={data.progress || 0} label="Baholar progress" height={14} />
                <div className="rp-summary-grid">
                  <SC icon="📚" label="Jadvaldagi darslar" value={data.totalScheduledLessons || 0} color="blue" />
                  <SC icon="✅" label="Bajarilgan" value={data.totalCompleted || 0} color="green" />
                  <SC icon="⏳" label="Kutilmoqda" value={Math.max(0, (data.totalExpected || 0) - (data.totalCompleted || 0))} color="yellow" />
                  <SC icon="🚫" label="Kelmaganlar" value={data.totalAbsent || 0} color="red" />
                </div>

                {(data.ungradedLessons || []).length > 0 && (
                  <div className="rp-section">
                    <div className="rp-section-head"><h3>❌ Baho qo'yilmagan darslar ({data.ungradedLessons.length})</h3>
                      <button className="rp-action-btn" onClick={() => navigate('/admin/journal')}>📝 Baholar jurnali →</button>
                    </div>
                    <div className="rp-table-wrap"><table className="rp-table">
                      <thead><tr><th>O'qituvchi</th><th>Sinf</th><th>Fan</th><th>Vaqt</th><th>Baho</th><th>Bahosiz o'quvchilar</th><th></th></tr></thead>
                      <tbody>{data.ungradedLessons.map((l, i) => (
                        <tr key={i}>
                          <td><strong>{l.teacherName}</strong></td>
                          <td><span className="rp-badge rp-badge-blue">{l.className}</span></td>
                          <td>{l.subjectName}</td><td>{l.time}</td>
                          <td><span className="rp-badge rp-badge-red">{l.actualGrades}/{l.expectedGrades}</span></td>
                          <td><div className="rp-chips">{(l.ungradedStudents || []).slice(0, 4).map((s, j) => <span key={j} className="rp-chip">{s.firstName} {s.lastName}</span>)}
                            {(l.ungradedStudents || []).length > 4 && <span className="rp-chip rp-chip-more">+{l.ungradedStudents.length - 4}</span>}</div></td>
                          <td><button className="rp-go-btn" onClick={() => navigate('/admin/journal')} title="Baho qo'yish">📝</button></td>
                        </tr>
                      ))}</tbody>
                    </table></div>
                  </div>
                )}

                {(data.absentStudents || []).length > 0 && (
                  <div className="rp-section">
                    <div className="rp-section-head"><h3>🚫 Kelmaganlar sinf bo'yicha</h3>
                      <button className="rp-action-btn" onClick={() => navigate('/admin/attendance')}>📋 Davomat →</button>
                    </div>
                    <div className="rp-absent-grid">{data.absentStudents.map((cls, i) => (
                      <div key={i} className="rp-absent-card">
                        <div className="rp-absent-header"><span className="rp-absent-class">{cls.className}</span>
                          <span className="rp-badge rp-badge-red">{cls.count} ta</span></div>
                        <div className="rp-chips">{cls.students.map((s, j) => <span key={j} className="rp-chip rp-chip-red">{s.firstName} {s.lastName}</span>)}</div>
                      </div>
                    ))}</div>
                  </div>
                )}

                {(data.ungradedLessons || []).length === 0 && (data.absentStudents || []).length === 0 && (
                  <div className="rp-success"><span>🎉</span><p>Barcha darslar baholangan va hamma kelgan!</p></div>
                )}
              </>) : <div className="rp-empty"><span>📭</span><p>Ma'lumot topilmadi</p></div>}
            </div>
          </div>
        )}

        {/* ======= WEEKLY ======= */}
        {activeTab === 'weekly' && (loading ? <div className="rp-loading"><div className="rp-spinner" /></div> : data ? (<>
          <div className="rp-section-title">
            <h2>📆 Haftalik — {data.weekStart} → {data.weekEnd}</h2>
            <span className={`rp-big-badge ${data.progress >= 70 ? 'rp-bb-green' : data.progress >= 40 ? 'rp-bb-yellow' : 'rp-bb-red'}`}>{data.progress}%</span>
          </div>
          <ProgressBar value={data.progress || 0} label="Haftalik baholar progress" height={14} />
          <div className="rp-summary-grid">
            <SC icon="✅" label="Kelganlar" value={fmt(data.attendance?.present)} color="green" />
            <SC icon="❌" label="Kelmaganlar" value={fmt(data.attendance?.absent)} color="red" />
            <SC icon="📋" label="Sababli" value={fmt(data.attendance?.excused)} color="yellow" />
            <SC icon="📊" label="Davomat %" value={`${data.attendance?.rate || 0}%`} color="blue" />
          </div>
          <div className="rp-charts-row">
            {data.absentByDay && Object.keys(data.absentByDay).length > 0 && (
              <div className="rp-chart-card"><h4>📊 Kunlik kelmaganlar</h4><div className="rp-chart-wrap">
                <Bar data={{ labels: Object.keys(data.absentByDay).sort(), datasets: [{ label: 'Kelmaganlar', data: Object.keys(data.absentByDay).sort().map(k => data.absentByDay[k]), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false }} />
              </div></div>
            )}
            <div className="rp-chart-card"><h4>🧾 Davomat</h4><div className="rp-chart-wrap">
              <Doughnut data={{ labels: ['Kelgan', 'Kelmagan', 'Sababli', 'Kechikkan'], datasets: [{ data: [data.attendance?.present || 0, data.attendance?.absent || 0, data.attendance?.excused || 0, data.attendance?.late || 0], backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'] }] }} options={{ responsive: true, maintainAspectRatio: false }} />
            </div></div>
          </div>
          {(data.absentByClass || []).length > 0 && (
            <div className="rp-section">
              <div className="rp-section-head"><h3>🚫 Kelmaganlar sinf bo'yicha</h3>
                <button className="rp-action-btn" onClick={() => navigate('/admin/attendance')}>📋 Davomat →</button>
              </div>
              <div className="rp-table-wrap"><table className="rp-table">
                <thead><tr><th>Sinf</th><th>Kelmaganlar soni</th><th></th></tr></thead>
                <tbody>{data.absentByClass.map((cls, i) => (
                  <tr key={i}>
                    <td><span className="rp-badge rp-badge-blue">{cls.className}</span></td>
                    <td><span className="rp-badge rp-badge-red">{cls.absentCount} ta</span></td>
                    <td><button className="rp-go-btn" onClick={() => navigate('/admin/attendance')} title="Davomatni ko'rish">📋</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
        </>) : <div className="rp-empty"><span>📭</span><p>Ma'lumot topilmadi</p></div>)}

        {/* ======= MONTHLY ======= */}
        {activeTab === 'monthly' && (loading ? <div className="rp-loading"><div className="rp-spinner" /></div> : data ? (<>
          <div className="rp-section-title"><h2>🗓 {data.monthName} {data.year}</h2></div>
          <ProgressBar value={data.gradingProgress || 0} label="Oylik baholar progress" height={14} />
          <div className="rp-summary-grid">
            <SC icon="📝" label="Jami baholar" value={fmt(data.grades?.total)} color="blue" />
            <SC icon="✅" label="Kelganlar" value={fmt(data.attendance?.present)} color="green" />
            <SC icon="❌" label="Kelmaganlar" value={fmt(data.attendance?.absent)} color="red" />
            <SC icon="📊" label="Davomat %" value={`${data.attendance?.rate || 0}%`} color="yellow" />
          </div>
          {data.finance && (<div className="rp-section">
            <div className="rp-section-head"><h3>💰 Moliyaviy hisobot</h3>
              <button className="rp-action-btn" onClick={() => navigate('/admin/payments')}>💳 To'lovlar →</button>
            </div>
            <div className="rp-finance-grid">
              <div className="rp-finance-card rp-fc-green"><div className="rp-fc-pct">{data.finance.paidPercent}%</div><div className="rp-fc-label">To'lagan</div><div className="rp-fc-count">{data.finance.paidCount}/{data.finance.totalStudents}</div></div>
              <div className="rp-finance-card rp-fc-yellow"><div className="rp-fc-pct">{data.finance.partialPercent}%</div><div className="rp-fc-label">Qisman</div><div className="rp-fc-count">{data.finance.partialCount}/{data.finance.totalStudents}</div></div>
              <div className="rp-finance-card rp-fc-red"><div className="rp-fc-pct">{data.finance.unpaidPercent}%</div><div className="rp-fc-label">To'lamagan</div><div className="rp-fc-count">{data.finance.unpaidCount}/{data.finance.totalStudents}</div></div>
            </div>
            <div className="rp-charts-row" style={{ marginTop: '1.5rem' }}>
              <div className="rp-chart-card"><h4>📊 To'lov holati</h4><div className="rp-chart-wrap">
                <Doughnut data={{ labels: ["To'lagan", "Qisman", "To'lamagan"], datasets: [{ data: [data.finance.paidCount, data.finance.partialCount, data.finance.unpaidCount], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] }} options={{ responsive: true, maintainAspectRatio: false }} />
              </div></div>
              <div className="rp-chart-card"><h4>📈 Davomat</h4><div className="rp-chart-wrap">
                <Doughnut data={{ labels: ['Kelgan', 'Kelmagan', 'Sababli'], datasets: [{ data: [data.attendance?.present || 0, data.attendance?.absent || 0, data.attendance?.excused || 0], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'] }] }} options={{ responsive: true, maintainAspectRatio: false }} />
              </div></div>
            </div>
            {(data.finance.unpaidList || []).length > 0 && (
              <div className="rp-table-wrap" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ padding: '1rem 1.25rem 0', margin: 0, color: '#475569' }}>⚠️ To'lamagan o'quvchilar</h4>
                <table className="rp-table"><thead><tr><th>O'quvchi</th><th>Sinf</th><th>To'lov</th><th>To'lagan</th><th></th></tr></thead>
                  <tbody>{data.finance.unpaidList.map((s, i) => (
                    <tr key={i}><td>{s.name}</td><td><span className="rp-badge rp-badge-blue">{s.className}</span></td>
                      <td>{fmt(s.monthlyFee)} so'm</td><td><span className="rp-badge rp-badge-red">{fmt(s.paidAmount)} so'm</span></td>
                      <td><button className="rp-go-btn" onClick={() => navigate('/admin/payments')} title="To'lov qilish">💳</button></td></tr>
                  ))}</tbody></table>
              </div>
            )}
          </div>)}
          {(data.ungradedTeachers || []).length > 0 && (
            <div className="rp-section">
              <div className="rp-section-head"><h3>⚠️ Baho qo'ymagan o'qituvchilar</h3>
                <button className="rp-action-btn" onClick={() => navigate('/admin/journal')}>📝 Jurnal →</button></div>
              <div className="rp-table-wrap"><table className="rp-table">
                <thead><tr><th>O'qituvchi</th><th>Bahosiz darslar</th><th>Tafsilotlar</th><th></th></tr></thead>
                <tbody>{data.ungradedTeachers.map((t, i) => (
                  <tr key={i}><td><strong>{t.teacherName}</strong></td><td><span className="rp-badge rp-badge-red">{t.ungradedCount} ta</span></td>
                    <td><div className="rp-chips">{(t.details || []).map((d, j) => <span key={j} className="rp-chip">{d.className} — {d.subjectName}</span>)}</div></td>
                    <td><button className="rp-go-btn" onClick={() => navigate('/admin/journal')} title="Baho qo'yish">📝</button></td></tr>
                ))}</tbody></table></div>
            </div>
          )}
        </>) : <div className="rp-empty"><span>📭</span><p>Ma'lumot topilmadi</p></div>)}

        {/* ======= YEARLY ======= */}
        {activeTab === 'yearly' && (loading ? <div className="rp-loading"><div className="rp-spinner" /></div> : data ? (<>
          <div className="rp-section-title"><h2>📊 {data.academicYear} o'quv yili</h2><p style={{ color: '#64748b', marginTop: 4 }}>{data.yearStart} → {data.yearEnd}</p></div>
          <div className="rp-summary-grid">
            <SC icon="📝" label="Baholar" value={`${data.overall?.gradingProgress || 0}%`} color="blue" />
            <SC icon="📊" label="Davomat" value={`${data.overall?.attendanceRate || 0}%`} color="green" />
            <SC icon="💰" label="To'lovlar" value={`${data.overall?.paymentPercent || 0}%`} color="yellow" />
            <SC icon="🎓" label="Jami baholar" value={fmt(data.overall?.totalGrades)} color="blue" />
          </div>
          <div className="rp-year-progress">
            <ProgressBar value={data.overall?.gradingProgress || 0} label="📝 Baholar progress" height={16} />
            <ProgressBar value={data.overall?.attendanceRate || 0} label="📊 Davomat" height={16} />
            <ProgressBar value={data.overall?.paymentPercent || 0} label="💰 To'lovlar" height={16} />
          </div>
          {(data.monthlyStats || []).length > 0 && (<>
            <div className="rp-charts-row">
              <div className="rp-chart-card rp-chart-full"><h4>📈 Oyma-oy progress</h4><div className="rp-chart-wrap-lg">
                <Line data={{
                  labels: data.monthlyStats.map(m => m.monthName), datasets: [
                    { label: 'Baholar %', data: data.monthlyStats.map(m => m.isFuture ? null : m.gradingProgress), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
                    { label: 'Davomat %', data: data.monthlyStats.map(m => m.isFuture ? null : m.attendanceRate), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
                    { label: "To'lov %", data: data.monthlyStats.map(m => m.isFuture ? null : m.paymentPercent), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4 }
                  ]
                }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } } }} />
              </div></div>
            </div>
            <div className="rp-section"><h3>📋 Oyma-oy tafsilot</h3><div className="rp-table-wrap"><table className="rp-table">
              <thead><tr><th>Oy</th><th>Baholar</th><th>Davomat</th><th>To'lovlar</th><th>Holat</th></tr></thead>
              <tbody>{data.monthlyStats.map((m, i) => (
                <tr key={i} style={{ opacity: m.isFuture ? 0.4 : 1 }}>
                  <td><strong>{m.monthName} {m.year}</strong></td>
                  <td>{m.isFuture ? '—' : <span className={`rp-badge ${m.gradingProgress >= 70 ? 'rp-badge-green' : m.gradingProgress >= 40 ? 'rp-badge-yellow' : 'rp-badge-red'}`}>{m.gradingProgress}%</span>}</td>
                  <td>{m.isFuture ? '—' : <span className={`rp-badge ${m.attendanceRate >= 80 ? 'rp-badge-green' : m.attendanceRate >= 60 ? 'rp-badge-yellow' : 'rp-badge-red'}`}>{m.attendanceRate}%</span>}</td>
                  <td>{m.isFuture ? '—' : <span className={`rp-badge ${m.paymentPercent >= 70 ? 'rp-badge-green' : m.paymentPercent >= 40 ? 'rp-badge-yellow' : 'rp-badge-red'}`}>{m.paymentPercent}%</span>}</td>
                  <td>{m.isFuture ? <span className="rp-badge" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Kelajak</span> : m.gradingProgress >= 70 && m.attendanceRate >= 70 ? <span className="rp-badge rp-badge-green">✅ Yaxshi</span> : m.gradingProgress >= 40 ? <span className="rp-badge rp-badge-yellow">⚠️ O'rta</span> : <span className="rp-badge rp-badge-red">❌ Past</span>}</td>
                </tr>
              ))}</tbody>
            </table></div></div>
          </>)}
        </>) : <div className="rp-empty"><span>📭</span><p>Ma'lumot topilmadi</p></div>)}
      </div>

      <style>{`
        .rp-container{padding:2rem;min-height:100vh;background:linear-gradient(135deg,#f0f4f8,#e2e8f0);box-sizing:border-box;max-width:100%;overflow-x:hidden}
        .rp-error{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;padding:1rem 1.5rem;border-radius:12px;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem}
        .rp-error button{background:#dc2626;color:#fff;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;margin-left:auto}
        .rp-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;padding:2rem;background:linear-gradient(135deg,#1e3a8a,#3b82f6);border-radius:20px;color:#fff;box-sizing:border-box;width:100%;max-width:100%;flex-wrap:wrap;gap:1.5rem}
        .rp-header h1{font-size:2rem;font-weight:800;margin:0 0 .5rem} .rp-header p{opacity:.9;margin:0}
        .rp-stats-mini{display:flex;gap:1.5rem;flex-wrap:wrap} .rp-stat-mini{text-align:center;padding:1rem 1.5rem;background:rgba(255,255,255,.15);border-radius:12px;backdrop-filter:blur(10px);box-sizing:border-box;flex:1;min-width:100px}
        .rp-stat-mini span{display:block;font-size:2rem;font-weight:800} .rp-stat-mini small{opacity:.9;font-size:.85rem}
        .rp-tabs{display:flex;gap:.75rem;margin-bottom:2rem;background:#fff;padding:.75rem;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.08);box-sizing:border-box;width:100%;max-width:100%;flex-wrap:wrap}
        .rp-tab{flex:1;min-width:120px;padding:1rem;border:2px solid transparent;border-radius:12px;background:#f8fafc;cursor:pointer;transition:all .3s;text-align:center;box-sizing:border-box}
        .rp-tab:hover{background:#eef2ff;border-color:#c7d2fe}
        .rp-tab-active{background:linear-gradient(135deg,#1e3a8a,#3b82f6)!important;color:#fff!important;border-color:transparent!important;box-shadow:0 8px 25px rgba(59,130,246,.4)}
        .rp-tab-icon{display:block;font-size:1.5rem;margin-bottom:.25rem} .rp-tab-label{display:block;font-size:1rem;font-weight:700} .rp-tab-desc{display:block;font-size:.75rem;opacity:.7}
        .rp-filters{display:flex;gap:1.5rem;margin-bottom:2rem;padding:1.5rem;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.08);flex-wrap:wrap;box-sizing:border-box;width:100%}
        .rp-filter-group{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap} .rp-filter-group label{font-weight:600;color:#475569}
        .rp-filter-group select{padding:.75rem 1rem;border:2px solid #e2e8f0;border-radius:10px;font-size:.9375rem;background:#f8fafc;font-weight:600;cursor:pointer;min-width:150px;box-sizing:border-box}
        .rp-content{background:#fff;border-radius:20px;padding:2rem;box-shadow:0 4px 20px rgba(0,0,0,.08);min-height:400px;box-sizing:border-box;width:100%;max-width:100%;min-width:0}
        .rp-section-title{margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap} .rp-section-title h2{font-size:1.5rem;font-weight:800;color:#1e293b;margin:0}
        .rp-big-badge{padding:.5rem 1.25rem;border-radius:12px;font-size:1.5rem;font-weight:900} .rp-bb-green{background:#d1fae5;color:#065f46} .rp-bb-yellow{background:#fef3c7;color:#92400e} .rp-bb-red{background:#fee2e2;color:#991b1b}
        .rp-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.25rem;margin-bottom:2rem;width:100%;min-width:0;box-sizing:border-box}
        .rp-section{margin-top:2rem;box-sizing:border-box;width:100%} .rp-section h3{font-size:1.1rem;font-weight:700;color:#334155;margin:0 0 1rem}
        .rp-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem}
        .rp-section-head h3{margin:0}
        .rp-action-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;padding:.625rem 1.25rem;border-radius:10px;font-weight:700;cursor:pointer;font-size:.85rem;transition:all .2s;box-shadow:0 4px 12px rgba(59,130,246,.3)}
        .rp-action-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,.4)}
        .rp-go-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:1rem;transition:all .2s}
        .rp-go-btn:hover{transform:scale(1.1)}
        .rp-daily-layout{display:grid;grid-template-columns:320px 1fr;gap:2rem;width:100%;min-width:0;box-sizing:border-box}
        .rp-daily-sidebar{position:sticky;top:2rem;align-self:start;box-sizing:border-box;width:100%;min-width:0}
        .rp-calendar{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:1.25rem;margin-bottom:1rem;box-sizing:border-box;width:100%}
        .rp-cal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
        .rp-cal-nav{background:none;border:1px solid #e2e8f0;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:1rem;transition:all .2s;flex-shrink:0}
        .rp-cal-nav:hover{background:#e2e8f0} .rp-cal-title{font-weight:700;font-size:1rem;color:#1e293b}
        .rp-cal-weekdays{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:.5rem}
        .rp-cal-weekdays span{font-size:.75rem;font-weight:700;color:#94a3b8;padding:.25rem}
        .rp-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
        .rp-cal-day{width:100%;aspect-ratio:1;border:none;border-radius:8px;background:none;cursor:pointer;font-weight:600;font-size:.85rem;transition:all .2s;color:#334155;padding:0;display:flex;align-items:center;justify-content:center}
        .rp-cal-day:hover:not(:disabled){background:#dbeafe;color:#1e40af} .rp-cal-day:disabled{opacity:.3;cursor:default}
        .rp-cal-selected{background:linear-gradient(135deg,#1e3a8a,#3b82f6)!important;color:#fff!important;box-shadow:0 4px 12px rgba(59,130,246,.4)}
        .rp-cal-today{border:2px solid #3b82f6;color:#3b82f6;font-weight:800}
        .rp-cal-empty{visibility:hidden} .rp-cal-sunday{color:#ef4444!important;opacity:.4!important}
        .rp-cal-info{display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:#64748b;padding:.5rem;flex-wrap:wrap}
        .rp-cal-dot{width:12px;height:12px;border-radius:50%;display:inline-block;flex-shrink:0} .rp-cal-dot-today{border:2px solid #3b82f6} .rp-cal-dot-selected{background:#3b82f6}
        .rp-charts-row{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;margin-bottom:2rem;width:100%;min-width:0;box-sizing:border-box}
        .rp-chart-card{background:#f8fafc;padding:1.5rem;border-radius:14px;border:1px solid #e2e8f0;box-sizing:border-box;width:100%;max-width:100%;min-width:0;overflow:hidden}
        .rp-chart-card.rp-chart-full{grid-column:span 2} .rp-chart-card h4{margin:0 0 1rem;font-size:1rem;color:#475569;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rp-chart-wrap{position:relative;width:100%;max-width:100%;height:250px} .rp-chart-wrap-lg{position:relative;width:100%;max-width:100%;height:300px}
        .rp-table-wrap{overflow-x:auto;border-radius:14px;border:1px solid #e2e8f0;width:100%;box-sizing:border-box}
        .rp-table{width:100%;border-collapse:collapse} .rp-table thead{background:linear-gradient(135deg,#f1f5f9,#e2e8f0)}
        .rp-table th{padding:1rem 1.25rem;text-align:left;font-size:.8rem;font-weight:700;color:#475569;text-transform:uppercase;white-space:nowrap}
        .rp-table td{padding:1rem 1.25rem;border-bottom:1px solid #f1f5f9;white-space:nowrap} .rp-table tbody tr:hover{background:#f8fafc}
        .rp-badge{padding:.375rem .75rem;border-radius:8px;font-weight:700;font-size:.8rem;display:inline-block;white-space:nowrap}
        .rp-badge-green{background:#d1fae5;color:#065f46} .rp-badge-blue{background:#dbeafe;color:#1e40af} .rp-badge-yellow{background:#fef3c7;color:#92400e} .rp-badge-red{background:#fee2e2;color:#991b1b}
        .rp-chips{display:flex;flex-wrap:wrap;gap:.5rem}
        .rp-chip{display:inline-block;padding:.25rem .625rem;background:#f1f5f9;border-radius:20px;font-size:.75rem;font-weight:600;color:#475569;white-space:nowrap}
        .rp-chip-red{background:#fee2e2;color:#991b1b} .rp-chip-more{background:#e2e8f0;color:#64748b}
        .rp-absent-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;width:100%;box-sizing:border-box}
        .rp-absent-card{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:1rem;box-sizing:border-box;min-width:0}
        .rp-absent-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;gap:.5rem} .rp-absent-class{font-weight:700;color:#1e293b;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rp-finance-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;width:100%;min-width:0;box-sizing:border-box}
        .rp-finance-card{padding:1.5rem;border-radius:16px;text-align:center;box-sizing:border-box;min-width:0} .rp-fc-green{background:linear-gradient(135deg,#d1fae5,#a7f3d0)} .rp-fc-yellow{background:linear-gradient(135deg,#fef3c7,#fde68a)} .rp-fc-red{background:linear-gradient(135deg,#fee2e2,#fecaca)}
        .rp-fc-pct{font-size:2.5rem;font-weight:900;color:#1e293b} .rp-fc-label{font-size:.9rem;font-weight:600;color:#475569;margin:.25rem 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .rp-fc-count{font-size:.85rem;color:#64748b;font-weight:600}
        .rp-year-progress{display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem;padding:1.5rem;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;box-sizing:border-box;width:100%}
        .rp-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;gap:1rem}
        .rp-spinner{width:50px;height:50px;border:4px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .rp-empty,.rp-success{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;text-align:center}
        .rp-empty span,.rp-success span{font-size:4rem;margin-bottom:1rem} .rp-success p{font-size:1.25rem;color:#10b981;font-weight:700}
        @media(max-width:1024px){.rp-daily-layout{grid-template-columns:1fr} .rp-charts-row{grid-template-columns:1fr} .rp-chart-card.rp-chart-full{grid-column:span 1}}
        @media(max-width:768px){.rp-container{padding:1rem} .rp-header{flex-direction:column;gap:1.5rem;text-align:center;padding:1.5rem 1rem} .rp-stats-mini{justify-content:center;width:100%} .rp-tabs{flex-direction:column} .rp-summary-grid{grid-template-columns:1fr;gap:1rem} .rp-finance-grid{grid-template-columns:1fr;gap:1rem} .rp-content{padding:1.25rem 1rem} .rp-section-title h2{font-size:1.25rem} .rp-chart-wrap{height:220px} .rp-chart-wrap-lg{height:250px}}
      `}</style>
    </div>
  );
};

export default Reports;
