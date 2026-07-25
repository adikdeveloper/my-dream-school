import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

const StudentPayments = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feeInfo, setFeeInfo] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [payments, setPayments] = useState([]);

  const loadPaymentData = useCallback(async () => {
    // Get user ID - handle both _id (from /auth/me) and id (from /auth/login)
    const userId = user?._id || user?.id;

    if (!user || !userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load fee info and payment status in parallel
      const [feeData, statusData, paymentsData] = await Promise.all([
        apiService.getMyFee().catch(() => null),
        apiService.getMyPaymentStatus(userId).catch(() => null),
        apiService.getMyPayments().catch(() => [])
      ]);

      setFeeInfo(feeData);
      setPaymentStatus(statusData?.paymentStatus || []);
      setPayments(paymentsData || []);

    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(Math.round(amount || 0)) + ' so\'m';
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate statistics (faqat tasdiqlangan to'lovlar)
  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidMonths = paymentStatus.filter(s => s.status === 'paid').length;
  const unpaidMonths = paymentStatus.filter(s => s.status === 'unpaid').length;

  if (loading) {
    return (
      <div className="payments-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Yuklanmoqda...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="payments-container">
      <div className="payments-header">
        <h1>Mening to'lovlarim</h1>
        <p>To'lov tarixi va holati</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={loadPaymentData} className="retry-btn">Qayta urinish</button>
        </div>
      )}

      {/* Fee Info Card */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Oylik to'lov</h3>
            <p className="stat-value">{formatCurrency(feeInfo?.finalMonthlyFee || feeInfo?.monthlyFee)}</p>
            {feeInfo?.discount > 0 && (
              <span className="discount-badge">-{feeInfo.discount}% chegirma</span>
            )}
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>To'langan oylar</h3>
            <p className="stat-value">{paidMonths} oy</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>To'lanmagan oylar</h3>
            <p className="stat-value">{unpaidMonths} oy</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Jami to'langan</h3>
            <p className="stat-value">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      </div>

      {/* Payment Status by Month */}
      <div className="section-card">
        <h2>Oylik to'lov holati</h2>
        {paymentStatus.length > 0 ? (
          <div className="month-grid">
            {paymentStatus.map((status, index) => (
              <div
                key={status.month || index}
                className={`month-card ${status.status === 'paid' ? 'paid' : 'unpaid'}`}
              >
                <div className="month-name">{formatMonth(status.month)}</div>
                <div className="month-status">
                  {status.status === 'paid' ? (
                    <>
                      <span className="status-icon">✅</span>
                      <span className="status-text">To'langan</span>
                    </>
                  ) : (
                    <>
                      <span className="status-icon">❌</span>
                      <span className="status-text">To'lanmagan</span>
                    </>
                  )}
                </div>
                <div className="month-amount">
                  {status.status === 'paid'
                    ? formatCurrency(status.paid)
                    : formatCurrency(status.required)
                  }
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>To'lov ma'lumotlari mavjud emas</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="section-card">
        <h2>To'lov tarixi</h2>
        {payments.length > 0 ? (
          <div className="payments-table">
            <div className="table-header">
              <div className="col-date">Sana</div>
              <div className="col-month">Oy</div>
              <div className="col-amount">Summa</div>
              <div className="col-method">Usul</div>
              <div className="col-status">Holat</div>
            </div>
            {payments.map((payment, index) => (
              <div key={payment._id || index} className="table-row">
                <div className="col-date">{formatDate(payment.paymentDate)}</div>
                <div className="col-month">{formatMonth(payment.paymentMonth)}</div>
                <div className="col-amount">{formatCurrency(payment.amount)}</div>
                <div className="col-method">
                  <span className={`method-badge ${payment.paymentType}`}>
                    {payment.paymentType === 'cash' ? 'Naqd' :
                      payment.paymentType === 'card' ? 'Karta' :
                        payment.paymentType === 'bank_transfer' ? "O'tkazma" : payment.paymentType}
                  </span>
                </div>
                <div className="col-status">
                  <span className={`status-badge ${payment.status}`}>
                    {payment.status === 'completed' ? 'Tasdiqlangan' :
                      payment.status === 'pending' ? 'Kutilmoqda' :
                        payment.status === 'cancelled' ? 'Bekor qilingan' : payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Hali to'lovlar amalga oshirilmagan</p>
          </div>
        )}
      </div>

      {/* Info Message */}
      {!feeInfo && (
        <div className="info-message">
          <span className="info-icon">ℹ️</span>
          <span>Sizga hali oylik to'lov belgilanmagan. Administrator bilan bog'laning.</span>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .payments-container {
    padding: 2rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    min-height: calc(100vh - 85px);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    gap: 1rem;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e2e8f0;
    border-top-color: #10b981;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .payments-header {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    padding: 2rem;
    border-radius: 16px;
    margin-bottom: 2rem;
    box-shadow: 0 10px 40px rgba(16, 185, 129, 0.2);
  }

  .payments-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.5rem 0;
  }

  .payments-header p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e2e8f0;
    transition: transform 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 2.5rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: #f8fafc;
  }

  .stat-card.primary .stat-icon { background: #ecfdf5; }
  .stat-card.success .stat-icon { background: #ecfdf5; }
  .stat-card.warning .stat-icon { background: #fffbeb; }
  .stat-card.info .stat-icon { background: #f0fdf4; }

  .stat-content h3 {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 0.25rem 0;
    font-weight: 500;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .discount-badge {
    display: inline-block;
    background: #dcfce7;
    color: #166534;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    margin-top: 0.25rem;
  }

  .section-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e2e8f0;
  }

  .section-card h2 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1.5rem 0;
    padding-bottom: 1rem;
    border-bottom: 2px solid #f1f5f9;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-card h2::before {
    content: '';
    width: 4px;
    height: 24px;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 2px;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }

  .month-card {
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    text-align: center;
    transition: all 0.2s ease;
  }

  .month-card.paid {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border-color: #a7f3d0;
  }

  .month-card.unpaid {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-color: #fecaca;
  }

  .month-name {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
    font-size: 0.9375rem;
  }

  .month-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .status-icon {
    font-size: 1rem;
  }

  .status-text {
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .month-card.paid .status-text { color: #166534; }
  .month-card.unpaid .status-text { color: #991b1b; }

  .month-amount {
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
  }

  .payments-table {
    overflow-x: auto;
  }

  .table-header, .table-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr 0.8fr 1fr;
    gap: 1rem;
    padding: 1rem;
    align-items: center;
  }

  .table-header {
    background: #f8fafc;
    border-radius: 8px;
    font-weight: 600;
    color: #64748b;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .table-row {
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.875rem;
    color: #1e293b;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: #f8fafc;
  }

  .method-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .method-badge.cash { background: #dcfce7; color: #166534; }
  .method-badge.card { background: #d1fae5; color: #065f46; }
  .method-badge.bank_transfer { background: #fef3c7; color: #92400e; }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.completed { background: #dcfce7; color: #166534; }
  .status-badge.pending { background: #fef3c7; color: #92400e; }
  .status-badge.cancelled { background: #fee2e2; color: #991b1b; }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #94a3b8;
  }

  .error-message, .info-message {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }

  .error-message {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border: 1px solid #fca5a5;
    border-left: 4px solid #ef4444;
  }

  .info-message {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 1px solid #86efac;
    border-left: 4px solid #22c55e;
  }

  .error-icon, .info-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .error-message span:nth-child(2) {
    flex: 1;
    color: #991b1b;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .info-message span:nth-child(2) {
    flex: 1;
    color: #065f46;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .retry-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn:hover {
    background: #dc2626;
  }

  @media (max-width: 768px) {
    .payments-container {
      padding: 1rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .stat-card {
      padding: 1rem;
      flex-direction: column;
      text-align: center;
    }

    .stat-icon {
      width: 50px;
      height: 50px;
      font-size: 2rem;
    }

    .table-header, .table-row {
      grid-template-columns: 1fr 1fr 1fr;
    }

    .col-method, .col-status {
      display: none;
    }

    .month-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .month-grid {
      grid-template-columns: 1fr;
    }

    .payments-header h1 {
      font-size: 1.25rem;
    }
  }
`;

export default StudentPayments;
