import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import PaymentReceipt from './PaymentReceipt';
import StudentBalance from './StudentBalance';

const StudentPayments = ({ studentId, studentName, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'debts'
  const [payments, setPayments] = useState([]);
  const [unpaidMonths, setUnpaidMonths] = useState([]);
  const [partiallyPaidMonths, setPartiallyPaidMonths] = useState([]);
  const [debtInfo, setDebtInfo] = useState(null);
  const [studentBalance, setStudentBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [showSetFeeModal, setShowSetFeeModal] = useState(false);
  const [monthlyFeeInput, setMonthlyFeeInput] = useState('');
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState('');
  const [isNewPayment, setIsNewPayment] = useState(false); // Track if this is a new payment for hard refresh
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    discount: '',
    paymentType: 'cash',
    paymentMonth: new Date().toISOString().slice(0, 7),
    paymentDate: new Date().toISOString().split('T')[0],
    description: '',
    receiptNumber: '',
    transactionId: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && studentId) {
      if (process.env.NODE_ENV === 'development') {
      }
      loadPayments();
      loadUnpaidMonths();
      loadStudentBalance();
      setActiveTab('history');
      setError('');
    } else if (!isOpen) {
      // Reset state when modal closes
      setError('');
      setShowAddModal(false);
      setShowSetFeeModal(false);
      setShowDeleteConfirm(false);
      setShowReceipt(false);
      setPaymentSuccessMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studentId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiService.getStudentPayments(studentId);
      setPayments(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'To\'lovlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const loadUnpaidMonths = async () => {
    try {
      const data = await apiService.getUnpaidMonths(studentId);
      setUnpaidMonths(data.unpaidMonths || []);
      setPartiallyPaidMonths(data.partiallyPaidMonths || []);
      setDebtInfo(data);
    } catch (err) {
      console.error('loadUnpaidMonths error:', err);
      // Set empty debtInfo so the tab still renders (shows "no debts" instead of blank)
      setDebtInfo({ unpaidMonths: [], partiallyPaidMonths: [], totalDebt: 0, monthlyFee: 0, totalUnpaid: 0, totalPartiallyPaid: 0 });
    }
  };

  const loadStudentBalance = async () => {
    try {
      const userData = await apiService.getUserById(studentId);
      setStudentBalance(userData.balance || 0);
    } catch (err) {
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await apiService.createPayment({
        ...paymentForm,
        studentId,
        amount: parseFloat(paymentForm.amount),
        discount: parseFloat(paymentForm.discount) || 0,
        paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0]
      });

      // Handle response with balance info
      const newPayment = response.payment || response;
      const excessAmount = response.excessAmount || 0;
      const newBalance = response.newBalance || 0;
      const message = response.message || '';

      setShowAddModal(false);
      setPaymentForm({
        amount: '',
        discount: '',
        paymentType: 'cash',
        paymentMonth: new Date().toISOString().slice(0, 7),
        paymentDate: new Date().toISOString().split('T')[0],
        description: '',
        receiptNumber: '',
        transactionId: '',
        notes: ''
      });

      // Update balance
      if (excessAmount > 0) {
        setStudentBalance(newBalance);
        setPaymentSuccessMessage(`${message} Ortiqcha to'lov: ${excessAmount.toLocaleString('uz-UZ')} so'm`);
      }

      loadPayments();
      loadUnpaidMonths();
      loadStudentBalance();

      // Show receipt after successful payment
      setSelectedPayment(newPayment);
      setIsNewPayment(true); // Mark as new payment for hard refresh
      setShowReceipt(true);
    } catch (err) {
      setError(err.response?.data?.message || 'To\'lov qo\'shishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (payment) => {
    setPaymentToDelete(payment);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;

    try {
      setLoading(true);
      setError('');
      const response = await apiService.deletePayment(paymentToDelete._id);

      // Update balance from response
      if (response.newBalance !== undefined) {
        setStudentBalance(response.newBalance);
      }

      // Show warning if balance is negative (frozen account)
      if (response.balanceWarning) {
        setError(response.balanceWarning);
      }

      setShowDeleteConfirm(false);
      setPaymentToDelete(null);

      // Hard refresh after payment deletion
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'To\'lovni o\'chirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setPaymentToDelete(null);
  };

  const handleSetMonthlyFee = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const feeAmount = parseFloat(monthlyFeeInput);

      if (isNaN(feeAmount) || feeAmount < 0) {
        setError('Iltimos, to\'g\'ri summa kiriting');
        setLoading(false);
        return;
      }

      await apiService.updateUser(studentId, { monthlyFee: feeAmount });

      // Update local debtInfo immediately to reflect the change
      setDebtInfo(prev => ({
        ...prev,
        monthlyFee: feeAmount
      }));

      setShowSetFeeModal(false);
      setMonthlyFeeInput('');

      // Reload to calculate unpaid months based on new fee
      await loadUnpaidMonths();
    } catch (err) {
      setError(err.response?.data?.message || 'Oylik to\'lovni belgilashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const getPaymentTypeLabel = (type) => {
    const types = {
      cash: 'Naqd',
      card: 'Karta',
      bank_transfer: 'Bank o\'tkazmasi'
    };
    return types[type] || type;
  };

  const getTotalPaid = () => {
    return payments.filter(p => !p.isDeleted).reduce((sum, p) => sum + p.amount, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payments-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payments-header">
          <div>
            <h2 className="payments-title">O'quvchi to'lovlari</h2>
            <p className="payments-subtitle">{studentName}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 To'lov tarixi
          </button>
          <button
            className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('balance')}
          >
            💰 Hisobidagi mablag'
            {studentBalance > 0 && (
              <span className="balance-badge">{formatCurrency(studentBalance)}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'debts' ? 'active' : ''}`}
            onClick={() => setActiveTab('debts')}
          >
            ⚠️ Qarzdorliklar
            {debtInfo && debtInfo.totalDebt > 0 && (
              <span className="debt-badge">{debtInfo.totalUnpaid + debtInfo.totalPartiallyPaid}</span>
            )}
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {paymentSuccessMessage && (
          <div className="success-banner">
            <span className="success-icon">✓</span>
            <span className="success-text">{paymentSuccessMessage}</span>
            <button className="close-success" onClick={() => setPaymentSuccessMessage('')}>×</button>
          </div>
        )}

        {/* Student Balance Section - Only show on balance tab */}
        {activeTab === 'balance' && (
          <StudentBalance
            studentId={studentId}
            studentName={studentName}
            currentBalance={studentBalance}
            onBalanceUpdate={(newBalance) => {
              setStudentBalance(newBalance);
              loadPayments();
              loadUnpaidMonths();
            }}
          />
        )}

        {activeTab === 'history' && (
          <>
            <div className="payments-summary">
              <div className="summary-card">
                <div className="summary-icon">💰</div>
                <div className="summary-content">
                  <div className="summary-value">{formatCurrency(getTotalPaid())}</div>
                  <div className="summary-label">Jami to'langan</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon">📊</div>
                <div className="summary-content">
                  <div className="summary-value">{payments.filter(p => !p.isDeleted).length}</div>
                  <div className="summary-label">To'lovlar soni</div>
                </div>
              </div>
            </div>

            <div className="payments-actions">
              <button className="btn-add-payment" onClick={() => setShowAddModal(true)}>
                <span>➕</span>
                <span>Yangi to'lov qo'shish</span>
              </button>
            </div>

            <div className="payments-list">
              {loading ? (
                <div className="loading-state">Yuklanmoqda...</div>
              ) : payments.length === 0 ? (
                <div className="empty-state">
                  <h3>To'lovlar mavjud emas</h3>
                  <p>Hali birorta to'lov qo'shilmagan</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <table className="payments-table desktop-view">
                    <thead>
                      <tr>
                        <th>Oy</th>
                        <th>Summa</th>
                        <th>Chegirma</th>
                        <th>Haqiqiy to'lov</th>
                        <th>Turi</th>
                        <th>Sana</th>
                        <th>Izoh</th>
                        <th>Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id} className={payment.isDeleted ? 'deleted-payment' : ''}>
                          <td>
                            <span className="payment-month">{formatMonth(payment.paymentMonth)}</span>
                          </td>
                          <td>
                            <span className="payment-amount">{formatCurrency(payment.amount)}</span>
                          </td>
                          <td>
                            <span className="payment-discount">{formatCurrency(payment.discount || 0)}</span>
                          </td>
                          <td>
                            <span className="payment-actual">{formatCurrency(payment.actualPayment || payment.amount)}</span>
                          </td>
                          <td>
                            <span className={`payment-type-badge ${payment.paymentType}`}>
                              {getPaymentTypeLabel(payment.paymentType)}
                            </span>
                          </td>
                          <td>
                            <span className="payment-date">{formatDate(payment.paymentDate)}</span>
                          </td>
                          <td>
                            <span className="payment-description">{payment.description || '-'}</span>
                            {payment.isDeleted && (
                              <span className="deleted-badge">O'chirilgan</span>
                            )}
                          </td>
                          <td>
                            <div className="payment-actions-cell">
                              <button
                                className="view-receipt-btn"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowReceipt(true);
                                }}
                                title="Chekni ko'rish"
                              >
                                📄
                              </button>
                              {!payment.isDeleted && (
                                <button
                                  className="delete-payment-btn"
                                  onClick={() => handleDeleteClick(payment)}
                                  title="O'chirish"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile/Tablet Card View */}
                  <div className="payments-cards mobile-view">
                    {payments.map((payment) => (
                      <div key={payment._id} className={`payment-card ${payment.isDeleted ? 'deleted-payment-card' : ''}`}>
                        <div className="payment-card-header">
                          <div className="payment-card-month">
                            <span className="month-icon">📅</span>
                            <span className="month-text">{formatMonth(payment.paymentMonth)}</span>
                          </div>
                          <span className={`payment-type-badge ${payment.paymentType}`}>
                            {getPaymentTypeLabel(payment.paymentType)}
                          </span>
                        </div>

                        <div className="payment-card-body">
                          <div className="payment-card-row main-amount">
                            <span className="label">Haqiqiy to'lov</span>
                            <span className="value highlight">{formatCurrency(payment.actualPayment || payment.amount)}</span>
                          </div>

                          <div className="payment-card-divider"></div>

                          <div className="payment-card-row">
                            <span className="label">To'lanishi kerak</span>
                            <span className="value">{formatCurrency(payment.amount)}</span>
                          </div>

                          {payment.discount > 0 && (
                            <div className="payment-card-row discount-row">
                              <span className="label">Chegirma</span>
                              <span className="value discount">{formatCurrency(payment.discount)}</span>
                            </div>
                          )}

                          <div className="payment-card-row">
                            <span className="label">Sana</span>
                            <span className="value date">{formatDate(payment.paymentDate)}</span>
                          </div>

                          {payment.description && (
                            <div className="payment-card-description">
                              <span className="desc-label">Izoh:</span>
                              <span className="desc-text">{payment.description}</span>
                            </div>
                          )}

                          {payment.isDeleted && (
                            <div className="deleted-badge-card">
                              ⚠️ O'chirilgan to'lov
                            </div>
                          )}
                        </div>

                        <div className="payment-card-actions">
                          <button
                            className="card-action-btn view-btn"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowReceipt(true);
                            }}
                          >
                            <span>📄</span>
                            <span>Chek</span>
                          </button>
                          {!payment.isDeleted && (
                            <button
                              className="card-action-btn delete-btn"
                              onClick={() => handleDeleteClick(payment)}
                            >
                              <span>🗑️</span>
                              <span>O'chirish</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'debts' && debtInfo && (
          <>
            <div className="debts-summary">
              <div className="summary-card debt-card">
                <div className="summary-icon debt-icon">⚠️</div>
                <div className="summary-content">
                  <div className="summary-value debt-value">{formatCurrency(debtInfo.totalDebt || 0)}</div>
                  <div className="summary-label">Jami qarz</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-icon">💳</div>
                <div className="summary-content">
                  <div className="summary-value">{formatCurrency(debtInfo.monthlyFee || 0)}</div>
                  <div className="summary-label">Oylik to'lov</div>
                </div>
              </div>
            </div>

            {/* Show balance info if student has positive balance */}
            {studentBalance > 0 && debtInfo.totalDebt > 0 && (
              <div className="balance-info-banner">
                <div className="balance-info-icon">💰</div>
                <div className="balance-info-content">
                  <div className="balance-info-text">
                    <strong>Hisobda {formatCurrency(studentBalance)} mavjud!</strong>
                    {studentBalance >= debtInfo.totalDebt ? (
                      <span className="balance-sufficient"> ✓ Barcha qarzlarni yopish uchun yetarli</span>
                    ) : (
                      <span className="balance-partial"> Qisman qarzlarni yopish mumkin</span>
                    )}
                  </div>
                  <button
                    className="btn-use-balance"
                    onClick={() => setActiveTab('balance')}
                  >
                    Hisobdan foydalanish →
                  </button>
                </div>
              </div>
            )}

            {(debtInfo?.monthlyFee === 0 || !debtInfo?.monthlyFee) ? (
              <div className="info-message">
                <div className="info-icon">💰</div>
                <div className="info-content">
                  <h3>Oylik to'lov belgilanmagan</h3>
                  <p>Ushbu o'quvchi uchun oylik to'lov summasi belgilanmagan. Qarzdorliklarni ko'rish uchun oylik to'lov summasini kiriting.</p>
                  <button
                    className="btn-set-fee"
                    onClick={() => setShowSetFeeModal(true)}
                  >
                    <span>💵</span>
                    <span>Oylik to'lovni belgilash</span>
                  </button>
                </div>
              </div>
            ) : (unpaidMonths.length > 0 || partiallyPaidMonths.length > 0) ? (
              <div className="debts-list">
                {partiallyPaidMonths.length > 0 && (
                  <div className="debt-section">
                    <h3 className="debt-section-title">Qisman to'langan oylar ({partiallyPaidMonths.length})</h3>
                    {partiallyPaidMonths.map((item) => (
                      <div key={item.month} className="debt-month-card partial-paid">
                        <div className="debt-month-header">
                          <span className="debt-month-name">{item.monthName}</span>
                          <span className="debt-amount">{formatCurrency(item.remainingDebt)}</span>
                        </div>
                        <div className="debt-progress">
                          <div className="progress-bar">
                            <div
                              className="progress-fill partial"
                              style={{ width: `${item.paymentPercentage}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{item.paymentPercentage}% to'langan</span>
                        </div>
                        <div className="debt-details">
                          <span>To'lanishi kerak: {formatCurrency(item.monthlyFee)}</span>
                          <span>To'langan: {formatCurrency(item.totalPaid)}</span>
                          {item.totalDiscount > 0 && (
                            <span className="discount-info">Chegirma: {formatCurrency(item.totalDiscount)}</span>
                          )}
                        </div>
                        <button
                          className="btn-pay-debt"
                          onClick={() => {
                            setPaymentForm({
                              ...paymentForm,
                              paymentMonth: item.month,
                              amount: item.remainingDebt.toString()
                            });
                            setShowAddModal(true);
                          }}
                        >
                          Qarzni to'lash
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {unpaidMonths.length > 0 && (
                  <div className="debt-section">
                    <h3 className="debt-section-title">To'lanmagan oylar ({unpaidMonths.length})</h3>
                    {unpaidMonths.map((item) => (
                      <div key={item.month} className="debt-month-card unpaid">
                        <div className="debt-month-header">
                          <span className="debt-month-name">{item.monthName}</span>
                          <span className="debt-amount danger">{formatCurrency(item.remainingDebt)}</span>
                        </div>
                        <div className="debt-details">
                          <span>To'lanishi kerak: {formatCurrency(item.monthlyFee)}</span>
                        </div>
                        <button
                          className="btn-pay-debt danger"
                          onClick={() => {
                            setPaymentForm({
                              ...paymentForm,
                              paymentMonth: item.month,
                              amount: item.monthlyFee.toString()
                            });
                            setShowAddModal(true);
                          }}
                        >
                          To'lash
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <h3>🎉 Barcha oylar to'langan!</h3>
                <p>Hozircha qarzlar yo'q</p>
              </div>
            )}
          </>
        )}

        {/* Add Payment Modal */}
        {showAddModal && (
          <div className="sub-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="add-payment-modal" onClick={(e) => e.stopPropagation()}>
              <div className="add-payment-header">
                <h3>Yangi to'lov qo'shish</h3>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
              </div>

              <form onSubmit={handleAddPayment} className="payment-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Summa (to'lanishi kerak) *</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      required
                      min="0"
                      step="1000"
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Chegirma</label>
                    <input
                      type="number"
                      value={paymentForm.discount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, discount: e.target.value })}
                      min="0"
                      step="1000"
                      placeholder="0"
                    />
                    <small className="field-hint">
                      Chegirma berilsa, bu summa avtomatik to'langan hisoblanadi
                    </small>
                  </div>
                </div>

                {paymentForm.amount && (
                  <div className="payment-calculation">
                    <div className="calc-row">
                      <span>To'lanishi kerak:</span>
                      <strong>{formatCurrency(parseFloat(paymentForm.amount) || 0)}</strong>
                    </div>
                    {paymentForm.discount && parseFloat(paymentForm.discount) > 0 && (
                      <div className="calc-row discount-row">
                        <span>Chegirma:</span>
                        <strong>- {formatCurrency(parseFloat(paymentForm.discount) || 0)}</strong>
                      </div>
                    )}
                    <div className="calc-row total-row">
                      <span>Haqiqiy to'lov:</span>
                      <strong className="total-amount">
                        {formatCurrency(
                          Math.max(0, (parseFloat(paymentForm.amount) || 0) - (parseFloat(paymentForm.discount) || 0))
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>To'lov turi *</label>
                    <select
                      value={paymentForm.paymentType}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                      required
                    >
                      <option value="cash">Naqd</option>
                      <option value="card">Karta</option>
                      <option value="bank_transfer">Bank o'tkazmasi</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Oy *</label>
                    <input
                      type="month"
                      value={paymentForm.paymentMonth}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMonth: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>To'lov sanasi *</label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      required
                    />
                    <small className="field-hint">Qachon to'lov qilingan?</small>
                  </div>
                </div>

                <div className="form-group">
                  <label>Izoh</label>
                  <textarea
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                    rows="3"
                    placeholder="Qo'shimcha ma'lumot..."
                  ></textarea>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                    Bekor qilish
                  </button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Receipt Modal */}
        {showReceipt && selectedPayment && (
          <PaymentReceipt
            payment={selectedPayment}
            student={{
              firstName: studentName.split(' ')[0],
              lastName: studentName.split(' ').slice(1).join(' '),
              studentId: selectedPayment.studentId?.studentId || 'N/A'
            }}
            onClose={() => {
              setShowReceipt(false);
              setSelectedPayment(null);
              // Hard refresh if this was a new payment
              if (isNewPayment) {
                window.location.reload();
              }
            }}
            schoolInfo={{
              name: 'My Dream School',
              address: 'Beruniy tumani',
              phone: '+998 90 706 88 66'
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && paymentToDelete && (
          <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-modal-header">
                <div className="delete-icon">⚠️</div>
                <h3>To'lovni o'chirish</h3>
              </div>

              <div className="delete-modal-body">
                <p className="delete-message">
                  Ushbu to'lovni o'chirmoqchimisiz?
                </p>
                <div className="delete-payment-info">
                  <div className="delete-info-row">
                    <span>Summa:</span>
                    <strong>{formatCurrency(paymentToDelete.amount)}</strong>
                  </div>
                  <div className="delete-info-row">
                    <span>Oy:</span>
                    <strong>{formatMonth(paymentToDelete.paymentMonth)}</strong>
                  </div>
                  <div className="delete-info-row">
                    <span>Sana:</span>
                    <strong>{formatDate(paymentToDelete.paymentDate)}</strong>
                  </div>
                </div>
                <p className="delete-warning">
                  ⚠️ Bu amalni ortga qaytarib bo'lmaydi!
                </p>
              </div>

              <div className="delete-modal-actions">
                <button
                  className="btn-cancel-delete"
                  onClick={handleDeleteCancel}
                  disabled={loading}
                >
                  Bekor qilish
                </button>
                <button
                  className="btn-confirm-delete"
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                >
                  {loading ? 'O\'chirilmoqda...' : 'Ha, o\'chirish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Set Monthly Fee Modal */}
        {showSetFeeModal && (
          <div className="sub-modal-overlay" onClick={() => setShowSetFeeModal(false)}>
            <div className="set-fee-modal" onClick={(e) => e.stopPropagation()}>
              <div className="set-fee-header">
                <div className="fee-icon">💰</div>
                <div>
                  <h3>Oylik to'lovni belgilash</h3>
                  <p className="student-name-subtitle">{studentName}</p>
                </div>
                <button className="close-btn" onClick={() => setShowSetFeeModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSetMonthlyFee} className="fee-form">
                <div className="form-group">
                  <label>Oylik to'lov summasi *</label>
                  <input
                    type="number"
                    value={monthlyFeeInput}
                    onChange={(e) => setMonthlyFeeInput(e.target.value)}
                    required
                    min="0"
                    step="10000"
                    placeholder="Masalan: 500000"
                    autoFocus
                  />
                  <small className="field-hint">
                    O'quvchi har oy to'lashi kerak bo'lgan summa
                  </small>
                </div>

                {monthlyFeeInput && (
                  <div className="fee-preview">
                    <div className="preview-icon">ℹ️</div>
                    <div className="preview-content">
                      <p>Oylik to'lov: <strong>{formatCurrency(parseFloat(monthlyFeeInput) || 0)}</strong></p>
                      <small>Bu summa o'quvchining profilidasiga saqlanadi va qarzdorliklarni hisoblashda ishlatiladi.</small>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowSetFeeModal(false)}
                    disabled={loading}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={loading}
                  >
                    {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
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
          padding: 0.75rem;
        }

        .payments-modal {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 95%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow-x: hidden;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .payments-header {
          padding: 1rem;
          border-bottom: 1px solid #93c5fd;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
        }

        .payments-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1e40af;
          margin: 0 0 0.125rem 0;
        }

        .payments-subtitle {
          font-size: 0.6875rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .tabs-container {
          display: flex;
          gap: 0.25rem;
          padding: 0 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .tab-btn {
          flex: 1;
          padding: 0.625rem 0.75rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
        }

        .tab-btn.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .tab-btn:hover {
          color: #3b82f6;
        }

        .debt-badge {
          background: #ef4444;
          color: white;
          padding: 0.125rem 0.375rem;
          border-radius: 8px;
          font-size: 0.625rem;
          font-weight: 700;
        }

        .debts-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          padding: 1rem;
        }

        .debt-card {
          background: #fef2f2 !important;
          border: 1px solid #fca5a5 !important;
        }

        .debt-icon {
          background: #ef4444 !important;
        }

        .debt-value {
          color: #dc2626 !important;
        }

        /* Balance Info Banner in Debts Section */
        .balance-info-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #ecfdf5, #d1fae5);
          padding: 0.75rem 1rem;
          margin: 0 1rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #6ee7b7;
        }

        .balance-info-icon {
          font-size: 1.5rem;
        }

        .balance-info-content {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .balance-info-text {
          font-size: 0.75rem;
          color: #065f46;
        }

        .balance-info-text strong {
          color: #047857;
        }

        .balance-sufficient {
          color: #059669;
          font-weight: 600;
        }

        .balance-partial {
          color: #d97706;
          font-weight: 500;
        }

        .btn-use-balance {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .btn-use-balance:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .debts-list {
          padding: 0 1rem 1rem;
          max-height: 50vh;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .debts-list::-webkit-scrollbar {
          width: 6px;
        }

        .debts-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .debts-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .debts-list::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .debt-section {
          margin-bottom: 1rem;
        }

        .debt-section-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.625rem;
          padding-bottom: 0.375rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .debt-month-card {
          background: white;
          padding: 0.875rem;
          border-radius: 8px;
          margin-bottom: 0.625rem;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .debt-month-card.partial-paid {
          border-color: #fbbf24;
        }

        .debt-month-card.unpaid {
          border-color: #f87171;
        }

        .debt-month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.625rem;
        }

        .debt-month-name {
          font-weight: 600;
          font-size: 0.8125rem;
          color: #1e293b;
        }

        .debt-amount {
          font-weight: 700;
          font-size: 0.9375rem;
          color: #f59e0b;
        }

        .debt-amount.danger {
          color: #ef4444;
        }

        .debt-progress {
          margin-bottom: 0.625rem;
          overflow: hidden;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.375rem;
          box-sizing: border-box;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 4px 0 0 4px;
          transition: none;
        }

        .progress-fill.partial {
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
        }

        .progress-text {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 500;
        }

        .debt-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.625rem;
          font-size: 0.6875rem;
          color: #475569;
        }

        .discount-info {
          color: #059669;
          font-weight: 600;
        }

        .btn-pay-debt {
          width: 100%;
          padding: 0.5rem 0.875rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-pay-debt.danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .payment-calculation {
          background: #ecfdf5;
          padding: 0.875rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #10b981;
          position: relative;
        }

        .calc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.375rem 0;
          font-size: 0.75rem;
          font-weight: 600;
          color: #065f46;
        }

        .calc-row span:first-child {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .calc-row span:first-child::before {
          content: '•';
          color: #10b981;
          font-size: 0.875rem;
        }

        .calc-row strong {
          font-weight: 700;
          color: #064e3b;
          font-size: 0.8125rem;
        }

        .calc-row.discount-row {
          color: #059669;
        }

        .calc-row.discount-row span:first-child::before {
          content: '↓';
          color: #10b981;
        }

        .calc-row.discount-row strong {
          color: #059669;
          background: #d1fae5;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
        }

        .calc-row.total-row {
          border-top: 1px dashed #6ee7b7;
          margin-top: 0.5rem;
          padding-top: 0.625rem;
          font-size: 0.875rem;
        }

        .calc-row.total-row span:first-child {
          font-weight: 700;
          color: #064e3b;
        }

        .calc-row.total-row span:first-child::before {
          content: '💰';
          font-size: 0.875rem;
        }

        .total-amount {
          color: #059669;
          font-size: 1rem;
          font-weight: 800;
        }

        .field-hint {
          display: block;
          margin-top: 0.375rem;
          font-size: 0.625rem;
          color: #059669;
          font-weight: 500;
          background: rgba(16, 185, 129, 0.1);
          padding: 0.375rem 0.5rem;
          border-radius: 4px;
          border-left: 2px solid #10b981;
        }

        .field-hint::before {
          content: '💡 ';
        }

        .payment-discount {
          color: #059669;
          font-weight: 700;
          background: #d1fae5;
          padding: 0.0625rem 0.375rem;
          border-radius: 4px;
        }

        .payment-actual {
          color: #10b981;
          font-weight: 700;
          background: #ecfdf5;
          padding: 0.0625rem 0.375rem;
          border-radius: 4px;
        }

        .info-message {
          margin: 0.75rem;
          padding: 0.875rem;
          background: #dbeafe;
          border: 1px solid #3b82f6;
          border-radius: 8px;
          text-align: center;
        }

        .info-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .info-content h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e40af;
          margin: 0 0 0.375rem 0;
        }

        .info-content p {
          font-size: 0.6875rem;
          color: #1e40af;
          margin: 0 0 0.625rem 0;
          line-height: 1.4;
        }

        .btn-set-fee {
          padding: 0.375rem 0.75rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .close-btn {
          background: #dbeafe;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          color: #1e40af;
        }

        .close-btn:hover {
          background: #3b82f6;
          color: white;
        }

        .error-banner {
          margin: 0.75rem 1rem 0;
          padding: 0.5rem 0.75rem;
          background: #fee2e2;
          border: 1px solid #f87171;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .error-icon {
          font-size: 0.875rem;
        }

        .error-text {
          flex: 1;
          color: #991b1b;
          font-weight: 500;
          font-size: 0.6875rem;
        }

        .success-banner {
          margin: 0.75rem 1rem 0;
          padding: 0.5rem 0.75rem;
          background: #d1fae5;
          border: 1px solid #10b981;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .success-icon {
          font-size: 0.875rem;
          color: #065f46;
        }

        .success-text {
          flex: 1;
          color: #065f46;
          font-weight: 500;
          font-size: 0.6875rem;
        }

        .close-success {
          background: none;
          border: none;
          color: #065f46;
          font-size: 1rem;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .payments-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          padding: 1rem;
        }

        .summary-card {
          background: #f8fafc;
          padding: 0.75rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          border: 1px solid #e2e8f0;
        }

        .summary-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
        }

        .summary-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .summary-label {
          font-size: 0.625rem;
          color: #64748b;
          font-weight: 500;
        }

        .unpaid-months-section {
          margin: 0 1rem 0.875rem;
          padding: 0.75rem;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
        }

        .unpaid-header {
          margin-bottom: 0.625rem;
        }

        .unpaid-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #92400e;
          margin: 0;
        }

        .unpaid-months-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.5rem;
        }

        .unpaid-month-card {
          background: white;
          padding: 0.625rem;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          border: 1px solid #fbbf24;
        }

        .unpaid-month-name {
          font-weight: 500;
          color: #92400e;
          font-size: 0.75rem;
        }

        .btn-pay-now {
          padding: 0.375rem 0.625rem;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.6875rem;
          font-weight: 600;
          cursor: pointer;
        }

        .payments-actions {
          padding: 0 1rem 0.875rem;
        }

        .btn-add-payment {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
        }

        .payments-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 1rem 1rem;
        }

        .loading-state {
          text-align: center;
          padding: 1.5rem;
          color: #64748b;
          font-size: 0.8125rem;
        }

        .empty-state {
          text-align: center;
          padding: 1.5rem;
        }

        .empty-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .empty-state h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
        }

        .empty-state p {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
        }

        /* Desktop/Mobile View Toggle */
        .desktop-view {
          display: table;
        }

        .mobile-view {
          display: none;
        }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .payments-table thead {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
        }

        .payments-table th {
          padding: 0.625rem 0.875rem;
          text-align: left;
          font-size: 0.6875rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .payments-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
        }

        .payments-table tbody tr:hover {
          background: #f8fafc;
        }

        .payments-table tbody tr.deleted-payment {
          opacity: 0.6;
          background: #fef2f2;
        }

        .payments-table tbody tr.deleted-payment td {
          text-decoration: line-through;
          color: #991b1b;
        }

        .payments-table td {
          padding: 0.625rem 0.875rem;
          font-size: 0.8125rem;
        }

        .deleted-badge {
          display: inline-block;
          margin-left: 0.5rem;
          padding: 0.25rem 0.625rem;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-decoration: none;
        }

        .payment-month {
          font-weight: 600;
          color: #1e293b;
        }

        .payment-amount {
          font-weight: 700;
          color: #059669;
          font-size: 0.875rem;
        }

        .payment-type-badge {
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
          display: inline-block;
        }

        .payment-type-badge.cash {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #78350f;
        }

        .payment-type-badge.card {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
        }

        .payment-type-badge.bank_transfer {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
        }

        .payment-date {
          color: #64748b;
          font-size: 0.75rem;
        }

        .payment-description {
          color: #475569;
          font-size: 0.8125rem;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .payment-actions-cell {
          display: flex;
          gap: 0.375rem;
          align-items: center;
        }

        .view-receipt-btn {
          background: #dbeafe;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .view-receipt-btn:hover {
          background: #3b82f6;
          transform: scale(1.1);
        }

        .delete-payment-btn {
          background: #fee2e2;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .delete-payment-btn:hover {
          background: #ef4444;
          transform: scale(1.1);
        }

        /* ==================== PAYMENT CARDS (MOBILE/TABLET) ==================== */
        .payments-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .payment-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 2px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .payment-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-color: #cbd5e1;
        }

        .deleted-payment-card {
          opacity: 0.7;
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border-color: #fca5a5;
        }

        .payment-card-header {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
        }

        .payment-card-month {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .month-icon {
          font-size: 1.25rem;
        }

        .month-text {
          font-weight: 700;
          font-size: 1rem;
          color: #1e293b;
        }

        .payment-card-body {
          padding: 1.25rem;
        }

        .payment-card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 0;
          font-size: 0.9375rem;
        }

        .payment-card-row .label {
          color: #64748b;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .payment-card-row .value {
          font-weight: 700;
          color: #1e293b;
        }

        .payment-card-row.main-amount {
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-radius: 10px;
          margin-bottom: 0.75rem;
        }

        .payment-card-row.main-amount .value {
          font-size: 1.25rem;
          color: #1e40af;
        }

        .payment-card-row.discount-row .value {
          color: #059669;
        }

        .payment-card-row .value.date {
          font-size: 0.875rem;
          color: #64748b;
        }

        .payment-card-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e2e8f0, transparent);
          margin: 0.75rem 0;
        }

        .payment-card-description {
          margin-top: 0.875rem;
          padding: 0.875rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 3px solid #3b82f6;
        }

        .payment-card-description .desc-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.375rem;
        }

        .payment-card-description .desc-text {
          display: block;
          font-size: 0.875rem;
          color: #475569;
          line-height: 1.5;
        }

        .deleted-badge-card {
          margin-top: 0.875rem;
          padding: 0.625rem 0.875rem;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border: 2px solid #f87171;
          border-radius: 8px;
          color: #991b1b;
          font-weight: 700;
          font-size: 0.875rem;
          text-align: center;
        }

        .payment-card-actions {
          padding: 1rem 1.25rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .card-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .card-action-btn.view-btn {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
          border: 2px solid #93c5fd;
        }

        .card-action-btn.view-btn:hover {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .card-action-btn.delete-btn {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          border: 2px solid #fca5a5;
        }

        .card-action-btn.delete-btn:hover {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* Delete Confirmation Modal */
        .delete-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .delete-modal {
          background: white;
          border-radius: 12px;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .delete-modal-header {
          padding: 1rem 1rem 0.625rem;
          text-align: center;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border-bottom: 1px solid #93c5fd;
        }

        .delete-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .delete-modal-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e40af;
          margin: 0;
        }

        .delete-modal-body {
          padding: 0 1rem 1rem;
        }

        .delete-message {
          text-align: center;
          font-size: 0.75rem;
          color: #475569;
          margin-bottom: 0.875rem;
        }

        .delete-payment-info {
          background: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 6px;
          padding: 0.625rem;
          margin-bottom: 0.875rem;
        }

        .delete-info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
          border-bottom: 1px dotted #93c5fd;
          font-size: 0.6875rem;
        }

        .delete-info-row:last-child {
          border-bottom: none;
        }

        .delete-info-row span {
          color: #1e40af;
        }

        .delete-info-row strong {
          color: #3b82f6;
        }

        .delete-warning {
          text-align: center;
          color: #dc2626;
          font-weight: 600;
          font-size: 0.6875rem;
          margin: 0;
          padding: 0.5rem;
          background: #fef2f2;
          border-radius: 4px;
        }

        .delete-modal-actions {
          padding: 0.75rem 1rem 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .btn-cancel-delete,
        .btn-confirm-delete {
          flex: 1;
          padding: 0.5rem 0.875rem;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-cancel-delete {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .btn-confirm-delete {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .btn-cancel-delete:disabled,
        .btn-confirm-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Add Payment Modal */
        .sub-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
        }

        .add-payment-modal {
          background: white;
          border-radius: 12px;
          max-width: 480px;
          width: 95%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .add-payment-header {
          padding: 1rem;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border-bottom: 1px solid #93c5fd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .add-payment-header h3 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #1e40af;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .add-payment-header h3::before {
          content: '💰';
          font-size: 1rem;
        }

        .payment-form {
          padding: 1rem;
          background: white;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .form-group label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .form-group label::after {
          content: attr(data-required);
          color: #ef4444;
          font-size: 0.625rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          font-family: inherit;
          background: white;
          color: #1e293b;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
        }

        .form-group select {
          cursor: pointer;
          appearance: none;
          padding-right: 2rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1rem 1rem;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
          line-height: 1.5;
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 0.875rem;
          border-top: 1px solid #f1f5f9;
        }

        .btn-cancel,
        .btn-submit {
          flex: 1;
          padding: 0.5rem 0.875rem;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-cancel {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .btn-submit {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Set Monthly Fee Modal */
        .set-fee-modal {
          background: white;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .set-fee-header {
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f8fafc;
        }

        .fee-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          flex-shrink: 0;
        }

        .set-fee-header > div {
          flex: 1;
        }

        .set-fee-header h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.125rem 0;
        }

        .student-name-subtitle {
          font-size: 0.6875rem;
          color: #64748b;
          margin: 0;
        }

        .fee-form {
          padding: 1rem;
        }

        .fee-preview {
          margin-top: 0.875rem;
          padding: 0.75rem;
          background: #dbeafe;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          display: flex;
          gap: 0.625rem;
          align-items: flex-start;
        }

        .preview-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .preview-content {
          flex: 1;
        }

        .preview-content p {
          margin: 0 0 0.25rem 0;
          font-size: 0.75rem;
          color: #1e40af;
          font-weight: 500;
        }

        .preview-content strong {
          font-size: 0.875rem;
          font-weight: 700;
        }

        .preview-content small {
          font-size: 0.625rem;
          color: #1e40af;
          line-height: 1.4;
        }

        /* ==================== RESPONSIVE: DESKTOP (1920px+) ==================== */
        @media (min-width: 1920px) {
          .payments-header {
            padding: 2.5rem;
          }

          .payments-title {
            font-size: 2rem;
          }

          .payments-subtitle {
            font-size: 1.125rem;
          }

          .close-btn {
            width: 42px;
            height: 42px;
            font-size: 1.5rem;
          }

          .payments-summary {
            padding: 2.5rem;
            gap: 2rem;
          }

          .summary-card {
            padding: 2rem;
          }

          .summary-icon {
            width: 72px;
            height: 72px;
            font-size: 2.25rem;
          }

          .summary-value {
            font-size: 2.25rem;
          }

          .summary-label {
            font-size: 1rem;
          }

          .btn-add-payment {
            padding: 1.25rem 2rem;
            font-size: 1.125rem;
            gap: 1rem;
          }

          .payments-list {
            padding: 0 2.5rem 2.5rem;
          }

          .info-message {
            margin: 2.5rem;
            padding: 3rem;
            border-radius: 24px;
          }

          .info-icon {
            font-size: 6rem;
            margin-bottom: 2rem;
          }

          .info-content h3 {
            font-size: 2rem;
            margin-bottom: 1.5rem;
          }

          .info-content p {
            font-size: 1.25rem;
            margin-bottom: 2.5rem;
            max-width: 700px;
          }

          .btn-set-fee {
            padding: 1.25rem 3rem;
            font-size: 1.25rem;
            border-radius: 16px;
          }
        }

        /* ==================== RESPONSIVE: DESKTOP (1025px+) ==================== */
        @media (min-width: 1025px) {
          /* Show Desktop Table View Only */
          .desktop-view {
            display: table !important;
          }

          .mobile-view {
            display: none !important;
          }

          .payments-modal {
            max-width: 900px;
            width: 85%;
          }

          .payments-header {
            padding: 1.5rem 1.75rem;
          }

          .payments-title {
            font-size: 1.375rem;
          }

          .payments-subtitle {
            font-size: 0.8125rem;
          }

          .close-btn {
            width: 32px;
            height: 32px;
            font-size: 1rem;
          }

          .tabs-container {
            padding: 0 1.75rem;
          }

          .tab-btn {
            padding: 0.875rem 1.25rem;
            font-size: 0.9375rem;
          }

          .payments-summary,
          .debts-summary {
            padding: 1.5rem 1.75rem;
            gap: 1.25rem;
          }

          .summary-card {
            padding: 1rem 1.25rem;
          }

          .summary-icon {
            width: 44px;
            height: 44px;
            font-size: 1.375rem;
          }

          .summary-value {
            font-size: 1.375rem;
          }

          .summary-label {
            font-size: 0.75rem;
          }

          .btn-add-payment {
            padding: 0.75rem 1.125rem;
            font-size: 0.875rem;
            gap: 0.5rem;
          }

          .payments-actions {
            padding: 0 1.75rem 1.25rem;
          }

          .payments-list,
          .debts-list {
            padding: 0 1.75rem 1.5rem;
          }

          .payments-table th {
            padding: 0.5rem 0.625rem;
            font-size: 0.625rem;
          }

          .payments-table td {
            padding: 0.5rem 0.625rem;
            font-size: 0.75rem;
            line-height: 1.3;
          }

          .payment-month {
            font-size: 0.75rem;
          }

          .payment-amount {
            font-size: 0.8125rem;
          }

          .payment-type-badge {
            padding: 0.1875rem 0.5rem;
            font-size: 0.625rem;
          }

          .payment-date {
            font-size: 0.6875rem;
          }

          .payment-description {
            font-size: 0.75rem;
            max-width: 120px;
          }

          .view-receipt-btn,
          .delete-payment-btn {
            width: 26px;
            height: 26px;
            font-size: 0.8125rem;
          }

          .debt-month-card {
            padding: 1.125rem;
          }

          .debt-month-name {
            font-size: 0.9375rem;
          }

          .debt-amount {
            font-size: 1.125rem;
          }

          .btn-pay-debt {
            padding: 0.75rem 1.125rem;
            font-size: 0.875rem;
          }

          .info-message {
            margin: 1.25rem 1.75rem;
            padding: 1.125rem;
            border-radius: 12px;
          }

          .info-icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }

          .info-content h3 {
            font-size: 0.9375rem;
            margin-bottom: 0.5rem;
          }

          .info-content p {
            font-size: 0.75rem;
            margin-bottom: 0.875rem;
            max-width: 380px;
            line-height: 1.4;
          }

          .btn-set-fee {
            padding: 0.5rem 1rem;
            font-size: 0.75rem;
            border-radius: 8px;
          }

          .add-payment-modal,
          .set-fee-modal,
          .delete-modal {
            max-width: 520px;
          }

          .add-payment-header,
          .set-fee-header {
            padding: 1.25rem 1.5rem;
          }

          .add-payment-header h3,
          .set-fee-header h3 {
            font-size: 1.125rem;
          }

          .payment-form,
          .fee-form {
            padding: 1.5rem;
          }

          .form-group label {
            font-size: 0.8125rem;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            padding: 0.625rem 0.875rem;
            font-size: 0.875rem;
          }

          .payment-calculation {
            padding: 1rem;
            margin-bottom: 1.25rem;
          }

          .calc-row {
            font-size: 0.875rem;
            padding: 0.375rem 0;
          }

          .calc-row.total-row {
            font-size: 1rem;
            padding-top: 0.75rem;
          }

          .total-amount {
            font-size: 1.25rem;
          }

          .btn-cancel,
          .btn-submit {
            padding: 0.75rem 1.125rem;
            font-size: 0.875rem;
          }
        }

        /* ==================== RESPONSIVE: LAPTOP (769px - 1024px) ==================== */
        @media (min-width: 769px) and (max-width: 1024px) {
          /* Show Desktop Table View Only */
          .desktop-view {
            display: table !important;
          }

          .mobile-view {
            display: none !important;
          }

          .payments-modal {
            max-width: 750px;
            width: 90%;
          }

          .payments-header {
            padding: 1.25rem 1.5rem;
          }

          .payments-title {
            font-size: 1.25rem;
          }

          .payments-subtitle {
            font-size: 0.75rem;
          }

          .close-btn {
            width: 28px;
            height: 28px;
            font-size: 0.9375rem;
          }

          .tabs-container {
            padding: 0 1.5rem;
          }

          .tab-btn {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
          }

          .payments-summary,
          .debts-summary {
            padding: 1.25rem 1.5rem;
            gap: 1rem;
          }

          .summary-card {
            padding: 0.875rem 1rem;
          }

          .summary-icon {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
          }

          .summary-value {
            font-size: 1.25rem;
          }

          .summary-label {
            font-size: 0.6875rem;
          }

          .btn-add-payment {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
            gap: 0.5rem;
          }

          .payments-actions {
            padding: 0 1.5rem 1rem;
          }

          .payments-list,
          .debts-list {
            padding: 0 1.5rem 1.25rem;
          }

          .payments-table th {
            padding: 0.5rem 0.625rem;
            font-size: 0.625rem;
          }

          .payments-table td {
            padding: 0.5rem 0.625rem;
            font-size: 0.6875rem;
            line-height: 1.3;
          }

          .payment-month {
            font-size: 0.6875rem;
          }

          .payment-amount {
            font-size: 0.75rem;
          }

          .payment-type-badge {
            padding: 0.1875rem 0.4375rem;
            font-size: 0.5625rem;
          }

          .payment-date {
            font-size: 0.625rem;
          }

          .payment-description {
            font-size: 0.6875rem;
            max-width: 100px;
          }

          .view-receipt-btn,
          .delete-payment-btn {
            width: 24px;
            height: 24px;
            font-size: 0.75rem;
          }

          .debt-month-card {
            padding: 1rem;
          }

          .debt-month-name {
            font-size: 0.875rem;
          }

          .debt-amount {
            font-size: 1rem;
          }

          .progress-bar {
            height: 10px;
          }

          .progress-text {
            font-size: 0.75rem;
          }

          .debt-details {
            font-size: 0.75rem;
          }

          .btn-pay-debt {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .info-message {
            margin: 1.125rem 1.5rem;
            padding: 1rem;
            border-radius: 10px;
          }

          .info-icon {
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
          }

          .info-content h3 {
            font-size: 0.875rem;
            margin-bottom: 0.375rem;
          }

          .info-content p {
            font-size: 0.6875rem;
            margin-bottom: 0.75rem;
            max-width: 350px;
            line-height: 1.35;
          }

          .btn-set-fee {
            padding: 0.5rem 0.875rem;
            font-size: 0.6875rem;
            border-radius: 8px;
          }

          .add-payment-modal,
          .set-fee-modal,
          .delete-modal {
            max-width: 480px;
          }

          .add-payment-header,
          .set-fee-header {
            padding: 1.125rem 1.25rem;
          }

          .add-payment-header h3,
          .set-fee-header h3 {
            font-size: 1rem;
          }

          .payment-form,
          .fee-form {
            padding: 1.25rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 0.875rem;
            margin-bottom: 1rem;
          }

          .form-group label {
            font-size: 0.75rem;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
          }

          .payment-calculation {
            padding: 0.875rem;
            margin-bottom: 1rem;
          }

          .calc-row {
            font-size: 0.8125rem;
            padding: 0.375rem 0;
          }

          .calc-row.total-row {
            font-size: 0.9375rem;
            padding-top: 0.625rem;
          }

          .total-amount {
            font-size: 1.125rem;
          }

          .field-hint {
            font-size: 0.6875rem;
          }

          .btn-cancel,
          .btn-submit {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .fee-icon {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
          }

          .student-name-subtitle {
            font-size: 0.75rem;
          }

          .fee-preview {
            padding: 1rem;
            margin-top: 1.25rem;
          }

          .preview-icon {
            font-size: 1.25rem;
          }

          .preview-content p {
            font-size: 0.875rem;
          }

          .preview-content strong {
            font-size: 1rem;
          }

          .preview-content small {
            font-size: 0.75rem;
          }

          .delete-modal-header {
            padding: 1.5rem 1.5rem 0.875rem;
          }

          .delete-icon {
            font-size: 3rem;
            margin-bottom: 0.75rem;
          }

          .delete-modal-header h3 {
            font-size: 1.25rem;
          }

          .delete-modal-body {
            padding: 0 1.5rem 1.5rem;
          }

          .delete-message {
            font-size: 1rem;
            margin-bottom: 1.25rem;
          }

          .delete-payment-info {
            padding: 0.875rem 1rem;
            margin-bottom: 1.25rem;
          }

          .delete-info-row {
            padding: 0.375rem 0;
            font-size: 0.875rem;
          }

          .delete-warning {
            font-size: 0.875rem;
            padding: 0.625rem;
          }

          .delete-modal-actions {
            padding: 1.25rem 1.5rem 1.5rem;
          }

          .btn-cancel-delete,
          .btn-confirm-delete {
            padding: 0.75rem 1.25rem;
            font-size: 0.9375rem;
          }
        }

        /* ==================== RESPONSIVE: TABLET (481px - 768px) ==================== */
        @media (min-width: 481px) and (max-width: 768px) {
          /* Toggle Desktop/Mobile Views */
          .desktop-view {
            display: none !important;
          }

          .mobile-view {
            display: flex !important;
          }

          .payments-modal {
            max-width: 680px;
            width: 92%;
          }

          .payments-header {
            padding: 1.125rem 1.25rem;
          }

          .payments-title {
            font-size: 1.125rem;
          }

          .payments-subtitle {
            font-size: 0.6875rem;
          }

          .close-btn {
            width: 28px;
            height: 28px;
            font-size: 0.9375rem;
          }

          .tabs-container {
            padding: 0 1.25rem;
          }

          .tab-btn {
            padding: 0.75rem 0.875rem;
            font-size: 0.8125rem;
            gap: 0.375rem;
          }

          .debt-badge {
            padding: 0.1875rem 0.5rem;
            font-size: 0.6875rem;
          }

          .payments-summary,
          .debts-summary {
            grid-template-columns: 1fr;
            padding: 1.125rem 1.25rem;
            gap: 0.875rem;
          }

          .summary-card {
            padding: 0.875rem 1rem;
            gap: 1rem;
          }

          .summary-icon {
            width: 42px;
            height: 42px;
            font-size: 1.25rem;
          }

          .summary-value {
            font-size: 1.25rem;
          }

          .summary-label {
            font-size: 0.6875rem;
          }

          .payments-actions {
            padding: 0 1.25rem 1.125rem;
          }

          .btn-add-payment {
            padding: 0.75rem 1rem;
            font-size: 0.8125rem;
            gap: 0.5rem;
          }

          .payments-list,
          .debts-list {
            padding: 0 1.25rem 1.25rem;
          }

          .loading-state,
          .empty-state {
            padding: 2rem 1rem;
          }

          .empty-state h3 {
            font-size: 1.125rem;
          }

          .empty-state p {
            font-size: 0.8125rem;
          }

          /* Payment Cards */
          .payments-cards {
            gap: 0.875rem;
          }

          .payment-card {
            border-radius: 14px;
          }

          .payment-card-header {
            padding: 0.875rem 1rem;
          }

          .month-icon {
            font-size: 1.125rem;
          }

          .month-text {
            font-size: 0.875rem;
          }

          .payment-type-badge {
            padding: 0.25rem 0.625rem;
            font-size: 0.6875rem;
          }

          .payment-card-body {
            padding: 1rem;
          }

          .payment-card-row {
            padding: 0.5rem 0;
            font-size: 0.875rem;
          }

          .payment-card-row .label {
            font-size: 0.8125rem;
          }

          .payment-card-row.main-amount {
            padding: 0.75rem 0.875rem;
            margin-bottom: 0.625rem;
          }

          .payment-card-row.main-amount .value {
            font-size: 1.0625rem;
          }

          .payment-card-divider {
            margin: 0.625rem 0;
          }

          .payment-card-description {
            margin-top: 0.75rem;
            padding: 0.75rem;
          }

          .payment-card-description .desc-label {
            font-size: 0.6875rem;
            margin-bottom: 0.25rem;
          }

          .payment-card-description .desc-text {
            font-size: 0.8125rem;
          }

          .deleted-badge-card {
            margin-top: 0.75rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
          }

          .payment-card-actions {
            padding: 0.875rem 1rem;
            gap: 0.625rem;
          }

          .card-action-btn {
            padding: 0.625rem 0.875rem;
            font-size: 0.8125rem;
            gap: 0.375rem;
            border-radius: 8px;
          }

          /* Debt Section */
          .debt-section {
            margin-bottom: 1.5rem;
          }

          .debt-section-title {
            font-size: 0.9375rem;
            margin-bottom: 0.875rem;
            padding-bottom: 0.375rem;
          }

          .debt-month-card {
            padding: 1rem;
            border-radius: 14px;
            margin-bottom: 0.875rem;
          }

          .debt-month-name {
            font-size: 0.875rem;
          }

          .debt-amount {
            font-size: 1.0625rem;
          }

          .progress-bar {
            height: 10px;
            margin-bottom: 0.375rem;
          }

          .progress-text {
            font-size: 0.75rem;
          }

          .debt-details {
            font-size: 0.75rem;
            gap: 0.375rem;
            margin-bottom: 0.875rem;
          }

          .btn-pay-debt {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          /* Info Message */
          .info-message {
            margin: 1.25rem;
            padding: 1.25rem;
            border-radius: 12px;
          }

          .info-icon {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
          }

          .info-content h3 {
            font-size: 1rem;
            margin-bottom: 0.625rem;
          }

          .info-content p {
            font-size: 0.8125rem;
            margin-bottom: 1.125rem;
            max-width: 420px;
            line-height: 1.45;
          }

          .btn-set-fee {
            padding: 0.625rem 1.25rem;
            font-size: 0.8125rem;
            border-radius: 10px;
          }

          /* Modals */
          .add-payment-modal,
          .set-fee-modal,
          .delete-modal {
            max-width: 480px;
            width: 92%;
          }

          .add-payment-header,
          .set-fee-header {
            padding: 1.125rem 1.25rem;
          }

          .add-payment-header h3,
          .set-fee-header h3 {
            font-size: 1rem;
          }

          .payment-form,
          .fee-form {
            padding: 1.25rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 0.875rem;
            margin-bottom: 1rem;
          }

          .form-group label {
            font-size: 0.75rem;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
          }

          .form-group textarea {
            min-height: 70px;
          }

          .payment-calculation {
            padding: 0.875rem;
            margin-bottom: 1.125rem;
          }

          .calc-row {
            font-size: 0.8125rem;
            padding: 0.375rem 0;
          }

          .calc-row.total-row {
            font-size: 0.9375rem;
            padding-top: 0.625rem;
            margin-top: 0.375rem;
          }

          .total-amount {
            font-size: 1.125rem;
          }

          .field-hint {
            font-size: 0.6875rem;
            margin-top: 0.25rem;
          }

          .btn-cancel,
          .btn-submit {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .form-actions {
            gap: 0.875rem;
            margin-top: 1.5rem;
          }

          /* Set Fee Modal */
          .fee-icon {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
          }

          .student-name-subtitle {
            font-size: 0.75rem;
          }

          .fee-preview {
            padding: 1rem;
            margin-top: 1.125rem;
            gap: 0.875rem;
          }

          .preview-icon {
            font-size: 1.25rem;
          }

          .preview-content p {
            font-size: 0.875rem;
            margin-bottom: 0.375rem;
          }

          .preview-content strong {
            font-size: 1rem;
          }

          .preview-content small {
            font-size: 0.75rem;
          }

          /* Delete Modal */
          .delete-modal-header {
            padding: 1.5rem 1.5rem 0.875rem;
          }

          .delete-icon {
            font-size: 3rem;
            margin-bottom: 0.75rem;
          }

          .delete-modal-header h3 {
            font-size: 1.25rem;
          }

          .delete-modal-body {
            padding: 0 1.5rem 1.5rem;
          }

          .delete-message {
            font-size: 0.9375rem;
            margin-bottom: 1.125rem;
          }

          .delete-payment-info {
            padding: 0.875rem 1rem;
            margin-bottom: 1.125rem;
          }

          .delete-info-row {
            padding: 0.375rem 0;
            font-size: 0.8125rem;
          }

          .delete-warning {
            font-size: 0.8125rem;
            padding: 0.625rem;
          }

          .delete-modal-actions {
            padding: 1.25rem 1.5rem 1.5rem;
            gap: 0.875rem;
          }

          .btn-cancel-delete,
          .btn-confirm-delete {
            padding: 0.75rem 1.125rem;
            font-size: 0.875rem;
          }
        }

        /* ==================== RESPONSIVE: MOBILE (max 480px) ==================== */
        @media (max-width: 480px) {
          /* Toggle Desktop/Mobile Views */
          .desktop-view {
            display: none !important;
          }

          .mobile-view {
            display: flex !important;
          }

          .payments-modal {
            max-width: 460px;
            width: 94%;
            max-height: 92vh;
            border-radius: 14px;
          }

          .payments-header {
            padding: 1rem 1.125rem;
          }

          .payments-title {
            font-size: 1rem;
          }

          .payments-subtitle {
            font-size: 0.625rem;
          }

          .close-btn {
            width: 26px;
            height: 26px;
            font-size: 0.875rem;
          }

          .tabs-container {
            padding: 0 1.125rem;
          }

          .tab-btn {
            padding: 0.625rem 0.75rem;
            font-size: 0.75rem;
            gap: 0.375rem;
          }

          .debt-badge {
            padding: 0.1875rem 0.4375rem;
            font-size: 0.625rem;
            min-width: 18px;
            height: 16px;
          }

          .error-banner {
            margin: 0.875rem 1.125rem 0;
            padding: 0.75rem 0.875rem;
            border-radius: 10px;
          }

          .error-icon {
            font-size: 1rem;
          }

          .error-text {
            font-size: 0.75rem;
          }

          .payments-summary,
          .debts-summary {
            grid-template-columns: 1fr;
            padding: 1rem 1.125rem;
            gap: 0.75rem;
          }

          .summary-card {
            padding: 0.75rem 0.875rem;
            gap: 0.875rem;
            border-radius: 12px;
          }

          .summary-icon {
            width: 36px;
            height: 36px;
            font-size: 1.125rem;
            border-radius: 10px;
          }

          .summary-value {
            font-size: 1.125rem;
            margin-bottom: 0.25rem;
          }

          .summary-label {
            font-size: 0.625rem;
          }

          .payments-actions {
            padding: 0 1.125rem 1rem;
          }

          .btn-add-payment {
            padding: 0.625rem 0.875rem;
            font-size: 0.75rem;
            gap: 0.375rem;
            border-radius: 10px;
          }

          .btn-add-payment span:first-child {
            font-size: 0.9375rem;
          }

          .payments-list,
          .debts-list {
            padding: 0 1.125rem 1.125rem;
          }

          .loading-state {
            padding: 1.75rem 1rem;
            font-size: 0.875rem;
          }

          .empty-state {
            padding: 1.75rem 1rem;
          }

          .empty-state h3 {
            font-size: 1.125rem;
          }

          .empty-state p {
            font-size: 0.8125rem;
          }

          /* Mobile Payment Cards */
          .payments-cards {
            gap: 0.75rem;
          }

          .payment-card {
            border-radius: 12px;
            border-width: 1.5px;
          }

          .payment-card-header {
            padding: 0.75rem 0.875rem;
            border-bottom-width: 1.5px;
          }

          .month-icon {
            font-size: 1rem;
          }

          .month-text {
            font-size: 0.75rem;
          }

          .payment-type-badge {
            padding: 0.1875rem 0.5rem;
            font-size: 0.625rem;
            border-radius: 6px;
          }

          .payment-card-body {
            padding: 0.875rem;
          }

          .payment-card-row {
            padding: 0.4375rem 0;
            font-size: 0.75rem;
          }

          .payment-card-row .label {
            font-size: 0.6875rem;
          }

          .payment-card-row .value {
            font-size: 0.8125rem;
          }

          .payment-card-row.main-amount {
            padding: 0.625rem 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
          }

          .payment-card-row.main-amount .label {
            font-size: 0.6875rem;
          }

          .payment-card-row.main-amount .value {
            font-size: 1rem;
          }

          .payment-card-row .value.date {
            font-size: 0.75rem;
          }

          .payment-card-divider {
            margin: 0.5rem 0;
          }

          .payment-card-description {
            margin-top: 0.625rem;
            padding: 0.625rem;
            border-radius: 6px;
            border-left-width: 2px;
          }

          .payment-card-description .desc-label {
            font-size: 0.625rem;
            margin-bottom: 0.25rem;
          }

          .payment-card-description .desc-text {
            font-size: 0.75rem;
          }

          .deleted-badge-card {
            margin-top: 0.625rem;
            padding: 0.4375rem 0.625rem;
            font-size: 0.75rem;
            border-radius: 6px;
            border-width: 1.5px;
          }

          .payment-card-actions {
            padding: 0.75rem 0.875rem;
            gap: 0.5rem;
          }

          .card-action-btn {
            padding: 0.5rem 0.625rem;
            font-size: 0.6875rem;
            gap: 0.25rem;
            border-radius: 8px;
            border-width: 1.5px;
          }

          /* Debt Section */
          .debt-section {
            margin-bottom: 1.25rem;
          }

          .debt-section-title {
            font-size: 0.875rem;
            margin-bottom: 0.75rem;
            padding-bottom: 0.375rem;
            border-bottom-width: 1.5px;
          }

          .debt-month-card {
            padding: 0.875rem;
            border-radius: 12px;
            border-width: 1.5px;
            margin-bottom: 0.75rem;
          }

          .debt-month-name {
            font-size: 0.75rem;
          }

          .debt-amount {
            font-size: 0.9375rem;
          }

          .progress-bar {
            height: 8px;
            border-radius: 4px;
            margin-bottom: 0.375rem;
          }

          .progress-fill {
            border-radius: 4px;
          }

          .progress-text {
            font-size: 0.6875rem;
          }

          .debt-details {
            font-size: 0.6875rem;
            gap: 0.375rem;
            margin-bottom: 0.75rem;
          }

          .btn-pay-debt {
            padding: 0.5rem 0.875rem;
            font-size: 0.75rem;
            border-radius: 10px;
          }

          /* Info Message */
          .info-message {
            margin: 1rem 1.125rem;
            padding: 1.125rem;
            border-radius: 12px;
            border-width: 2px;
          }

          .info-icon {
            font-size: 2.25rem;
            margin-bottom: 0.625rem;
          }

          .info-content h3 {
            font-size: 0.9375rem;
            margin-bottom: 0.5rem;
          }

          .info-content p {
            font-size: 0.75rem;
            margin-bottom: 1rem;
            line-height: 1.5;
          }

          .btn-set-fee {
            width: 100%;
            padding: 0.5rem 1.125rem;
            font-size: 0.75rem;
            border-radius: 8px;
          }

          /* Add Payment Modal */
          .add-payment-modal,
          .set-fee-modal,
          .delete-modal {
            max-width: 440px;
            width: 94%;
            border-radius: 14px;
          }

          .add-payment-header,
          .set-fee-header {
            padding: 1rem 1.125rem;
            border-bottom-width: 1.5px;
          }

          .add-payment-header h3,
          .set-fee-header h3 {
            font-size: 0.9375rem;
          }

          .add-payment-header .close-btn,
          .set-fee-header .close-btn {
            width: 26px;
            height: 26px;
            font-size: 0.875rem;
          }

          .payment-form,
          .fee-form {
            padding: 1.125rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 0.875rem;
            margin-bottom: 0.875rem;
          }

          .form-group {
            gap: 0.375rem;
          }

          .form-group label {
            font-size: 0.6875rem;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            border-radius: 8px;
            border-width: 1.5px;
          }

          .form-group textarea {
            min-height: 64px;
          }

          .payment-calculation {
            padding: 0.875rem;
            margin-bottom: 1rem;
            border-radius: 10px;
            border-width: 1.5px;
          }

          .calc-row {
            font-size: 0.75rem;
            padding: 0.3125rem 0;
          }

          .calc-row.total-row {
            font-size: 0.875rem;
            padding-top: 0.5rem;
            margin-top: 0.375rem;
            border-top-width: 1.5px;
          }

          .total-amount {
            font-size: 1.125rem;
          }

          .field-hint {
            font-size: 0.625rem;
            margin-top: 0.25rem;
          }

          .form-actions {
            flex-direction: column-reverse;
            gap: 0.75rem;
            margin-top: 1.25rem;
          }

          .btn-cancel,
          .btn-submit {
            width: 100%;
            padding: 0.625rem 0.875rem;
            font-size: 0.75rem;
            border-radius: 8px;
          }

          .btn-cancel {
            border-width: 1.5px;
          }

          /* Set Fee Modal */
          .fee-icon {
            width: 36px;
            height: 36px;
            font-size: 1.125rem;
            border-radius: 10px;
          }

          .student-name-subtitle {
            font-size: 0.625rem;
          }

          .fee-preview {
            padding: 0.875rem;
            margin-top: 1rem;
            gap: 0.75rem;
            border-radius: 10px;
            border-width: 1.5px;
          }

          .preview-icon {
            font-size: 1.125rem;
          }

          .preview-content p {
            font-size: 0.75rem;
            margin-bottom: 0.25rem;
          }

          .preview-content strong {
            font-size: 0.875rem;
          }

          .preview-content small {
            font-size: 0.6875rem;
          }

          /* Delete Modal */
          .delete-modal-header {
            padding: 1.25rem 1.25rem 0.75rem;
          }

          .delete-icon {
            font-size: 2.5rem;
            margin-bottom: 0.625rem;
          }

          .delete-modal-header h3 {
            font-size: 1.125rem;
          }

          .delete-modal-body {
            padding: 0 1.25rem 1.25rem;
          }

          .delete-message {
            font-size: 0.875rem;
            margin-bottom: 1rem;
          }

          .delete-payment-info {
            padding: 0.75rem 0.875rem;
            margin-bottom: 1rem;
            border-radius: 10px;
            border-width: 1.5px;
          }

          .delete-info-row {
            padding: 0.3125rem 0;
            font-size: 0.75rem;
            border-bottom-style: dotted;
            border-bottom-width: 1px;
          }

          .delete-warning {
            font-size: 0.75rem;
            padding: 0.5rem;
            border-radius: 6px;
          }

          .delete-modal-actions {
            padding: 1.125rem 1.25rem 1.25rem;
            gap: 0.75rem;
          }

          .btn-cancel-delete,
          .btn-confirm-delete {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
            border-radius: 10px;
          }

          .btn-cancel-delete {
            border-width: 1.5px;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentPayments;
