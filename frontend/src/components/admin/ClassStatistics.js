import React from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import './ClassStatistics.css';

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const percentOf = (value, total) => {
  if (!total) return '0.0';
  return ((toNumber(value) / total) * 100).toFixed(1);
};

const StatIcon = ({ type }) => {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  if (type === 'students') {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21a6 6 0 0 1 12 0" />
        <path d="M17 8a3 3 0 0 1 0 6" />
        <path d="M18 17a4 4 0 0 1 4 4" />
      </svg>
    );
  }

  if (type === 'attendance') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    );
  }

  if (type === 'grades') {
    return (
      <svg {...commonProps}>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" />
      <path d="M4 6.5v13M8 8h8M8 12h6" />
    </svg>
  );
};

const ClassStatistics = ({ statisticsData, classInfo }) => {
  if (!statisticsData) {
    return (
      <div className="cs-loading">
        <div className="cs-spinner"></div>
        <p>Statistika yuklanmoqda...</p>
      </div>
    );
  }

  const classInfoSafe = statisticsData.classInfo || classInfo || {};
  const attendance = statisticsData.attendance || {};
  const attendanceOverall = attendance.overall || {};
  const grades = statisticsData.grades || {};
  const gradesOverall = grades.overall || {};
  const distribution = gradesOverall.distribution || {};

  const attendanceByDate = Array.isArray(attendance.byDate) ? attendance.byDate : [];
  const attendanceBySubject = Array.isArray(attendance.bySubject) ? attendance.bySubject : [];
  const gradesBySubject = Array.isArray(grades.bySubject) ? grades.bySubject : [];

  const studentCount = toNumber(classInfoSafe.studentCount);
  const subjectCount = toNumber(classInfoSafe.subjectCount);
  const totalAttendance = toNumber(attendanceOverall.total);
  const totalGrades = toNumber(gradesOverall.totalGrades);
  const attendanceRate = toNumber(attendanceOverall.attendanceRate);
  const averageGrade = toNumber(gradesOverall.average);

  const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 900;

  const attendancePieData = {
    labels: ['Keldi', 'Kelmadi', 'Kech qoldi', 'Sababli'],
    datasets: [{
      data: [
        toNumber(attendanceOverall.present),
        toNumber(attendanceOverall.absent),
        toNumber(attendanceOverall.late),
        toNumber(attendanceOverall.excused)
      ],
      backgroundColor: ['#16a34a', '#ef4444', '#f59e0b', '#6366f1'],
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 6
    }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 2 },
    cutout: '64%',
    plugins: {
      legend: {
        position: isNarrowScreen ? 'bottom' : 'right',
        labels: {
          boxWidth: 9,
          boxHeight: 9,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          color: '#475569',
          font: { size: 12, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} (${percentOf(context.parsed, totalAttendance)}%)`
        }
      }
    }
  };

  const gradesBarData = {
    labels: ["A'lo", 'Yaxshi', "O'rta", 'Past'],
    datasets: [{
      label: 'Baholar soni',
      data: [
        toNumber(distribution.excellent),
        toNumber(distribution.good),
        toNumber(distribution.average),
        toNumber(distribution.poor)
      ],
      backgroundColor: ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444'],
      borderRadius: 7,
      maxBarThickness: 48,
      borderSkipped: false
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `Soni: ${context.parsed.y} (${percentOf(context.parsed.y, totalGrades)}%)`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '600' } }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#94a3b8', font: { size: 11 } },
        grid: { color: '#f1f5f9' },
        border: { display: false }
      }
    }
  };

  const lineData = {
    labels: attendanceByDate.map(item => {
      const date = new Date(item._id);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: 'Keldi',
        data: attendanceByDate.map(item => toNumber(item.present)),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.08)',
        pointBackgroundColor: '#16a34a',
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        fill: true,
        tension: 0.38
      },
      {
        label: 'Kelmadi',
        data: attendanceByDate.map(item => toNumber(item.absent)),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        pointBackgroundColor: '#ef4444',
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
        fill: true,
        tension: 0.38
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 14,
          color: '#475569',
          font: { size: 11, weight: '600' }
        }
      },
      tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 10, font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#94a3b8', font: { size: 10 } },
        grid: { color: '#f1f5f9' },
        border: { display: false }
      }
    }
  };

  const subjectGradesData = {
    labels: gradesBySubject.map(item => item.subjectName),
    datasets: [{
      label: "O'rtacha ball",
      data: gradesBySubject.map(item => toNumber(item.average)),
      backgroundColor: '#3b82f6',
      hoverBackgroundColor: '#2563eb',
      borderRadius: 6,
      maxBarThickness: 22,
      borderSkipped: false
    }]
  };

  const subjectBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `O'rtacha: ${context.parsed.x}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 10, color: '#94a3b8', font: { size: 10 } },
        grid: { color: '#f1f5f9' },
        border: { display: false }
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#475569', font: { size: 11, weight: '600' } }
      }
    }
  };

  const hasAttendanceData = totalAttendance > 0;
  const hasGradesData = totalGrades > 0;

  return (
    <div className="cs-wrap">
      {/* Key metrics */}
      <div className="cs-metrics">
        <div className="cs-metric cs-metric-students">
          <span className="cs-metric-icon"><StatIcon type="students" /></span>
          <div className="cs-metric-body">
            <span className="cs-metric-label">Jami o'quvchilar</span>
            <span className="cs-metric-value">{studentCount}</span>
          </div>
        </div>

        <div className="cs-metric cs-metric-attendance">
          <span className="cs-metric-icon"><StatIcon type="attendance" /></span>
          <div className="cs-metric-body">
            <span className="cs-metric-label">Davomat foizi</span>
            <span className="cs-metric-value">{attendanceRate}%</span>
            <span className="cs-metric-hint">
              {toNumber(attendanceOverall.present)} / {totalAttendance} ta yozuv
            </span>
          </div>
        </div>

        <div className="cs-metric cs-metric-grades">
          <span className="cs-metric-icon"><StatIcon type="grades" /></span>
          <div className="cs-metric-body">
            <span className="cs-metric-label">O'rtacha ball</span>
            <span className="cs-metric-value">{averageGrade}</span>
            <span className="cs-metric-hint">{totalGrades} ta baholash</span>
          </div>
        </div>

        <div className="cs-metric cs-metric-subjects">
          <span className="cs-metric-icon"><StatIcon type="subjects" /></span>
          <div className="cs-metric-body">
            <span className="cs-metric-label">Fanlar soni</span>
            <span className="cs-metric-value">{subjectCount}</span>
          </div>
        </div>
      </div>

      {/* Attendance & grade distribution */}
      <div className="cs-chart-grid">
        <section className="cs-card">
          <div className="cs-card-head">
            <div>
              <h3>Davomat taqsimoti</h3>
              <p>Jami {totalAttendance} ta davomat yozuvi</p>
            </div>
            <span className="cs-card-badge cs-badge-green">{attendanceRate}%</span>
          </div>
          <div className="cs-card-body cs-chart-pie">
            {hasAttendanceData ? (
              <Pie data={attendancePieData} options={pieOptions} />
            ) : (
              <div className="cs-empty-chart">Davomat ma'lumotlari yo'q</div>
            )}
          </div>
        </section>

        <section className="cs-card">
          <div className="cs-card-head">
            <div>
              <h3>Baholar taqsimoti</h3>
              <p>Jami {totalGrades} ta baho</p>
            </div>
            <span className="cs-card-badge cs-badge-blue">O'rtacha {averageGrade}</span>
          </div>
          <div className="cs-card-body cs-chart-bar">
            {hasGradesData ? (
              <Bar data={gradesBarData} options={barOptions} />
            ) : (
              <div className="cs-empty-chart">Baholar ma'lumotlari yo'q</div>
            )}
          </div>
        </section>
      </div>

      {/* Attendance trend */}
      {attendanceByDate.length > 0 && (
        <section className="cs-card">
          <div className="cs-card-head">
            <div>
              <h3>Davomat tendensiyasi</h3>
              <p>Oxirgi 30 kunlik kunlik davomat o'zgarishi</p>
            </div>
            <span className="cs-card-badge cs-badge-slate">{attendanceByDate.length} kun</span>
          </div>
          <div className="cs-card-body cs-chart-line">
            <Line data={lineData} options={lineOptions} />
          </div>
        </section>
      )}

      {/* Subject average */}
      {gradesBySubject.length > 0 && (
        <section className="cs-card">
          <div className="cs-card-head">
            <div>
              <h3>Fanlar bo'yicha o'rtacha ball</h3>
              <p>{gradesBySubject.length} ta fan bo'yicha natijalar</p>
            </div>
            <span className="cs-card-badge cs-badge-blue">100 ballik tizim</span>
          </div>
          <div
            className="cs-card-body cs-chart-subject"
            style={{ height: `${Math.max(220, gradesBySubject.length * 42)}px` }}
          >
            <Bar data={subjectGradesData} options={subjectBarOptions} />
          </div>
        </section>
      )}

      {/* Detailed tables */}
      {(attendanceBySubject.length > 0 || gradesBySubject.length > 0) && (
        <div className="cs-tables">
          {attendanceBySubject.length > 0 && (
            <section className="cs-table-card">
              <div className="cs-table-head">
                <div>
                  <h3>Fanlar bo'yicha davomat</h3>
                  <p>Fan kesimida davomat ko'rsatkichlari</p>
                </div>
                <span className="cs-card-badge cs-badge-slate">{attendanceBySubject.length} ta fan</span>
              </div>
              <div className="cs-table-scroll">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Fan nomi</th>
                      <th>Jami</th>
                      <th>Keldi</th>
                      <th>Davomat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceBySubject.map((subject, index) => (
                      <tr key={`${subject.subjectName || 'subject'}-${index}`}>
                        <td className="cs-cell-name">{subject.subjectName}</td>
                        <td>{toNumber(subject.total)}</td>
                        <td className="cs-text-success">{toNumber(subject.present)}</td>
                        <td>
                          <div className="cs-progress">
                            <div className="cs-progress-track">
                              <div
                                className="cs-progress-fill"
                                style={{ width: `${Math.min(toNumber(subject.attendanceRate), 100)}%` }}
                              ></div>
                            </div>
                            <span className="cs-progress-label">{toNumber(subject.attendanceRate)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {gradesBySubject.length > 0 && (
            <section className="cs-table-card">
              <div className="cs-table-head">
                <div>
                  <h3>Fanlar bo'yicha baholar</h3>
                  <p>Fan kesimida baho taqsimoti</p>
                </div>
                <span className="cs-card-badge cs-badge-blue">{gradesBySubject.length} ta fan</span>
              </div>
              <div className="cs-table-scroll">
                <table className="cs-table">
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
                    {gradesBySubject.map((subject, index) => {
                      const subjectDistribution = subject.distribution || {};
                      return (
                        <tr key={`${subject.subjectName || 'subject'}-${index}`}>
                          <td className="cs-cell-name">{subject.subjectName}</td>
                          <td className="cs-cell-average">{toNumber(subject.average)}</td>
                          <td className="cs-text-success">{toNumber(subjectDistribution.excellent)}</td>
                          <td className="cs-text-blue">{toNumber(subjectDistribution.good)}</td>
                          <td className="cs-text-warning">{toNumber(subjectDistribution.average)}</td>
                          <td className="cs-text-danger">{toNumber(subjectDistribution.poor)}</td>
                          <td>{toNumber(subject.totalGrades)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassStatistics;
