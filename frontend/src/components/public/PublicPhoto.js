import React from 'react';
import PublicIcon from './PublicIcon';

const defaultLabels = {
  landscape: 'Rasm uchun joy',
  portrait: 'Portret uchun joy'
};

/**
 * Rasm joylari uchun komponent.
 * `src` berilmasa, vaqtinchalik placeholder va "Rasm uchun joy" belgisi ko'rsatiladi.
 * Haqiqiy rasm qo'shish uchun `src` va tavsifiy `alt` berish kifoya.
 */
const PublicPhoto = ({
  alt,
  src,
  variant = 'landscape',
  tone = 'blue',
  className = '',
  label,
  loading = 'lazy',
  children
}) => {
  const isRealImage = Boolean(src);
  const showLabel = !isRealImage && variant !== 'map' && label !== false;
  const labelText = label || defaultLabels[variant] || defaultLabels.landscape;

  return (
    <div className={`lp-photo lp-photo--${tone} ${className}`.trim()}>
      <img
        src={src || `/assets/images/placeholder-${variant}.svg`}
        alt={alt}
        loading={loading}
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
