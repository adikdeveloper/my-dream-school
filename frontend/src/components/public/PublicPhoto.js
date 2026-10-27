import React from 'react';
import PublicIcon from './PublicIcon';

const defaultLabels = {
  landscape: 'Rasm uchun joy',
  portrait: 'Portret uchun joy'
};

/**
 * Rasm joylari uchun vaqtinchalik komponent.
 * `alt` maydoni har doim "Bu yerda ... rasmi bo'lishi kerak" ko'rinishida yoziladi.
 * Keyinchalik `src` ni haqiqiy rasm manziliga almashtirish kifoya.
 */
const PublicPhoto = ({
  alt,
  variant = 'landscape',
  tone = 'blue',
  className = '',
  label,
  children
}) => {
  const showLabel = variant !== 'map' && label !== false;
  const labelText = label || defaultLabels[variant] || defaultLabels.landscape;

  return (
    <div className={`lp-photo lp-photo--${tone} ${className}`.trim()}>
      <img
        src={`/assets/images/placeholder-${variant}.svg`}
        alt={alt}
        loading="lazy"
      />
      {showLabel && (
        <span className="lp-photo__badge" aria-hidden="true">
          <span className="lp-photo__badge-icon">
            <PublicIcon name="image" size={17} />
          </span>
          <span className="lp-photo__badge-text">{labelText}</span>
        </span>
      )}
      {children}
    </div>
  );
};

export default PublicPhoto;
