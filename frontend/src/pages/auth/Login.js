import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import styles from './Login.module.css';

const DEFAULT_RECAPTCHA_SITE_KEY = '6Lcr3s8sAAAAALgeAf60-W0MrcSf8FbsmkrphFmt';
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || DEFAULT_RECAPTCHA_SITE_KEY;
const RECAPTCHA_ACTION = 'login';
let recaptchaScriptPromise;

const loadRecaptchaScript = () => {
  if (!RECAPTCHA_SITE_KEY) {
    return Promise.resolve(null);
  }

  if (window.grecaptcha?.execute) {
    return Promise.resolve(window.grecaptcha);
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise;
  }

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-recaptcha-script="true"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.grecaptcha));
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaScript = 'true';
    script.onload = () => resolve(window.grecaptcha);
    script.onerror = reject;
    document.body.appendChild(script);
  });

  return recaptchaScriptPromise;
};

const getRecaptchaToken = async () => {
  if (!RECAPTCHA_SITE_KEY) {
    return '';
  }

  const grecaptcha = await loadRecaptchaScript();

  return new Promise((resolve, reject) => {
    if (!grecaptcha?.ready || !grecaptcha?.execute) {
      reject(new Error('reCAPTCHA is not available'));
      return;
    }

    grecaptcha.ready(() => {
      grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action: RECAPTCHA_ACTION })
        .then(resolve)
        .catch(reject);
    });
  });
};

const cleanupRecaptchaBadge = () => {
  document.querySelectorAll('.grecaptcha-badge').forEach((badge) => {
    const container = badge.parentElement;
    badge.remove();

    if (container && container.childElementCount === 0 && !container.id) {
      container.remove();
    }
  });
};

