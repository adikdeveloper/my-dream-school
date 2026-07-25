import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import './StudentBalance.css';

const StudentBalance = ({ studentId, studentName, currentBalance, onBalanceUpdate }) => {
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [operationType, setOperationType] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [operationForm, setOperationForm] = useState({
    amount: '',
    paymentMonth: new Date().toISOString().slice(0, 7),
    description: '',
    paymentType: 'cash',
    notes: ''
  });

  useEffect(() => {
    if (studentId) {
      loadBalanceHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const loadBalanceHistory = async () => {
    try {
      const data = await apiService.getStudentBalance(studentId);
      setTransactions(data.transactions || []);
    } catch (err) {
    }
  };

  const handleOpenOperation = (type) => {
    setOperationType(type);
    setShowOperationModal(true);
    setError('');
    setSuccess('');
    setOperationForm({
      amount: '',
      paymentMonth: new Date().toISOString().slice(0, 7),
      description: '',
      paymentType: 'cash',
      notes: ''
    });
  };

  const handleCloseModal = () => {
    setShowOperationModal(false);
    setOperationType(null);
    setError('');
    setSuccess('');
  };

  const handleViewReceipt = (transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const handleSubmitOperation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(operationForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Summa noto\'g\'ri');
      return;
    }

    if (amount > currentBalance) {
      setError('Hisobda yetarli mablag\' yo\'q');
      return;
    }

    try {
      setLoading(true);
      let result;

      switch (operationType) {
        case 'payment':
          if (!operationForm.paymentMonth) {
            setError('Oyni tanlang');
            return;
          }
          result = await apiService.useBalanceForPayment(
            studentId,
            amount,
            operationForm.paymentMonth,
            operationForm.notes
          );
          setSuccess('Hisobdan to\'lov amalga oshirildi');
          break;

        case 'transfer':
          if (!operationForm.paymentMonth) {
            setError('Maqsad oyni tanlang');
            return;
          }
          result = await apiService.transferBalanceToNext(
            studentId,
            amount,
            operationForm.paymentMonth,
            operationForm.notes
          );
          setSuccess('Mablag\' keyingi oyga o\'tkazildi');
          break;

        case 'refund':
          result = await apiService.refundBalance(
            studentId,
            amount,
            operationForm.notes
          );
          setSuccess('Mablag\' qaytarildi');
          break;

        case 'other':
          if (!operationForm.description || operationForm.description.trim().length < 5) {
            setError('Izoh majburiy (kamida 5 belgi)');
            return;
          }
          result = await apiService.useBalanceForOther(
            studentId,
            amount,
            operationForm.description,
            operationForm.notes
          );
          setSuccess('Operatsiya muvaffaqiyatli amalga oshirildi');
          break;

        case 'fine':
          if (!operationForm.description || operationForm.description.trim().length < 5) {
            setError('Jarima sababi majburiy (kamida 5 belgi)');
            return;
          }
          result = await apiService.payFine(
            studentId,
            amount,
            operationForm.description,
            operationForm.paymentType,
            operationForm.notes
          );
          setSuccess('Jarima maktab kassasiga qo\'shildi');
          break;

        default:
          setError('Noto\'g\'ri operatsiya turi');
          return;
      }

      // Reload data
      await loadBalanceHistory();
      if (onBalanceUpdate) {
        onBalanceUpdate(result.newBalance);
      }

      // Close modal after 1.5 seconds
      setTimeout(() => {
        handleCloseModal();
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getOperationTypeLabel = (type) => {
    const labels = {
      'excess_payment': 'Ortiqcha to\'lov',
      'transfer_to_next': 'Oldindan to\'lash',
      'refund': 'Qaytarildi',
      'use_for_payment': 'Qarz yopildi',
      'use_for_other': 'Boshqa to\'lov',
      'fine': 'Jarima to\'landi'
    };
    return labels[type] || type;
  };

  const getOperationIcon = (type) => {
    const icons = {
      'excess_payment': '💰',
      'transfer_to_next': '📅',
      'refund': '↩️',
      'use_for_payment': '💳',
      'use_for_other': '📝',
      'fine': '⚠️'
    };
    return icons[type] || '📋';
  };

  const getOperationColor = (type) => {
    if (type === 'excess_payment') return 'green';
    return 'red';
  };

  return (
    <div className="student-balance compact">
      {/* Balance Header - Compact */}
      <div className="balance-header-compact">
        <div className="balance-info-compact">
          <span className="balance-icon-sm">💰</span>
          <div className="balance-text-compact">
            <span className="balance-label-sm">Hisobdagi mablag'</span>
            <span className={`balance-amount-compact ${currentBalance > 0 ? 'positive' : currentBalance < 0 ? 'negative' : 'zero'}`}>
              {(currentBalance || 0).toLocaleString('uz-UZ')} so'm
            </span>
          </div>
        </div>
        {currentBalance < 0 && (
          <span className="frozen-badge">⚠️ Muzlatilgan</span>
        )}
      </div>

      {/* Action Buttons - Compact Grid */}
      {currentBalance > 0 && (
        <div className="balance-actions-compact">
          <button
            onClick={() => handleOpenOperation('payment')}
            className="btn-action-sm btn-payment"
            title="Hisobdan qarz oyning to'loviga ishlatish"
          >
            <span>💳</span>
            <span>Qarzni yopish</span>
          </button>
          <button
            onClick={() => handleOpenOperation('transfer')}
            className="btn-action-sm btn-transfer"
            title="Keyingi oylar uchun oldindan to'lov qilish"
          >
            <span>📅</span>
            <span>Oldindan to'lash</span>
          </button>
          <button
            onClick={() => handleOpenOperation('refund')}
            className="btn-action-sm btn-refund"
            title="Mablag'ni qaytarish"
          >
            <span>↩️</span>
            <span>Qaytarish</span>
          </button>
          <button
            onClick={() => handleOpenOperation('other')}
            className="btn-action-sm btn-other"
            title="Boshqa to'lovga ishlatish"
          >
            <span>📝</span>
            <span>Boshqa</span>
          </button>
          <button
            onClick={() => handleOpenOperation('fine')}
            className="btn-action-sm btn-fine"
            title="Jarima to'lash (kassaga tushadi)"
          >
            <span>⚠️</span>
            <span>Jarima</span>
          </button>
        </div>
      )}

      {/* Transaction History - Compact */}
      {transactions.length > 0 && (
        <div className="balance-history-compact">
          <h4 className="history-title-sm">Operatsiyalar tarixi</h4>
          <div className="transactions-list-compact">
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction._id} className="transaction-item-compact">
                <div className="transaction-left">
                  <span className="transaction-icon-sm">{getOperationIcon(transaction.transactionType)}</span>
                  <div className="transaction-info-compact">
                    <span className="transaction-type-sm">{getOperationTypeLabel(transaction.transactionType)}</span>
                    <span className="transaction-date-sm">{formatDate(transaction.createdAt)}</span>
                  </div>
                </div>
                <div className="transaction-right">
                  <span className="transaction-amount-sm" style={{ color: getOperationColor(transaction.transactionType) }}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('uz-UZ')}
                  </span>
                  <button
                    className="btn-view-receipt"
                    onClick={() => handleViewReceipt(transaction)}
                    title="Batafsil ko'rish"
                  >
                    👁️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operation Modal */}
      {showOperationModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content balance-modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-compact">
              <h3>
                {operationType === 'payment' && '💳 Qarz oyini yopish'}
                {operationType === 'transfer' && '📅 Keyingi oy uchun oldindan to\'lash'}
                {operationType === 'refund' && '↩️ Mablag\'ni qaytarish'}
                {operationType === 'other' && '📝 Boshqa to\'lovga ishlatish'}
                {operationType === 'fine' && '⚠️ Jarima to\'lash'}
              </h3>
              <button className="close-btn-sm" onClick={handleCloseModal}>&times;</button>
            </div>

            <div className="modal-body-compact">
              <div className="current-balance-badge">
                <span>Joriy hisob:</span>
                <strong>{currentBalance.toLocaleString('uz-UZ')} so'm</strong>
              </div>

              <form onSubmit={handleSubmitOperation}>
                <div className="form-group-compact">
                  <label>Summa *</label>
                  <input
                    type="number"
                    value={operationForm.amount}
                    onChange={(e) => setOperationForm({ ...operationForm, amount: e.target.value })}
                    placeholder="Summa kiriting"
                    required
                    min="0"
                    max={currentBalance}
                    step="1000"
                  />
                </div>

                {(operationType === 'payment' || operationType === 'transfer') && (
                  <div className="form-group-compact">
                    <label>{operationType === 'payment' ? 'Qarz oyi *' : 'Oldindan to\'lanadigan oy *'}</label>
                    <input
                      type="month"
                      value={operationForm.paymentMonth}
                      onChange={(e) => setOperationForm({ ...operationForm, paymentMonth: e.target.value })}
                      required
                    />
                  </div>
                )}

                {(operationType === 'other' || operationType === 'fine') && (
                  <div className="form-group-compact">
                    <label>{operationType === 'fine' ? 'Jarima sababi *' : 'Izoh *'} (kamida 5 belgi)</label>
                    <textarea
                      value={operationForm.description}
                      onChange={(e) => setOperationForm({ ...operationForm, description: e.target.value })}
                      placeholder={operationType === 'fine' ? 'Jarima sababi...' : 'Mablag\' qayerga ishlatildi...'}
                      required
                      minLength="5"
                      rows="2"
                    />
                  </div>
                )}

                {operationType === 'fine' && (
                  <div className="form-group-compact">
                    <label>To'lov turi</label>
                    <select
                      value={operationForm.paymentType}
                      onChange={(e) => setOperationForm({ ...operationForm, paymentType: e.target.value })}
                    >
                      <option value="cash">💵 Naqd</option>
                      <option value="card">💳 Karta</option>
                      <option value="bank_transfer">🏦 Bank o'tkazmasi</option>
                    </select>
                    <small className="form-hint">Jarima qaysi kassaga tushishi</small>
                  </div>
                )}

                <div className="form-group-compact">
                  <label>Qo'shimcha eslatma</label>
                  <textarea
                    value={operationForm.notes}
                    onChange={(e) => setOperationForm({ ...operationForm, notes: e.target.value })}
                    placeholder="Qo'shimcha ma'lumot (ixtiyoriy)"
                    rows="2"
                  />
                </div>

                {error && <div className="error-message-compact">{error}</div>}
                {success && <div className="success-message-compact">{success}</div>}

                <div className="form-actions-compact">
                  <button type="button" onClick={handleCloseModal} className="btn-cancel-sm">
                    Bekor qilish
                  </button>
                  <button type="submit" className="btn-submit-sm" disabled={loading}>
                    {loading ? 'Yuklanmoqda...' : 'Tasdiqlash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Receipt/Detail Modal */}
      {showReceiptModal && selectedTransaction && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-header">
              <h3>📋 Operatsiya tafsilotlari</h3>
              <button className="close-btn-sm" onClick={() => setShowReceiptModal(false)}>&times;</button>
            </div>

            <div className="receipt-body">
              <div className="receipt-row">
                <span className="receipt-label">Operatsiya turi:</span>
                <span className="receipt-value">
                  {getOperationIcon(selectedTransaction.transactionType)} {getOperationTypeLabel(selectedTransaction.transactionType)}
                </span>
              </div>

              <div className="receipt-row">
                <span className="receipt-label">Summa:</span>
                <span className={`receipt-value amount ${selectedTransaction.amount > 0 ? 'positive' : 'negative'}`}>
                  {selectedTransaction.amount > 0 ? '+' : ''}{selectedTransaction.amount.toLocaleString('uz-UZ')} so'm
                </span>
              </div>

              <div className="receipt-row">
                <span className="receipt-label">Balans oldin:</span>
                <span className="receipt-value">{(selectedTransaction.balanceBefore || 0).toLocaleString('uz-UZ')} so'm</span>
              </div>

              <div className="receipt-row">
                <span className="receipt-label">Balans keyin:</span>
                <span className="receipt-value">{(selectedTransaction.balanceAfter || 0).toLocaleString('uz-UZ')} so'm</span>
              </div>

              {selectedTransaction.usedForMonth && (
                <div className="receipt-row">
                  <span className="receipt-label">Ishlatilgan oy:</span>
                  <span className="receipt-value">{selectedTransaction.usedForMonth}</span>
                </div>
              )}

              {selectedTransaction.description && (
                <div className="receipt-row">
                  <span className="receipt-label">Izoh:</span>
                  <span className="receipt-value">{selectedTransaction.description}</span>
                </div>
              )}

              {selectedTransaction.notes && (
                <div className="receipt-row">
                  <span className="receipt-label">Qo'shimcha eslatma:</span>
                  <span className="receipt-value">{selectedTransaction.notes}</span>
                </div>
              )}

              <div className="receipt-row">
                <span className="receipt-label">Sana va vaqt:</span>
                <span className="receipt-value">{formatFullDate(selectedTransaction.createdAt)}</span>
              </div>

              {selectedTransaction.createdBy && (
                <div className="receipt-row">
                  <span className="receipt-label">Amalga oshirdi:</span>
                  <span className="receipt-value">
                    {selectedTransaction.createdBy.firstName} {selectedTransaction.createdBy.lastName}
                  </span>
                </div>
              )}

              {selectedTransaction.relatedPaymentId && (
                <div className="receipt-row">
                  <span className="receipt-label">Bog'langan to'lov:</span>
                  <span className="receipt-value">
                    {selectedTransaction.relatedPaymentId.paymentMonth} - {(selectedTransaction.relatedPaymentId.amount || 0).toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              )}
            </div>

            <div className="receipt-footer">
              <button className="btn-close-receipt" onClick={() => setShowReceiptModal(false)}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentBalance;
