import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';

const UserManagement = () => {
  const { users, setUsers, setLoading, setError } = useData();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const usersPerPage = 10;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const roleFilter = filter === 'all' ? null : filter;
      const response = await apiService.getUsers(roleFilter, currentPage, usersPerPage);
      setUsers(response.users || []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      setError(error.response?.data?.message || 'Foydalanuvchilarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage, setLoading, setError, setUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  const handleDeleteUser = async (userId) => {
    if (window.confirm('Ushbu foydalanuvchini o\'chirishga ishonchingiz komilmi?')) {
      try {
        await apiService.deleteUser(userId);
        // Refresh the list
        const roleFilter = filter === 'all' ? null : filter;
        const response = await apiService.getUsers(roleFilter, currentPage, usersPerPage);
        setUsers(response.users || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        setError(error.response?.data?.message || 'Foydalanuvchini o\'chirishda xatolik');
      }
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="user-management">
      <div className="page-header">
        <h1 className="page-title">Foydalanuvchilar boshqaruvi</h1>
        <button className="btn btn-primary">
          👤 Foydalanuvchi qo'shish
        </button>
      </div>

      {/* Filters and Search */}
      <div className="filters-section card">
        <div className="filter-group">
          <label className="filter-label">Rol bo'yicha filtrlash:</label>
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">Barcha foydalanuvchilar</option>
            <option value="admin">Administratorlar</option>
            <option value="teacher">O'qituvchilar</option>
            <option value="student">O'quvchilar</option>
          </select>
        </div>

        <div className="search-group">
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ism</th>
              <th>Telefon</th>
              <th>Rol</th>
              <th>Holat</th>
              <th>Qo'shilgan sana</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="user-name">
                        {user.firstName} {user.lastName}
                      </div>
                      {user.studentId && (
                        <div className="user-id">ID: {user.studentId}</div>
                      )}
                      {user.teacherId && (
                        <div className="user-id">ID: {user.teacherId}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{user.phone || '—'}</td>
                <td>
                  <span className={`role-badge ${getRoleColor(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Faol' : 'Nofaol'}
                  </span>
                </td>
                <td>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon edit"
                      title="Tahrirlash"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="btn-icon delete"
                      title="O'chirish"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <p>Foydalanuvchilar topilmadi.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Oldingi
          </button>

          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Keyingi →
          </button>
        </div>
      )}

      <style>{`
        .user-management {
          padding: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-blue);
        }

        .filters-section {
          padding: 1.5rem;
          margin-bottom: 2rem;
          display: flex;
          gap: 2rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-group,
        .search-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-weight: 500;
          color: var(--dark-gray);
        }

        .filter-select,
        .search-input {
          padding: 0.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .filter-select:focus,
        .search-input:focus {
          outline: none;
          border-color: var(--primary-blue);
        }

        .search-input {
          min-width: 250px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-blue);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .user-name {
          font-weight: 500;
          color: var(--dark-gray);
        }

        .user-id {
          font-size: 0.75rem;
          color: var(--gray);
        }

        .role-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .bg-red-100 {
          background: #fee2e2;
        }
        .text-red-800 {
          color: #991b1b;
        }
        .bg-blue-100 {
          background: #dbeafe;
        }
        .text-blue-800 {
          color: #1e40af;
        }
        .bg-green-100 {
          background: #dcfce7;
        }
        .text-green-800 {
          color: #166534;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-icon {
          padding: 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .btn-icon:hover {
          background: var(--light-gray);
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--gray);
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .pagination-btn {
          padding: 0.625rem 1.25rem;
          border: 2px solid #e2e8f0;
          background: white;
          color: #475569;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: var(--primary-blue);
          color: white;
          border-color: var(--primary-blue);
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-pages {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .pagination-page {
          width: 40px;
          height: 40px;
          border: 2px solid #e2e8f0;
          background: white;
          color: #475569;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-page:hover {
          background: #f1f5f9;
          border-color: var(--primary-blue);
        }

        .pagination-page.active {
          background: var(--primary-blue);
          color: white;
          border-color: var(--primary-blue);
        }

        @media (max-width: 768px) {
          .user-management {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .filters-section {
            flex-direction: column;
            align-items: flex-start;
          }

          .search-input {
            min-width: 200px;
          }

          .table-container {
            overflow-x: auto;
          }

          .pagination {
            flex-direction: column;
            gap: 1rem;
          }

          .pagination-btn {
            width: 100%;
          }

          .pagination-pages {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;