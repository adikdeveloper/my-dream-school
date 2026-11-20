import React from 'react';

export default function ProfileCompleteness({ percent }) {
  const radius = 15.5;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="profile-completeness"
      title={`Profil to'ldirilgani: ${percent}%`}
      aria-label={`Profil to'ldirilgani: ${percent}%`}
    >
      <svg className="completeness-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle className="completeness-track" cx="18" cy="18" r={radius} />
        <circle
          className="completeness-progress"
          cx="18"
          cy="18"
          r={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="completeness-value">{percent}%</span>
    </div>
  );
}
