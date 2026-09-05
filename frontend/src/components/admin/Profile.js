import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/authService';

// Rol nomlarini o'zbekchaga tarjima
const ROLE_UZ = {
  admin:       'Administrator',
  director:    'Direktor',
  accountant:  'Hisobchi',
  hr:          'HR menejer',
  reception:   'Registrator',
  callcenter:  'Call-markaz',
  supervisor:  'Nazoratchi',
  teacher:     "O'qituvchi",
  student:     "O'quvchi",
};
const roleLabel = (role) => ROLE_UZ[role?.toLowerCase()] || role || '—';

// Rol bo'yicha rang sxemasi (Director → ko'k, Hisobchi → sariq, Nazoratchi → yashil)
const ROLE_THEMES = {
  director: {
    name: 'blue',
    gradFrom: '#1e3a8a', gradTo: '#3b82f6',
    soft: '#dbeafe', softer: '#eff6ff', border: '#bfdbfe',
    text: '#1e40af', textDark: '#1e3a8a',
    btnCancelBg: '#eff6ff', btnCancelBorder: '#bfdbfe', btnCancelBorderHover: '#93c5fd', btnCancelBgHover: '#dbeafe',
    shadow: 'rgba(59, 130, 246, 0.25)', shadowSoft: 'rgba(59, 130, 246, 0.12)'
  },
  admin: {
    name: 'blue',
    gradFrom: '#1e3a8a', gradTo: '#3b82f6',
    soft: '#dbeafe', softer: '#eff6ff', border: '#bfdbfe',
    text: '#1e40af', textDark: '#1e3a8a',
    btnCancelBg: '#eff6ff', btnCancelBorder: '#bfdbfe', btnCancelBorderHover: '#93c5fd', btnCancelBgHover: '#dbeafe',
    shadow: 'rgba(59, 130, 246, 0.25)', shadowSoft: 'rgba(59, 130, 246, 0.12)'
  },
  accountant: {
    name: 'amber',
    gradFrom: '#92400e', gradTo: '#d97706',
    soft: '#fef3c7', softer: '#fffbeb', border: '#fde68a',
    text: '#92400e', textDark: '#78350f',
    btnCancelBg: '#fffbeb', btnCancelBorder: '#fde68a', btnCancelBorderHover: '#fcd34d', btnCancelBgHover: '#fef3c7',
    shadow: 'rgba(245, 158, 11, 0.25)', shadowSoft: 'rgba(245, 158, 11, 0.12)'
  },
  supervisor: {
    name: 'green',
    gradFrom: '#047857', gradTo: '#10b981',
    soft: '#d1fae5', softer: '#ecfdf5', border: '#a7f3d0',
    text: '#047857', textDark: '#064e3b',
    btnCancelBg: '#ecfdf5', btnCancelBorder: '#a7f3d0', btnCancelBorderHover: '#6ee7b7', btnCancelBgHover: '#d1fae5',
    shadow: 'rgba(16, 185, 129, 0.25)', shadowSoft: 'rgba(16, 185, 129, 0.12)'
  },
  hr: {
    name: 'purple',
    gradFrom: '#6d28d9', gradTo: '#8b5cf6',
    soft: '#ede9fe', softer: '#f5f3ff', border: '#ddd6fe',
    text: '#5b21b6', textDark: '#4c1d95',
    btnCancelBg: '#f5f3ff', btnCancelBorder: '#ddd6fe', btnCancelBorderHover: '#c4b5fd', btnCancelBgHover: '#ede9fe',
    shadow: 'rgba(139, 92, 246, 0.25)', shadowSoft: 'rgba(139, 92, 246, 0.12)'
  },
  reception: {
    name: 'cyan',
    gradFrom: '#0e7490', gradTo: '#06b6d4',
    soft: '#cffafe', softer: '#ecfeff', border: '#a5f3fc',
    text: '#0e7490', textDark: '#155e75',
    btnCancelBg: '#ecfeff', btnCancelBorder: '#a5f3fc', btnCancelBorderHover: '#67e8f9', btnCancelBgHover: '#cffafe',
    shadow: 'rgba(6, 182, 212, 0.25)', shadowSoft: 'rgba(6, 182, 212, 0.12)'
  },
  callcenter: {
    name: 'rose',
    gradFrom: '#9f1239', gradTo: '#e11d48',
    soft: '#ffe4e6', softer: '#fff1f2', border: '#fecdd3',
    text: '#9f1239', textDark: '#881337',
    btnCancelBg: '#fff1f2', btnCancelBorder: '#fecdd3', btnCancelBorderHover: '#fda4af', btnCancelBgHover: '#ffe4e6',
    shadow: 'rgba(225, 29, 72, 0.25)', shadowSoft: 'rgba(225, 29, 72, 0.12)'
  },
  teacher: {
    name: 'indigo',
    gradFrom: '#3730a3', gradTo: '#6366f1',
    soft: '#e0e7ff', softer: '#eef2ff', border: '#c7d2fe',
    text: '#4338ca', textDark: '#312e81',
    btnCancelBg: '#eef2ff', btnCancelBorder: '#c7d2fe', btnCancelBorderHover: '#a5b4fc', btnCancelBgHover: '#e0e7ff',
    shadow: 'rgba(99, 102, 241, 0.25)', shadowSoft: 'rgba(99, 102, 241, 0.12)'
  }
};
const getTheme = (role) => ROLE_THEMES[role?.toLowerCase()] || ROLE_THEMES.admin;

