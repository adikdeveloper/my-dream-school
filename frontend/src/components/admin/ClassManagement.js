import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import ClassProfile from './ClassProfile';
import ClassStatistics from './ClassStatistics';
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
// Chart components available if needed: Bar, Pie, Line from 'react-chartjs-2'

// Register Chart.js components
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

const ClassManagement = () => {
  const navigate = useNavigate();
  const { setLoading, setError } = useData();
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedClass, setSelectedClass] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMode, setProfileMode] = useState('view');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentToTransfer, setStudentToTransfer] = useState(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [classForDetails, setClassForDetails] = useState(null);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [statisticsData, setStatisticsData] = useState(null);
  const [classForStatistics, setClassForStatistics] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getClasses();
      // Backend always returns {classes: [...], pagination: {...}} format
      setClasses(response.classes || []);
    } catch (error) {
      setError(error.response?.data?.message || 'Sinflarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchesSearch =
        cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.grade?.toString().includes(searchTerm);

      if (filter === 'all') return matchesSearch;
      if (filter === 'active') return matchesSearch && cls.isActive;
      if (filter === 'inactive') return matchesSearch && !cls.isActive;

      return matchesSearch;
    });
  }, [classes, searchTerm, filter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedClasses = filteredClasses.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

  const handleViewClass = (cls) => {
    setClassForDetails(cls);
    setShowDetailsModal(true);
  };

  const handleEditClass = (cls) => {
    setSelectedClass(cls);
    setProfileMode('edit');
    setShowProfileModal(true);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setSelectedClass(null);
  };

  const handleAddClass = () => {
    setSelectedClass(null);
    setProfileMode('add');
    setShowProfileModal(true);
  };

  const handleUpdateClass = () => {
    loadClasses();
  };

  const handleDeleteClass = (cls) => {
    setClassToDelete(cls);
    setShowDeleteModal(true);
  };

  const handleViewStatistics = async (cls) => {
    setClassForStatistics(cls);
    setShowStatisticsModal(true);

    try {
      setLoading(true);
      const data = await apiService.getClassStatistics(cls._id);
      setStatisticsData(data);
    } catch (error) {
      setError(error.response?.data?.message || 'Statistikani yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseStatistics = () => {
    setShowStatisticsModal(false);
    setStatisticsData(null);
    setClassForStatistics(null);
  };

  const confirmDelete = async () => {
    if (!classToDelete) return;

    try {
      setLoading(true);
      await apiService.deleteClass(classToDelete._id);
      setShowDeleteModal(false);
      setClassToDelete(null);
      loadClasses();
    } catch (error) {
      setError(error.response?.data?.message || 'Sinfni o\'chirishda xatolik');
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setClassToDelete(null);
  };

  const handleAddStudents = useCallback(async (cls) => {
    setSelectedClass(cls);
    setShowAddStudentModal(true);
    try {
      setLoading(true);
      // Use new backend API that returns only available students (not in any class)
      const response = await apiService.getAvailableStudents();
      const available = response.students || [];
      setAvailableStudents(available);
      setSelectedStudents([]);
    } catch (error) {
      setError(error.response?.data?.message || 'O\'quvchilarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const handleTransferClass = (cls) => {
    setSelectedClass(cls);
    setShowTransferModal(true);
  };

  const confirmAddStudents = async () => {
    if (selectedStudents.length === 0) {
      setError('Kamida bitta o\'quvchi tanlang');
      return;
    }

    try {
      setLoading(true);
      // Extract student IDs (handle both populated and non-populated formats)
      const currentStudentIds = (selectedClass.students || []).map(s =>
        typeof s === 'object' ? s._id : s
      );
      const updatedStudents = [...currentStudentIds, ...selectedStudents];

      await apiService.updateClass(selectedClass._id, {
        students: updatedStudents
      });

      setShowAddStudentModal(false);
      setSelectedStudents([]);
      loadClasses();
    } catch (error) {
      setError(error.response?.data?.message || 'O\'quvchilarni qo\'shishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const confirmTransferStudent = async () => {
    if (!targetClassId) {
      setError('Yangi sinfni tanlang');
      return;
    }

    try {
      setLoading(true);
      const studentId = typeof studentToTransfer === 'object' ? studentToTransfer._id : studentToTransfer;

      // Remove student from current class
      const currentStudentIds = (selectedClass.students || []).map(s =>
        typeof s === 'object' ? s._id : s
      );
      const updatedCurrentStudents = currentStudentIds.filter(id => id !== studentId);

      await apiService.updateClass(selectedClass._id, {
        students: updatedCurrentStudents
      });

      // Add student to target class
      const targetClass = classes.find(c => c._id === targetClassId);
      const targetStudentIds = (targetClass.students || []).map(s =>
        typeof s === 'object' ? s._id : s
      );
      const updatedTargetStudents = [...targetStudentIds, studentId];

      await apiService.updateClass(targetClassId, {
        students: updatedTargetStudents
      });

      setShowTransferModal(false);
      setStudentToTransfer(null);
      setTargetClassId('');
      loadClasses();
    } catch (error) {
      setError(error.response?.data?.message || 'O\'quvchini ko\'chirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const toggleSelectAll = () => {
    const filtered = availableStudents.filter(student =>
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      (student.phone && student.phone.includes(studentSearchTerm))
    );

    if (selectedStudents.length === filtered.length && filtered.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filtered.map(s => s._id));
    }
  };

  const filteredAvailableStudents = availableStudents.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    (student.phone && student.phone.includes(studentSearchTerm))
  );

  return (
    <div className="class-management">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">🏫</div>
          <div className="stat-content">
            <div className="stat-value">{classes.length}</div>
            <div className="stat-label">Jami sinflar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{classes.filter(c => c.isActive).length}</div>
            <div className="stat-label">Faol sinflar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-students">
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-content">
            <div className="stat-value">
              {classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)}
            </div>
            <div className="stat-label">Jami o'quvchilar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-teachers">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <div className="stat-value">
              {classes.filter(c => c.classTeacher).length}
            </div>
            <div className="stat-label">Sinf rahbarlari</div>
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
                  placeholder="Sinf nomi, bo'lim..."
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
                <span className="label-icon">📋</span>
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
              <span className="results-count">{filteredClasses.length}</span>
              <span className="results-label">ta natija</span>
            </div>
          </div>

          <button className="btn-add-compact" onClick={handleAddClass}>
            <span className="add-icon">➕</span>
            <span className="add-text">Yangi sinf</span>
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="classes-container">
        {filteredClasses.length > 0 ? (
          <div className="classes-grid">
            {paginatedClasses.map((cls) => (
              <div key={cls._id} className={`class-card ${!cls.isActive ? 'class-inactive' : ''}`}>
                <div className="class-header">
                  <div className="class-badge">
                    <span className="grade-badge">{cls.grade}</span>
                    <span className="section-badge">{cls.section}</span>
                    {cls.group && <span className="group-badge">{cls.group}</span>}
                  </div>
                  <div className={`status-indicator ${cls.isActive ? 'active' : 'inactive'}`}>
                    {cls.isActive ? '●' : '○'}
                  </div>
                </div>

                <div className="class-body">
                  <h3 className="class-name">{cls.name}</h3>
                  <p className="class-year">{cls.academicYear}</p>

                  <div className="class-info-grid">
                    <div className="info-item">
                      <span className="info-icon">👨‍🎓</span>
                      <div className="info-details">
                        <span className="info-label">O'quvchilar</span>
                        <span className="info-value">{cls.students?.length || 0} ta</span>
                      </div>
                    </div>

                    <div className="info-item">
                      <span className="info-icon">👨‍🏫</span>
                      <div className="info-details">
                        <span className="info-label">Sinf rahbari</span>
                        <span className="info-value">
                          {cls.classTeacher
                            ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {cls.room && (
                      <div className="info-item">
                        <span className="info-icon">🚪</span>
                        <div className="info-details">
                          <span className="info-label">Xona</span>
                          <span className="info-value">{cls.room}</span>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                <div className="class-footer">
                  <button
                    className="class-action-btn view"
                    onClick={() => handleViewClass(cls)}
                  >
                    <span>📋</span>
                    <span>Batafsil</span>
                  </button>
                  <button
                    className="class-action-btn statistics"
                    onClick={() => handleViewStatistics(cls)}
                  >
                    <span>📊</span>
                    <span>Statistika</span>
                  </button>
                  <button
                    className="class-action-btn add-student"
                    onClick={() => handleAddStudents(cls)}
                  >
                    <span>➕</span>
                    <span>Qo'shish</span>
                  </button>
                  <button
                    className="class-action-btn transfer"
                    onClick={() => handleTransferClass(cls)}
                  >
                    <span>🔄</span>
                    <span>Ko'chirish</span>
                  </button>
                  <button
                    className="class-action-btn edit"
                    onClick={() => handleEditClass(cls)}
                  >
                    <span>✏️</span>
                    <span>Tahrirlash</span>
                  </button>
                  <button
                    className="class-action-btn delete"
                    onClick={() => handleDeleteClass(cls)}
                  >
                    <span>🗑️</span>
                    <span>O'chirish</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3 className="empty-title">Sinflar topilmadi</h3>
            <p className="empty-text">
              Qidiruv kriteriyalaringizga mos sinflar mavjud emas.
              Boshqa parametrlar bilan qidiring yoki yangi sinf qo'shing.
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredClasses.length > 0 && totalPages > 1 && (
          <div className="pagination-container">
            <button
              className="pagination-btn prev"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="pagination-arrow">←</span>
              <span className="pagination-text">Oldingi</span>
            </button>

            <div className="pagination-pages">
              {renderPaginationPages()}
            </div>

            <button
              className="pagination-btn next"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="pagination-text">Keyingi</span>
              <span className="pagination-arrow">→</span>
            </button>
          </div>
        )}
      </div>

      {/* Class Profile Modal */}
      <ClassProfile
        classData={selectedClass}
        isOpen={showProfileModal}
        onClose={handleCloseProfile}
        onUpdate={handleUpdateClass}
        mode={profileMode}
      />

      {/* Class Details Modal */}
      {showDetailsModal && classForDetails && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="details-modal-header">
              <div className="header-left">
                <div className="class-badge-large">
                  <span className="grade-text">{classForDetails.grade}</span>
                  <span className="section-text">{classForDetails.section}</span>
                </div>
                <div className="class-title-info">
                  <h2 className="class-title-main">{classForDetails.name}</h2>
                  <p className="class-subtitle">{classForDetails.academicYear}</p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="details-modal-body">
              {/* Class Information Section */}
              <div className="info-section">
                <div className="section-header-inline">
                  <span className="section-icon-inline">ℹ️</span>
                  <h3 className="section-title-inline">Sinf ma'lumotlari</h3>
                </div>

                <div className="info-grid-detailed">
                  <div className="info-card-detailed">
                    <div className="info-card-icon">👨‍🏫</div>
                    <div className="info-card-content">
                      <div className="info-card-label">Sinf rahbari</div>
                      <div className="info-card-value">
                        {classForDetails.classTeacher
                          ? `${classForDetails.classTeacher.firstName} ${classForDetails.classTeacher.lastName}`
                          : 'Tayinlanmagan'}
                      </div>
                    </div>
                  </div>

                  <div className="info-card-detailed">
                    <div className="info-card-icon">👨‍🎓</div>
                    <div className="info-card-content">
                      <div className="info-card-label">O'quvchilar soni</div>
                      <div className="info-card-value">{classForDetails.students?.length || 0} ta</div>
                    </div>
                  </div>

                  <div className="info-card-detailed">
                    <div className="info-card-icon">📚</div>
                    <div className="info-card-content">
                      <div className="info-card-label">Fanlar soni</div>
                      <div className="info-card-value">{classForDetails.subjects?.length || 0} ta</div>
                    </div>
                  </div>

                  {classForDetails.room && (
                    <div className="info-card-detailed">
                      <div className="info-card-icon">🚪</div>
                      <div className="info-card-content">
                        <div className="info-card-label">Xona raqami</div>
                        <div className="info-card-value">{classForDetails.room}</div>
                      </div>
                    </div>
                  )}


                  {classForDetails.group && (
                    <div className="info-card-detailed">
                      <div className="info-card-icon">🎯</div>
                      <div className="info-card-content">
                        <div className="info-card-label">Guruh</div>
                        <div className="info-card-value">{classForDetails.group}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Students Section */}
              {classForDetails.students && classForDetails.students.length > 0 && (
                <div className="students-section">
                  <div className="section-header-inline">
                    <span className="section-icon-inline">👨‍🎓</span>
                    <h3 className="section-title-inline">O'quvchilar ro'yxati</h3>
                    <span className="section-badge-count">{classForDetails.students.length} ta</span>
                  </div>

                  <div className="students-grid-modal">
                    {classForDetails.students.map((student, index) => (
                      <div key={student._id} className="student-card-modal">
                        <div className="student-card-number">{index + 1}</div>
                        <div className="student-card-avatar">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </div>
                        <div className="student-card-info">
                          <div className="student-card-name">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="student-card-phone">
                            {student.phone || 'Telefon kiritilmagan'}
                          </div>
                          {student.studentId && (
                            <div className="student-card-id">ID: {student.studentId}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State for No Students */}
              {(!classForDetails.students || classForDetails.students.length === 0) && (
                <div className="empty-students-state">
                  <div className="empty-students-icon">📭</div>
                  <p className="empty-students-text">Bu sinfda hozircha o'quvchilar yo'q</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="details-modal-footer">
              <button
                className="modal-btn-footer close-btn-footer"
                onClick={() => setShowDetailsModal(false)}
              >
                <span>✕</span>
                <span>Yopish</span>
              </button>
              <button
                className="modal-btn-footer edit-btn-footer"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEditClass(classForDetails);
                }}
              >
                <span>✏️</span>
                <span>Tahrirlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Students Modal - Enhanced Design */}
      {showAddStudentModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddStudentModal(false);
          setStudentSearchTerm('');
        }}>
          <div className="student-modal-enhanced" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Modal Header */}
            <div className="add-student-modal-header">
              <div className="header-content">
                <div className="header-icon-wrapper">
                  <span className="header-main-icon">👨‍🎓</span>
                </div>
                <div className="header-text-content">
                  <h2 className="modal-title-enhanced">O'quvchilarni qo'shish</h2>
                  <p className="modal-subtitle-enhanced">
                    <span className="class-name-highlight">{selectedClass?.name}</span> sinfiga o'quvchi qo'shish
                  </p>
                </div>
              </div>
              <button
                className="enhanced-close-btn"
                onClick={() => {
                  setShowAddStudentModal(false);
                  setStudentSearchTerm('');
                }}
              >
                ✕
              </button>
            </div>

            {/* Selection Stats Bar */}
            {availableStudents.length > 0 && (
              <div className="selection-stats-bar">
                <div className="stats-left">
                  <div className="stat-item-inline">
                    <span className="stat-icon-inline">📊</span>
                    <span className="stat-text-inline">
                      Jami: <strong>{availableStudents.length}</strong> ta
                    </span>
                  </div>
                  <div className="stat-item-inline selected-count">
                    <span className="stat-icon-inline">✅</span>
                    <span className="stat-text-inline">
                      Tanlangan: <strong>{selectedStudents.length}</strong> ta
                    </span>
                  </div>
                </div>
                <button
                  className="select-all-btn"
                  onClick={toggleSelectAll}
                >
                  {selectedStudents.length === filteredAvailableStudents.length && filteredAvailableStudents.length > 0 ? (
                    <>
                      <span>❌</span>
                      <span>Hammasini bekor qilish</span>
                    </>
                  ) : (
                    <>
                      <span>✔️</span>
                      <span>Hammasini tanlash</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Search Bar */}
            {availableStudents.length > 0 && (
              <div className="student-search-wrapper">
                <div className="search-input-group">
                  <span className="search-icon-prefix">🔍</span>
                  <input
                    type="text"
                    placeholder="O'quvchi ismi yoki telefon raqami bo'yicha qidiring..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="student-search-input"
                  />
                  {studentSearchTerm && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setStudentSearchTerm('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {studentSearchTerm && (
                  <div className="search-results-info">
                    <span className="results-icon">📋</span>
                    <span className="results-text">
                      {filteredAvailableStudents.length} ta natija topildi
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="modal-body-enhanced">
              {availableStudents.length > 0 ? (
                filteredAvailableStudents.length > 0 ? (
                  <div className="students-grid-enhanced">
                    {filteredAvailableStudents.map((student, index) => (
                      <div
                        key={student._id}
                        className={`student-card-enhanced ${selectedStudents.includes(student._id) ? 'card-selected' : ''}`}
                        onClick={() => toggleStudentSelection(student._id)}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="card-selection-indicator">
                          <div className="checkbox-custom">
                            {selectedStudents.includes(student._id) && (
                              <span className="checkmark">✓</span>
                            )}
                          </div>
                        </div>
                        <div className="card-body-enhanced">
                          <div className="student-avatar-enhanced">
                            <span className="avatar-text">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </span>
                            <div className="avatar-ring"></div>
                          </div>
                          <div className="student-info-enhanced">
                            <h4 className="student-name-enhanced">
                              {student.firstName} {student.lastName}
                            </h4>
                            <div className="student-details-row">
                              <span className="detail-icon">📞</span>
                              <span className="detail-text">
                                {student.phone || 'Telefon kiritilmagan'}
                              </span>
                            </div>
                            {student.studentId && (
                              <div className="student-details-row">
                                <span className="detail-icon">🆔</span>
                                <span className="detail-text">{student.studentId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="card-hover-indicator">
                          <span>Tanlash uchun bosing</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-results-message">
                    <span className="no-results-icon">🔍</span>
                    <h3 className="no-results-title">Natija topilmadi</h3>
                    <p className="no-results-text">
                      "{studentSearchTerm}" bo'yicha hech qanday o'quvchi topilmadi
                    </p>
                    <button
                      className="clear-search-btn"
                      onClick={() => setStudentSearchTerm('')}
                    >
                      Qidiruvni tozalash
                    </button>
                  </div>
                )
              ) : (
                <div className="empty-students-message">
                  <div className="empty-animation-wrapper">
                    <span className="empty-icon-large">📭</span>
                    <div className="empty-circle-1"></div>
                    <div className="empty-circle-2"></div>
                  </div>
                  <h3 className="empty-title-enhanced">O'quvchilar yo'q</h3>
                  <p className="empty-text-enhanced">
                    Barcha o'quvchilar sinflarga biriktirilgan.<br />
                    Yangi o'quvchi qo'shish uchun foydalanuvchilar bo'limiga o'ting.
                  </p>
                  <button
                    className="add-new-student-btn"
                    onClick={() => {
                      setShowAddStudentModal(false);
                      navigate('/admin/users');
                    }}
                  >
                    <span className="btn-icon">➕</span>
                    <span className="btn-text">Yangi o'quvchi qo'shish</span>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer-enhanced">
              <button
                className="modal-btn-enhanced cancel-btn-enhanced"
                onClick={() => {
                  setShowAddStudentModal(false);
                  setStudentSearchTerm('');
                }}
              >
                <span className="btn-icon-emoji">✕</span>
                <span className="btn-label">Bekor qilish</span>
              </button>
              <button
                className={`modal-btn-enhanced confirm-btn-enhanced ${selectedStudents.length === 0 ? 'btn-disabled' : ''}`}
                onClick={confirmAddStudents}
                disabled={selectedStudents.length === 0}
              >
                <span className="btn-icon-emoji">✅</span>
                <span className="btn-label">
                  {selectedStudents.length > 0
                    ? `${selectedStudents.length} ta o'quvchini qo'shish`
                    : 'O\'quvchi tanlanmagan'}
                </span>
                {selectedStudents.length > 0 && <span className="btn-arrow">→</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Student Modal - Enhanced Design */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => {
          setShowTransferModal(false);
          setStudentToTransfer(null);
          setTargetClassId('');
        }}>
          <div className="transfer-modal-enhanced" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Transfer Header */}
            <div className="transfer-modal-header">
              <div className="transfer-header-content">
                <div className="transfer-icon-wrapper">
                  <span className="transfer-main-icon">🔄</span>
                  <div className="icon-circle-bg"></div>
                </div>
                <div className="transfer-text-content">
                  <h2 className="transfer-title">O'quvchini ko'chirish</h2>
                  <p className="transfer-subtitle">
                    <span className="class-badge-small">{selectedClass?.name}</span>
                    <span className="arrow-separator">→</span>
                    <span>Yangi sinf</span>
                  </p>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="step-indicator">
                <div className={`step ${!studentToTransfer ? 'active' : 'completed'}`}>
                  <div className="step-number">1</div>
                  <div className="step-label">O'quvchi</div>
                </div>
                <div className="step-line"></div>
                <div className={`step ${studentToTransfer ? 'active' : ''}`}>
                  <div className="step-number">2</div>
                  <div className="step-label">Sinf</div>
                </div>
              </div>

              <button
                className="transfer-close-btn"
                onClick={() => {
                  setShowTransferModal(false);
                  setStudentToTransfer(null);
                  setTargetClassId('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="transfer-modal-body">
              {!studentToTransfer ? (
                // Step 1: Select student
                <>
                  {selectedClass?.students && selectedClass.students.length > 0 ? (
                    <>
                      <div className="transfer-step-header">
                        <div className="step-header-icon">👥</div>
                        <div className="step-header-text">
                          <h3 className="step-title">1-qadam: O'quvchini tanlang</h3>
                          <p className="step-description">
                            Ko'chirmoqchi bo'lgan o'quvchini ro'yxatdan tanlang
                          </p>
                        </div>
                      </div>

                      <div className="transfer-students-grid">
                        {selectedClass.students.map((student, index) => (
                          <div
                            key={student._id}
                            className="transfer-student-card"
                            onClick={() => {
                              setStudentToTransfer(student);
                              setTargetClassId('');
                            }}
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <div className="transfer-card-content">
                              <div className="transfer-student-avatar">
                                <span className="avatar-initials">
                                  {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                </span>
                                <div className="avatar-glow"></div>
                              </div>
                              <div className="transfer-student-info">
                                <h4 className="transfer-student-name">
                                  {student.firstName} {student.lastName}
                                </h4>
                                <div className="transfer-student-details">
                                  <span className="detail-item">
                                    <span className="detail-icon-small">📞</span>
                                    {student.phone || 'Telefon yo\'q'}
                                  </span>
                                  {student.studentId && (
                                    <span className="detail-item">
                                      <span className="detail-icon-small">🆔</span>
                                      {student.studentId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="transfer-card-action">
                              <span className="action-text">Tanlash</span>
                              <span className="action-arrow">→</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="transfer-empty-state">
                      <div className="empty-animation">
                        <span className="empty-icon-animated">📭</span>
                        <div className="pulse-ring"></div>
                      </div>
                      <h3 className="empty-state-title">O'quvchilar yo'q</h3>
                      <p className="empty-state-text">
                        Bu sinfda hozircha o'quvchilar mavjud emas
                      </p>
                    </div>
                  )}
                </>
              ) : (
                // Step 2: Select target class
                <>
                  <div className="transfer-step-header">
                    <div className="step-header-icon">🎯</div>
                    <div className="step-header-text">
                      <h3 className="step-title">2-qadam: Yangi sinfni tanlang</h3>
                      <p className="step-description">
                        O'quvchi qaysi sinfga o'tkazilishini belgilang
                      </p>
                    </div>
                  </div>

                  {/* Selected Student Card */}
                  <div className="selected-student-card">
                    <div className="selected-badge">Tanlangan o'quvchi</div>
                    <div className="selected-student-content">
                      <div className="selected-student-avatar">
                        <span className="selected-avatar-text">
                          {studentToTransfer.firstName.charAt(0)}{studentToTransfer.lastName.charAt(0)}
                        </span>
                        <div className="selected-avatar-ring"></div>
                      </div>
                      <div className="selected-student-info">
                        <h4 className="selected-student-name">
                          {studentToTransfer.firstName} {studentToTransfer.lastName}
                        </h4>
                        <div className="selected-student-meta">
                          <span className="meta-item">
                            <span className="meta-icon">📚</span>
                            Hozirgi sinf: <strong>{selectedClass?.name}</strong>
                          </span>
                          {studentToTransfer.phone && (
                            <span className="meta-item">
                              <span className="meta-icon">📞</span>
                              {studentToTransfer.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class Selection */}
                  <div className="class-selection-wrapper">
                    <label className="class-selection-label">
                      <span className="label-icon-large">🏫</span>
                      <span className="label-text">Yangi sinf</span>
                    </label>

                    <div className="custom-select-wrapper">
                      <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="class-select-enhanced"
                        autoFocus
                      >
                        <option value="">Sinfni tanlang...</option>
                        {classes
                          .filter(c => c._id !== selectedClass?._id && c.isActive)
                          .map(cls => (
                            <option key={cls._id} value={cls._id}>
                              {cls.name} • {cls.grade}-sinf, {cls.section} bo'lim
                              {cls.group && ` • ${cls.group}`}
                              {' '} ({cls.students?.length || 0} o'quvchi)
                            </option>
                          ))}
                      </select>
                      <div className="select-arrow-icon">▼</div>
                    </div>

                    {targetClassId && (
                      <div className="selection-confirmation">
                        <span className="confirmation-icon">✓</span>
                        <span className="confirmation-text">Sinf tanlandi</span>
                      </div>
                    )}
                  </div>

                  {/* Transfer Preview */}
                  {targetClassId && (
                    <div className="transfer-preview">
                      <div className="preview-header">
                        <span className="preview-icon">👁️</span>
                        <span className="preview-title">Ko'chirish umumiy ko'rinishi</span>
                      </div>
                      <div className="preview-flow">
                        <div className="preview-box from">
                          <div className="preview-label">Dan</div>
                          <div className="preview-value">{selectedClass?.name}</div>
                        </div>
                        <div className="preview-arrow-container">
                          <div className="preview-arrow">→</div>
                          <div className="preview-student">
                            <span className="preview-student-icon">👤</span>
                            <span className="preview-student-name">
                              {studentToTransfer.firstName.charAt(0)}.{studentToTransfer.lastName.charAt(0)}.
                            </span>
                          </div>
                        </div>
                        <div className="preview-box to">
                          <div className="preview-label">Ga</div>
                          <div className="preview-value">
                            {classes.find(c => c._id === targetClassId)?.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="transfer-modal-footer">
              {!studentToTransfer ? (
                <button
                  className="transfer-btn transfer-cancel-btn"
                  onClick={() => {
                    setShowTransferModal(false);
                    setStudentToTransfer(null);
                    setTargetClassId('');
                  }}
                >
                  <span className="btn-icon">✕</span>
                  <span className="btn-text">Bekor qilish</span>
                </button>
              ) : (
                <>
                  <button
                    className="transfer-btn transfer-back-btn"
                    onClick={() => {
                      setStudentToTransfer(null);
                      setTargetClassId('');
                    }}
                  >
                    <span className="btn-icon">←</span>
                    <span className="btn-text">Orqaga qaytish</span>
                  </button>
                  <button
                    className={`transfer-btn transfer-confirm-btn ${!targetClassId ? 'btn-disabled' : ''}`}
                    onClick={confirmTransferStudent}
                    disabled={!targetClassId}
                  >
                    <span className="btn-icon">🔄</span>
                    <span className="btn-text">
                      {targetClassId ? 'Ko\'chirishni tasdiqlash' : 'Sinf tanlanmagan'}
                    </span>
                    {targetClassId && <span className="btn-arrow">→</span>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatisticsModal && classForStatistics && (
        <div className="modal-overlay" onClick={handleCloseStatistics}>
          <div className="statistics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="statistics-modal-header">
              <div className="statistics-header-content">
                <div className="statistics-title-wrapper">
                  <span className="statistics-icon">📊</span>
                  <div>
                    <h2 className="statistics-title">Sinf Statistikasi</h2>
                    <p className="statistics-subtitle">
                      {classForStatistics.name} • {classForStatistics.grade}-sinf
                    </p>
                  </div>
                </div>
                <button className="close-btn" onClick={handleCloseStatistics}>✕</button>
              </div>
            </div>

            <div className="statistics-modal-body">
              <ClassStatistics
                statisticsData={statisticsData}
                classInfo={classForStatistics}
              />
            </div>

            <div className="statistics-modal-footer">
              <button className="modal-btn close-stats-btn" onClick={handleCloseStatistics}>
                <span>✕</span>
                <span>Yopish</span>
              </button>
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
              <h2 className="delete-title">Sinfni o'chirish</h2>
              <p className="delete-subtitle">Bu amalni qaytarib bo'lmaydi!</p>
            </div>

            {classToDelete && (
              <div className="delete-modal-body">
                <div className="class-info-card">
                  <div className="class-info-icon">🏫</div>
                  <div className="class-info-details">
                    <h3 className="class-info-name">{classToDelete.name}</h3>
                    <p className="class-info-meta">
                      {classToDelete.grade}-sinf • {classToDelete.section} bo'lim • {classToDelete.academicYear}
                    </p>
                  </div>
                </div>
                <p className="delete-warning">
                  Ushbu sinfni o'chirishga ishonchingiz komilmi?
                  Sinfga biriktirilgan barcha o'quvchilar va ma'lumotlar saqlanib qoladi, lekin sinf
                  o'chiriladi.
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
        /* ==================== BASE STYLES ==================== */
        .class-management {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }

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
        .stat-students .stat-decoration { background: #f59e0b; }
        .stat-teachers .stat-decoration { background: #8b5cf6; }

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

        .stat-total .stat-icon {
          background: #dbeafe;
        }

        .stat-active .stat-icon {
          background: #d1fae5;
        }

        .stat-students .stat-icon {
          background: #fef3c7;
        }

        .stat-teachers .stat-icon {
          background: #ede9fe;
        }

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

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
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

        .search-clear:hover {
          background: #dc2626;
          transform: translateY(-50%) scale(1.1);
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
          background: linear-gradient(135deg, #1e40af, #2563eb);
        }

        .add-icon {
          font-size: 0.75rem;
        }

        .add-text {
          font-size: 0.75rem;
        }

        /* ==================== CLASSES GRID ==================== */
        .classes-container {
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .classes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 0.75rem;
        }

        .class-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .class-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .class-card.class-inactive {
          opacity: 0.7;
          background: #fafafa;
        }

        .class-header {
          padding: 0.625rem 0.75rem;
          background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .class-badge {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .grade-badge {
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.8125rem;
        }

        .section-badge {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #78350f;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.8125rem;
        }

        .group-badge {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.6875rem;
          text-transform: uppercase;
        }

        .status-indicator {
          font-size: 0.875rem;
        }

        .status-indicator.active {
          color: #10b981;
        }

        .status-indicator.inactive {
          color: #ef4444;
        }

        .class-body {
          padding: 0.625rem 0.75rem;
          flex: 1;
        }

        .class-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .class-year {
          font-size: 0.6875rem;
          color: #64748b;
          margin-bottom: 0.625rem;
        }

        .class-info-grid {
          display: grid;
          gap: 0.5rem;
        }

        .info-item {
          display: flex;
          gap: 0.375rem;
          align-items: flex-start;
        }

        .info-icon {
          font-size: 0.75rem;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .info-details {
          flex: 1;
          min-width: 0;
        }

        .info-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          display: block;
          margin-bottom: 0.125rem;
        }

        .info-value {
          font-size: 0.9375rem;
          color: #1e293b;
          font-weight: 600;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ==================== DETAILS MODAL ==================== */
        .details-modal {
          background: white;
          border-radius: 16px;
          max-width: 850px;
          width: 94%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(30, 58, 138, 0.25), 0 0 0 1px rgba(30, 58, 138, 0.08);
          animation: modalSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .details-modal-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .details-modal-header::before {
          content: '';
          position: absolute;
          top: -80%;
          right: -15%;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 60%);
          border-radius: 50%;
          animation: pulse 3s ease-in-out infinite;
        }

        .details-modal-header::after {
          content: '';
          position: absolute;
          bottom: -60%;
          left: -10%;
          width: 180px;
          height: 180px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
          border-radius: 50%;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }

        .details-modal-header .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
          flex: 1;
          min-width: 0;
        }

        .class-badge-large {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(12px);
          padding: 0.625rem 0.875rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          border: 2px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          flex-shrink: 0;
          min-width: 50px;
        }

        .grade-text {
          font-size: 1.5rem;
          font-weight: 900;
          color: white;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .section-text {
          font-size: 0.8125rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .details-modal-header .class-title-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .details-modal-header .class-title-main {
          font-size: 1.125rem;
          font-weight: 800;
          color: white;
          margin: 0 0 0.25rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .details-modal-header .class-subtitle {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .modal-close-btn {
          position: relative;
          z-index: 1;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-radius: 50%;
          color: white;
          font-size: 1.125rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          font-weight: 700;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          background: #ef4444;
          border-color: #ef4444;
          transform: rotate(90deg) scale(1.1);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .details-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background: #f8fafc;
        }

        .details-modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .details-modal-body::-webkit-scrollbar-track {
          background: #e2e8f0;
        }

        .details-modal-body::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 4px;
        }

        .details-modal-body::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }

        .info-section {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.08);
          border: 1px solid #e0e7ff;
        }

        .section-header-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.875rem;
          padding-bottom: 0.625rem;
          border-bottom: 2px solid #dbeafe;
        }

        .section-icon-inline {
          font-size: 1.25rem;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          padding: 0.375rem;
          border-radius: 8px;
        }

        .section-title-inline {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0;
          flex: 1;
        }

        .section-badge-count {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          padding: 0.25rem 0.625rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
        }

        .info-grid-detailed {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .info-card-detailed {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #f8fafc, #f0f9ff);
          border: 1px solid #dbeafe;
          border-radius: 10px;
          transition: all 0.25s ease;
        }

        .info-card-detailed:hover {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .info-card-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 3px 8px rgba(59, 130, 246, 0.35);
        }

        .info-card-content {
          flex: 1;
          min-width: 0;
        }

        .info-card-label {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 0.1875rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .info-card-value {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .students-section {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.08);
          border: 1px solid #e0e7ff;
        }

        .students-grid-modal {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.625rem;
        }

        .student-card-modal {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem;
          background: linear-gradient(135deg, #f8fafc, #f0f9ff);
          border: 1px solid #dbeafe;
          border-radius: 10px;
          transition: all 0.25s ease;
        }

        .student-card-modal:hover {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-color: #3b82f6;
          transform: translateX(4px);
          box-shadow: 0 3px 10px rgba(59, 130, 246, 0.15);
        }

        .student-card-number {
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.6875rem;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }

        .student-card-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.6875rem;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.4);
        }

        .student-card-info {
          flex: 1;
          min-width: 0;
        }

        .student-card-name {
          font-weight: 700;
          font-size: 0.8125rem;
          color: #1e293b;
          margin-bottom: 0.125rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-card-phone {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
        }

        .student-card-id {
          font-size: 0.625rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .empty-students-state {
          text-align: center;
          padding: 2rem 1.5rem;
          background: linear-gradient(135deg, #f8fafc, #f0f9ff);
          border-radius: 12px;
          border: 2px dashed #bfdbfe;
        }

        .empty-students-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
          opacity: 0.6;
        }

        .empty-students-text {
          font-size: 0.8125rem;
          color: #64748b;
          font-weight: 600;
          margin: 0;
        }

        .details-modal-footer {
          padding: 1rem 1.25rem;
          background: linear-gradient(to top, white, #f8fafc);
          border-top: 2px solid #dbeafe;
          display: flex;
          gap: 0.75rem;
        }

        .modal-btn-footer {
          flex: 1;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.25s ease;
        }

        .modal-btn-footer span:first-child {
          font-size: 1rem;
        }

        .close-btn-footer {
          background: white;
          color: #64748b;
          border: 2px solid #e2e8f0;
        }

        .close-btn-footer:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #334155;
          transform: translateY(-1px);
        }

        .edit-btn-footer {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
        }

        .edit-btn-footer:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.45);
        }

        .modal-btn-footer:active {
          transform: translateY(0);
        }

        .class-footer {
          padding: 0.5rem 0.625rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.25rem;
        }

        .class-action-btn {
          padding: 0.375rem 0.25rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          font-size: 0.5rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .class-action-btn span:first-child {
          font-size: 0.75rem;
        }

        .class-action-btn.view {
          background: #dbeafe;
          color: #1e40af;
        }

        .class-action-btn.view:hover {
          background: #3b82f6;
          color: white;
        }

        .class-action-btn.add-student {
          background: #d1fae5;
          color: #065f46;
        }

        .class-action-btn.add-student:hover {
          background: #10b981;
          color: white;
        }

        .class-action-btn.edit {
          background: #fef3c7;
          color: #92400e;
        }

        .class-action-btn.edit:hover {
          background: #f59e0b;
          color: white;
        }

        .class-action-btn.transfer {
          background: #e0e7ff;
          color: #3730a3;
        }

        .class-action-btn.transfer:hover {
          background: #6366f1;
          color: white;
        }

        .class-action-btn.delete {
          background: #fee2e2;
          color: #991b1b;
        }

        .class-action-btn.delete:hover {
          background: #ef4444;
          color: white;
        }

        /* ==================== EMPTY STATE ==================== */
        .empty-state {
          background: white;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          box-shadow: 0 1px 3px rgba(30, 58, 138, 0.08);
          border: 1px solid rgba(30, 58, 138, 0.06);
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
          opacity: 0.4;
        }

        .empty-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.375rem;
        }

        .empty-text {
          font-size: 0.75rem;
          color: #64748b;
          max-width: 350px;
          margin: 0 auto;
        }

        /* ==================== STATISTICS MODAL STYLES ==================== */
        /* Mobile First (max 480px) */
        .statistics-modal {
          background: white;
          border-radius: 16px;
          max-width: 100%;
          width: 98%;
          max-height: 95vh;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .statistics-modal-header {
          padding: 1rem;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          border-bottom: 1px solid #93c5fd;
        }

        .statistics-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .statistics-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex: 1;
          min-width: 0;
        }

        .statistics-icon {
          font-size: 1.75rem;
          flex-shrink: 0;
        }

        .statistics-title {
          font-size: 1.125rem;
          font-weight: 800;
          color: white;
          margin: 0;
        }

        .statistics-subtitle {
          font-size: 0.75rem;
          color: #dbeafe;
          margin: 0.125rem 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 1.25rem;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .close-btn:active {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(0.95);
        }

        .statistics-modal-body {
          padding: 1rem;
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }

        .statistics-modal-footer {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          background: #f8fafc;
          display: flex;
          justify-content: center;
        }

        .close-stats-btn {
          background: linear-gradient(135deg, #64748b, #475569);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
          width: 100%;
          justify-content: center;
        }

        .close-stats-btn:active {
          transform: scale(0.98);
        }

        /* Tablet (481px - 768px) */
        @media (min-width: 481px) and (max-width: 768px) {
          .statistics-modal {
            border-radius: 20px;
            width: 96%;
            max-height: 92vh;
          }

          .statistics-modal-header {
            padding: 1.25rem;
          }

          .statistics-title-wrapper {
            gap: 0.75rem;
          }

          .statistics-icon {
            font-size: 2rem;
          }

          .statistics-title {
            font-size: 1.375rem;
          }

          .statistics-subtitle {
            font-size: 0.8125rem;
          }

          .close-btn {
            width: 36px;
            height: 36px;
            font-size: 1.375rem;
          }

          .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
          }

          .statistics-modal-body {
            padding: 1.25rem;
          }

          .statistics-modal-footer {
            padding: 1.25rem;
          }

          .close-stats-btn {
            padding: 0.875rem 2rem;
            font-size: 0.9375rem;
            width: auto;
          }

          .close-stats-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
          }
        }

        /* Small Desktop/Laptop (769px - 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .statistics-modal {
            border-radius: 22px;
            max-width: 920px;
            width: 94%;
            max-height: 90vh;
          }

          .statistics-modal-header {
            padding: 1.5rem;
          }

          .statistics-title-wrapper {
            gap: 0.875rem;
          }

          .statistics-icon {
            font-size: 2.25rem;
          }

          .statistics-title {
            font-size: 1.5rem;
          }

          .statistics-subtitle {
            font-size: 0.875rem;
          }

          .close-btn {
            width: 38px;
            height: 38px;
            font-size: 1.375rem;
          }

          .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.08);
          }

          .statistics-modal-body {
            padding: 1.5rem;
          }

          .statistics-modal-footer {
            padding: 1.375rem 1.5rem;
          }

          .close-stats-btn {
            padding: 0.875rem 2rem;
            border-radius: 11px;
          }

          .close-stats-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(100, 116, 139, 0.3);
          }
        }

        /* Large Desktop (1025px and above) */
        @media (min-width: 1025px) {
          .statistics-modal {
            border-radius: 24px;
            max-width: 1200px;
            width: 92%;
            max-height: 90vh;
          }

          .statistics-modal-header {
            padding: 2rem;
          }

          .statistics-title-wrapper {
            gap: 1rem;
          }

          .statistics-icon {
            font-size: 2.5rem;
          }

          .statistics-title {
            font-size: 1.75rem;
          }

          .statistics-subtitle {
            font-size: 0.9375rem;
            margin: 0.25rem 0 0 0;
          }

          .close-btn {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
          }

          .statistics-modal-body {
            padding: 2rem;
          }

          .statistics-modal-footer {
            padding: 1.5rem 2rem;
            justify-content: flex-end;
          }

          .close-stats-btn {
            padding: 0.875rem 2rem;
            border-radius: 12px;
            width: auto;
          }

          .close-stats-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(100, 116, 139, 0.3);
          }
        }

        /* Extra Large Desktop (1440px and above) */
        @media (min-width: 1440px) {
          .statistics-modal {
            max-width: 1400px;
          }

          .statistics-modal-header {
            padding: 2.25rem;
          }

          .statistics-modal-body {
            padding: 2.25rem;
          }

          .statistics-modal-footer {
            padding: 1.75rem 2.25rem;
          }
        }

        .stats-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stats-summary-card {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 1.5rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 1rem;
          border: 2px solid #e2e8f0;
        }

        .stats-summary-icon {
          font-size: 2.5rem;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stats-summary-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1e3a8a;
        }

        .stats-summary-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .stats-section {
          margin-bottom: 2.5rem;
        }

        .stats-section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .stats-section-title span {
          font-size: 1.75rem;
        }

        .stats-chart-container {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
        }

        .stats-chart-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #475569;
          margin: 0 0 1.25rem 0;
        }

        .attendance-pie-chart {
          padding: 1rem 0;
        }

        .pie-chart-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pie-chart-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pie-chart-bar {
          height: 32px;
          border-radius: 8px;
          transition: all 0.3s ease;
          min-width: 40px;
        }

        .pie-chart-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
        }

        .pie-chart-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .subject-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .subject-stat-card {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .subject-stat-name {
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.75rem;
        }

        .subject-stat-bar-wrapper {
          background: #e2e8f0;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .subject-stat-bar {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1e3a8a);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .subject-stat-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e3a8a;
          text-align: right;
        }

        .grades-distribution {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .grade-bar-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .grade-bar-label {
          font-weight: 600;
          color: #475569;
          font-size: 0.875rem;
        }

        .grade-bar-wrapper {
          background: #e2e8f0;
          height: 40px;
          border-radius: 8px;
          overflow: hidden;
        }

        .grade-bar {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 0.75rem;
          transition: width 0.3s ease;
          min-width: 50px;
        }

        .grade-bar.excellent {
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .grade-bar.good {
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        }

        .grade-bar.average {
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }

        .grade-bar.poor {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .grade-bar-count {
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .subject-grades-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .subject-grade-card {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 1.25rem;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .subject-grade-name {
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.75rem;
          font-size: 0.9375rem;
        }

        .subject-grade-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e3a8a;
          margin-bottom: 0.25rem;
        }

        .subject-grade-total {
          font-size: 0.8125rem;
          color: #64748b;
          font-weight: 500;
        }

        .statistics-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .statistics-modal-footer {
          padding: 1.5rem 2rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          justify-content: flex-end;
        }

        .close-stats-btn {
          background: linear-gradient(135deg, #64748b, #475569);
          color: white;
          border: none;
          padding: 0.875rem 2rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .close-stats-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(100, 116, 139, 0.3);
        }

        .class-action-btn.statistics {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .class-action-btn.statistics:hover {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
        }

        /* ==================== DELETE MODAL STYLES ==================== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease-out;
        }

        .delete-modal {
          background: white;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s ease-out;
          overflow: hidden;
        }

        @keyframes slideUp {
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

        .class-info-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .class-info-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(59, 130, 238, 0.25);
          flex-shrink: 0;
        }

        .class-info-details {
          flex: 1;
        }

        .class-info-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.125rem 0;
        }

        .class-info-meta {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 500;
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
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .confirm-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .confirm-btn:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
        }

        .confirm-btn:active,
        .cancel-btn:active {
          transform: translateY(0);
        }

        /* ==================== STUDENT MODAL STYLES ==================== */
        .student-modal, .transfer-modal {
          background: white;
          border-radius: 20px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .modal-header p {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .students-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .student-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .student-item:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }

        .student-item.selected {
          background: #dbeafe;
          border-color: #3b82f6;
        }

        .student-checkbox {
          font-size: 1.5rem;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .student-info {
          flex: 1;
        }

        .student-name {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .student-meta {
          font-size: 0.8125rem;
          color: #64748b;
        }

        .student-transfer-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .student-transfer-item:hover {
          background: #e0e7ff;
          border-color: #6366f1;
          transform: translateX(4px);
        }

        .transfer-arrow {
          font-size: 1.5rem;
          color: #6366f1;
          margin-left: auto;
        }

        .empty-message {
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 4rem;
          display: block;
          margin-bottom: 1rem;
        }

        .empty-action-btn {
          margin-top: 1.5rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .empty-action-btn:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
        }

        .empty-action-btn:active {
          transform: translateY(0);
        }

        .empty-action-btn span:first-child {
          font-size: 1.125rem;
        }

        .transfer-student-info {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .student-avatar-large {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.25rem;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .student-details h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.125rem;
          color: #1e293b;
        }

        .student-details p {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        .transfer-instruction {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-radius: 12px;
          margin-bottom: 1rem;
          border: 2px solid #3b82f6;
        }

        .instruction-icon {
          font-size: 1.5rem;
        }

        .transfer-instruction p {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e40af;
        }

        .transfer-select-group {
          margin-top: 1rem;
        }

        .transfer-select-group label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .class-select {
          width: 100%;
          padding: 0.875rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e293b;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .class-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-btn:disabled:hover {
          transform: none;
        }

        /* ==================== ENHANCED ADD STUDENT MODAL STYLES ==================== */
        .student-modal-enhanced {
          background: white;
          border-radius: 24px;
          max-width: 900px;
          width: 95%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.4);
          animation: modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .add-student-modal-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%);
          padding: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .add-student-modal-header::before {
          content: '';
          position: absolute;
          top: -100px;
          right: -100px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 3s ease-in-out infinite;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .header-icon-wrapper {
          width: 70px;
          height: 70px;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .header-main-icon {
          font-size: 2.5rem;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .header-text-content {
          flex: 1;
        }

        .modal-title-enhanced {
          font-size: 2rem;
          font-weight: 900;
          color: white;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          letter-spacing: -0.02em;
        }

        .modal-subtitle-enhanced {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .class-name-highlight {
          background: rgba(251, 191, 36, 0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 8px;
          font-weight: 800;
          border: 1px solid rgba(251, 191, 36, 0.5);
        }

        .enhanced-close-btn {
          position: relative;
          z-index: 1;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          color: white;
          font-size: 1.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-weight: 700;
        }

        .enhanced-close-btn:hover {
          background: rgba(239, 68, 68, 0.9);
          border-color: #ef4444;
          transform: scale(1.15) rotate(90deg);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }

        .selection-stats-bar {
          padding: 1.25rem 2rem;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border-bottom: 2px solid #bfdbfe;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .stats-left {
          display: flex;
          gap: 2rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .stat-item-inline {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 1.25rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 2px solid #e0e7ff;
        }

        .stat-item-inline.selected-count {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          border-color: #10b981;
        }

        .stat-icon-inline {
          font-size: 1.25rem;
        }

        .stat-text-inline {
          font-size: 0.9375rem;
          color: #1e293b;
          font-weight: 600;
        }

        .stat-text-inline strong {
          font-weight: 900;
          color: #1e3a8a;
          font-size: 1.125rem;
        }

        .stat-item-inline.selected-count .stat-text-inline strong {
          color: #065f46;
        }

        .select-all-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
        }

        .select-all-btn:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(59, 130, 246, 0.45);
        }

        .select-all-btn span:first-child {
          font-size: 1.125rem;
        }

        .student-search-wrapper {
          padding: 1.5rem 2rem;
          background: white;
          border-bottom: 2px solid #e2e8f0;
        }

        .search-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon-prefix {
          position: absolute;
          left: 1.25rem;
          font-size: 1.25rem;
          z-index: 1;
        }

        .student-search-input {
          width: 100%;
          padding: 1rem 1.25rem 1rem 3.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 500;
          color: #1e293b;
          background: #f8fafc;
          transition: all 0.3s ease;
        }

        .student-search-input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .search-clear-btn {
          position: absolute;
          right: 1rem;
          width: 28px;
          height: 28px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .search-clear-btn:hover {
          background: #dc2626;
          transform: scale(1.15);
        }

        .search-results-info {
          margin-top: 0.875rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          border: 2px solid #fbbf24;
        }

        .results-icon {
          font-size: 1.125rem;
        }

        .results-text {
          font-size: 0.9375rem;
          color: #78350f;
          font-weight: 700;
        }

        .modal-body-enhanced {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          background: #f8fafc;
        }

        .modal-body-enhanced::-webkit-scrollbar {
          width: 10px;
        }

        .modal-body-enhanced::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 5px;
        }

        .modal-body-enhanced::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 5px;
        }

        .modal-body-enhanced::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
        }

        .students-grid-enhanced {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        .student-card-enhanced {
          background: white;
          border-radius: 16px;
          border: 3px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
          animation: cardFadeIn 0.5s ease-out backwards;
        }

        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .student-card-enhanced:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.25);
          border-color: #3b82f6;
        }

        .student-card-enhanced.card-selected {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-color: #3b82f6;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
        }

        .card-selection-indicator {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 2;
        }

        .checkbox-custom {
          width: 32px;
          height: 32px;
          border: 3px solid #3b82f6;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .student-card-enhanced.card-selected .checkbox-custom {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-color: #1e40af;
        }

        .checkmark {
          color: white;
          font-size: 1.25rem;
          font-weight: 900;
          animation: checkPop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes checkPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .card-body-enhanced {
          padding: 1.5rem;
          display: flex;
          gap: 1.25rem;
          align-items: center;
        }

        .student-avatar-enhanced {
          width: 70px;
          height: 70px;
          position: relative;
          flex-shrink: 0;
        }

        .avatar-text {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.5rem;
          position: relative;
          z-index: 1;
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }

        .avatar-ring {
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 3px solid transparent;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .student-card-enhanced:hover .avatar-ring {
          opacity: 1;
          animation: ringRotate 2s linear infinite;
        }

        @keyframes ringRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .student-info-enhanced {
          flex: 1;
          min-width: 0;
        }

        .student-name-enhanced {
          font-size: 1.125rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.75rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-details-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.5rem;
        }

        .student-details-row:last-child {
          margin-bottom: 0;
        }

        .detail-icon {
          font-size: 1rem;
          width: 24px;
          text-align: center;
        }

        .detail-text {
          font-size: 0.9375rem;
          color: #64748b;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-hover-indicator {
          padding: 0.75rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          text-align: center;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }

        .card-hover-indicator span {
          color: white;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .student-card-enhanced:hover .card-hover-indicator {
          opacity: 1;
          transform: translateY(0);
        }

        .no-results-message {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 16px;
          border: 2px dashed #cbd5e1;
        }

        .no-results-icon {
          font-size: 5rem;
          display: block;
          margin-bottom: 1.5rem;
          opacity: 0.5;
          animation: float 3s ease-in-out infinite;
        }

        .no-results-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.75rem 0;
        }

        .no-results-text {
          font-size: 1.125rem;
          color: #64748b;
          margin: 0 0 1.5rem 0;
          font-weight: 600;
        }

        .clear-search-btn {
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
        }

        .clear-search-btn:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(59, 130, 246, 0.45);
        }

        .empty-students-message {
          text-align: center;
          padding: 4rem 2rem;
          position: relative;
        }

        .empty-animation-wrapper {
          position: relative;
          width: 150px;
          height: 150px;
          margin: 0 auto 2rem;
        }

        .empty-icon-large {
          font-size: 6rem;
          position: relative;
          z-index: 2;
          animation: float 3s ease-in-out infinite;
        }

        .empty-circle-1, .empty-circle-2 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          opacity: 0.3;
        }

        .empty-circle-1 {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          animation: pulse 2s ease-in-out infinite;
        }

        .empty-circle-2 {
          width: 180px;
          height: 180px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          animation: pulse 2s ease-in-out infinite 0.5s;
        }

        .empty-title-enhanced {
          font-size: 2rem;
          font-weight: 900;
          color: #1e293b;
          margin: 0 0 1rem 0;
        }

        .empty-text-enhanced {
          font-size: 1.125rem;
          color: #64748b;
          line-height: 1.75;
          margin: 0 0 2rem 0;
          font-weight: 600;
        }

        .add-new-student-btn {
          padding: 1.125rem 2rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1.0625rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.35);
        }

        .add-new-student-btn:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-3px);
          box-shadow: 0 10px 36px rgba(16, 185, 129, 0.5);
        }

        .add-new-student-btn .btn-icon {
          font-size: 1.5rem;
        }

        .add-new-student-btn .btn-arrow {
          font-size: 1.25rem;
          font-weight: 900;
          transition: transform 0.3s ease;
        }

        .add-new-student-btn:hover .btn-arrow {
          transform: translateX(5px);
        }

        .modal-footer-enhanced {
          padding: 1.75rem 2rem;
          background: white;
          border-top: 2px solid #e2e8f0;
          display: flex;
          gap: 1.25rem;
          box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.06);
        }

        .modal-btn-enhanced {
          flex: 1;
          padding: 1.125rem 1.75rem;
          border: none;
          border-radius: 14px;
          font-size: 1.0625rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .modal-btn-enhanced::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .modal-btn-enhanced:hover::before {
          width: 300px;
          height: 300px;
        }

        .btn-icon-emoji {
          font-size: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .btn-label {
          position: relative;
          z-index: 1;
        }

        .btn-arrow {
          font-size: 1.25rem;
          font-weight: 900;
          position: relative;
          z-index: 1;
          transition: transform 0.3s ease;
        }

        .modal-btn-enhanced:hover .btn-arrow {
          transform: translateX(5px);
        }

        .cancel-btn-enhanced {
          background: white;
          color: #64748b;
          border: 3px solid #e2e8f0;
        }

        .cancel-btn-enhanced:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #475569;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }

        .confirm-btn-enhanced {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.35);
        }

        .confirm-btn-enhanced:hover:not(.btn-disabled) {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(16, 185, 129, 0.5);
        }

        .btn-disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: linear-gradient(135deg, #94a3b8, #cbd5e1);
          box-shadow: none;
        }

        .btn-disabled:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        /* ==================== ENHANCED TRANSFER MODAL STYLES ==================== */
        .transfer-modal-enhanced {
          background: white;
          border-radius: 24px;
          max-width: 950px;
          width: 95%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.4);
          animation: modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .transfer-modal-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .transfer-modal-header::before {
          content: '';
          position: absolute;
          top: -150px;
          right: -150px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 4s ease-in-out infinite;
        }

        .transfer-header-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .transfer-icon-wrapper {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          position: relative;
        }

        .transfer-main-icon {
          font-size: 3rem;
          animation: spin 3s linear infinite;
          position: relative;
          z-index: 1;
        }

        @keyframes spin {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(90deg); }
          50% { transform: rotate(180deg); }
          75% { transform: rotate(270deg); }
        }

        .icon-circle-bg {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 20px;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2));
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .transfer-text-content {
          flex: 1;
        }

        .transfer-title {
          font-size: 2rem;
          font-weight: 900;
          color: white;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          letter-spacing: -0.02em;
        }

        .transfer-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.95);
          margin: 0;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .class-badge-small {
          background: rgba(251, 191, 36, 0.35);
          padding: 0.375rem 0.875rem;
          border-radius: 10px;
          font-weight: 800;
          border: 2px solid rgba(251, 191, 36, 0.6);
          display: inline-block;
        }

        .arrow-separator {
          font-size: 1.5rem;
          font-weight: 900;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 1rem 1.5rem;
          border-radius: 16px;
          border: 2px solid rgba(255, 255, 255, 0.25);
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .step-number {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 3px solid rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.3s ease;
        }

        .step.active .step-number {
          background: white;
          border-color: white;
          color: #6366f1;
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.4);
          transform: scale(1.15);
        }

        .step.completed .step-number {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: #10b981;
          color: white;
        }

        .step.completed .step-number::after {
          content: '✓';
          position: absolute;
          font-size: 1.125rem;
        }

        .step-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .step.active .step-label {
          color: white;
        }

        .step-line {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }

        .step-line::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 0;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.5s ease;
        }

        .step.completed ~ .step-line::after {
          width: 100%;
        }

        .transfer-close-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 2;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          color: white;
          font-size: 1.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-weight: 700;
        }

        .transfer-close-btn:hover {
          background: rgba(239, 68, 68, 0.9);
          border-color: #ef4444;
          transform: scale(1.15) rotate(90deg);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }

        .transfer-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          background: #f8fafc;
        }

        .transfer-modal-body::-webkit-scrollbar {
          width: 10px;
        }

        .transfer-modal-body::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 5px;
        }

        .transfer-modal-body::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 5px;
        }

        .transfer-step-header {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          background: white;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          border: 2px solid #e0e7ff;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
        }

        .step-header-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
          flex-shrink: 0;
        }

        .step-header-text {
          flex: 1;
        }

        .step-title {
          font-size: 1.375rem;
          font-weight: 900;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .step-description {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
          font-weight: 600;
        }

        .transfer-students-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }

        .transfer-student-card {
          background: white;
          border-radius: 16px;
          border: 3px solid #e2e8f0;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation: cardFadeIn 0.5s ease-out backwards;
        }

        .transfer-student-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 40px rgba(99, 102, 241, 0.25);
          border-color: #6366f1;
        }

        .transfer-card-content {
          padding: 1.5rem;
          display: flex;
          gap: 1.25rem;
          align-items: center;
        }

        .transfer-student-avatar {
          width: 70px;
          height: 70px;
          position: relative;
          flex-shrink: 0;
        }

        .avatar-initials {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.5rem;
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
          position: relative;
          z-index: 1;
        }

        .avatar-glow {
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          opacity: 0;
          filter: blur(12px);
          transition: opacity 0.3s ease;
        }

        .transfer-student-card:hover .avatar-glow {
          opacity: 0.6;
          animation: pulse 2s ease-in-out infinite;
        }

        .transfer-student-info {
          flex: 1;
          min-width: 0;
        }

        .transfer-student-name {
          font-size: 1.125rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.75rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .transfer-student-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          color: #64748b;
          font-weight: 600;
        }

        .detail-icon-small {
          font-size: 1rem;
        }

        .transfer-card-action {
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }

        .transfer-student-card:hover .transfer-card-action {
          opacity: 1;
          transform: translateY(0);
        }

        .action-text {
          color: white;
          font-weight: 800;
          font-size: 0.9375rem;
        }

        .action-arrow {
          color: white;
          font-size: 1.25rem;
          font-weight: 900;
          transition: transform 0.3s ease;
        }

        .transfer-student-card:hover .action-arrow {
          transform: translateX(5px);
        }

        .transfer-empty-state {
          text-align: center;
          padding: 5rem 2rem;
          background: white;
          border-radius: 16px;
          border: 2px dashed #cbd5e1;
        }

        .empty-animation {
          position: relative;
          width: 150px;
          height: 150px;
          margin: 0 auto 2rem;
        }

        .empty-icon-animated {
          font-size: 6rem;
          animation: float 3s ease-in-out infinite;
          position: relative;
          z-index: 2;
        }

        .pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          border: 4px solid #cbd5e1;
          border-radius: 50%;
          animation: pulseRing 2s ease-out infinite;
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        .empty-state-title {
          font-size: 1.75rem;
          font-weight: 900;
          color: #1e293b;
          margin: 0 0 0.75rem 0;
        }

        .empty-state-text {
          font-size: 1.125rem;
          color: #64748b;
          margin: 0;
          font-weight: 600;
        }

        .selected-student-card {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border: 3px solid #3b82f6;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
        }

        .selected-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.8125rem;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .selected-student-content {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .selected-student-avatar {
          width: 80px;
          height: 80px;
          position: relative;
          flex-shrink: 0;
        }

        .selected-avatar-text {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.75rem;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
          position: relative;
          z-index: 1;
        }

        .selected-avatar-ring {
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          border: 4px solid #3b82f6;
          border-radius: 50%;
          animation: ringPulse 2s ease-in-out infinite;
        }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }

        .selected-student-info {
          flex: 1;
          min-width: 0;
        }

        .selected-student-name {
          font-size: 1.5rem;
          font-weight: 900;
          color: #1e293b;
          margin: 0 0 1rem 0;
        }

        .selected-student-meta {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 1rem;
          color: #475569;
          font-weight: 600;
        }

        .meta-icon {
          font-size: 1.125rem;
        }

        .class-selection-wrapper {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
          margin-bottom: 1.5rem;
        }

        .class-selection-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.125rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .label-icon-large {
          font-size: 1.75rem;
        }

        .custom-select-wrapper {
          position: relative;
        }

        .class-select-enhanced {
          width: 100%;
          padding: 1.125rem 3rem 1.125rem 1.25rem;
          border: 3px solid #e2e8f0;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.3s ease;
          appearance: none;
        }

        .class-select-enhanced:focus {
          outline: none;
          border-color: #6366f1;
          background: white;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .select-arrow-icon {
          position: absolute;
          right: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
          color: #6366f1;
          pointer-events: none;
          transition: transform 0.3s ease;
        }

        .class-select-enhanced:focus ~ .select-arrow-icon {
          transform: translateY(-50%) rotate(180deg);
        }

        .selection-confirmation {
          margin-top: 1rem;
          padding: 0.875rem 1.25rem;
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          border: 2px solid #10b981;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .confirmation-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .confirmation-text {
          font-size: 1rem;
          font-weight: 800;
          color: #065f46;
        }

        .transfer-preview {
          background: white;
          border: 3px solid #e0e7ff;
          border-radius: 16px;
          padding: 1.5rem;
          animation: slideDown 0.4s ease-out;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e0e7ff;
        }

        .preview-icon {
          font-size: 1.5rem;
        }

        .preview-title {
          font-size: 1.125rem;
          font-weight: 800;
          color: #1e293b;
        }

        .preview-flow {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .preview-box {
          flex: 1;
          padding: 1.25rem;
          border-radius: 12px;
          text-align: center;
        }

        .preview-box.from {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #fbbf24;
        }

        .preview-box.to {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          border: 2px solid #10b981;
        }

        .preview-label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }

        .preview-value {
          font-size: 1.125rem;
          font-weight: 900;
          color: #1e293b;
        }

        .preview-arrow-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .preview-arrow {
          font-size: 2rem;
          font-weight: 900;
          color: #6366f1;
          animation: arrowBounce 1.5s ease-in-out infinite;
        }

        @keyframes arrowBounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }

        .preview-student {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
          border: 2px solid #6366f1;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        .preview-student-icon {
          font-size: 1.125rem;
        }

        .preview-student-name {
          font-size: 0.9375rem;
          font-weight: 800;
          color: #3730a3;
        }

        .transfer-modal-footer {
          padding: 1.75rem 2rem;
          background: white;
          border-top: 2px solid #e2e8f0;
          display: flex;
          gap: 1.25rem;
          box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.06);
        }

        .transfer-btn {
          flex: 1;
          padding: 1.125rem 1.75rem;
          border: none;
          border-radius: 14px;
          font-size: 1.0625rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .transfer-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .transfer-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .transfer-btn .btn-icon,
        .transfer-btn .btn-text,
        .transfer-btn .btn-arrow {
          position: relative;
          z-index: 1;
        }

        .transfer-btn .btn-icon {
          font-size: 1.5rem;
        }

        .transfer-btn .btn-arrow {
          font-size: 1.25rem;
          font-weight: 900;
          transition: transform 0.3s ease;
        }

        .transfer-btn:hover .btn-arrow {
          transform: translateX(5px);
        }

        .transfer-cancel-btn {
          background: white;
          color: #64748b;
          border: 3px solid #e2e8f0;
        }

        .transfer-cancel-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #475569;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }

        .transfer-back-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 6px 24px rgba(245, 158, 11, 0.35);
        }

        .transfer-back-btn:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(245, 158, 11, 0.5);
        }

        .transfer-confirm-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.35);
        }

        .transfer-confirm-btn:hover:not(.btn-disabled) {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          transform: translateY(-2px);
          box-shadow: 0 10px 36px rgba(99, 102, 241, 0.5);
        }

        /* ==================== PAGINATION STYLES - KOMPAKT ==================== */
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.625rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(30, 58, 138, 0.08);
          border: 1px solid rgba(30, 58, 138, 0.06);
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.625rem;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(30, 58, 138, 0.2);
        }

        .pagination-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e40af, #2563eb);
          transform: translateY(-1px);
        }

        .pagination-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: linear-gradient(135deg, #94a3b8, #cbd5e1);
          box-shadow: none;
        }

        .pagination-arrow {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .pagination-text {
          font-size: 0.6875rem;
        }

        .pagination-pages {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .pagination-page {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.6875rem;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-page:hover {
          background: #f1f5f9;
          border-color: #3b82f6;
          color: #1e40af;
        }

        .pagination-page.active {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-color: #3b82f6;
          color: white;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
        }

        .pagination-page.active:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
        }

        .pagination-ellipsis {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          font-weight: 700;
          font-size: 0.875rem;
          color: #94a3b8;
          cursor: default;
          user-select: none;
        }

        .pagination-ellipsis.clickable {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-ellipsis.clickable:hover {
          color: #3b82f6;
          background: #f0f9ff;
          border-radius: 6px;
        }

        /* ==================== RESPONSIVE STYLES ==================== */
        /* Mobile-First Approach: Base styles above are for max 480px */

        /* ==================== MOBILE (max 480px) - BASE STYLES ==================== */
        /* Additional mobile-specific overrides */
        @media (max-width: 480px) {
          .class-management {
            padding: 0.75rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            margin-bottom: 0.875rem;
          }

          .stat-card {
            padding: 0.625rem 0.75rem;
            gap: 0.5rem;
            flex-direction: row;
          }

          .stat-icon {
            width: 36px;
            height: 36px;
            font-size: 1.25rem;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .stat-label {
            font-size: 0.625rem;
          }

          .filter-card {
            padding: 0.625rem;
            flex-direction: column;
            gap: 0.5rem;
          }

          .filter-left {
            width: 100%;
            flex-direction: column;
            gap: 0.5rem;
          }

          .filter-item:first-child {
            width: 100%;
            min-width: auto;
          }

          .filter-label {
            font-size: 0.6875rem;
          }

          .search-input,
          .filter-select {
            padding: 0.5rem 0.625rem;
            font-size: 0.8125rem;
          }

          .btn-add-compact {
            width: 100%;
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .add-icon {
            font-size: 1rem;
          }

          .classes-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .class-card {
            padding: 0.875rem;
          }

          .class-badge {
            padding: 0.5rem 0.625rem;
          }

          .grade-text {
            font-size: 1.125rem;
          }

          .section-text {
            font-size: 0.6875rem;
          }

          .class-title {
            font-size: 0.875rem;
            margin: 0.5rem 0;
          }

          .class-info-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            margin: 0.5rem 0;
          }

          .class-info-item {
            padding: 0.375rem 0.5rem;
            font-size: 0.6875rem;
          }

          .info-icon {
            font-size: 0.875rem;
          }

          .info-value {
            font-size: 0.75rem;
          }

          .info-label {
            font-size: 0.5625rem;
          }

          .class-footer {
            padding: 0.5rem;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.25rem;
          }

          .class-action-btn {
            padding: 0.375rem 0.25rem;
            font-size: 0.5625rem;
            gap: 0.125rem;
            flex-direction: column;
          }

          .class-action-btn span:first-child {
            font-size: 0.875rem;
          }

          .pagination-container {
            padding: 0.75rem 0.5rem;
            flex-direction: column;
            gap: 0.625rem;
          }

          .pagination-btn {
            width: 100%;
            padding: 0.625rem;
            font-size: 0.75rem;
          }

          .pagination-pages {
            gap: 0.25rem;
          }

          .pagination-page {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }

          .details-modal {
            width: 98%;
            max-height: 95vh;
            border-radius: 12px;
          }

          .details-modal-header {
            padding: 0.875rem;
            gap: 0.5rem;
          }

          .class-badge-large {
            padding: 0.375rem 0.5rem;
            gap: 0.25rem;
          }

          .grade-text {
            font-size: 1.125rem;
          }

          .section-text {
            font-size: 1.125rem;
          }

          .details-modal-header .class-title-main {
            font-size: 0.875rem;
          }

          .details-modal-header .class-subtitle {
            font-size: 0.75rem;
          }

          .modal-close-btn {
            width: 28px;
            height: 28px;
            font-size: 0.875rem;
          }

          .details-modal-body {
            padding: 0.875rem;
          }

          .info-section {
            padding: 0.875rem;
            margin-bottom: 0.875rem;
          }

          .section-icon-inline {
            font-size: 1.125rem;
          }

          .section-title-inline {
            font-size: 0.875rem;
          }

          .info-grid-detailed {
            grid-template-columns: 1fr;
            gap: 0.625rem;
          }

          .info-card-detailed {
            padding: 0.75rem;
            gap: 0.625rem;
          }

          .info-card-icon {
            width: 34px;
            height: 34px;
            font-size: 1.125rem;
          }

          .info-card-label {
            font-size: 0.625rem;
          }

          .info-card-value {
            font-size: 0.8125rem;
          }

          .students-grid-modal {
            grid-template-columns: 1fr;
            gap: 0.625rem;
          }

          .student-card-modal {
            padding: 0.625rem;
            gap: 0.625rem;
          }

          .student-card-number {
            width: 22px;
            height: 22px;
            font-size: 0.625rem;
          }

          .student-card-avatar {
            width: 34px;
            height: 34px;
            font-size: 0.75rem;
          }

          .student-card-name {
            font-size: 0.75rem;
          }

          .student-card-phone,
          .student-card-id {
            font-size: 0.625rem;
          }

          /* Empty state mobile specific */
          .empty-students-state {
            padding: 1.5rem 1rem;
            border-width: 1px;
          }

          .empty-students-icon {
            font-size: 2.5rem;
            margin-bottom: 0.625rem;
          }

          .empty-students-text {
            font-size: 0.75rem;
            line-height: 1.4;
          }

          /* Section badge mobile */
          .section-badge-count {
            font-size: 0.625rem;
            padding: 0.25rem 0.625rem;
          }

          /* Scrollbar mobile */
          .details-modal-body::-webkit-scrollbar {
            width: 4px;
          }

          /* Info card mobile - no hover effect */
          .info-card-detailed:hover {
            transform: none;
            box-shadow: none;
          }

          /* Student card mobile - no hover effect */
          .student-card-modal:hover {
            transform: none;
            box-shadow: none;
          }

          .details-modal-footer {
            padding: 0.875rem;
            flex-direction: column-reverse;
            gap: 0.5rem;
          }

          .modal-btn-footer {
            width: 100%;
            padding: 0.625rem 0.875rem;
            font-size: 0.8125rem;
            justify-content: center;
          }

          .modal-btn-footer span:first-child {
            font-size: 1rem;
          }

          .delete-modal {
            width: 96%;
            border-radius: 14px;
          }

          .delete-modal-body {
            padding: 1.25rem;
          }

          .delete-modal-footer {
            padding: 1rem;
            flex-direction: column-reverse;
            gap: 0.625rem;
          }

          .modal-btn {
            width: 100%;
            padding: 0.75rem;
            font-size: 0.8125rem;
          }
        }

        /* ==================== TABLET (481px - 768px) - KOMPAKT ==================== */
        @media (min-width: 481px) and (max-width: 768px) {
          .class-management {
            padding: 0.875rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
            margin-bottom: 0.875rem;
          }

          .stat-card {
            padding: 0.5rem 0.625rem;
            gap: 0.5rem;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 0.9375rem;
          }

          .stat-value {
            font-size: 1rem;
          }

          .stat-label {
            font-size: 0.5625rem;
          }

          .filter-card {
            padding: 0.625rem;
            flex-direction: column;
            gap: 0.5rem;
          }

          .filter-left {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .filter-item {
            flex: 1;
            min-width: 120px;
          }

          .filter-item:first-child {
            flex: 2;
            min-width: 150px;
          }

          .filter-label {
            font-size: 0.625rem;
          }

          .search-input,
          .filter-select {
            padding: 0.5rem 0.625rem;
            font-size: 0.75rem;
          }

          .btn-add-compact {
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            justify-content: center;
          }

          .add-icon {
            font-size: 0.875rem;
          }

          .classes-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.625rem;
          }

          .class-card {
            padding: 0.625rem;
          }

          .class-badge {
            padding: 0.625rem 0.875rem;
          }

          .grade-text {
            font-size: 1.5rem;
          }

          .section-text {
            font-size: 0.875rem;
          }

          .class-title {
            font-size: 1rem;
            margin: 0.75rem 0 0.625rem;
          }

          .class-info-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.625rem;
            margin: 0.75rem 0;
          }

          .class-info-item {
            padding: 0.5rem 0.625rem;
            font-size: 0.75rem;
          }

          .info-icon {
            font-size: 1rem;
          }

          .info-value {
            font-size: 0.875rem;
          }

          .info-label {
            font-size: 0.6875rem;
          }

          .class-footer {
            padding: 0.625rem 0.75rem;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.375rem;
          }

          .class-action-btn {
            padding: 0.5rem 0.375rem;
            font-size: 0.6875rem;
            gap: 0.25rem;
          }

          .class-action-btn span:first-child {
            font-size: 1rem;
          }

          .pagination-container {
            padding: 1rem 1.25rem;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 1rem;
            justify-content: space-between;
          }

          .pagination-btn {
            padding: 0.75rem 1.25rem;
            font-size: 0.875rem;
          }

          .pagination-pages {
            gap: 0.5rem;
          }

          .pagination-page {
            width: 40px;
            height: 40px;
            font-size: 0.875rem;
          }

          .details-modal {
            width: 96%;
            max-width: 700px;
            max-height: 92vh;
            border-radius: 18px;
          }

          .details-modal-header {
            padding: 1.375rem 1.5rem;
            gap: 0.875rem;
          }

          .class-badge-large {
            padding: 0.75rem 1rem;
          }

          .grade-text {
            font-size: 1.875rem;
          }

          .section-text {
            font-size: 1rem;
          }

          .details-modal-header .class-title-main {
            font-size: 1.375rem;
          }

          .details-modal-header .class-subtitle {
            font-size: 0.9375rem;
          }

          .modal-close-btn {
            width: 36px;
            height: 36px;
            font-size: 1.25rem;
          }

          .details-modal-body {
            padding: 1.25rem 1.375rem;
          }

          .info-section {
            padding: 1.125rem 1.25rem;
            margin-bottom: 1.125rem;
          }

          .section-icon-inline {
            font-size: 1.375rem;
          }

          .section-title-inline {
            font-size: 1rem;
          }

          .info-grid-detailed {
            grid-template-columns: 1fr;
            gap: 0.875rem;
          }

          .info-card-detailed {
            padding: 0.875rem 1rem;
            gap: 0.75rem;
          }

          .info-card-icon {
            width: 42px;
            height: 42px;
            font-size: 1.375rem;
          }

          .info-card-label {
            font-size: 0.75rem;
          }

          .info-card-value {
            font-size: 0.9375rem;
          }

          .students-grid-modal {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.875rem;
          }

          .student-card-modal {
            padding: 0.75rem 0.875rem;
            gap: 0.75rem;
          }

          .student-card-number {
            width: 26px;
            height: 26px;
            font-size: 0.75rem;
          }

          .student-card-avatar {
            width: 40px;
            height: 40px;
            font-size: 0.875rem;
          }

          .student-card-name {
            font-size: 0.875rem;
          }

          .student-card-phone,
          .student-card-id {
            font-size: 0.75rem;
          }

          /* Empty state tablet specific */
          .empty-students-state {
            padding: 2rem 1.5rem;
          }

          .empty-students-icon {
            font-size: 3rem;
            margin-bottom: 0.75rem;
          }

          .empty-students-text {
            font-size: 0.875rem;
            line-height: 1.5;
          }

          /* Section badge tablet */
          .section-badge-count {
            font-size: 0.75rem;
            padding: 0.3125rem 0.75rem;
          }

          /* Scrollbar tablet */
          .details-modal-body::-webkit-scrollbar {
            width: 6px;
          }

          /* Light hover effects for tablet */
          .info-card-detailed:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
          }

          .student-card-modal:hover {
            transform: translateX(2px);
            box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
          }

          .details-modal-footer {
            padding: 1.125rem 1.25rem;
            flex-direction: row;
            gap: 0.875rem;
          }

          .modal-btn-footer {
            flex: 1;
            padding: 0.75rem 1.125rem;
            font-size: 0.9375rem;
          }

          .modal-btn-footer:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .modal-btn-footer span:first-child {
            font-size: 1.125rem;
          }

          .delete-modal {
            width: 94%;
            max-width: 600px;
            border-radius: 16px;
          }

          .delete-modal-header {
            padding: 1.25rem 1.5rem;
          }

          .delete-modal-body {
            padding: 1.375rem 1.5rem;
          }

          .delete-modal-footer {
            padding: 1.125rem 1.25rem;
            flex-direction: row;
            gap: 0.875rem;
          }

          .modal-btn {
            flex: 1;
            padding: 0.875rem 1.25rem;
            font-size: 0.9375rem;
          }
        }

        /* ==================== SMALL DESKTOP / LAPTOP (769px - 1024px) - KOMPAKT ==================== */
        @media (min-width: 769px) and (max-width: 1024px) {
          .class-management {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .stat-card {
            padding: 0.5rem 0.625rem;
            gap: 0.5rem;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 0.9375rem;
          }

          .stat-value {
            font-size: 1.125rem;
          }

          .stat-label {
            font-size: 0.5625rem;
          }

          .filter-card {
            padding: 0.625rem;
            flex-direction: row;
            gap: 0.625rem;
          }

          .filter-left {
            flex: 1;
            flex-direction: row;
            gap: 0.5rem;
          }

          .filter-item:first-child {
            flex: 1;
            min-width: 180px;
          }

          .filter-label {
            font-size: 0.625rem;
          }

          .search-input,
          .filter-select {
            padding: 0.4375rem 0.625rem;
            font-size: 0.75rem;
          }

          .btn-add-compact {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
          }

          .add-icon {
            font-size: 0.875rem;
          }

          .classes-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
          }

          .class-card {
            padding: 0.625rem;
          }

          .class-badge {
            padding: 0.75rem 1rem;
          }

          .grade-text {
            font-size: 1.75rem;
          }

          .section-text {
            font-size: 0.9375rem;
          }

          .class-title {
            font-size: 1.125rem;
            margin: 0.875rem 0 0.75rem;
          }

          .class-info-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            margin: 0.875rem 0;
          }

          .class-info-item {
            padding: 0.625rem 0.75rem;
            font-size: 0.8125rem;
          }

          .info-icon {
            font-size: 1.125rem;
          }

          .info-value {
            font-size: 0.9375rem;
          }

          .info-label {
            font-size: 0.75rem;
          }

          .class-footer {
            padding: 0.75rem 0.875rem;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
          }

          .class-action-btn {
            padding: 0.5rem 0.625rem;
            font-size: 0.75rem;
            gap: 0.25rem;
          }

          .class-action-btn span:first-child {
            font-size: 1.125rem;
          }

          .pagination-container {
            padding: 1.125rem 1.375rem;
            gap: 1.125rem;
          }

          .pagination-btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.9375rem;
          }

          .pagination-pages {
            gap: 0.625rem;
          }

          .pagination-page {
            width: 42px;
            height: 42px;
            font-size: 0.9375rem;
          }

          .details-modal {
            width: 94%;
            max-width: 900px;
            max-height: 90vh;
            border-radius: 20px;
          }

          .details-modal-header {
            padding: 1.5rem 1.75rem;
            gap: 1rem;
          }

          .class-badge-large {
            padding: 0.875rem 1.125rem;
          }

          .grade-text {
            font-size: 2.125rem;
          }

          .section-text {
            font-size: 1.0625rem;
          }

          .details-modal-header .class-title-main {
            font-size: 1.5rem;
          }

          .details-modal-header .class-subtitle {
            font-size: 1rem;
          }

          .modal-close-btn {
            width: 38px;
            height: 38px;
            font-size: 1.375rem;
          }

          .details-modal-body {
            padding: 1.375rem 1.5rem;
          }

          .info-section {
            padding: 1.25rem 1.375rem;
            margin-bottom: 1.25rem;
          }

          .section-icon-inline {
            font-size: 1.5rem;
          }

          .section-title-inline {
            font-size: 1.125rem;
          }

          .info-grid-detailed {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .info-card-detailed {
            padding: 1rem 1.125rem;
            gap: 0.875rem;
          }

          .info-card-icon {
            width: 46px;
            height: 46px;
            font-size: 1.5rem;
          }

          .info-card-label {
            font-size: 0.75rem;
          }

          .info-card-value {
            font-size: 1rem;
          }

          .students-grid-modal {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .student-card-modal {
            padding: 0.875rem 1rem;
            gap: 0.875rem;
          }

          .student-card-number {
            width: 28px;
            height: 28px;
            font-size: 0.8125rem;
          }

          .student-card-avatar {
            width: 42px;
            height: 42px;
            font-size: 0.9375rem;
          }

          .student-card-name {
            font-size: 0.9375rem;
          }

          .student-card-phone,
          .student-card-id {
            font-size: 0.8125rem;
          }

          /* Empty state small desktop */
          .empty-students-state {
            padding: 2.5rem 1.75rem;
          }

          .empty-students-icon {
            font-size: 3.5rem;
            margin-bottom: 0.875rem;
            animation: float 3s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          .empty-students-text {
            font-size: 0.9375rem;
            line-height: 1.6;
          }

          /* Section badge small desktop */
          .section-badge-count {
            font-size: 0.8125rem;
            padding: 0.3125rem 0.875rem;
          }

          /* Scrollbar small desktop */
          .details-modal-body::-webkit-scrollbar {
            width: 7px;
          }

          /* Enhanced hover effects */
          .info-card-detailed {
            cursor: pointer;
          }

          .info-card-detailed:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
          }

          .student-card-modal {
            cursor: pointer;
          }

          .student-card-modal:hover {
            transform: translateX(4px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.18);
          }

          .details-modal-footer {
            padding: 1.25rem 1.375rem;
            gap: 1rem;
          }

          .modal-btn-footer {
            padding: 0.875rem 1.375rem;
            font-size: 0.9375rem;
            transition: all 0.3s ease;
          }

          .modal-btn-footer:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
          }

          .modal-btn-footer span:first-child {
            font-size: 1.25rem;
          }

          .delete-modal {
            width: 92%;
            max-width: 650px;
            border-radius: 18px;
          }

          .delete-modal-header {
            padding: 1.375rem 1.625rem;
          }

          .delete-modal-body {
            padding: 1.5rem 1.625rem;
          }

          .delete-modal-footer {
            padding: 1.25rem 1.375rem;
            gap: 1rem;
          }

          .modal-btn {
            padding: 0.875rem 1.375rem;
            font-size: 0.9375rem;
          }
        }

        /* ==================== LARGE DESKTOP (1025px and above) - KOMPAKT ==================== */
        @media (min-width: 1025px) {
          .class-management {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .stat-card {
            padding: 0.625rem 0.75rem;
            gap: 0.5rem;
          }

          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.1);
          }

          .stat-icon {
            width: 32px;
            height: 32px;
            font-size: 1.125rem;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .stat-label {
            font-size: 0.625rem;
          }

          .filter-card {
            padding: 0.75rem;
            gap: 0.75rem;
          }

          .filter-left {
            flex: 1;
            gap: 0.75rem;
          }

          .filter-item:first-child {
            flex: 1;
            min-width: 200px;
          }

          .filter-label {
            font-size: 0.6875rem;
          }

          .search-input,
          .filter-select {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
          }

          .btn-add-compact {
            padding: 0.5rem 0.875rem;
            font-size: 0.75rem;
          }

          .btn-add-compact:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25);
          }

          .add-icon {
            font-size: 0.875rem;
          }

          .classes-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 0.75rem;
          }

          .class-card {
            padding: 0.75rem;
          }

          .class-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.12);
          }

          .class-badge {
            padding: 0.875rem 1.125rem;
          }

          .grade-text {
            font-size: 2rem;
          }

          .section-text {
            font-size: 1rem;
          }

          .class-title {
            font-size: 1.25rem;
            margin: 1rem 0 0.875rem;
          }

          .class-info-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.875rem;
            margin: 1rem 0;
          }

          .class-info-item {
            padding: 0.75rem 0.875rem;
            font-size: 0.875rem;
          }

          .class-info-item:hover {
            transform: translateY(-2px);
          }

          .info-icon {
            font-size: 1.25rem;
          }

          .info-value {
            font-size: 1rem;
          }

          .info-label {
            font-size: 0.75rem;
          }

          .class-footer {
            padding: 0.875rem 1rem;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.625rem;
          }

          .class-action-btn {
            padding: 0.625rem 0.75rem;
            font-size: 0.8125rem;
            gap: 0.375rem;
          }

          .class-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .class-action-btn span:first-child {
            font-size: 1.25rem;
          }

          .pagination-container {
            padding: 1.25rem 1.5rem;
            gap: 1.25rem;
          }

          .pagination-btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.9375rem;
          }

          .pagination-btn:hover {
            transform: translateX(4px);
          }

          .pagination-pages {
            gap: 0.625rem;
          }

          .pagination-page {
            width: 44px;
            height: 44px;
            font-size: 0.9375rem;
          }

          .pagination-page:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }

          .details-modal {
            width: 92%;
            max-width: 1100px;
            max-height: 90vh;
            border-radius: 22px;
          }

          .details-modal-header {
            padding: 1.75rem 2rem;
            gap: 1.25rem;
          }

          .class-badge-large {
            padding: 1rem 1.375rem;
          }

          .grade-text {
            font-size: 2.375rem;
          }

          .section-text {
            font-size: 1.125rem;
          }

          .details-modal-header .class-title-main {
            font-size: 1.75rem;
          }

          .details-modal-header .class-subtitle {
            font-size: 1.0625rem;
          }

          .modal-close-btn {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .modal-close-btn:hover {
            transform: rotate(90deg) scale(1.1);
          }

          .details-modal-body {
            padding: 1.5rem 2rem;
          }

          .info-section {
            padding: 1.375rem 1.5rem;
            margin-bottom: 1.375rem;
          }

          .section-icon-inline {
            font-size: 1.625rem;
          }

          .section-title-inline {
            font-size: 1.25rem;
          }

          .info-grid-detailed {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.125rem;
          }

          .info-card-detailed {
            padding: 1.125rem 1.25rem;
            gap: 1rem;
          }

          .info-card-detailed:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(30, 58, 138, 0.12);
          }

          .info-card-icon {
            width: 50px;
            height: 50px;
            font-size: 1.625rem;
          }

          .info-card-label {
            font-size: 0.8125rem;
          }

          .info-card-value {
            font-size: 1.0625rem;
          }

          .students-grid-modal {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.125rem;
          }

          .student-card-modal {
            padding: 1rem 1.125rem;
            gap: 1rem;
          }

          .student-card-modal:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(30, 58, 138, 0.12);
          }

          .student-card-number {
            width: 30px;
            height: 30px;
            font-size: 0.875rem;
          }

          .student-card-avatar {
            width: 44px;
            height: 44px;
            font-size: 1rem;
          }

          .student-card-name {
            font-size: 1rem;
          }

          .student-card-phone,
          .student-card-id {
            font-size: 0.8125rem;
          }

          /* Empty state large desktop - premium */
          .empty-students-state {
            padding: 3.5rem 2.5rem;
            position: relative;
            overflow: hidden;
          }

          .empty-students-state::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
          }

          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .empty-students-icon {
            font-size: 4.5rem;
            margin-bottom: 1rem;
            animation: float 3s ease-in-out infinite;
            position: relative;
            z-index: 1;
          }

          .empty-students-text {
            font-size: 1.0625rem;
            line-height: 1.7;
            position: relative;
            z-index: 1;
          }

          /* Section badge large desktop - premium */
          .section-badge-count {
            font-size: 0.875rem;
            padding: 0.375rem 1rem;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
            transition: all 0.3s ease;
          }

          .section-badge-count:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.45);
          }

          /* Scrollbar large desktop - premium */
          .details-modal-body::-webkit-scrollbar {
            width: 10px;
          }

          .details-modal-body::-webkit-scrollbar-track {
            background: #e2e8f0;
            border-radius: 10px;
          }

          .details-modal-body::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            border-radius: 10px;
            border: 2px solid #e2e8f0;
          }

          .details-modal-body::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
          }

          /* Premium hover effects */
          .info-card-detailed {
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }

          .info-card-detailed::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
            transition: left 0.5s ease;
          }

          .info-card-detailed:hover::before {
            left: 100%;
          }

          .info-card-detailed:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
            border-color: #2563eb;
          }

          .student-card-modal {
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }

          .student-card-modal::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
            transition: left 0.5s ease;
          }

          .student-card-modal:hover::before {
            left: 100%;
          }

          .student-card-modal:hover {
            transform: translateX(6px) scale(1.02);
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.25);
            border-color: #8b5cf6;
          }

          .details-modal-footer {
            padding: 1.375rem 1.5rem;
            gap: 1.125rem;
          }

          .modal-btn-footer {
            padding: 0.875rem 1.5rem;
            font-size: 0.9375rem;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .modal-btn-footer::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s ease, height 0.6s ease;
          }

          .modal-btn-footer:hover::before {
            width: 300px;
            height: 300px;
          }

          .modal-btn-footer:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          }

          .modal-btn-footer:active {
            transform: translateY(-1px) scale(0.98);
          }

          .modal-btn-footer span:first-child {
            font-size: 1.375rem;
          }

          .delete-modal {
            width: 90%;
            max-width: 700px;
            border-radius: 20px;
          }

          .delete-modal-header {
            padding: 1.5rem 1.75rem;
          }

          .delete-modal-body {
            padding: 1.75rem;
          }

          .delete-modal-footer {
            padding: 1.375rem 1.5rem;
            gap: 1.125rem;
          }

          .modal-btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.9375rem;
          }

          .modal-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
          }
        }

        /* Extra Large Desktop (1440px and above) - Enhanced spacing */
        @media (min-width: 1440px) {
          .details-modal {
            max-width: 1300px;
          }

          .classes-grid {
            grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
            gap: 1.75rem;
          }

          .students-grid-modal {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.25rem;
          }

          .details-modal-header {
            padding: 2rem 2.25rem;
          }

          .details-modal-header .class-title-main {
            font-size: 2rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .details-modal-header .class-subtitle {
            font-size: 1.125rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .details-modal-header .modal-close-btn {
            width: 42px;
            height: 42px;
            font-size: 1.5rem;
            flex-shrink: 0;
          }

          .details-modal-body {
            padding: 2rem;
          }

          .info-section {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .section-icon-inline {
            font-size: 1.75rem;
          }

          .section-title-inline {
            font-size: 1.375rem;
          }

          .section-badge-count {
            font-size: 0.9375rem;
            padding: 0.375rem 1rem;
          }

          .info-grid-detailed {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.25rem;
          }

          .info-card-detailed {
            padding: 1.25rem;
            gap: 1rem;
          }

          .info-card-icon {
            width: 52px;
            height: 52px;
            font-size: 1.75rem;
          }

          .info-card-label {
            font-size: 0.8125rem;
          }

          .info-card-value {
            font-size: 1.125rem;
          }

          .students-section {
            padding: 1.5rem;
          }

          .students-grid-modal {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.125rem;
          }

          .student-card-modal {
            padding: 1rem;
            gap: 1rem;
          }

          .student-card-number {
            width: 32px;
            height: 32px;
            font-size: 0.875rem;
          }

          .student-card-avatar {
            width: 48px;
            height: 48px;
            font-size: 1rem;
          }

          .student-card-name {
            font-size: 1rem;
          }

          .student-card-phone {
            font-size: 0.875rem;
          }

          .student-card-id {
            font-size: 0.75rem;
          }

          .empty-students-state {
            padding: 3.5rem 2rem;
          }

          .empty-students-icon {
            font-size: 4.5rem;
          }

          .empty-students-text {
            font-size: 1.125rem;
          }

          .details-modal-footer {
            padding: 1.5rem 2rem;
            gap: 1rem;
          }

          .modal-btn-footer {
            padding: 1rem 1.5rem;
            font-size: 1rem;
          }

          .modal-btn-footer span:first-child {
            font-size: 1.375rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ClassManagement;
