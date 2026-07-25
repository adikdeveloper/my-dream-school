import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import StudentPayments from './StudentPayments';

const DebtorsList = () => {
  const { setLoading, setError } = useData();
  const [students, setStudents] = useState([]);
  const [paymentsData, setPaymentsData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [sortBy] = useState('debt'); // debt, name, class
  const [monthsFilter, setMonthsFilter] = useState('all'); // all, 1, 2, 3+
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  // Load students and their payment data - OPTIMIZED
  const loadData = useCallback(async () => {
    try {
      setLocalLoading(true);
      setLocalError('');
      setLoading(true);

      // Use the new optimized endpoint that returns all debtors in one query
      const response = await apiService.getAllDebtors();
      const debtors = response.debtors || [];

      // Format the data for display
      const paymentsMap = {};
      debtors.forEach(debtor => {
        paymentsMap[debtor._id] = {
          payments: [],
          unpaidMonths: debtor.unpaidMonths || [],
          totalDebt: debtor.totalDebt || 0
        };
      });

      setStudents(debtors);
      setPaymentsData(paymentsMap);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Ma\'lumotlarni yuklashda xatolik';
      setError(errorMsg);
      setLocalError(errorMsg);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  }, [setLoading, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      const firstName = student.firstName?.toLowerCase() || '';
      const lastName = student.lastName?.toLowerCase() || '';
      const studentId = student.studentId?.toLowerCase() || '';
      const className = student.classId?.name?.toLowerCase() || '';

      const matchesSearch = firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        studentId.includes(searchLower) ||
        className.includes(searchLower);

      // Filter by unpaid months count
      const unpaidMonthsCount = paymentsData[student._id]?.unpaidMonths?.length || 0;
      let matchesMonths = true;

      if (monthsFilter === '1') {
        matchesMonths = unpaidMonthsCount === 1;
      } else if (monthsFilter === '2') {
        matchesMonths = unpaidMonthsCount === 2;
      } else if (monthsFilter === '3+') {
        matchesMonths = unpaidMonthsCount >= 3;
      }

      return matchesSearch && matchesMonths;
    });

    // Sort students
    filtered.sort((a, b) => {
      if (sortBy === 'debt') {
        const debtA = paymentsData[a._id]?.totalDebt || 0;
        const debtB = paymentsData[b._id]?.totalDebt || 0;
        return debtB - debtA; // Descending
      } else if (sortBy === 'name') {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'class') {
        const classA = a.classId?.name || '';
        const classB = b.classId?.name || '';
        return classA.localeCompare(classB);
      }
      return 0;
    });

    return filtered;
  }, [students, searchTerm, sortBy, monthsFilter, paymentsData]);

  // Calculate total stats
  const stats = useMemo(() => {
    const totalDebtors = filteredAndSortedStudents.length;
    const totalDebt = filteredAndSortedStudents.reduce((sum, student) => {
      return sum + (paymentsData[student._id]?.totalDebt || 0);
    }, 0);
    const averageDebt = totalDebtors > 0 ? Math.round(totalDebt / totalDebtors) : 0;
    const maxDebt = filteredAndSortedStudents.reduce((max, student) => {
      const debt = paymentsData[student._id]?.totalDebt || 0;
      return debt > max ? debt : max;
    }, 0);

    return { totalDebtors, totalDebt, averageDebt, maxDebt };
  }, [filteredAndSortedStudents, paymentsData]);

  const handleViewPayments = (student) => {
    setSelectedStudent(student);
    setShowPaymentsModal(true);
  };

  const handleClosePayments = () => {
    setShowPaymentsModal(false);
    setSelectedStudent(null);
    // Reload data after payment changes
    loadData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const getClassInfo = (student) => {
    if (student.classId) {
      const { grade, section, name } = student.classId;
      if (grade !== null && grade !== undefined && grade !== '') {
        return `${grade}-${section}`;
      }
      return name || section || 'Biriktirilmagan';
    }
    return 'Biriktirilmagan';
  };

  return (
    <div className="debtors-list">
      {/* Loading Overlay */}
      {localLoading && (
        <div className="loading-overlay">
          <div className="loading-container">
            <div className="loading-card">
              <div className="loading-logo">
                <div className="logo-circle">
                  <div className="logo-inner"></div>
                </div>
                <div className="loading-rings">
                  <div className="ring ring-1"></div>
                  <div className="ring ring-2"></div>
                  <div className="ring ring-3"></div>
                </div>
              </div>
              <div className="loading-text">
                <h3>Ma'lumotlar yuklanmoqda</h3>
                <p>Iltimos kuting...</p>
              </div>
              <div className="loading-progress">
                <div className="progress-bar"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {localError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{localError}</span>
          <button className="error-close" onClick={() => setLocalError('')}>✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalDebtors}</div>
            <div className="stat-label">Jami qarzdorlar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-debt">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.totalDebt)}</div>
            <div className="stat-label">Jami qarz</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-average">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.averageDebt)}</div>
            <div className="stat-label">O'rtacha qarz</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-max">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.maxDebt)}</div>
            <div className="stat-label">Maksimal qarz</div>
          </div>
          <div className="stat-decoration"></div>
        </div>
      </div>

      {/* Filters and Search Section */}
      <div className="filters-container">
        <div className="filter-card">
          <div className="filter-left">
            <div className="filter-item">
              <label className="filter-label">
                <span className="label-icon">🔍</span>
                Qidiruv
              </label>
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Ism, familiya, ID, sinf..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button
                    className="search-clear"
                    onClick={() => setSearchTerm('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="filter-item">
              <label className="filter-label">
                <span className="label-icon">📅</span>
                To'lanmagan oylar
              </label>
              <select
                value={monthsFilter}
                onChange={(e) => setMonthsFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Barchasi</option>
                <option value="1">1 oy</option>
                <option value="2">2 oy</option>
                <option value="3+">3+ oy</option>
              </select>
            </div>

            <div className="filter-results">
              <span className="results-count">{filteredAndSortedStudents.length}</span>
              <span className="results-label">ta natija</span>
            </div>
          </div>
        </div>
      </div>

      {/* Debtors Table/List */}
      <div className="debtors-container">
        {filteredAndSortedStudents.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="table-view">
              <table className="debtors-table">
                <thead>
                  <tr>
                    <th>O'quvchi</th>
                    <th>ID Raqam</th>
                    <th>Sinf</th>
                    <th>Telefon</th>
                    <th>To'lanmagan oylar</th>
                    <th>Jami qarz</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedStudents.map((student) => {
                    const paymentInfo = paymentsData[student._id] || {};
                    const unpaidMonths = paymentInfo.unpaidMonths || [];
                    const totalDebt = paymentInfo.totalDebt || 0;

                    return (
                      <tr key={student._id}>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar" style={{
                              backgroundImage: student.profileImage
                                ? `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${student.profileImage})`
                                : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}>
                              {!student.profileImage && (
                                <span>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</span>
                              )}
                            </div>
                            <div className="student-details">
                              <div className="student-name">
                                {student.firstName} {student.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="student-id-badge">
                            {student.studentId || '-'}
                          </span>
                        </td>
                        <td>
                          <span className="class-badge">
                            {getClassInfo(student)}
                          </span>
                        </td>
                        <td>
                          <span className="contact-text">
                            {student.phone || '-'}
                          </span>
                        </td>
                        <td>
                          <div className="months-list">
                            {unpaidMonths.slice(0, 3).map((month, index) => (
                              <span key={index} className="month-badge">
                                {month.month}
                              </span>
                            ))}
                            {unpaidMonths.length > 3 && (
                              <span className="more-badge">+{unpaidMonths.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="debt-amount">{formatCurrency(totalDebt)}</span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="action-btn payment-btn"
                              title="To'lovlar"
                              onClick={() => handleViewPayments(student)}
                            >
                              <span>💰</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="card-view">
              {filteredAndSortedStudents.map((student) => {
                const paymentInfo = paymentsData[student._id] || {};
                const unpaidMonths = paymentInfo.unpaidMonths || [];
                const totalDebt = paymentInfo.totalDebt || 0;

                return (
                  <div key={student._id} className="debtor-card">
                    <div className="card-header">
                      <div className="card-avatar" style={{
                        backgroundImage: student.profileImage
                          ? `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${student.profileImage})`
                          : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}>
                        {!student.profileImage && (
                          <span>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="card-info">
                        <h3 className="card-name">{student.firstName} {student.lastName}</h3>
                        <div className="card-badges">
                          <span className="student-id-badge small">
                            ID: {student.studentId || '-'}
                          </span>
                          <span className="class-badge small">
                            {getClassInfo(student)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="card-row">
                        <span className="row-icon">📱</span>
                        <span className="row-label">Telefon:</span>
                        <span className="row-value">{student.phone || '-'}</span>
                      </div>
                      <div className="card-row">
                        <span className="row-icon">📅</span>
                        <span className="row-label">To'lanmagan:</span>
                        <div className="months-grid">
                          {unpaidMonths.map((month, index) => (
                            <span key={index} className="month-badge-small">
                              {month.month}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="card-row highlight">
                        <span className="row-icon">💰</span>
                        <span className="row-label">Jami qarz:</span>
                        <span className="row-value debt">{formatCurrency(totalDebt)}</span>
                      </div>
                    </div>

                    <div className="card-footer">
                      <button
                        className="card-action-btn payment"
                        onClick={() => handleViewPayments(student)}
                      >
                        <span>💰</span>
                        <span>To'lovlarni ko'rish</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <h3>Qarzdorlar topilmadi!</h3>
            <p>
              {searchTerm
                ? 'Qidiruv kriteriyalaringizga mos qarzdorlar yo\'q.'
                : 'Hozirda qarzdor o\'quvchilar yo\'q. Barcha to\'lovlar o\'z vaqtida amalga oshirilgan!'
              }
            </p>
          </div>
        )}
      </div>

      {/* Student Payments Modal */}
      {showPaymentsModal && selectedStudent && (
        <StudentPayments
          studentId={selectedStudent._id}
          studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
          isOpen={showPaymentsModal}
          onClose={handleClosePayments}
        />
      )}

      <style>{`
        /* ==================== BASE STYLES ==================== */
        .debtors-list {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
          box-sizing: border-box;
          width: 100%;
          overflow-x: hidden;
        }

        /* ==================== LOADING & ERROR ==================== */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .loading-spinner {
          background: white;
          padding: 2rem 3rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          text-align: center;
        }

        .spinner {
          width: 50px;
          height: 50px;
          margin: 0 auto 1rem;
          border: 4px solid #e2e8f0;
          border-top-color: #ef4444;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-spinner p {
          margin: 0;
          color: #64748b;
          font-weight: 600;
        }

        /* Professional Loading Container */
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .loading-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 3rem 4rem;
          border-radius: 24px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          text-align: center;
          animation: loadingCardPulse 2s ease-in-out infinite;
        }

        @keyframes loadingCardPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .loading-logo {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 1.5rem;
        }

        .logo-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: logoPulse 1.5s ease-in-out infinite;
          box-shadow: 0 10px 40px rgba(59, 130, 246, 0.4);
        }

        @keyframes logoPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }

        .logo-inner {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          animation: logoInnerPulse 1.5s ease-in-out infinite 0.2s;
        }

        @keyframes logoInnerPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.8); opacity: 0.8; }
        }

        .loading-rings {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
        }

        .ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 3px solid transparent;
          border-radius: 50%;
          animation: ringRotate 2s linear infinite;
        }

        .ring-1 {
          width: 70px;
          height: 70px;
          margin: -35px 0 0 -35px;
          border-top-color: #3b82f6;
          border-right-color: #3b82f6;
          animation-duration: 2s;
        }

        .ring-2 {
          width: 85px;
          height: 85px;
          margin: -42.5px 0 0 -42.5px;
          border-top-color: #06b6d4;
          border-bottom-color: #06b6d4;
          animation-duration: 2.5s;
          animation-direction: reverse;
        }

        .ring-3 {
          width: 100px;
          height: 100px;
          margin: -50px 0 0 -50px;
          border-left-color: #8b5cf6;
          border-right-color: #8b5cf6;
          animation-duration: 3s;
        }

        @keyframes ringRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .loading-text p {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .loading-progress {
          margin-top: 1.5rem;
          width: 200px;
          height: 4px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .loading-progress-bar {
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6);
          border-radius: 4px;
          animation: progressMove 1.5s ease-in-out infinite;
        }

        @keyframes progressMove {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 60%; }
          100% { transform: translateX(350%); width: 40%; }
        }

        .error-banner {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border: 1px solid #fca5a5;
          color: #991b1b;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .error-icon {
          font-size: 1.5rem;
        }

        .error-text {
          flex: 1;
          font-weight: 600;
        }

        .error-close {
          background: #dc2626;
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ==================== STATS GRID ==================== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .stat-card {
          background: white;
          padding: 0.625rem 0.75rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
          box-sizing: border-box;
          min-width: 0;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-decoration {
          position: absolute;
          right: -10px;
          top: -10px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          opacity: 0.1;
        }

        .stat-total .stat-decoration { background: #ef4444; }
        .stat-debt .stat-decoration { background: #f59e0b; }
        .stat-average .stat-decoration { background: #3b82f6; }
        .stat-max .stat-decoration { background: #dc2626; }

        .stat-icon {
          font-size: 1.125rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .stat-total .stat-icon { background: #fee2e2; }
        .stat-debt .stat-icon { background: #fef3c7; }
        .stat-average .stat-icon { background: #dbeafe; }
        .stat-max .stat-icon { background: #fee2e2; }

        .stat-content {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.125rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .stat-label {
          font-size: 0.625rem;
          color: #64748b;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ==================== FILTERS SECTION ==================== */
        .filters-container {
          margin-bottom: 1rem;
          width: 100%;
          box-sizing: border-box;
        }

        .filter-card {
          background: white;
          padding: 0.75rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 0.75rem;
          box-sizing: border-box;
          width: 100%;
          flex-wrap: wrap;
        }

        .filter-left {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
          flex: 1;
          flex-wrap: wrap;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-item:first-child {
          flex: 1;
          min-width: 150px;
        }

        .filter-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .label-icon {
          font-size: 0.75rem;
        }

        .search-wrapper {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          transition: all 0.2s ease;
          background: white;
        }

        .search-input:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1);
        }

        .search-clear {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          background: #ef4444;
          color: white;
          border: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.5rem;
        }

        .filter-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #1e3a8a;
        }

        .filter-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.375rem 0.5rem;
          background: #fee2e2;
          border-radius: 6px;
          min-width: 50px;
        }

        .results-count {
          font-size: 0.875rem;
          font-weight: 700;
          color: #991b1b;
          line-height: 1;
        }

        .results-label {
          font-size: 0.5rem;
          color: #dc2626;
          font-weight: 500;
        }

        /* ==================== TABLE VIEW (Desktop) ==================== */
        .debtors-container {
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .table-view {
          display: block;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow-x: auto;
          width: 100%;
          box-sizing: border-box;
        }

        .card-view {
          display: none;
        }

        .debtors-table {
          width: 100%;
          border-collapse: collapse;
        }

        .debtors-table thead {
          background: linear-gradient(135deg, #1e3a8a, #1e40af);
          color: white;
        }

        .debtors-table th {
          padding: 0.625rem 0.75rem;
          text-align: left;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }

        .debtors-table tbody tr {
          transition: background-color 0.2s ease;
          border-bottom: 1px solid #e2e8f0;
        }

        .debtors-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .debtors-table tbody tr:last-child {
          border-bottom: none;
        }

        .debtors-table td {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #334155;
          white-space: nowrap;
        }

        .student-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .student-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.625rem;
          flex-shrink: 0;
        }

        .student-details {
          flex: 1;
        }

        .student-name {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.75rem;
        }

        .student-id-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.625rem;
          display: inline-block;
        }

        .class-badge {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.625rem;
          display: inline-block;
        }

        .contact-text {
          color: #64748b;
          font-size: 0.6875rem;
        }

        .months-list {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .month-badge {
          padding: 0.125rem 0.375rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .more-badge {
          padding: 0.125rem 0.375rem;
          background: #475569;
          color: white;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .debt-amount {
          font-weight: 700;
          color: #dc2626;
          font-size: 0.75rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
        }

        .action-btn {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-size: 0.75rem;
        }

        .payment-btn {
          background: #d1fae5;
          color: #065f46;
        }

        .payment-btn:hover {
          background: #10b981;
          color: white;
        }

        /* ==================== CARD VIEW (Mobile/Tablet) ==================== */
        .debtor-card {
          background: white;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
          min-width: 0;
          overflow: hidden;
        }

        .debtor-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .card-header {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          align-items: flex-start;
          min-width: 0;
        }

        .card-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .card-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .card-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-badges {
          display: flex;
          gap: 0.375rem;
          flex-wrap: wrap;
        }

        .student-id-badge.small,
        .class-badge.small {
          padding: 0.125rem 0.375rem;
          font-size: 0.625rem;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          padding: 0.625rem;
          background: #f8fafc;
          border-radius: 6px;
        }

        .card-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
        }

        .card-row.highlight {
          background: #fef2f2;
          padding: 0.5rem;
          border-radius: 6px;
          margin-top: 0.25rem;
        }

        .row-icon {
          font-size: 0.875rem;
          width: 20px;
          flex-shrink: 0;
        }

        .row-label {
          color: #64748b;
          font-weight: 500;
          min-width: 60px;
          font-size: 0.6875rem;
        }

        .row-value {
          color: #1e293b;
          font-weight: 500;
          flex: 1;
          font-size: 0.75rem;
        }

        .row-value.debt {
          color: #dc2626;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .months-grid {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .month-badge-small {
          padding: 0.125rem 0.375rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 4px;
          font-size: 0.5625rem;
          font-weight: 600;
        }

        .card-footer {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.375rem;
        }

        .card-action-btn {
          padding: 0.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .card-action-btn span:first-child {
          font-size: 0.875rem;
        }

        .card-action-btn.payment {
          background: #d1fae5;
          color: #065f46;
        }

        .card-action-btn.payment:hover {
          background: #10b981;
          color: white;
        }

        /* ==================== EMPTY STATE ==================== */
        .empty-state {
          background: white;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.375rem;
        }

        .empty-state p {
          font-size: 0.8125rem;
          color: #64748b;
        }

        /* ==================== RESPONSIVE: NOUTBUK (769px - 1024px) ==================== */
        @media (min-width: 769px) and (max-width: 1024px) {
          .debtors-list {
            padding: 0.875rem;
          }

          .stats-grid {
            gap: 0.375rem;
          }

          .stat-card {
            padding: 0.5rem 0.625rem;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 1rem;
          }

          .stat-value {
            font-size: 1rem;
          }

          .stat-label {
            font-size: 0.5625rem;
          }

          .filter-card {
            padding: 0.625rem;
          }

          .table-view {
            border-radius: 10px;
          }

          .debtors-table th {
            padding: 0.625rem 0.75rem;
            font-size: 0.5625rem;
          }

          .debtors-table td {
            padding: 0.625rem 0.75rem;
            font-size: 0.6875rem;
          }

          .student-avatar {
            width: 30px;
            height: 30px;
            font-size: 0.625rem;
          }

          .action-btn {
            width: 24px;
            height: 24px;
            font-size: 0.75rem;
            border-radius: 5px;
          }
        }

        /* ==================== RESPONSIVE: KATTA EKRAN (1025px+) ==================== */
        @media (min-width: 1025px) {
          .debtors-list {
            padding: 1.5rem 2rem;
          }

          .stats-grid {
            gap: 0.75rem;
            margin-bottom: 1.25rem;
          }

          .stat-card {
            padding: 0.875rem 1rem;
            border-radius: 10px;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 1.375rem;
            border-radius: 8px;
          }

          .stat-value {
            font-size: 1.375rem;
          }

          .stat-label {
            font-size: 0.75rem;
          }

          .filter-card {
            padding: 1rem;
            border-radius: 10px;
          }

          .search-input,
          .filter-select {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            border-radius: 8px;
          }

          .debtors-table th {
            padding: 0.75rem 1rem;
            font-size: 0.75rem;
          }

          .debtors-table td {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .student-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }

          .action-btn {
            width: 28px;
            height: 28px;
            font-size: 0.875rem;
            border-radius: 6px;
          }
        }

        /* ==================== RESPONSIVE: TABLET (481px - 768px) ==================== */
        @media (min-width: 481px) and (max-width: 768px) {
          .debtors-list {
            padding: 0.875rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
            margin-bottom: 0.875rem;
          }

          .stat-card {
            padding: 0.625rem;
            gap: 0.5rem;
            border-radius: 8px;
          }

          .stat-icon {
            width: 32px;
            height: 32px;
            font-size: 1.125rem;
          }

          .stat-value {
            font-size: 1.125rem;
          }

          .filter-card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.625rem;
          }

          .filter-left {
            width: 100%;
            flex-direction: row;
            gap: 0.625rem;
            flex-wrap: wrap;
          }

          .table-view {
            display: none;
          }

          .card-view {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.625rem;
            width: 100%;
            box-sizing: border-box;
            min-width: 0;
          }
        }

        /* ==================== RESPONSIVE: MOBIL (max 480px) ==================== */
        @media (max-width: 480px) {
          .debtors-list {
            padding: 0.625rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.375rem;
            margin-bottom: 0.75rem;
          }

          .stat-card {
            padding: 0.5rem;
            gap: 0.375rem;
            border-radius: 6px;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 1rem;
            border-radius: 6px;
          }

          .stat-value {
            font-size: 1rem;
          }

          .stat-label {
            font-size: 0.5rem;
          }

          .filter-card {
            padding: 0.625rem;
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            border-radius: 6px;
          }

          .filter-left {
            width: 100%;
            flex-direction: column;
            gap: 0.5rem;
          }

          .table-view {
            display: none;
          }

          .card-view {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            width: 100%;
            box-sizing: border-box;
            min-width: 0;
          }

          .debtor-card {
            padding: 0.625rem;
            border-radius: 6px;
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
          }

          .card-header {
            gap: 0.5rem;
          }

          .card-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.6875rem;
          }

          .card-name {
            font-size: 0.75rem;
          }

          .card-body {
            padding: 0.5rem;
            gap: 0.375rem;
          }

          .card-row {
            gap: 0.375rem;
            font-size: 0.625rem;
          }

          .empty-state {
            padding: 1.5rem 0.875rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DebtorsList;

