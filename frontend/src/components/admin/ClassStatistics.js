import React from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import './ClassStatistics.css';

const ClassStatistics = ({ statisticsData, classInfo }) => {
  if (!statisticsData) {
    return (
      <div className="statistics-loading">
        <div className="loading-spinner"></div>
        <p>Statistika yuklanmoqda...</p>
      </div>
    );
  }

  // Attendance Pie Chart Data
  const attendancePieData = {
    labels: ['Keldi', 'Kelmadi', 'Kech qoldi', 'Sababli'],
    datasets: [{
      data: [
        statisticsData.attendance.overall.present,
        statisticsData.attendance.overall.absent,
        statisticsData.attendance.overall.late,
        statisticsData.attendance.overall.excused || 0
      ],
      backgroundColor: [
        '#10b981',  // Green
        '#ef4444',  // Red
        '#f59e0b',  // Orange
        '#6366f1'   // Indigo
      ],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: { size: 13, weight: '600' },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Grades Distribution Bar Chart Data
  const gradesBarData = {
    labels: ["A'lo (85-100)", 'Yaxshi (70-84)', "O'rta (60-69)", 'Past (0-59)'],
    datasets: [{
      label: 'Baholar soni',
      data: [
        statisticsData.grades.overall.distribution.excellent,
        statisticsData.grades.overall.distribution.good,
        statisticsData.grades.overall.distribution.average,
        statisticsData.grades.overall.distribution.poor
      ],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',  // Green
        'rgba(59, 130, 246, 0.8)',  // Blue
        'rgba(245, 158, 11, 0.8)',  // Orange
        'rgba(239, 68, 68, 0.8)'    // Red
      ],
      borderColor: [
        'rgb(16, 185, 129)',
        'rgb(59, 130, 246)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 2
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = statisticsData.grades.overall.totalGrades;
            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
            return `Soni: ${context.parsed.y} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  // Attendance Trend Line Chart Data (last 30 days)
  const attendanceByDate = statisticsData.attendance.byDate || [];
  const lineData = {
    labels: attendanceByDate.map(d => {
      const date = new Date(d._id);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: 'Keldi',
        data: attendanceByDate.map(d => d.present),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Kelmadi',
        data: attendanceByDate.map(d => d.absent),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12, weight: '600' }, usePointStyle: true }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  // Subject-wise Grades Bar Chart
  const subjectGradesData = {
    labels: (statisticsData.grades.bySubject || []).map(s => s.subjectName),
    datasets: [{
      label: "O'rtacha ball",
      data: (statisticsData.grades.bySubject || []).map(s => s.average),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2
    }]
  };

  const subjectBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 10 }
      }
    }
  };

  return (
    <div className="professional-statistics">
      {/* Key Metrics Summary */}
      <div className="metrics-summary">
        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)'}}>
            <span>👥</span>
          </div>
          <div className="metric-content">
            <div className="metric-label">Jami O'quvchilar</div>
            <div className="metric-value">{statisticsData.classInfo.studentCount}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
            <span>✅</span>
          </div>
          <div className="metric-content">
            <div className="metric-label">Davomat Foizi</div>
            <div className="metric-value">{statisticsData.attendance.overall.attendanceRate}%</div>
            <div className="metric-detail">
              {statisticsData.attendance.overall.present} / {statisticsData.attendance.overall.total}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
            <span>⭐</span>
          </div>
          <div className="metric-content">
            <div className="metric-label">O'rtacha Ball</div>
            <div className="metric-value">{statisticsData.grades.overall.average}</div>
            <div className="metric-detail">
              {statisticsData.grades.overall.totalGrades} ta baholash
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
            <span>📚</span>
          </div>
          <div className="metric-content">
            <div className="metric-label">Fanlar Soni</div>
            <div className="metric-value">{statisticsData.classInfo.subjectCount}</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Attendance & Grades Distribution */}
      <div className="charts-row-2">
        <div className="chart-container">
          <div className="chart-header">
            <h3>📊 Davomat Taqsimoti</h3>
            <p className="chart-subtitle">Jami: {statisticsData.attendance.overall.total} ta yozuv</p>
          </div>
          <div className="chart-canvas" style={{height: '300px'}}>
            <Pie data={attendancePieData} options={pieOptions} />
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>📈 Baholar Taqsimoti</h3>
            <p className="chart-subtitle">Jami: {statisticsData.grades.overall.totalGrades} ta baho</p>
          </div>
          <div className="chart-canvas" style={{height: '300px'}}>
            <Bar data={gradesBarData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Charts Row 2: Trends & Subject Performance */}
      {attendanceByDate.length > 0 && (
        <div className="chart-container-full">
          <div className="chart-header">
            <h3>📅 Davomat Tendensiyasi (Oxirgi 30 kun)</h3>
            <p className="chart-subtitle">Kunlik davomat o'zgarishi</p>
          </div>
          <div className="chart-canvas" style={{height: '250px'}}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
      )}

      {statisticsData.grades.bySubject && statisticsData.grades.bySubject.length > 0 && (
        <div className="chart-container-full">
          <div className="chart-header">
            <h3>📚 Fanlar bo'yicha O'rtacha Balllar</h3>
            <p className="chart-subtitle">{statisticsData.grades.bySubject.length} ta fan</p>
          </div>
          <div className="chart-canvas" style={{height: '300px'}}>
            <Bar data={subjectGradesData} options={subjectBarOptions} />
          </div>
        </div>
      )}

      {/* Detailed Data Tables */}
      <div className="data-tables">
        {/* Attendance by Subject Table */}
        {statisticsData.attendance.bySubject && statisticsData.attendance.bySubject.length > 0 && (
          <div className="data-table-container">
            <div className="table-header">
              <h3>📋 Fanlar bo'yicha Davomat</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fan nomi</th>
                  <th>Jami yozuv</th>
                  <th>Keldi</th>
                  <th>Davomat %</th>
                </tr>
              </thead>
              <tbody>
                {statisticsData.attendance.bySubject.map((subject, index) => (
                  <tr key={index}>
                    <td className="subject-name">{subject.subjectName}</td>
                    <td>{subject.total}</td>
                    <td className="text-success">{subject.present}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{width: `${subject.attendanceRate}%`}}
                          ></div>
                        </div>
                        <span className="progress-label">{subject.attendanceRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grades by Subject Table */}
        {statisticsData.grades.bySubject && statisticsData.grades.bySubject.length > 0 && (
          <div className="data-table-container">
            <div className="table-header">
              <h3>📊 Fanlar bo'yicha Baholar</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fan nomi</th>
                  <th>O'rtacha</th>
                  <th>A'lo</th>
                  <th>Yaxshi</th>
                  <th>O'rta</th>
                  <th>Past</th>
                  <th>Jami</th>
                </tr>
              </thead>
              <tbody>
                {statisticsData.grades.bySubject.map((subject, index) => (
                  <tr key={index}>
                    <td className="subject-name">{subject.subjectName}</td>
                    <td className="grade-average">{subject.average}</td>
                    <td className="grade-excellent">{subject.distribution.excellent}</td>
                    <td className="grade-good">{subject.distribution.good}</td>
                    <td className="grade-average-count">{subject.distribution.average}</td>
                    <td className="grade-poor">{subject.distribution.poor}</td>
                    <td>{subject.totalGrades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassStatistics;
