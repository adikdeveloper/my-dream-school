import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/authService';

const StudentProfile = () => {
  const { user, updateUser, loadUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || ''
      });

      if (user.profileImage) {
        const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
        setImagePreview(`${baseUrl}${user.profileImage}?t=${Date.now()}`);
      }
    }
  }, [user]);

  // Show loading while user is being fetched
  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h1 className="profile-title">Yuklanmoqda...</h1>
        </div>
      </div>
    );
  }

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

      // Students cannot change their profile image - removed image upload
      // Profile image can only be changed by admin or teacher

      const response = await api.put(`/users/${user._id}`, submitData);

      // Update local preview first
      if (response.data.profileImage) {
        const newImageUrl = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${response.data.profileImage}?t=${Date.now()}`;
        setImagePreview(newImageUrl);
      } else {
        setImagePreview(null);
      }

      // Update user in context immediately to trigger header re-render
      updateUser(response.data);

      // Force a fresh load from server to ensure all data is in sync
      await loadUser();

      // Dispatch custom event to force header update
      window.dispatchEvent(new Event('profileImageUpdated'));

      setSuccess('Profil muvaffaqiyatli yangilandi!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Profilni yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Yangi parollar mos kelmadi');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    // Backend bilan bir xil qoida: kamida bitta raqam yoki maxsus belgi
    if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordData.newPassword)) {
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
      setError(err.response?.data?.message || 'Parolni o\'zgartirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || ''
      });

      if (user.profileImage) {
        const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
        setImagePreview(`${baseUrl}${user.profileImage}?t=${Date.now()}`);
      } else {
        setImagePreview(null);
      }
    }

    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1 className="profile-title">Mening profilim</h1>
        <p className="profile-subtitle">Shaxsiy ma'lumotlaringizni boshqaring</p>
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
              {/* Image upload removed - students cannot change their own photo */}
            </div>
            <div>
              <h2 className="card-title">Shaxsiy ma'lumotlar</h2>
              <p className="card-subtitle">O'quvchi</p>
            </div>
          </div>
          {!isEditing && (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              <span>✏️</span>
              <span>Tahrirlash</span>
            </button>
          )}
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
                  required
                />
              ) : (
                <div className="form-value">{user?.lastName}</div>
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
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f8fafc;
        }

        .profile-header {
          margin-bottom: 2rem;
        }

        .profile-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 0.35rem 0;
          line-height: 1.2;
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .profile-subtitle {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
        }

        .alert {
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert-icon {
          font-size: 1.25rem;
        }

        .profile-card {
          background: white;
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          margin-bottom: 1.25rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #f1f5f9;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .avatar-upload-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
        }

        .profile-avatar-large {
          width: 96px;
          height: 96px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 2rem;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
          transition: all 0.3s ease;
          border: 4px solid white;
          overflow: hidden;
          position: relative;
        }

        .profile-avatar-large:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 28px rgba(16, 185, 129, 0.45);
        }

        .avatar-upload-wrapper:not(:has(.avatar-upload-btn)) .profile-avatar-large {
          cursor: pointer;
        }

        .avatar-upload-btn {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
          border: 3px solid white;
        }

        .avatar-upload-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 6px 20px rgba(34, 197, 94, 0.5);
        }

        .upload-icon {
          font-size: 1.25rem;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
        }

        .avatar-remove-btn {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          color: white;
          font-size: 1rem;
          font-weight: 700;
        }

        .avatar-remove-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }

        .icon-wrapper {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.1rem;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
        }

        .card-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
          text-transform: capitalize;
        }

        .btn-edit {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-edit:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .profile-form {
          margin-top: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
        }

        .form-input {
          padding: 0.875rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.9375rem;
          color: #1e293b;
          background: white;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }

        .form-value {
          padding: 0.875rem 1rem;
          background: #f8fafc;
          border-radius: 12px;
          font-size: 0.9375rem;
          color: #1e293b;
          font-weight: 500;
          border: 2px solid #f1f5f9;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 2px solid #f1f5f9;
        }

        .btn {
          padding: 0.875rem 2rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-cancel {
          background: white;
          color: #64748b;
          border: 2px solid #e2e8f0;
        }

        .btn-cancel:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .btn-save {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 1rem;
          }

          .profile-title {
            font-size: 1.5rem;
          }

          .profile-card {
            padding: 1.5rem;
          }

          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .avatar-upload-wrapper {
            width: 80px;
            height: 80px;
          }

          .profile-avatar-large {
            width: 80px;
            height: 80px;
            font-size: 1.75rem;
            border-radius: 20px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .profile-page { padding: 0.75rem; }
          .profile-title { font-size: 1.25rem; }
          .profile-card { padding: 1.25rem; border-radius: 14px; }
          .card-header { padding-bottom: 1rem; margin-bottom: 1.25rem; }
          .card-title { font-size: 1.2rem; }
          .profile-avatar-large { width: 72px; height: 72px; font-size: 1.5rem; border-radius: 16px; }
          .icon-wrapper { width: 60px; height: 60px; font-size: 1.8rem; border-radius: 14px; }
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
              <p>O'quvchi</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
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

        @media (max-width: 768px) {
          .image-modal-overlay {
            padding: 1rem;
          }

          .image-modal-close {
            top: -40px;
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
          }

          .image-modal-content {
            max-height: 60vh;
          }

          .image-modal-img {
            max-height: 60vh;
          }

          .image-modal-info h3 {
            font-size: 1.5rem;
          }

          .image-modal-info p {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentProfile;
