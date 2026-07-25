import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';

const Header = ({ title, subtitle }) => {
  const { user, logout } = useAuth();

  // Generate profile image URL with cache busting (SAME AS ADMIN DASHBOARD)
  const profileImageUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
    const timestamp = user._updated || Date.now();
    return `${baseUrl}${user.profileImage}?t=${timestamp}`;
  }, [user?.profileImage, user?._updated]);

  const userName = user ? `${user.firstName} ${user.lastName}` : '';
  const userInitials = user ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` : '';

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="container">
        <nav className="navbar">
          <Logo />
          <div className="nav-info">
            <div className="page-info">
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          </div>
          <div className="nav-links">
            <div className="user-info">
              <div
                className={`user-avatar ${profileImageUrl ? 'has-image' : ''}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              >
                {!profileImageUrl && (
                  <span>{userInitials}</span>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{userName}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
          </div>
        </nav>
      </div>

      <style>{`
        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-avatar {
          width: 45px;
          height: 45px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
          flex-shrink: 0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .user-avatar.has-image {
          background: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .user-avatar span {
          color: #ffffff;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .user-name {
          font-weight: 600;
          color: var(--dark-gray);
          font-size: 0.9375rem;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: capitalize;
        }

        @media (max-width: 768px) {
          .user-avatar {
            width: 40px;
            height: 40px;
            font-size: 0.875rem;
          }

          .user-details {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
