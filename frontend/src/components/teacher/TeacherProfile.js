import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/authService';
import { formatUzLongDate } from '../../utils/uzDate';
import TeacherUiIcon from './TeacherUiIcon';
import styles from './TeacherProfile.module.css';

const ROLE_LABELS = {
  teacher: "O'qituvchi",
  admin: 'Administrator',
  director: 'Direktor',
  supervisor: 'Nazoratchi',
  accountant: 'Hisobchi'
};

const TeacherProfile = () => {
  const { user, updateUser, loadUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);

  useEffect(() => {
    if (user?.profileImage) {
      const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
      setImagePreview(`${baseUrl}${user.profileImage}?t=${Date.now()}`);
    } else {
      setImagePreview(null);
    }
  }, [user?.profileImage]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        email: user.email || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  const initials = useMemo(() => {
    const first = user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'O';
    const last = user?.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }, [user?.firstName, user?.lastName, user?.username]);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || "O'qituvchi";
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || "O'qituvchi";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Iltimos, rasm faylini tanlang');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }
    setProfileImage(file);
    setRemoveProfileImage(false);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const removeImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    setRemoveProfileImage(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');
    try {
      const submitData = new FormData();
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('phone', formData.phone);
      submitData.append('email', formData.email);
      if (profileImage) submitData.append('profileImage', profileImage);
      else if (removeProfileImage) submitData.append('removeProfileImage', 'true');

      const response = await api.put(`/users/${user._id}`, submitData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });

      if (response.data.profileImage) {
        const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
        setImagePreview(`${baseUrl}${response.data.profileImage}?t=${Date.now()}`);
      } else {
        setImagePreview(null);
      }
      updateUser(response.data);
      await loadUser();
      setSuccess('Profil muvaffaqiyatli yangilandi');
      setIsEditing(false);
      setProfileImage(null);
      setRemoveProfileImage(false);
      setUploadProgress(0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Profilni yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Yangi parollar mos kelmadi');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/users/${user._id}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSuccess("Parol muvaffaqiyatli o'zgartirildi");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
    } catch (err) {
      setError(err.response?.data?.message || "Parolni o'zgartirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = useCallback(() => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      email: user?.email || ''
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
    setProfileImage(null);
    setRemoveProfileImage(false);
    setUploadProgress(0);
    if (user?.profileImage) {
      const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
      setImagePreview(`${baseUrl}${user.profileImage}?t=${Date.now()}`);
    } else {
      setImagePreview(null);
    }
  }, [user]);

  return (
    <div className={styles.profile}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Shaxsiy kabinet</p>
          <h1 className={styles.title}>Profil</h1>
          <p className={styles.subtitle}>Shaxsiy ma'lumotlar va xavfsizlik sozlamalari.</p>
        </div>
      </header>

      {error && <div className="td-alert td-alert--error"><TeacherUiIcon name="warning" size={15} /> {error}</div>}
      {success && <div className="td-alert td-alert--success"><TeacherUiIcon name="check" size={15} /> {success}</div>}

      {loading && uploadProgress > 0 && uploadProgress < 100 && (
        <div className={styles.progress}>
          <div className={styles.progressTrack}>
            <span style={{ width: `${uploadProgress}%` }} />
          </div>
          <span>Yuklanmoqda: {uploadProgress}%</span>
        </div>
      )}

      <section className={styles.hero}>
        <div className={styles.avatarWrap}>
          <button
            type="button"
            className={styles.avatar}
            style={imagePreview ? { backgroundImage: `url(${imagePreview})` } : undefined}
            onClick={() => imagePreview && !isEditing && setShowImageModal(true)}
            aria-label={imagePreview ? "Profil rasmini ko'rish" : 'Profil rasmi'}
          >
            {!imagePreview && initials}
          </button>
          {isEditing && (
            <>
              <input
                type="file"
                id="profile-image-upload"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              <label htmlFor="profile-image-upload" className={styles.avatarUpload} title="Rasm yuklash">
                <TeacherUiIcon name="camera" size={14} />
              </label>
              {(profileImage || imagePreview) && (
                <button type="button" className={styles.avatarRemove} onClick={removeImage} title="Rasmni olib tashlash">
                  <TeacherUiIcon name="close" size={12} />
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.heroInfo}>
          <h2>{fullName}</h2>
          <div className={styles.heroMeta}>
            <span className="td-chip td-chip--gold">{roleLabel}</span>
            {user?.username && <span className={styles.username}>@{user.username}</span>}
          </div>
          <div className={styles.heroContacts}>
            <span><TeacherUiIcon name="phone" size={14} /> {user?.phone || "Telefon kiritilmagan"}</span>
            <span><TeacherUiIcon name="mail" size={14} /> {user?.email || "Email kiritilmagan"}</span>
          </div>
        </div>

        <div className={styles.heroActions}>
          {!isEditing ? (
            <button type="button" className="td-btn td-btn--gold" onClick={() => setIsEditing(true)}>
              <TeacherUiIcon name="edit" size={14} /> Tahrirlash
            </button>
          ) : (
            <button type="button" className="td-btn td-btn--ghost" onClick={handleCancel}>
              Bekor qilish
            </button>
          )}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={`td-card ${styles.card}`}>
          <div className="td-card-head">
            <div>
              <h2 className="td-card-title">Shaxsiy ma'lumotlar</h2>
              <p className="td-card-sub">Ism, familiya va aloqa ma'lumotlari</p>
            </div>
            <span className={styles.cardIcon}><TeacherUiIcon name="profile" size={17} /></span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <label className="td-label">
                Ism
                {isEditing ? (
                  <input className="td-input" type="text" name="firstName" value={formData.firstName} onChange={handleChange} required disabled={loading} />
                ) : (
                  <span className={styles.value}>{user?.firstName || '—'}</span>
                )}
              </label>
              <label className="td-label">
                Familiya
                {isEditing ? (
                  <input className="td-input" type="text" name="lastName" value={formData.lastName} onChange={handleChange} required disabled={loading} />
                ) : (
                  <span className={styles.value}>{user?.lastName || '—'}</span>
                )}
              </label>
              <label className="td-label">
                Telefon
                {isEditing ? (
                  <input className="td-input" type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={loading} placeholder="+998 90 123 45 67" />
                ) : (
                  <span className={styles.value}>{user?.phone || '—'}</span>
                )}
              </label>
              <label className="td-label">
                Email
                {isEditing ? (
                  <input className="td-input" type="email" name="email" value={formData.email} onChange={handleChange} disabled={loading} placeholder="ism@example.com" />
                ) : (
                  <span className={styles.value}>{user?.email || '—'}</span>
                )}
              </label>
            </div>

            {isEditing && (
              <div className={styles.formActions}>
                <button type="button" className="td-btn td-btn--ghost" onClick={handleCancel} disabled={loading}>Bekor qilish</button>
                <button type="submit" className="td-btn td-btn--gold" disabled={loading}>
                  <TeacherUiIcon name="save" size={14} /> {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            )}
          </form>
        </section>

        <div className={styles.side}>
          <section className={`td-card ${styles.card}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">Xavfsizlik</h2>
                <p className="td-card-sub">Parolni o'zgartirish</p>
              </div>
              <span className={styles.cardIcon}><TeacherUiIcon name="shield" size={17} /></span>
            </div>

            {!showPasswordChange ? (
              <div className={styles.security}>
                <p>Hisobingiz xavfsizligi uchun parolni vaqti-vaqti bilan yangilang.</p>
                <button type="button" className="td-btn td-btn--ghost" onClick={() => setShowPasswordChange(true)}>
                  <TeacherUiIcon name="key" size={14} /> Parolni o'zgartirish
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
                <label className="td-label">
                  Joriy parol
                  <input className="td-input" type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required disabled={loading} />
                </label>
                <label className="td-label">
                  Yangi parol
                  <input className="td-input" type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required minLength="6" disabled={loading} />
                </label>
                <label className="td-label">
                  Parolni tasdiqlash
                  <input className="td-input" type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required minLength="6" disabled={loading} />
                </label>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className="td-btn td-btn--ghost"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                  >
                    Bekor qilish
                  </button>
                  <button type="submit" className="td-btn td-btn--gold" disabled={loading}>
                    {loading ? 'Saqlanmoqda...' : 'Yangilash'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className={`td-card ${styles.card}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">Hisob ma'lumotlari</h2>
                <p className="td-card-sub">Tizimdagi hisobingiz</p>
              </div>
            </div>
            <div className={styles.account}>
              <div>
                <span>Foydalanuvchi nomi</span>
                <strong>{user?.username || '—'}</strong>
              </div>
              <div>
                <span>Rol</span>
                <strong>{roleLabel}</strong>
              </div>
              <div>
                <span>Ro'yxatdan o'tgan</span>
                <strong>
                  {user?.createdAt
                    ? formatUzLongDate(user.createdAt, { year: true })
                    : '—'}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showImageModal && imagePreview && (
        <div className={styles.modalOverlay} onClick={() => setShowImageModal(false)}>
          <div className={styles.imageModal} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => setShowImageModal(false)} aria-label="Yopish">
              <TeacherUiIcon name="close" size={18} />
            </button>
            <img src={imagePreview} alt="Profil rasmi" />
            <div>
              <strong>{fullName}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;
