import React from 'react';

const Announcements = () => {
  // Mock announcements data
  const announcements = [
    {
      id: 1,
      title: 'School Field Trip to Science Museum',
      content: 'Join us for an exciting educational trip to the National Science Museum next Friday. Permission slips must be submitted by Wednesday.',
      category: 'Events',
      priority: 'high',
      date: '2024-03-25',
      icon: '🚌',
      author: 'Principal Johnson'
    },
    {
      id: 2,
      title: 'Midterm Examination Schedule',
      content: 'Midterm exams will begin on April 1st. Please review the detailed schedule attached and prepare accordingly.',
      category: 'Academic',
      priority: 'urgent',
      date: '2024-03-20',
      icon: '📝',
      author: 'Academic Office'
    },
    {
      id: 3,
      title: 'Spring Sports Tryouts',
      content: 'Tryouts for spring sports teams (soccer, basketball, volleyball) will be held next week. Sign up at the gym office.',
      category: 'Sports',
      priority: 'normal',
      date: '2024-03-18',
      icon: '⚽',
      author: 'Coach Martinez'
    },
    {
      id: 4,
      title: 'Library New Books Collection',
      content: 'Check out our newly arrived collection of books including bestsellers, science fiction, and educational materials.',
      category: 'Library',
      priority: 'normal',
      date: '2024-03-15',
      icon: '📚',
      author: 'Librarian Smith'
    },
    {
      id: 5,
      title: 'Parent-Teacher Conference',
      content: 'Annual parent-teacher conferences scheduled for March 28-29. Please coordinate with your parents to attend.',
      category: 'Events',
      priority: 'high',
      date: '2024-03-14',
      icon: '👥',
      author: 'Administration'
    },
    {
      id: 6,
      title: 'School Cafeteria Menu Update',
      content: 'New healthy menu options available starting next week. View the full menu on the school website.',
      category: 'General',
      priority: 'normal',
      date: '2024-03-12',
      icon: '🍽️',
      author: 'Cafeteria Manager'
    },
    {
      id: 7,
      title: 'Science Fair Competition',
      content: 'Annual Science Fair will be held on April 15th. Start preparing your projects now. Registration deadline: March 30th.',
      category: 'Academic',
      priority: 'high',
      date: '2024-03-10',
      icon: '🔬',
      author: 'Science Department'
    },
    {
      id: 8,
      title: 'School Wi-Fi Maintenance',
      content: 'Network maintenance scheduled for this Saturday 8AM-12PM. Wi-Fi services will be temporarily unavailable.',
      category: 'General',
      priority: 'normal',
      date: '2024-03-08',
      icon: '📡',
      author: 'IT Department'
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'normal':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPriorityLabel = (priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Academic': '#22c55e',
      'Events': '#8b5cf6',
      'Sports': '#ec4899',
      'Library': '#06b6d4',
      'General': '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="announcements-container">
      <style>{`
        .announcements-container {
          padding: 0;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          min-height: 100vh;
        }

        .announcements-header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 40px 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .announcements-header h1 {
          margin: 0 0 10px 0;
          font-size: 32px;
          font-weight: 700;
        }

        .announcements-header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.95;
        }

        .announcements-content {
          padding: 30px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .filter-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .filter-tab {
          padding: 10px 20px;
          background: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-tab:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .filter-tab.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .announcements-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        }

        .announcement-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .announcement-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .announcement-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
        }

        .announcement-icon {
          font-size: 40px;
          margin-bottom: 15px;
          display: inline-block;
        }

        .announcement-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .announcement-content {
          color: #4b5563;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 15px;
        }

        .announcement-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
        }

        .priority-badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
        }

        .category-badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .announcement-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }

        .announcement-date {
          color: #6b7280;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .announcement-author {
          color: #6b7280;
          font-size: 13px;
          font-style: italic;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .empty-state-icon {
          font-size: 80px;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #6b7280;
          font-size: 16px;
        }

        @media (max-width: 768px) {
          .announcements-header {
            padding: 30px 20px;
          }

          .announcements-header h1 {
            font-size: 26px;
          }

          .announcements-content {
            padding: 20px 15px;
          }

          .announcements-grid {
            grid-template-columns: 1fr;
          }

          .filter-tabs {
            gap: 8px;
          }

          .filter-tab {
            padding: 8px 16px;
            font-size: 13px;
          }

          .announcement-card {
            padding: 20px;
          }

          .announcement-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .announcements-header h1 {
            font-size: 22px;
          }

          .announcement-icon {
            font-size: 35px;
          }

          .announcement-title {
            font-size: 18px;
          }
        }
      `}</style>

      <div className="announcements-header">
        <h1>📢 School Announcements</h1>
        <p>Stay updated with the latest news and events</p>
      </div>

      <div className="announcements-content">
        <div className="filter-tabs">
          <button className="filter-tab active">All</button>
          <button className="filter-tab">Academic</button>
          <button className="filter-tab">Events</button>
          <button className="filter-tab">Sports</button>
          <button className="filter-tab">Library</button>
          <button className="filter-tab">General</button>
        </div>

        {announcements.length > 0 ? (
          <div className="announcements-grid">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="announcement-card">
                <div className="announcement-icon">{announcement.icon}</div>
                <h3 className="announcement-title">{announcement.title}</h3>

                <div className="announcement-meta">
                  <span
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                  >
                    {getPriorityLabel(announcement.priority)}
                  </span>
                  <span
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(announcement.category) }}
                  >
                    {announcement.category}
                  </span>
                </div>

                <p className="announcement-content">{announcement.content}</p>

                <div className="announcement-footer">
                  <span className="announcement-date">
                    📅 {formatDate(announcement.date)}
                  </span>
                  <span className="announcement-author">
                    By {announcement.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No Announcements</h3>
            <p>There are no announcements at this time. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;