import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { sanitizeText, createSafeImageURL, debounce } from '../../utils/sanitization';
import { usePermissions } from '../../context/PermissionsContext';
import './MyClass.css';

// Use consistent base URL configuration (matches the rest of the app)
const API_URL = process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api';
const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';

const MyClass = () => {
  const { can } = usePermissions();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState(new Set());
  const [, setImageRetries] = useState(new Map());

  // Refs for accessibility
  const searchInputRef = useRef(null);
  const modalCloseRef = useRef(null);

  useEffect(() => {
    fetchMyClass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus management for modal
  useEffect(() => {
    if (selectedStudent && modalCloseRef.current) {
      modalCloseRef.current.focus();
    }
  }, [selectedStudent]);

  // Keyboard navigation for modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && selectedStudent) {
        setSelectedStudent(null);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [selectedStudent]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (selectedStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedStudent]);

  const fetchMyClass = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Tizimga kirish talab qilinadi');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/classes/my-class/info`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout for slow connections
      });

      setClassData(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Sinf ma\'lumotlarini olishda xatolik';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = useCallback(() => {
    fetchMyClass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Noma\'lum';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Noma\'lum';

      return date.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Noma\'lum';
    }
  }, []);

  const getInitials = useCallback((firstName, lastName) => {
    const first = sanitizeText(firstName);
    const last = sanitizeText(lastName);
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  }, []);

  // Handle image load errors with retry mechanism
  const handleImageError = useCallback((imageId, imageURL) => {
    setImageRetries(prev => {
      const newRetries = new Map(prev);
      const currentRetries = newRetries.get(imageId) || 0;

      // Allow up to 2 retries
      if (currentRetries < 2) {
        newRetries.set(imageId, currentRetries + 1);
        // Force reload by adding timestamp
        setTimeout(() => {
          const imgElements = document.querySelectorAll(`img[data-image-id="${imageId}"]`);
          imgElements.forEach(img => {
            img.src = `${imageURL}?retry=${currentRetries + 1}&t=${Date.now()}`;
          });
        }, 1000 * (currentRetries + 1)); // Exponential backoff: 1s, 2s
      } else {
        // After 2 retries, mark as permanently failed
        setImageErrors(prev => new Set(prev).add(imageId));
      }

      return newRetries;
    });
  }, []);

  // Memoized filtered students with search
  const filteredStudents = useMemo(() => {
    if (!classData?.students) return [];

    const query = sanitizeText(searchQuery).toLowerCase();
    if (!query) return classData.students;

    return classData.students.filter(student => {
      const firstName = sanitizeText(student.firstName).toLowerCase();
      const lastName = sanitizeText(student.lastName).toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const studentId = sanitizeText(student.studentId || '').toLowerCase();

      return fullName.includes(query) || studentId.includes(query);
    });
  }, [classData?.students, searchQuery]);

  // Debounced search handler with cleanup
  const debouncedSearch = useMemo(
    () => debounce((value) => setSearchQuery(value), 300),
    []
  );

  // Cleanup debounce and state on unmount
  useEffect(() => {
    return () => {
      // Clear any pending debounced calls
      if (debouncedSearch && debouncedSearch.cancel) {
        debouncedSearch.cancel();
      }

      // Clear image error tracking to prevent memory leaks
      setImageErrors(new Set());
      setImageRetries(new Map());
    };
  }, [debouncedSearch]);

  const handleSearchChange = useCallback((e) => {
    debouncedSearch(e.target.value);
  }, [debouncedSearch]);

  // Render safe image with fallback
  const renderAvatar = useCallback((imagePath, firstName, lastName, size = 'medium', imageId) => {
    const initials = getInitials(firstName, lastName);
    const hasError = imageErrors.has(imageId);
    const { imageURL, shouldUseImage } = createSafeImageURL(imagePath, BASE_URL, initials);

    const avatarClass = size === 'large'
      ? 'my-class-modal-avatar'
      : size === 'teacher'
      ? 'my-class-teacher-avatar'
      : 'my-class-student-avatar';

    const textClass = size === 'large'
      ? 'my-class-avatar-text-large'
      : 'my-class-avatar-text';

    return (
      <div className={avatarClass}>
        {shouldUseImage && !hasError ? (
          <img
            src={imageURL}
            alt={`${sanitizeText(firstName)} ${sanitizeText(lastName)}`}
            loading="lazy"
            data-image-id={imageId}
            onError={() => handleImageError(imageId, imageURL)}
          />
        ) : (
          <span className={textClass} aria-label={`${firstName} ${lastName} avatar`}>
            {initials}
          </span>
        )}
      </div>
    );
  }, [imageErrors, getInitials, handleImageError]);

  if (loading) {
    return (
      <div className="my-class-container" role="main" aria-live="polite" aria-busy="true">
        <div className="my-class-loading-container">
          <div className="my-class-spinner" role="status"></div>
          <p>Yuklanmoqda...</p>
          <span className="sr-only">Sinf ma'lumotlari yuklanmoqda</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-class-container" role="main" aria-live="assertive">
        <div className="my-class-error-container">
          <span className="my-class-error-icon" role="img" aria-label="Xatolik">⚠️</span>
          <h3>Xatolik</h3>
          <p>{sanitizeText(error)}</p>
          <button
            className="my-class-retry-btn"
            onClick={handleRetry}
            aria-label="Qayta urinish"
          >
            🔄 Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="my-class-container" role="main">
        <div className="my-class-empty-container">
          <span className="my-class-empty-icon" role="img" aria-label="Sinf topilmadi">📚</span>
          <h3>Sinf topilmadi</h3>
          <p>Siz hali hech qanday sinfga biriktirilmagansiz</p>
          <button
            className="my-class-retry-btn"
            onClick={handleRetry}
            aria-label="Yangilash"
          >
            🔄 Yangilash
          </button>
        </div>
      </div>
    );
  }

  const studentCount = classData.students?.length || 0;
  const subjectCount = classData.subjects?.length || 0;

  return (
    <div className="my-class-container" role="main">
      {/* Header */}
      <header className="my-class-header">
        <div className="my-class-header-content">
          <div className="my-class-icon" role="img" aria-label="Sinf belgisi">🎓</div>
          <div className="my-class-header-text">
            <h1>{sanitizeText(classData.name)}</h1>
            <p className="my-class-subtitle">
              {(classData.grade !== null && classData.grade !== undefined && classData.grade !== '') && `${classData.grade}-sinf • `}
              {sanitizeText(classData.academicYear)} o'quv yili
            </p>
          </div>
        </div>
        <div className="my-class-stats" role="region" aria-label="Sinf statistikasi">
          <div className="my-class-stat-card">
            <span className="my-class-stat-icon" role="img" aria-label="O'quvchilar">👥</span>
            <div className="my-class-stat-info">
              <span className="my-class-stat-value" aria-label={`${studentCount} ta o'quvchi`}>
                {studentCount}
              </span>
              <span className="my-class-stat-label">O'quvchi</span>
            </div>
          </div>
          <div className="my-class-stat-card">
            <span className="my-class-stat-icon" role="img" aria-label="Fanlar">📚</span>
            <div className="my-class-stat-info">
              <span className="my-class-stat-value" aria-label={`${subjectCount} ta fan`}>
                {subjectCount}
              </span>
              <span className="my-class-stat-label">Fan</span>
            </div>
          </div>
        </div>
      </header>

      {/* Class Teacher Section */}
      {classData.classTeacher && (
        <section className="my-class-section" aria-labelledby="teacher-heading">
          <h2 id="teacher-heading" className="my-class-section-title">
            <span className="my-class-section-icon" role="img" aria-label="O'qituvchi">👨‍🏫</span>
            Sinf rahbari
          </h2>
          <div className="my-class-teacher-card">
            {renderAvatar(
              classData.classTeacher.profileImage,
              classData.classTeacher.firstName,
              classData.classTeacher.lastName,
              'teacher',
              `teacher-${classData.classTeacher._id}`
            )}
            <div className="my-class-teacher-info">
              <h3>
                {sanitizeText(classData.classTeacher.firstName)} {sanitizeText(classData.classTeacher.lastName)}
              </h3>
              {classData.classTeacher.email && (
                <p className="my-class-teacher-contact">
                  <span className="my-class-contact-icon" role="img" aria-label="Email">📧</span>
                  {sanitizeText(classData.classTeacher.email)}
                </p>
              )}
              {classData.classTeacher.phone && (
                <p className="my-class-teacher-contact">
                  <span className="my-class-contact-icon" role="img" aria-label="Telefon">📱</span>
                  {sanitizeText(classData.classTeacher.phone)}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Subjects Section */}
      {classData.subjects && classData.subjects.length > 0 && (
        <section className="my-class-section" aria-labelledby="subjects-heading">
          <h2 id="subjects-heading" className="my-class-section-title">
            <span className="my-class-section-icon" role="img" aria-label="Fanlar">📚</span>
            Fanlar
          </h2>
          <div className="my-class-subjects-grid">
            {classData.subjects.map((subjectItem, index) => (
              <article key={subjectItem.subject?._id || index} className="my-class-subject-card">
                <div className="my-class-subject-header">
                  <span className="my-class-subject-name">
                    {sanitizeText(subjectItem.subject?.name || 'Noma\'lum fan')}
                  </span>
                  {subjectItem.subject?.code && (
                    <span className="my-class-subject-code">
                      {sanitizeText(subjectItem.subject.code)}
                    </span>
                  )}
                </div>
                {subjectItem.teacher && (
                  <div className="my-class-subject-teacher">
                    <span className="my-class-teacher-label">O'qituvchi:</span>
                    <span className="my-class-teacher-name">
                      {sanitizeText(subjectItem.teacher.firstName)} {sanitizeText(subjectItem.teacher.lastName)}
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Students Section */}
      <section className="my-class-section" aria-labelledby="students-heading">
        <div className="my-class-section-header">
          <h2 id="students-heading" className="my-class-section-title">
            <span className="my-class-section-icon" role="img" aria-label="O'quvchilar">👥</span>
            Sinfdoshlar ({filteredStudents.length})
          </h2>
          <div className="my-class-search-box" role="search">
            <span className="my-class-search-icon" role="img" aria-label="Qidirish">🔍</span>
            <label htmlFor="student-search" className="sr-only">
              O'quvchi qidirish
            </label>
            <input
              id="student-search"
              ref={searchInputRef}
              type="search"
              placeholder="O'quvchi qidirish..."
              onChange={handleSearchChange}
              className="my-class-search-input"
              aria-label="O'quvchi ismi yoki ID bo'yicha qidirish"
              autoComplete="off"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="my-class-empty-students" role="status">
            <span className="my-class-empty-icon" role="img" aria-label="Natija topilmadi">🔍</span>
            <p>Hech qanday o'quvchi topilmadi</p>
          </div>
        ) : (
          <div className="my-class-students-grid" role="list">
            {filteredStudents.map((student) => {
              const isCurrentUser = student.isCurrentUser === true;

              return (
                <article
                  key={student._id}
                  className={`my-class-student-card ${isCurrentUser ? 'current-user' : ''}`}
                  tabIndex={0}
                  aria-label={`${sanitizeText(student.firstName)} ${sanitizeText(student.lastName)}`}
                >
                  {isCurrentUser && (
                    <span className="my-class-current-user-badge" aria-label="Siz">
                      ⭐ Siz
                    </span>
                  )}
                  {renderAvatar(
                    student.profileImage,
                    student.firstName,
                    student.lastName,
                    'medium',
                    `student-${student._id}`
                  )}
                  <div className="my-class-student-info">
                    <h3 className="my-class-student-name">
                      {sanitizeText(student.firstName)} {sanitizeText(student.lastName)}
                    </h3>
                    {student.studentId && (
                      <p className="my-class-student-id">ID: {sanitizeText(student.studentId)}</p>
                    )}
                  </div>
                  <button
                    className="my-class-view-profile-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStudent(student);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedStudent(student);
                      }
                    }}
                    aria-label={`${student.firstName} ${student.lastName} profilini ko'rish`}
                  >
                    Ko'rish →
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div
          className="my-class-modal-overlay"
          onClick={() => setSelectedStudent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="my-class-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              ref={modalCloseRef}
              className="my-class-modal-close"
              onClick={() => setSelectedStudent(null)}
              aria-label="Yopish"
            >
              ×
            </button>

            <div className="my-class-modal-header">
              {renderAvatar(
                selectedStudent.profileImage,
                selectedStudent.firstName,
                selectedStudent.lastName,
                'large',
                `modal-${selectedStudent._id}`
              )}
              <h2 id="modal-title">
                {sanitizeText(selectedStudent.firstName)} {sanitizeText(selectedStudent.lastName)}
              </h2>
              {selectedStudent.studentId && (
                <p className="my-class-modal-student-id">
                  ID: {sanitizeText(selectedStudent.studentId)}
                </p>
              )}
            </div>

            <div className="my-class-modal-body">
              {selectedStudent.isCurrentUser && (
                <div className="my-class-info-group my-class-current-user-info">
                  <label>ℹ️ Ma'lumot:</label>
                  <p>Bu sizning profilingiz</p>
                </div>
              )}

              {selectedStudent.email && (selectedStudent.isCurrentUser || can('student.view_classmate_email')) && (
                <div className="my-class-info-group">
                  <label>📧 Email:</label>
                  <p>{sanitizeText(selectedStudent.email)}</p>
                </div>
              )}

              {selectedStudent.phone && (selectedStudent.isCurrentUser || can('student.view_classmate_phone')) && (
                <div className="my-class-info-group">
                  <label>📱 Telefon:</label>
                  <p>{sanitizeText(selectedStudent.phone)}</p>
                </div>
              )}

              {selectedStudent.dateOfBirth && (selectedStudent.isCurrentUser || can('student.view_classmate_birthdate')) && (
                <div className="my-class-info-group">
                  <label>🎂 Tug'ilgan sana:</label>
                  <p>{formatDate(selectedStudent.dateOfBirth)}</p>
                </div>
              )}

              {selectedStudent.address && (selectedStudent.isCurrentUser || can('student.view_classmate_address')) && (
                <div className="my-class-info-group">
                  <label>🏠 Manzil:</label>
                  <p>{sanitizeText(selectedStudent.address)}</p>
                </div>
              )}

              {!selectedStudent.isCurrentUser && (
                <>
                  {selectedStudent.parentName && can('student.view_classmate_parent') && (
                    <div className="my-class-info-group">
                      <label>👨‍👩‍👧 Ota-ona:</label>
                      <p>{sanitizeText(selectedStudent.parentName)}</p>
                    </div>
                  )}
                  {selectedStudent.parentPhone && can('student.view_classmate_parent') && (
                    <div className="my-class-info-group">
                      <label>📞 Ota-ona telefoni:</label>
                      <p>{sanitizeText(selectedStudent.parentPhone)}</p>
                    </div>
                  )}
                </>
              )}

              {!selectedStudent.email && !selectedStudent.phone && !selectedStudent.dateOfBirth && !selectedStudent.address && !selectedStudent.isCurrentUser && (
                <div className="my-class-info-group my-class-no-info">
                  <p>Qo'shimcha ma'lumotlar mavjud emas yoki ruxsat berilmagan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MyClass);
