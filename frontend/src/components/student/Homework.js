import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../../services/authService';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import './Homework.css';

// MongoDB ObjectId validation regex
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
// Biriktirma fayllar uchun asosiy URL (rasmlar bilan bir xil)
const FILE_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';

const Homework = () => {
  useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'
  const [lastViewedHomework, setLastViewedHomework] = useState(null);
  const [modalUnsavedChanges, setModalUnsavedChanges] = useState(false);
  const [modalViewMode, setModalViewMode] = useState(false);

  // Define showToastMessage FIRST before using it
  const toastTimerRef = useRef(null);
  const showToastMessage = useCallback((message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 5000); // 5 seconds - better UX for reading
  }, []);

  // Komponent yo'q qilinganda toast taymerini tozalaymiz
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setLastViewedHomework(response.data.lastViewed?.homework || null);
    } catch (error) {
      // Silent fail - set to null if user data can't be loaded
      setLastViewedHomework(null);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/assignments/student');
      setAssignments(response.data);
    } catch (error) {
      showToastMessage('Vazifalarni yuklashda xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToastMessage]);

  useEffect(() => {
    loadAssignments();
    loadUserData();
    // Mark homework section as viewed to clear notification badge
    apiService.markSectionAsViewed('homework').catch(() => {
      // Silent fail - no console in production
    });
  }, [loadAssignments, loadUserData]);

  // Separate effect for browser close warning to avoid re-running API calls
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (modalUnsavedChanges && submissionText.trim()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [modalUnsavedChanges, submissionText]);

  const handleSubmit = async () => {
    // Sanitize and validate input
    const sanitizedText = submissionText.trim();
    const hasExistingAttachment = !!selectedAssignment?.mySubmission?.attachmentUrl;

    // Matn (>=10 belgi) yoki fayl — kamida bittasi bo'lishi shart
    if (!submissionFile && !hasExistingAttachment && sanitizedText.length < 10) {
      showToastMessage('Javob kamida 10 belgidan iborat bo\'lishi yoki fayl biriktirilishi kerak', 'error');
      return;
    }

    if (sanitizedText.length > 5000) {
      showToastMessage('Javob 5000 belgidan oshmasligi kerak', 'error');
      return;
    }

    // Frontend validation for assignment ID
    if (!selectedAssignment?._id || !isValidObjectId(selectedAssignment._id)) {
      showToastMessage('Noto\'g\'ri vazifa ID. Sahifani yangilang.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('submissionText', sanitizedText);
      if (submissionFile) formData.append('attachment', submissionFile);

      const response = await api.post(`/assignments/${selectedAssignment._id}/submit`, formData);

      setShowSubmitModal(false);
      setSubmissionText('');
      setSubmissionFile(null);
      setSelectedAssignment(null);
      setModalUnsavedChanges(false);
      loadAssignments();

      // Show success message with warning if late
      if (response.data.warning) {
        showToastMessage(`Topshirildi! ${response.data.warning}`, 'success');
      } else {
        showToastMessage('Vazifa muvaffaqiyatli topshirildi!', 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Topshirishda xatolik yuz berdi';
      showToastMessage(errorMessage, 'error');
    }
  };

  const openSubmitModal = (assignment, viewOnly = false) => {
    setSelectedAssignment(assignment);
    setSubmissionText(assignment.mySubmission?.submissionText || '');
    setSubmissionFile(null);
    setModalUnsavedChanges(false);
    setModalViewMode(viewOnly);
    setShowSubmitModal(true);
  };

  const closeModal = () => {
    if (modalUnsavedChanges && (submissionText.trim() || submissionFile)) {
      if (!window.confirm('O\'zgarishlar saqlanmaydi. Aniq chiqmoqchimisiz?')) {
        return;
      }
    }
    setShowSubmitModal(false);
    setSubmissionFile(null);
    setModalUnsavedChanges(false);
  };

  // Helper function for date formatting with fallback
  const formatDate = useCallback((date) => {
    const d = new Date(date);
    if (!date || isNaN(d.getTime())) return '—';
    try {
      return d.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      // Fallback to ISO format if locale not supported
      return d.toLocaleDateString('en-GB');
    }
  }, []);

  // FIXED: Improved tab categorization with 4 clear categories and performance optimization
  const { pending, underReview, completed, overdue } = useMemo(() => {
    const now = new Date();
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const todayStart = startOfDay(now);
    const pendingList = [];
    const underReviewList = [];
    const completedList = [];
    const overdueList = [];

    assignments.forEach(assignment => {
      const dueDate = new Date(assignment.dueDate);
      const submission = assignment.mySubmission;

      // Pre-calculate values for performance (taqvim kunlari bo'yicha, soat farqisiz)
      const daysRemaining = Math.round((startOfDay(dueDate) - todayStart) / 86400000);
      const isNew = lastViewedHomework && new Date(assignment.createdAt) > new Date(lastViewedHomework);

      if (submission && submission.status === 'graded') {
        // Graded assignments go to completed
        completedList.push({
          ...assignment,
          completedDate: submission.gradedAt || submission.submittedAt,
          isNew
        });
      } else if (submission && submission.status === 'submitted') {
        // Submitted but not graded yet - goes to underReview
        underReviewList.push({ ...assignment, isNew });
      } else if (daysRemaining < 0) {
        // Not submitted and deadline passed - overdue
        const daysOverdue = Math.abs(daysRemaining);
        overdueList.push({ ...assignment, daysOverdue, isNew });
      } else {
        // Not submitted and deadline not passed - pending
        pendingList.push({ ...assignment, daysRemaining, isNew });
      }
    });

    return {
      pending: pendingList,
      underReview: underReviewList,
      completed: completedList,
      overdue: overdueList
    };
  }, [assignments, lastViewedHomework]);

  const renderPendingHomeworks = () => {
    if (pending.length === 0) {
      return <div className="empty-message">Hozircha vazifa yo'q 🎉</div>;
    }

    return (
      <div className="homework-grid">
        {pending.map((hw) => {
          // Values pre-calculated in useMemo
          const daysRemaining = hw.daysRemaining;
          const isNew = hw.isNew;

          // FIXED: Priority badge logic - only for truly pending assignments
          const getPriorityColor = () => {
            if (daysRemaining <= 1) return '#ef4444'; // Red for urgent (today/tomorrow)
            if (daysRemaining <= 3) return '#f59e0b'; // Orange for soon
            if (daysRemaining <= 7) return '#22c55e'; // Green for this week
            return '#10b981'; // Green for later
          };

          const getPriorityText = () => {
            if (daysRemaining <= 1) return 'SHOSHILINCH';
            if (daysRemaining <= 3) return 'TEZDA';
            if (daysRemaining <= 7) return 'BU HAFTA';
            return 'YAXSHI';
          };

          return (
            <div key={hw._id} className={`homework-card ${isNew ? 'new-assignment' : ''}`}>
              <div className="homework-header">
                <div className="homework-subject">
                  {hw.subject?.name}
                  {isNew && <span className="new-indicator mobile-compact">🔔 YANGI</span>}
                </div>
                <div className="priority-badge" style={{ backgroundColor: getPriorityColor() }}>
                  {getPriorityText()}
                </div>
              </div>
              <h3 className="homework-title">{hw.title}</h3>
              <p className="homework-description">{hw.description}</p>
              <div className="homework-footer">
                <div className="homework-meta">
                  <span className="meta-item">
                    📅 {formatDate(hw.dueDate)}
                  </span>
                  <span className="meta-item">
                    ⏰ {daysRemaining === 0 ? 'Bugun' : daysRemaining === 1 ? 'Ertaga' : `${daysRemaining} kun`}
                  </span>
                  <span className="meta-item">
                    ⭐ {hw.maxScore} ball
                  </span>
                </div>
                <button
                  className="btn-submit btn-mobile-compact"
                  onClick={() => openSubmitModal(hw)}
                >
                  Topshirish
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // FIXED: Added underReview render function
  const renderUnderReviewHomeworks = () => {
    if (underReview.length === 0) {
      return <div className="empty-message">Tekshirilayotgan vazifalar yo'q</div>;
    }

    return (
      <div className="homework-grid">
        {underReview.map((hw) => {
          // Values pre-calculated in useMemo
          const isNew = hw.isNew;

          return (
            <div key={hw._id} className={`homework-card under-review ${isNew ? 'new-assignment' : ''}`}>
              <div className="homework-header">
                <div className="homework-subject">
                  {hw.subject?.name}
                  {isNew && <span className="new-indicator mobile-compact">🔔 YANGI</span>}
                  {hw.mySubmission?.isLate && <span className="late-flag">⏰ Kech</span>}
                </div>
                <div className="submitted-badge">✓ Topshirildi</div>
              </div>
              <h3 className="homework-title">{hw.title}</h3>
              <p className="homework-description">{hw.description}</p>
              <div className="homework-footer">
                <div className="homework-meta">
                  <span className="meta-item">
                    ✅ {formatDate(hw.mySubmission?.submittedAt)}
                  </span>
                  <span className="meta-item">
                    ⏰ Baholanmoqda
                  </span>
                  <span className="meta-item">
                    ⭐ {hw.maxScore} ball
                  </span>
                </div>
                <button
                  className="btn-submit btn-mobile-compact"
                  onClick={() => openSubmitModal(hw, false)}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  Qayta topshirish
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCompletedHomeworks = () => {
    if (completed.length === 0) {
      return <div className="empty-message">Baholangan vazifalar yo'q</div>;
    }

    return (
      <div className="homework-grid">
        {completed.map((hw) => {
          // Values pre-calculated in useMemo
          const isNew = hw.isNew;
          // Safe percentage calculation with proper validation
          const grade = hw.mySubmission?.grade ?? 0;
          const maxScore = hw.maxScore > 0 ? hw.maxScore : 1; // Prevent division by zero
          const percentage = Math.round((grade / maxScore) * 100);

          return (
            <div key={hw._id} className={`homework-card completed ${isNew ? 'new-assignment' : ''}`}>
              <div className="homework-header">
                <div className="homework-subject">
                  {hw.subject?.name}
                  {isNew && <span className="new-indicator mobile-compact">🔔 YANGI</span>}
                  {hw.mySubmission?.isLate && <span className="late-flag">⏰ Kech</span>}
                </div>
                <div className="grade-badge">
                  {grade}/{hw.maxScore} ({percentage}%)
                </div>
              </div>
              <h3 className="homework-title">{hw.title}</h3>
              <p className="homework-description">{hw.description}</p>
              {hw.mySubmission?.feedback && hw.mySubmission.feedback.trim() && (
                <div className="feedback-section">
                  <strong>O'qituvchi izohi:</strong>
                  <p>{hw.mySubmission.feedback}</p>
                </div>
              )}
              <div className="homework-footer">
              <div className="homework-meta">
                <span className="meta-item">
                  ✅ {formatDate(hw.completedDate)}
                </span>
                <span className="meta-item">
                  ⭐ {grade}/{hw.maxScore}
                </span>
              </div>
              <button
                className="btn-view btn-mobile-compact"
                onClick={() => openSubmitModal(hw, true)}
              >
                Ko'rish
              </button>
            </div>
          </div>
          );
        })}
      </div>
    );
  };

  const renderOverdueHomeworks = () => {
    if (overdue.length === 0) {
      return <div className="empty-message">Muddati o'tgan vazifalar yo'q ✨</div>;
    }

    return (
      <div className="homework-grid">
        {overdue.map((hw) => {
          // Values pre-calculated in useMemo
          const isNew = hw.isNew;
          const daysOverdue = hw.daysOverdue;

          return (
            <div key={hw._id} className={`homework-card overdue ${isNew ? 'new-assignment' : ''}`}>
              <div className="homework-header">
                <div className="homework-subject">
                  {hw.subject?.name}
                  {isNew && <span className="new-indicator">🔔 YANGI</span>}
                </div>
                <div className="overdue-badge">⚠️ Muddat o'tgan</div>
              </div>
            <h3 className="homework-title">{hw.title}</h3>
            <p className="homework-description">{hw.description}</p>
            <div className="homework-footer">
              <div className="homework-meta">
                <span className="meta-item">
                  📅 Muddat edi: {formatDate(hw.dueDate)}
                </span>
                <span className="meta-item">
                  ⏰ {daysOverdue} kun o'tdi
                </span>
              </div>
              <button className="btn-submit urgent" onClick={() => openSubmitModal(hw)}>
                Hozir topshirish
              </button>
            </div>
          </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="homework-container"><div className="loading-message">Yuklanmoqda...</div></div>;
  }

  return (
    <div className="homework-container">
      {/* Toast Notification */}
      {showToast && (
        <div className={`toast-notification ${toastType}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toastType === 'success' ? '✓' : '✗'}
            </span>
            <span className="toast-message">{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="homework-header">
        <h1 className="page-title">📝 Uyga Vazifalar</h1>
        <p className="page-subtitle">Vazifalarni kuzatib boring va topshiring</p>
      </div>

      <div className="homework-tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Bajarish kerak
          <span className="tab-count">{pending.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'underReview' ? 'active' : ''}`}
          onClick={() => setActiveTab('underReview')}
        >
          Tekshirilmoqda
          <span className="tab-count">{underReview.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Baholangan
          <span className="tab-count">{completed.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Kech qolgan
          <span className="tab-count">{overdue.length}</span>
        </button>
      </div>

      <div className="homework-content">
        {activeTab === 'pending' && renderPendingHomeworks()}
        {activeTab === 'underReview' && renderUnderReviewHomeworks()}
        {activeTab === 'completed' && renderCompletedHomeworks()}
        {activeTab === 'overdue' && renderOverdueHomeworks()}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAssignment.title}</h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Yopish">✕</button>
            </div>

            <div className="modal-body">
              <div className="assignment-details">
                <p><strong>Fan:</strong> {selectedAssignment.subject?.name}</p>
                <p><strong>Muddat:</strong> {formatDate(selectedAssignment.dueDate)}</p>
                <p><strong>Maksimal ball:</strong> {selectedAssignment.maxScore}</p>
                {selectedAssignment.mySubmission?.status === 'graded' && (
                  <p><strong>Sizning balingiz:</strong> {selectedAssignment.mySubmission.grade}/{selectedAssignment.maxScore} ({Math.round((selectedAssignment.mySubmission.grade / (selectedAssignment.maxScore || 1)) * 100)}%)</p>
                )}
              </div>

              <div className="assignment-description-modal">
                <h4>Vazifa tavsifi:</h4>
                <p>{selectedAssignment.description}</p>
              </div>

              {modalViewMode ? (
                <div className="submission-view-mode">
                  <label>Sizning javobingiz:</label>
                  <div className="submission-readonly">
                    {submissionText || (selectedAssignment.mySubmission?.attachmentUrl ? 'Fayl biriktirilgan' : 'Javob topilmadi')}
                  </div>
                  {selectedAssignment.mySubmission?.attachmentUrl && (
                    <a
                      className="attachment-link"
                      href={`${FILE_BASE}${selectedAssignment.mySubmission.attachmentUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📎 {selectedAssignment.mySubmission.attachmentName || 'Biriktirilgan fayl'}
                    </a>
                  )}
                  {selectedAssignment.mySubmission?.feedback && (
                    <div className="feedback-section">
                      <strong>O'qituvchi izohi:</strong>
                      <p>{selectedAssignment.mySubmission.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="submission-form">
                  <label>Javobingizni kiriting:</label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => {
                      setSubmissionText(e.target.value);
                      setModalUnsavedChanges(true);
                    }}
                    rows="8"
                    placeholder="Vazifa javobini bu yerga yozing..."
                  />
                  <div className="attachment-row">
                    <label className="attachment-upload">
                      📎 Fayl biriktirish (rasm yoki PDF, ixtiyoriy)
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          setSubmissionFile(e.target.files?.[0] || null);
                          setModalUnsavedChanges(true);
                        }}
                      />
                    </label>
                    {submissionFile ? (
                      <span className="attachment-chosen">✓ {submissionFile.name}</span>
                    ) : selectedAssignment.mySubmission?.attachmentUrl ? (
                      <a
                        className="attachment-link"
                        href={`${FILE_BASE}${selectedAssignment.mySubmission.attachmentUrl}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📎 {selectedAssignment.mySubmission.attachmentName || 'Joriy fayl'}
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                {modalViewMode ? 'Yopish' : 'Bekor qilish'}
              </button>
              {!modalViewMode && (
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                >
                  Topshirish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homework;