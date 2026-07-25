import React from 'react';

const Logo = ({ size = 'default' }) => {
  const logoStyles = {
    default: { height: '56px' },
    small: { height: '40px' },
    large: { height: '80px' }
  };

  return (
    <div className="logo">
      <div className="logo-image-wrapper">
        <img
          src="/assets/images/logo.jpg"
          alt="My Dream School"
          style={logoStyles[size]}
          className="logo-image"
        />
      </div>
      <div className="logo-text">
        <div className="logo-main">MY DREAM</div>
        <div className="logo-sub">SCHOOL</div>
      </div>
      <style jsx="true">{`
        .logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
        }

        .logo-image-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-image {
          border-radius: 16px;
          object-fit: cover;
          box-shadow: 
            0 10px 25px -5px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .logo-image:hover {
          transform: scale(1.05);
          box-shadow: 
            0 20px 35px -5px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.2);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .logo-main {
          font-weight: 800;
          font-size: 1.125rem;
          background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.05em;
        }

        .logo-sub {
          font-weight: 600;
          font-size: 0.875rem;
          color: #64748b;
          letter-spacing: 0.15em;
        }

        /* Laptop screens */
        @media (max-width: 1199px) and (min-width: 768px) {
          .logo {
            gap: 0.875rem;
          }

          .logo-main {
            font-size: 1rem;
          }

          .logo-sub {
            font-size: 0.8125rem;
          }
        }

        /* Tablet and mobile */
        @media (max-width: 767px) {
          .logo {
            gap: 0.75rem;
          }

          .logo-image {
            border-radius: 12px;
          }

          .logo-main {
            font-size: 0.9375rem;
          }

          .logo-sub {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Logo;