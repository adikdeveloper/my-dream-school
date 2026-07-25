import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import SubjectProfile from './SubjectProfile';

const SubjectManagement = () => {
  const { setLoading, setError } = useData();
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMode, setProfileMode] = useState('view');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSubjects();
      setSubjects(response || []);
    } catch (error) {
      setError(error.response?.data?.message || 'Fanlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch =
      subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'active') return matchesSearch && subject.isActive;
    if (filter === 'inactive') return matchesSearch && !subject.isActive;

    return matchesSearch;
  });

  const handleViewSubject = (subject) => {
    setSelectedSubject(subject);
    setProfileMode('view');
    setShowProfileModal(true);
  };

  const handleEditSubject = (subject) => {
    setSelectedSubject(subject);
    setProfileMode('edit');
    setShowProfileModal(true);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setSelectedSubject(null);
  };

  const handleAddSubject = () => {
    setSelectedSubject(null);
    setProfileMode('add');
    setShowProfileModal(true);
  };

  const handleUpdateSubject = (message) => {
    loadSubjects();
    if (message) {
      setSuccessMessage(message);
    }
  };

  const handleDeleteSubject = (subject) => {
    setSubjectToDelete(subject);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;

    try {
      setLoading(true);
      const response = await apiService.deleteSubject(subjectToDelete._id);
      setShowDeleteModal(false);
      setSubjectToDelete(null);
      setSuccessMessage(response.message || 'Fan muvaffaqiyatli o\'chirildi');
      loadSubjects();
    } catch (error) {
      setError(error.response?.data?.message || 'Fanni o\'chirishda xatolik');
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSubjectToDelete(null);
  };

  return (
    <div className="subject-management">
      {/* Success Notification */}
      {successMessage && (
        <div className="success-notification">
          <span className="success-icon">✓</span>
          <span className="success-text">{successMessage}</span>
          <button
            className="success-close"
            onClick={() => setSuccessMessage('')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-value">{subjects.length}</div>
            <div className="stat-label">Jami fanlar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{subjects.filter(s => s.isActive).length}</div>
            <div className="stat-label">Faol fanlar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-inactive">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <div className="stat-value">{subjects.filter(s => !s.isActive).length}</div>
            <div className="stat-label">Nofaol fanlar</div>
          </div>
          <div className="stat-decoration"></div>
        </div>

        <div className="stat-card stat-credits">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">
              {subjects.reduce((sum, s) => sum + (parseInt(s.credits) || 0), 0)}
            </div>
            <div className="stat-label">Jami kredit soat</div>
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
                  placeholder="Fan nomi, kodi..."
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
              <span className="results-count">{filteredSubjects.length}</span>
              <span className="results-label">ta natija</span>
            </div>
          </div>

          <button className="btn-add-compact" onClick={handleAddSubject}>
            <span className="add-icon">➕</span>
            <span className="add-text">Yangi fan</span>
          </button>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="subjects-container">
        {filteredSubjects.length > 0 ? (
          <div className="subjects-grid">
            {filteredSubjects.map((subject) => (
              <div key={subject._id} className={`subject-card ${!subject.isActive ? 'subject-inactive' : ''}`}>
                <div className="subject-header" style={{
                  background: subject.color || '#3b82f6'
                }}>
                  <div className="subject-icon-large">📚</div>
                  <div className={`status-dot ${subject.isActive ? 'active' : 'inactive'}`}></div>
                </div>

                <div className="subject-body">
                  <h3 className="subject-name">{subject.name}</h3>
                  <div className="subject-code-badge">{subject.code}</div>

                  <div className="subject-info-grid">
                    {subject.credits && (
                      <div className="info-row">
                        <span className="info-icon">⏱️</span>
                        <span className="info-text">{subject.credits} kredit soat</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="subject-footer">
                  <button
                    className="subject-action-btn view"
                    onClick={() => handleViewSubject(subject)}
                  >
                    <span>👁️</span>
                    <span>Ko'rish</span>
                  </button>
                  <button
                    className="subject-action-btn edit"
                    onClick={() => handleEditSubject(subject)}
                  >
                    <span>✏️</span>
                    <span>Tahrirlash</span>
                  </button>
                  <button
                    className="subject-action-btn delete"
                    onClick={() => handleDeleteSubject(subject)}
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
            <h3 className="empty-title">Fanlar topilmadi</h3>
            <p className="empty-text">
              Qidiruv kriteriyalaringizga mos fanlar mavjud emas.
              Boshqa parametrlar bilan qidiring yoki yangi fan qo'shing.
            </p>
          </div>
        )}
      </div>

      {/* Subject Profile Modal */}
      <SubjectProfile
        subject={selectedSubject}
        isOpen={showProfileModal}
        onClose={handleCloseProfile}
        onUpdate={handleUpdateSubject}
        mode={profileMode}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-icon-wrapper">
                <span className="delete-icon">⚠️</span>
              </div>
              <h2 className="delete-title">Fanni o'chirish</h2>
              <p className="delete-subtitle">Bu amalni qaytarib bo'lmaydi!</p>
            </div>

            {subjectToDelete && (
              <div className="delete-modal-body">
                <div className="subject-info-card">
                  <div className="subject-info-icon" style={{ background: subjectToDelete.color || '#3b82f6' }}>
                    📚
                  </div>
                  <div className="subject-info-details">
                    <h3 className="subject-info-name">{subjectToDelete.name}</h3>
                    <p className="subject-info-meta">
                      Kod: {subjectToDelete.code}
                      {subjectToDelete.credits && ` • ${subjectToDelete.credits} kredit soat`}
                    </p>
                  </div>
                </div>
                <p className="delete-warning">
                  Ushbu fanni o'chirishga ishonchingiz komilmi?
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
        .subject-management {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ==================== SUCCESS NOTIFICATION ==================== */
        .success-notification {
          position: fixed;
          top: 100px;
          right: 2rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 1000;
          animation: slideInRight 0.3s ease-out;
          min-width: 300px;
          max-width: 500px;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .success-icon {
          font-size: 1.5rem;
          font-weight: 700;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .success-text {
          flex: 1;
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .success-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .success-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
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
        .stat-credits .stat-decoration { background: #8b5cf6; }

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
        .stat-credits .stat-icon { background: #ede9fe; }

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

        /* ==================== SUBJECTS GRID ==================== */
        .subjects-container {
        }

        .subjects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.75rem;
        }

        .subject-card {
          background: white;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .subject-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .subject-card.subject-inactive {
          opacity: 0.6;
          background: #fafafa;
        }

        .subject-header {
          padding: 1rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px 10px 0 0;
        }

        .subject-icon-large {
          font-size: 2rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
        }

        .status-dot {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
        }

        .status-dot.active {
          background: #10b981;
        }

        .status-dot.inactive {
          background: #ef4444;
        }

        .subject-body {
          padding: 0.75rem;
          flex: 1;
        }

        .subject-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.375rem;
          text-align: center;
        }

        .subject-code-badge {
          display: block;
          text-align: center;
          padding: 0.125rem 0.375rem;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          font-family: monospace;
          margin-bottom: 0.5rem;
        }

        .subject-info-grid {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .info-row.description {
          background: #f8fafc;
          padding: 0.375rem;
          border-radius: 4px;
        }

        .info-icon {
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .info-text {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 500;
          line-height: 1.4;
        }

        .subject-footer {
          padding: 0.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.375rem;
        }

        .subject-action-btn {
          padding: 0.375rem;
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

        .subject-action-btn span:first-child {
          font-size: 0.875rem;
        }

        .subject-action-btn.view {
          background: #dbeafe;
          color: #1e40af;
        }

        .subject-action-btn.view:hover {
          background: #3b82f6;
          color: white;
        }

        .subject-action-btn.edit {
          background: #fef3c7;
          color: #92400e;
        }

        .subject-action-btn.edit:hover {
          background: #f59e0b;
          color: white;
        }

        .subject-action-btn.delete {
          background: #fee2e2;
          color: #991b1b;
        }

        .subject-action-btn.delete:hover {
          background: #ef4444;
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
          backdrop-filter: blur(2px);
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

        .subject-info-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 8px;
          margin-bottom: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .subject-info-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          flex-shrink: 0;
        }

        .subject-info-details {
          flex: 1;
        }

        .subject-info-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.125rem 0;
        }

        .subject-info-meta {
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

        /* ==================== RESPONSIVE STYLES ==================== */

        /* Laptop - 1024px - 1919px */

        /* ============================================
           RESPONSIVE DESIGN - MOBILE FIRST APPROACH
           4 Breakpoints with Premium Features
           ============================================ */

        /* Mobile - Up to 480px (Touch-optimized, no hover) */
        @media (max-width: 480px) {
          .subject-management {
            padding: 0.5rem;
          }

          /* Stats Grid - 2 columns on mobile */
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.375rem;
            margin-bottom: 0.75rem;
          }

          .stat-card {
            padding: 0.5rem;
            gap: 0.375rem;
            flex-direction: column;
            align-items: center;
            text-align: center;
            border-radius: 6px;
          }

          .stat-card:hover {
            transform: none;
            box-shadow: none;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 1rem;
          }

          .stat-value {
            font-size: 1rem;
            margin-bottom: 0.125rem;
          }

          .stat-label {
            font-size: 0.5rem;
          }

          /* Filters - Full width stacked */
          .filter-card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding: 0.5rem;
          }

          .filter-left {
            flex-direction: column;
            width: 100%;
            gap: 0.375rem;
          }

          .filter-item {
            width: 100%;
          }

          .filter-label {
            font-size: 0.625rem;
          }

          .search-input,
          .filter-select {
            padding: 0.5rem;
            font-size: 0.75rem;
          }

          .filter-results {
            width: 100%;
            flex-direction: row;
            justify-content: center;
            gap: 0.25rem;
            padding: 0.375rem;
          }

          .results-count {
            font-size: 1rem;
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

          /* Subjects Grid - Single column */
          .subjects-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .subject-card {
            border-radius: 8px;
          }

          .subject-card:hover {
            transform: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .subject-header {
            padding: 0.75rem;
          }

          .subject-icon-large {
            font-size: 1.5rem;
          }

          .subject-body {
            padding: 0.5rem;
          }

          .subject-name {
            font-size: 0.8125rem;
          }

          .subject-footer {
            padding: 0.375rem;
            gap: 0.25rem;
          }

          .subject-action-btn {
            padding: 0.375rem 0.25rem;
            font-size: 0.5rem;
          }

          .subject-action-btn:hover {
            transform: none;
          }

          /* Modals - Compact on mobile */
          .delete-modal {
            width: 95%;
            border-radius: 10px;
          }

          .delete-modal-header {
            padding: 1rem 0.875rem 0.75rem;
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

          .subject-info-card {
            padding: 0.625rem;
            gap: 0.5rem;
          }

          .subject-info-icon {
            width: 32px;
            height: 32px;
            font-size: 1rem;
          }

          .subject-info-name {
            font-size: 0.75rem;
          }

          .subject-info-meta {
            font-size: 0.5625rem;
          }

          .delete-warning {
            font-size: 0.625rem;
            padding: 0.5rem;
          }

          .delete-modal-footer {
            flex-direction: column-reverse;
            gap: 0.375rem;
            padding: 0.75rem;
          }

          .modal-btn {
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.6875rem;
          }

          .modal-btn:hover {
            transform: none;
          }

          .success-notification {
            right: 0.5rem;
            left: 0.5rem;
            min-width: auto;
            max-width: none;
            top: 70px;
            padding: 0.625rem 0.875rem;
            border-radius: 8px;
          }

          .success-text {
            font-size: 0.75rem;
          }
        }

        /* Tablet - 481px to 768px (Light hover effects) */
        @media (min-width: 481px) and (max-width: 768px) {
          .subject-management {
            padding: 1rem;
          }

          /* Stats Grid - 2 columns */
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            margin-bottom: 1.5rem;
          }

          .stat-card {
            padding: 0.875rem;
            gap: 0.75rem;
            transition: all 0.2s ease;
          }

          /* Light hover effect */
          .stat-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
          }

          .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .stat-value {
            font-size: 1.375rem;
            margin-bottom: 0.375rem;
          }

          .stat-label {
            font-size: 0.6875rem;
          }

          /* Filters - Stacked */
          .filter-card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.875rem;
            padding: 1rem;
          }

          .filter-left {
            flex-direction: column;
            width: 100%;
            gap: 0.75rem;
          }

          .filter-item {
            width: 100%;
          }

          .filter-label {
            font-size: 0.8125rem;
          }

          .search-input,
          .filter-select {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
          }

          .filter-results {
            width: 100%;
            flex-direction: row;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.625rem;
          }

          .results-count {
            font-size: 1.5rem;
          }

          .results-label {
            font-size: 0.8125rem;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
            padding: 0.875rem 1.5rem;
            font-size: 0.9375rem;
            transition: all 0.2s ease;
          }

          .btn-add-compact:hover {
            transform: translateY(-1px);
          }

          /* Subjects Grid - 2 columns */
          .subjects-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .subject-card {
            transition: all 0.2s ease;
          }

          /* Light hover */
          .subject-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
          }

          .subject-action-btn {
            transition: all 0.2s ease;
          }

          .subject-action-btn:hover {
            transform: translateX(2px);
            background: rgba(59, 130, 246, 0.12);
          }

          /* Modals */
          .delete-modal {
            width: 92%;
          }

          .delete-modal-body {
            padding: 1.5rem;
            /* Medium scrollbar */
            scrollbar-width: auto;
          }

          .delete-modal-body::-webkit-scrollbar {
            width: 6px;
          }

          .delete-modal-body::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.4);
            border-radius: 3px;
          }

          .delete-modal-footer {
            flex-direction: column-reverse;
            gap: 0.75rem;
          }

          .modal-btn {
            width: 100%;
            padding: 0.875rem 1.25rem;
            transition: all 0.2s ease;
          }

          .modal-btn:hover {
            transform: translateY(-1px);
          }
        }

        /* ==================== RESPONSIVE: NOUTBUK (769px - 1024px) - kompakt qoladi ==================== */
        @media (min-width: 769px) and (max-width: 1024px) {
          .subject-management {
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

          /* Subjects Grid - 3 columns compact */
          .subjects-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
          }

          .subject-card {
            border-radius: 8px;
          }

          .subject-header {
            padding: 0.75rem;
          }

          .subject-icon-large {
            font-size: 1.5rem;
          }

          .subject-body {
            padding: 0.5rem;
          }

          .subject-name {
            font-size: 0.75rem;
          }

          .subject-code-badge {
            font-size: 0.5625rem;
            padding: 0.125rem 0.25rem;
          }

          .subject-footer {
            padding: 0.375rem;
            gap: 0.25rem;
          }

          .subject-action-btn {
            padding: 0.25rem;
            font-size: 0.5rem;
            border-radius: 4px;
          }

          .subject-action-btn span:first-child {
            font-size: 0.75rem;
          }

          /* Empty state */
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
            max-width: 340px;
            border-radius: 10px;
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

          .subject-info-card {
            padding: 0.625rem;
            gap: 0.5rem;
            border-radius: 8px;
          }

          .subject-info-icon {
            width: 36px;
            height: 36px;
            font-size: 1.25rem;
          }

          .subject-info-name {
            font-size: 0.8125rem;
          }

          .subject-info-meta {
            font-size: 0.625rem;
          }

          .delete-warning {
            font-size: 0.6875rem;
            padding: 0.5rem;
            border-radius: 6px;
          }

          .delete-modal-footer {
            padding: 0.75rem 0.875rem 0.875rem;
            gap: 0.5rem;
          }

          .modal-btn {
            padding: 0.5rem 0.75rem;
            font-size: 0.6875rem;
            border-radius: 6px;
          }

          .modal-btn span:first-child {
            font-size: 0.8125rem;
          }
        }

        /* ==================== RESPONSIVE: KATTA EKRAN / DESKTOP (1025px va undan yuqori) ==================== */
        @media (min-width: 1025px) {
          .subject-management {
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

          /* Subjects Grid - 4 columns */
          .subjects-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.75rem;
          }

          .subject-card {
            border-radius: 10px;
          }

          .subject-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .subject-header {
            padding: 1rem;
          }

          .subject-icon-large {
            font-size: 1.75rem;
          }

          .subject-body {
            padding: 0.75rem;
          }

          .subject-name {
            font-size: 0.9375rem;
          }

          .subject-code-badge {
            font-size: 0.6875rem;
          }

          .subject-footer {
            padding: 0.625rem;
            gap: 0.5rem;
          }

          .subject-action-btn {
            padding: 0.5rem;
            font-size: 0.6875rem;
            border-radius: 8px;
          }

          .subject-action-btn span:first-child {
            font-size: 1rem;
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
      `}</style>
    </div>
  );
};

export default SubjectManagement;
