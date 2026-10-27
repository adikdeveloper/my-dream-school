import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PublicIcon from './PublicIcon';
import { navLinks } from '../../data/publicContent';

const PublicHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const goToSection = (id) => {
    setMenuOpen(false);

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
    <header className={`lp-header${scrolled ? ' lp-header--scrolled' : ''}`}>
      <div className="lp-container lp-header__inner">
        <Link to="/" className="lp-brand" aria-label="My Dream School bosh sahifasi">
          <img
            src="/assets/images/logo-mark.png"
            alt="My Dream School logotipi"
            className="lp-brand__logo"
          />
          <span className="lp-brand__text">
            <span className="lp-brand__name">My Dream School</span>
            <span className="lp-brand__tag">IT &amp; Business Academy</span>
          </span>
        </Link>

        <nav className="lp-nav" aria-label="Asosiy menyu">
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

        <div className="lp-header__actions">
          <button
            type="button"
            className="lp-btn lp-btn--gold lp-btn--sm"
            onClick={() => goToSection('contact')}
          >
            Ro'yxatdan o'tish
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--outline lp-btn--sm"
            onClick={() => navigate('/login')}
          >
            Kirish
          </button>
        </div>

        <button
          type="button"
          className="lp-menu-btn"
          aria-label={menuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <PublicIcon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      {menuOpen && (
        <div className="lp-mobile-menu">
          <nav aria-label="Mobil menyu">
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
          <div className="lp-mobile-menu__actions">
            <button
              type="button"
              className="lp-btn lp-btn--gold"
              onClick={() => goToSection('contact')}
            >
              Ro'yxatdan o'tish
            </button>
            <button
              type="button"
              className="lp-btn lp-btn--outline"
              onClick={() => navigate('/login')}
            >
              Kirish
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;
