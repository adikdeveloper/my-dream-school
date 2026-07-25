import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [countStarted, setCountStarted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      // Start count animation when stats section is visible
      const statsSection = document.getElementById('stats-section');
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && !countStarted) {
          setCountStarted(true);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [countStarted]);

  const features = [
    {
      icon: '💻',
      title: 'IT Ta\'lim',
      desc: 'Dasturlash, Sun\'iy Intellekt, Kiberxavfsizlik, Web va Mobile development — zamonaviy texnologiyalar dunyosiga kirish.'
    },
    {
      icon: '📊',
      title: 'Biznes & Menejment',
      desc: 'Giroh boshqarish, Marketing, Moliya va Tadbirkorlik asoslarini professional o\'qituvchilardan o\'rganing.'
    },
    {
      icon: '🌍',
      title: 'To\'liq Ingliz Tilida',
      desc: 'Barcha darslar ingliz tilida olib boriladi. Xalqaro sertifikatlar uchun tayyorlanasiz.'
    },
    {
      icon: '🏆',
      title: 'Sertifikatlar',
      desc: 'Xalqaro tan olingan sertifikatlar — Cambridge, IELTS, IT Professional, Business Analytics va boshqalar.'
    },
    {
      icon: '🚀',
      title: 'Karyera Yo\'li',
      desc: 'Bitiruvchilarimiz dunyoning yetakchi kompaniyalarida ishlaydi. Karyera markazi yordam beradi.'
    },
    {
      icon: '👩‍🏫',
      title: 'Expert O\'qituvchilar',
      desc: 'Sohada 10+ yillik tajribaga ega, xalqaro sertifikatlangan o\'qituvchilar jamoasi.'
    }
  ];

  const stats = [
    { number: '500+', label: 'Faol O\'quvchilar', icon: '👨‍🎓' },
    { number: '50+', label: 'Expert O\'qituvchilar', icon: '👩‍🏫' },
    { number: '95%', label: 'Bandlik Ko\'rsatkichi', icon: '💼' },
    { number: '10+', label: 'Yillik Tajriba', icon: '⭐' }
  ];

  const programs = [
    {
      badge: 'Eng Mashhur',
      badgeColor: 'gold',
      title: 'Full Stack Development',
      subtitle: 'IT yo\'nalishi',
      duration: '18 oy',
      level: 'Boshlang\'ich → Professional',
      topics: ['HTML/CSS/JavaScript', 'React & Node.js', 'Databases & Cloud', 'AI Integration'],
      color: 'blue'
    },
    {
      badge: 'Yangi',
      badgeColor: 'green',
      title: 'Business Analytics',
      subtitle: 'Biznes yo\'nalishi',
      duration: '12 oy',
      level: 'O\'rta → Expert',
      topics: ['Data Analysis', 'Financial Management', 'Marketing Strategy', 'Leadership Skills'],
      color: 'purple'
    },
    {
      badge: 'Premium',
      badgeColor: 'orange',
      title: 'Cybersecurity & AI',
      subtitle: 'IT yo\'nalishi',
      duration: '24 oy',
      level: 'Boshlang\'ich → Expert',
      topics: ['Network Security', 'Ethical Hacking', 'Machine Learning', 'AI Systems'],
      color: 'dark'
    }
  ];

  return (
    <div className="landing-page">
      {/* ===== NAVBAR ===== */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-container">
          <div className="landing-logo">
            <span className="logo-icon">🎓</span>
            <div className="logo-texts">
              <span className="logo-main">My Dream School</span>
              <span className="logo-sub">IT & Business Academy</span>
            </div>
          </div>
          <div className="landing-nav-links">
            <a href="#about" className="landing-nav-link">Biz haqimizda</a>
            <a href="#programs" className="landing-nav-link">Dasturlar</a>
            <a href="#stats-section" className="landing-nav-link">Natijalar</a>
            <a href="#contact" className="landing-nav-link">Aloqa</a>
          </div>
          <button
            className="landing-login-btn"
            onClick={() => navigate('/login')}
            id="landing-login-button"
          >
            <span>🔐</span>
            Kirish
          </button>
          <button className="mobile-menu-btn" onClick={() => navigate('/login')}>
            Kirish
          </button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <div className="hero-wrapper">
      <section className="hero-section">
        <div className="hero-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="floating-dots">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="dot" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}></div>
            ))}
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span>✨</span> O'zbekistonning #1 IT & Business Maktabi
          </div>
          <h1 className="hero-title">
            <span className="hero-title-line1">Kelajagingizni</span>
            <span className="hero-title-highlight">MY DREAM SCHOOL</span>
            <span className="hero-title-line2">bilan quring</span>
          </h1>
          <p className="hero-description">
            IT va Biznesga ixtisoslashtirilgan, barcha darslar <strong>to'liq ingliz tilida</strong> olib boriladigan
            zamonaviy ta'lim markazi. Xalqaro sertifikatlar, tajribali o'qituvchilar va real loyihalar orqali
            professional karyerangizni boshlang.
          </p>
          <div className="hero-tags">
            <span className="hero-tag">💡 IT Ta'lim</span>
            <span className="hero-tag">📊 Biznes</span>
            <span className="hero-tag">🌍 English Only</span>
            <span className="hero-tag">🏆 Sertifikat</span>
          </div>
          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={() => navigate('/login')}>
              <span>🚀</span>
              Hoziroq Boshlash
            </button>
            <a href="#programs" className="hero-btn-secondary">
              <span>📚</span>
              Dasturlarni Ko'rish
            </a>
          </div>
          <div className="hero-trust">
            <div className="trust-avatars">
              {['👨‍💻', '👩‍💼', '👨‍🎓', '👩‍🏫', '👨‍💼'].map((emoji, i) => (
                <div key={i} className="trust-avatar">{emoji}</div>
              ))}
            </div>
            <div className="trust-text">
              <strong>500+ o'quvchi</strong> bizga ishondi
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card-main">
            <div className="hero-card-header">
              <span>🎓</span>
              <span>My Dream School</span>
            </div>
            <div className="hero-card-stats">
              <div className="hcs-item">
                <span className="hcs-num">500+</span>
                <span className="hcs-lab">O'quvchilar</span>
              </div>
              <div className="hcs-divider"></div>
              <div className="hcs-item">
                <span className="hcs-num">95%</span>
                <span className="hcs-lab">Bandlik</span>
              </div>
              <div className="hcs-divider"></div>
              <div className="hcs-item">
                <span className="hcs-num">10+</span>
                <span className="hcs-lab">Yil Tajriba</span>
              </div>
            </div>
            <div className="hero-card-programs">
              <div className="hcp-item active">
                <span>💻</span> Full Stack Development
              </div>
              <div className="hcp-item">
                <span>📊</span> Business Analytics
              </div>
              <div className="hcp-item">
                <span>🔐</span> Cybersecurity & AI
              </div>
              <div className="hcp-item">
                <span>📱</span> Mobile Development
              </div>
            </div>
            <div className="hero-card-badge">
              🌍 To'liq Ingliz Tilida
            </div>
          </div>

          <div className="floating-card fc-1">
            <span>🏆</span>
            <div>
              <strong>Xalqaro Sertifikat</strong>
              <small>Cambridge & IT Pro</small>
            </div>
          </div>
          <div className="floating-card fc-2">
            <span>⚡</span>
            <div>
              <strong>Live Darslar</strong>
              <small>Real vaqtda o'qish</small>
            </div>
          </div>
          <div className="floating-card fc-3">
            <span>💼</span>
            <div>
              <strong>Karyera Markazi</strong>
              <small>Ish joyi kafolati</small>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* ===== FEATURES ===== */}
      <section className="features-section" id="about">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Nima uchun biz?</span>
            <h2 className="section-title">My Dream School'ning Afzalliklari</h2>
            <p className="section-subtitle">
              Zamonaviy ta'lim metodikasi, tajribali o'qituvchilar va real dunyo loyihalari
              orqali siz uchun eng yaxshi ta'limni taqdim etamiz.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
                <div className="feature-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="stats-section" id="stats-section">
        <div className="stats-bg-shape"></div>
        <div className="section-container">
          <div className="stats-content">
            <div className="stats-left">
              <span className="section-badge light">Natijalarimiz</span>
              <h2 className="stats-title">Raqamlar biz haqimizda gapiradi</h2>
              <p className="stats-desc">
                Har yili yuzlab o'quvchilarimiz o'z sohasida professional mutaxassis
                bo'lib chiqmoqda. Bizning natijalarimiz — sizning muvaffaqiyatingiz.
              </p>
              <button className="stats-cta" onClick={() => navigate('/login')}>
                Qo'shiling →
              </button>
            </div>
            <div className="stats-right">
              {stats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-number-big">{stat.number}</div>
                  <div className="stat-label-big">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROGRAMS ===== */}
      <section className="programs-section" id="programs">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Ta'lim dasturlari</span>
            <h2 className="section-title">Bizning Dasturlarimiz</h2>
            <p className="section-subtitle">
              Professional karyerangiz uchun maxsus ishlab chiqilgan dasturlar.
              Barcha darslar to'liq ingliz tilida olib boriladi.
            </p>
          </div>
          <div className="programs-grid">
            {programs.map((program, index) => (
              <div key={index} className={`program-card program-${program.color}`}>
                <div className={`program-badge badge-${program.badgeColor}`}>{program.badge}</div>
                <div className="program-subtitle">{program.subtitle}</div>
                <h3 className="program-title">{program.title}</h3>
                <div className="program-meta">
                  <span>⏱ {program.duration}</span>
                  <span>📈 {program.level}</span>
                </div>
                <ul className="program-topics">
                  {program.topics.map((topic, i) => (
                    <li key={i}><span>✓</span> {topic}</li>
                  ))}
                </ul>
                <button className="program-btn" onClick={() => navigate('/login')}>
                  Batafsil Ma'lumot →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ENGLISH SECTION ===== */}
      <section className="english-section">
        <div className="section-container">
          <div className="english-content">
            <div className="english-visual">
              <div className="english-globe">🌍</div>
              <div className="english-flags">
                <span>🇬🇧</span><span>🇺🇸</span><span>🇦🇺</span><span>🇨🇦</span>
              </div>
            </div>
            <div className="english-text">
              <span className="section-badge">Ingliz Tili</span>
              <h2 className="english-title">Barcha Darslar <br /><span>To'liq Ingliz Tilida</span></h2>
              <p className="english-desc">
                My Dream School'da har bir dars ingliz tilida olib boriladi.
                Bu sizga nafaqat kasbiy bilim, balki xalqaro darajadagi
                ingliz tili ko'nikmalarini ham beradi.
              </p>
              <div className="english-benefits">
                <div className="eb-item">
                  <span>✅</span>
                  <span>Xalqaro sertifikatlar uchun tayyor bo'lasiz</span>
                </div>
                <div className="eb-item">
                  <span>✅</span>
                  <span>Global kompaniyalarda ishlash imkoniyati</span>
                </div>
                <div className="eb-item">
                  <span>✅</span>
                  <span>IELTS va Cambridge imtihonlariga tayyorlanish</span>
                </div>
                <div className="eb-item">
                  <span>✅</span>
                  <span>Professional ingliz tili lug'ati va ko'nikmalari</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="cta-section" id="contact">
        <div className="cta-bg-shapes">
          <div className="cta-shape-1"></div>
          <div className="cta-shape-2"></div>
        </div>
        <div className="section-container">
          <div className="cta-content">
            <div className="cta-icon">🚀</div>
            <h2 className="cta-title">Kelajagingizni Bugun Boshlang!</h2>
            <p className="cta-desc">
              My Dream School — IT va Biznes sohasidagi professional karyerangiz
              uchun eng to'g'ri qadam. Hoziroq ro'yxatdan o'ting va birinchi darsni
              bepul oling!
            </p>
            <div className="cta-actions">
              <button className="cta-btn-primary" onClick={() => navigate('/login')}>
                🔐 Tizimga Kirish
              </button>
              <a href="tel:+998901234567" className="cta-btn-secondary">
                📞 Bizga Qo'ng'iroq Qiling
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="section-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="landing-logo">
                <span className="logo-icon">🎓</span>
                <div className="logo-texts">
                  <span className="logo-main">My Dream School</span>
                  <span className="logo-sub">IT & Business Academy</span>
                </div>
              </div>
              <p className="footer-desc">
                O'zbekistonning yetakchi IT va Biznes ta'lim markazi.
                Barcha darslar to'liq ingliz tilida.
              </p>
            </div>
            <div className="footer-links-group">
              <h4>Dasturlar</h4>
              <a href="#programs">Full Stack Development</a>
              <a href="#programs">Business Analytics</a>
              <a href="#programs">Cybersecurity & AI</a>
              <a href="#programs">Mobile Development</a>
            </div>
            <div className="footer-links-group">
              <h4>Kompaniya</h4>
              <a href="#about">Biz haqimizda</a>
              <a href="#stats-section">Natijalar</a>
              <a href="#contact">Aloqa</a>
              <a href="#" onClick={() => navigate('/login')}>Kirish</a>
            </div>
            <div className="footer-links-group">
              <h4>Aloqa</h4>
              <a href="tel:+998901234567">📞 +998 90 123 45 67</a>
              <a href="mailto:info@mydreamschool.uz">✉️ info@mydreamschool.uz</a>
              <a href="#">📍 Toshkent, O'zbekiston</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2024 My Dream School IT & Business Academy. Barcha huquqlar himoyalangan.</p>
            <p>Made with ❤️ in Uzbekistan</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