// SVG Icons
const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const Login = () => {
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneHistory, setPhoneHistory] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const { login, isAuthenticated, user, error } = useAuth();

  // Clear auth data when component mounts (user is on login page)
  useEffect(() => {
    // If user is on login page but has old token, clear it
    if (!isAuthenticated) {
      localStorage.removeItem('token');
    }
  }, [isAuthenticated]);

  // Initialize phone with +998
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      phone: '+998'
    }));
  }, []);

  // Load phone history from localStorage
  useEffect(() => {
    const savedPhones = localStorage.getItem('phoneHistory');
    if (savedPhones) {
      setPhoneHistory(JSON.parse(savedPhones));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      return undefined;
    }

    let cancelled = false;

    loadRecaptchaScript()
      .then((grecaptcha) => {
        if (!grecaptcha || cancelled) {
          return;
        }

        grecaptcha.ready(() => {
          if (!cancelled) {
            setRecaptchaError('');
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setRecaptchaError('reCAPTCHA yuklanmadi. Internetni tekshirib qayta urinib ko\'ring.');
        }
      });

    return () => {
      cancelled = true;
      cleanupRecaptchaBadge();
      window.setTimeout(cleanupRecaptchaBadge, 0);
    };
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    const ROLE_PATH = { callcenter: 'call-center' };
    const rolePath = ROLE_PATH[user.role] || user.role;
    const redirectPath = `/${rolePath}`;
    return <Navigate to={redirectPath} replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      // Remove all non-digits
      let digits = value.replace(/\D/g, '');

      // If user is trying to delete and we're at +998, keep it at +998
      if (digits.length < 3) {
        digits = '998';
      }

      // If digits don't start with 998, prepend it
      if (!digits.startsWith('998')) {
        digits = '998' + digits;
      }

      // Remove the 998 prefix for processing
      const phoneDigits = digits.slice(3);

      // Limit to 9 digits after 998
      const limitedDigits = phoneDigits.slice(0, 9);

      // Format as +998-XX-XXX-XX-XX
      let formattedPhone = '+998';
      if (limitedDigits.length > 0) {
        formattedPhone += '-' + limitedDigits.slice(0, 2);
      }
      if (limitedDigits.length > 2) {
        formattedPhone += '-' + limitedDigits.slice(2, 5);
      }
      if (limitedDigits.length > 5) {
        formattedPhone += '-' + limitedDigits.slice(5, 7);
      }
      if (limitedDigits.length > 7) {
        formattedPhone += '-' + limitedDigits.slice(7, 9);
      }

      setFormData({
        ...formData,
        [name]: formattedPhone
      });

      // Show dropdown if user clears the input back to default (+998) and history exists
      if (formattedPhone === '+998' && phoneHistory.length > 0 && isFocused) {
        setShowDropdown(true);
      } else if (limitedDigits.length > 0) {
        // Hide dropdown when user starts typing
        setShowDropdown(false);
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const savePhoneToHistory = (phone) => {
    // Remove formatting to check length
    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length === 12 && digitsOnly.startsWith('998')) {
      // Get existing history
      let history = [...phoneHistory];

      // Remove phone if it already exists
      history = history.filter(p => p.replace(/\D/g, '') !== digitsOnly);

      // Add phone to the beginning (most recent first)
      history.unshift(phone);

      // Keep only last 5 phones
      history = history.slice(0, 5);

      // Save to state and localStorage
      setPhoneHistory(history);
      localStorage.setItem('phoneHistory', JSON.stringify(history));
    }
  };

  const handlePhoneSelect = (phone) => {
    setFormData({
      ...formData,
      phone: phone
    });
    setShowDropdown(false);
    setIsFocused(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let recaptchaToken = '';

    try {
      recaptchaToken = await getRecaptchaToken();
      setRecaptchaError('');
    } catch (error) {
      setRecaptchaError('reCAPTCHA token olinmadi. Qayta urinib ko\'ring.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Remove formatting before sending to backend
      const cleanPhone = formData.phone.replace(/\D/g, '');
      const phoneForBackend = '+' + cleanPhone;

      await login(phoneForBackend, formData.password, recaptchaToken);
      cleanupRecaptchaBadge();
      window.setTimeout(cleanupRecaptchaBadge, 0);
      // Save formatted phone to history on successful login
      savePhoneToHistory(formData.phone);
    } catch (error) {
      // Error is handled by AuthContext and displayed in UI
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={`${styles.loginCard} card`}>
          <div className={styles.loginHeader}>
            <div className={styles.logoWrapper}>
              <Logo size="large" />
            </div>
            <h1 className={styles.loginTitle}>Xush kelibsiz</h1>
            <p className={styles.loginSubtitle}>Hisobingizga kiring</p>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <div className="form-group" ref={dropdownRef} style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <label htmlFor="phone" className={styles.formLabel}>
                Telefon raqami
              </label>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon}><PhoneIcon /></span>
                <input
                  ref={inputRef}
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onFocus={() => {
                    setIsFocused(true);
                    if (phoneHistory.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  className={styles.formInput}
                  required
                  placeholder="+998-90-123-45-67"
                  maxLength="17"
                  autoComplete="off"
                />
              </div>

              {/* Phone History Dropdown */}
              {showDropdown && isFocused && phoneHistory.length > 0 && (
                <div className={styles.phoneDropdown}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownTitle}>Oxirgi kirganlar</span>
                    <button
                      type="button"
                      className={styles.clearHistoryBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        localStorage.removeItem('phoneHistory');
                        setPhoneHistory([]);
                        setShowDropdown(false);
                      }}
                      title="Tarixni tozalash"
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.dropdownList}>
                    {phoneHistory.map((phone, index) => (
                      <div
                        key={index}
                        className={styles.dropdownItem}
                        onClick={() => handlePhoneSelect(phone)}
                      >
                        <span className={styles.dropdownIcon}>📱</span>
                        <span className={styles.phoneNumber}>{phone}</span>
                        {index === 0 && (
                          <span className={styles.recentBadge}>So'nggi</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password" className={styles.formLabel}>
                Parol
              </label>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                  placeholder="Parolingizni kiriting"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {recaptchaError && (
              <div className={styles.recaptchaError}>{recaptchaError}</div>
            )}

            <button
              type="submit"
              className={styles.loginBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className={styles.loadingSpinner}></span>
              ) : (
                <>
                  Kirish <span className={styles.btnArrow}>→</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
