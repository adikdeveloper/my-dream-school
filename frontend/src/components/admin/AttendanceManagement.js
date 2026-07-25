import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../../services/apiService';

const AttendanceManagement = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Calculate date ranges based on active tab
  const dateRange = useMemo(() => {
    const today = new Date(selectedDate);

    if (activeTab === 'daily') {
      return { startDate: selectedDate, endDate: selectedDate };
    } else if (activeTab === 'weekly') {
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0]
      };
    } else {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0]
      };
    }
  }, [selectedDate, activeTab]);

  // Load attendance data
  const loadAttendance = useCallback(async () => {
    if (!selectedClass) return;

    setLoading(true);
    setError('');

    try {
      let data;
      if (activeTab === 'daily') {
        data = await apiService.getAttendance({
          classId: selectedClass,
          date: selectedDate
        });
      } else {
        data = await apiService.getAttendance({
          classId: selectedClass,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
      }

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
          <input
            type="date"
            className="filter-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
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
