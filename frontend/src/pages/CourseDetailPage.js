import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import PublicIcon from '../components/public/PublicIcon';
import PublicPhoto from '../components/public/PublicPhoto';
import PublicCourseCard from '../components/public/PublicCourseCard';
import { courses, getCourseBySlug } from '../data/publicContent';
import './LandingPage.css';

const tabs = [
  { id: 'about', label: 'Kurs haqida' },
  { id: 'program', label: 'Dastur' },
  { id: 'teachers', label: 'Ustozlar' },
  { id: 'pricing', label: 'Narxlar' },
  { id: 'faq', label: 'FAQ' }
];

const CourseDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('about');
  const course = getCourseBySlug(slug);

  useEffect(() => {
    setActiveTab('about');
  }, [slug]);

  if (!course) {
    return (
      <div className="lp-root">
        <PublicHeader />
        <main className="lp-catalog">
          <div className="lp-container">
            <p className="lp-eyebrow">Kurs topilmadi</p>
            <h1 className="lp-section__title">Bunday kurs mavjud emas</h1>
            <p className="lp-section__subtitle">
              Kurslar ro'yxatiga qaytib, kerakli kursni tanlang.
            </p>
            <Link
              className="lp-btn lp-btn--gold"
              to="/courses"
              style={{ marginTop: '20px' }}
            >
              Kurslarga qaytish
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const similarCourses = courses
    .filter((item) => item.slug !== course.slug)
    .slice(0, 3);

  const goToContact = () => navigate('/#contact');

  return (
    <div className="lp-root">
      <PublicHeader />

      <main>
        <section className="lp-page-hero">
          <div className="lp-container lp-page-hero__inner">
            <div>
              <div className="lp-breadcrumb">
                <Link to="/courses">Kurslar</Link>
                <span>/</span>
                <span>{course.title}</span>
              </div>
              <p className="lp-eyebrow">{course.category} kursi</p>
              <h1>{course.title}</h1>
              <p className="lp-page-hero__desc">{course.description}</p>
              <div className="lp-page-hero__actions">
                <button type="button" className="lp-btn lp-btn--gold" onClick={goToContact}>
                  Ro'yxatdan o'tish
                  <PublicIcon name="arrowRight" size={16} />
                </button>
                <a className="lp-btn lp-btn--outline" href="#course-about">
                  Batafsil ma'lumot
                </a>
              </div>
            </div>

            <PublicPhoto
              variant="landscape"
              tone={course.tone}
              className="lp-page-hero__photo"
              alt={course.imageAlt}
            />
          </div>
        </section>

        <div className="lp-course-stats">
          {course.stats.map((stat) => (
            <div className="lp-course-stat" key={stat.label}>
              <span className="lp-course-stat__icon">
                <PublicIcon name={stat.icon} size={17} />
              </span>
              <div>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        <section className="lp-course-detail" id="course-about">
          <div className="lp-container lp-course-detail__grid">
            <div>
              <div className="lp-course-tabs" role="tablist" aria-label="Kurs bo'limlari">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`lp-course-tab${activeTab === tab.id ? ' is-active' : ''}`}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="lp-course-panel">
                {activeTab === 'about' && (
                  <>
                    <h2>Kurs haqida</h2>
                    <p>{course.description}</p>
                    <h3>Nima o'rganasiz?</h3>
                    <ul className="lp-course-outcomes">
                      {course.outcomes.map((outcome) => (
                        <li key={outcome}>
                          <span className="lp-about__check">
                            <PublicIcon name="check" size={13} />
                          </span>
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {activeTab === 'program' && (
                  <>
                    <h2>Kurs dasturi</h2>
                    <p>
                      Kurs {course.duration} davom etadi va bosqichma-bosqich
                      amaliy ko'nikmalarni shakllantiradi.
                    </p>
                    <ol className="lp-module-list">
                      {course.modules.map((module, index) => (
                        <li className="lp-module" key={module.title}>
                          <span className="lp-module__num">{index + 1}</span>
                          <div>
                            <h4>{module.title}</h4>
                            <p>{module.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {activeTab === 'teachers' && (
                  <>
                    <h2>Ustozlar</h2>
                    <p>Kurs davomida sizga tajribali va amaliyotchi ustozlar dars beradi.</p>
                    <div className="lp-teacher-detail">
                      <PublicPhoto
                        variant="portrait"
                        tone={course.teacher.tone}
                        className="lp-teacher-detail__photo"
                        alt={course.teacher.alt}
                      />
                      <div>
                        <h4>{course.teacher.name}</h4>
                        <p>{course.teacher.role}</p>
                        <p>
                          Sohada 8+ yillik tajribaga ega, real loyihalar va
                          amaliy mashg'ulotlar asosida dars beradi.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'pricing' && (
                  <>
                    <h2>Narxlar</h2>
                    <p>
                      Kurs narxi — <strong>{course.price}</strong>. To'lovni
                      oylik bo'lib to'lash imkoniyati mavjud.
                    </p>
                    <h3>Narxga nimalar kiradi?</h3>
                    <ul className="lp-course-outcomes">
                      {course.features.map((feature) => (
                        <li key={feature}>
                          <span className="lp-about__check">
                            <PublicIcon name="check" size={13} />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <p>
                      Birinchi sinov darsi bepul. Ro'yxatdan o'tish uchun biz
                      bilan bog'laning.
                    </p>
                  </>
                )}

                {activeTab === 'faq' && (
                  <>
                    <h2>Ko'p beriladigan savollar</h2>
                    <div className="lp-course-faq">
                      {course.faq.map((item) => (
                        <details key={item.q}>
                          <summary>{item.q}</summary>
                          <p>{item.a}</p>
                        </details>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <aside className="lp-course-sidebar">
              <div className="lp-course-sidebar__price">
                <strong>{course.price}</strong>
                <span>To'lovni bo'lib to'lash mumkin</span>
              </div>
              <button type="button" className="lp-btn lp-btn--gold" onClick={goToContact}>
                Ro'yxatdan o'tish
                <PublicIcon name="arrowRight" size={16} />
              </button>
              <ul className="lp-course-sidebar__features">
                {course.features.map((feature) => (
                  <li key={feature}>
                    <PublicIcon name="check" size={13} />
                    {feature}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="lp-similar">
          <div className="lp-container">
            <div className="lp-similar__head">
              <p className="lp-eyebrow">O'xshash kurslar</p>
              <h2 className="lp-section__title">Sizga yoqishi mumkin</h2>
            </div>
            <div className="lp-courses__grid">
              {similarCourses.map((item) => (
                <PublicCourseCard course={item} key={item.slug} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};

export default CourseDetailPage;
