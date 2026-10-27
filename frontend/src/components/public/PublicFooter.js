import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PublicIcon from './PublicIcon';
import { navLinks } from '../../data/publicContent';

const PublicFooter = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const goToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__top">
          <Link to="/" className="lp-brand lp-brand--footer" aria-label="My Dream School bosh sahifasi">
            <img
              src="/assets/images/logo-mark.png"
              alt="My Dream School logotipi"
              className="lp-brand__logo lp-brand__logo--footer"
            />
            <span className="lp-brand__text">
              <span className="lp-brand__name">My Dream School</span>
              <span className="lp-brand__tag">IT &amp; Business Academy</span>
            </span>
          </Link>

          <nav className="lp-footer__nav" aria-label="Footer menyusi">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  goToSection(link.id);
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="lp-footer__social">
            <a
              href="https://t.me/mydreamschool"
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
            >
              <PublicIcon name="telegram" size={17} />
            </a>
            <a
              href="https://instagram.com/mydreamschool"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <PublicIcon name="instagram" size={17} />
            </a>
            <a
              href="https://facebook.com/mydreamschool"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              <PublicIcon name="facebook" size={17} />
            </a>
            <a
              href="https://youtube.com/@mydreamschool"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
            >
              <PublicIcon name="youtube" size={17} />
            </a>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <p>© 2024 My Dream School. Barcha huquqlar himoyalangan.</p>
          <div>
            <a href="#privacy" onClick={(event) => event.preventDefault()}>
              Maxfiylik siyosati
            </a>
            <a href="#terms" onClick={(event) => event.preventDefault()}>
              Foydalanish shartlari
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
