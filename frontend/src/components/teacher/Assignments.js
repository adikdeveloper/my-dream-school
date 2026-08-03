import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/authService';
import { Can } from '../../context/PermissionsContext';
import apiService from '../../services/apiService';
import styles from './Assignments.module.css';
import TeacherUiIcon from './TeacherUiIcon';

// Biriktirma fayllar uchun asosiy URL
const FILE_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastViewedAssignments, setLastViewedAssignments] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    subject: '',
    dueDate: '',
    maxScore: 100
  });

  const [gradeData, setGradeData] = useState({
    grade: '',
    feedback: '',
    awardCoin: false
  });

  // Memoized classes and subjects for optimization
  const selectedClass = useMemo(() => {
    return classes.find(c => c._id === formData.classId);
  }, [classes, formData.classId]);

  const subjects = useMemo(() => {
    if (!selectedClass || !selectedClass.subjects) return [];
    return selectedClass.subjects.map(s => ({
      _id: s.subject?._id,
      name: s.subject?.name
    })).filter(s => s._id && s.name);
  }, [selectedClass]);

  useEffect(() => {
    fetchInitialData();
    loadUserData();
    // Mark assignments section as viewed to clear notification badge
    apiService.markSectionAsViewed('assignments').catch(() => {
      // Silently fail - not critical
    });
  }, []);

  const loadUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      setLastViewedAssignments(response.data.lastViewed?.assignments || new Date(0));
    } catch (error) {
      // Silently fail - user data not critical for assignments display
    }
  };

  const isNewSubmission = useCallback((submission) => {
    if (!lastViewedAssignments || !submission.submittedAt) return false;
    const submittedAt = new Date(submission.submittedAt);
    const lastViewed = new Date(lastViewedAssignments);
    return submission.status === 'submitted' && submittedAt > lastViewed;
  }, [lastViewedAssignments]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [assignmentsRes, classesRes] = await Promise.all([
        api.get('/assignments/teacher'),
        api.get('/classes')
      ]);

      // Backend now returns array directly
      setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);

      // Handle classes - backend returns {classes: [...], pagination: {...}}
      const classesData = classesRes.data.classes || classesRes.data || [];
      setClasses(Array.isArray(classesData) ? classesData : []);

    } catch (error) {
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClassChange = (classId) => {
    setFormData(prev => ({ ...prev, classId, subject: '' }));
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/assignments', formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        classId: '',
        subject: '',
        dueDate: '',
        maxScore: 100
      });
      setSuccess('Vazifa muvaffaqiyatli yaratildi!');
      setTimeout(() => setSuccess(''), 3000);

      // Only fetch updated assignment, not all assignments
      fetchInitialData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Vazifa yaratishda xatolik yuz berdi';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    setError('');

    // Validate grade
    const gradeValue = parseFloat(gradeData.grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > selectedAssignment.maxScore) {
      setError(`Ball 0 va ${selectedAssignment.maxScore} oralig'ida bo'lishi kerak`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      await api.post(`/assignments/${selectedAssignment._id}/grade`, {
        studentId: selectedStudent.student._id,
        grade: gradeValue,
        feedback: gradeData.feedback,
        awardCoin: gradeData.awardCoin
      });

      setShowGradeModal(false);
      setGradeData({ grade: '', feedback: '', awardCoin: false });
      setSelectedStudent(null);
      setSuccess('Baholash muvaffaqiyatli saqlandi!');
      setTimeout(() => setSuccess(''), 3000);

      fetchInitialData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Baholashda xatolik yuz berdi';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  const openGradeModal = (assignment, submission) => {
    setSelectedAssignment(assignment);
    setSelectedStudent(submission);
    setGradeData({
      grade: submission.grade || '',
      feedback: submission.feedback || '',
      awardCoin: submission.hasCoin || false
    });
    setShowGradeModal(true);
  };

  const deleteAssignment = async (id) => {
    if (window.confirm('Vazifani o\'chirmoqchimisiz?')) {
      try {
        await api.delete(`/assignments/${id}`);
        setSuccess('Vazifa muvaffaqiyatli o\'chirildi!');
        setTimeout(() => setSuccess(''), 3000);
        fetchInitialData();
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'O\'chirishda xatolik yuz berdi';
        setError(errorMsg);
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  const getStatusBadge = (submission) => {
    if (submission.status === 'graded') {
      return <span className={`${styles.badge} ${styles.badgeSuccess}`}>Baholandi</span>;
    } else if (submission.status === 'submitted') {
      return <span className={`${styles.badge} ${styles.badgeWarning}`}>Topshirildi</span>;
    } else {
      return <span className={`${styles.badge} ${styles.badgeSecondary}`}>Kutilmoqda</span>;
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className={styles.assignmentsLoading}>
        <div className={styles.loadingSpinner}></div>
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className={styles.assignmentsContainer}>
      <div className={styles.assignmentsHeader}>
        <h1 className={styles.pageTitle}><TeacherUiIcon name="assignment" size={24} /> Uyga vazifalar</h1>
        <Can perm="assignment.create"><button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCreateModal(true)}>
          ➕ Yangi Vazifa
        </button></Can>
      </div>

      {/* Success Message */}
      {success && (
        <div className={styles.successMessage}>
          <TeacherUiIcon name="check" size={16} /> {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          <TeacherUiIcon name="close" size={16} /> {error}
        </div>
      )}

      {assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>Hali vazifalar yo'q</h3>
          <p>Yangi vazifa yaratib boshlang!</p>
        </div>
      ) : (
        <div className={styles.assignmentsGrid}>
          {assignments.map((assignment) => {
            const submittedCount = assignment.submissions.filter(s => s.status !== 'pending').length;
            const gradedCount = assignment.submissions.filter(s => s.status === 'graded').length;
            const totalStudents = assignment.submissions.length;
            const isOverdueAssignment = assignment.status === 'active' && isOverdue(assignment.dueDate);

            return (
              <div key={assignment._id} className={`${styles.assignmentCard} ${isOverdueAssignment ? styles.overdue : ''}`}>
                <div className={styles.assignmentHeader}>
                  <h3>{assignment.title}</h3>
                  <button
                    className={styles.btnDelete}
                    onClick={() => deleteAssignment(assignment._id)}
                    title="O'chirish"
                    aria-label="Vazifani o'chirish"
                  >
                    <TeacherUiIcon name="trash" size={17} />
                  </button>
                </div>

                <p className={styles.assignmentDescription}>{assignment.description}</p>

                <div className={styles.assignmentMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Sinf:</span>
                    <span className={styles.metaValue}>{assignment.class?.name || 'N/A'}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Fan:</span>
                    <span className={styles.metaValue}>{assignment.subject?.name || 'N/A'}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Muddat:</span>
                    <span className={`${styles.metaValue} ${isOverdueAssignment ? styles.metaValueOverdue : ''}`}>
                      {new Date(assignment.dueDate).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Max ball:</span>
                    <span className={styles.metaValue}>{assignment.maxScore}</span>
                  </div>
                </div>

                <div className={styles.assignmentStats}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{submittedCount}/{totalStudents}</span>
                    <span className={styles.statLabel}>Topshirildi</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{gradedCount}/{totalStudents}</span>
                    <span className={styles.statLabel}>Baholandi</span>
                  </div>
                </div>

                <div className={styles.submissionsSection}>
                  <h4>O'quvchilar:</h4>
                  <div className={styles.submissionsList}>
                    {assignment.submissions.map((submission) => {
                      const isNew = isNewSubmission(submission);

                      return (
                        <div key={submission._id} className={`${styles.submissionItem} ${isNew ? styles.newSubmission : ''}`}>
                          <div className={styles.submissionInfo}>
                            <span className={styles.studentName}>
                              {submission.student?.lastName} {submission.student?.firstName}
                              {isNew && <span className={styles.newSubmissionBadge}><TeacherUiIcon name="bell" size={13} /> YANGI</span>}
                            </span>
                            {getStatusBadge(submission)}
                            {submission.isLate && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#fff', background: '#f59e0b', padding: '0.12rem 0.45rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>⏰ Kech</span>
                            )}
                          </div>

                          {submission.status !== 'pending' && (
                            <div className={styles.submissionDetails}>
                              {submission.submissionText && (
                                <p className={styles.submissionText}>{submission.submissionText}</p>
                              )}
                              {submission.attachmentUrl && (
                                <a
                                  href={`${FILE_BASE}${submission.attachmentUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#0f766e', textDecoration: 'none', background: '#f0fdfa', padding: '0.35rem 0.7rem', borderRadius: '8px', marginBottom: '0.4rem' }}
                                >
                                  <TeacherUiIcon name="attach" size={14} /> {submission.attachmentName || 'Biriktirilgan fayl'}
                                </a>
                              )}
                              {submission.grade !== undefined && (
                                <span className={styles.gradeDisplay}>Ball: {submission.grade}</span>
                              )}
                              <Can perm="assignment.grade"><button
                                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                                onClick={() => openGradeModal(assignment, submission)}
                              >
                                {submission.status === 'graded' ? 'Tahrirlash' : 'Baholash'}
                              </button></Can>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Yangi Vazifa Yaratish</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowCreateModal(false)}
                aria-label="Yopish"
              >✕</button>
            </div>

            <form onSubmit={handleCreateAssignment} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Vazifa nomi *</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Masalan: Algebra mashqlar"
                  maxLength="200"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Tavsif *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  placeholder="Vazifa haqida batafsil ma'lumot..."
                  maxLength="2000"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="classId">Sinf *</label>
                  <select
                    id="classId"
                    name="classId"
                    value={formData.classId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                  >
                    <option value="">Sinf tanlang</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="subject">Fan *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.classId}
                  >
                    <option value="">Fan tanlang</option>
                    {subjects.map(subj => (
                      <option key={subj._id} value={subj._id}>
                        {subj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="dueDate">Topshirish muddati *</label>
                  <input
                    id="dueDate"
                    type="datetime-local"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="maxScore">Maksimal ball (0 dan katta, 100 gacha)</label>
                  <input
                    id="maxScore"
                    type="number"
                    name="maxScore"
                    value={formData.maxScore}
                    onChange={handleInputChange}
                    min="0.01"
                    max="100"
                    step="0.01"
                    placeholder="Masalan: 0.5, 5, 10"
                  />
                  <small className={styles.formHelp}>Juda kichik qiymatlar kiritishingiz mumkin (masalan: 0.5, 0.25)</small>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowCreateModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Submission Modal */}
      {showGradeModal && selectedStudent && (
        <div className={styles.modalOverlay} onClick={() => setShowGradeModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {selectedStudent.student?.lastName} {selectedStudent.student?.firstName} - Baholash
              </h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowGradeModal(false)}
                aria-label="Yopish"
              >✕</button>
            </div>

            <div className={styles.submissionPreview}>
              <h4>Topshiriq matni:</h4>
              <p>{selectedStudent.submissionText || 'Matn kiritilmagan'}</p>
              {selectedStudent.submittedAt && (
                <small>Topshirilgan vaqt: {new Date(selectedStudent.submittedAt).toLocaleString('uz-UZ')}</small>
              )}
            </div>

            <form onSubmit={handleGradeSubmission} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="grade">Ball (max: {selectedAssignment?.maxScore}) *</label>
                <input
                  id="grade"
                  type="number"
                  value={gradeData.grade}
                  onChange={(e) => setGradeData(prev => ({ ...prev, grade: e.target.value }))}
                  min="0"
                  max={selectedAssignment?.maxScore}
                  step="0.01"
                  placeholder="0.5, 5, 10..."
                  required
                />
                <small className={styles.formHelp}>Decimal qiymatlar kiritishingiz mumkin (masalan: 0.5, 0.25)</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="feedback">Izoh</label>
                <textarea
                  id="feedback"
                  value={gradeData.feedback}
                  onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                  rows="3"
                  placeholder="O'quvchiga qaytarilma..."
                  maxLength="1000"
                />
              </div>

              <div className={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.75rem', background: gradeData.awardCoin ? '#fffbeb' : '#f8fafc', border: `1px solid ${gradeData.awardCoin ? '#fcd34d' : '#e2e8f0'}`, borderRadius: '10px' }}>
                  <input
                    type="checkbox"
                    checked={gradeData.awardCoin}
                    onChange={(e) => setGradeData(prev => ({ ...prev, awardCoin: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>🪙 Coin berish — a'lo bajargan uy vazifa uchun (1 dars = 1 coin)</span>
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowGradeModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
