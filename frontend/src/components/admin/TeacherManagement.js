import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import TeacherProfile from './TeacherProfile';

const TeacherManagement = () => {
  const { setLoading, setError } = useData();
  const [teachers, setTeachers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMode, setProfileMode] = useState('view');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedTeacherForSalary, setSelectedTeacherForSalary] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [newSalaryRate, setNewSalaryRate] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState('add');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load teachers data
  const loadTeachersData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setLoading(true);
      // Request reasonable amount instead of 1000
      const response = await apiService.getUsers('teacher', 1, 100);
      setTeachers(response.users || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'O\'qituvchilarni yuklashda xatolik';
      setError(errorMessage);
    } finally {
      setIsLoadingData(false);
      setLoading(false);
    }
  }, [setLoading, setError]);

  useEffect(() => {
    loadTeachersData();
  }, [loadTeachersData]);

  // Memoized filtered teachers with safe access
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const firstName = teacher.firstName?.toLowerCase() || '';
      const lastName = teacher.lastName?.toLowerCase() || '';
      const phone = teacher.phone?.toLowerCase() || '';
      const passportSeriesNumber = teacher.passportSeriesNumber?.toLowerCase() || '';
      const jshshir = teacher.jshshir?.toLowerCase() || '';
      const search = debouncedSearchTerm.toLowerCase();

      const matchesSearch =
        firstName.includes(search) ||
        lastName.includes(search) ||
        phone.includes(search) ||
        passportSeriesNumber.includes(search) ||
        jshshir.includes(search);

      if (filter === 'all') return matchesSearch;
      if (filter === 'active') return matchesSearch && teacher.isActive;
      if (filter === 'inactive') return matchesSearch && !teacher.isActive;

      return matchesSearch;
    });
  }, [teachers, debouncedSearchTerm, filter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedTeachers = filteredTeachers.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = useCallback((pageNumber) => {
    if (pageNumber !== '...' && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  // Smart pagination with clickable ellipsis
  const renderPaginationPages = useCallback(() => {
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
  }, [currentPage, totalPages, handlePageChange]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearchTerm]);

  const handleViewTeacher = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    setProfileMode('view');
    setShowProfileModal(true);
  }, []);

  const handleEditTeacher = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    setProfileMode('edit');
    setShowProfileModal(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setShowProfileModal(false);
    setSelectedTeacher(null);
  }, []);

  const handleAddTeacher = useCallback(() => {
    setSelectedTeacher(null);
    setProfileMode('add');
    setShowProfileModal(true);
  }, []);

  const handleUpdateTeacher = useCallback(() => {
    loadTeachersData();
  }, [loadTeachersData]);

  const handleDeleteTeacher = useCallback((teacher) => {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  }, []);

  const handleViewSalary = useCallback(async (teacher) => {
    setSelectedTeacherForSalary(teacher);
    setNewSalaryRate(teacher.salaryPerLesson || '');
    setShowSalaryModal(true);

    try {
      setLoading(true);
      const data = await apiService.getTeacherMonthlySalary(selectedYear, selectedMonth, teacher._id);
      setSalaryData(data);
    } catch (error) {
      setError(error.response?.data?.message || 'Maosh ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, setLoading, setError]);

  const handleUpdateSalaryRate = useCallback(async () => {
    if (!selectedTeacherForSalary || !newSalaryRate) return;

    try {
      setLoading(true);
      await apiService.updateTeacherSalaryRate(selectedTeacherForSalary._id, Number(newSalaryRate));
      await loadTeachersData();
      setError(null);
      alert('Maosh stavkasi muvaffaqiyatli yangilandi!');
    } catch (error) {
      setError(error.response?.data?.message || 'Maosh stavkasini yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherForSalary, newSalaryRate, setLoading, setError, loadTeachersData]);

  const handleCloseSalaryModal = useCallback(() => {
    setShowSalaryModal(false);
    setSelectedTeacherForSalary(null);
    setSalaryData(null);
    setNewSalaryRate('');
    setBalanceAmount('');
    setBalanceType('add');
  }, []);

  const handleUpdateBalance = useCallback(async () => {
    if (!selectedTeacherForSalary || !balanceAmount || isNaN(balanceAmount) || Number(balanceAmount) <= 0) {
      alert('Summa noto\'g\'ri kiritilgan!');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.updateTeacherBalance(
        selectedTeacherForSalary._id,
        Number(balanceAmount),
        balanceType
      );

      // Update teacher balance in state
      setSelectedTeacherForSalary(prev => ({
        ...prev,
        balance: response.balance
      }));

      await loadTeachersData();
      setBalanceAmount('');
      alert(response.message || 'Muvaffaqiyatli!');
    } catch (error) {
      alert(error.response?.data?.message || 'Hisobni yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherForSalary, balanceAmount, balanceType, setLoading, loadTeachersData]);

  const handleMonthChange = useCallback((direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  }, [selectedMonth, selectedYear]);

  // Reload salary data when month/year changes
  useEffect(() => {
    if (showSalaryModal && selectedTeacherForSalary) {
      const loadSalary = async () => {
        try {
          setLoading(true);
          const data = await apiService.getTeacherMonthlySalary(selectedYear, selectedMonth, selectedTeacherForSalary._id);
          setSalaryData(data);
        } catch (error) {
        } finally {
          setLoading(false);
        }
      };
      loadSalary();
    }
  }, [selectedYear, selectedMonth, showSalaryModal, selectedTeacherForSalary, setLoading]);

  const confirmDelete = useCallback(async () => {
    if (!teacherToDelete) return;

    try {
      setLoading(true);
      await apiService.deleteUser(teacherToDelete._id);
      setShowDeleteModal(false);
      setTeacherToDelete(null);
      loadTeachersData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'O\'qituvchini o\'chirishda xatolik';
      setError(errorMessage);
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  }, [teacherToDelete, setLoading, setError, loadTeachersData]);

  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setTeacherToDelete(null);
  }, []);

  // Stats calculations
  const stats = useMemo(() => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return {
      total: teachers.length,
      active: teachers.filter(t => t.isActive).length,
      inactive: teachers.filter(t => !t.isActive).length,
      newTeachers: teachers.filter(t => new Date(t.createdAt) > monthAgo).length
    };
  }, [teachers]);

  return (
    <div className="teacher-management">
      <header className="teachers-page-header">
        <div>
          <h1>O'qituvchilar</h1>
          <p>O'qituvchilar ro'yxati, maoshi, holati va shaxsiy ma'lumotlarini boshqaring.</p>
        </div>
        <button className="teachers-primary-action" onClick={handleAddTeacher}>
          Yangi o'qituvchi
        </button>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Jami o'qituvchilar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Faol o'qituvchilar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-inactive">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.inactive}</div>
            <div className="stat-label">Nofaol o'qituvchilar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-new">
          <div className="stat-icon">🆕</div>
          <div className="stat-content">
            <div className="stat-value">{stats.newTeachers}</div>
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
              <label className="filter-label" htmlFor="teacher-search">
                <span className="label-icon">🔍</span>
                Qidiruv
              </label>
              <div className="search-wrapper">
                <input
                  id="teacher-search"
                  type="text"
                  placeholder="Ism, familiya, telefon, passport..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  aria-label="O'qituvchilarni qidirish"
                />
                {searchTerm && (
                  <button
                    className="search-clear"
                    onClick={() => setSearchTerm('')}
                    aria-label="Qidiruvni tozalash"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="filter-item">
              <label className="filter-label" htmlFor="teacher-filter">
                <span className="label-icon">📋</span>
                Holat
              </label>
              <select
                id="teacher-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
                aria-label="O'qituvchilarni filterlash"
              >
                <option value="all">Barchasi</option>
                <option value="active">✓ Faol</option>
                <option value="inactive">✗ Nofaol</option>
              </select>
            </div>

            <div className="filter-results">
              <span className="results-count">{filteredTeachers.length}</span>
              <span className="results-label">ta natija</span>
            </div>
          </div>

          <button className="btn-add-compact" onClick={handleAddTeacher} aria-label="Yangi o'qituvchi qo'shish">
            <span className="add-icon">➕</span>
            <span className="add-text">Yangi o'qituvchi</span>
          </button>
        </div>
      </div>

      {/* Teachers Grid/Table */}
      <div className="teachers-container">
        {isLoadingData ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Ma'lumotlar yuklanmoqda...</p>
          </div>
        ) : filteredTeachers.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="table-view">
              <table className="teachers-table">
                <thead>
                  <tr>
                    <th>O'qituvchi</th>
                    <th>Telefon</th>
                    <th>Passport</th>
                    <th>JSHSHIR</th>
                    <th>Holat</th>
                    <th>Qabul</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTeachers.map((teacher) => (
                    <tr key={teacher._id} className={!teacher.isActive ? 'inactive-row' : ''}>
                      <td>
                        <div className="teacher-cell">
                          <div className="teacher-avatar" style={teacher.profileImage ? {
                            backgroundImage: `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001'}${teacher.profileImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            color: 'transparent'
                          } : {}}>
                            {!teacher.profileImage && (
                              <span>{teacher.firstName?.charAt(0) || ''}{teacher.lastName?.charAt(0) || ''}</span>
                            )}
                          </div>
                          <div className="teacher-details">
                            <div className="teacher-name">{teacher.firstName} {teacher.lastName}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="contact-text">
                          {teacher.phone || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="passport-badge">
                          {teacher.passportSeriesNumber || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="contact-text">
                          {teacher.jshshir || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${teacher.isActive ? 'status-active' : 'status-inactive'}`}>
                          {teacher.isActive ? '✓ Faol' : '✗ Nofaol'}
                        </span>
                      </td>
                      <td>
                        <span className="date-text">
                          {new Date(teacher.createdAt).toLocaleDateString('uz-UZ', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view-btn"
                            title="Ko'rish"
                            onClick={() => handleViewTeacher(teacher)}
                            aria-label={`${teacher.firstName} ${teacher.lastName} profilini ko'rish`}
                          >
                            <span>👁️</span>
                          </button>
                          <button
                            className="action-btn salary-btn"
                            title="Maosh"
                            onClick={() => handleViewSalary(teacher)}
                            aria-label={`${teacher.firstName} ${teacher.lastName} maoshi`}
                          >
                            <span>💰</span>
                          </button>
                          <button
                            className="action-btn edit-btn"
                            title="Tahrirlash"
                            onClick={() => handleEditTeacher(teacher)}
                            aria-label={`${teacher.firstName} ${teacher.lastName} profilini tahrirlash`}
                          >
                            <span>✏️</span>
                          </button>
                          <button
                            className="action-btn delete-btn"
                            title="O'chirish"
                            onClick={() => handleDeleteTeacher(teacher)}
                            aria-label={`${teacher.firstName} ${teacher.lastName} ni o'chirish`}
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="card-view">
              {paginatedTeachers.map((teacher) => (
                <div key={teacher._id} className={`teacher-card ${!teacher.isActive ? 'card-inactive' : ''}`}>
                  <div className="card-header">
                    <div className="card-avatar" style={teacher.profileImage ? {
                      backgroundImage: `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001'}${teacher.profileImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: 'transparent'
                    } : {}}>
                      {!teacher.profileImage && (
                        <span>{teacher.firstName?.charAt(0) || ''}{teacher.lastName?.charAt(0) || ''}</span>
                      )}
                    </div>
                    <div className="card-info">
                      <h3 className="card-name">{teacher.firstName} {teacher.lastName}</h3>
                    </div>
                    <div className={`card-status ${teacher.isActive ? 'status-active' : 'status-inactive'}`}>
                      {teacher.isActive ? '✓' : '✗'}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="card-row">
                      <span className="row-icon">📱</span>
                      <span className="row-label">Telefon:</span>
                      <span className="row-value">{teacher.phone || '—'}</span>
                    </div>
                    <div className="card-row">
                      <span className="row-icon">🛂</span>
                      <span className="row-label">Passport:</span>
                      <span className="row-value passport-text">{teacher.passportSeriesNumber || '—'}</span>
                    </div>
                    <div className="card-row">
                      <span className="row-icon">🆔</span>
                      <span className="row-label">JSHSHIR:</span>
                      <span className="row-value">{teacher.jshshir || '—'}</span>
                    </div>
                    <div className="card-row">
                      <span className="row-icon">📅</span>
                      <span className="row-label">Qo'shilgan:</span>
                      <span className="row-value">
                        {new Date(teacher.createdAt).toLocaleDateString('uz-UZ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="card-footer">
                    <button
                      className="card-action-btn view"
                      onClick={() => handleViewTeacher(teacher)}
                      aria-label={`${teacher.firstName} ${teacher.lastName} profilini ko'rish`}
                    >
                      <span>👁️</span>
                      <span>Ko'rish</span>
                    </button>
                    <button
                      className="card-action-btn salary"
                      onClick={() => handleViewSalary(teacher)}
                      aria-label={`${teacher.firstName} ${teacher.lastName} maoshi`}
                    >
                      <span>💰</span>
                      <span>Maosh</span>
                    </button>
                    <button
                      className="card-action-btn edit"
                      onClick={() => handleEditTeacher(teacher)}
                      aria-label={`${teacher.firstName} ${teacher.lastName} profilini tahrirlash`}
                    >
                      <span>✏️</span>
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      className="card-action-btn delete"
                      onClick={() => handleDeleteTeacher(teacher)}
                      aria-label={`${teacher.firstName} ${teacher.lastName} ni o'chirish`}
                    >
                      <span>🗑️</span>
                      <span>O'chirish</span>
                    </button>
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
                  aria-label="Oldingi sahifa"
                >
                  <span>←</span>
                  <span className="btn-text">Oldingi</span>
                </button>

                <div className="pagination-pages">
                  {renderPaginationPages()}
                </div>

                <button
                  className="pagination-btn pagination-next"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Keyingi sahifa"
                >
                  <span className="btn-text">Keyingi</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3 className="empty-title">O'qituvchilar topilmadi</h3>
            <p className="empty-text">
              Qidiruv kriteriyalaringizga mos o'qituvchilar mavjud emas.
              Boshqa parametrlar bilan qidiring.
            </p>
          </div>
        )}
      </div>

      {/* Teacher Profile Modal */}
      {showProfileModal && (
        <TeacherProfile
          teacher={selectedTeacher}
          isOpen={showProfileModal}
          onClose={handleCloseProfile}
          onUpdate={handleUpdateTeacher}
          mode={profileMode}
        />
      )}

      {/* Salary Modal */}
      {showSalaryModal && selectedTeacherForSalary && (
        <div className="modal-overlay" onClick={handleCloseSalaryModal}>
          <div className="salary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="salary-modal-header">
              <h2 className="salary-modal-title">
                💰 {selectedTeacherForSalary.firstName} {selectedTeacherForSalary.lastName} - Maosh
              </h2>
              <button className="modal-close-btn" onClick={handleCloseSalaryModal}>✕</button>
            </div>

            <div className="salary-modal-body">
              {/* Month Selector */}
              <div className="month-selector-wrapper">
                <button className="month-nav-btn" onClick={() => handleMonthChange(-1)}>←</button>
                <div className="current-month-display">
                  {['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'][selectedMonth - 1]} {selectedYear}
                </div>
                <button className="month-nav-btn" onClick={() => handleMonthChange(1)}>→</button>
              </div>

              {/* Salary Rate Update Section */}
              <div className="salary-rate-section">
                <h3 className="section-title">Maosh stavkasi</h3>
                <div className="rate-input-group">
                  <input
                    type="number"
                    value={newSalaryRate}
                    onChange={(e) => setNewSalaryRate(e.target.value)}
                    placeholder="Dars uchun to'lov"
                    className="rate-input"
                  />
                  <span className="rate-currency">so'm</span>
                  <button className="update-rate-btn" onClick={handleUpdateSalaryRate}>
                    Yangilash
                  </button>
                </div>
                <p className="rate-note">Joriy stavka: {selectedTeacherForSalary.salaryPerLesson?.toLocaleString() || 0} so'm/dars</p>
              </div>

              {/* Account Balance */}
              <div className="balance-section">
                <div className="balance-card">
                  <div className="balance-icon">💳</div>
                  <div className="balance-content">
                    <div className="balance-label">Hisobdagi pul</div>
                    <div className="balance-amount">{(selectedTeacherForSalary.balance || 0).toLocaleString()} so'm</div>
                  </div>
                </div>

                {/* Balance Management */}
                <div className="balance-management">
                  <h3 className="section-title">Hisobni boshqarish</h3>
                  <div className="balance-input-group">
                    <select
                      value={balanceType}
                      onChange={(e) => setBalanceType(e.target.value)}
                      className="balance-type-select"
                    >
                      <option value="add">➕ Pul qo'shish</option>
                      <option value="withdraw">➖ Pul yechish</option>
                    </select>
                    <input
                      type="number"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      placeholder="Summa"
                      className="balance-input"
                    />
                    <span className="balance-currency">so'm</span>
                    <button className="update-balance-btn" onClick={handleUpdateBalance}>
                      {balanceType === 'add' ? '➕ Qo\'shish' : '➖ Yechish'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Salary Stats */}
              {salaryData && (
                <>
                  <div className="salary-stats-grid">
                    <div className="salary-stat-card">
                      <div className="stat-icon">💰</div>
                      <div className="stat-content">
                        <div className="stat-value">{(salaryData.netSalary || 0).toLocaleString()} so'm</div>
                        <div className="stat-label">Sof maosh</div>
                      </div>
                    </div>
                    <div className="salary-stat-card">
                      <div className="stat-icon">📚</div>
                      <div className="stat-content">
                        <div className="stat-value">{salaryData.totalLessonsTaught || 0}</div>
                        <div className="stat-label">Darslar</div>
                      </div>
                    </div>
                    <div className="salary-stat-card">
                      <div className="stat-icon">✅</div>
                      <div className="stat-content">
                        <div className="stat-value">{(salaryData.totalEarned || 0).toLocaleString()} so'm</div>
                        <div className="stat-label">Daromad</div>
                      </div>
                    </div>
                    <div className="salary-stat-card">
                      <div className="stat-icon">⚠️</div>
                      <div className="stat-content">
                        <div className="stat-value">{(salaryData.totalDeductions || 0).toLocaleString()} so'm</div>
                        <div className="stat-label">Chegirmalar</div>
                      </div>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="transactions-section">
                    <h3 className="section-title">Tranzaksiyalar ({salaryData.transactions?.length || 0})</h3>
                    {salaryData.transactions && salaryData.transactions.length > 0 ? (
                      <div className="transactions-list">
                        {salaryData.transactions
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .slice(0, 10)
                          .map((transaction, index) => (
                            <div key={index} className={`transaction-item ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                              <div className="transaction-icon">
                                {transaction.type === 'lesson_taught' ? '✅' :
                                  transaction.type === 'lesson_missed' ? '❌' :
                                    transaction.type === 'lesson_covered' ? '⭐' : '📝'}
                              </div>
                              <div className="transaction-details">
                                <div className="transaction-title">
                                  {transaction.type === 'lesson_taught' ? 'Dars o\'tildi' :
                                    transaction.type === 'lesson_missed' ? 'Darsga kelmadi' :
                                      transaction.type === 'lesson_covered' ? 'O\'rnini bosib o\'tildi' :
                                        transaction.description}
                                </div>
                                <div className="transaction-info">
                                  {new Date(transaction.date).toLocaleDateString('uz-UZ')}
                                  {transaction.relatedSubject && ` • ${transaction.relatedSubject.name}`}
                                  {transaction.relatedClass && ` • ${transaction.relatedClass.name}`}
                                </div>
                              </div>
                              <div className={`transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                                {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toLocaleString()} so'm
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="no-transactions">Bu oyda tranzaksiyalar yo'q</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-icon-wrapper">
                <span className="delete-icon">⚠️</span>
              </div>
              <h2 className="delete-title">O'qituvchini o'chirish</h2>
              <p className="delete-subtitle">Bu amalni qaytarib bo'lmaydi!</p>
            </div>

            {teacherToDelete && (
              <div className="delete-modal-body">
                <div className="teacher-info-card">
                  <div className="teacher-info-avatar">
                    {teacherToDelete.firstName?.charAt(0) || ''}{teacherToDelete.lastName?.charAt(0) || ''}
                  </div>
                  <div className="teacher-info-details">
                    <h3 className="teacher-info-name">
                      {teacherToDelete.firstName} {teacherToDelete.lastName}
                    </h3>
                    <p className="teacher-info-meta">
                      {teacherToDelete.email || '—'} • {teacherToDelete.specialty || 'Mutaxassislik ko\'rsatilmagan'}
                    </p>
                  </div>
                </div>
                <p className="delete-warning">
                  Ushbu o'qituvchini o'chirishga ishonchingiz komilmi?
                  Barcha ma'lumotlar butunlay o'chib ketadi.
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

      <style>{`
        /* ==================== BASE STYLES - O'qituvchi dashboardiga o'xshash kompakt dizayn ==================== */
        .teacher-management {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ==================== LOADING STATE ==================== */
        .loading-state {
          background: white;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 1rem;
          border: 3px solid #e2e8f0;
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state p {
          color: #64748b;
          font-size: 0.8125rem;
          font-weight: 600;
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

        .stat-total .stat-icon { background: #dbeafe; }
        .stat-active .stat-icon { background: #d1fae5; }
        .stat-inactive .stat-icon { background: #fee2e2; }
        .stat-new .stat-icon { background: #fef3c7; }

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
        .teachers-container {
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

        .teachers-table {
          width: 100%;
          border-collapse: collapse;
        }

        .teachers-table thead {
          background: linear-gradient(135deg, #1e3a8a, #1e40af);
          color: white;
        }

        .teachers-table th {
          padding: 0.625rem 0.75rem;
          text-align: left;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .teachers-table tbody tr {
          transition: background-color 0.2s ease;
          border-bottom: 1px solid #e2e8f0;
        }

        .teachers-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .teachers-table tbody tr:last-child {
          border-bottom: none;
        }

        .teachers-table tbody tr.inactive-row {
          opacity: 0.5;
          background: #fafafa;
        }

        .teachers-table td {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #334155;
        }

        .teacher-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .teacher-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.625rem;
          flex-shrink: 0;
        }

        .teacher-name {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.75rem;
        }

        .contact-text {
          color: #64748b;
          font-size: 0.6875rem;
        }

        .passport-badge {
          background: #e0e7ff;
          color: #3730a3;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.625rem;
          display: inline-block;
        }

        .passport-text {
          font-weight: 700;
          color: #3730a3;
          letter-spacing: 0.5px;
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

        .salary-btn { background: #d1fae5; color: #065f46; }
        .salary-btn:hover { background: #10b981; color: white; }

        .edit-btn { background: #fef3c7; color: #92400e; }
        .edit-btn:hover { background: #f59e0b; color: white; }

        .delete-btn { background: #fee2e2; color: #991b1b; }
        .delete-btn:hover { background: #ef4444; color: white; }

        /* ==================== CARD VIEW (Mobile/Tablet) ==================== */
        .teacher-card {
          background: white;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          transition: all 0.2s ease;
        }

        .teacher-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .teacher-card.card-inactive {
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
          background: linear-gradient(135deg, #f59e0b, #d97706);
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
          word-break: break-word;
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

        .card-action-btn.salary { background: #d1fae5; color: #065f46; }
        .card-action-btn.salary:hover { background: #10b981; color: white; }

        .card-action-btn.edit { background: #fef3c7; color: #92400e; }
        .card-action-btn.edit:hover { background: #f59e0b; color: white; }

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

        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
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

        /* ==================== SALARY MODAL ==================== */
        .salary-modal {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUpModal 0.3s ease-out;
        }

        .salary-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-bottom: 1px solid #93c5fd;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .salary-modal-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e40af;
          margin: 0;
        }

        .modal-close-btn {
          background: #3b82f6;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover {
          background: #2563eb;
          transform: rotate(90deg);
        }

        .salary-modal-body {
          padding: 1rem;
        }

        .month-selector-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding: 0.625rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .month-nav-btn {
          background: #3b82f6;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .month-nav-btn:hover {
          background: #2563eb;
          transform: scale(1.1);
        }

        .current-month-display {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          min-width: 140px;
          text-align: center;
        }

        .salary-rate-section {
          background: #eff6ff;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #bfdbfe;
        }

        .section-title {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .rate-input-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .rate-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          transition: border-color 0.2s ease;
        }

        .rate-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .rate-currency {
          color: #64748b;
          font-weight: 600;
          font-size: 0.75rem;
        }

        .update-rate-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.5rem 0.875rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.6875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .update-rate-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .rate-note {
          margin: 0.375rem 0 0 0;
          color: #64748b;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .balance-section {
          margin-bottom: 1rem;
        }

        .balance-card {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 6px 16px rgba(30, 58, 138, 0.25);
          position: relative;
          overflow: hidden;
        }

        .balance-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }

        .balance-icon {
          font-size: 1.75rem;
          background: rgba(255, 255, 255, 0.2);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .balance-content {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .balance-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.6875rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .balance-amount {
          color: white;
          font-size: 1.5rem;
          font-weight: 900;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          letter-spacing: -0.02em;
        }

        .balance-management {
          background: white;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-top: 0.625rem;
        }

        .balance-input-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .balance-type-select {
          padding: 0.5rem 0.625rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .balance-type-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .balance-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          transition: border-color 0.2s ease;
        }

        .balance-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .balance-currency {
          color: #64748b;
          font-weight: 600;
          font-size: 0.75rem;
        }

        .update-balance-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.6875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .update-balance-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
        }

        .salary-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.625rem;
          margin-bottom: 1rem;
        }

        .salary-stat-card {
          background: white;
          padding: 0.625rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          text-align: center;
          transition: all 0.2s ease;
        }

        .salary-stat-card:hover {
          transform: translateY(-2px);
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
        }

        .salary-stat-card .stat-icon {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }

        .salary-stat-card .stat-value {
          font-size: 0.8125rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .salary-stat-card .stat-label {
          font-size: 0.5625rem;
          color: #64748b;
          font-weight: 600;
        }

        .transactions-section {
          background: #f8fafc;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 250px;
          overflow-y: auto;
        }

        .transaction-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
          border-left: 3px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .transaction-item:hover {
          transform: translateX(2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .transaction-item.positive {
          border-left-color: #10b981;
        }

        .transaction-item.negative {
          border-left-color: #ef4444;
        }

        .transaction-item .transaction-icon {
          font-size: 0.875rem;
          width: 28px;
          height: 28px;
          background: #f8fafc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .transaction-item .transaction-title {
          font-weight: 700;
          font-size: 0.6875rem;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .transaction-item .transaction-info {
          font-size: 0.5625rem;
          color: #64748b;
        }

        .transaction-item .transaction-amount {
          font-size: 0.75rem;
          font-weight: 800;
          text-align: right;
        }

        .transaction-item .transaction-amount.positive {
          color: #10b981;
        }

        .transaction-item .transaction-amount.negative {
          color: #ef4444;
        }

        .no-transactions {
          text-align: center;
          padding: 1.5rem 0.75rem;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .delete-modal {
          background: white;
          border-radius: 12px;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUpModal 0.3s ease-out;
          overflow: hidden;
        }

        @keyframes slideUpModal {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
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
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
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

        .teacher-info-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 8px;
          margin-bottom: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .teacher-info-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
          flex-shrink: 0;
        }

        .teacher-info-details {
          flex: 1;
        }

        .teacher-info-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.125rem 0;
        }

        .teacher-info-meta {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
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
          font-weight: 700;
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
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .confirm-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
        }

        .confirm-btn:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
        }

        .confirm-btn:active,
        .cancel-btn:active {
          transform: translateY(0);
        }

        /* ==================== RESPONSIVE: NOUTBUK (769px - 1024px) - kompakt qoladi ==================== */
        @media (min-width: 769px) and (max-width: 1024px) {
          .teacher-management {
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

          .teachers-table th {
            padding: 0.625rem 0.75rem;
            font-size: 0.5625rem;
          }

          .teachers-table td {
            padding: 0.625rem 0.75rem;
            font-size: 0.6875rem;
          }

          .teacher-cell {
            gap: 0.5rem;
          }

          .teacher-avatar {
            width: 30px;
            height: 30px;
            font-size: 0.625rem;
          }

          .teacher-name {
            font-size: 0.6875rem;
          }

          .passport-badge,
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
        }

        /* ==================== RESPONSIVE: KATTA EKRAN / DESKTOP (1025px va undan yuqori) ==================== */
        @media (min-width: 1025px) {
          .teacher-management {
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

          .teachers-table th {
            padding: 0.75rem 1rem;
            font-size: 0.75rem;
          }

          .teachers-table td {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .teacher-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }

          .teacher-name {
            font-size: 0.8125rem;
          }

          .passport-badge,
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
          .teacher-management {
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

          .teacher-card {
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
          .teacher-management {
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

          .teacher-card {
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

          /* Delete Modal for Mobile */
          .delete-modal {
            width: 95%;
            max-width: none;
            border-radius: 12px;
          }

          .delete-modal-header {
            padding: 1.25rem 1rem 0.875rem;
          }

          .delete-icon {
            font-size: 2rem;
          }

          .delete-title {
            font-size: 1rem;
          }

          .delete-subtitle {
            font-size: 0.75rem;
          }

          .delete-modal-body {
            padding: 1rem;
          }

          .teacher-info-card {
            padding: 0.75rem;
            gap: 0.75rem;
            border-radius: 8px;
          }

          .teacher-info-avatar {
            width: 40px;
            height: 40px;
            font-size: 0.875rem;
          }

          .teacher-info-name {
            font-size: 0.875rem;
          }

          .teacher-info-meta {
            font-size: 0.6875rem;
          }

          .delete-warning {
            font-size: 0.75rem;
            padding: 0.625rem;
            border-radius: 6px;
          }

          .delete-modal-footer {
            padding: 0.875rem 1rem 1rem;
            gap: 0.5rem;
          }

          .modal-btn {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            border-radius: 6px;
          }

          .modal-btn span:first-child {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
};

TeacherManagement.propTypes = {
  // No props needed for this component
};

export default TeacherManagement;
