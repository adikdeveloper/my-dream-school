import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import apiService from '../../services/apiService';

// Password validation utility
const validatePassword = (password) => {
  if (!password) return '';
  if (password.length < 6) return 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak';
  return '';
};

// Safe URL builder
const buildImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
  return `${baseUrl}${imagePath}`;
};

const TeacherProfile = ({ teacher, isOpen, onClose, onUpdate, mode = 'view' }) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'add');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    passportSeriesNumber: '',
    jshshir: '',
    address: '',
    dateOfBirth: '',
    specialty: '',
    experience: '',
    education: '',
    salaryPerLesson: '',
    password: '',
    isActive: true,
    subjects: []
  });
  const [originalFormData, setOriginalFormData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [allSubjects, setAllSubjects] = useState([]);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  const fileReaderRef = useRef(null);
  const imagePreviewUrlRef = useRef(null);

  // Fetch all subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!isOpen) return;

      try {
        const response = await apiService.getSubjects();
        setAllSubjects(response || []);
      } catch (err) {
        // Silently fail for subjects - not critical for profile viewing
      }
    };

    fetchSubjects();
  }, [isOpen]);

  // Initialize form data
  useEffect(() => {
    if (!isOpen) return;

    if (teacher) {
      const initialData = {
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        phone: teacher.phone || '',
        passportSeriesNumber: teacher.passportSeriesNumber || '',
        jshshir: teacher.jshshir || '',
        address: teacher.address || '',
        dateOfBirth: teacher.dateOfBirth || '',
        specialty: teacher.specialty || '',
        experience: teacher.experience || '',
        education: teacher.education || '',
        salaryPerLesson: teacher.salaryPerLesson || '',
        password: '',
        isActive: teacher.isActive !== undefined ? teacher.isActive : true,
        subjects: teacher.subjects?.map(s => s._id || s) || []
      };

      setFormData(initialData);
      setOriginalFormData(JSON.stringify(initialData));

      // Set image preview with safe URL
      if (teacher.profileImage) {
        const imageUrl = buildImageUrl(teacher.profileImage);
        setImagePreview(imageUrl);
      } else {
        setImagePreview(null);
      }

      setProfileImage(null);
      setShowPasswordChange(false);
    } else if (mode === 'add') {
      const initialData = {
        firstName: '',
        lastName: '',
        phone: '',
        passportSeriesNumber: '',
        jshshir: '',
        address: '',
        dateOfBirth: '',
        specialty: '',
        experience: '',
        education: '',
        salaryPerLesson: '',
        password: '',
        isActive: true,
        subjects: []
      };

      setFormData(initialData);
      setOriginalFormData(JSON.stringify(initialData));
      setImagePreview(null);
      setProfileImage(null);
      setShowPasswordChange(false);
    }

    setIsEditing(mode === 'edit' || mode === 'add');
    setError('');
    setValidationErrors({});
    setHasUnsavedChanges(false);
  }, [teacher, mode, isOpen]);

  // Check for unsaved changes
  useEffect(() => {
    if (!isEditing || !originalFormData) {
      setHasUnsavedChanges(false);
      return;
    }

    const currentData = JSON.stringify(formData);
    setHasUnsavedChanges(currentData !== originalFormData || profileImage !== null);
  }, [formData, isEditing, originalFormData, profileImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel FileReader if in progress
      if (fileReaderRef.current) {
        fileReaderRef.current.abort();
      }

      // Revoke object URL to prevent memory leak
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, []);

  const formatPhoneNumber = useCallback((value) => {
    const digits = value.replace(/\D/g, '');
    let phoneDigits = digits.startsWith('998') ? digits.substring(3) : digits;
    phoneDigits = phoneDigits.substring(0, 9);

    if (phoneDigits.length === 0) return '';
    if (phoneDigits.length <= 2) return `+998-${phoneDigits}`;
    if (phoneDigits.length <= 5) return `+998-${phoneDigits.slice(0, 2)}-${phoneDigits.slice(2)}`;
    if (phoneDigits.length <= 7) return `+998-${phoneDigits.slice(0, 2)}-${phoneDigits.slice(2, 5)}-${phoneDigits.slice(5)}`;
    return `+998-${phoneDigits.slice(0, 2)}-${phoneDigits.slice(2, 5)}-${phoneDigits.slice(5, 7)}-${phoneDigits.slice(7, 9)}`;
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'phone') {
      setFormData(prev => ({
        ...prev,
        [name]: formatPhoneNumber(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [formatPhoneNumber, validationErrors]);

  const handleSubjectToggle = useCallback((subjectId) => {
    setFormData(prev => {
      const subjects = prev.subjects || [];
      if (subjects.includes(subjectId)) {
        return { ...prev, subjects: subjects.filter(id => id !== subjectId) };
      } else {
        return { ...prev, subjects: [...subjects, subjectId] };
      }
    });
  }, []);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Iltimos, rasm faylini tanlang');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    setProfileImage(file);
    setImageUploadProgress(0);

    // Create preview with proper cleanup
    const reader = new FileReader();
    fileReaderRef.current = reader;

    reader.onloadstart = () => {
      setImageUploadProgress(10);
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 90);
        setImageUploadProgress(progress);
      }
    };

    reader.onloadend = () => {
      if (reader.result) {
        // Revoke previous preview URL
        if (imagePreviewUrlRef.current) {
          URL.revokeObjectURL(imagePreviewUrlRef.current);
        }

        setImagePreview(reader.result);
        setImageUploadProgress(100);
        setTimeout(() => setImageUploadProgress(0), 500);
      }
      fileReaderRef.current = null;
    };

    reader.onerror = () => {
      setError('Rasmni yuklashda xatolik yuz berdi');
      setImageUploadProgress(0);
      fileReaderRef.current = null;
    };

    reader.readAsDataURL(file);
    setError('');
  }, []);

  const removeImage = useCallback(() => {
    setProfileImage(null);
    setImagePreview(null);

    // Revoke preview URL
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.firstName?.trim()) {
      errors.firstName = 'Ism kiritilishi shart';
    }

    if (!formData.lastName?.trim()) {
      errors.lastName = 'Familiya kiritilishi shart';
    }

    if (!formData.passportSeriesNumber?.trim()) {
      errors.passportSeriesNumber = 'Passport seriyasi va raqami kiritilishi shart';
    } else if (!/^[A-Z]{2}\d{7}$/.test(formData.passportSeriesNumber.toUpperCase())) {
      errors.passportSeriesNumber = 'Passport formati noto\'g\'ri (masalan: KA1234567)';
    }

    if (formData.jshshir?.trim() && !/^\d{14}$/.test(formData.jshshir)) {
      errors.jshshir = 'JSHSHIR 14 ta raqamdan iborat bo\'lishi kerak';
    }

    // Soatlik maosh validation
    if (!formData.salaryPerLesson && formData.salaryPerLesson !== 0) {
      errors.salaryPerLesson = '1 soatlik maosh kiritilishi shart';
    } else if (isNaN(formData.salaryPerLesson) || Number(formData.salaryPerLesson) < 0) {
      errors.salaryPerLesson = 'Maosh musbat son bo\'lishi kerak';
    }

    if (mode === 'add') {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        errors.password = passwordError;
      }
    } else if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        errors.password = passwordError;
      }
    }

    return errors;
  }, [formData, mode]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Iltimos, barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('firstName', formData.firstName.trim());
      submitData.append('lastName', formData.lastName.trim());
      submitData.append('phone', formData.phone);
      submitData.append('passportSeriesNumber', formData.passportSeriesNumber.trim().toUpperCase());
      submitData.append('jshshir', formData.jshshir.trim());
      submitData.append('address', formData.address);
      submitData.append('dateOfBirth', formData.dateOfBirth);
      submitData.append('specialty', formData.specialty);
      submitData.append('experience', formData.experience);
      submitData.append('education', formData.education);
      submitData.append('salaryPerLesson', Number(formData.salaryPerLesson) || 0);
      submitData.append('isActive', formData.isActive);

      if (mode === 'add') {
        submitData.append('password', formData.password);
        submitData.append('role', 'teacher');
      } else if (formData.password && formData.password.length >= 6) {
        submitData.append('password', formData.password);
      }

      // Add subjects
      if (formData.subjects && formData.subjects.length > 0) {
        formData.subjects.forEach(subjectId => {
          submitData.append('subjects[]', subjectId);
        });
      }

      if (profileImage) {
        submitData.append('profileImage', profileImage);
      }

      let savedTeacher = null;
      if (mode === 'add') {
        savedTeacher = await apiService.createUser(submitData);
      } else {
        savedTeacher = await apiService.updateUser(teacher._id, submitData);
      }

      const savedTeacherId = mode === 'add'
        ? (savedTeacher?.user?._id || savedTeacher?._id)
        : teacher?._id;
      const salaryRate = Number(formData.salaryPerLesson);

      if (savedTeacherId && Number.isFinite(salaryRate) && salaryRate >= 0) {
        await apiService.updateTeacherSalaryRate(savedTeacherId, salaryRate);
      }

      onUpdate();
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Ma\'lumotlarni saqlashda xatolik yuz berdi';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, mode, profileImage, teacher, validateForm, onUpdate, onClose]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Saqlanmagan o\'zgarishlar bor. Haqiqatan ham chiqmoqchimisiz?'
      );
      if (!confirmed) return;
    }

    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleDownload = useCallback((format) => {
    if (!teacher) return;

    try {
      if (format === 'excel') {
        downloadExcel();
      } else if (format === 'pdf') {
        downloadPDF();
      }
    } catch (err) {
      setError('Yuklab olishda xatolik yuz berdi');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher]);

  const downloadExcel = useCallback(() => {
    const csvContent = [
      ['O\'qituvchi ma\'lumotlari', ''],
      [''],
      ['Ism', formData.firstName],
      ['Familiya', formData.lastName],
      ['Passport', formData.passportSeriesNumber || '—'],
      ['JSHSHIR', formData.jshshir || '—'],
      ['Telefon', formData.phone || '—'],
      ['Tug\'ilgan sana', formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('uz-UZ') : '—'],
      ['Manzil', formData.address || '—'],
      [''],
      ['Kasbiy ma\'lumotlar', ''],
      ['Mutaxassislik', formData.specialty || '—'],
      ['Ish tajribasi', formData.experience ? formData.experience + ' yil' : '—'],
      ['Ma\'lumot', formData.education || '—'],
      ['1 soatlik maosh', formData.salaryPerLesson ? formData.salaryPerLesson + ' so\'m' : '—'],
      [''],
      ['Ro\'yxatdan o\'tgan', teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('uz-UZ') : '—']
    ].map(row => row.join(',')).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${formData.firstName}_${formData.lastName}_malumotlar.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [formData, teacher]);

  const downloadPDF = useCallback(() => {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>O'qituvchi ma'lumotlari - ${formData.firstName} ${formData.lastName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: white;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #f59e0b;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #f59e0b;
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header p {
            color: #64748b;
            font-size: 14px;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            background: #f59e0b;
            color: white;
            padding: 10px 15px;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            padding: 10px 15px;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            width: 200px;
            color: #475569;
          }
          .info-value {
            flex: 1;
            color: #1e293b;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>O'qituvchi ma'lumotlari</h1>
          <p>${formData.firstName} ${formData.lastName}</p>
        </div>

        <div class="section">
          <div class="section-title">Shaxsiy ma'lumotlar</div>
          <div class="info-row">
            <div class="info-label">Ism:</div>
            <div class="info-value">${formData.firstName}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Familiya:</div>
            <div class="info-value">${formData.lastName}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Passport:</div>
            <div class="info-value">${formData.passportSeriesNumber || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">JSHSHIR:</div>
            <div class="info-value">${formData.jshshir || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Tug'ilgan sana:</div>
            <div class="info-value">${formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Aloqa ma'lumotlari</div>
          <div class="info-row">
            <div class="info-label">Telefon:</div>
            <div class="info-value">${formData.phone || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Manzil:</div>
            <div class="info-value">${formData.address || '—'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Kasbiy ma'lumotlar</div>
          <div class="info-row">
            <div class="info-label">Mutaxassislik:</div>
            <div class="info-value">${formData.specialty || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Ish tajribasi:</div>
            <div class="info-value">${formData.experience ? formData.experience + ' yil' : '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Ma'lumot:</div>
            <div class="info-value">${formData.education || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">1 soatlik maosh:</div>
            <div class="info-value" style="color: #059669; font-weight: bold;">${formData.salaryPerLesson ? Number(formData.salaryPerLesson).toLocaleString('uz-UZ') + ' so\'m' : '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Ro'yxatdan o'tgan:</div>
            <div class="info-value">${teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
          </div>
        </div>

        <div class="footer">
          <p>Chop etilgan sana: ${new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p>My Dream School</p>
        </div>
      </body>
      </html>
    `;

    // Check if popup will be blocked
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
      setError('Popup blocker tomonidan to\'sqinlik qilindi. Iltimos, popup\'larni yoqing.');
      return;
    }

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [formData, teacher]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            <div className="teacher-avatar-large" style={imagePreview ? {
              backgroundImage: `url(${imagePreview})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'transparent'
            } : {}}>
              {!imagePreview && (
                <>
                  {formData.firstName?.charAt(0) || ''}{formData.lastName?.charAt(0) || ''}
                </>
              )}
            </div>
            <div>
              <h2 className="modal-title">
                {mode === 'add' ? 'Yangi o\'qituvchi qo\'shish' : isEditing ? 'O\'qituvchi ma\'lumotlarini tahrirlash' : 'O\'qituvchi profili'}
              </h2>
              <p className="modal-subtitle">
                {!isEditing && teacher && `${formData.firstName} ${formData.lastName}`}
                {hasUnsavedChanges && isEditing && <span className="unsaved-indicator"> • Saqlanmagan o\'zgarishlar</span>}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={handleCancel} aria-label="Yopish">✕</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          {isEditing && (
            <div className="info-section">
              <h3 className="section-title">
                <span className="section-icon">📷</span>
                Profil rasmi
              </h3>
              <div className="image-upload-container">
                <div className="image-preview-wrapper">
                  <div className="image-preview" style={imagePreview ? {
                    backgroundImage: `url(${imagePreview})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}>
                    {!imagePreview && (
                      <div className="image-placeholder">
                        <span className="placeholder-icon">📷</span>
                        <span className="placeholder-text">Rasm tanlang</span>
                      </div>
                    )}
                  </div>
                  {imagePreview && (
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={removeImage}
                      aria-label="Rasmni o'chirish"
                    >
                      ✕
                    </button>
                  )}
                  {imageUploadProgress > 0 && imageUploadProgress < 100 && (
                    <div className="upload-progress-bar">
                      <div className="upload-progress-fill" style={{ width: `${imageUploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
                <div className="image-upload-actions">
                  <label className="upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                      disabled={loading}
                    />
                    <span className="upload-icon">📁</span>
                    <span>{imagePreview ? 'Boshqa rasm tanlash' : 'Rasm yuklash'}</span>
                  </label>
                  <p className="upload-hint">JPG, PNG yoki GIF (maksimal 5MB)</p>
                </div>
              </div>
            </div>
          )}

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">👤</span>
              Shaxsiy ma'lumotlar
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">
                  Ism <span className="required">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`form-input ${validationErrors.firstName ? 'input-error' : ''}`}
                      required
                      disabled={loading}
                    />
                    {validationErrors.firstName && (
                      <span className="field-error">{validationErrors.firstName}</span>
                    )}
                  </>
                ) : (
                  <div className="form-value">{formData.firstName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lastName">
                  Familiya <span className="required">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`form-input ${validationErrors.lastName ? 'input-error' : ''}`}
                      required
                      disabled={loading}
                    />
                    {validationErrors.lastName && (
                      <span className="field-error">{validationErrors.lastName}</span>
                    )}
                  </>
                ) : (
                  <div className="form-value">{formData.lastName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="passportSeriesNumber">
                  Passport seriyasi va raqami <span className="required">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      id="passportSeriesNumber"
                      type="text"
                      name="passportSeriesNumber"
                      value={formData.passportSeriesNumber}
                      onChange={(e) => {
                        let value = e.target.value.toUpperCase();
                        // Remove all non-alphanumeric characters
                        value = value.replace(/[^A-Z0-9]/g, '');
                        // Format: 2 letters + 7 digits
                        const letters = value.replace(/[^A-Z]/g, '').substring(0, 2);
                        const digits = value.replace(/[^0-9]/g, '').substring(0, 7);
                        const formatted = letters + digits;
                        if (formatted.length <= 9) {
                          handleChange({ target: { name: 'passportSeriesNumber', value: formatted } });
                        }
                      }}
                      className={`form-input ${validationErrors.passportSeriesNumber ? 'input-error' : ''}`}
                      placeholder="KA1234567"
                      required
                      disabled={loading}
                      maxLength={9}
                      style={{ textTransform: 'uppercase' }}
                    />
                    {validationErrors.passportSeriesNumber && (
                      <span className="field-error">{validationErrors.passportSeriesNumber}</span>
                    )}
                    {!validationErrors.passportSeriesNumber && (
                      <p className="field-hint">2 ta harf + 7 ta raqam (masalan: KA1234567)</p>
                    )}
                  </>
                ) : (
                  <div className="form-value">
                    <span className="badge badge-passport">{formData.passportSeriesNumber || '—'}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="jshshir">
                  JSHSHIR
                </label>
                {isEditing ? (
                  <>
                    <input
                      id="jshshir"
                      type="text"
                      name="jshshir"
                      value={formData.jshshir}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 14) {
                          handleChange({ target: { name: 'jshshir', value } });
                        }
                      }}
                      className={`form-input ${validationErrors.jshshir ? 'input-error' : ''}`}
                      placeholder="14 ta raqam"
                      disabled={loading}
                      maxLength={14}
                    />
                    {validationErrors.jshshir && (
                      <span className="field-error">{validationErrors.jshshir}</span>
                    )}
                    {!validationErrors.jshshir && (
                      <p className="field-hint">14 ta raqamdan iborat JSHSHIR (ixtiyoriy)</p>
                    )}
                  </>
                ) : (
                  <div className="form-value">{formData.jshshir || '—'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dateOfBirth">
                  Tug'ilgan sana
                </label>
                {isEditing ? (
                  <input
                    id="dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="form-input"
                    disabled={loading}
                  />
                ) : (
                  <div className="form-value">
                    {formData.dateOfBirth
                      ? new Date(formData.dateOfBirth).toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : '—'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">📞</span>
              Aloqa ma'lumotlari
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Telefon raqami
                </label>
                {isEditing ? (
                  <input
                    id="phone"
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="+998-__-___-__-__"
                    disabled={loading}
                  />
                ) : (
                  <div className="form-value">{formData.phone || '—'}</div>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label" htmlFor="address">
                  Manzil
                </label>
                {isEditing ? (
                  <input
                    id="address"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    disabled={loading}
                  />
                ) : (
                  <div className="form-value">{formData.address || '—'}</div>
                )}
              </div>

              {mode === 'add' && (
                <div className="form-group full-width">
                  <label className="form-label" htmlFor="password">
                    Parol <span className="required">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`form-input ${validationErrors.password ? 'input-error' : ''}`}
                    placeholder="Kamida 6 ta belgi"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  {validationErrors.password ? (
                    <span className="field-error">{validationErrors.password}</span>
                  ) : (
                    <p className="field-hint">O'qituvchi tizimga kirishi uchun parol (kamida 6 ta belgi)</p>
                  )}
                </div>
              )}

              {mode === 'edit' && isEditing && (
                <div className="form-group full-width">
                  {!showPasswordChange ? (
                    <button
                      type="button"
                      className="btn-change-password"
                      onClick={() => setShowPasswordChange(true)}
                      disabled={loading}
                    >
                      <span className="password-icon">🔐</span>
                      <span>Parolni o'zgartirish</span>
                    </button>
                  ) : (
                    <div className="password-change-section">
                      <div className="password-header">
                        <label className="form-label" htmlFor="newPassword">Yangi parol</label>
                        <button
                          type="button"
                          className="btn-cancel-password"
                          onClick={() => {
                            setShowPasswordChange(false);
                            setFormData(prev => ({ ...prev, password: '' }));
                            setValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.password;
                              return newErrors;
                            });
                          }}
                          disabled={loading}
                        >
                          Bekor qilish
                        </button>
                      </div>
                      <input
                        id="newPassword"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`form-input ${validationErrors.password ? 'input-error' : ''}`}
                        placeholder="Kamida 6 ta belgi"
                        minLength={6}
                        disabled={loading}
                      />
                      {validationErrors.password ? (
                        <span className="field-error">{validationErrors.password}</span>
                      ) : (
                        <p className="field-hint">Bo'sh qoldirilsa parol o'zgartirilmaydi</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">🎓</span>
              Kasbiy ma'lumotlar
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="specialty">
                  Mutaxassislik
                </label>
                {isEditing ? (
                  <input
                    id="specialty"
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Matematika, Ingliz tili, ..."
                    disabled={loading}
                  />
                ) : (
                  <div className="form-value">
                    <span className="badge badge-specialty">{formData.specialty || '—'}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="experience">
                  Ish tajribasi (yil)
                </label>
                {isEditing ? (
                  <input
                    id="experience"
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="form-input"
                    min="0"
                    placeholder="5"
                    disabled={loading}
                  />
                ) : (
                  <div className="form-value">
                    {formData.experience ? `${formData.experience} yil` : '—'}
                  </div>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label" htmlFor="education">
                  Ma'lumoti
                </label>
                {isEditing ? (
                  <input
                    id="education"
                    type="text"
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Toshkent Davlat Pedagogika Universiteti, Bakalavr, ..."
                    disabled={loading}
                  />
                ) : (
                  <div className="form-value">{formData.education || '—'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label required" htmlFor="salaryPerLesson">
                  1 soatlik maosh (so'm) *
                </label>
                {isEditing ? (
                  <>
                    <input
                      id="salaryPerLesson"
                      type="number"
                      name="salaryPerLesson"
                      value={formData.salaryPerLesson}
                      onChange={handleChange}
                      className={`form-input ${validationErrors.salaryPerLesson ? 'error' : ''}`}
                      placeholder="50000"
                      min="0"
                      step="1000"
                      disabled={loading}
                      required
                    />
                    {validationErrors.salaryPerLesson && (
                      <span className="error-text">{validationErrors.salaryPerLesson}</span>
                    )}
                    <span className="input-hint">1 ta dars (soat) uchun to'lanadigan summa</span>
                  </>
                ) : (
                  <div className="form-value salary-value">
                    {formData.salaryPerLesson ? `${Number(formData.salaryPerLesson).toLocaleString('uz-UZ')} so'm` : '—'}
                  </div>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">O'qitiladigan fanlar</label>
                {isEditing ? (
                  <div className="subjects-selector">
                    {allSubjects.length > 0 ? (
                      <div className="subjects-grid">
                        {allSubjects.map(subject => (
                          <label key={subject._id} className="subject-checkbox">
                            <input
                              type="checkbox"
                              checked={(formData.subjects || []).includes(subject._id)}
                              onChange={() => handleSubjectToggle(subject._id)}
                              disabled={loading}
                            />
                            <span className="subject-name">{subject.name}</span>
                            <span className="subject-code">({subject.code})</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="no-subjects">Hozircha fanlar mavjud emas. Iltimos, avval fanlar qo'shing.</p>
                    )}
                  </div>
                ) : (
                  <div className="form-value">
                    {teacher?.subjects && teacher.subjects.length > 0 ? (
                      <div className="subjects-list">
                        {teacher.subjects.map(subject => (
                          <span key={subject._id} className="badge badge-subject">
                            {subject.name}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </div>
                )}
              </div>

              {teacher && teacher.createdAt && (
                <div className="form-group">
                  <label className="form-label">Ro'yxatdan o'tgan sana</label>
                  <div className="form-value">
                    {new Date(teacher.createdAt).toLocaleDateString('uz-UZ', {
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
                      disabled={loading}
                    />
                    <span className="checkbox-text">O'qituvchi faol</span>
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
              <div className="footer-left">
                <button
                  type="button"
                  className="btn btn-download btn-excel"
                  onClick={() => handleDownload('excel')}
                  title="Excel formatda yuklab olish"
                >
                  <span className="download-icon">📊</span>
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  className="btn btn-download btn-pdf"
                  onClick={() => handleDownload('pdf')}
                  title="PDF formatda yuklab olish"
                >
                  <span className="download-icon">📄</span>
                  <span>PDF</span>
                </button>
              </div>
              <div className="footer-right">
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
              </div>
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

          .teacher-avatar-large {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1rem;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
            flex-shrink: 0;
          }

          .modal-title {
            font-size: 1.0625rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.125rem;
          }

          .modal-subtitle {
            font-size: 0.75rem;
            color: #64748b;
            font-weight: 500;
          }

          .unsaved-indicator {
            color: #ef4444;
            font-weight: 600;
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
            padding: 0.625rem 0.875rem;
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
            font-size: 0.875rem;
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

          .form-input {
            padding: 0.5rem 0.75rem;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.75rem;
            transition: all 0.2s ease;
            background: white;
            color: #1e293b;
            font-weight: 500;
          }

          .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          .form-input:disabled {
            background: #f8fafc;
            cursor: not-allowed;
            opacity: 0.6;
          }

          .form-input.input-error {
            border-color: #ef4444;
          }

          .field-error {
            color: #ef4444;
            font-size: 0.625rem;
            font-weight: 600;
            margin-top: 0;
          }

          .field-hint {
            font-size: 0.625rem;
            color: #64748b;
            margin-top: 0.125rem;
            font-style: italic;
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

          .form-value.salary-value {
            font-size: 0.875rem;
            font-weight: 700;
            color: #059669;
          }

          .input-hint {
            display: block;
            font-size: 0.625rem;
            color: #64748b;
            margin-top: 0.125rem;
            font-style: italic;
          }

          .form-label.required::after {
            content: '';
            color: #ef4444;
            margin-left: 0.25rem;
          }

          .badge {
            padding: 0.1875rem 0.5rem;
            border-radius: 4px;
            font-size: 0.6875rem;
            font-weight: 700;
            display: inline-block;
          }

          .badge-email {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
            color: #1e40af;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          }

          .badge-passport {
            background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
            color: #3730a3;
            box-shadow: 0 2px 8px rgba(67, 56, 202, 0.3);
            font-weight: 800;
            letter-spacing: 1px;
          }

          .badge-specialty {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            color: #92400e;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
          }

          .badge-subject {
            background: linear-gradient(135deg, #d1fae5, #a7f3d0);
            color: #065f46;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            margin-right: 0.5rem;
            margin-bottom: 0.5rem;
          }

          /* Image Upload Styles */
          .image-upload-container {
            display: flex;
            gap: 2rem;
            align-items: center;
          }

          .image-preview-wrapper {
            position: relative;
            flex-shrink: 0;
          }

          .image-preview {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #f8fafc;
          }

          .image-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
          }

          .placeholder-icon {
            font-size: 1.5rem;
            opacity: 0.3;
          }

          .placeholder-text {
            font-size: 0.625rem;
            color: #94a3b8;
            font-weight: 600;
          }

          .remove-image-btn {
            position: absolute;
            top: 0;
            right: 0;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ef4444;
            color: white;
            border: 2px solid white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.625rem;
            font-weight: 700;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
          }

          .remove-image-btn:hover {
            background: #dc2626;
            transform: scale(1.1);
          }

          .upload-progress-bar {
            position: absolute;
            bottom: 10px;
            left: 10px;
            right: 10px;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            overflow: hidden;
          }

          .upload-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
            transition: width 0.3s ease;
          }

          .image-upload-actions {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .upload-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.5rem 0.875rem;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 600;
            font-size: 0.6875rem;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
            width: fit-content;
          }

          .upload-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }

          .upload-icon {
            font-size: 0.875rem;
          }

          .upload-hint {
            font-size: 0.5625rem;
            color: #64748b;
            margin: 0;
          }

          /* Subjects Selector Styles */
          .subjects-selector {
            padding: 0.625rem;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }

          .subjects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.375rem;
          }

          .subject-checkbox {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.375rem 0.5rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .subject-checkbox:hover {
            border-color: #10b981;
            background: #f0fdf4;
          }

          .subject-checkbox input[type="checkbox"] {
            width: 14px;
            height: 14px;
            cursor: pointer;
            accent-color: #10b981;
          }

          .subject-checkbox input[type="checkbox"]:checked + .subject-name {
            font-weight: 700;
            color: #065f46;
          }

          .subject-checkbox input[type="checkbox"]:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .subject-name {
            flex: 1;
            font-size: 0.6875rem;
            font-weight: 600;
            color: #1e293b;
          }

          .subject-code {
            font-size: 0.5625rem;
            color: #64748b;
            font-weight: 500;
          }

          .subjects-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .no-subjects {
            font-size: 0.6875rem;
            color: #64748b;
            font-style: italic;
            text-align: center;
            padding: 0.625rem;
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
            transition: all 0.2s ease;
          }

          .checkbox-label:hover {
            border-color: #3b82f6;
          }

          .checkbox-input {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: #3b82f6;
          }

          .checkbox-input:disabled {
            cursor: not-allowed;
            opacity: 0.5;
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

          /* Password Change Styles */
          .btn-change-password {
            width: 100%;
            padding: 0.5rem 0.875rem;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
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
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
          }

          .btn-change-password:hover:not(:disabled) {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
          }

          .btn-change-password:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .password-icon {
            font-size: 0.875rem;
          }

          .password-change-section {
            width: 100%;
            padding: 0.75rem;
            background: #eff6ff;
            border: 1px solid #dbeafe;
            border-radius: 6px;
          }

          .password-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }

          .btn-cancel-password {
            background: #fee2e2;
            color: #991b1b;
            border: none;
            padding: 0.375rem 0.625rem;
            border-radius: 4px;
            font-size: 0.625rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-cancel-password:hover:not(:disabled) {
            background: #fecaca;
            transform: scale(1.05);
          }

          .btn-cancel-password:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .modal-footer {
            padding: 0.875rem 1.25rem;
            border-top: 1px solid #f1f5f9;
            display: flex;
            gap: 0.625rem;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border-radius: 0 0 12px 12px;
          }

          .footer-left {
            display: flex;
            gap: 0.5rem;
          }

          .footer-right {
            display: flex;
            gap: 0.5rem;
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
            gap: 0.375rem;
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

          .btn-download {
            padding: 0.375rem 0.625rem;
            font-size: 0.6875rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .btn-download .download-icon {
            font-size: 0.75rem;
          }

          .btn-excel {
            background: linear-gradient(135deg, #16a34a, #22c55e);
            color: white;
            box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
          }

          .btn-excel:hover {
            background: linear-gradient(135deg, #15803d, #16a34a);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(22, 163, 74, 0.35);
          }

          .btn-pdf {
            background: linear-gradient(135deg, #dc2626, #ef4444);
            color: white;
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
          }

          .btn-pdf:hover {
            background: linear-gradient(135deg, #b91c1c, #dc2626);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);
          }

          @media (max-width: 768px) {
            .modal-container {
              max-height: 95vh;
              margin: 0.5rem;
            }

            .modal-header {
              padding: 1.5rem;
            }

            .header-left {
              flex-direction: column;
              align-items: flex-start;
              gap: 1rem;
            }

            .teacher-avatar-large {
              width: 60px;
              height: 60px;
              font-size: 1.25rem;
            }

            .modal-title {
              font-size: 1.25rem;
            }

            .modal-body {
              padding: 1.5rem;
            }

            .form-grid {
              grid-template-columns: 1fr;
            }

            .image-upload-container {
              flex-direction: column;
              align-items: flex-start;
            }

            .image-preview {
              width: 120px;
              height: 120px;
            }

            .placeholder-icon {
              font-size: 2.5rem;
            }

            .upload-btn {
              width: 100%;
              justify-content: center;
            }

            .modal-footer {
              padding: 1.25rem 1.5rem;
              flex-direction: column;
            }

            .footer-left,
            .footer-right {
              width: 100%;
            }

            .footer-left {
              order: 2;
            }

            .footer-right {
              order: 1;
            }

            .btn {
              width: 100%;
              justify-content: center;
            }

            .btn-download {
              flex: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

TeacherProfile.propTypes = {
  teacher: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['view', 'edit', 'add'])
};

export default TeacherProfile;
