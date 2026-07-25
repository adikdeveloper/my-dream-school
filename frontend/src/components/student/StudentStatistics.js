import React, { useState, useEffect, useCallback } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const StudentStatistics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('semester');

  const fetchData = useCallback(async () => {
    if (!user?._id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const [gradesData, attendanceData, assignmentsData] = await Promise.all([
        apiService.getGrades({ studentId: user._id }).catch(() => []),
        apiService.getAttendance({ studentId: user._id }).catch(() => []),
        apiService.getStudentAssignments().catch(() => [])
      ]);
      setGrades(Array.isArray(gradesData) ? gradesData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (err) {
      setError("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const subjects = [...new Set(grades.map(g => g.subject?.name).filter(Boolean))];

  const getFilteredGrades = () => {
    let filtered = [...grades];
    const now = new Date();
    if (selectedPeriod === 'month') {
      const monthAgo = new Date(now.getTime()); monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(g => new Date(g.date) >= monthAgo);
    } else if (selectedPeriod === 'quarter') {
      const quarterAgo = new Date(now.getTime()); quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      filtered = filtered.filter(g => new Date(g.date) >= quarterAgo);
    }
    if (selectedSubject !== 'all') filtered = filtered.filter(g => g.subject?.name === selectedSubject);
    return filtered;
  };
  const filteredGrades = getFilteredGrades();

  const stats = (() => {
    if (filteredGrades.length === 0) return { average: 0, highest: 0, lowest: 0, total: 0 };
    const scores = filteredGrades.map(g => g.score || 0);
    return {
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highest: Math.max(...scores), lowest: Math.min(...scores), total: scores.length
    };
  })();

  const attStats = (() => {
    if (attendance.length === 0) return { present: 0, absent: 0, late: 0, rate: 0, total: 0 };
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    return { present, absent, late, rate: Math.round((present / attendance.length) * 100), total: attendance.length };
  })();

  const assStats = (() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.mySubmission?.status === 'submitted' || a.mySubmission?.status === 'graded').length;
    return { total, completed, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  })();

  const subjectStats = (() => {
    const grouped = {};
    filteredGrades.forEach(g => {
      const name = g.subject?.name || "Noma'lum";
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(g.score || 0);
    });
    return Object.entries(grouped).map(([name, scores]) => ({
      name, average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length, highest: Math.max(...scores), lowest: Math.min(...scores)
    })).sort((a, b) => b.average - a.average);
  })();

  const recentGrades = [...grades].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const distribution = (() => {
    const dist = { excellent: 0, good: 0, satisfactory: 0, poor: 0 };
    filteredGrades.forEach(g => {
      const score = g.score || 0;
      if (score >= 90) dist.excellent++;
      else if (score >= 80) dist.good++;
      else if (score >= 70) dist.satisfactory++;
      else dist.poor++;
    });
    return dist;
  })();

  const monthlyTrend = (() => {
    const monthlyData = {};
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    grades.forEach(g => {
      const date = new Date(g.date);
      const monthKey = date.getFullYear() + '-' + date.getMonth();
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { label: months[date.getMonth()], scores: [], month: date.getMonth(), year: date.getFullYear() };
      monthlyData[monthKey].scores.push(g.score || 0);
    });
    const sortedMonths = Object.values(monthlyData).sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month)).slice(-6);
    return { labels: sortedMonths.map(m => m.label), averages: sortedMonths.map(m => Math.round(m.scores.reduce((a, b) => a + b, 0) / m.scores.length)) };
  })();

  const subjectsBarData = {
    labels: subjectStats.slice(0, 8).map(s => s.name.length > 12 ? s.name.substring(0, 12) + '...' : s.name),
    datasets: [{ label: "O'rtacha baho", data: subjectStats.slice(0, 8).map(s => s.average),
      backgroundColor: subjectStats.slice(0, 8).map(s => s.average >= 90 ? 'rgba(16, 185, 129, 0.85)' : s.average >= 80 ? 'rgba(34, 197, 94, 0.85)' : s.average >= 70 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(239, 68, 68, 0.85)'),
      borderColor: subjectStats.slice(0, 8).map(s => s.average >= 90 ? '#10b981' : s.average >= 80 ? '#22c55e' : s.average >= 70 ? '#f59e0b' : '#ef4444'),
      borderWidth: 2, borderRadius: 8, barThickness: 36 }]
  };
  const subjectsBarOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', padding: 12, cornerRadius: 8 } },
    scales: { y: { beginAtZero: true, max: 100, ticks: { stepSize: 25, callback: v => v + '%', color: '#64748b' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }, x: { ticks: { color: '#64748b', maxRotation: 45, minRotation: 45 }, grid: { display: false } } } };

  const distributionDoughnutData = { labels: ["A'lo (90-100)", 'Yaxshi (80-89)', 'Qoniqarli (70-79)', 'Yomon (0-69)'],
    datasets: [{ data: [distribution.excellent, distribution.good, distribution.satisfactory, distribution.poor],
      backgroundColor: ['rgba(16, 185, 129, 0.9)', 'rgba(34, 197, 94, 0.9)', 'rgba(245, 158, 11, 0.9)', 'rgba(239, 68, 68, 0.9)'],
      borderColor: ['#10b981', '#22c55e', '#f59e0b', '#ef4444'], borderWidth: 3, hoverOffset: 10 }] };
  const distributionDoughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' } }, tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', padding: 12, cornerRadius: 8 } } };

  const trendLineData = { labels: monthlyTrend.labels, datasets: [{ label: "O'rtacha baho", data: monthlyTrend.averages, fill: true, backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: '#16a34a', borderWidth: 3, tension: 0.4, pointRadius: 6, pointBackgroundColor: '#fff', pointBorderColor: '#16a34a', pointBorderWidth: 3, pointHoverRadius: 9 }] };
  const trendLineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', padding: 12, cornerRadius: 8 } },
    scales: { y: { beginAtZero: false, min: Math.max(0, Math.min(...(monthlyTrend.averages.length ? monthlyTrend.averages : [0])) - 15), max: 100, ticks: { stepSize: 10, callback: v => v + '%', color: '#64748b' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }, x: { ticks: { color: '#64748b' }, grid: { display: false } } } };

  const attendanceDoughnutData = { labels: ['Keldi', 'Kelmadi', 'Kechikdi'], datasets: [{ data: [attStats.present, attStats.absent, attStats.late], backgroundColor: ['rgba(16, 185, 129, 0.9)', 'rgba(239, 68, 68, 0.9)', 'rgba(245, 158, 11, 0.9)'], borderColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 3, hoverOffset: 8 }] };
  const attendanceDoughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } }, tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', padding: 12, cornerRadius: 8 } } };

  const getGradeColor = (score) => score >= 90 ? '#10b981' : score >= 80 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  const getGradeLabel = (score) => score >= 90 ? "A'lo" : score >= 80 ? 'Yaxshi' : score >= 70 ? 'Qoniqarli' : 'Yomon';
  const formatDate = (date) => new Date(date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });

  if (loading) return (<div className="statistics-page"><div className="loading-state"><div className="spinner"></div><p>Ma'lumotlar yuklanmoqda...</p></div><style>{styles}</style></div>);
  if (error) return (<div className="statistics-page"><div className="error-state"><span className="error-icon">!</span><h2>Xatolik</h2><p>{error}</p><button onClick={fetchData} className="retry-btn">Qayta yuklash</button></div><style>{styles}</style></div>);

  return (
    <div className="statistics-page">
      <header className="page-header">
        <div className="header-content"><h1>Mening natijalarim</h1><p>{user?.firstName} {user?.lastName} - {user?.class?.name || 'Sinf'}</p></div>
        <button onClick={fetchData} className="refresh-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>Yangilash</button>
      </header>
      <div className="filters-bar">
        <div className="filter-group"><label>Davr:</label><select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}><option value="month">Oxirgi oy</option><option value="quarter">Oxirgi 3 oy</option><option value="semester">Butun semestr</option></select></div>
        <div className="filter-group"><label>Fan:</label><select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}><option value="all">Barcha fanlar</option>{subjects.map(s => (<option key={s} value={s}>{s}</option>))}</select></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary"><div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><div className="stat-content"><span className="stat-value">{stats.average}%</span><span className="stat-label">O'rtacha ball</span></div><div className="stat-badge" style={{background: getGradeColor(stats.average)}}>{getGradeLabel(stats.average)}</div></div>
        <div className="stat-card success"><div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div className="stat-content"><span className="stat-value">{attStats.rate}%</span><span className="stat-label">Davomat</span></div><div className="stat-sub">{attStats.present}/{attStats.total} kun</div></div>
        <div className="stat-card warning"><div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div><div className="stat-content"><span className="stat-value">{assStats.completed}/{assStats.total}</span><span className="stat-label">Topshiriqlar</span></div><div className="stat-sub">{assStats.rate}% bajarildi</div></div>
        <div className="stat-card info"><div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></div><div className="stat-content"><span className="stat-value">{stats.total}</span><span className="stat-label">Jami baholar</span></div><div className="stat-sub">Eng yuqori: {stats.highest}%</div></div>
      </div>

      <div className="charts-row">
        <section className="section chart-section"><h2 className="section-title">Baholar taqsimoti</h2><div className="chart-container doughnut-chart">{filteredGrades.length > 0 ? <Doughnut data={distributionDoughnutData} options={distributionDoughnutOptions} /> : <div className="empty-chart"><p>Baholar topilmadi</p></div>}</div><div className="chart-summary"><span className="total-badge">Jami: {filteredGrades.length} ta baho</span></div></section>
        <section className="section chart-section"><h2 className="section-title">Davomat statistikasi</h2><div className="chart-container doughnut-chart">{attStats.total > 0 ? <Doughnut data={attendanceDoughnutData} options={attendanceDoughnutOptions} /> : <div className="empty-chart"><p>Davomat ma'lumotlari topilmadi</p></div>}</div><div className="chart-summary"><span className="rate-badge" style={{background: attStats.rate >= 80 ? '#10b981' : '#f59e0b'}}>{attStats.rate}% davomat</span></div></section>
      </div>
      <section className="section"><h2 className="section-title">Fanlar bo'yicha natijalar</h2><div className="chart-container bar-chart">{subjectStats.length > 0 ? <Bar data={subjectsBarData} options={subjectsBarOptions} /> : <div className="empty-chart"><p>Fan bo'yicha baholar topilmadi</p></div>}</div></section>
      <section className="section"><h2 className="section-title">Oylik o'rtacha baho trendi</h2><div className="chart-container line-chart">{monthlyTrend.labels.length > 0 ? <Line data={trendLineData} options={trendLineOptions} /> : <div className="empty-chart"><p>Trend ma'lumotlari topilmadi</p></div>}</div></section>

      <section className="section"><h2 className="section-title">Batafsil fan natijalari</h2>{subjectStats.length > 0 ? (<div className="subjects-table"><div className="table-header"><span>#</span><span>Fan nomi</span><span>Baholar</span><span>Min</span><span>Max</span><span>O'rtacha</span></div>{subjectStats.map((subject, index) => (<div key={subject.name} className="table-row"><span className="rank">{index + 1}</span><span className="name">{subject.name}</span><span className="count">{subject.count} ta</span><span className="low" style={{color: getGradeColor(subject.lowest)}}>{subject.lowest}%</span><span className="high" style={{color: getGradeColor(subject.highest)}}>{subject.highest}%</span><span className="avg"><span className="avg-value" style={{background: getGradeColor(subject.average)}}>{subject.average}%</span></span></div>))}</div>) : (<div className="empty-state-small"><p>Baholar topilmadi</p></div>)}</section>
      <section className="section"><h2 className="section-title">So'nggi baholar</h2>{recentGrades.length > 0 ? (<div className="recent-grades-list">{recentGrades.map((grade, index) => (<div key={index} className="grade-row"><div className="grade-date">{formatDate(grade.date)}</div><div className="grade-subject">{grade.subject?.name || "Noma'lum"}</div><div className="grade-type">{grade.gradeType || 'Baho'}</div><div className="grade-score" style={{background: getGradeColor(grade.score)}}>{grade.score}</div></div>))}</div>) : (<div className="empty-state-small"><p>Baholar topilmadi</p></div>)}</section>
      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .statistics-page { padding: 1.5rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); min-height: calc(100vh - 85px); }
  .loading-state, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 1rem; }
  .spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-icon { width: 64px; height: 64px; background: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; }
  .retry-btn { background: #16a34a; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
  .retry-btn:hover { background: #15803d; transform: translateY(-1px); }
  .page-header { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #16a34a 0%, #8b5cf6 100%); padding: 1.75rem 2rem; border-radius: 20px; margin-bottom: 1.5rem; color: white; box-shadow: 0 10px 40px rgba(22, 163, 74, 0.3); }
  .header-content h1 { font-size: 1.625rem; font-weight: 700; margin: 0 0 0.375rem 0; }
  .header-content p { margin: 0; opacity: 0.9; font-size: 0.9375rem; }
  .refresh-btn { display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.2); color: white; border: none; padding: 0.75rem 1.25rem; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
  .refresh-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.03); }


  .filters-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; background: white; padding: 1rem 1.5rem; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
  .filter-group { display: flex; align-items: center; gap: 0.625rem; }
  .filter-group label { font-size: 0.875rem; color: #64748b; font-weight: 600; }
  .filter-group select { padding: 0.625rem 1.125rem; border: 2px solid #e2e8f0; border-radius: 10px; background: white; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .filter-group select:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1); }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 1.5rem; }
  .stat-card { background: white; border-radius: 18px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.875rem; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.04); transition: all 0.3s; }
  .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
  .stat-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
  .stat-icon svg { width: 26px; height: 26px; }
  .stat-card.primary .stat-icon { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #16a34a; }
  .stat-card.success .stat-icon { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #10b981; }
  .stat-card.warning .stat-icon { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #f59e0b; }
  .stat-card.info .stat-icon { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #22c55e; }
  .stat-content { display: flex; flex-direction: column; }
  .stat-value { font-size: 2rem; font-weight: 800; color: #1e293b; line-height: 1.2; }
  .stat-label { font-size: 0.875rem; color: #64748b; font-weight: 500; margin-top: 0.125rem; }
  .stat-badge { position: absolute; top: 1.25rem; right: 1.25rem; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; color: white; }
  .stat-sub { font-size: 0.8125rem; color: #94a3b8; font-weight: 500; }


  .charts-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
  .section { background: white; border-radius: 18px; padding: 1.75rem; margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
  .chart-section { margin-bottom: 0; }
  .section-title { font-size: 1.125rem; font-weight: 700; color: #1e293b; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 2px solid #f1f5f9; }
  .chart-container { position: relative; width: 100%; }
  .doughnut-chart { height: 260px; }
  .bar-chart { height: 320px; }
  .line-chart { height: 300px; }
  .chart-summary { display: flex; justify-content: center; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #f1f5f9; }
  .total-badge, .rate-badge { display: inline-block; padding: 0.5rem 1.25rem; border-radius: 25px; font-size: 0.875rem; font-weight: 700; background: #f1f5f9; color: #475569; }
  .rate-badge { color: white; }
  .empty-chart { height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1rem; }
  .subjects-table { overflow-x: auto; }
  .table-header, .table-row { display: grid; grid-template-columns: 50px 2fr 100px 80px 80px 100px; gap: 1rem; align-items: center; padding: 1rem 1.25rem; }
  .table-header { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .table-row { border-bottom: 1px solid #f1f5f9; transition: all 0.2s; }
  .table-row:hover { background: #fafafa; }
  .table-row:last-child { border-bottom: none; }
  .table-row .rank { font-weight: 700; color: #94a3b8; }
  .table-row .name { font-weight: 600; color: #1e293b; }
  .table-row .count { color: #64748b; font-weight: 500; }
  .table-row .low, .table-row .high { font-weight: 700; }
  .table-row .avg-value { display: inline-block; padding: 0.375rem 0.875rem; border-radius: 8px; color: white; font-weight: 700; }


  .recent-grades-list { display: flex; flex-direction: column; gap: 0.625rem; }
  .grade-row { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; transition: all 0.2s; }
  .grade-row:hover { background: #f1f5f9; transform: translateX(6px); }
  .grade-date { font-size: 0.8125rem; color: #64748b; min-width: 70px; font-weight: 600; }
  .grade-subject { flex: 1; font-weight: 600; color: #1e293b; }
  .grade-type { font-size: 0.8125rem; color: #94a3b8; min-width: 85px; text-align: right; }
  .grade-score { width: 48px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: white; font-weight: 800; font-size: 1rem; }
  .empty-state-small { text-align: center; padding: 3rem; color: #94a3b8; }
  @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 992px) { .charts-row { grid-template-columns: 1fr; } .table-header, .table-row { grid-template-columns: 40px 1.5fr 80px 60px 60px 80px; gap: 0.5rem; } }
  @media (max-width: 768px) { .statistics-page { padding: 1rem; } .page-header { flex-direction: column; gap: 1rem; text-align: center; padding: 1.5rem; } .stats-grid { grid-template-columns: 1fr 1fr; } .table-header { display: none; } .table-row { grid-template-columns: 1fr; gap: 0.5rem; padding: 1.25rem; position: relative; } .table-row .rank { position: absolute; top: 1rem; right: 1rem; background: #f1f5f9; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; } .table-row .name { padding-right: 3rem; } .grade-row { flex-wrap: wrap; } .grade-type { order: 4; flex: 100%; margin-top: 0.25rem; text-align: left; } .doughnut-chart { height: 240px; } .bar-chart { height: 280px; } .line-chart { height: 260px; } }
  @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr; } .filters-bar { flex-direction: column; gap: 0.875rem; } .filter-group { width: 100%; } .filter-group select { flex: 1; } .stat-value { font-size: 1.625rem; } }
`;

export default StudentStatistics;

