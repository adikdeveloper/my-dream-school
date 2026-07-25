import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';

const StudentProfile = ({ student, isOpen, onClose, onUpdate, mode = 'view' }) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    passportNumber: '',
    phone: '',
    studentId: '',
    address: '',
    dateOfBirth: '',
    parentName: '',
    parentPhone: '',
    parentJshshir: '',
    password: '',
    isActive: true,
    classId: '',
    registrationDate: '',
    leftDate: '',
    monthlyFee: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [classes, setClasses] = useState([]);

  // Load classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await apiService.getClasses();
        // Backend returns {classes: [...], pagination: {...}}
        setClasses(response?.classes || response || []);
      } catch (err) {
        // Silently handle - not critical
        setClasses([]);
      }
    };
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        passportNumber: student.passportNumber || '',
        phone: student.phone || '',
        studentId: student.studentId || '',
        address: student.address || '',
        dateOfBirth: student.dateOfBirth || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        parentJshshir: student.parentJshshir || '',
        password: '',
        isActive: student.isActive !== undefined ? student.isActive : true,
        classId: student.classId?._id || student.classId || '',
        registrationDate: student.registrationDate || student.createdAt || '',
        leftDate: student.leftDate || '',
        monthlyFee: student.monthlyFee || ''
      });
      // Set image preview with full URL if exists
      if (student.profileImage) {
        const imageUrl = student.profileImage.startsWith('http')
          ? student.profileImage
          : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${student.profileImage}`;
        setImagePreview(imageUrl);
      } else {
        setImagePreview(null);
      }
      setProfileImage(null);
      setShowPasswordChange(false);
    } else if (mode === 'add') {
      // Reset form for new student
      setFormData({
        firstName: '',
        lastName: '',
        passportNumber: '',
        phone: '',
        studentId: '',
        address: '',
        dateOfBirth: '',
        parentName: '',
        parentPhone: '',
        parentJshshir: '',
        password: '',
        isActive: true,
        classId: '',
        registrationDate: new Date().toISOString().split('T')[0],
        leftDate: '',
        monthlyFee: ''
      });
      setImagePreview(null);
      setProfileImage(null);
      setShowPasswordChange(false);
    }
    setIsEditing(mode === 'edit' || mode === 'add');
  }, [student, mode]);

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Remove leading 998 if present
    let phoneDigits = digits;
    if (digits.startsWith('998')) {
      phoneDigits = digits.substring(3);
    }

    // Limit to 9 digits
    phoneDigits = phoneDigits.substring(0, 9);

    // Format: +998-XX-XXX-XX-XX
    if (phoneDigits.length === 0) return '';
    if (phoneDigits.length <= 2) return `+998-${phoneDigits}`;
    if (phoneDigits.length <= 5) return `+998-${phoneDigits.slice(0, 2)}-${phoneDigits.slice(2)}`;
    if (phoneDigits.length <= 7) return `+998-${phoneDigits.slice(0, 2)}-${phoneDigits.slice(2, 5)}-${phoneDigits.slice(5)}`;
    return `+998-${phoneDigits.slice(0, 2)}-${phoneDigits.slice(2, 5)}-${phoneDigits.slice(5, 7)}-${phoneDigits.slice(7, 9)}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'phone' || name === 'parentPhone') {
      setFormData(prev => ({
        ...prev,
        [name]: formatPhoneNumber(value)
      }));
    } else if (name === 'isActive' && type === 'checkbox') {
      // When activating student, clear leftDate
      // When deactivating, set leftDate to today if not already set
      setFormData(prev => ({
        ...prev,
        isActive: checked,
        leftDate: checked ? '' : (prev.leftDate || new Date().toISOString().split('T')[0])
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.firstName || !formData.firstName.trim()) {
        setError('Ism kiritilishi shart');
        setLoading(false);
        return;
      }

      if (!formData.lastName || !formData.lastName.trim()) {
        setError('Familiya kiritilishi shart');
        setLoading(false);
        return;
      }

      if (!formData.phone || formData.phone.trim().length < 10) {
        setError('To\'g\'ri telefon raqam kiriting');
        setLoading(false);
        return;
      }

      // Validate leftDate for inactive students
      if (!formData.isActive && !formData.leftDate) {
        setError('Nofaol o\'quvchi uchun maktabdan ketgan sana kiritilishi shart');
        setLoading(false);
        return;
      }

      if (mode === 'add') {
        // Validate password
        if (!formData.password || formData.password.length < 6) {
          setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
          setLoading(false);
          return;
        }
      } else if (formData.password && formData.password.length < 6 && formData.password.length > 0) {
        // If password is being changed, validate it
        setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
        setLoading(false);
        return;
      }

      if (mode === 'add') {

        // Create FormData for multipart/form-data
        const submitData = new FormData();
        submitData.append('firstName', formData.firstName);
        submitData.append('lastName', formData.lastName);
        submitData.append('passportNumber', formData.passportNumber);
        submitData.append('phone', formData.phone);
        submitData.append('studentId', formData.studentId);
        submitData.append('address', formData.address);
        submitData.append('dateOfBirth', formData.dateOfBirth);
        submitData.append('parentName', formData.parentName);
        submitData.append('parentPhone', formData.parentPhone);
        submitData.append('parentJshshir', formData.parentJshshir);
        submitData.append('password', formData.password);
        submitData.append('role', 'student');
        submitData.append('isActive', formData.isActive);
        if (formData.classId) {
          submitData.append('classId', formData.classId);
        }
        if (formData.registrationDate) {
          submitData.append('registrationDate', formData.registrationDate);
        }
        if (formData.monthlyFee) {
          submitData.append('monthlyFee', formData.monthlyFee);
        }

        if (profileImage) {
          submitData.append('profileImage', profileImage);
        }

        await apiService.createUser(submitData);
        onUpdate();
        onClose();
      } else {
        // Update existing student
        const updateData = new FormData();
        Object.keys(formData).forEach(key => {
          if (key === 'password') {
            // Skip password here, handle separately below
            return;
          }

          // For leftDate: if student is active, always send empty string to clear it
          // If inactive and has a value, send the value
          if (key === 'leftDate') {
            if (formData.isActive) {
              updateData.append(key, ''); // Send empty string to clear when active
            } else if (formData[key] !== '') {
              updateData.append(key, formData[key]);
            }
            return;
          }

          if (formData[key] !== '') {
            updateData.append(key, formData[key]);
          }
        });

        // Add password if it's being changed
        if (formData.password && formData.password.length >= 6) {
          updateData.append('password', formData.password);
        }

        if (profileImage) {
          updateData.append('profileImage', profileImage);
        }

        await apiService.updateUser(student._id, updateData);
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
    // Bekor qilish bosilganda har doim yopish
    onClose();
  };

  if (!isOpen) return null;

  const getClassInfo = () => {
    if (student && student.classId) {
      return `${student.classId.grade}-${student.classId.section}`;
    }
    return 'Biriktirilmagan';
  };

  const handleDownload = (format) => {
    if (!student) return;

    if (format === 'excel') {
      downloadExcel();
    } else if (format === 'pdf') {
      downloadPDF();
    }
  };

  const downloadExcel = () => {
    // Create CSV content
    const csvContent = [
      ['O\'quvchi ma\'lumotlari', ''],
      [''],
      ['Ism', formData.firstName],
      ['Familiya', formData.lastName],
      ['O\'quvchi ID', formData.studentId || '—'],
      ['Passport/Guvohnoma', formData.passportNumber || '—'],
      ['Tug\'ilgan sana', formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('uz-UZ') : '—'],
      ['Sinf', getClassInfo()],
      [''],
      ['Aloqa ma\'lumotlari', ''],
      ['Telefon', formData.phone || '—'],
      ['Manzil', formData.address || '—'],
      [''],
      ['Ota-ona ma\'lumotlari', ''],
      ['Ota-ona ismi', formData.parentName || '—'],
      ['Ota-ona telefoni', formData.parentPhone || '—'],
      ['Ota-ona JSHSHIR', formData.parentJshshir || '—'],
      [''],
      ['Ro\'yxatdan o\'tgan sana', formData.registrationDate ? new Date(formData.registrationDate).toLocaleDateString('uz-UZ') : '—'],
      ['Maktabdan ketgan sana', formData.leftDate ? new Date(formData.leftDate).toLocaleDateString('uz-UZ') : '—']
    ].map(row => row.join(',')).join('\n');

    // Add BOM for UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${formData.firstName}_${formData.lastName}_malumotlar.csv`;
    link.click();
  };

  const downloadPDF = () => {
    // Create a printable HTML document
    const printWindow = window.open('', '', 'width=800,height=600');
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>O'quvchi ma'lumotlari - ${formData.firstName} ${formData.lastName}</title>
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
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e3a8a;
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
            background: #1e3a8a;
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
          <h1>O'quvchi ma'lumotlari</h1>
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
            <div class="info-label">O'quvchi ID:</div>
            <div class="info-value">${formData.studentId || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Passport/Guvohnoma:</div>
            <div class="info-value">${formData.passportNumber || '—'}</div>
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
          <div class="section-title">Ota-ona ma'lumotlari</div>
          <div class="info-row">
            <div class="info-label">Ota-ona ismi:</div>
            <div class="info-value">${formData.parentName || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Ota-ona telefoni:</div>
            <div class="info-value">${formData.parentPhone || '—'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Ota-ona JSHSHIR:</div>
            <div class="info-value">${formData.parentJshshir || '—'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Ta'lim ma'lumotlari</div>
          <div class="info-row">
            <div class="info-label">Sinf:</div>
            <div class="info-value">${getClassInfo()}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Ro'yxatdan o'tgan sana:</div>
            <div class="info-value">${formData.registrationDate ? new Date(formData.registrationDate).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
          </div>
          ${formData.leftDate ? `
          <div class="info-row">
            <div class="info-label">Maktabdan ketgan sana:</div>
            <div class="info-value">${new Date(formData.leftDate).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Chop etilgan sana: ${new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p>My Dream School</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            <div className="student-avatar-large" style={imagePreview ? {
              backgroundImage: `url(${imagePreview})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'transparent'
            } : {}}>
              {!imagePreview && formData.firstName.charAt(0)}{!imagePreview && formData.lastName.charAt(0)}
            </div>
            <div>
              <h2 className="modal-title">
                {mode === 'add' ? 'Yangi o\'quvchi qo\'shish' : isEditing ? 'O\'quvchi ma\'lumotlarini tahrirlash' : 'O\'quvchi profili'}
              </h2>
              <p className="modal-subtitle">
                {!isEditing && student && `${formData.firstName} ${formData.lastName}`}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
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
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="image-upload-actions">
                  <label className="upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
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
                <label className="form-label">Ism</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                ) : (
                  <div className="form-value">{formData.firstName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Familiya</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                ) : (
                  <div className="form-value">{formData.lastName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">O'quvchi ID</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    className="form-input"
                  />
                ) : (
                  <div className="form-value">
                    <span className="badge badge-gold">{formData.studentId || '—'}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Tug'ilgan sana</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="form-input"
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

              <div className="form-group">
                <label className="form-label">Passport / Guvohnoma raqami</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="passportNumber"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="AA1234567 yoki I-AA №1234567"
                  />
                ) : (
                  <div className="form-value">
                    <span className="badge badge-passport">{formData.passportNumber || '—'}</span>
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
                <label className="form-label">Telefon raqami</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="+998-__-___-__-__"
                  />
                ) : (
                  <div className="form-value">{formData.phone || '—'}</div>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Manzil</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                  />
                ) : (
                  <div className="form-value">{formData.address || '—'}</div>
                )}
              </div>

              {mode === 'add' && (
                <div className="form-group full-width">
                  <label className="form-label">Parol <span className="required">*</span></label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Kamida 6 ta belgi"
                    required
                    minLength={6}
                  />
                  <p className="field-hint">O'quvchi tizimga kirishi uchun parol (kamida 6 ta belgi)</p>
                </div>
              )}

              {mode === 'edit' && isEditing && (
                <div className="form-group full-width">
                  {!showPasswordChange ? (
                    <button
                      type="button"
                      className="btn-change-password"
                      onClick={() => setShowPasswordChange(true)}
                    >
                      <span className="password-icon">🔐</span>
                      <span>Parolni o'zgartirish</span>
                    </button>
                  ) : (
                    <div className="password-change-section">
                      <div className="password-header">
                        <label className="form-label">Yangi parol</label>
                        <button
                          type="button"
                          className="btn-cancel-password"
                          onClick={() => {
                            setShowPasswordChange(false);
                            setFormData(prev => ({ ...prev, password: '' }));
                          }}
                        >
                          Bekor qilish
                        </button>
                      </div>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Kamida 6 ta belgi"
                        minLength={6}
                      />
                      <p className="field-hint">Bo'sh qoldirilsa parol o'zgartirilmaydi</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">👨‍👩‍👧</span>
              Ota-ona ma'lumotlari
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Ota-ona ismi</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleChange}
                    className="form-input"
                  />
                ) : (
                  <div className="form-value">{formData.parentName || '—'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Ota-ona telefoni</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="+998-__-___-__-__"
                  />
                ) : (
                  <div className="form-value">{formData.parentPhone || '—'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Ota-ona JSHSHIR</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="parentJshshir"
                    value={formData.parentJshshir}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="14 raqamli kod"
                    maxLength="14"
                  />
                ) : (
                  <div className="form-value">{formData.parentJshshir || '—'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">
              <span className="section-icon">🏫</span>
              Ta'lim ma'lumotlari
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Sinf</label>
                {isEditing ? (
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">Sinf tanlang...</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        {cls.grade}-{cls.section}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="form-value">
                    <span className="badge badge-blue">{getClassInfo()}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Ro'yxatdan o'tgan sana</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="registrationDate"
                    value={formData.registrationDate}
                    onChange={handleChange}
                    className="form-input"
                  />
                ) : (
                  <div className="form-value">
                    {formData.registrationDate
                      ? new Date(formData.registrationDate).toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : '—'
                    }
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Oylik to'lov (so'm) *</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="monthlyFee"
                    value={formData.monthlyFee}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Masalan: 500000"
                    min="0"
                    step="10000"
                  />
                ) : (
                  <div className="form-value">
                    {formData.monthlyFee
                      ? new Intl.NumberFormat('uz-UZ').format(formData.monthlyFee) + ' so\'m'
                      : '—'
                    }
                  </div>
                )}
              </div>

              {!formData.isActive && (
                <div className="form-group">
                  <label className="form-label">Maktabdan ketgan sana</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="leftDate"
                      value={formData.leftDate}
                      onChange={handleChange}
                      className="form-input"
                    />
                  ) : (
                    <div className="form-value">
                      {formData.leftDate
                        ? new Date(formData.leftDate).toLocaleDateString('uz-UZ', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                        : '—'
                      }
                    </div>
                  )}
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
                    <span className="checkbox-text">O'quvchi faol</span>
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

          .student-avatar-large {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
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

          .error-message {
            margin: 0.75rem 1rem 0;
            padding: 0.5rem 0.75rem;
            background: #fee2e2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #991b1b;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
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
          }

          .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }

          .form-value {
            padding: 0.375rem 0;
            font-size: 0.75rem;
            color: #1e293b;
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

          .badge-gold {
            background: #fef3c7;
            color: #92400e;
          }

          .badge-blue {
            background: #dbeafe;
            color: #1e40af;
          }

          .badge-passport {
            background: #f3e8ff;
            color: #7c3aed;
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

          .checkbox-input {
            width: 16px;
            height: 16px;
            cursor: pointer;
          }

          .checkbox-text {
            font-size: 0.75rem;
            font-weight: 500;
            color: #1e293b;
          }

          .required {
            color: #ef4444;
            margin-left: 0.125rem;
          }

          .field-hint {
            font-size: 0.625rem;
            color: #64748b;
            margin-top: 0.25rem;
          }

          /* Image Upload Styles */
          .image-upload-container {
            display: flex;
            gap: 1rem;
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
            gap: 0.25rem;
          }

          .placeholder-icon {
            font-size: 1.5rem;
            opacity: 0.3;
          }

          .placeholder-text {
            font-size: 0.5625rem;
            color: #94a3b8;
          }

          .remove-image-btn {
            position: absolute;
            top: -4px;
            right: -4px;
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
          }

          .image-upload-actions {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
          }

          .upload-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.5rem 0.75rem;
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 0.6875rem;
            width: fit-content;
          }

          .upload-icon {
            font-size: 0.875rem;
          }

          .upload-hint {
            font-size: 0.625rem;
            color: #64748b;
            margin: 0;
          }

          /* Password Change Styles */
          .btn-change-password {
            width: 100%;
            padding: 0.5rem 0.75rem;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.375rem;
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
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.625rem;
            font-weight: 500;
            cursor: pointer;
          }

          .modal-footer {
            padding: 0.75rem 1rem;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 0.5rem;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border-radius: 0 0 12px 12px;
          }

          .footer-left {
            display: flex;
            gap: 0.375rem;
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
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }

          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-primary {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
          }

          .btn-secondary {
            background: white;
            color: #64748b;
            border: 1px solid #e2e8f0;
          }

          .btn-download {
            padding: 0.375rem 0.625rem;
            font-size: 0.6875rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            border: none;
          }

          .btn-download .download-icon {
            font-size: 0.875rem;
          }

          .btn-excel {
            background: #16a34a;
            color: white;
          }

          .btn-pdf {
            background: #dc2626;
            color: white;
          }

          @media (max-width: 768px) {
            .modal-container {
              max-height: 95vh;
              max-width: 95%;
            }

            .modal-header {
              padding: 0.75rem;
            }

            .header-left {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }

            .student-avatar-large {
              width: 32px;
              height: 32px;
              font-size: 0.75rem;
            }

            .modal-title {
              font-size: 0.8125rem;
            }

            .modal-body {
              padding: 0.75rem;
            }

            .form-grid {
              grid-template-columns: 1fr;
              gap: 0.5rem;
            }

            .image-upload-container {
              flex-direction: column;
              align-items: flex-start;
            }

            .image-preview {
              width: 60px;
              height: 60px;
            }

            .placeholder-icon {
              font-size: 1.25rem;
            }

            .upload-btn {
              width: 100%;
              justify-content: center;
            }

            .modal-footer {
              padding: 0.625rem 0.75rem;
              flex-direction: column;
              gap: 0.5rem;
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

export default StudentProfile;
