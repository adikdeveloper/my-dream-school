import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import LoadingOverlay from '../common/LoadingOverlay';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api';

const FinancialOverview = () => {
  const [currentBalance, setCurrentBalance] = useState(null);
  const [monthlyIncome, setMonthlyIncome] = useState([]);
  const [studentsWithDebt, setStudentsWithDebt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthDetails, setMonthDetails] = useState(null);
  const [monthDetailsLoading, setMonthDetailsLoading] = useState(false);

  const fetchMonthlyIncome = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/financial/monthly-income?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthlyIncome(response.data.monthlyIncome || []);
    } catch (err) {
    }
  }, [selectedYear]);

  const fetchCurrentBalance = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/financial/current-balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentBalance(response.data);
    } catch (err) {
      setError("Moliyaviy ma'lumotlarni yuklashda xatolik");
    }
  }, []);

  const fetchStudentsWithDebt = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/financial/students-with-debt`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentsWithDebt(response.data);
    } catch (err) {
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchCurrentBalance(),
      fetchMonthlyIncome(),
      fetchStudentsWithDebt()
    ]);
    setLoading(false);
  }, [fetchCurrentBalance, fetchMonthlyIncome, fetchStudentsWithDebt]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchMonthDetails = async (month) => {
    setMonthDetailsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/financial/monthly-details/${selectedYear}/${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthDetails(response.data);
      setSelectedMonth(month);
    } catch (err) {
      setError("Oylik ma'lumotlarni yuklashda xatolik");
    }
    setMonthDetailsLoading(false);
  };

  const closeMonthModal = () => {
    setSelectedMonth(null);
    setMonthDetails(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMonthName = (monthNumber) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];
    return months[monthNumber - 1];
  };

  const getPaymentTypeLabel = (type) => {
    const labels = { cash: 'Naqd', card: 'Karta', bank_transfer: 'Bank' };
    return labels[type] || type;
  };

  const getPaymentTypeColor = (type) => {
    const colors = { cash: '#d97706', card: '#8b5cf6', bank_transfer: '#f59e0b' };
    return colors[type] || '#64748b';
  };

  // Chart configurations
  const yearlyChartData = {
    labels: monthlyIncome.map(d => getMonthName(d.month).substring(0, 3)),
    datasets: [
      {
        label: 'Naqd',
        data: monthlyIncome.map(d => d.cash),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#d97706',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Karta',
        data: monthlyIncome.map(d => d.card),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: '#8b5cf6',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Bank',
        data: monthlyIncome.map(d => d.bank_transfer),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const yearlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { weight: 600 }, padding: 20 } },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        padding: 12,
        titleFont: { size: 14, weight: 600 },
        bodyFont: { size: 13 },
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { weight: 600 } } },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { callback: (v) => (v / 1000000).toFixed(1) + 'M' }
      }
    }
  };

  const trendLineData = {
    labels: monthlyIncome.map(d => getMonthName(d.month).substring(0, 3)),
    datasets: [{
      label: 'Umumiy daromad',
      data: monthlyIncome.map(d => d.total),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8
    }]
  };

  const trendLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        padding: 12,
        callbacks: { label: (ctx) => formatCurrency(ctx.raw) }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: (v) => (v / 1000000).toFixed(1) + 'M' } }
    }
  };

  return (
    <div className="fo-container">
      {loading && <LoadingOverlay message="Moliyaviy ma'lumotlar yuklanmoqda" />}

      {error && (
        <div className="fo-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Balance Cards */}
      <div className="fo-balance-grid">
        <div className="fo-balance-card fo-total">
          <div className="fo-balance-icon">💰</div>
          <div><div className="fo-balance-label">Umumiy balans</div>
            <div className="fo-balance-value">{formatCurrency(currentBalance?.currentBalance?.total || 0)}</div></div>
        </div>
        <div className="fo-balance-card fo-cash">
          <div className="fo-balance-icon">💵</div>
          <div><div className="fo-balance-label">Naqd pul</div>
            <div className="fo-balance-value">{formatCurrency(currentBalance?.currentBalance?.cash || 0)}</div></div>
        </div>
        <div className="fo-balance-card fo-card">
          <div className="fo-balance-icon">💳</div>
          <div><div className="fo-balance-label">Karta orqali</div>
            <div className="fo-balance-value">{formatCurrency(currentBalance?.currentBalance?.card || 0)}</div></div>
        </div>
        <div className="fo-balance-card fo-bank">
          <div className="fo-balance-icon">🏦</div>
          <div><div className="fo-balance-label">Bank o'tkazmasi</div>
            <div className="fo-balance-value">{formatCurrency(currentBalance?.currentBalance?.bankTransfer || 0)}</div></div>
        </div>
      </div>

      {/* Yearly Statistics Charts */}
      <div className="fo-charts-section">
        <div className="fo-section-header">
          <h2>📊 {selectedYear}-yil statistikasi</h2>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="fo-year-select">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="fo-charts-grid">
          <div className="fo-chart-card">
            <h3>📈 Oylik daromad taqqoslash</h3>
            <div className="fo-chart-wrapper"><Bar data={yearlyChartData} options={yearlyChartOptions} /></div>
          </div>
          <div className="fo-chart-card">
            <h3>📉 Daromad tendensiyasi</h3>
            <div className="fo-chart-wrapper"><Line data={trendLineData} options={trendLineOptions} /></div>
          </div>
        </div>
      </div>

      {/* Monthly Income Cards */}
      <div className="fo-monthly-section">
        <h2>📅 Oylik daromad - {selectedYear}</h2>
        <p className="fo-monthly-subtitle">Har bir oyni bosib batafsil ma'lumotlarni ko'ring</p>
        <div className="fo-monthly-grid">
          {monthlyIncome.map((data, index) => (
            <div key={index} className={`fo-month-card ${data.total > 0 ? 'fo-has-data' : ''}`} onClick={() => data.total > 0 && fetchMonthDetails(data.month)}>
              <div className="fo-month-header">
                <span className="fo-month-name">{getMonthName(data.month)}</span>
                <span className="fo-month-badge">{data.total > 0 ? '📊' : '—'}</span>
              </div>
              <div className="fo-month-total">{formatCurrency(data.total)}</div>
              <div className="fo-month-breakdown">
                <div className="fo-breakdown-row"><span className="fo-dot fo-dot-cash"></span><span>Naqd</span><span>{formatCurrency(data.cash)}</span></div>
                <div className="fo-breakdown-row"><span className="fo-dot fo-dot-card"></span><span>Karta</span><span>{formatCurrency(data.card)}</span></div>
                <div className="fo-breakdown-row"><span className="fo-dot fo-dot-bank"></span><span>Bank</span><span>{formatCurrency(data.bank_transfer)}</span></div>
              </div>
              {data.total > 0 && <div className="fo-month-cta">Batafsil ko'rish →</div>}
            </div>
          ))}
        </div>
      </div>



      {/* Debt Section */}
      {studentsWithDebt && studentsWithDebt.students?.length > 0 && (
        <div className="fo-debt-section">
          <h2>💸 Qarzdor o'quvchilar ({studentsWithDebt.month})</h2>
          <div className="fo-debt-summary">
            <div className="fo-debt-card"><span className="fo-debt-icon">👥</span><div><span className="fo-debt-label">Jami qarzdorlar</span><span className="fo-debt-value">{studentsWithDebt.totalStudentsWithDebt}</span></div></div>
            <div className="fo-debt-card fo-debt-danger"><span className="fo-debt-icon">⚠️</span><div><span className="fo-debt-label">Umumiy qarz</span><span className="fo-debt-value">{formatCurrency(studentsWithDebt.totalDebtAmount)}</span></div></div>
          </div>
          <div className="fo-debt-table-wrap">
            <table className="fo-debt-table">
              <thead><tr><th>O'quvchi</th><th>Telefon</th><th>Oylik to'lov</th><th>To'langan</th><th>Qarz</th></tr></thead>
              <tbody>
                {studentsWithDebt.students.map((item, i) => (
                  <tr key={i}>
                    <td><div className="fo-student-info"><div className="fo-student-avatar" style={item.student?.profileImage ? { backgroundImage: `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${item.student.profileImage})`, backgroundSize: 'cover' } : {}}>{!item.student?.profileImage && <span>{item.student?.firstName?.charAt(0)}{item.student?.lastName?.charAt(0)}</span>}</div><div><div className="fo-student-name">{item.student.firstName} {item.student.lastName}</div><div className="fo-student-id">{item.student.studentId}</div></div></div></td>
                    <td>{item.student.phone}</td>
                    <td><span className="fo-badge fo-badge-gray">{formatCurrency(item.monthlyFee)}</span></td>
                    <td><span className="fo-badge fo-badge-green">{formatCurrency(item.paidAmount)}</span></td>
                    <td><span className="fo-badge fo-badge-red">{formatCurrency(item.debtAmount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Month Detail Modal */}
      {selectedMonth && (
        <div className="fo-modal-overlay" onClick={closeMonthModal}>
          <div className="fo-modal" onClick={e => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h2>📅 {getMonthName(selectedMonth)} {selectedYear}</h2>
              <button className="fo-modal-close" onClick={closeMonthModal}>✕</button>
            </div>

            {monthDetailsLoading ? (
              <div className="fo-modal-loading"><div className="fo-spinner"></div><p>Yuklanmoqda...</p></div>
            ) : monthDetails && (
              <div className="fo-modal-content">
                {/* Summary Cards */}
                <div className="fo-modal-summary">
                  <div className="fo-summary-card fo-summary-total">
                    <div className="fo-summary-icon">💰</div>
                    <div><span className="fo-summary-label">Umumiy daromad</span><span className="fo-summary-value">{formatCurrency(monthDetails.totals.total)}</span></div>
                    {monthDetails.comparison.growthPercentage !== 0 && (
                      <div className={`fo-growth ${monthDetails.comparison.growthPercentage > 0 ? 'fo-growth-up' : 'fo-growth-down'}`}>
                        {monthDetails.comparison.growthPercentage > 0 ? '↑' : '↓'} {Math.abs(monthDetails.comparison.growthPercentage)}%
                      </div>
                    )}
                  </div>
                  <div className="fo-summary-card"><div className="fo-summary-icon">📝</div><div><span className="fo-summary-label">To'lovlar soni</span><span className="fo-summary-value">{monthDetails.totals.paymentCount}</span></div></div>
                  <div className="fo-summary-card"><div className="fo-summary-icon">💵</div><div><span className="fo-summary-label">Naqd</span><span className="fo-summary-value">{formatCurrency(monthDetails.totals.cash)}</span></div></div>
                  <div className="fo-summary-card"><div className="fo-summary-icon">💳</div><div><span className="fo-summary-label">Karta</span><span className="fo-summary-value">{formatCurrency(monthDetails.totals.card)}</span></div></div>
                </div>

                {/* Charts */}
                <div className="fo-modal-charts">
                  <div className="fo-modal-chart">
                    <h4>📊 To'lov turlari</h4>
                    <div className="fo-pie-wrap">
                      <Doughnut
                        data={{
                          labels: monthDetails.paymentTypeBreakdown.map(p => getPaymentTypeLabel(p._id)),
                          datasets: [{
                            data: monthDetails.paymentTypeBreakdown.map(p => p.total),
                            backgroundColor: monthDetails.paymentTypeBreakdown.map(p => getPaymentTypeColor(p._id)),
                            borderWidth: 0
                          }]
                        }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                      />
                    </div>
                  </div>
                  <div className="fo-modal-chart">
                    <h4>📈 Kunlik daromad</h4>
                    <div className="fo-bar-wrap">
                      <Bar
                        data={{
                          labels: monthDetails.dailyBreakdown.map(d => d._id + '-kun'),
                          datasets: [{ label: "Daromad", data: monthDetails.dailyBreakdown.map(d => d.total), backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4 }]
                        }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => (v / 1000000).toFixed(1) + 'M' } } } }}
                      />
                    </div>
                  </div>
                </div>

                {/* Payments Table */}
                <div className="fo-payments-section">
                  <h4>📋 Barcha to'lovlar ({monthDetails.payments.length})</h4>
                  <div className="fo-payments-table-wrap">
                    <table className="fo-payments-table">
                      <thead><tr><th>Sana</th><th>O'quvchi</th><th>Sinf</th><th>Turi</th><th>Summa</th></tr></thead>
                      <tbody>
                        {monthDetails.payments.map((p, i) => (
                          <tr key={i}>
                            <td>{formatDate(p.paymentDate)}</td>
                            <td><div className="fo-student-info-sm"><div className="fo-avatar-sm" style={p.studentId?.profileImage ? { backgroundImage: `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${p.studentId.profileImage})`, backgroundSize: 'cover' } : {}}>{!p.studentId?.profileImage && <span>{p.studentId?.firstName?.charAt(0)}{p.studentId?.lastName?.charAt(0)}</span>}</div><span>{p.studentId?.firstName} {p.studentId?.lastName}</span></div></td>
                            <td>{p.studentId?.classId?.className || '—'}</td>
                            <td><span className="fo-type-badge" style={{ backgroundColor: getPaymentTypeColor(p.paymentType) + '20', color: getPaymentTypeColor(p.paymentType) }}>{getPaymentTypeLabel(p.paymentType)}</span></td>
                            <td><strong>{formatCurrency(p.amount)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .fo-container { padding: 2rem; min-height: 100vh; background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%); box-sizing: border-box; max-width: 100%; overflow-x: hidden; }
        .fo-error { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #991b1b; padding: 1rem 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; }
        .fo-error button { background: #dc2626; color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; margin-left: auto; }
        
        .fo-balance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; width: 100%; }
        .fo-balance-card { background: white; padding: 1.5rem; border-radius: 16px; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: all 0.3s; position: relative; overflow: hidden; min-width: 0; box-sizing: border-box; }
        .fo-balance-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
        .fo-balance-card::before { content: ''; position: absolute; top: 0; right: 0; width: 100px; height: 100px; border-radius: 50%; opacity: 0.1; }
        .fo-total::before { background: #3b82f6; } .fo-cash::before { background: #d97706; } .fo-card::before { background: #8b5cf6; } .fo-bank::before { background: #f59e0b; }
        .fo-balance-icon { font-size: 2.5rem; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 14px; flex-shrink: 0; }
        .fo-total .fo-balance-icon { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
        .fo-cash .fo-balance-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); }
        .fo-card .fo-balance-icon { background: linear-gradient(135deg, #ede9fe, #ddd6fe); }
        .fo-bank .fo-balance-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); }
        .fo-balance-label { font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fo-balance-value { font-size: 1.4rem; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .fo-charts-section, .fo-monthly-section, .fo-stats-section, .fo-debt-section { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 2rem; box-sizing: border-box; width: 100%; max-width: 100%; }
        .fo-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .fo-section-header h2, .fo-monthly-section h2, .fo-stats-section h2, .fo-debt-section h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }
        .fo-year-select { padding: 0.75rem 1.25rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.9375rem; background: #f8fafc; font-weight: 600; cursor: pointer; }
        .fo-year-select:focus { outline: none; border-color: #3b82f6; }
        
        .fo-charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; width: 100%; min-width: 0; }
        .fo-chart-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; overflow: hidden; }
        .fo-chart-card h3 { font-size: 1rem; font-weight: 600; color: #475569; margin: 0 0 1rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fo-chart-wrapper { position: relative; width: 100%; max-width: 100%; height: 300px; }
        
        .fo-monthly-subtitle { color: #64748b; margin: -0.5rem 0 1.5rem 0; font-size: 0.9rem; }
        .fo-monthly-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
        .fo-month-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 1.25rem; border-radius: 14px; border: 2px solid #e2e8f0; transition: all 0.3s; box-sizing: border-box; }
        .fo-month-card.fo-has-data { cursor: pointer; }
        .fo-month-card.fo-has-data:hover { border-color: #3b82f6; transform: translateY(-4px); box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15); }
        .fo-month-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .fo-month-name { font-weight: 700; color: #1e293b; font-size: 1.1rem; }
        .fo-month-badge { font-size: 1.25rem; }
        .fo-month-total { font-size: 1.5rem; font-weight: 800; color: #d97706; margin-bottom: 1rem; }
        .fo-month-breakdown { display: flex; flex-direction: column; gap: 0.5rem; }
        .fo-breakdown-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #64748b; }
        .fo-breakdown-row span:last-child { margin-left: auto; font-weight: 600; color: #1e293b; }
        .fo-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .fo-dot-cash { background: #d97706; } .fo-dot-card { background: #8b5cf6; } .fo-dot-bank { background: #f59e0b; }
        .fo-month-cta { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; color: #3b82f6; font-weight: 600; font-size: 0.875rem; text-align: center; }
        
        .fo-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; min-width: 0; }
        .fo-stat-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 1.5rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border: 1px solid #e2e8f0; min-width: 0; box-sizing: border-box; }
        .fo-stat-icon { font-size: 2rem; width: 50px; height: 50px; background: linear-gradient(135deg, #dbeafe, #bfdbfe); display: flex; align-items: center; justify-content: center; border-radius: 12px; flex-shrink: 0; }
        .fo-stat-label { font-size: 0.875rem; color: #64748b; font-weight: 600; }
        .fo-stat-value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
        
        .fo-debt-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; min-width: 0; }
        .fo-debt-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border: 1px solid #e2e8f0; min-width: 0; box-sizing: border-box; }
        .fo-debt-card.fo-debt-danger { background: linear-gradient(135deg, #fee2e2, #fecaca); border-color: #fca5a5; }
        .fo-debt-icon { font-size: 2rem; width: 50px; height: 50px; background: white; display: flex; align-items: center; justify-content: center; border-radius: 12px; flex-shrink: 0; }
        .fo-debt-label { font-size: 0.875rem; color: #64748b; font-weight: 600; display: block; }
        .fo-debt-value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
        .fo-debt-danger .fo-debt-value { color: #dc2626; }
        
        .fo-debt-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; width: 100%; }
        .fo-debt-table { width: 100%; border-collapse: collapse; }
        .fo-debt-table thead { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); }
        .fo-debt-table th { padding: 1rem 1.25rem; text-align: left; font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; white-space: nowrap; }
        .fo-debt-table td { padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
        .fo-debt-table tbody tr:hover { background: #f8fafc; }
        
        .fo-student-info { display: flex; align-items: center; gap: 0.75rem; }
        .fo-student-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
        .fo-student-name { font-weight: 600; color: #1e293b; }
        .fo-student-id { font-size: 0.75rem; color: #64748b; }
        
        .fo-badge { padding: 0.375rem 0.75rem; border-radius: 8px; font-weight: 700; font-size: 0.8rem; display: inline-block; }
        .fo-badge-gray { background: #f1f5f9; color: #475569; }
        .fo-badge-green { background: #fef3c7; color: #78350f; }
        .fo-badge-red { background: #fee2e2; color: #991b1b; }
        
        .fo-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 2rem; backdrop-filter: blur(4px); box-sizing: border-box; }
        .fo-modal { background: white; border-radius: 20px; width: 100%; max-width: 1100px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 50px rgba(0,0,0,0.25); }
        .fo-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; }
        .fo-modal-header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }
        .fo-modal-close { background: rgba(255,255,255,0.2); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.25rem; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
        .fo-modal-close:hover { background: rgba(255,255,255,0.3); }
        .fo-modal-loading { padding: 4rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .fo-spinner { width: 50px; height: 50px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fo-modal-content { padding: 2rem; overflow-y: auto; }
        
        .fo-modal-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .fo-summary-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; border: 1px solid #e2e8f0; position: relative; min-width: 0; box-sizing: border-box; }
        .fo-summary-card.fo-summary-total { background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-color: #93c5fd; }
        .fo-summary-icon { font-size: 1.5rem; flex-shrink: 0; }
        .fo-summary-label { font-size: 0.75rem; color: #64748b; font-weight: 600; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fo-summary-value { font-size: 1.25rem; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fo-growth { position: absolute; top: 0.75rem; right: 0.75rem; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 6px; }
        .fo-growth-up { background: #fef3c7; color: #78350f; }
        .fo-growth-down { background: #fee2e2; color: #991b1b; }
        
        .fo-modal-charts { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; margin-bottom: 2rem; min-width: 0; }
        .fo-modal-chart { background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 0; box-sizing: border-box; width: 100%; }
        .fo-modal-chart h4 { margin: 0 0 1rem 0; font-size: 1rem; color: #475569; }
        .fo-pie-wrap { position: relative; width: 100%; height: 200px; }
        .fo-bar-wrap { position: relative; width: 100%; height: 200px; }
        
        .fo-payments-section h4 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #1e293b; }
        .fo-payments-table-wrap { max-height: 400px; overflow-y: auto; border-radius: 12px; border: 1px solid #e2e8f0; width: 100%; }
        .fo-payments-table { width: 100%; border-collapse: collapse; }
        .fo-payments-table thead { background: linear-gradient(135deg, #f1f5f9, #e2e8f0); position: sticky; top: 0; }
        .fo-payments-table th { padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; white-space: nowrap; }
        .fo-payments-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; white-space: nowrap; }
        .fo-payments-table tbody tr:hover { background: #f8fafc; }
        .fo-student-info-sm { display: flex; align-items: center; gap: 0.5rem; }
        .fo-avatar-sm { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; flex-shrink: 0; }
        .fo-type-badge { padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
        
        /* ========================================================
           NOUTBUK (992px – 1199px) — see DESIGN_SYSTEM.md §1
        ======================================================== */
        @media (min-width: 992px) and (max-width: 1199px) {
          .fo-container { padding: 1.75rem; }
          .fo-balance-grid { grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
          .fo-charts-section, .fo-monthly-section, .fo-stats-section, .fo-debt-section { padding: 1.75rem; }
          .fo-chart-wrapper { height: 280px; }
          .fo-balance-icon { font-size: 2.2rem; width: 54px; height: 54px; }
          .fo-balance-value { font-size: 1.25rem; }
          .fo-monthly-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
          .fo-modal-summary { grid-template-columns: repeat(4, 1fr); }
          .fo-modal-charts { grid-template-columns: 1fr 2fr; }
        }

        /* ========================================================
           PLANSHET (768px – 991px)
        ======================================================== */
        @media (min-width: 768px) and (max-width: 991px) {
          .fo-container { padding: 1.5rem; }
          .fo-balance-grid { grid-template-columns: repeat(2, 1fr); gap: 1.125rem; }
          .fo-charts-grid { grid-template-columns: 1fr; gap: 1.25rem; }
          .fo-charts-section, .fo-monthly-section, .fo-stats-section, .fo-debt-section { padding: 1.5rem; }
          .fo-chart-card { padding: 1.25rem; }
          .fo-chart-wrapper { height: 260px; }
          .fo-section-header h2,
          .fo-monthly-section h2,
          .fo-stats-section h2,
          .fo-debt-section h2 { font-size: 1.35rem; }
          .fo-monthly-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
          .fo-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .fo-debt-summary { grid-template-columns: repeat(2, 1fr); }
          .fo-modal-summary { grid-template-columns: repeat(2, 1fr); }
          .fo-modal-charts { grid-template-columns: 1fr; }
          .fo-modal { max-width: 90%; }
        }

        /* ========================================================
           TELEFON (481px – 767px)
        ======================================================== */
        @media (min-width: 481px) and (max-width: 767px) {
          .fo-container { padding: 1rem; }
          .fo-balance-grid { grid-template-columns: repeat(2, 1fr); gap: 0.875rem; }
          .fo-balance-card { padding: 1.125rem; gap: 0.75rem; }
          .fo-balance-icon { font-size: 1.8rem; width: 46px; height: 46px; border-radius: 11px; }
          .fo-balance-label { font-size: 0.78rem; }
          .fo-balance-value { font-size: 1.05rem; }

          .fo-charts-grid { grid-template-columns: 1fr; gap: 1rem; }
          .fo-charts-section, .fo-monthly-section, .fo-stats-section, .fo-debt-section {
            padding: 1.25rem; border-radius: 14px; margin-bottom: 1.25rem;
          }
          .fo-section-header { flex-direction: column; align-items: stretch; gap: 0.75rem; }
          .fo-section-header h2,
          .fo-monthly-section h2,
          .fo-stats-section h2,
          .fo-debt-section h2 { font-size: 1.15rem; }
          .fo-year-select { width: 100%; }

          .fo-chart-card { padding: 1rem; }
          .fo-chart-card h3 { font-size: 0.95rem; }
          .fo-chart-wrapper { height: 240px; }

          .fo-monthly-grid { grid-template-columns: 1fr; gap: 0.875rem; }
          .fo-month-card { padding: 1rem; }
          .fo-month-name { font-size: 1rem; }
          .fo-month-total { font-size: 1.25rem; }

          .fo-stats-grid, .fo-debt-summary { grid-template-columns: 1fr; gap: 0.875rem; }
          .fo-debt-card { padding: 1rem; }
          .fo-debt-value { font-size: 1.25rem; }

          .fo-modal-overlay { padding: 1rem; }
          .fo-modal { max-width: 100%; max-height: 95vh; border-radius: 16px; }
          .fo-modal-header { padding: 1rem 1.25rem; }
          .fo-modal-header h2 { font-size: 1.15rem; }
          .fo-modal-content { padding: 1.25rem; }
          .fo-modal-summary { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
          .fo-summary-card { padding: 1rem; gap: 0.625rem; }
          .fo-summary-value { font-size: 1rem; }
          .fo-modal-charts { grid-template-columns: 1fr; gap: 1rem; }
          .fo-modal-chart { padding: 1.125rem; }
          .fo-pie-wrap, .fo-bar-wrap { height: 220px; }

          .fo-debt-table th, .fo-debt-table td,
          .fo-payments-table th, .fo-payments-table td { padding: 0.625rem 0.75rem; font-size: 0.78rem; }
        }

        /* ========================================================
           KICHIK TELEFON (≤480px)
        ======================================================== */
        @media (max-width: 480px) {
          .fo-container { padding: 0.75rem; }
          .fo-balance-grid { grid-template-columns: 1fr; gap: 0.75rem; margin-bottom: 1.25rem; }
          .fo-balance-card { padding: 1rem; gap: 0.75rem; border-radius: 14px; }
          .fo-balance-icon { font-size: 1.6rem; width: 42px; height: 42px; }
          .fo-balance-label { font-size: 0.72rem; }
          .fo-balance-value { font-size: 1rem; }

          .fo-charts-section, .fo-monthly-section, .fo-stats-section, .fo-debt-section {
            padding: 1rem; border-radius: 14px; margin-bottom: 1rem;
          }
          .fo-section-header { flex-direction: column; align-items: stretch; gap: 0.5rem; }
          .fo-section-header h2,
          .fo-monthly-section h2,
          .fo-stats-section h2,
          .fo-debt-section h2 { font-size: 1rem; }
          .fo-year-select { padding: 0.55rem 0.85rem; font-size: 0.85rem; }
          .fo-monthly-subtitle { font-size: 0.78rem; }

          .fo-charts-grid { grid-template-columns: 1fr; gap: 0.875rem; }
          .fo-chart-card { padding: 0.875rem; border-radius: 12px; }
          .fo-chart-card h3 { font-size: 0.875rem; }
          .fo-chart-wrapper { height: 220px; }

          .fo-monthly-grid { grid-template-columns: 1fr; gap: 0.75rem; }
          .fo-month-card { padding: 0.875rem; border-radius: 12px; }
          .fo-month-name { font-size: 0.95rem; }
          .fo-month-badge { font-size: 1.1rem; }
          .fo-month-total { font-size: 1.15rem; margin-bottom: 0.75rem; }
          .fo-breakdown-row { font-size: 0.75rem; }
          .fo-month-cta { font-size: 0.8rem; padding-top: 0.55rem; margin-top: 0.75rem; }

          .fo-stats-grid, .fo-debt-summary { grid-template-columns: 1fr; gap: 0.625rem; }
          .fo-stat-card, .fo-debt-card { padding: 0.875rem; gap: 0.75rem; }
          .fo-stat-icon, .fo-debt-icon { width: 42px; height: 42px; font-size: 1.6rem; }
          .fo-stat-label, .fo-debt-label { font-size: 0.75rem; }
          .fo-stat-value, .fo-debt-value { font-size: 1.1rem; }

          .fo-modal-overlay { padding: 0.5rem; }
          .fo-modal { max-width: 100%; max-height: 95vh; border-radius: 14px; margin: 0; }
          .fo-modal-header { padding: 0.875rem 1rem; }
          .fo-modal-header h2 { font-size: 1rem; }
          .fo-modal-close { width: 32px; height: 32px; font-size: 1.1rem; }
          .fo-modal-content { padding: 0.875rem; }
          .fo-modal-summary { grid-template-columns: 1fr; gap: 0.625rem; margin-bottom: 1.25rem; }
          .fo-summary-card { padding: 0.875rem; gap: 0.625rem; }
          .fo-summary-icon { font-size: 1.25rem; }
          .fo-summary-label { font-size: 0.7rem; }
          .fo-summary-value { font-size: 0.95rem; }
          .fo-modal-charts { grid-template-columns: 1fr; gap: 0.875rem; }
          .fo-modal-chart { padding: 0.875rem; }
          .fo-pie-wrap, .fo-bar-wrap { height: 200px; }

          .fo-debt-table-wrap, .fo-payments-table-wrap { border-radius: 10px; }
          .fo-debt-table th, .fo-debt-table td,
          .fo-payments-table th, .fo-payments-table td { padding: 0.5rem 0.625rem; font-size: 0.72rem; }
          .fo-badge, .fo-type-badge { padding: 0.25rem 0.55rem; font-size: 0.7rem; }
          .fo-student-avatar { width: 32px; height: 32px; font-size: 0.65rem; }
          .fo-avatar-sm { width: 26px; height: 26px; font-size: 0.55rem; }
        }
      `}</style>
    </div>
  );
};

export default FinancialOverview;
