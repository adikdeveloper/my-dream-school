import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import PublicIcon from '../components/public/PublicIcon';
import PublicPhoto from '../components/public/PublicPhoto';
import PublicCourseCard from '../components/public/PublicCourseCard';
import {
  aboutPoints,
  aboutStats,
  contactItems,
  courses,
  gallery,
  heroFeatures,
  heroStats,
  news,
  resultCards,
  resultsStats,
  subjects,
  teachers
} from '../data/publicContent';
import './LandingPage.css';

const SectionHead = ({ eyebrow, title, action }) => (
  <div className="lp-section__head">
    <div>
      <p className="lp-eyebrow">{eyebrow}</p>
      <h2 className="lp-section__title">{title}</h2>
    </div>
    {action}
  </div>
);

const LandingPage = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    course: '',
    message: ''
  });
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!window.location.hash) return undefined;

    const id = window.location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      setFormError('Ism va telefon raqamini kiriting.');
      setFormSent(false);
      return;
    }

    setFormError('');
    setFormSent(true);
    setForm({ name: '', phone: '', email: '', course: '', message: '' });
  };

  return (
    <div className="lp-root">
      <PublicHeader />

      <main>
        {/* HERO */}
        <section className="lp-hero" id="home">
          <div className="lp-container lp-hero__inner">
            <div className="lp-hero__content">
              <p className="lp-eyebrow">Zamonaviy ta'lim, buyuk imkoniyatlar</p>
              <h1 className="lp-hero__title">
                Kelajagingizni
                <br />
                <span>My Dream School</span>
                <br />
                bilan quring
              </h1>
              <p className="lp-hero__desc">
                IT va biznes sohalarida xalqaro standartdagi zamonaviy ta'lim.
                Amaliy bilimlar, tajribali ustozlar va haqiqiy imkoniyatlar
                sizning kelajagingiz uchun.
              </p>
              <div className="lp-hero__actions">
                <a className="lp-btn lp-btn--gold" href="#courses">
                  Kurslarni ko'rish
                  <PublicIcon name="arrowRight" size={16} />
                </a>
                <a className="lp-btn lp-btn--outline" href="#contact">
                  Biz bilan bog'lanish
                </a>
              </div>
              <div className="lp-hero__features">
                {heroFeatures.map((feature) => (
                  <div className="lp-hero__feature" key={feature.label}>
                    <span className="lp-hero__feature-icon">
                      <PublicIcon name={feature.icon} size={14} />
                    </span>
                    <span>{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-hero__media">
              <PublicPhoto
                variant="landscape"
                tone="blue"
                className="lp-hero__photo"
                alt="Bu yerda My Dream School binosi oldida o'quvchilar va o'qituvchilar rasmi bo'lishi kerak"
              />

              {heroStats.map((stat, index) => (
                <div
                  className={`lp-hero__float lp-hero__float--${index + 1}`}
                  key={stat.label}
                >
                  <span className={`lp-hero__float-icon lp-tone-${stat.tone}`}>
                    <PublicIcon name={stat.icon} size={17} />
                  </span>
                  <span className="lp-hero__float-text">
                    <strong>{stat.value}</strong>
                    <small>{stat.label}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <section className="lp-results" id="results">
          <div className="lp-container">
            <div className="lp-results__grid">
              <div className="lp-results__intro">
                <p className="lp-eyebrow lp-eyebrow--gold">
                  Natijalarimiz — bizning g'ururimiz
                </p>
                <h2 className="lp-results__title">
                  Raqamlar ortida haqiqiy natijalar
                </h2>
                <p className="lp-results__desc">
                  Bizning bitiruvchilarimiz yetakchi kompaniyalarda ishlaydi, o'z
                  bizneslarini boshlaydi va xalqaro universitetlarda ta'lim oladi.
                  Bu raqamlar — bizning eng katta yutug'imiz.
                </p>
                <a className="lp-btn lp-btn--gold lp-results__cta" href="#about">
                  Batafsil ma'lumot
                  <PublicIcon name="arrowRight" size={15} />
                </a>
              </div>

              <div className="lp-results__content">
                <div className="lp-results__stats">
                  {resultsStats.map((stat) => (
                    <div className="lp-result-stat" key={stat.label}>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>

                <div className="lp-results__cards">
                  {resultCards.map((card) => (
                    <article className="lp-result-card" key={card.title}>
                      <span className="lp-result-card__icon">
                        <PublicIcon name={card.icon} size={21} />
                      </span>
                      <h3>{card.title}</h3>
                      <p>{card.desc}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="lp-about" id="about">
          <div className="lp-container lp-about__grid">
            <PublicPhoto
              variant="landscape"
              tone="slate"
              className="lp-about__photo"
              alt="Bu yerda My Dream School zamonaviy binosining rasmi bo'lishi kerak"
            />

            <div className="lp-about__content">
              <p className="lp-eyebrow">Biz haqimizda</p>
              <h2 className="lp-about__title">
                My Dream School — kelajak kasblari uchun ta'lim
              </h2>
              <p className="lp-about__desc">
                Biz IT va biznes sohalarida zamonaviy ta'lim beruvchi maktabmiz.
                Maqsadimiz — har bir o'quvchining salohiyatini ochish va uni
                global miqyosda muvaffaqiyatli qilish.
              </p>
              <ul className="lp-about__list">
                {aboutPoints.map((point) => (
                  <li key={point}>
                    <span className="lp-about__check">
                      <PublicIcon name="check" size={13} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lp-about__stats">
              {aboutStats.map((stat) => (
                <div className="lp-about-stat" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COURSES */}
        <section className="lp-section lp-section--soft" id="courses">
          <div className="lp-container">
            <SectionHead
              eyebrow="Kurslarimiz"
              title="Kelajak kasblari uchun zamonaviy kurslar"
              action={
                <Link className="lp-section__link" to="/courses">
                  Barcha kurslarni ko'rish
                  <PublicIcon name="arrowRight" size={15} />
                </Link>
              }
            />

            <div className="lp-courses__grid">
              {courses.map((course) => (
                <PublicCourseCard course={course} key={course.slug} />
              ))}
            </div>
          </div>
        </section>

        {/* TEACHERS */}
        <section className="lp-section" id="teachers">
          <div className="lp-container">
            <SectionHead
              eyebrow="O'qituvchilar"
              title="Tajribali ustozlar — sizning muvaffaqiyatingiz kafolati"
              action={
                <a className="lp-section__link" href="#teachers">
                  Barcha o'qituvchilar
                  <PublicIcon name="arrowRight" size={15} />
                </a>
              }
            />

            <div className="lp-teachers__grid">
              {teachers.map((teacher) => (
                <article className="lp-teacher-card" key={teacher.name}>
                  <PublicPhoto
                    variant="portrait"
                    tone={teacher.tone}
                    className="lp-teacher-card__photo"
                    alt={teacher.alt}
                  />
                  <div className="lp-teacher-card__body">
                    <div>
                      <h3>{teacher.name}</h3>
                      <p>{teacher.role}</p>
                    </div>
                    <div className="lp-teacher-card__social">
                      <a href="#teachers" aria-label={`${teacher.name} Telegram`}>
                        <PublicIcon name="telegram" size={14} />
                      </a>
                      <a href="#teachers" aria-label={`${teacher.name} Instagram`}>
                        <PublicIcon name="instagram" size={14} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SUBJECTS */}
        <section className="lp-section lp-section--soft" id="subjects">
          <div className="lp-container">
            <SectionHead
              eyebrow="Fanlar"
              title="Keng qamrovli fanlar va yo'nalishlar"
              action={
                <a className="lp-section__link" href="#subjects">
                  Barcha fanlar
                  <PublicIcon name="arrowRight" size={15} />
                </a>
              }
            />

            <div className="lp-subjects__grid">
              {subjects.map((subject) => (
                <div className="lp-subject-card" key={subject.name}>
                  <PublicIcon name={subject.icon} size={26} />
                  <span>{subject.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="lp-section" id="gallery">
          <div className="lp-container">
            <SectionHead
              eyebrow="Galereya"
              title="Maktab hayotidan lavhalar"
              action={
                <a className="lp-section__link" href="#gallery">
                  Barcha rasmlar
                  <PublicIcon name="arrowRight" size={15} />
                </a>
              }
            />

            <div className="lp-gallery__grid">
              {gallery.map((item, index) => (
                <PublicPhoto
                  key={item.alt}
                  variant="landscape"
                  tone={item.tone}
                  className={`lp-gallery__item lp-gallery__item--${index + 1}`}
                  alt={item.alt}
                >
                  {index === 2 && (
                    <div className="lp-gallery__quote">
                      <PublicIcon name="quote" size={20} />
                      <strong>Dreamers Build Tomorrow</strong>
                      <small>My Dream School</small>
                    </div>
                  )}
                </PublicPhoto>
              ))}
            </div>
          </div>
        </section>

        {/* NEWS */}
        <section className="lp-section lp-section--soft" id="news">
          <div className="lp-container">
            <SectionHead
              eyebrow="Yangiliklar"
              title="So'nggi yangiliklar"
              action={
                <a className="lp-section__link" href="#news">
                  Barcha yangiliklar
                  <PublicIcon name="arrowRight" size={15} />
                </a>
              }
            />

            <div className="lp-news__grid">
              {news.map((item) => (
                <article className="lp-news-card" key={item.title}>
                  <PublicPhoto
                    variant="landscape"
                    tone={item.tone}
                    className="lp-news-card__media"
                    alt={item.alt}
                  />
                  <div className="lp-news-card__body">
                    <div className="lp-news-card__meta">
                      <span>{item.category}</span>
                      <time>{item.date}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt}</p>
                    <a className="lp-news-card__link" href="#news">
                      Batafsil
                      <PublicIcon name="arrowRight" size={14} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="lp-contact" id="contact">
          <div className="lp-container">
            <div className="lp-contact__head">
              <p className="lp-eyebrow">Aloqa</p>
              <h2 className="lp-section__title">Biz bilan bog'laning</h2>
              <p className="lp-section__subtitle">
                Savollaringiz bormi? Biz bilan bog'laning — biz sizga yordam
                berishdan mammunmiz.
              </p>
            </div>

            <div className="lp-contact__grid">
              <div className="lp-contact__info">
                {contactItems.map((item) => {
                  const content = (
                    <>
                      <span className="lp-contact__icon">
                        <PublicIcon name={item.icon} size={18} />
                      </span>
                      <span className="lp-contact__text">
                        <small>{item.label}</small>
                        <strong>{item.value}</strong>
                      </span>
                    </>
                  );

                  return item.href ? (
                    <a className="lp-contact__item" href={item.href} key={item.label}>
                      {content}
                    </a>
                  ) : (
                    <div className="lp-contact__item" key={item.label}>
                      {content}
                    </div>
                  );
                })}
              </div>

              <div className="lp-contact__map">
                <iframe
                  title="My Dream School manzili — Beruniy, Qoraqalpog'iston Respublikasi"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1397.679220210109!2d60.73817494626839!3d41.6901458014117!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x41dfd4aee2f118f5%3A0x810d7ccb81572a8f!2zTVBSUSszM1gsINCR0LXRgNGD0L3QuCwg0KDQtdGB0L_Rg9Cx0LvQuNC60LAg0JrQsNGA0LDQutCw0LvQv9Cw0LrRgdGC0LDQvSwg0KPQt9Cx0LXQutC40YHRgtCw0L0!5e1!3m2!1sru!2s!4v1793158802771!5m2!1sru!2s"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              <form className="lp-contact__form" onSubmit={handleSubmit} noValidate>
                <div className="lp-form__row">
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFieldChange}
                    placeholder="Ism"
                    aria-label="Ism"
                    autoComplete="name"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFieldChange}
                    placeholder="Telefon"
                    aria-label="Telefon"
                    autoComplete="tel"
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFieldChange}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                />
                <select
                  name="course"
                  value={form.course}
                  onChange={handleFieldChange}
                  aria-label="Kurs tanlash"
                >
                  <option value="">Kurs tanlash</option>
                  {courses.map((course) => (
                    <option value={course.title} key={course.slug}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleFieldChange}
                  placeholder="Xabar"
                  aria-label="Xabar"
                  rows="3"
                />
                {formError && <p className="lp-form__error">{formError}</p>}
                {formSent && (
                  <p className="lp-form__success" role="status">
                    Xabaringiz yuborildi. Tez orada siz bilan bog'lanamiz.
                  </p>
                )}
                <button type="submit" className="lp-btn lp-btn--gold lp-form__submit">
                  Yuborish
                  <PublicIcon name="arrowRight" size={16} />
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};

export default LandingPage;
