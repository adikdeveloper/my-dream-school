import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../../services/apiService';

const AttendanceManagement = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });

  // Load classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await apiService.getClasses();
        setClasses(response.classes || []);
        if (response.classes?.length > 0) {
          setSelectedClass(response.classes[0]._id);
        }
      } catch (err) {
        setError('Sinflarni yuklashda xatolik');
      }
    };
    loadClasses();
  }, []);

  const dateRange = useMemo(() => {
    if (activeTab === 'daily') {
      return { startDate: selectedDate, endDate: selectedDate };
    } else if (activeTab === 'weekly') {
      if (!selectedWeek) return { startDate: '', endDate: '' };
      const [year, weekStr] = selectedWeek.split('-W');
      const d = new Date(year, 0, 4);
      const dayNum = d.getDay() || 7;
      d.setDate(d.getDate() - dayNum + 1);
      d.setDate(d.getDate() + (parseInt(weekStr) - 1) * 7);
      const start = new Date(d);
      const end = new Date(d);
      end.setDate(start.getDate() + 6);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else {
      if (!selectedMonth) return { startDate: '', endDate: '' };
      const [year, month] = selectedMonth.split('-');
      const firstDay = new Date(year, parseInt(month) - 1, 1);
      const lastDay = new Date(year, parseInt(month), 0);
      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      };
    }
  }, [selectedDate, selectedWeek, selectedMonth, activeTab]);

  // Load attendance data
  const loadAttendance = useCallback(async () => {
    if (!selectedClass) return;

    setLoading(true);
    setError('');

    try {
      let params = {};
      if (selectedClass !== 'all') {
        params.classId = selectedClass;
      }

      if (activeTab === 'daily') {
        params.date = selectedDate;
      } else {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }
      
      const data = await apiService.getAttendance(params);

      const attendanceArray = Array.isArray(data) ? data : [];
      setAttendanceData(attendanceArray);

      // Calculate stats
      const present = attendanceArray.filter(a => a.status === 'present' || a.status === 'keldi').length;
      const absent = attendanceArray.filter(a => a.status === 'absent' || a.status === 'kelmadi').length;
      const late = attendanceArray.filter(a => a.status === 'late').length;
      const excused = attendanceArray.filter(a => a.status === 'excused' || a.status === 'sababli').length;

      setStats({
        present,
        absent,
        late,
        excused,
        total: attendanceArray.length
      });
    } catch (err) {
      setError('Davomat ma\'lumotlarini yuklashda xatolik');
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedDate, activeTab, dateRange]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'present': { label: 'Keldi', class: 'badge-success' },
      'keldi': { label: 'Keldi', class: 'badge-success' },
      'absent': { label: 'Kelmadi', class: 'badge-danger' },
      'kelmadi': { label: 'Kelmadi', class: 'badge-danger' },
      'late': { label: 'Kech qoldi', class: 'badge-warning' },
      'excused': { label: 'Sababli', class: 'badge-info' },
      'sababli': { label: 'Sababli', class: 'badge-info' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'badge-secondary' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Group attendance by student for weekly/monthly view
  const groupedAttendance = useMemo(() => {
    if (activeTab === 'daily') return {};

    const grouped = {};
    attendanceData.forEach(record => {
      const studentId = record.student?._id;
      if (!studentId) return;

      if (!grouped[studentId]) {
        grouped[studentId] = {
          student: record.student,
          records: []
        };
      }
      grouped[studentId].records.push(record);
    });
    return grouped;
  }, [attendanceData, activeTab]);

  return (
    <div className="attendance-management">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">📋</span>
            Davomat boshqaruvi
          </h1>
          <p className="page-subtitle">O'quvchilar davomatini ko'rish va boshqarish</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Jami yozuvlar</div>
          </div>
        </div>
        <div className="stat-card stat-present">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.present}</div>
            <div className="stat-label">Kelganlar</div>
          </div>
        </div>
        <div className="stat-card stat-absent">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats.absent}</div>
            <div className="stat-label">Kelmaganlar</div>
          </div>
        </div>
        <div className="stat-card stat-excused">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-value">{stats.excused}</div>
            <div className="stat-label">Sababli</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          📆 Kunlik
        </button>
        <button
          className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          📅 Haftalik
        </button>
        <button
          className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          🗓️ Oylik
        </button>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-group">
          <label className="filter-label">Sinf</label>
          <select
            className="filter-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">Barcha sinflar</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>
                {cls.name} ({cls.students?.length || 0} o'quvchi)
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">
            {activeTab === 'daily' ? 'Sana' : activeTab === 'weekly' ? 'Hafta' : 'Oy'}
          </label>
          {activeTab === 'daily' && (
            <input
              type="date"
              className="filter-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}
          {activeTab === 'weekly' && (
            <input
              type="week"
              className="filter-input"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            />
          )}
          {activeTab === 'monthly' && (
            <input
              type="month"
              className="filter-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          )}
        </div>
        {activeTab !== 'daily' && (
          <div className="date-range-info">
            <span className="range-label">Davr:</span>
            <span className="range-value">{formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="error-message">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Yuklanmoqda...</span>
        </div>
      )}

      {/* Attendance Table */}
      {!loading && attendanceData.length > 0 && (
        <div className="table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>#</th>
                <th>O'quvchi</th>
                <th>Sinf</th>
                {activeTab === 'daily' && <th>Dars</th>}
                {activeTab === 'daily' && <th>Fan</th>}
                <th>Sana</th>
                <th>Holat</th>
                {activeTab !== 'daily' && <th>Jami</th>}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'daily' ? (
                attendanceData.map((record, index) => (
                  <tr key={record._id || index}>
                    <td>{index + 1}</td>
                    <td className="student-name">
                      {record.student?.firstName} {record.student?.lastName}
                    </td>
                    <td>{record.class?.name || '—'}</td>
                    <td>{record.period}-dars</td>
                    <td>{record.subject?.name || '—'}</td>
                    <td>{formatDate(record.date)}</td>
                    <td>{getStatusBadge(record.status)}</td>
                  </tr>
                ))
              ) : (
                Object.values(groupedAttendance).map((item, index) => (
                  <tr key={item.student?._id || index}>
                    <td>{index + 1}</td>
                    <td className="student-name">
                      {item.student?.firstName} {item.student?.lastName}
                    </td>
                    <td>{item.records[0]?.class?.name || '—'}</td>
                    <td>{formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}</td>
                    <td>
                      <div className="status-summary">
                        <span className="summary-item success">✅ {item.records.filter(r => r.status === 'present' || r.status === 'keldi').length}</span>
                        <span className="summary-item danger">❌ {item.records.filter(r => r.status === 'absent' || r.status === 'kelmadi').length}</span>
                        <span className="summary-item info">📝 {item.records.filter(r => r.status === 'excused' || r.status === 'sababli').length}</span>
                      </div>
                    </td>
                    <td>{item.records.length} ta</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && attendanceData.length === 0 && (
        <div className="empty-state">
          <h3>Davomat topilmadi</h3>
          <p>Tanlangan davr uchun davomat ma'lumotlari mavjud emas</p>
        </div>
      )}

      <style>{`
        .attendance-management {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 1.5rem;
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
        }

        .title-icon {
          font-size: 1.75rem;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .stat-icon {
          font-size: 1.5rem;
          padding: 0.5rem;
          border-radius: 8px;
          background: #f1f5f9;
        }

        .stat-total .stat-icon { background: #dbeafe; }
        .stat-present .stat-icon { background: #dcfce7; }
        .stat-absent .stat-icon { background: #fee2e2; }
        .stat-excused .stat-icon { background: #fef3c7; }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
        }

        /* Tabs */
        .tabs-container {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          background: #f1f5f9;
          padding: 0.25rem;
          border-radius: 10px;
          width: fit-content;
        }

        .tab-btn {
          padding: 0.625rem 1rem;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #1e293b;
        }

        .tab-btn.active {
          background: white;
          color: #1e293b;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Filters */
        .filters-container {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
        }

        .filter-select, .filter-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          min-width: 200px;
        }

        .filter-select:focus, .filter-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .date-range-info {
          background: #f1f5f9;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .range-label {
          color: #64748b;
          margin-right: 0.5rem;
        }

        .range-value {
          font-weight: 600;
          color: #1e293b;
        }

        /* Table */
        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
        }

        .attendance-table th,
        .attendance-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .attendance-table th {
          background: #f8fafc;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }

        .attendance-table tr:hover {
          background: #f8fafc;
        }

        .student-name {
          font-weight: 500;
          color: #1e293b;
        }

        /* Status Badges */
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-info { background: #dbeafe; color: #1e40af; }
        .badge-secondary { background: #f1f5f9; color: #64748b; }

        .status-summary {
          display: flex;
          gap: 0.5rem;
        }

        .summary-item {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .summary-item.success { color: #166534; }
        .summary-item.danger { color: #991b1b; }
        .summary-item.info { color: #1e40af; }

        /* Loading */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
          color: #64748b;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 12px;
          border: 2px dashed #e2e8f0;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          color: #64748b;
          margin: 0;
        }

        /* Error */
        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .attendance-management {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .filters-container {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-select, .filter-input {
            min-width: 100%;
          }

          .attendance-table {
            font-size: 0.8125rem;
          }

          .attendance-table th,
          .attendance-table td {
            padding: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }

          .stat-card {
            padding: 0.75rem;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .tabs-container {
            width: 100%;
          }

          .tab-btn {
            flex: 1;
            padding: 0.5rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceManagement;
