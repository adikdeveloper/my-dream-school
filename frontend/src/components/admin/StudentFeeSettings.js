import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StudentFeeSettings = () => {
  const [students, setStudents] = useState([]);
  const [studentFees, setStudentFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    studentId: '',
    monthlyFee: 500000,
    discount: 0,
    discountReason: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchStudentFees()]);
    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (err) {
    }
  };

  const fetchStudentFees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/student-fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentFees(response.data);
    } catch (err) {
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (fee) => {
    setEditingFee(fee);
    setFormData({
      studentId: fee.studentId._id,
      monthlyFee: fee.monthlyFee,
      discount: fee.discount || 0,
      discountReason: fee.discountReason || '',
      notes: fee.notes || ''
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingFee(null);
    setFormData({
      studentId: '',
      monthlyFee: 500000,
      discount: 0,
      discountReason: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      if (editingFee) {
        await axios.put(`${API_URL}/student-fees/${editingFee._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('O\'qish narxi muvaffaqiyatli yangilandi!');
      } else {
        await axios.post(`${API_URL}/student-fees`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('O\'qish narxi muvaffaqiyatli qo\'shildi!');
      }

      setShowModal(false);
      fetchStudentFees();
    } catch (err) {
      alert('Xatolik: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (feeId) => {
    if (!window.confirm('Ushbu o\'qish narxini o\'chirmoqchimisiz?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/student-fees/${feeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('O\'qish narxi muvaffaqiyatli o\'chirildi!');
      fetchStudentFees();
    } catch (err) {
      alert('Xatolik: ' + (err.response?.data?.message || err.message));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const calculateFinalFee = (fee, discount) => {
    if (discount > 0) {
      return fee - (fee * discount / 100);
    }
    return fee;
  };

  const getStudentsWithoutFees = () => {
    const studentsWithFees = studentFees.map(fee => fee.studentId._id);
    return students.filter(student => !studentsWithFees.includes(student._id));
  };

  const filteredFees = studentFees.filter(fee => {
    if (!searchTerm) return true;
    const student = fee.studentId;
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const studentId = student.studentId?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) ||
           studentId.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  return (
    <div className="student-fee-settings">
      <div className="header">
        <h1>O'qish narxlari</h1>
        <button className="btn-primary" onClick={handleAddNew}>
          + Yangi narx belgilash
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search */}
      <div className="search-section">
        <input
          type="text"
          placeholder="O'quvchi qidirish..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-box">
          <h3>Jami o'quvchilar</h3>
          <p className="stat-value">{students.length}</p>
        </div>
        <div className="stat-box">
          <h3>Narx belgilangan</h3>
          <p className="stat-value">{studentFees.length}</p>
        </div>
        <div className="stat-box">
          <h3>Narx belgilanmagan</h3>
          <p className="stat-value">{getStudentsWithoutFees().length}</p>
        </div>
        <div className="stat-box">
          <h3>O'rtacha narx</h3>
          <p className="stat-value">
            {studentFees.length > 0
              ? formatCurrency(studentFees.reduce((sum, fee) => sum + fee.finalMonthlyFee, 0) / studentFees.length)
              : '0 so\'m'}
          </p>
        </div>
      </div>

      {/* Student Fees Table */}
      <div className="table-container">
        <table className="fees-table">
          <thead>
            <tr>
              <th>O'quvchi</th>
              <th>Oylik to'lov</th>
              <th>Chegirma</th>
              <th>Yakuniy narx</th>
              <th>Chegirma sababi</th>
              <th>Holat</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filteredFees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>
                  Ma'lumotlar topilmadi
                </td>
              </tr>
            ) : (
              filteredFees.map(fee => (
                <tr key={fee._id}>
                  <td>
                    {fee.studentId.firstName} {fee.studentId.lastName}
                    <br />
                    <small>{fee.studentId.studentId}</small>
                  </td>
                  <td>{formatCurrency(fee.monthlyFee)}</td>
                  <td>
                    {fee.discount > 0 ? (
                      <span className="discount-badge">{fee.discount}%</span>
                    ) : (
                      <span className="no-discount">Yo'q</span>
                    )}
                  </td>
                  <td className="final-fee">{formatCurrency(fee.finalMonthlyFee)}</td>
                  <td>{fee.discountReason || '-'}</td>
                  <td>
                    <span className={`status-badge ${fee.isActive ? 'active' : 'inactive'}`}>
                      {fee.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit" onClick={() => handleEdit(fee)}>
                        Tahrirlash
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(fee._id)}>
                        O'chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Students without fees */}
      {getStudentsWithoutFees().length > 0 && (
        <div className="warning-section">
          <h3>⚠️ Narx belgilanmagan o'quvchilar ({getStudentsWithoutFees().length})</h3>
          <div className="student-chips">
            {getStudentsWithoutFees().slice(0, 10).map(student => (
              <div key={student._id} className="student-chip">
                {student.firstName} {student.lastName} ({student.studentId})
              </div>
            ))}
            {getStudentsWithoutFees().length > 10 && (
              <div className="student-chip more">+{getStudentsWithoutFees().length - 10} ko'proq</div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFee ? 'Narxni tahrirlash' : 'Yangi narx belgilash'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="fee-form">
              <div className="form-group">
                <label>O'quvchi *</label>
                <select
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingFee}
                  className="form-control"
                >
                  <option value="">Tanlang...</option>
                  {(editingFee ? students : getStudentsWithoutFees()).map(student => (
                    <option key={student._id} value={student._id}>
                      {student.firstName} {student.lastName} ({student.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Oylik to'lov (so'm) *</label>
                  <input
                    type="number"
                    name="monthlyFee"
                    value={formData.monthlyFee}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="1000"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Chegirma (%)</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="form-control"
                  />
                </div>
              </div>

              {formData.discount > 0 && (
                <div className="final-fee-display">
                  Yakuniy narx: <strong>{formatCurrency(calculateFinalFee(formData.monthlyFee, formData.discount))}</strong>
                </div>
              )}

              {formData.discount > 0 && (
                <div className="form-group">
                  <label>Chegirma sababi</label>
                  <input
                    type="text"
                    name="discountReason"
                    value={formData.discountReason}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Masalan: Ikkinchi farzand, ijtimoiy chegirma..."
                  />
                </div>
              )}

              <div className="form-group">
                <label>Izoh</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="form-control"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn-primary">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .student-fee-settings {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header h1 {
          font-size: 2rem;
          color: #1e293b;
          margin: 0;
        }

        .search-section {
          margin-bottom: 1.5rem;
        }

        .search-input {
          width: 100%;
          max-width: 400px;
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-box {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stat-box h3 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        .stat-value {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .btn-primary {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .btn-edit {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .btn-outline {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .fees-table {
          width: 100%;
          border-collapse: collapse;
        }

        .fees-table th {
          background: #f8fafc;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }

        .fees-table td {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .fees-table tr:hover {
          background: #f8fafc;
        }

        .final-fee {
          font-weight: 700;
          color: #059669;
          font-size: 1.1rem;
        }

        .discount-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .no-discount {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
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

        .warning-section {
          background: #fef3c7;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .warning-section h3 {
          margin: 0 0 1rem 0;
          color: #92400e;
        }

        .student-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .student-chip {
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .student-chip.more {
          background: #92400e;
          color: white;
          font-weight: 600;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #1e293b;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #64748b;
          line-height: 1;
        }

        .fee-form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #475569;
        }

        .form-control {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .form-control:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .final-fee-display {
          background: #dcfce7;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          color: #166534;
          font-size: 1.1rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .student-fee-settings {
            padding: 1rem;
          }

          .header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .table-container {
            overflow-x: auto;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentFeeSettings;
