import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';

const SubjectProfile = ({ subject, isOpen, onClose, onUpdate, mode = 'view' }) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    credits: '',
    color: '#3b82f6',
    teachers: [],
    isActive: true
  });
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colorOptions = [
    { value: '#3b82f6', label: 'Ko\'k', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { value: '#10b981', label: 'Yashil', bg: 'linear-gradient(135deg, #10b981, #059669)' },
    { value: '#f59e0b', label: 'Sariq', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { value: '#ef4444', label: 'Qizil', bg: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    { value: '#8b5cf6', label: 'Binafsha', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    { value: '#ec4899', label: 'Pushti', bg: 'linear-gradient(135deg, #ec4899, #db2777)' },
    { value: '#06b6d4', label: 'Moviy', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { value: '#64748b', label: 'Kulrang', bg: 'linear-gradient(135deg, #64748b, #475569)' }
  ];

  useEffect(() => {
    // Load teachers
    const loadTeachers = async () => {
      try {
        const teachersList = await apiService.getTeachers();
        setTeachers(teachersList || []);
      } catch (err) {
      }
    };
    loadTeachers();
  }, []);

  useEffect(() => {
    if (subject) {
      // Extract teacher IDs (handle both string IDs and populated objects)
      const teacherIds = subject.teachers ? subject.teachers.map(t =>
        typeof t === 'string' ? t : (t._id || t)
      ) : [];

      setFormData({
        name: subject.name || '',
        code: subject.code || '',
        description: subject.description || '',
        credits: subject.credits || '',
        color: subject.color || '#3b82f6',
        teachers: teacherIds,
        isActive: subject.isActive !== undefined ? subject.isActive : true
      });
    } else if (mode === 'add') {
      setFormData({
        name: '',
        code: '',
        description: '',
        credits: '',
        color: '#3b82f6',
        teachers: [],
        isActive: true
      });
    }
    setIsEditing(mode === 'edit' || mode === 'add');
  }, [subject, mode]);

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
      if (mode === 'add') {
        const response = await apiService.createSubject(formData);
        onUpdate(response.message || 'Fan muvaffaqiyatli qo\'shildi');
        onClose();
      } else {
        const response = await apiService.updateSubject(subject._id, formData);
        onUpdate(response.message || 'Fan muvaffaqiyatli yangilandi');
        onClose();
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setError({
          message: err.response.data.message,
          details: err.response.data.errors
        });
      } else {
        setError(err.response?.data?.message || 'Ma\'lumotlarni saqlashda xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Bekor qilish bosilganda har doim yopish
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            <div className="subject-icon" style={{ background: formData.color }}>
              📚
            </div>
            <div>
              <h2 className="modal-title">
                {mode === 'add' ? 'Yangi fan qo\'shish' : isEditing ? 'Fan ma\'lumotlarini tahrirlash' : 'Fan profili'}
              </h2>
              <p className="modal-subtitle">
                {!isEditing && subject && formData.name}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="error-message-container">
            <div className="error-message-header">
              <span className="error-icon">⚠️</span>
              {typeof error === 'string' ? error : error.message}
            </div>
            {error.details && Array.isArray(error.details) && (
              <ul className="error-list">
                {error.details.map((err, idx) => (
                  <li key={idx}>{err.msg}</li>
                ))}
              </ul>
            )}
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
                <label className="form-label">Fan nomi <span className="required">*</span></label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Matematika, Fizika, ..."
                    required
                  />
                ) : (
                  <div className="form-value">{formData.name}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Fan kodi <span className="required">*</span></label>
                {isEditing ? (
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="MATH-101, PHYS-201, ..."
                    required
                  />
                ) : (
                  <div className="form-value">
                    <span className="badge badge-code">{formData.code}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Kredit soati</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="credits"
                    value={formData.credits}
                    onChange={handleChange}
                    className="form-input"
                    min="1"
                    max="10"
                    placeholder="3"
                  />
                ) : (
                  <div className="form-value">{formData.credits || '—'}</div>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Tavsif</label>
                {isEditing ? (
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-textarea"
                    rows="3"
                    placeholder="Fan haqida qisqacha ma'lumot..."
                  />
                ) : (
                  <div className="form-value">{formData.description || '—'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">👨‍🏫</span>
              O'qituvchilar
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Bu fanni o'qitadigan o'qituvchilar</label>
                {isEditing ? (
                  <div className="teachers-select-container">
                    <select
                      multiple
                      className="form-select-multiple"
                      value={formData.teachers}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setFormData(prev => ({ ...prev, teachers: selected }));
                      }}
                      style={{ minHeight: '150px' }}
                    >
                      {teachers.map(teacher => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.firstName} {teacher.lastName}
                        </option>
                      ))}
                    </select>
                    <small className="form-hint">
                      💡 Ctrl/Cmd tugmasini bosib turgan holda bir nechta o'qituvchini tanlashingiz mumkin
                    </small>
                    {formData.teachers && formData.teachers.length > 0 && (
                      <div className="selected-teachers">
                        <strong>Tanlangan o'qituvchilar:</strong>
                        <div className="teacher-chips">
                          {formData.teachers.map(teacherId => {
                            const teacher = teachers.find(t => t._id === teacherId);
                            return teacher ? (
                              <span key={teacherId} className="teacher-chip">
                                {teacher.firstName} {teacher.lastName}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      teachers: prev.teachers.filter(id => id !== teacherId)
                                    }));
                                  }}
                                  className="chip-remove"
                                >
                                  ✕
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-value">
                    {subject && subject.teachers && subject.teachers.length > 0 ? (
                      <div className="teacher-chips">
                        {subject.teachers.map(teacher => (
                          <span key={teacher._id || teacher} className="teacher-chip">
                            {typeof teacher === 'string'
                              ? teachers.find(t => t._id === teacher)?.firstName + ' ' + teachers.find(t => t._id === teacher)?.lastName
                              : `${teacher.firstName} ${teacher.lastName}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">O'qituvchilar biriktirilmagan</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">🎨</span>
              Ko'rinish
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Rang tanlash</label>
                {isEditing ? (
                  <div className="color-picker">
                    {colorOptions.map((option) => (
                      <label key={option.value} className="color-option">
                        <input
                          type="radio"
                          name="color"
                          value={option.value}
                          checked={formData.color === option.value}
                          onChange={handleChange}
                          className="color-radio"
                        />
                        <div
                          className={`color-box ${formData.color === option.value ? 'selected' : ''}`}
                          style={{ background: option.bg }}
                        >
                          {formData.color === option.value && <span className="check-mark">✓</span>}
                        </div>
                        <span className="color-label">{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="color-display">
                    <div
                      className="color-preview"
                      style={{
                        background: colorOptions.find(c => c.value === formData.color)?.bg || formData.color
                      }}
                    ></div>
                    <span className="color-name">
                      {colorOptions.find(c => c.value === formData.color)?.label || 'Tanlangan rang'}
                    </span>
                  </div>
                )}
              </div>

              {subject && subject.createdAt && (
                <div className="form-group">
                  <label className="form-label">Yaratilgan sana</label>
                  <div className="form-value">
                    {new Date(subject.createdAt).toLocaleDateString('uz-UZ', {
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
                    <span className="checkbox-text">Fan faol</span>
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
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 0.75rem;
          }

          .modal-container {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
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
            padding: 1rem;
            border-bottom: 1px solid #93c5fd;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            background: linear-gradient(135deg, #dbeafe, #eff6ff);
            border-radius: 12px 12px 0 0;
          }

          .header-left {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            flex: 1;
          }

          .subject-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.125rem;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
            flex-shrink: 0;
          }

          .modal-title {
            font-size: 0.9375rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.125rem;
          }

          .modal-subtitle {
            font-size: 0.75rem;
            color: #64748b;
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
            flex-shrink: 0;
          }

          .close-btn:hover {
            background: #3b82f6;
            color: white;
          }

          .error-message-container {
            margin: 0.75rem 1rem 0;
            padding: 0.75rem 1rem;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #991b1b;
            font-size: 0.75rem;
            box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
          }
          
          .error-message-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
          }
          
          .error-list {
            margin: 0.25rem 0 0 1.5rem;
            padding: 0;
            list-style-type: disc;
          }
          
          .error-list li {
            margin: 0.125rem 0;
            font-weight: 500;
          }

          .error-icon {
            font-size: 0.875rem;
          }

          .modal-body {
            padding: 1rem;
            overflow-y: auto;
            flex: 1;
          }

          .modal-body::-webkit-scrollbar {
            width: 6px;
          }

          .modal-body::-webkit-scrollbar-track {
            background: #f1f5f9;
          }

          .modal-body::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }

          .info-section {
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }

          .section-title {
            font-size: 0.8125rem;
            font-weight: 600;
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
            font-size: 0.75rem;
            font-weight: 600;
            color: #475569;
          }

          .form-input, .form-textarea {
            padding: 0.5rem 0.75rem;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.8125rem;
            transition: all 0.2s ease;
            background: white;
            color: #1e293b;
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
            font-size: 0.8125rem;
            color: #1e293b;
            font-weight: 500;
            min-height: 32px;
            display: flex;
            align-items: center;
          }

          .badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            display: inline-block;
          }

          .badge-code {
            background: #dbeafe;
            color: #1e40af;
            font-family: monospace;
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
            font-size: 0.8125rem;
            font-weight: 600;
            color: #1e293b;
          }

          .required {
            color: #ef4444;
            margin-left: 0.125rem;
          }

          /* Color Picker Styles */
          .color-picker {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }

          .color-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            cursor: pointer;
          }

          .color-radio {
            display: none;
          }

          .color-box {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            border: 2px solid transparent;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          }

          .color-box:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }

          .color-box.selected {
            border-color: white;
            transform: scale(1.05);
            box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
          }

          .check-mark {
            color: white;
            font-size: 1rem;
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }

          .color-label {
            font-size: 0.625rem;
            color: #64748b;
            font-weight: 600;
          }

          .color-display {
            display: flex;
            align-items: center;
            gap: 0.625rem;
          }

          .color-preview {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          }

          .color-name {
            font-size: 0.8125rem;
            color: #1e293b;
            font-weight: 600;
          }

          .modal-footer {
            padding: 0.875rem 1rem;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
            background: #f8fafc;
            border-radius: 0 0 12px 12px;
          }

          .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            font-size: 0.8125rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.375rem;
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-primary {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
            box-shadow: 0 2px 8px rgba(30, 58, 138, 0.25);
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.35);
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
            }

            .modal-header {
              padding: 0.875rem;
            }

            .header-left {
              gap: 0.5rem;
            }

            .subject-icon {
              width: 32px;
              height: 32px;
              font-size: 1rem;
            }

            .modal-title {
              font-size: 0.8125rem;
            }

            .modal-subtitle {
              font-size: 0.6875rem;
            }

            .modal-body {
              padding: 0.75rem;
            }

            .form-grid {
              grid-template-columns: 1fr;
              gap: 0.5rem;
            }

            .info-section {
              padding: 0.625rem;
              margin-bottom: 0.75rem;
            }

            .section-title {
              font-size: 0.75rem;
              margin-bottom: 0.5rem;
            }

            .color-picker {
              grid-template-columns: repeat(4, 1fr);
              gap: 0.375rem;
            }

            .color-box {
              width: 32px;
              height: 32px;
            }

            .color-label {
              font-size: 0.5625rem;
            }

            .modal-footer {
              padding: 0.75rem;
            }

            .btn {
              width: 100%;
              justify-content: center;
              padding: 0.5rem 0.75rem;
              font-size: 0.75rem;
            }
          }

          @media (max-width: 480px) {
            }
          }

          /* Teachers select styling */
          .teachers-select-container {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .form-select-multiple {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 0.8125rem;
            background: white;
          }

          .form-select-multiple:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          .form-select-multiple option {
            padding: 0.375rem;
            cursor: pointer;
          }

          .form-hint {
            color: #64748b;
            font-size: 0.6875rem;
            display: block;
          }

          .selected-teachers {
            padding: 0.5rem;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }

          .selected-teachers strong {
            display: block;
            margin-bottom: 0.375rem;
            color: #1e293b;
            font-size: 0.75rem;
          }

          .teacher-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
          }

          .teacher-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.375rem;
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
            border-radius: 4px;
            font-size: 0.6875rem;
            font-weight: 500;
          }

          .chip-remove {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            font-size: 0.625rem;
          }

          .chip-remove:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .text-muted {
            color: #94a3b8;
            font-style: italic;
            font-size: 0.75rem;
          }
        `}</style>
      </div>
    </div>
  );
};

export default SubjectProfile;
