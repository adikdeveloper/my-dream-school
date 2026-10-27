import React, { useState } from 'react';
import PublicHeader from '../components/public/PublicHeader';
import PublicFooter from '../components/public/PublicFooter';
import PublicCourseCard from '../components/public/PublicCourseCard';
import { courses, courseCategories } from '../data/publicContent';
import './LandingPage.css';

const CoursesPage = () => {
  const [activeCategory, setActiveCategory] = useState('Barchasi');

  const filteredCourses =
    activeCategory === 'Barchasi'
      ? courses
      : courses.filter((course) => course.category === activeCategory);

  return (
    <div className="lp-root">
      <PublicHeader />

      <main className="lp-catalog">
        <div className="lp-container">
          <div className="lp-catalog__head">
            <p className="lp-eyebrow">Kurslarimiz</p>
            <h1 className="lp-section__title">
              Kelajak kasblari uchun zamonaviy kurslar
            </h1>
            <p className="lp-section__subtitle">
              IT, biznes, til va dizayn yo'nalishlari bo'yicha amaliy bilim
              beruvchi kurslar. O'zingizga mos yo'nalishni tanlang.
            </p>
          </div>

          <div className="lp-catalog__filters" role="tablist" aria-label="Kurs kategoriyalari">
            {courseCategories.map((category) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                className={`lp-filter${activeCategory === category ? ' is-active' : ''}`}
                key={category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="lp-courses__grid">
            {filteredCourses.map((course) => (
              <PublicCourseCard course={course} key={course.slug} />
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default CoursesPage;
