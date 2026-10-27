import React from 'react';
import { Link } from 'react-router-dom';
import PublicIcon from './PublicIcon';
import PublicPhoto from './PublicPhoto';

const PublicCourseCard = ({ course }) => (
  <Link className="lp-course-card" to={`/courses/${course.slug}`}>
    <PublicPhoto
      variant="landscape"
      tone={course.tone}
      className="lp-course-card__media"
      alt={course.imageAlt}
    >
      <span className="lp-course-card__badge">{course.category}</span>
    </PublicPhoto>
    <div className="lp-course-card__body">
      <div>
        <h3>{course.title}</h3>
        <p>{course.tagline}</p>
      </div>
      <span className="lp-course-card__arrow">
        <PublicIcon name="arrowUpRight" size={17} />
      </span>
    </div>
  </Link>
);

export default PublicCourseCard;
