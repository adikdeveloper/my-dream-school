import React, { useState, useEffect, useMemo } from 'react';
import apiService from '../../services/apiService';

const ClassProfile = ({ classData, isOpen, onClose, onUpdate, mode = 'view' }) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    section: '',
    group: '',
    academicYear: '',
    classTeacher: '',
    maxStudents: '',
    room: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    // Load teachers for selection
    const loadTeachers = async () => {
      try {
        const response = await apiService.getUsers('teacher');
        setTeachers(response.users || []);
      } catch (err) {
        // Silently fail - teachers list is not critical
        setTeachers([]);
      }
    };
    loadTeachers();
  }, []);

  useEffect(() => {
    if (classData) {
      setFormData({
        name: classData.name || '',
        grade: classData.grade || '',
        section: classData.section || '',
        group: classData.group || '',
        academicYear: classData.academicYear || '',
        classTeacher: classData.classTeacher?._id || '',
        maxStudents: classData.maxStudents || '',
        room: classData.room || '',
        isActive: classData.isActive !== undefined ? classData.isActive : true
      });
    } else if (mode === 'add') {
      // Get current academic year
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      setFormData({
        name: '',
        grade: '',
        section: '',
        group: '',
        academicYear: `${currentYear}-${nextYear}`,
        classTeacher: '',
        maxStudents: '30',
        room: '',
        isActive: true
      });
    }
    setIsEditing(mode === 'edit' || mode === 'add');
  }, [classData, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Bo'sh group maydonini olib tashlash - backend validatsiya uchun
      const dataToSend = { ...formData };
      if (dataToSend.group === '') {
        delete dataToSend.group;
      }

      if (mode === 'add') {
        await apiService.createClass(dataToSend);
        onUpdate();
        onClose();
      } else {
        await apiService.updateClass(classData._id, dataToSend);
        onUpdate();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ma\'lumotlarni saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'add' || mode === 'edit') {
      // Add yoki Edit rejimida - modalni to'liq yopish
      onClose();
    } else {
      // View rejimida - faqat tahrirlashni bekor qilish
      if (classData) {
        setFormData({
          name: classData.name || '',
          grade: classData.grade || '',
          section: classData.section || '',
          group: classData.group || '',
          academicYear: classData.academicYear || '',
          classTeacher: classData.classTeacher?._id || '',
          maxStudents: classData.maxStudents || '',
          room: classData.room || '',
          isActive: classData.isActive !== undefined ? classData.isActive : true
        });
      }
      setIsEditing(false);
    }
    setError('');
  };

  // Memoize teacher name calculation for performance
  const teacherName = useMemo(() => {
    if (classData && classData.classTeacher) {
      return `${classData.classTeacher.firstName} ${classData.classTeacher.lastName}`;
    }
    const teacher = teachers.find(t => t._id === formData.classTeacher);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : '—';
  }, [classData, teachers, formData.classTeacher]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            <div className="class-icon">🏫</div>
            <div>
              <h2 className="modal-title">
                {mode === 'add' ? 'Yangi sinf qo\'shish' : isEditing ? 'Sinf ma\'lumotlarini tahrirlash' : 'Sinf profili'}
              </h2>
              <p className="modal-subtitle">
                {!isEditing && classData && `${formData.grade}-${formData.section} sinf`}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">📋</span>
              Asosiy ma'lumotlar
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Sinf nomi <span className="required">*</span></label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Masalan: 5-A"
                    required
                  />
                ) : (
                  <div className="form-value">{formData.name}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Sinf darajasi <span className="required">*</span></label>
                {isEditing ? (
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">Tanlang</option>
                    <option value="0">0-sinf</option>
                    <option value="1">1-sinf</option>
                    <option value="2">2-sinf</option>
                    <option value="3">3-sinf</option>
                    <option value="4">4-sinf</option>
                    <option value="5">5-sinf</option>
                    <option value="6">6-sinf</option>
                    <option value="7">Oxford</option>
                    <option value="8">Stanford</option>
                    <option value="9">MIT</option>
                  </select>
                ) : (
                  <div className="form-value">
                    <span className="badge badge-blue">{formData.grade}-sinf</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Bo'lim <span className="required">*</span></label>
                {isEditing ? (
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="A, B, V..."
                    maxLength="2"
                    required
                  />
                ) : (
                  <div className="form-value">
                    <span className="badge badge-section">{formData.section}</span>
                  </div>
                )}
              </div>

              {/* Guruh maydoni olib tashlandi - Oxford/Stanford/MIT endi sinf darajasi */}

              <div className="form-group">
                <label className="form-label">O'quv yili <span className="required">*</span></label>
                {isEditing ? (
                  <input
                    type="text"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="2024-2025"
                    required
                  />
                ) : (
                  <div className="form-value">{formData.academicYear}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Sinf rahbari</label>
                {isEditing ? (
                  <select
                    name="classTeacher"
                    value={formData.classTeacher}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">Tanlang</option>
                    {teachers.map(teacher => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.firstName} {teacher.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="form-value">{teacherName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Maksimal o'quvchilar soni</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="maxStudents"
                    value={formData.maxStudents}
                    onChange={handleChange}
                    className="form-input"
                    min="1"
                    max="50"
                  />
                ) : (
                  <div className="form-value">{formData.maxStudents || '—'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">🏢</span>
              Qo'shimcha ma'lumotlar
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Xona raqami</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="201, 302..."
                  />
                ) : (
                  <div className="form-value">{formData.room || '—'}</div>
                )}
              </div>

              {classData && classData.students && (
                <div className="form-group">
                  <label className="form-label">Hozirgi o'quvchilar soni</label>
                  <div className="form-value">
                    <span className="badge badge-gold">{classData.students.length} ta</span>
                  </div>
                </div>
              )}

              {classData && classData.createdAt && (
                <div className="form-group">
                  <label className="form-label">Yaratilgan sana</label>
                  <div className="form-value">
                    {new Date(classData.createdAt).toLocaleDateString('uz-UZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Sinf faol</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="modal-footer">
          {isEditing ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saqlanmoqda...' : mode === 'add' ? 'Qo\'shish' : 'Saqlash'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Yopish
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Tahrirlash
              </button>
            </>
          )}
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
            animation: fadeIn 0.2s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal-container {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
            animation: slideUp 0.3s ease-out;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .modal-header {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid #93c5fd;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
            border-radius: 12px 12px 0 0;
          }

          .header-left {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            flex: 1;
          }

          .class-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
            flex-shrink: 0;
          }

          .modal-title {
            font-size: 1.0625rem;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 0.125rem;
          }

          .modal-subtitle {
            font-size: 0.75rem;
            color: #64748b;
            font-weight: 500;
          }

          .close-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: #dbeafe;
            color: #1e40af;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
          }

          .close-btn:hover {
            background: #3b82f6;
            color: white;
            transform: scale(1.1);
          }

          .error-message {
            margin: 0.75rem 1.25rem 0;
            padding: 0.5rem 0.75rem;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #991b1b;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
            font-size: 0.75rem;
          }

          .error-icon {
            font-size: 1.25rem;
          }

          .modal-body {
            padding: 1rem 1.25rem;
            overflow-y: auto;
            flex: 1;
          }

          .modal-body::-webkit-scrollbar {
            width: 8px;
          }

          .modal-body::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }

          .modal-body::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }

          .modal-body::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          .info-section {
            margin-bottom: 1rem;
            padding: 0.875rem;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }

          .section-title {
            font-size: 0.8125rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.375rem;
          }

          .section-icon {
            font-size: 1rem;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .form-group.full-width {
            grid-column: 1 / -1;
          }

          .form-label {
            font-size: 0.6875rem;
            font-weight: 600;
            color: #475569;
          }

          .form-input, .form-textarea {
            padding: 0.5rem 0.75rem;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.75rem;
            transition: all 0.2s ease;
            background: white;
            color: #1e293b;
            font-weight: 500;
          }

          .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          .form-textarea {
            resize: vertical;
            font-family: inherit;
          }

          .form-value {
            padding: 0.375rem 0;
            font-size: 0.75rem;
            color: #1e293b;
            font-weight: 500;
            min-height: 28px;
            display: flex;
            align-items: center;
          }

          .badge {
            padding: 0.1875rem 0.5rem;
            border-radius: 4px;
            font-size: 0.6875rem;
            font-weight: 600;
            display: inline-block;
          }

          .badge-blue {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
            color: #1e40af;
          }

          .badge-section {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            color: #92400e;
          }

          .badge-group {
            background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
            color: #3730a3;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          }

          .info-text {
            font-size: 0.75rem;
            color: #64748b;
            font-weight: 400;
            margin-left: 0.5rem;
          }

          .badge-gold {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #78350f;
            box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            padding: 0.5rem;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }

          .checkbox-label:hover {
            border-color: #3b82f6;
          }

          .checkbox-input {
            width: 16px;
            height: 16px;
            cursor: pointer;
          }

          .checkbox-text {
            font-size: 0.75rem;
            font-weight: 600;
            color: #1e293b;
          }

          .required {
            color: #ef4444;
            margin-left: 0.25rem;
          }

          .modal-footer {
            padding: 0.75rem 1.25rem;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
            background: #f8fafc;
            border-radius: 0 0 12px 12px;
          }

          .btn {
            padding: 0.5rem 0.875rem;
            border: none;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-primary {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
          }

          .btn-secondary {
            background: white;
            color: #64748b;
            border: 1px solid #e2e8f0;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #f1f5f9;
            border-color: #cbd5e1;
          }

          @media (max-width: 768px) {
            .modal-container {
              max-height: 95vh;
              margin: 0.5rem;
              width: calc(100% - 1rem);
            }

            .modal-header {
              padding: 1.125rem 0.875rem;
              gap: 0.625rem;
            }

            .header-left {
              gap: 0.625rem;
              flex: 1;
              min-width: 0;
              align-items: center;
            }

            .class-icon {
              width: 40px;
              height: 40px;
              font-size: 1.25rem;
              flex-shrink: 0;
            }

            .modal-title {
              font-size: 0.9375rem;
              margin-bottom: 0.125rem;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .modal-subtitle {
              font-size: 0.75rem;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .close-btn {
              width: 32px;
              height: 32px;
              font-size: 1rem;
              flex-shrink: 0;
            }

            .modal-body {
              padding: 1rem;
            }

            .section-title {
              font-size: 0.9375rem;
              margin-bottom: 0.75rem;
            }

            .form-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }

            .form-group label {
              font-size: 0.8125rem;
              margin-bottom: 0.375rem;
            }

            .form-control,
            .form-select,
            .form-textarea {
              padding: 0.625rem 0.75rem;
              font-size: 0.875rem;
            }

            .modal-footer {
              padding: 1rem;
              gap: 0.625rem;
              flex-direction: column-reverse;
            }

            .btn {
              width: 100%;
              justify-content: center;
              padding: 0.75rem 1rem;
              font-size: 0.875rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ClassProfile;
