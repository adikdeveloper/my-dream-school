import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Can } from '../../context/PermissionsContext';
import apiService from '../../services/apiService';
import StudentProfile from './StudentProfile';
import StudentPayments from './StudentPayments';
import LoadingOverlay from '../common/LoadingOverlay';

// Direktor dizayn tizimiga mos SVG ikonlar (emoji o'rniga — reception ham 1:1 bir xil ko'rinadi)
const StudentIcon = ({ name = 'grid', size = 16 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    student: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M6 11v5c3 2 9 2 12 0v-5M21 9v6" /></>,
    check: <><path d="M20 6 9 17l-5-5" /></>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
    spark: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    filter: <><path d="M4 5h16l-6 8v5l-4 2v-7L4 5Z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></>,
    transfer: <><path d="M4 7h14l-3-3M20 17H6l3 3M18 7l-3 3M6 17l3-3" /></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    dollar: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.grid}
    </svg>
  );
};

const StudentManagement = () => {
  const { setLoading, setError } = useData();
  const { user } = useAuth();
  // Reception: qo'shish/ko'rish/tahrirlash mumkin, o'chirish va to'lovlar yashirin
  // Call Center: faqat qo'shish/ko'rish (tahrirlash, o'chirish, to'lovlar yashirin)
  const isReception = user?.role === 'reception';
  const isCallCenter = user?.role === 'callcenter';
  const hideEdit = isCallCenter;
  const hidePaymentsDelete = isReception || isCallCenter;
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMode, setProfileMode] = useState('view');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [paymentsStudent, setPaymentsStudent] = useState(null);
  // O'quvchini boshqa guruhga ko'chirish
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStudentData, setTransferStudentData] = useState(null);
  const [classesList, setClassesList] = useState([]);
  const [transferClassId, setTransferClassId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [, setTotalStudents] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [studentStats, setStudentStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    new: 0
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load student statistics
  const loadStudentStats = useCallback(async () => {
    try {
      const stats = await apiService.getStudentStats();
      setStudentStats(stats);
    } catch (error) {
      // Silently fail - statistics are not critical
    }
  }, []);

  // Load students with pagination and search
  const loadStudents = useCallback(async () => {
    try {
      setLocalLoading(true);
      setLocalError('');
      setLoading(true);
      const response = await apiService.getUsers('student', currentPage, itemsPerPage, debouncedSearchTerm);
      setStudents(response.users || []);
      setTotalPages(response.totalPages || 1);
      setTotalStudents(response.total || 0);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'O\'quvchilarni yuklashda xatolik';
      setError(errorMsg);
      setLocalError(errorMsg);
    } finally {
      setLoading(false);
      setLocalLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, setLoading, setError]);

  useEffect(() => {
    loadStudents();
    loadStudentStats();
    // Mark users section as viewed to clear notification badge
    apiService.markSectionAsViewed('users').catch(() => {
      // Silently handle this error - not critical
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearchTerm]);

  // Ko'chirish modali uchun sinflar ro'yxatini yuklaymiz
  useEffect(() => {
    apiService.getClasses()
      .then(data => setClassesList(data?.classes || (Array.isArray(data) ? data : [])))
      .catch(() => setClassesList([]));
  }, []);

  // Client-side filtering only for active/inactive status
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (filter === 'all') return true;
      if (filter === 'active') return student.isActive;
      if (filter === 'inactive') return !student.isActive;
      return true;
    });
  }, [students, filter]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearchTerm]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setProfileMode('view');
    setShowProfileModal(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setProfileMode('edit');
    setShowProfileModal(true);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setSelectedStudent(null);
  };

  const handleAddStudent = () => {
    setSelectedStudent(null);
    setProfileMode('add');
    setShowProfileModal(true);
  };

  const handleUpdateStudent = () => {
    loadStudents();
    loadStudentStats();
  };

  const handleDeleteStudent = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      setLocalLoading(true);
      setLoading(true);
      await apiService.deleteUser(studentToDelete._id);
      setShowDeleteModal(false);
      setStudentToDelete(null);
      loadStudents();
      loadStudentStats();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'O\'quvchini o\'chirishda xatolik';
      setError(errorMsg);
      setLocalError(errorMsg);
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
      setLocalLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setStudentToDelete(null);
  };

  const handleViewPayments = (student) => {
    setPaymentsStudent(student);
    setShowPaymentsModal(true);
  };

  const handleClosePayments = () => {
    setShowPaymentsModal(false);
    setPaymentsStudent(null);
  };

  const handleTransferStudent = (student) => {
    setTransferStudentData(student);
    setTransferClassId('');
    setShowTransferModal(true);
  };

  const cancelTransfer = () => {
    setShowTransferModal(false);
    setTransferStudentData(null);
    setTransferClassId('');
  };

  const confirmTransfer = async () => {
    if (!transferStudentData || !transferClassId) return;
    try {
      setTransferLoading(true);
      await apiService.transferStudent(transferStudentData._id, transferClassId);
      setShowTransferModal(false);
      setTransferStudentData(null);
      setTransferClassId('');
      loadStudents();
      loadStudentStats();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'O\'quvchini ko\'chirishda xatolik';
      setError(errorMsg);
      setLocalError(errorMsg);
      setShowTransferModal(false);
    } finally {
      setTransferLoading(false);
    }
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

  // Use stats from API instead of calculating from current page
  const stats = studentStats;

  return (
    <div className="student-management">
      <header className="students-page-header">
        <div>
          <h1>O'quvchilar</h1>
          <p>O'quvchilar ro'yxati, sinfi, holati va shaxsiy ma'lumotlarini boshqaring.</p>
        </div>
        {!isReception && (
          <Can perm="teacher.create_student">
            <button className="students-primary-action" onClick={handleAddStudent}>
              <StudentIcon name="plus" size={15} />
              <span>Yangi o'quvchi</span>
            </button>
          </Can>
        )}
      </header>
      {/* Loading Overlay */}
      {localLoading && <LoadingOverlay message="O'quvchilar yuklanmoqda" />}

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
          <div className="stat-icon"><StudentIcon name="grid" size={18} /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Jami o'quvchilar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-icon"><StudentIcon name="check" size={18} /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Faol o'quvchilar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-inactive">
          <div className="stat-icon"><StudentIcon name="pause" size={18} /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.inactive}</div>
            <div className="stat-label">Nofaol o'quvchilar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-new">
          <div className="stat-icon"><StudentIcon name="spark" size={18} /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.new}</div>
            <div className="stat-label">Yangi (1 oy)</div>
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
                <span className="label-icon"><StudentIcon name="search" size={13} /></span>
                Qidiruv
              </label>
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Ism, familiya, ID..."
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
                <span className="label-icon"><StudentIcon name="filter" size={13} /></span>
                Holat
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Barchasi</option>
                <option value="active">✓ Faol</option>
                <option value="inactive">✗ Nofaol</option>
              </select>
            </div>

            <div className="filter-results">
              <span className="results-count">{filteredStudents.length}</span>
              <span className="results-label">ta natija</span>
            </div>
          </div>

          <Can perm="teacher.create_student">
            <button className="btn-add-compact" onClick={handleAddStudent}>
              <span className="add-icon"><StudentIcon name="plus" size={14} /></span>
              <span className="add-text">Yangi o'quvchi</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Students Grid/Table */}
      <div className="students-container">
        {filteredStudents.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="table-view">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>O'quvchi</th>
                    <th>ID Raqam</th>
                    <th>Sinf</th>
                    <th>Telefon</th>
                    <th>Holat</th>
                    <th>Qabul</th>
                    {!isReception && <th>Ketgan</th>}
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student._id} className={!student.isActive ? 'inactive-row' : ''}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar" style={student.profileImage ? {
                            backgroundImage: `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${student.profileImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            color: 'transparent'
                          } : {}}>
                            {!student.profileImage && (
                              <span>{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="student-details">
                            <div className="student-name">{student.firstName} {student.lastName}</div>
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
                        <span className={`status-badge ${student.isActive ? 'status-active' : 'status-inactive'}`}>
                          {student.isActive ? '✓ Faol' : '✗ Nofaol'}
                        </span>
                      </td>
                      <td>
                        <span className="date-text">
                          {new Date(student.createdAt).toLocaleDateString('uz-UZ', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      {!isReception && (
                        <td>
                          <span className="date-text">
                            {student.leftDate ? new Date(student.leftDate).toLocaleDateString('uz-UZ', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : '-'}
                          </span>
                        </td>
                      )}
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view-btn"
                            title="Ko'rish"
                            onClick={() => handleViewStudent(student)}
                          >
                            <span><StudentIcon name="eye" size={15} /></span>
                          </button>
                          {!hideEdit && (
                            <button
                              className="action-btn edit-btn"
                              title="Tahrirlash"
                              onClick={() => handleEditStudent(student)}
                            >
                              <span><StudentIcon name="edit" size={15} /></span>
                            </button>
                          )}
                          {!hideEdit && (
                            <button
                              className="action-btn transfer-btn"
                              title="Boshqa guruhga ko'chirish"
                              onClick={() => handleTransferStudent(student)}
                            >
                              <span><StudentIcon name="transfer" size={15} /></span>
                            </button>
                          )}
                          {!hidePaymentsDelete && (
                            <button
                              className="action-btn payment-btn"
                              title="To'lovlar"
                              onClick={() => handleViewPayments(student)}
                            >
                              <span><StudentIcon name="dollar" size={15} /></span>
                            </button>
                          )}
                          {!hidePaymentsDelete && (
                            <Can perm="teacher.delete_student">
                              <button
                                className="action-btn delete-btn"
                                title="O'chirish"
                                onClick={() => handleDeleteStudent(student)}
                              >
                                <span><StudentIcon name="trash" size={15} /></span>
                              </button>
                            </Can>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="card-view">
              {filteredStudents.map((student) => (
                <div key={student._id} className={`student-card ${!student.isActive ? 'card-inactive' : ''}`}>
                  <div className="card-header">
                    <div className="card-avatar" style={student.profileImage ? {
                      backgroundImage: `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${student.profileImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: 'transparent'
                    } : {}}>
                      {!student.profileImage && (
                        <span>{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
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
                    <div className={`card-status ${student.isActive ? 'status-active' : 'status-inactive'}`}>
                      {student.isActive ? '✓' : '✗'}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="card-row">
                      <span className="row-icon"><StudentIcon name="phone" size={14} /></span>
                      <span className="row-label">Telefon:</span>
                      <span className="row-value">{student.phone || '-'}</span>
                    </div>
                    <div className="card-row">
                      <span className="row-icon"><StudentIcon name="calendar" size={14} /></span>
                      <span className="row-label">Qo'shilgan:</span>
                      <span className="row-value">
                        {new Date(student.createdAt).toLocaleDateString('uz-UZ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    {student.leftDate && !isReception && (
                      <div className="card-row">
                        <span className="row-icon"><StudentIcon name="transfer" size={14} /></span>
                        <span className="row-label">Ketgan:</span>
                        <span className="row-value">
                          {new Date(student.leftDate).toLocaleDateString('uz-UZ', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <button
                      className="card-action-btn view"
                      onClick={() => handleViewStudent(student)}
                    >
                      <span><StudentIcon name="eye" size={15} /></span>
                      <span>Ko'rish</span>
                    </button>
                    {!hideEdit && (
                      <button
                        className="card-action-btn edit"
                        onClick={() => handleEditStudent(student)}
                      >
                        <span><StudentIcon name="edit" size={15} /></span>
                        <span>Tahrirlash</span>
                      </button>
                    )}
                    {!hideEdit && (
                      <button
                        className="card-action-btn transfer"
                        onClick={() => handleTransferStudent(student)}
                      >
                        <span><StudentIcon name="transfer" size={15} /></span>
                        <span>Ko'chirish</span>
                      </button>
                    )}
                    {!hidePaymentsDelete && (
                      <button
                        className="card-action-btn payment"
                        onClick={() => handleViewPayments(student)}
                      >
                        <span><StudentIcon name="dollar" size={15} /></span>
                        <span>To'lovlar</span>
                      </button>
                    )}
                    {!hidePaymentsDelete && (
                      <Can perm="teacher.delete_student">
                        <button
                          className="card-action-btn delete"
                          onClick={() => handleDeleteStudent(student)}
                        >
                          <span><StudentIcon name="trash" size={15} /></span>
                          <span>O'chirish</span>
                        </button>
                      </Can>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <button
                  className="pagination-btn pagination-prev"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <span>←</span>
                  <span className="btn-text">Oldingi</span>
                </button>

                <div className="pagination-pages">
                  {(() => {
                    const pages = [];

                    if (totalPages <= 4) {
                      // Show all pages if 4 or less
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(
                          <button
                            key={i}
                            className={`pagination-page ${currentPage === i ? 'active' : ''}`}
                            onClick={() => handlePageChange(i)}
                          >
                            {i}
                          </button>
                        );
                      }
                    } else {
                      // More than 4 pages - show smart pagination
                      if (currentPage <= 3) {
                        // Show first 3 pages, ellipsis, and last page: 1 2 3 ... 6
                        for (let i = 1; i <= 3; i++) {
                          pages.push(
                            <button
                              key={i}
                              className={`pagination-page ${currentPage === i ? 'active' : ''}`}
                              onClick={() => handlePageChange(i)}
                            >
                              {i}
                            </button>
                          );
                        }
                        pages.push(
                          <button
                            key="ellipsis"
                            className="pagination-ellipsis clickable"
                            onClick={() => handlePageChange(4)}
                          >
                            ...
                          </button>
                        );
                        pages.push(
                          <button
                            key={totalPages}
                            className={`pagination-page`}
                            onClick={() => handlePageChange(totalPages)}
                          >
                            {totalPages}
                          </button>
                        );
                      } else if (currentPage >= totalPages - 2) {
                        // Near end: 1 ... 4 5 6
                        pages.push(
                          <button
                            key={1}
                            className={`pagination-page`}
                            onClick={() => handlePageChange(1)}
                          >
                            1
                          </button>
                        );
                        pages.push(
                          <button
                            key="ellipsis"
                            className="pagination-ellipsis clickable"
                            onClick={() => handlePageChange(totalPages - 3)}
                          >
                            ...
                          </button>
                        );
                        for (let i = totalPages - 2; i <= totalPages; i++) {
                          pages.push(
                            <button
                              key={i}
                              className={`pagination-page ${currentPage === i ? 'active' : ''}`}
                              onClick={() => handlePageChange(i)}
                            >
                              {i}
                            </button>
                          );
                        }
                      } else {
                        // In the middle: 1 ... 3 4 5 ... 8
                        pages.push(
                          <button
                            key={1}
                            className={`pagination-page`}
                            onClick={() => handlePageChange(1)}
                          >
                            1
                          </button>
                        );
                        pages.push(
                          <button
                            key="ellipsis1"
                            className="pagination-ellipsis clickable"
                            onClick={() => handlePageChange(currentPage - 1)}
                          >
                            ...
                          </button>
                        );
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                          pages.push(
                            <button
                              key={i}
                              className={`pagination-page ${currentPage === i ? 'active' : ''}`}
                              onClick={() => handlePageChange(i)}
                            >
                              {i}
                            </button>
                          );
                        }
                        pages.push(
                          <button
                            key="ellipsis2"
                            className="pagination-ellipsis clickable"
                            onClick={() => handlePageChange(currentPage + 2)}
                          >
                            ...
                          </button>
                        );
                        pages.push(
                          <button
                            key={totalPages}
                            className={`pagination-page`}
                            onClick={() => handlePageChange(totalPages)}
                          >
                            {totalPages}
                          </button>
                        );
                      }
                    }

                    return pages;
                  })()}
                </div>

                <button
                  className="pagination-btn pagination-next"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <span className="btn-text">Keyingi</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3 className="empty-title">O'quvchilar topilmadi</h3>
            <p className="empty-text">
              Qidiruv kriteriyalaringizga mos o'quvchilar mavjud emas.
              Boshqa parametrlar bilan qidiring.
            </p>
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      <StudentProfile
        student={selectedStudent}
        isOpen={showProfileModal}
        onClose={handleCloseProfile}
        onUpdate={handleUpdateStudent}
        mode={profileMode}
      />

      {/* Student Payments Modal */}
      {paymentsStudent && (
        <StudentPayments
          studentId={paymentsStudent._id}
          studentName={`${paymentsStudent.firstName} ${paymentsStudent.lastName}`}
          isOpen={showPaymentsModal}
          onClose={handleClosePayments}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-icon-wrapper">
                <span className="delete-icon">⚠️</span>
              </div>
              <h2 className="delete-title">O'quvchini o'chirish</h2>
              <p className="delete-subtitle">Bu amalni qaytarib bo'lmaydi!</p>
            </div>

            {studentToDelete && (
              <div className="delete-modal-body">
                <div className="student-info-card">
                  <div className="student-info-avatar">
                    {studentToDelete.firstName.charAt(0)}{studentToDelete.lastName.charAt(0)}
                  </div>
                  <div className="student-info-details">
                    <h3 className="student-info-name">
                      {studentToDelete.firstName} {studentToDelete.lastName}
                    </h3>
                    <p className="student-info-meta">
                      ID: {studentToDelete.studentId || '-'} • {getClassInfo(studentToDelete)}
                    </p>
                  </div>
                </div>
                <p className="delete-warning">
                  Ushbu o'quvchini o'chirishga ishonchingiz komilmi?
                  Barcha ma'lumotlar, baholar va davomatlar butunlay o'chib ketadi.
                </p>
              </div>
            )}

            <div className="delete-modal-footer">
              <button className="modal-btn cancel-btn" onClick={cancelDelete}>
                <span>✕</span>
                <span>Bekor qilish</span>
              </button>
              <button className="modal-btn confirm-btn" onClick={confirmDelete}>
                <span>🗑️</span>
                <span>Ha, o'chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && transferStudentData && (
        <div className="modal-overlay" onClick={cancelTransfer}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
              <div className="delete-icon-wrapper">
                <span className="delete-icon">🔀</span>
              </div>
              <h2 className="delete-title">O'quvchini ko'chirish</h2>
              <p className="delete-subtitle">Barcha baholari va tarixi saqlanib qoladi</p>
            </div>

            <div className="delete-modal-body">
              <div className="student-info-card">
                <div className="student-info-avatar">
                  {transferStudentData.firstName?.charAt(0)}{transferStudentData.lastName?.charAt(0)}
                </div>
                <div className="student-info-details">
                  <h3 className="student-info-name">
                    {transferStudentData.firstName} {transferStudentData.lastName}
                  </h3>
                  <p className="student-info-meta">
                    Joriy guruh: {getClassInfo(transferStudentData)}
                  </p>
                </div>
              </div>

              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#475569', margin: '1rem 0 0.5rem' }}>
                Yangi guruhni tanlang:
              </label>
              <select
                value={transferClassId}
                onChange={(e) => setTransferClassId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', background: 'white' }}
              >
                <option value="">— Guruhni tanlang —</option>
                {classesList
                  .filter(c => c._id !== (transferStudentData.classId?._id || transferStudentData.classId))
                  .map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name}{c.grade ? ` (${c.grade}-sinf${c.section ? ' ' + c.section : ''})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="delete-modal-footer">
              <button className="modal-btn cancel-btn" onClick={cancelTransfer} disabled={transferLoading}>
                <span>✕</span>
                <span>Bekor qilish</span>
              </button>
              <button
                className="modal-btn confirm-btn"
                onClick={confirmTransfer}
                disabled={transferLoading || !transferClassId}
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
              >
                <span><StudentIcon name="transfer" size={15} /></span>
                <span>{transferLoading ? 'Ko\'chirilmoqda...' : 'Ko\'chirish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ==================== BASE STYLES - O'qituvchi dashboardiga o'xshash kompakt dizayn ==================== */
        .student-management {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ==================== PAGE HEADER (direktor dizayn tizimi) ==================== */
        .students-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .students-page-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 750;
          letter-spacing: -0.025em;
          line-height: 1.2;
          color: #0f172a;
        }
        .students-page-header p {
          margin: 0.375rem 0 0;
          font-size: 0.875rem;
          line-height: 1.55;
          color: #64748b;
        }
        .students-primary-action {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(37, 99, 235, 0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .students-primary-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }
        .students-primary-action svg,
        .btn-add-compact svg,
        .action-btn svg,
        .card-action-btn svg,
        .stat-icon svg,
        .label-icon svg,
        .row-icon svg {
          display: block;
          flex-shrink: 0;
        }
        .label-icon,
        .row-icon {
          display: inline-flex;
          align-items: center;
        }

        /* ==================== STATS GRID ==================== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
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

        .stat-total .stat-decoration { background: #3b82f6; }
        .stat-active .stat-decoration { background: #10b981; }
        .stat-inactive .stat-decoration { background: #ef4444; }
        .stat-new .stat-decoration { background: #f59e0b; }

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

        .stat-total .stat-icon { background: #dbeafe; color: #1d4ed8; }
        .stat-active .stat-icon { background: #d1fae5; color: #047857; }
        .stat-inactive .stat-icon { background: #fee2e2; color: #b91c1c; }
        .stat-new .stat-icon { background: #fef3c7; color: #b45309; }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.125rem;
        }

        .stat-label {
          font-size: 0.625rem;
          color: #64748b;
          font-weight: 500;
        }

        /* ==================== FILTERS SECTION ==================== */
        .filters-container {
          margin-bottom: 1rem;
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
          background: #dbeafe;
          border-radius: 6px;
          min-width: 50px;
        }

        .results-count {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e40af;
          line-height: 1;
        }

        .results-label {
          font-size: 0.5rem;
          color: #3b82f6;
          font-weight: 500;
        }

        .btn-add-compact {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-add-compact:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
        }

        .add-icon {
          font-size: 0.75rem;
        }

        .add-text {
          font-size: 0.75rem;
        }

        /* ==================== TABLE VIEW ==================== */
        .students-container {
        }

        .table-view {
          display: block;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .card-view {
          display: none;
        }

        .students-table {
          width: 100%;
          border-collapse: collapse;
        }

        .students-table thead {
          background: linear-gradient(135deg, #1e3a8a, #1e40af);
          color: white;
        }

        .students-table th {
          padding: 0.625rem 0.75rem;
          text-align: left;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .students-table tbody tr {
          transition: background-color 0.2s ease;
          border-bottom: 1px solid #e2e8f0;
        }

        .students-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .students-table tbody tr:last-child {
          border-bottom: none;
        }

        .students-table tbody tr.inactive-row {
          opacity: 0.5;
          background: #fafafa;
        }

        .students-table td {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #334155;
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

        .date-text {
          color: #64748b;
          font-size: 0.6875rem;
        }

        .status-badge {
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          display: inline-block;
        }

        .status-badge.status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.status-inactive {
          background: #fee2e2;
          color: #991b1b;
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

        .view-btn { background: #dbeafe; color: #1e40af; }
        .view-btn:hover { background: #3b82f6; color: white; }

        .edit-btn { background: #fef3c7; color: #92400e; }
        .edit-btn:hover { background: #f59e0b; color: white; }
        .transfer-btn { background: #e0f2fe; color: #075985; }
        .transfer-btn:hover { background: #0ea5e9; color: white; }

        .payment-btn { background: #d1fae5; color: #065f46; }
        .payment-btn:hover { background: #10b981; color: white; }

        .delete-btn { background: #fee2e2; color: #991b1b; }
        .delete-btn:hover { background: #ef4444; color: white; }

        /* ==================== CARD VIEW (Mobile/Tablet) ==================== */
        .student-card {
          background: white;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .student-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .student-card.card-inactive {
          opacity: 0.6;
          background: #fafafa;
        }

        .card-header {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          align-items: flex-start;
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
        }

        .card-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
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

        .card-status {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .card-status.status-active { background: #d1fae5; color: #065f46; }
        .card-status.status-inactive { background: #fee2e2; color: #991b1b; }

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

        .card-footer {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.375rem;
        }

        .card-action-btn {
          padding: 0.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          font-size: 0.5625rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .card-action-btn span:first-child {
          font-size: 0.875rem;
        }

        .card-action-btn.view { background: #dbeafe; color: #1e40af; }
        .card-action-btn.view:hover { background: #3b82f6; color: white; }

        .card-action-btn.edit { background: #fef3c7; color: #92400e; }
        .card-action-btn.edit:hover { background: #f59e0b; color: white; }
        .card-action-btn.transfer { background: #e0f2fe; color: #075985; }
        .card-action-btn.transfer:hover { background: #0ea5e9; color: white; }

        .card-action-btn.payment { background: #d1fae5; color: #065f46; }
        .card-action-btn.payment:hover { background: #10b981; color: white; }

        .card-action-btn.delete { background: #fee2e2; color: #991b1b; }
        .card-action-btn.delete:hover { background: #ef4444; color: white; }

        /* ==================== PAGINATION ==================== */
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .pagination-pages {
          display: flex;
          gap: 0.25rem;
        }

        .pagination-page {
          min-width: 28px;
          height: 28px;
          padding: 0 0.375rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-page:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f0f9ff;
        }

        .pagination-page.active {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-color: #3b82f6;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.625rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f0f9ff;
        }

        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pagination-btn span:first-child:not(.btn-text),
        .pagination-btn span:last-child:not(.btn-text) {
          font-size: 0.875rem;
        }

        /* ==================== EMPTY STATE ==================== */
        .empty-state {
          background: white;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.375rem;
        }

        .empty-text {
          font-size: 0.8125rem;
          color: #64748b;
        }

        /* ==================== RESPONSIVE: NOUTBUK (769px - 1024px) - kompakt qoladi ==================== */
        @media (min-width: 769px) and (max-width: 1024px) {
          .student-management {
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

          .btn-add-compact {
            padding: 0.375rem 0.625rem;
            font-size: 0.6875rem;
            border-radius: 8px;
            gap: 0.375rem;
          }

          .add-icon {
            font-size: 0.75rem;
          }

          .add-text {
            font-size: 0.6875rem;
          }

          .table-view {
            border-radius: 10px;
          }

          .students-table th {
            padding: 0.625rem 0.75rem;
            font-size: 0.5625rem;
          }

          .students-table td {
            padding: 0.625rem 0.75rem;
            font-size: 0.6875rem;
          }

          .student-cell {
            gap: 0.5rem;
          }

          .student-avatar {
            width: 30px;
            height: 30px;
            font-size: 0.625rem;
          }

          .student-name {
            font-size: 0.6875rem;
          }

          .student-id-badge,
          .class-badge,
          .status-badge {
            padding: 0.1875rem 0.5rem;
            font-size: 0.5625rem;
            border-radius: 5px;
          }

          .contact-text,
          .date-text {
            font-size: 0.625rem;
          }

          .action-buttons {
            gap: 0.25rem;
          }

          .action-btn {
            width: 24px;
            height: 24px;
            font-size: 0.75rem;
            border-radius: 5px;
          }

          .pagination-container {
            padding: 0.75rem;
            margin-top: 1rem;
            gap: 0.5rem;
            border-radius: 10px;
          }

          .pagination-pages {
            gap: 0.25rem;
          }

          .pagination-page {
            min-width: 28px;
            height: 28px;
            font-size: 0.6875rem;
            border-radius: 6px;
          }

          .pagination-btn {
            padding: 0.375rem 0.625rem;
            font-size: 0.6875rem;
            gap: 0.25rem;
            border-radius: 6px;
          }

          .pagination-btn span:first-child:not(.btn-text),
          .pagination-btn span:last-child:not(.btn-text) {
            font-size: 0.875rem;
          }

          .pagination-ellipsis {
            min-width: 28px;
            height: 28px;
            font-size: 0.875rem;
          }

          .pagination-ellipsis.clickable {
            border-radius: 6px;
          }

          .empty-state {
            padding: 2rem 1rem;
            border-radius: 10px;
          }

          .empty-title {
            font-size: 0.9375rem;
          }

          .empty-text {
            font-size: 0.75rem;
          }

          /* Delete Modal for Laptop */
          .delete-modal {
            max-width: 400px;
            border-radius: 16px;
          }

          .delete-modal-header {
            padding: 1.5rem 1.25rem 1rem;
          }

          .delete-icon {
            font-size: 2.5rem;
          }

          .delete-title {
            font-size: 1.25rem;
          }

          .delete-subtitle {
            font-size: 0.75rem;
          }

          .delete-modal-body {
            padding: 1.25rem;
          }

          .student-info-card {
            padding: 1rem;
            gap: 0.75rem;
            border-radius: 12px;
          }

          .student-info-avatar {
            width: 48px;
            height: 48px;
            font-size: 0.9375rem;
          }

          .student-info-name {
            font-size: 1rem;
          }

          .student-info-meta {
            font-size: 0.6875rem;
          }

          .delete-warning {
            font-size: 0.8125rem;
            padding: 0.75rem;
            border-radius: 10px;
          }

          .delete-modal-footer {
            padding: 1rem 1.25rem 1.25rem;
            gap: 0.75rem;
          }

          .modal-btn {
            padding: 0.75rem 1rem;
            font-size: 0.8125rem;
            border-radius: 10px;
          }

          .modal-btn span:first-child {
            font-size: 1rem;
          }
        }

        /* ==================== RESPONSIVE: KATTA EKRAN / DESKTOP (1025px va undan yuqori) ==================== */
        @media (min-width: 1025px) {
          .student-management {
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

          .filters-container {
            margin-bottom: 1.25rem;
          }

          .filter-card {
            padding: 1rem;
            border-radius: 10px;
          }

          .filter-label {
            font-size: 0.8125rem;
          }

          .label-icon {
            font-size: 0.9375rem;
          }

          .search-input,
          .filter-select {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            border-radius: 8px;
          }

          .filter-results {
            padding: 0.5rem 0.75rem;
            min-width: 60px;
          }

          .results-count {
            font-size: 1.125rem;
          }

          .results-label {
            font-size: 0.5625rem;
          }

          .btn-add-compact {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            border-radius: 8px;
          }

          .add-icon {
            font-size: 0.875rem;
          }

          .students-table th {
            padding: 0.75rem 1rem;
            font-size: 0.75rem;
          }

          .students-table td {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .student-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }

          .student-name {
            font-size: 0.8125rem;
          }

          .student-id-badge,
          .class-badge,
          .status-badge {
            padding: 0.1875rem 0.5rem;
            font-size: 0.6875rem;
          }

          .contact-text,
          .date-text {
            font-size: 0.75rem;
          }

          .action-btn {
            width: 28px;
            height: 28px;
            font-size: 0.875rem;
            border-radius: 6px;
          }

          .pagination-container {
            margin-top: 1.25rem;
          }

          .pagination-page {
            min-width: 32px;
            height: 32px;
            font-size: 0.8125rem;
          }

          .pagination-btn {
            padding: 0.5rem 0.875rem;
            font-size: 0.8125rem;
          }

          .table-view {
            border-radius: 10px;
          }

          .empty-state {
            padding: 3rem 2rem;
          }

          .empty-title {
            font-size: 1.125rem;
          }

          .empty-text {
            font-size: 0.875rem;
          }
        }

        /* ==================== RESPONSIVE: TABLET (481px - 768px) ==================== */
        @media (min-width: 481px) and (max-width: 768px) {
          .student-management {
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

          .stat-label {
            font-size: 0.5625rem;
          }

          .filter-card {
            padding: 0.75rem;
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

          .filter-item {
            flex: 1;
            min-width: 100px;
          }

          .filter-item:first-child {
            min-width: 150px;
            flex: 2;
          }

          .filter-results {
            padding: 0.375rem 0.5rem;
            min-width: 50px;
          }

          .results-count {
            font-size: 0.9375rem;
          }

          .results-label {
            font-size: 0.5rem;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
          }

          /* Switch to Card View */
          .table-view {
            display: none;
          }

          .card-view {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.625rem;
          }

          .student-card {
            padding: 0.75rem;
            border-radius: 8px;
            position: relative;
          }

          .card-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.5rem;
          }

          .card-avatar {
            width: 36px;
            height: 36px;
            font-size: 0.75rem;
          }

          .card-info {
            text-align: center;
          }

          .card-name {
            font-size: 0.8125rem;
          }

          .card-badges {
            justify-content: center;
            gap: 0.25rem;
          }

          .card-status {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            width: 20px;
            height: 20px;
            font-size: 0.625rem;
          }

          .card-body {
            padding: 0.5rem;
            gap: 0.375rem;
          }

          .card-row {
            gap: 0.375rem;
            font-size: 0.6875rem;
          }

          .row-icon {
            font-size: 0.75rem;
            width: 18px;
          }

          .row-label {
            min-width: 50px;
            font-size: 0.625rem;
          }

          .row-value {
            font-size: 0.6875rem;
          }

          .card-footer {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.25rem;
          }

          .card-action-btn {
            padding: 0.375rem;
            font-size: 0.5rem;
            border-radius: 4px;
          }

          .card-action-btn span:first-child {
            font-size: 0.75rem;
          }

          .pagination-container {
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
          }

          .pagination-pages {
            gap: 0.25rem;
            order: 1;
            width: 100%;
            justify-content: center;
          }

          .pagination-page {
            min-width: 28px;
            height: 28px;
            font-size: 0.75rem;
          }

          .pagination-btn {
            padding: 0.375rem 0.625rem;
            font-size: 0.75rem;
          }

          .pagination-prev {
            order: 2;
            flex: 0 0 48%;
          }

          .pagination-next {
            order: 3;
            flex: 0 0 48%;
          }

          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-title {
            font-size: 0.9375rem;
          }

          .empty-text {
            font-size: 0.75rem;
          }
        }

        /* ==================== RESPONSIVE: MOBIL (max 480px gacha) ==================== */
        @media (max-width: 480px) {
          .student-management {
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

          .stat-content {
            text-align: center;
          }

          .stat-value {
            font-size: 1rem;
          }

          .stat-label {
            font-size: 0.5rem;
          }

          .stat-decoration {
            width: 30px;
            height: 30px;
            right: -8px;
            top: -8px;
          }

          .filters-container {
            margin-bottom: 0.75rem;
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

          .filter-item {
            width: 100%;
          }

          .filter-item:first-child {
            min-width: 100%;
          }

          .filter-label {
            font-size: 0.625rem;
          }

          .label-icon {
            font-size: 0.75rem;
          }

          .search-input,
          .filter-select {
            padding: 0.5rem 0.625rem;
            font-size: 0.75rem;
            border-radius: 6px;
          }

          .filter-results {
            padding: 0.375rem 0.5rem;
            min-width: 100%;
            flex-direction: row;
            justify-content: center;
            gap: 0.375rem;
          }

          .results-count {
            font-size: 0.875rem;
          }

          .results-label {
            font-size: 0.5rem;
            margin-top: 0;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            border-radius: 6px;
          }

          .add-icon {
            font-size: 0.75rem;
          }

          /* Switch to Card View */
          .table-view {
            display: none;
          }

          .card-view {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .student-card {
            padding: 0.625rem;
            border-radius: 6px;
            position: relative;
          }

          .card-header {
            gap: 0.5rem;
            padding-right: 1.5rem;
          }

          .card-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.6875rem;
          }

          .card-info {
            min-width: 0;
          }

          .card-name {
            font-size: 0.75rem;
            word-break: break-word;
          }

          .card-badges {
            gap: 0.1875rem;
            flex-wrap: wrap;
          }

          .student-id-badge.small,
          .class-badge.small {
            padding: 0.125rem 0.25rem;
            font-size: 0.5rem;
          }

          .card-status {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            width: 18px;
            height: 18px;
            font-size: 0.5625rem;
          }

          .card-body {
            padding: 0.5rem;
            gap: 0.375rem;
            border-radius: 6px;
          }

          .card-row {
            gap: 0.375rem;
            font-size: 0.625rem;
          }

          .row-icon {
            font-size: 0.75rem;
            width: 16px;
          }

          .row-label {
            min-width: 50px;
            font-size: 0.5625rem;
          }

          .row-value {
            font-size: 0.625rem;
          }

          .card-footer {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.25rem;
          }

          .card-action-btn {
            flex-direction: column;
            justify-content: center;
            padding: 0.375rem;
            gap: 0.125rem;
            font-size: 0.5rem;
            border-radius: 4px;
          }

          .card-action-btn span:first-child {
            font-size: 0.75rem;
          }

          .empty-state {
            padding: 1.5rem 0.875rem;
            border-radius: 6px;
          }

          .empty-title {
            font-size: 0.875rem;
          }

          .empty-text {
            font-size: 0.6875rem;
          }

          .pagination-container {
            gap: 0.375rem;
            flex-wrap: wrap;
            margin-top: 0.75rem;
          }

          .pagination-pages {
            gap: 0.1875rem;
            flex-wrap: wrap;
            justify-content: center;
            width: 100%;
            order: 1;
          }

          .pagination-page {
            min-width: 24px;
            height: 24px;
            font-size: 0.6875rem;
            border-radius: 4px;
          }

          .pagination-btn {
            padding: 0.375rem 0.5rem;
            font-size: 0.6875rem;
            flex: 0 0 48%;
            justify-content: center;
          }

          .pagination-prev {
            order: 2;
          }

          .pagination-next {
            order: 3;
          }

          .pagination-btn .btn-text {
            display: none;
          }

          .pagination-btn span:first-child:not(.btn-text),
          .pagination-btn span:last-child:not(.btn-text) {
            font-size: 0.875rem;
          }

          .pagination-ellipsis {
            min-width: 24px;
            height: 24px;
            font-size: 0.75rem;
          }

          .pagination-ellipsis.clickable {
            border-radius: 4px;
          }
        }

        /* ==================== DELETE MODAL STYLES ==================== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .delete-modal {
          background: white;
          border-radius: 12px;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .delete-modal-header {
          padding: 1.25rem 1rem 0.875rem;
          text-align: center;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-bottom: 1px solid #93c5fd;
        }

        .delete-icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .delete-icon {
          font-size: 2rem;
        }

        .delete-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e40af;
          margin: 0 0 0.25rem 0;
        }

        .delete-subtitle {
          font-size: 0.75rem;
          color: #3b82f6;
          font-weight: 600;
          margin: 0;
        }

        .delete-modal-body {
          padding: 1rem;
        }

        .student-info-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .student-info-avatar {
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

        .student-info-details {
          flex: 1;
        }

        .student-info-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.125rem 0;
        }

        .student-info-meta {
          font-size: 0.6875rem;
          color: #64748b;
          margin: 0;
        }

        .delete-warning {
          font-size: 0.75rem;
          color: #475569;
          line-height: 1.5;
          text-align: center;
          margin: 0;
          padding: 0.625rem;
          background: #fef9c3;
          border-radius: 6px;
          border-left: 3px solid #f59e0b;
        }

        .delete-modal-footer {
          padding: 0.875rem 1rem 1rem;
          display: flex;
          gap: 0.5rem;
          background: #fafbfc;
          border-top: 1px solid #e2e8f0;
        }

        .modal-btn {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          transition: all 0.2s ease;
        }

        .modal-btn span:first-child {
          font-size: 0.875rem;
        }

        .cancel-btn {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .cancel-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .confirm-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .confirm-btn:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
        }

        /* Delete Modal Responsive - Tablet (481px - 768px) */
        @media (min-width: 481px) and (max-width: 768px) {
          .delete-modal {
            max-width: 340px;
          }

          .delete-modal-header {
            padding: 1rem 0.875rem 0.75rem;
          }

          .delete-icon {
            font-size: 1.75rem;
          }

          .delete-title {
            font-size: 0.9375rem;
          }

          .delete-subtitle {
            font-size: 0.6875rem;
          }

          .delete-modal-body {
            padding: 0.875rem;
          }

          .student-info-card {
            padding: 0.625rem;
            gap: 0.625rem;
          }

          .student-info-avatar {
            width: 36px;
            height: 36px;
            font-size: 0.75rem;
          }

          .student-info-name {
            font-size: 0.8125rem;
          }

          .student-info-meta {
            font-size: 0.625rem;
          }

          .delete-warning {
            font-size: 0.6875rem;
            padding: 0.5rem;
          }

          .delete-modal-footer {
            padding: 0.75rem 0.875rem;
          }

          .modal-btn {
            padding: 0.4375rem 0.625rem;
            font-size: 0.6875rem;
          }
        }

        /* Delete Modal Responsive - Mobil (max 480px gacha) */
        @media (max-width: 480px) {
          .delete-modal {
            width: 92%;
            max-width: 300px;
            border-radius: 10px;
          }

          .delete-modal-header {
            padding: 0.875rem 0.75rem 0.625rem;
          }

          .delete-icon {
            font-size: 1.5rem;
          }

          .delete-title {
            font-size: 0.875rem;
          }

          .delete-subtitle {
            font-size: 0.625rem;
          }

          .delete-modal-body {
            padding: 0.75rem;
          }

          .student-info-card {
            padding: 0.5rem;
            gap: 0.5rem;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .student-info-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.6875rem;
          }

          .student-info-details {
            text-align: center;
          }

          .student-info-name {
            font-size: 0.75rem;
          }

          .student-info-meta {
            font-size: 0.5625rem;
          }

          .delete-warning {
            font-size: 0.625rem;
            padding: 0.4375rem;
          }

          .delete-modal-footer {
            flex-direction: column-reverse;
            padding: 0.625rem 0.75rem;
            gap: 0.375rem;
          }

          .modal-btn {
            width: 100%;
            padding: 0.4375rem 0.5rem;
            font-size: 0.6875rem;
          }

          .modal-btn span:first-child {
            font-size: 0.75rem;
          }
        }

        /* ==================== LOADING OVERLAY ==================== */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .loading-spinner {
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.625rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-spinner p {
          margin: 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #1e293b;
        }

        /* ==================== ERROR BANNER ==================== */
        .error-banner {
          margin-bottom: 1rem;
          padding: 0.625rem 0.875rem;
          background: #fee2e2;
          border: 1px solid #f87171;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .error-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .error-text {
          flex: 1;
          color: #991b1b;
          font-weight: 500;
          font-size: 0.75rem;
        }

        .error-close {
          background: #ef4444;
          color: white;
          border: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .error-close:hover {
          background: #dc2626;
        }

        /* ==================== PAGINATION ELLIPSIS ==================== */
        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
          background: none;
        }

        .pagination-ellipsis.clickable {
          cursor: pointer;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .pagination-ellipsis.clickable:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f0f9ff;
        }

        /* ==================== RESPONSIVE OVERRIDES: ADMIN CONTENT WIDTH ==================== */
        .student-management,
        .students-container {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .stats-grid,
        .filter-card,
        .filter-left,
        .card-view,
        .student-card,
        .card-info,
        .card-body,
        .row-value {
          min-width: 0;
        }

        .stats-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .card-view {
          max-width: 100%;
        }

        .student-card {
          box-sizing: border-box;
        }

        .card-name,
        .row-value {
          overflow-wrap: anywhere;
        }

        /* Telefon */
        @media (max-width: 575px) {
          .student-management {
            padding: 0.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.375rem;
            margin-bottom: 0.75rem;
          }

          .filter-card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding: 0.625rem;
          }

          .filter-left {
            width: 100%;
            flex-direction: column;
            gap: 0.5rem;
          }

          .filter-item,
          .filter-item:first-child {
            width: 100%;
            min-width: 0;
          }

          .filter-results {
            min-width: 0;
            width: 100%;
            flex-direction: row;
            justify-content: center;
            gap: 0.375rem;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
          }

          .table-view {
            display: none;
          }

          .card-view {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 0.5rem;
          }

          .student-card {
            padding: 0.625rem;
          }

          .card-header {
            align-items: center;
          }

          .card-footer {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 576px) and (max-width: 767px) {
          .student-management {
            padding: 0.75rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filter-card {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-left {
            width: 100%;
          }

          .table-view {
            display: none;
          }

          .card-view {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 0.625rem;
          }
        }

        /* Tablet */
        @media (min-width: 768px) and (max-width: 991px) {
          .student-management {
            padding: 0.875rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
          }

          .filter-card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.625rem;
          }

          .filter-left {
            width: 100%;
            flex-wrap: wrap;
          }

          .filter-item:first-child {
            min-width: 220px;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
          }

          .table-view {
            display: none;
          }

          .card-view {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.625rem;
          }

          .student-card {
            padding: 0.75rem;
          }
        }

        /* Laptop */
        @media (min-width: 992px) and (max-width: 1199px) {
          .student-management {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.5rem;
          }

          .stat-card {
            padding: 0.625rem 0.75rem;
          }

          .filter-card {
            align-items: flex-end;
            gap: 0.625rem;
          }

          .filter-left {
            flex-wrap: wrap;
          }

          .filter-item:first-child {
            min-width: 220px;
          }

          .table-view {
            display: none;
          }

          .card-view {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
          }

          .student-card {
            padding: 0.875rem;
          }

          .card-footer {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        /* Desktop */
        @media (min-width: 1200px) {
          .student-management {
            padding: 1.5rem 2rem;
          }

          .table-view {
            display: block;
            overflow-x: auto;
          }

          .card-view {
            display: none;
          }

          .students-table {
            min-width: 980px;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentManagement;