const Profile = () => {
  const { user, updateUser } = useAuth();
  const theme = getTheme(user?.role);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profileImage ?
    `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${user.profileImage}?t=${Date.now()}` : null
  );
  const [showImageModal, setShowImageModal] = useState(false);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
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
      reader.onerror = () => {
        setError('Rasmni o\'qishda xatolik yuz berdi');
        setProfileImage(null);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    setRemoveProfileImage(true);
  };

  const deleteCurrentImage = () => {
    setImagePreview(null);
    setProfileImage(null);
    setRemoveProfileImage(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const submitData = new FormData();
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('phone', formData.phone);
      submitData.append('email', formData.email);

      if (profileImage) {
        submitData.append('profileImage', profileImage);
      } else if (removeProfileImage) {
        submitData.append('removeProfileImage', 'true');
      }

      const response = await api.put(`/users/${user._id}`, submitData);

      // Update local preview with cache busting
      if (response.data.profileImage) {
        const newImageUrl = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${response.data.profileImage}?t=${Date.now()}`;
        setImagePreview(newImageUrl);
      } else {
        setImagePreview(null);
      }

      // Update user in context with _updated timestamp
      const updatedUserData = { ...response.data, _updated: Date.now() };
      updateUser(updatedUserData);

      setSuccess('Profil muvaffaqiyatli yangilandi!');
      setIsEditing(false);
      setProfileImage(null);
      setRemoveProfileImage(false);
    } catch (err) {
      // Log error for debugging
      // Don't expose sensitive backend error messages to user
      if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Ma\'lumotlar formati noto\'g\'ri');
      } else if (err.response?.status === 403) {
        setError('Ushbu amalni bajarish uchun ruxsat yo\'q');
      } else if (err.response?.status === 429) {
        setError('Juda ko\'p so\'rovlar. Iltimos, bir oz kuting va qayta urinib ko\'ring');
      } else if (err.response?.status === 500) {
        setError(err.response?.data?.message || 'Server xatosi. Iltimos, administrator bilan bog\'laning');
      } else {
        setError('Profilni yangilashda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Strong password validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Yangi parollar mos kelmadi');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    if (passwordData.newPassword.length > 128) {
      setError('Parol juda uzun (maksimal 128 ta belgi)');
      return;
    }

    // Check for password strength (at least one number or special character recommended)
    const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordData.newPassword);
    if (!hasNumberOrSpecial) {
      setError('Parol xavfsizligi uchun kamida bitta raqam yoki maxsus belgi kiriting');
      return;
    }

    setLoading(true);

    try {
      await api.put(`/users/${user._id}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSuccess('Parol muvaffaqiyatli o\'zgartirildi!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordChange(false);
    } catch (err) {
      // Log error for debugging
      // Secure error handling
      if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Joriy parol noto\'g\'ri');
      } else if (err.response?.status === 403) {
        setError('Ushbu amalni bajarish uchun ruxsat yo\'q');
      } else if (err.response?.status === 429) {
        setError('Juda ko\'p urinishlar. Iltimos, 15 daqiqadan keyin qayta urinib ko\'ring');
      } else {
        setError('Parolni o\'zgartirishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      email: user?.email || ''
    });
    setIsEditing(false);
    setError('');
    setProfileImage(null);
    setRemoveProfileImage(false);
    // Reset image preview to original with cache busting
    if (user?.profileImage) {
      setImagePreview(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${user.profileImage}?t=${user._updated || Date.now()}`);
    } else {
      setImagePreview(null);
    }
  };

  const themeVars = {
    '--prof-grad-from': theme.gradFrom,
    '--prof-grad-to': theme.gradTo,
    '--prof-soft': theme.soft,
    '--prof-softer': theme.softer,
    '--prof-border': theme.border,
    '--prof-text': theme.text,
    '--prof-text-dark': theme.textDark,
    '--prof-cancel-bg': theme.btnCancelBg,
    '--prof-cancel-border': theme.btnCancelBorder,
    '--prof-cancel-bg-hover': theme.btnCancelBgHover,
    '--prof-cancel-border-hover': theme.btnCancelBorderHover,
    '--prof-shadow': theme.shadow,
    '--prof-shadow-soft': theme.shadowSoft
  };

  return (
    <div className={`profile-page profile-theme-${theme.name} director-profile-page`} style={themeVars}>
      {/* Rol bo'yicha rang berilgan header */}
      <div className="profile-hero">
        <div>
          <h1>Profil</h1>
          <p>Shaxsiy ma'lumotlar va xavfsizlik sozlamalari</p>
        </div>
        {!isEditing && (
          <button className="profile-hero-btn profile-hero-btn-primary" onClick={() => setIsEditing(true)}>
            <span>✏️</span> Tahrirlash
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* Profile Info Section */}
      <div className="profile-card">
        <div className="card-header">
          <div className="header-left">
            <div className="avatar-upload-wrapper">
              <div
                className="profile-avatar-large"
                style={imagePreview ? {
                  backgroundImage: `url(${imagePreview})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: 'transparent'
                } : {}}
                onClick={() => imagePreview && !isEditing && setShowImageModal(true)}
                title={imagePreview && !isEditing ? "Rasmni kattalashtirish" : ""}
              >
                {!imagePreview && (
                  <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                )}
              </div>
              {isEditing && (
                <>
                  <input
                    type="file"
                    id="profile-image-upload"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="profile-image-upload" className="avatar-upload-btn" title="Rasm yuklash">
                    <span className="upload-icon">📷</span>
                  </label>
                  {(profileImage || (imagePreview && !removeProfileImage)) && (
                    <button
                      type="button"
                      className="avatar-remove-btn"
                      onClick={profileImage ? removeImage : deleteCurrentImage}
                      title="Rasmni olib tashlash"
                    >
                      <span>✕</span>
                    </button>
                  )}
                </>
              )}
            </div>
            <div>
              <h2 className="card-title">Shaxsiy ma'lumotlar</h2>
              <p className="card-subtitle">{roleLabel(user?.role)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
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
                <div className="form-value">{user?.firstName}</div>
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
                />
              ) : (
                <div className="form-value">{user?.lastName || '—'}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Telefon</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                />
              ) : (
                <div className="form-value">{user?.phone || '—'}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                />
              ) : (
                <div className="form-value">{user?.email || '—'}</div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="form-actions">
              <button type="button" className="btn btn-cancel" onClick={handleCancel}>
                Bekor qilish
              </button>
              <button type="submit" className="btn btn-save" disabled={loading}>
                {loading ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Password Change Section */}
      <div className="profile-card">
        <div className="card-header">
          <div className="header-left">
            <div className="icon-wrapper">🔐</div>
            <div>
              <h2 className="card-title">Xavfsizlik</h2>
              <p className="card-subtitle">Parolni o'zgartirish</p>
            </div>
          </div>
          {!showPasswordChange && (
            <button className="btn-edit" onClick={() => setShowPasswordChange(true)}>
              <span>🔑</span>
              <span>Parolni o'zgartirish</span>
            </button>
          )}
        </div>

        {showPasswordChange && (
          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Joriy parol</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Yangi parol</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parolni tasdiqlash</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                  minLength="6"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                  setError('');
                  setSuccess('');
                }}
              >
                Bekor qilish
              </button>
              <button type="submit" className="btn btn-save" disabled={loading}>
                {loading ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .profile-page {
          padding: 1.5rem;
          max-width: 1280px;
          margin: 0 auto;
          background: linear-gradient(180deg, var(--prof-softer) 0%, #f8fafc 280px);
          min-height: 100vh;
          box-sizing: border-box;
        }

        /* Rol bo'yicha rang sxemali header */
        .profile-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.25rem;
          background: linear-gradient(135deg, var(--prof-grad-from) 0%, var(--prof-grad-to) 100%);
          border-radius: 14px;
          color: #fff;
          box-shadow: 0 6px 20px var(--prof-shadow);
        }
        .profile-hero h1 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 0.2rem;
          letter-spacing: -0.02em;
        }
        .profile-hero p {
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.92;
        }
        .profile-hero-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1.1rem;
          border: none; border-radius: 10px;
          font-weight: 700; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
        }
        .profile-hero-btn-primary {
          background: #fff; color: var(--prof-text);
          box-shadow: 0 3px 10px rgba(0,0,0,0.12);
        }
        .profile-hero-btn-primary:hover {
          background: var(--prof-softer);
          transform: translateY(-1px);
        }

        .alert {
          padding: 0.75rem 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: linear-gradient(135deg, var(--prof-soft), var(--prof-border));
          color: var(--prof-text-dark);
          border: 1px solid var(--prof-cancel-border-hover);
        }

        .alert-icon {
          font-size: 1rem;
        }

        /* Karta — rol bo'yicha rangli chap chiziq */
        .profile-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          border-left: 4px solid var(--prof-grad-to);
          margin-bottom: 1rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px dashed #e2e8f0;
          flex-wrap: wrap;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .avatar-upload-wrapper {
          position: relative;
          width: 64px;
          height: 64px;
        }

        .profile-avatar-large {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--prof-grad-from), var(--prof-grad-to));
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.5rem;
          box-shadow: 0 4px 14px var(--prof-shadow);
          transition: all 0.2s ease;
          border: 3px solid white;
          overflow: hidden;
          position: relative;
        }

        .profile-avatar-large:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 32px var(--prof-shadow);
        }

        /* Add cursor pointer when avatar is clickable (has image and not in edit mode) */
        .avatar-upload-wrapper:not(:has(.avatar-upload-btn)) .profile-avatar-large[style*="url"] {
          cursor: pointer;
        }

        .avatar-upload-wrapper:not(:has(.avatar-upload-btn)) .profile-avatar-large::after {
          content: '🔍';
          position: absolute;
          bottom: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50% 0 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        /* Show zoom icon on hover for desktop */
        @media (hover: hover) {
          .avatar-upload-wrapper:not(:has(.avatar-upload-btn)) .profile-avatar-large:hover::after {
            opacity: 1;
          }
        }

        /* Show zoom icon on touch devices when image exists */
        @media (hover: none) {
          .avatar-upload-wrapper:not(:has(.avatar-upload-btn)) .profile-avatar-large[style*="url"]::after {
            opacity: 0.8;
          }
        }

        .avatar-upload-btn {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, var(--prof-grad-from), var(--prof-grad-to));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px var(--prof-shadow);
          border: 2px solid white;
          color: white;
        }

        .avatar-upload-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 6px 20px var(--prof-shadow);
        }

        .upload-icon {
          font-size: 0.875rem;
        }

        .avatar-remove-btn {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .avatar-remove-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--prof-grad-from), var(--prof-grad-to));
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          box-shadow: 0 4px 14px var(--prof-shadow);
          border: 3px solid white;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.15rem 0;
          letter-spacing: -0.02em;
        }

        .card-subtitle {
          font-size: 0.72rem;
          color: var(--prof-text);
          margin: 0;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .btn-edit {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1rem;
          background: linear-gradient(135deg, var(--prof-grad-from), var(--prof-grad-to));
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px var(--prof-shadow);
        }

        .btn-edit:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px var(--prof-shadow);
        }

        .profile-form {
          margin-top: 1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--prof-text);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .form-input {
          padding: 0.55rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #0f172a;
          background: #f8fafc;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--prof-grad-to);
          background: white;
          box-shadow: 0 0 0 3px var(--prof-shadow-soft);
        }

        .form-value {
          padding: 0.55rem 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #0f172a;
          font-weight: 600;
          border: 1px solid #e2e8f0;
        }

        .form-actions {
          display: flex;
          gap: 0.625rem;
          justify-content: flex-end;
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px dashed #e2e8f0;
        }

        .btn {
          padding: 0.6rem 1.1rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .btn-cancel {
          background: var(--prof-cancel-bg);
          color: var(--prof-text);
          border: 1px solid var(--prof-cancel-border);
        }

        .btn-cancel:hover {
          background: var(--prof-cancel-bg-hover);
          border-color: var(--prof-cancel-border-hover);
        }

        .btn-save {
          background: linear-gradient(135deg, var(--prof-grad-from), var(--prof-grad-to));
          color: white;
          box-shadow: 0 3px 10px var(--prof-shadow);
        }

        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px var(--prof-shadow);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ========================================================
           NOUTBUK (992px – 1199px)
        ======================================================== */
        @media (min-width: 992px) and (max-width: 1199px) {
          .profile-page { padding: 1.25rem; }
          .profile-hero { padding: 1.125rem 1.25rem; }
          .profile-hero h1 { font-size: 1.4rem; }
          .profile-card { padding: 1.25rem; }
        }

        /* ========================================================
           PLANSHET (768px – 991px)
        ======================================================== */
        @media (min-width: 768px) and (max-width: 991px) {
          .profile-page { padding: 1.25rem; }
          .profile-hero { padding: 1.125rem 1.25rem; }
          .profile-hero h1 { font-size: 1.35rem; }
          .profile-hero p { font-size: 0.82rem; }
          .profile-card { padding: 1.25rem; }
          .form-grid { grid-template-columns: repeat(2, 1fr); gap: 0.875rem; }
          .avatar-upload-wrapper, .profile-avatar-large { width: 72px; height: 72px; }
          .profile-avatar-large { font-size: 1.5rem; border-radius: 16px; }
          .icon-wrapper { width: 56px; height: 56px; font-size: 1.625rem; }
        }

        /* ========================================================
           TELEFON (481px – 767px)
        ======================================================== */
        @media (min-width: 481px) and (max-width: 767px) {
          .profile-page { padding: 1rem; }
          .profile-hero {
            padding: 1rem 1.125rem;
            border-radius: 12px;
            flex-direction: column;
            align-items: stretch;
            gap: 0.875rem;
          }
          .profile-hero h1 { font-size: 1.2rem; }
          .profile-hero p { font-size: 0.78rem; }
          .profile-hero-btn { width: 100%; padding: 0.55rem 1rem; font-size: 0.82rem; }
          .profile-card { padding: 1.125rem; border-radius: 12px; }
          .card-header { flex-direction: column; align-items: flex-start; gap: 0.875rem; }
          .avatar-upload-wrapper, .profile-avatar-large { width: 68px; height: 68px; }
          .profile-avatar-large { font-size: 1.4rem; border-radius: 16px; }
          .avatar-upload-btn { width: 30px; height: 30px; }
          .upload-icon { font-size: 0.95rem; }
          .avatar-remove-btn { width: 24px; height: 24px; font-size: 0.75rem; }
          .icon-wrapper { width: 50px; height: 50px; font-size: 1.5rem; }
          .card-title { font-size: 1rem; }
          .form-grid { grid-template-columns: 1fr; gap: 0.75rem; }
          .form-actions { flex-direction: column; gap: 0.5rem; }
          .btn, .btn-edit { width: 100%; justify-content: center; padding: 0.55rem 1rem; }
        }

        /* ========================================================
           KICHIK TELEFON (≤480px)
        ======================================================== */
        @media (max-width: 480px) {
          .profile-page { padding: 0.75rem; }
          .profile-hero {
            padding: 0.875rem 1rem;
            border-radius: 11px;
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }
          .profile-hero h1 { font-size: 1.1rem; }
          .profile-hero p { font-size: 0.72rem; }
          .profile-hero-btn { width: 100%; padding: 0.5rem 0.75rem; font-size: 0.78rem; }
          .profile-card { padding: 0.875rem 1rem; border-radius: 11px; margin-bottom: 0.75rem; border-left-width: 3px; }
          .card-header {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
            padding-bottom: 0.75rem;
            margin-bottom: 0.875rem;
          }
          .header-left { gap: 0.75rem; }
          .avatar-upload-wrapper, .profile-avatar-large { width: 60px; height: 60px; }
          .profile-avatar-large { font-size: 1.25rem; border-radius: 14px; border-width: 2px; }
          .avatar-upload-btn { width: 26px; height: 26px; }
          .upload-icon { font-size: 0.82rem; }
          .avatar-remove-btn { width: 20px; height: 20px; font-size: 0.65rem; }
          .icon-wrapper { width: 42px; height: 42px; font-size: 1.2rem; border-radius: 10px; }
          .card-title { font-size: 0.95rem; }
          .card-subtitle { font-size: 0.65rem; }
          .btn-edit { padding: 0.5rem 0.875rem; font-size: 0.78rem; width: 100%; justify-content: center; }
          .form-grid { grid-template-columns: 1fr; gap: 0.625rem; }
          .form-label { font-size: 0.68rem; }
          .form-input, .form-value { padding: 0.5rem 0.7rem; font-size: 0.82rem; }
          .form-actions { flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
          .btn { width: 100%; justify-content: center; padding: 0.55rem; font-size: 0.82rem; }
          .alert { padding: 0.625rem 0.875rem; font-size: 0.8rem; }
        }

        /* ========================================================
           DIREKTOR DIZAYN TIZIMI — barcha bo'limlar uchun bir xil
           (dashboard layout class ga bog'liq emas, o'zi mustaqil)
        ======================================================== */
        .director-profile-page {
          box-sizing: border-box;
          width: 100%;
          max-width: var(--director-content-max-width, 1440px);
          min-height: 100%;
          margin: 0 auto;
          padding: 24px 28px;
          color: var(--director-slate-900, #0f172a);
          background: var(--director-slate-50, #f8fafc);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .director-profile-page .profile-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin: 0 0 24px;
          padding: 0;
          color: var(--director-slate-900, #0f172a);
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .director-profile-page .profile-hero h1 {
          margin: 0;
          color: var(--director-slate-900, #0f172a);
          font-size: 28px;
          font-weight: 750;
          line-height: 1.2;
          letter-spacing: -.02em;
        }
        .director-profile-page .profile-hero p {
          max-width: 720px;
          margin: 6px 0 0;
          color: var(--director-slate-500, #64748b);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.55;
          opacity: 1;
        }
        .director-profile-page .profile-hero-btn,
        .director-profile-page .btn-edit,
        .director-profile-page .btn {
          box-sizing: border-box;
          min-height: 40px;
          padding: 0 16px;
          border-radius: var(--director-radius-sm, 8px);
          font-size: 14px;
          font-weight: 650;
          line-height: 1;
          transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
          transform: none;
          box-shadow: none;
          width: auto;
          justify-content: center;
        }
        .director-profile-page .profile-hero-btn,
        .director-profile-page .btn-edit,
        .director-profile-page .btn-save {
          color: var(--director-white, #fff);
          background: var(--director-primary-600, #2563eb);
          border: 1px solid var(--director-primary-600, #2563eb);
        }
        .director-profile-page .profile-hero-btn:hover,
        .director-profile-page .btn-edit:hover,
        .director-profile-page .btn-save:hover {
          background: var(--director-primary-700, #1d4ed8);
          border-color: var(--director-primary-700, #1d4ed8);
          transform: none;
          box-shadow: none;
        }
        .director-profile-page .btn-cancel {
          color: var(--director-slate-700, #334155);
          background: var(--director-white, #fff);
          border: 1px solid var(--director-slate-300, #cbd5e1);
        }
        .director-profile-page .btn-cancel:hover {
          color: var(--director-slate-900, #0f172a);
          background: var(--director-slate-50, #f8fafc);
          border-color: var(--director-slate-400, #94a3b8);
        }
        .director-profile-page .profile-card {
          margin: 0 0 24px;
          padding: 20px;
          background: var(--director-white, #fff);
          border: 1px solid var(--director-slate-200, #e2e8f0);
          border-left: 1px solid var(--director-slate-200, #e2e8f0);
          border-radius: var(--director-radius-lg, 16px);
          box-shadow: var(--director-shadow-sm, 0 4px 14px rgba(15,23,42,.06));
        }
        .director-profile-page .card-header {
          margin: 0 0 20px;
          padding: 0 0 16px;
          border-bottom: 1px solid var(--director-slate-200, #e2e8f0);
        }
        .director-profile-page .card-title {
          margin: 0;
          color: var(--director-slate-900, #0f172a);
          font-size: 16px;
          font-weight: 700;
          line-height: 1.35;
        }
        .director-profile-page .card-subtitle {
          margin: 4px 0 0;
          color: var(--director-slate-500, #64748b);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.45;
          letter-spacing: 0;
          text-transform: none;
        }
        .director-profile-page .profile-avatar-large {
          border-radius: var(--director-radius-md, 12px);
          background: var(--director-primary-600, #2563eb);
          border: 2px solid var(--director-white, #fff);
          outline: 1px solid var(--director-slate-200, #e2e8f0);
          box-shadow: none;
        }
        .director-profile-page .profile-avatar-large:hover {
          transform: none;
          box-shadow: none;
        }
        .director-profile-page .avatar-upload-btn {
          color: var(--director-white, #fff);
          background: var(--director-primary-600, #2563eb);
          border: 2px solid var(--director-white, #fff);
          box-shadow: none;
        }
        .director-profile-page .avatar-upload-btn:hover {
          transform: none;
          box-shadow: none;
          background: var(--director-primary-700, #1d4ed8);
        }
        .director-profile-page .avatar-remove-btn {
          color: var(--director-danger-dark, #991b1b);
          background: var(--director-danger-soft, #fee2e2);
          box-shadow: none;
        }
        .director-profile-page .icon-wrapper {
          position: relative;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          color: var(--director-primary-700, #1d4ed8);
          background: var(--director-primary-50, #eff6ff);
          border: 0;
          border-radius: var(--director-radius-md, 12px);
          box-shadow: none;
          font-size: 0;
        }
        .director-profile-page .icon-wrapper::before {
          content: "";
          box-sizing: border-box;
          width: 18px;
          height: 14px;
          margin-top: 5px;
          border: 2px solid currentColor;
          border-radius: 4px;
        }
        .director-profile-page .icon-wrapper::after {
          content: "";
          position: absolute;
          top: 10px;
          width: 10px;
          height: 10px;
          border: 2px solid currentColor;
          border-bottom: 0;
          border-radius: 8px 8px 0 0;
        }
        .director-profile-page .profile-hero-btn > span:first-child,
        .director-profile-page .btn-edit > span:first-child,
        .director-profile-page .alert-icon,
        .director-profile-page .upload-icon {
          display: none;
        }
        .director-profile-page .form-grid {
          gap: 16px;
        }
        .director-profile-page .form-group {
          gap: 6px;
        }
        .director-profile-page .form-label {
          color: var(--director-slate-700, #334155);
          font-size: 13px;
          font-weight: 650;
          line-height: 1.3;
          letter-spacing: 0;
          text-transform: none;
        }
        .director-profile-page .form-input,
        .director-profile-page .form-value {
          box-sizing: border-box;
          min-height: 42px;
          padding: 10px 12px;
          color: var(--director-slate-900, #0f172a);
          background: var(--director-white, #fff);
          border: 1px solid var(--director-slate-300, #cbd5e1);
          border-radius: var(--director-radius-sm, 8px);
          font-size: 14px;
          font-weight: 400;
        }
        .director-profile-page .form-value {
          background: var(--director-slate-50, #f8fafc);
          border-color: var(--director-slate-200, #e2e8f0);
        }
        .director-profile-page .form-input:focus {
          background: var(--director-white, #fff);
          border-color: var(--director-primary-400, #60a5fa);
          outline: 3px solid rgba(59, 130, 246, .14);
          box-shadow: none;
        }
        .director-profile-page .form-actions {
          gap: 10px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--director-slate-200, #e2e8f0);
          flex-direction: row;
          justify-content: flex-end;
        }
        .director-profile-page .alert {
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
        }
        .director-profile-page .alert-error {
          color: var(--director-danger-dark, #991b1b);
          background: var(--director-danger-soft, #fee2e2);
          border-color: var(--director-danger, #ef4444);
        }
        .director-profile-page .alert-success {
          color: var(--director-success-dark, #166534);
          background: var(--director-success-bg, #ecfdf5);
          border-color: var(--director-success-soft, #d1fae5);
        }
        .director-profile-page button:focus-visible,
        .director-profile-page input:focus-visible {
          outline: 3px solid rgba(59, 130, 246, .2);
          outline-offset: 2px;
        }
        .director-profile-page button:disabled {
          color: var(--director-slate-500, #64748b);
          background: var(--director-slate-100, #f1f5f9);
          border-color: var(--director-slate-200, #e2e8f0);
          cursor: not-allowed;
          opacity: 1;
        }

        /* Direktor responsiv: planshet */
        @media (max-width: 1023px) {
          .director-profile-page { padding: 20px; }
          .director-profile-page .profile-hero { gap: 16px; }
          .director-profile-page .profile-hero h1 { font-size: 24px; }
        }

        /* Direktor responsiv: telefon */
        @media (max-width: 639px) {
          .director-profile-page { padding: 16px 14px; }
          .director-profile-page .profile-hero {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            margin-bottom: 20px;
            padding: 0;
          }
          .director-profile-page .profile-hero h1 { font-size: 24px; }
          .director-profile-page .profile-hero p { font-size: 13px; }
          .director-profile-page .profile-hero-btn,
          .director-profile-page .btn,
          .director-profile-page .btn-edit {
            width: 100%;
            min-height: 40px;
            justify-content: center;
          }
          .director-profile-page .profile-card { padding: 16px; margin-bottom: 16px; }
          .director-profile-page .card-header {
            align-items: stretch;
            flex-direction: column;
            gap: 12px;
          }
          .director-profile-page .form-actions {
            align-items: stretch;
            flex-direction: column;
          }
          .director-profile-page .form-grid { grid-template-columns: 1fr; }
          .director-profile-page .form-input,
          .director-profile-page .form-value { font-size: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .director-profile-page *,
          .director-profile-page *::before,
          .director-profile-page *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* Image Preview Modal */}
      {showImageModal && imagePreview && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setShowImageModal(false)}>
              ✕
            </button>
            <div className="image-modal-content">
              <img src={imagePreview} alt="Profil rasmi" className="image-modal-img" />
            </div>
            <div className="image-modal-info">
              <h3>{user?.firstName} {user?.lastName}</h3>
              <p>{user?.role}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Image Modal Styles */
        .image-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 2rem;
          animation: modalFadeIn 0.3s ease-out;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .image-modal-container {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          animation: modalScaleIn 0.3s ease-out;
        }

        @keyframes modalScaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .image-modal-close {
          position: absolute;
          top: -50px;
          right: 0;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-weight: 300;
        }

        .image-modal-close:hover {
          background: #ef4444;
          transform: rotate(90deg) scale(1.1);
        }

        .image-modal-content {
          background: white;
          border-radius: 20px;
          padding: 1rem;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          max-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-modal-img {
          max-width: 100%;
          max-height: 70vh;
          border-radius: 12px;
          object-fit: contain;
        }

        .image-modal-info {
          text-align: center;
          margin-top: 1.5rem;
          color: white;
        }

        .image-modal-info h3 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .image-modal-info p {
          font-size: 1.125rem;
          opacity: 0.9;
          text-transform: capitalize;
        }

        /* Image modal responsive (planshet va telefon) */
        @media (min-width: 481px) and (max-width: 991px) {
          .image-modal-overlay { padding: 1.25rem; }
          .image-modal-close { top: -42px; width: 40px; height: 40px; font-size: 1.25rem; }
          .image-modal-content { max-height: 65vh; padding: 0.875rem; }
          .image-modal-img { max-height: 65vh; }
          .image-modal-info h3 { font-size: 1.4rem; }
          .image-modal-info p { font-size: 0.95rem; }
        }

        @media (max-width: 480px) {
          .image-modal-overlay { padding: 0.75rem; }
          .image-modal-close { top: -38px; width: 36px; height: 36px; font-size: 1.1rem; }
          .image-modal-content { max-height: 55vh; padding: 0.625rem; border-radius: 16px; }
          .image-modal-img { max-height: 55vh; border-radius: 10px; }
          .image-modal-info { margin-top: 1rem; }
          .image-modal-info h3 { font-size: 1.15rem; }
          .image-modal-info p { font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
};

export default Profile;
