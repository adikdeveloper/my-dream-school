import React, { useState, useEffect, useMemo } from 'react';
import apiService from '../../services/apiService';
import PaymentReceipt from './PaymentReceipt';
import LoadingOverlay from '../common/LoadingOverlay';

const PaymentManagement = ({ initialTab }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState(initialTab || 'students'); // 'students', 'teachers', 'other'

  // Update active tab when prop changes (for navigation)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      // Also reset any filters or search when switching pages
      setSearchTerm('');
      setPaymentTypeFilter('');
    }
  }, [initialTab]);

  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'deleted'
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // Edit payment state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    discount: '',
    paymentType: 'cash',
    paymentMonth: '',
    paymentDate: '',
    notes: ''
  });

  // Teacher payments state
  const [teacherPayments, setTeacherPayments] = useState([]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherSalaryInfo, setTeacherSalaryInfo] = useState(null);
  const [teacherSalaryLoading, setTeacherSalaryLoading] = useState(false);
  const [applyVAT, setApplyVAT] = useState(false);
  const [teacherFormData, setTeacherFormData] = useState({
    teacherId: '',
    amount: '',
    paymentType: 'cash',
    paymentMonth: getCurrentMonth(),
    description: '',
    notes: ''
  });

  // Other transactions state
  const [otherTransactions, setOtherTransactions] = useState([]);
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherFormData, setOtherFormData] = useState({
    type: 'income', // 'income' or 'expense'
    category: '',
    amount: '',
    paymentType: 'cash',
    description: '',
    notes: ''
  });

  // Category detail modal state
  const [showCategoryDetailModal, setShowCategoryDetailModal] = useState(false);
  const [selectedCategoryForDetails, setSelectedCategoryForDetails] = useState(null);

  // Category page view state (new feature)
  const [selectedCategoryPage, setSelectedCategoryPage] = useState(null);
  const [categoryFilterYear, setCategoryFilterYear] = useState(new Date().getFullYear());
  const [categoryFilterMonth, setCategoryFilterMonth] = useState('all');

  // Delete with comment state (new feature)
  const [deleteComment, setDeleteComment] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [showDeleteTransactionModal, setShowDeleteTransactionModal] = useState(false);

  // Custom transaction date (new feature)
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  // Missing state declarations
  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [selectedClassForPayment, setSelectedClassForPayment] = useState('');


  // Categories list
  const categories = [
    { id: 'oziq-ovqat', name: "O'ziq ovqat", icon: '🍽️', color: '#f97316' },
    { id: 'tozalash', name: 'Tozalash vositasi', icon: '🧹', color: '#06b6d4' },
    { id: 'tamirlash', name: "Ta'mirlash", icon: '🔧', color: '#8b5cf6' },
    { id: 'konstovar', name: 'Konstovarlar', icon: '📎', color: '#ec4899' },
    { id: 'ijara', name: 'Ijara', icon: '🏠', color: '#d97706' },
    { id: 'elektr', name: 'Elektr', icon: '⚡', color: '#eab308' },
    { id: 'gaz', name: 'Gaz', icon: '🔥', color: '#ef4444' },
    { id: 'ijtimoiy-soliq', name: 'Ijtimoiy soliq', icon: '📋', color: '#6366f1' },
    { id: 'ish-haqi', name: 'Ish haqi', icon: '💰', color: '#22c55e' },
    { id: 'avtobus', name: 'Avtobus', icon: '🚌', color: '#3b82f6' },
    { id: 'kredit', name: 'Kredit', icon: '🏦', color: '#7c3aed' },
    { id: 'qaytarish', name: 'Qaytarish', icon: '↩️', color: '#14b8a6' },
    { id: 'material', name: 'Material', icon: '📦', color: '#a855f7' },
    { id: 'target', name: 'Target ijtimoiy tarmoq', icon: '📱', color: '#f43f5e' },
    { id: 'inventar', name: 'Inventar', icon: '🗄️', color: '#0ea5e9' },
    { id: 'suv', name: 'Suv', icon: '💧', color: '#0284c7' },
    { id: 'saida-opa', name: 'Saida opa shaxsiy', icon: '👩', color: '#d946ef' },
    { id: 'inkassa', name: 'Inkassa', icon: '💼', color: '#64748b' },
    { id: 'boshqalar', name: 'Boshqalar', icon: '📝', color: '#78716c' }
  ];

  const [formData, setFormData] = useState({
    studentId: '',
    studentSearchQuery: '',
    amount: '',
    discount: '',
    paymentType: 'cash',
    paymentMonth: getCurrentMonth(),
    paymentDate: new Date().toISOString().split('T')[0],
    description: '',
    receiptNumber: '',
    transactionId: '',
    notes: ''
  });

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  useEffect(() => {
    fetchPayments();
    fetchStudents();
    fetchTeachers();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeachers = async () => {
    try {
      const data = await apiService.getUsers('teacher', 1, 1000);
      setTeachers(data.users || []);
    } catch (err) {
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPayments({});
      setPayments(data);
      setError('');
    } catch (err) {
      setError('To\'lovlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await apiService.getUsers('student', 1, 1000);
      setStudents(data.users || []);
    } catch (err) {
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await apiService.getClasses();
      // API returns { classes: [], pagination: {} }
      setClasses(data.classes || []);
    } catch (err) {
    }
  };

  // Fetch teacher salary info for auto-calculation
  const fetchTeacherSalary = async (teacherId, monthStr) => {
    if (!teacherId || !monthStr) return;
    setTeacherSalaryLoading(true);
    try {
      const [year, month] = monthStr.split('-');
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/salary/monthly/${year}/${parseInt(month)}?teacherId=${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeacherSalaryInfo(data);
        // Auto-fill amount
        const finalAmount = applyVAT ? Math.round(data.netSalary * 0.88) : data.netSalary;
        setTeacherFormData(prev => ({ ...prev, amount: finalAmount.toString() }));
      }
    } catch (err) {
      console.error('Failed to fetch teacher salary:', err);
    } finally {
      setTeacherSalaryLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If student is selected, auto-fill the amount from their monthly fee
    if (name === 'studentId' && value) {
      const student = students.find(s => s._id === value);
      if (student && student.monthlyFee) {
        setFormData(prev => ({ ...prev, amount: student.monthlyFee }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await apiService.createPayment(formData);

      // Reset form
      setFormData({
        studentId: '',
        studentSearchQuery: '',
        amount: '',
        discount: '',
        paymentType: 'cash',
        paymentMonth: getCurrentMonth(),
        paymentDate: new Date().toISOString().split('T')[0],
        description: '',
        receiptNumber: '',
        transactionId: '',
        notes: ''
      });
      setShowModal(false);

      // Auto-show receipt
      if (result && result.payment) {
        setSelectedPayment(result.payment);
        setShowReceipt(true);
      }

      // Refresh data in background
      fetchPayments();
    } catch (err) {
      alert('To\'lov qo\'shishda xatolik: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = (payment) => {
    setPaymentToDelete(payment);
    setShowDeleteModal(true);
  };

  // Edit payment handlers
  const openEditModal = (payment) => {
    setEditPayment(payment);
    setEditFormData({
      amount: payment.amount || '',
      discount: payment.discount || '',
      paymentType: payment.paymentType || 'cash',
      paymentMonth: payment.paymentMonth || '',
      paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
      notes: payment.notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.updatePayment(editPayment._id, {
        amount: parseFloat(editFormData.amount),
        discount: parseFloat(editFormData.discount) || 0,
        paymentType: editFormData.paymentType,
        paymentMonth: editFormData.paymentMonth,
        paymentDate: editFormData.paymentDate,
        notes: editFormData.notes
      });
      setShowEditModal(false);
      setEditPayment(null);
      alert('To\'lov muvaffaqiyatli tahrirlandi!');
      fetchPayments();
    } catch (err) {
      alert('Tahrirlashda xatolik: ' + (err.response?.data?.message || err.message));
    }
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;

    try {
      await apiService.deletePayment(paymentToDelete._id);
      setShowDeleteModal(false);
      setPaymentToDelete(null);

      // Hard refresh to show fresh data
      window.location.reload();
    } catch (err) {
      setError('To\'lovni o\'chirishda xatolik: ' + (err.response?.data?.message || err.message));
      setShowDeleteModal(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPaymentToDelete(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  const getPaymentTypeLabel = (type) => {
    const labels = {
      cash: 'Naqd',
      card: 'Karta',
      bank_transfer: 'Bank o\'tkazmasi'
    };
    return labels[type] || type;
  };

  const handlePrintReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceipt(true);
  };

  // Get category statistics with monthly comparison
  const getCategoryStats = (categoryName) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const categoryTransactions = otherTransactions.filter(t => t.category === categoryName);

    // Current month transactions
    const currentMonthTransactions = categoryTransactions.filter(t => {
      const date = new Date(t.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Last month transactions
    const lastMonthTransactions = categoryTransactions.filter(t => {
      const date = new Date(t.createdAt);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    // Calculate sums
    const currentIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const currentExpense = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const lastIncome = lastMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const lastExpense = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Calculate percentage change
    const lastTotal = lastIncome + lastExpense;
    const currentTotal = currentIncome + currentExpense;
    let percentChange = 0;
    if (lastTotal > 0) {
      percentChange = ((currentTotal - lastTotal) / lastTotal * 100).toFixed(1);
    }

    return {
      currentMonth: {
        income: currentIncome,
        expense: currentExpense,
        total: currentTotal,
        count: currentMonthTransactions.length
      },
      lastMonth: {
        income: lastIncome,
        expense: lastExpense,
        total: lastTotal,
        count: lastMonthTransactions.length
      },
      percentChange: parseFloat(percentChange),
      allTransactions: categoryTransactions,
      totalIncome: categoryTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      totalExpense: categoryTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    };
  };



  // Get month name in Uzbek
  const getMonthName = (monthIndex) => {
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    return months[monthIndex];
  };

  // Open category page (new feature)
  const openCategoryPage = (category) => {
    setSelectedCategoryPage(category);
    setCategoryFilterYear(new Date().getFullYear());
    setCategoryFilterMonth('all');
  };

  // Get filtered transactions for category page
  const getFilteredCategoryTransactions = () => {
    if (!selectedCategoryPage) return [];

    return otherTransactions.filter(t => {
      if (t.category !== selectedCategoryPage.name) return false;

      const date = new Date(t.createdAt);
      if (date.getFullYear() !== categoryFilterYear) return false;
      if (categoryFilterMonth !== 'all' && date.getMonth() !== parseInt(categoryFilterMonth)) return false;

      return true;
    });
  };

  // Get yearly stats for category (for charts)
  const getCategoryYearlyStats = () => {
    if (!selectedCategoryPage) return [];

    const monthlyStats = [];
    for (let month = 0; month < 12; month++) {
      const monthTransactions = otherTransactions.filter(t => {
        if (t.category !== selectedCategoryPage.name) return false;
        const date = new Date(t.createdAt);
        return date.getFullYear() === categoryFilterYear && date.getMonth() === month;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      monthlyStats.push({
        month: getMonthName(month),
        monthIndex: month,
        income,
        expense,
        total: income + expense,
        count: monthTransactions.length
      });
    }
    return monthlyStats;
  };

  // Delete transaction with comment (new feature)
  const handleDeleteTransactionWithComment = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteComment('');
    setShowDeleteTransactionModal(true);
  };

  const confirmDeleteTransaction = () => {
    if (!transactionToDelete || !deleteComment.trim()) return;

    // Archive the transaction with delete info
    const archivedTransaction = {
      ...transactionToDelete,
      isDeleted: true,
      deleteComment: deleteComment.trim(),
      deletedAt: new Date().toISOString()
    };
    setDeletedTransactions(prev => [archivedTransaction, ...prev]);

    // Remove from active transactions
    setOtherTransactions(prev => prev.filter(t => t._id !== transactionToDelete._id));

    setShowDeleteTransactionModal(false);
    setTransactionToDelete(null);
    setDeleteComment('');
    setSuccessMessage("Operatsiya muvaffaqiyatli o'chirildi!");
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Get available years from transactions
  const getAvailableYears = () => {
    const years = new Set();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    otherTransactions.forEach(t => {
      const year = new Date(t.createdAt).getFullYear();
      years.add(year);
    });

    return Array.from(years).sort((a, b) => b - a);
  };


  // Filter payments based on search term, payment type, and status
  const filteredPayments = payments.filter(payment => {
    // Status filter
    if (statusFilter === 'active' && payment.isDeleted) {
      return false;
    }
    if (statusFilter === 'deleted' && !payment.isDeleted) {
      return false;
    }

    // Payment type filter
    if (paymentTypeFilter && payment.paymentType !== paymentTypeFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const studentName = `${payment.studentId?.firstName || ''} ${payment.studentId?.lastName || ''}`.toLowerCase();
      const studentId = (payment.studentId?.studentId || '').toLowerCase();
      const phone = (payment.studentId?.phone || '').toLowerCase();

      return studentName.includes(search) ||
        studentId.includes(search) ||
        phone.includes(search);
    }

    return true;
  });

  // Group payments by student - show latest payment per student
  const groupedPayments = (() => {
    const groups = {};
    filteredPayments.forEach(payment => {
      const sid = payment.studentId?._id || payment.studentId;
      if (!groups[sid]) {
        groups[sid] = [];
      }
      groups[sid].push(payment);
    });

    // Sort each group by date descending (newest first)
    Object.keys(groups).forEach(sid => {
      groups[sid].sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));
    });

    // Return array of { latestPayment, allPayments, count }
    return Object.values(groups).map(studentPayments => ({
      latestPayment: studentPayments[0],
      allPayments: studentPayments,
      count: studentPayments.length,
      totalAmount: studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      studentId: studentPayments[0].studentId?._id || studentPayments[0].studentId
    })).sort((a, b) => new Date(b.latestPayment.paymentDate || b.latestPayment.createdAt) - new Date(a.latestPayment.paymentDate || a.latestPayment.createdAt));
  })();

  // Calculate statistics based on active tab (must be before early return)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => {
    if (activeTab === 'students') {
      return {
        totalPayments: filteredPayments.length,
        totalAmount: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        cashPayments: filteredPayments.filter(p => p.paymentType === 'cash').length,
        cardPayments: filteredPayments.filter(p => p.paymentType === 'card').length
      };
    } else if (activeTab === 'teachers') {
      return {
        totalPayments: teacherPayments.length,
        totalAmount: teacherPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        cashPayments: teacherPayments.filter(p => p.paymentType === 'cash').length,
        cardPayments: teacherPayments.filter(p => p.paymentType === 'card').length
      };
    } else {
      return {
        totalPayments: otherTransactions.length,
        totalAmount: otherTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
        incomeAmount: otherTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
        expenseAmount: otherTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      };
    }
  }, [activeTab, filteredPayments, teacherPayments, otherTransactions]);

  if (loading && payments.length === 0) {
    return <LoadingOverlay message="To'lovlar yuklanmoqda" />;
  }

  return (
    <div className="payment-management">
      {/* Loading Overlay */}
      {loading && payments.length === 0 && <LoadingOverlay message="To'lovlar yuklanmoqda" />}

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button className="error-close" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Tab Navigation - Hide if initialTab is provided */}
      {!initialTab && (
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <span className="tab-icon">🎓</span>
            <span className="tab-text">O'quvchi to'lovlari</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            <span className="tab-icon">👨‍🏫</span>
            <span className="tab-text">O'qituvchi to'lovlari</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'other' ? 'active' : ''}`}
            onClick={() => setActiveTab('other')}
          >
            <span className="tab-icon">💼</span>
            <span className="tab-text">Boshqa kirim chiqimlar</span>
          </button>
        </div>
      )}

      {/* Real Money Balance Section - Only show if not in specialized mode */}
      {!initialTab && (
        <div className="real-balance-section">
        <div className="balance-header">
          <h2 className="balance-title">💰 Hisob balansi</h2>
          <span className="balance-date">Bugungi holat</span>
        </div>
        <div className="balance-cards">
          <div className="balance-card total-balance">
            <div className="balance-icon-wrapper">
              <span className="balance-icon">🏦</span>
            </div>
            <div className="balance-info">
              <span className="balance-label">Umumiy balans</span>
              <span className="balance-amount">
                {formatCurrency(
                  // Kirimlar: o'quvchi to'lovlari + boshqa kirimlar
                  (payments.filter(p => !p.isDeleted).reduce((sum, p) => sum + (p.amount || 0), 0)) +
                  (otherTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)) -
                  // Chiqimlar: o'qituvchi to'lovlari + boshqa chiqimlar
                  (teacherPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) -
                  (otherTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))
                )}
              </span>
            </div>
          </div>
          <div className="balance-card cash-balance">
            <div className="balance-icon-wrapper cash-icon-bg">
              <span className="balance-icon">💵</span>
            </div>
            <div className="balance-info">
              <span className="balance-label">Naqd pul</span>
              <span className="balance-amount">
                {formatCurrency(
                  // Kirimlar naqd
                  (payments.filter(p => !p.isDeleted && p.paymentType === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0)) +
                  (otherTransactions.filter(t => t.type === 'income' && t.paymentType === 'cash').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)) -
                  // Chiqimlar naqd
                  (teacherPayments.filter(p => p.paymentType === 'cash').reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) -
                  (otherTransactions.filter(t => t.type === 'expense' && t.paymentType === 'cash').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))
                )}
              </span>
            </div>
          </div>
          <div className="balance-card card-balance">
            <div className="balance-icon-wrapper card-icon-bg">
              <span className="balance-icon">💳</span>
            </div>
            <div className="balance-info">
              <span className="balance-label">Karta</span>
              <span className="balance-amount">
                {formatCurrency(
                  // Kirimlar karta
                  (payments.filter(p => !p.isDeleted && p.paymentType === 'card').reduce((sum, p) => sum + (p.amount || 0), 0)) +
                  (otherTransactions.filter(t => t.type === 'income' && t.paymentType === 'card').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)) -
                  // Chiqimlar karta
                  (teacherPayments.filter(p => p.paymentType === 'card').reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) -
                  (otherTransactions.filter(t => t.type === 'expense' && t.paymentType === 'card').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))
                )}
              </span>
            </div>
          </div>
          <div className="balance-card bank-balance">
            <div className="balance-icon-wrapper bank-icon-bg">
              <span className="balance-icon">🏧</span>
            </div>
            <div className="balance-info">
              <span className="balance-label">Bank o'tkazmasi</span>
              <span className="balance-amount">
                {formatCurrency(
                  // Kirimlar bank
                  (payments.filter(p => !p.isDeleted && p.paymentType === 'bank_transfer').reduce((sum, p) => sum + (p.amount || 0), 0)) +
                  (otherTransactions.filter(t => t.type === 'income' && t.paymentType === 'bank_transfer').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)) -
                  // Chiqimlar bank
                  (teacherPayments.filter(p => p.paymentType === 'bank_transfer').reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) -
                  (otherTransactions.filter(t => t.type === 'expense' && t.paymentType === 'bank_transfer').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))
                )}
              </span>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ==================== STUDENT PAYMENTS TAB ==================== */}
      {activeTab === 'students' && (
        <>
          <div className="section-header-compact">
            <div className="section-title-wrapper">
              <span className="section-title-icon">🎓</span>
              <h2 className="section-title-text">O'quvchi to'lovlari</h2>
            </div>
          </div>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-icon">🎓</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalPayments}</div>
                <div className="stat-label">Jami to'lovlar</div>
              </div>
            </div>

            <div className="stat-card stat-amount">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(stats.totalAmount)}</div>
                <div className="stat-label">Umumiy summa</div>
              </div>
            </div>

            <div className="stat-card stat-cash">
              <div className="stat-icon">💵</div>
              <div className="stat-content">
                <div className="stat-value">{stats.cashPayments}</div>
                <div className="stat-label">Naqd to'lovlar</div>
              </div>
            </div>

            <div className="stat-card stat-card-payment">
              <div className="stat-icon">💳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.cardPayments}</div>
                <div className="stat-label">Karta to'lovlari</div>
              </div>
            </div>
          </div>



          {/* Filters and Search Section */}
          <div className="filters-container">
            <div className="filter-card">
              <div className="filter-left">
                <div className="filter-item search-item">
                  <label className="filter-label">
                    <span className="label-icon">🔍</span>
                    Qidiruv
                  </label>
                  <div className="search-wrapper">
                    <input
                      type="search"
                      placeholder="O'quvchi ismi, ID, telefon..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    {searchTerm && (
                      <button
                        className="search-clear"
                        onClick={() => setSearchTerm('')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="filter-item">
                  <label className="filter-label">
                    <span className="label-icon">💳</span>
                    To'lov turi
                  </label>
                  <select
                    value={paymentTypeFilter}
                    onChange={(e) => setPaymentTypeFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Barcha turlar</option>
                    <option value="cash">💵 Naqd</option>
                    <option value="card">💳 Karta</option>
                    <option value="bank_transfer">🏦 Bank o'tkazmasi</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label className="filter-label">
                    <span className="label-icon">📋</span>
                    Holati
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">Barchasi</option>
                    <option value="active">✅ Aktiv</option>
                    <option value="deleted">🗑️ O'chirilgan</option>
                  </select>
                </div>
              </div>

              <button className="btn-add-compact" onClick={() => {
                setShowModal(true);
                setSelectedClassForPayment('');
              }}>
                <span className="add-icon">➕</span>
                <span className="add-text">Yangi to'lov</span>
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="payments-container">
            {groupedPayments.length > 0 ? (
              <div className="table-view">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>O'quvchi</th>
                      <th>Oxirgi to'lov</th>
                      <th>To'lov turi</th>
                      <th>Oy</th>
                      <th>Sana</th>
                      <th>Jami</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedPayments.map(group => {
                      const payment = group.latestPayment;
                      const isExpanded = expandedStudentId === group.studentId;
                      return (
                        <React.Fragment key={group.studentId}>
                          <tr className={payment.isDeleted ? 'deleted-row' : ''}>
                            <td>
                              <div className="student-cell">
                                <div
                                  className="student-avatar"
                                  style={payment.studentId?.profileImage ? {
                                    backgroundImage: `url(${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001'}${payment.studentId.profileImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                  } : {}}
                                >
                                  {!payment.studentId?.profileImage && (
                                    <span>
                                      {payment.studentId?.firstName?.charAt(0)}
                                      {payment.studentId?.lastName?.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="student-info-text">
                                  <div className="student-name-text">
                                    {payment.studentId?.firstName} {payment.studentId?.lastName}
                                  </div>
                                  <div className="student-id-text">
                                    {payment.studentId?.studentId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="amount-badge">{formatCurrency(payment.amount)}</span>
                            </td>
                            <td>
                              <span className={`payment-type-badge badge-${payment.paymentType}`}>
                                {getPaymentTypeLabel(payment.paymentType)}
                              </span>
                            </td>
                            <td>
                              <span className="month-badge">{payment.paymentMonth}</span>
                            </td>
                            <td>
                              <span className="date-text">{formatDate(payment.paymentDate)}</span>
                            </td>
                            <td>
                              <span className="amount-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                                {formatCurrency(group.totalAmount)}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                {group.count > 1 && (
                                  <button
                                    className="action-btn history-btn"
                                    onClick={() => setExpandedStudentId(isExpanded ? null : group.studentId)}
                                    title={isExpanded ? "Yopish" : `${group.count} ta to'lov tarixi`}
                                    style={{
                                      position: 'relative',
                                      background: isExpanded ? '#fef3c7' : 'transparent',
                                      borderRadius: '8px'
                                    }}
                                  >
                                    <span>{isExpanded ? '🔽' : '👁️'}</span>
                                    <span style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      background: '#d97706',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '18px',
                                      height: '18px',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>{group.count}</span>
                                  </button>
                                )}
                                <button
                                  className="action-btn edit-btn"
                                  onClick={() => openEditModal(payment)}
                                  title="Tahrirlash"
                                  style={{ background: '#fef3c7', borderRadius: '8px' }}
                                >
                                  <span>✏️</span>
                                </button>
                                <button
                                  className="action-btn print-btn"
                                  onClick={() => handlePrintReceipt(payment)}
                                  title="Chek chiqarish"
                                >
                                  <span>🖨️</span>
                                </button>
                                <button
                                  className="action-btn delete-btn"
                                  onClick={() => handleDelete(payment)}
                                  title="O'chirish"
                                  disabled={payment.isDeleted}
                                >
                                  <span>🗑️</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded history rows */}
                          {isExpanded && group.allPayments.slice(1).map((histPayment, idx) => (
                            <tr key={histPayment._id} className={`history-row ${histPayment.isDeleted ? 'deleted-row' : ''}`} style={{
                              background: idx % 2 === 0 ? '#fffbeb' : '#fffbeb',
                              borderLeft: '3px solid #d97706'
                            }}>
                              <td>
                                <div style={{ paddingLeft: '30px', fontSize: '12px', color: '#64748b' }}>
                                  ↳ {histPayment.studentId?.firstName} {histPayment.studentId?.lastName}
                                  {histPayment.isDeleted && <span className="deleted-badge" style={{ marginLeft: '6px' }}>O'chirilgan</span>}
                                </div>
                              </td>
                              <td>
                                <span className="amount-badge" style={{ fontSize: '12px' }}>{formatCurrency(histPayment.amount)}</span>
                              </td>
                              <td>
                                <span className={`payment-type-badge badge-${histPayment.paymentType}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {getPaymentTypeLabel(histPayment.paymentType)}
                                </span>
                              </td>
                              <td>
                                <span className="month-badge" style={{ fontSize: '11px' }}>{histPayment.paymentMonth}</span>
                              </td>
                              <td>
                                <span className="date-text" style={{ fontSize: '12px' }}>{formatDate(histPayment.paymentDate)}</span>
                              </td>
                              <td></td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="action-btn edit-btn"
                                    onClick={() => openEditModal(histPayment)}
                                    title="Tahrirlash"
                                    style={{ background: '#fef3c7', borderRadius: '8px' }}
                                  >
                                    <span>✏️</span>
                                  </button>
                                  <button
                                    className="action-btn print-btn"
                                    onClick={() => handlePrintReceipt(histPayment)}
                                    title="Chek chiqarish"
                                  >
                                    <span>🖨️</span>
                                  </button>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(histPayment)}
                                    title="O'chirish"
                                    disabled={histPayment.isDeleted}
                                  >
                                    <span>🗑️</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h3 className="empty-title">To'lovlar topilmadi</h3>
                <p className="empty-text">
                  Hozircha to'lovlar mavjud emas yoki qidiruv kriteriyalaringizga mos to'lovlar topilmadi.
                </p>
              </div>
            )}
          </div>

          {/* Add Payment Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => {
              setShowModal(false);
              setSelectedClassForPayment('');
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Yangi to'lov qo'shish</h2>
                  <button className="modal-close" onClick={() => {
                    setShowModal(false);
                    setSelectedClassForPayment('');
                  }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="payment-form">
                  <div className="form-group">
                    <label>O'quvchini qidiring *</label>
                    <div className="student-search-container" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Ism, familiya yoki telefon raqam kiriting..."
                        value={formData.studentSearchQuery || ''}
                        onChange={(e) => {
                          const query = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            studentSearchQuery: query,
                            studentId: '', // Reset selection when typing
                            amount: ''
                          }));
                        }}
                        className="form-control"
                        autoComplete="off"
                      />
                      {formData.studentSearchQuery && formData.studentSearchQuery.length >= 2 && !formData.studentId && (
                        <div className="student-search-results" style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          maxHeight: '250px',
                          overflowY: 'auto',
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000
                        }}>
                          {students
                            .filter(student => {
                              const query = formData.studentSearchQuery.toLowerCase();
                              const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                              const phone = (student.phone || '').toLowerCase();
                              const studentIdStr = (student.studentId || '').toLowerCase();
                              return fullName.includes(query) || phone.includes(query) || studentIdStr.includes(query);
                            })
                            .slice(0, 10)
                            .map(student => {
                              const classInfo = classes.find(c => c._id === (student.classId?._id || student.classId));
                              return (
                                <div
                                  key={student._id}
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      studentId: student._id,
                                      studentSearchQuery: `${student.firstName} ${student.lastName}`,
                                      amount: student.monthlyFee || ''
                                    }));
                                    setSelectedClassForPayment(student.classId?._id || student.classId || '');
                                  }}
                                  style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                                  onMouseLeave={(e) => e.target.style.background = 'white'}
                                >
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                  }}>
                                    {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                      {student.firstName} {student.lastName}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                      {classInfo?.name || 'Sinf yo\'q'} • {student.phone || 'Tel yo\'q'} • {formatCurrency(student.monthlyFee || 0)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          {students.filter(student => {
                            const query = formData.studentSearchQuery.toLowerCase();
                            const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                            const phone = (student.phone || '').toLowerCase();
                            return fullName.includes(query) || phone.includes(query);
                          }).length === 0 && (
                              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                                O'quvchi topilmadi
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                    {formData.studentId && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px 14px',
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ color: '#92400e', fontWeight: '500' }}>
                          ✅ O'quvchi tanlandi
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            studentId: '',
                            studentSearchQuery: '',
                            amount: ''
                          }))}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Tozalash
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Summa (so'm) *</label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>To'lov turi *</label>
                      <select
                        name="paymentType"
                        value={formData.paymentType}
                        onChange={handleInputChange}
                        required
                        className="form-control"
                      >
                        <option value="cash">Naqd</option>
                        <option value="card">Karta</option>
                        <option value="bank_transfer">Bank o'tkazmasi</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Chegirma (so'm)</label>
                      <input
                        type="number"
                        name="discount"
                        value={formData.discount || ''}
                        onChange={handleInputChange}
                        min="0"
                        className="form-control"
                        placeholder="0"
                      />
                      <small style={{ color: '#64748b', fontSize: '11px' }}>
                        Chegirma berilsa, bu summa to'langan hisoblanadi
                      </small>
                    </div>
                    <div className="form-group">
                      {formData.amount && (
                        <div style={{
                          background: '#fffbeb',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          marginTop: '22px'
                        }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Haqiqiy to'lov:</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#92400e' }}>
                            {formatCurrency(
                              Math.max(0, (parseFloat(formData.amount) || 0) - (parseFloat(formData.discount) || 0))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Qaysi oy uchun *</label>
                      <input
                        type="month"
                        name="paymentMonth"
                        value={formData.paymentMonth}
                        onChange={handleInputChange}
                        required
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>To'lov sanasi *</label>
                      <input
                        type="date"
                        name="paymentDate"
                        value={formData.paymentDate || new Date().toISOString().split('T')[0]}
                        onChange={handleInputChange}
                        required
                        className="form-control"
                      />
                      <small style={{ color: '#64748b', fontSize: '11px' }}>
                        Qachon to'lov qilingan?
                      </small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Chek raqami</label>
                    <input
                      type="text"
                      name="receiptNumber"
                      value={formData.receiptNumber}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  {formData.paymentType === 'bank_transfer' && (
                    <div className="form-group">
                      <label>Tranzaksiya ID</label>
                      <input
                        type="text"
                        name="transactionId"
                        value={formData.transactionId}
                        onChange={handleInputChange}
                        className="form-control"
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
                    <button type="button" className="btn-outline" onClick={() => {
                      setShowModal(false);
                      setSelectedClassForPayment('');
                    }}>
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

          {/* Success Message */}
          {successMessage && (
            <div className="success-notification">
              <div className="success-content">
                <span className="success-icon">✅</span>
                <span className="success-text">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && paymentToDelete && (
            <div className="modal-overlay" onClick={cancelDelete}>
              <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                <div className="delete-modal-header">
                  <div className="delete-icon-wrapper">
                    <span className="delete-icon">⚠️</span>
                  </div>
                  <h2 className="delete-title">To'lovni o'chirish</h2>
                  <p className="delete-subtitle">Bu amalni qaytarib bo'lmaydi!</p>
                </div>

                <div className="delete-modal-body">
                  <div className="payment-info-card">
                    <div className="payment-detail-row">
                      <span className="detail-label">O'quvchi:</span>
                      <span className="detail-value">
                        {paymentToDelete.studentId?.firstName} {paymentToDelete.studentId?.lastName}
                      </span>
                    </div>
                    <div className="payment-detail-row">
                      <span className="detail-label">Summa:</span>
                      <span className="detail-value amount-highlight">
                        {formatCurrency(paymentToDelete.amount)}
                      </span>
                    </div>
                    <div className="payment-detail-row">
                      <span className="detail-label">To'lov oyi:</span>
                      <span className="detail-value">{paymentToDelete.paymentMonth}</span>
                    </div>
                    <div className="payment-detail-row">
                      <span className="detail-label">Sana:</span>
                      <span className="detail-value">{formatDate(paymentToDelete.paymentDate)}</span>
                    </div>
                  </div>
                  <p className="delete-warning">
                    Ushbu to'lovni o'chirishga ishonchingiz komilmi?
                    Barcha ma'lumotlar butunlay o'chib ketadi.
                  </p>
                </div>

                <div className="delete-modal-footer">
                  <button className="modal-btn cancel-btn" onClick={cancelDelete}>
                    <span>✕</span>
                    <span>Bekor qilish</span>
                  </button>
                  <button className="modal-btn confirm-delete-btn" onClick={confirmDelete}>
                    <span>🗑️</span>
                    <span>Ha, o'chirish</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Receipt Modal */}
          {showReceipt && selectedPayment && (
            <PaymentReceipt
              payment={selectedPayment}
              student={selectedPayment.studentId}
              onClose={() => setShowReceipt(false)}
              schoolInfo={{
                name: 'My Dream School',
                address: 'Beruniy tumani',
                phone: '+998 90 706 88 66'
              }}
            />
          )}

          {/* Edit Payment Modal */}
          {showEditModal && editPayment && (
            <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>✏️ To'lovni tahrirlash</h2>
                  <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
                </div>

                <div style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                  borderBottom: '1px solid #93c5fd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>👤</span>
                  <span style={{ fontWeight: '600', color: '#1e3a8a' }}>
                    {editPayment.studentId?.firstName} {editPayment.studentId?.lastName}
                  </span>
                </div>

                <form onSubmit={handleEditSubmit} className="payment-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Summa (so'm) *</label>
                      <input
                        type="number"
                        value={editFormData.amount}
                        onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                        required
                        min="0"
                        className="form-control"
                      />
                    </div>

                    <div className="form-group">
                      <label>Chegirma (so'm)</label>
                      <input
                        type="number"
                        value={editFormData.discount}
                        onChange={(e) => setEditFormData({ ...editFormData, discount: e.target.value })}
                        min="0"
                        className="form-control"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>To'lov turi *</label>
                      <select
                        value={editFormData.paymentType}
                        onChange={(e) => setEditFormData({ ...editFormData, paymentType: e.target.value })}
                        required
                        className="form-control"
                      >
                        <option value="cash">Naqd</option>
                        <option value="card">Karta</option>
                        <option value="bank_transfer">Bank o'tkazmasi</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Qaysi oy uchun *</label>
                      <input
                        type="month"
                        value={editFormData.paymentMonth}
                        onChange={(e) => setEditFormData({ ...editFormData, paymentMonth: e.target.value })}
                        required
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>To'lov sanasi *</label>
                      <input
                        type="date"
                        value={editFormData.paymentDate}
                        onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
                        required
                        className="form-control"
                      />
                      <small style={{ color: '#64748b', fontSize: '11px' }}>
                        Qachon to'lov qilingan?
                      </small>
                    </div>

                    <div className="form-group">
                      {editFormData.amount && (
                        <div style={{
                          background: '#fffbeb',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          marginTop: '22px'
                        }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Haqiqiy to'lov:</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#92400e' }}>
                            {formatCurrency(
                              Math.max(0, (parseFloat(editFormData.amount) || 0) - (parseFloat(editFormData.discount) || 0))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Izoh</label>
                    <textarea
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      rows="2"
                      className="form-control"
                      placeholder="Qo'shimcha ma'lumot..."
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-outline" onClick={() => setShowEditModal(false)}>
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
        </>
      )}

      {/* ==================== TEACHER PAYMENTS TAB ==================== */}
      {activeTab === 'teachers' && (
        <div className="teacher-payments-section">
          <div className="section-header-compact">
            <div className="section-title-wrapper">
              <span className="section-title-icon">👨‍💼</span>
              <h2 className="section-title-text">O'qituvchi maoshlari</h2>
            </div>
          </div>
          {/* Teacher Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-icon">👨‍🏫</div>
              <div className="stat-content">
                <div className="stat-value">{teacherPayments.length}</div>
                <div className="stat-label">Jami to'lovlar</div>
              </div>
              <div className="stat-decoration"></div>
            </div>
            <div className="stat-card stat-amount">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(teacherPayments.reduce((sum, p) => sum + (p.amount || 0), 0))}</div>
                <div className="stat-label">Umumiy summa</div>
              </div>
              <div className="stat-decoration"></div>
            </div>
            <div className="stat-card stat-cash">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{teachers.length}</div>
                <div className="stat-label">O'qituvchilar</div>
              </div>
              <div className="stat-decoration"></div>
            </div>
            <div className="stat-card stat-card-payment">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-value">{getCurrentMonth()}</div>
                <div className="stat-label">Joriy oy</div>
              </div>
              <div className="stat-decoration"></div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-container">
            <div className="filter-card">
              <div className="filter-left">
                <div className="filter-item search-item">
                  <label className="filter-label">
                    <span className="label-icon">🔍</span>
                    Qidiruv
                  </label>
                  <div className="search-wrapper">
                    <input
                      type="search"
                      placeholder="O'qituvchi ismi..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
              </div>
              <button className="btn-add-compact" onClick={() => setShowTeacherModal(true)}>
                <span className="add-icon">➕</span>
                <span className="add-text">Yangi to'lov</span>
              </button>
            </div>
          </div>

          {/* Teacher Payments Table */}
          <div className="payments-container">
            {teacherPayments.length > 0 ? (
              <div className="table-view">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>O'qituvchi</th>
                      <th>Summa</th>
                      <th>To'lov turi</th>
                      <th>Oy</th>
                      <th>Sana</th>
                      <th>Izoh</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPayments
                      .filter(p => {
                        if (!searchTerm) return true;
                        const name = `${p.teacherId?.firstName || ''} ${p.teacherId?.lastName || ''}`.toLowerCase();
                        return name.includes(searchTerm.toLowerCase());
                      })
                      .map(payment => (
                        <tr key={payment._id}>
                          <td>
                            <div className="student-cell">
                              <div className="student-avatar teacher-avatar">
                                <span>
                                  {payment.teacherId?.firstName?.charAt(0)}
                                  {payment.teacherId?.lastName?.charAt(0)}
                                </span>
                              </div>
                              <div className="student-info-text">
                                <div className="student-name-text">
                                  {payment.teacherId?.firstName} {payment.teacherId?.lastName}
                                </div>
                                <div className="student-id-text">
                                  {payment.teacherId?.subject || 'O\'qituvchi'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="amount-badge">{formatCurrency(payment.amount)}</span>
                          </td>
                          <td>
                            <span className={`payment-type-badge badge-${payment.paymentType}`}>
                              {getPaymentTypeLabel(payment.paymentType)}
                            </span>
                          </td>
                          <td>
                            <span className="month-badge">{payment.paymentMonth}</span>
                          </td>
                          <td>
                            <span className="date-text">{formatDate(payment.createdAt)}</span>
                          </td>
                          <td>
                            <span className="date-text">{payment.description || '-'}</span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn delete-btn"
                                onClick={() => {
                                  setTeacherPayments(prev => prev.filter(p => p._id !== payment._id));
                                  setSuccessMessage('To\'lov o\'chirildi');
                                  setTimeout(() => setSuccessMessage(''), 3000);
                                }}
                                title="O'chirish"
                              >
                                <span>🗑️</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h3 className="empty-title">O'qituvchi to'lovlari mavjud emas</h3>
                <p className="empty-text">
                  Hozircha o'qituvchilarga to'lovlar amalga oshirilmagan.
                </p>
              </div>
            )}
          </div>

          {/* Teacher Payment Modal */}
          {showTeacherModal && (
            <div className="modal-overlay" onClick={() => setShowTeacherModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>O'qituvchiga to'lov</h2>
                  <button className="modal-close" onClick={() => setShowTeacherModal(false)}>&times;</button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const teacher = teachers.find(t => t._id === teacherFormData.teacherId);
                  const newPayment = {
                    _id: Date.now().toString(),
                    ...teacherFormData,
                    teacherId: teacher,
                    createdAt: new Date().toISOString()
                  };
                  setTeacherPayments(prev => [newPayment, ...prev]);
                  setShowTeacherModal(false);
                  setTeacherFormData({
                    teacherId: '',
                    amount: '',
                    paymentType: 'cash',
                    paymentMonth: getCurrentMonth(),
                    description: '',
                    notes: ''
                  });
                  setSuccessMessage('To\'lov muvaffaqiyatli qo\'shildi!');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }} className="payment-form">
                  <div className="form-group">
                    <label>O'qituvchi *</label>
                    <select
                      value={teacherFormData.teacherId}
                      onChange={(e) => {
                        const newTeacherId = e.target.value;
                        setTeacherFormData(prev => ({ ...prev, teacherId: newTeacherId }));
                        if (newTeacherId && teacherFormData.paymentMonth) {
                          fetchTeacherSalary(newTeacherId, teacherFormData.paymentMonth);
                        } else {
                          setTeacherSalaryInfo(null);
                        }
                      }}
                      required
                      className="form-control"
                    >
                      <option value="">Tanlang...</option>
                      {teachers.map(teacher => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.firstName} {teacher.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Summa (so'm) *</label>
                      <input
                        type="number"
                        value={teacherFormData.amount}
                        onChange={(e) => setTeacherFormData(prev => ({ ...prev, amount: e.target.value }))}
                        required
                        min="0"
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>To'lov turi *</label>
                      <select
                        value={teacherFormData.paymentType}
                        onChange={(e) => setTeacherFormData(prev => ({ ...prev, paymentType: e.target.value }))}
                        required
                        className="form-control"
                      >
                        <option value="cash">Naqd</option>
                        <option value="card">Karta</option>
                        <option value="bank_transfer">Bank o'tkazmasi</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Oy *</label>
                    <input
                      type="month"
                      value={teacherFormData.paymentMonth}
                      onChange={(e) => {
                        const newMonth = e.target.value;
                        setTeacherFormData(prev => ({ ...prev, paymentMonth: newMonth }));
                        if (teacherFormData.teacherId && newMonth) {
                          fetchTeacherSalary(teacherFormData.teacherId, newMonth);
                        }
                      }}
                      required
                      className="form-control"
                    />
                  </div>

                  {/* Auto-calculated salary info */}
                  {teacherSalaryLoading && (
                    <div style={{
                      padding: '16px',
                      background: '#f1f5f9',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#64748b',
                      margin: '8px 0'
                    }}>
                      ⏳ Dars ma'lumotlari yuklanmoqda...
                    </div>
                  )}

                  {teacherSalaryInfo && !teacherSalaryLoading && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fffbeb, #dcfce7)',
                      border: '2px solid #86efac',
                      borderRadius: '14px',
                      padding: '16px 20px',
                      margin: '8px 0'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '12px' }}>
                        📊 Avtomatik hisob-kitob
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ background: 'white', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Darslar soni</div>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a8a' }}>{teacherSalaryInfo.totalLessonsTaught}</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>1 dars narxi</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>{formatCurrency(teacherSalaryInfo.baseSalaryPerLesson)}</div>
                        </div>
                        <div style={{ background: 'white', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Jami maosh</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>{formatCurrency(teacherSalaryInfo.netSalary)}</div>
                        </div>
                      </div>

                      {/* VAT Toggle */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: applyVAT ? '#fef2f2' : 'white',
                        border: applyVAT ? '2px solid #fca5a5' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }} onClick={() => {
                        const newApplyVAT = !applyVAT;
                        setApplyVAT(newApplyVAT);
                        const base = teacherSalaryInfo.netSalary;
                        const finalAmount = newApplyVAT ? Math.round(base * 0.88) : base;
                        setTeacherFormData(prev => ({ ...prev, amount: finalAmount.toString() }));
                      }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: applyVAT ? '#991b1b' : '#475569' }}>
                            🏛️ QQS 12% ushlab qolish
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {applyVAT
                              ? `Ushlab qolinadi: ${formatCurrency(Math.round(teacherSalaryInfo.netSalary * 0.12))}`
                              : 'QQS ushlab qolinmaydi'
                            }
                          </div>
                        </div>
                        <div style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '12px',
                          background: applyVAT ? '#ef4444' : '#cbd5e1',
                          position: 'relative',
                          transition: 'all 0.3s'
                        }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: '2px',
                            left: applyVAT ? '22px' : '2px',
                            transition: 'all 0.3s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>

                      {/* Final amount */}
                      <div style={{
                        background: '#92400e',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>To'lanadigan summa:</span>
                        <span style={{ fontSize: '18px', fontWeight: '800' }}>
                          {formatCurrency(
                            applyVAT
                              ? Math.round(teacherSalaryInfo.netSalary * 0.88)
                              : teacherSalaryInfo.netSalary
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        style={{
                          width: '100%',
                          marginTop: '8px',
                          padding: '8px',
                          background: '#1e3a8a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const base = teacherSalaryInfo.netSalary;
                          const finalAmount = applyVAT ? Math.round(base * 0.88) : base;
                          setTeacherFormData(prev => ({ ...prev, amount: finalAmount.toString() }));
                        }}
                      >
                        💰 Summani avtomatik qo'yish
                      </button>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Izoh</label>
                    <textarea
                      value={teacherFormData.description}
                      onChange={(e) => setTeacherFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows="3"
                      className="form-control"
                      placeholder="Oylik maosh, bonus, mukofot va h.k."
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-outline" onClick={() => setShowTeacherModal(false)}>
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
        </div>
      )}

      {/* ==================== OTHER TRANSACTIONS TAB ==================== */}
      {activeTab === 'other' && (
        <div className="other-transactions-section">
          {!selectedCategoryPage && (
            <div className="section-header-compact">
              <div className="section-title-wrapper">
                <span className="section-title-icon">💸</span>
                <h2 className="section-title-text">Maktab xarajatlari</h2>
              </div>
            </div>
          )}
          {/* Show category page OR category selection based on selectedCategoryPage */}
          {selectedCategoryPage ? (
            /* ==================== CATEGORY FULL PAGE VIEW ==================== */
            <div className="category-full-page">
              {/* Category Page Header */}
              <div className="category-page-header" style={{ background: `linear-gradient(135deg, ${selectedCategoryPage.color}, ${selectedCategoryPage.color}99)` }}>
                <button
                  className="category-back-btn"
                  onClick={() => setSelectedCategoryPage(null)}
                >
                  ← Orqaga
                </button>
                <div className="category-page-title-section">
                  <div className="category-page-icon-wrapper">
                    <span className="category-page-icon">{selectedCategoryPage.icon}</span>
                  </div>
                  <div className="category-page-title-info">
                    <h2 className="category-page-title">{selectedCategoryPage.name}</h2>
                    <span className="category-page-subtitle">Kirim chiqim statistikasi va tarixi</span>
                  </div>
                </div>
              </div>

              {/* Category Stats Cards */}
              <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
                <div className="stat-card stat-total">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-value">{getFilteredCategoryTransactions().length}</div>
                    <div className="stat-label">Jami operatsiyalar</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
                <div className="stat-card stat-amount">
                  <div className="stat-icon">📈</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(getFilteredCategoryTransactions().filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}</div>
                    <div className="stat-label">Jami kirim</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
                <div className="stat-card stat-cash">
                  <div className="stat-icon">📉</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(getFilteredCategoryTransactions().filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}</div>
                    <div className="stat-label">Jami chiqim</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
                <div className="stat-card stat-card-payment">
                  <div className="stat-icon">💵</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(
                      getFilteredCategoryTransactions().filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0) -
                      getFilteredCategoryTransactions().filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                    )}</div>
                    <div className="stat-label">Balans</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
              </div>

              {/* Filter Section */}
              <div className="category-page-filters">
                <div className="filter-group">
                  <label className="filter-label">
                    <span className="label-icon">📅</span>
                    Yil
                  </label>
                  <select
                    value={categoryFilterYear}
                    onChange={(e) => setCategoryFilterYear(parseInt(e.target.value))}
                    className="filter-select"
                  >
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">
                    <span className="label-icon">📆</span>
                    Oy
                  </label>
                  <select
                    value={categoryFilterMonth}
                    onChange={(e) => setCategoryFilterMonth(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">Barcha oylar</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i}>{getMonthName(i)}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn-add-compact"
                  onClick={() => {
                    setOtherFormData(prev => ({ ...prev, category: selectedCategoryPage.name }));
                    setShowOtherModal(true);
                  }}
                >
                  <span className="add-icon">➕</span>
                  <span className="add-text">Yangi kirim/chiqim</span>
                </button>
              </div>

              {/* Yearly Chart Section */}
              <div className="category-chart-section">
                <h3 className="category-chart-title">📊 {categoryFilterYear} yil statistikasi</h3>
                <div className="category-chart-container">
                  <div className="category-chart-bars">
                    {getCategoryYearlyStats().map((stat, index) => {
                      const maxAmount = Math.max(...getCategoryYearlyStats().map(s => Math.max(s.income, s.expense))) || 1;
                      return (
                        <div key={index} className="chart-bar-group">
                          <div className="chart-bars">
                            <div
                              className="chart-bar income-bar"
                              style={{ height: `${(stat.income / maxAmount) * 100}%` }}
                              title={`Kirim: ${formatCurrency(stat.income)}`}
                            ></div>
                            <div
                              className="chart-bar expense-bar"
                              style={{ height: `${(stat.expense / maxAmount) * 100}%` }}
                              title={`Chiqim: ${formatCurrency(stat.expense)}`}
                            ></div>
                          </div>
                          <span className="chart-month-label">{stat.month.substring(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <span className="legend-color income-color"></span>
                      <span>Kirim</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color expense-color"></span>
                      <span>Chiqim</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions History */}
              <div className="category-transactions-section">
                <h3 className="category-transactions-title">📋 Operatsiyalar tarixi</h3>
                <div className="payments-container">
                  {getFilteredCategoryTransactions().length > 0 ? (
                    <div className="table-view">
                      <table className="payments-table">
                        <thead>
                          <tr>
                            <th>Turi</th>
                            <th>Summa</th>
                            <th>To'lov turi</th>
                            <th>Izoh</th>
                            <th>Sana</th>
                            <th>Amallar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredCategoryTransactions().map(transaction => (
                            <tr key={transaction._id}>
                              <td>
                                <span className={`transaction-type-badge ${transaction.type === 'income' ? 'income-badge' : 'expense-badge'}`}>
                                  {transaction.type === 'income' ? '📈 Kirim' : '📉 Chiqim'}
                                </span>
                              </td>
                              <td>
                                <span className={`amount-badge ${transaction.type === 'expense' ? 'expense-amount' : ''}`}>
                                  {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                                </span>
                              </td>
                              <td>
                                <span className={`payment-type-badge badge-${transaction.paymentType}`}>
                                  {getPaymentTypeLabel(transaction.paymentType)}
                                </span>
                              </td>
                              <td>
                                <span className="date-text">{transaction.description || '-'}</span>
                              </td>
                              <td>
                                <span className="date-text">{formatDate(transaction.createdAt)}</span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteTransactionWithComment(transaction)}
                                    title="O'chirish"
                                  >
                                    <span>🗑️</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3 className="empty-title">Operatsiyalar topilmadi</h3>
                      <p className="empty-text">
                        Tanlangan davr uchun operatsiyalar mavjud emas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ==================== CATEGORY SELECTION VIEW ==================== */
            <>
              {/* Other Stats */}
              <div className="stats-grid">
                <div className="stat-card stat-total">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-value">{otherTransactions.length}</div>
                    <div className="stat-label">Jami operatsiyalar</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
                <div className="stat-card stat-amount">
                  <div className="stat-icon">📈</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(otherTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}</div>
                    <div className="stat-label">Jami kirim</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
                <div className="stat-card stat-cash">
                  <div className="stat-icon">📉</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(otherTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}</div>
                    <div className="stat-label">Jami chiqim</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
                <div className="stat-card stat-card-payment">
                  <div className="stat-icon">💵</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(
                      otherTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0) -
                      otherTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
                    )}</div>
                    <div className="stat-label">Balans</div>
                  </div>
                  <div className="stat-decoration"></div>
                </div>
              </div>

              {/* Category Selection Section */}
              <div className="category-section">
                <div className="category-section-header">
                  <h3 className="category-section-title">📂 Kategoriyani tanlang</h3>
                  <p className="category-section-subtitle">Kategoriyani bosib, kirim chiqimlarni ko'ring va boshqaring</p>
                </div>

                <div className="category-cards-container">
                  {categories.map(cat => {
                    const catTransactions = otherTransactions.filter(t => t.category === cat.name);
                    const catTotal = catTransactions.reduce((sum, t) => {
                      return t.type === 'income'
                        ? sum + (Number(t.amount) || 0)
                        : sum - (Number(t.amount) || 0);
                    }, 0);

                    return (
                      <div
                        key={cat.id}
                        className="category-card-main category-card-clickable-full"
                        style={{ '--cat-color': cat.color }}
                        onClick={() => openCategoryPage(cat)}
                      >
                        <div className="category-card-icon-wrapper" style={{ background: `${cat.color}20` }}>
                          <span className="category-card-icon-main">{cat.icon}</span>
                        </div>
                        <span className="category-card-name-main">{cat.name}</span>
                        <div className="category-card-stats">
                          <span className="cat-stat-count">{catTransactions.length} ta</span>
                          <span className={`cat-stat-amount ${catTotal >= 0 ? 'positive' : 'negative'}`}>
                            {catTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(catTotal))}
                          </span>
                        </div>
                        <div className="category-card-arrow">→</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete Transaction with Comment Modal */}
      {showDeleteTransactionModal && transactionToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteTransactionModal(false)}>
          <div className="delete-modal delete-comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-icon-wrapper">
                <span className="delete-icon">⚠️</span>
              </div>
              <h2 className="delete-title">Operatsiyani o'chirish</h2>
              <p className="delete-subtitle">Bu amalni qaytarib bo'lmaydi!</p>
            </div>

            <div className="delete-modal-body">
              <div className="payment-info-card">
                <div className="payment-detail-row">
                  <span className="detail-label">Kategoriya:</span>
                  <span className="detail-value">{transactionToDelete.category}</span>
                </div>
                <div className="payment-detail-row">
                  <span className="detail-label">Turi:</span>
                  <span className="detail-value">
                    {transactionToDelete.type === 'income' ? '📈 Kirim' : '📉 Chiqim'}
                  </span>
                </div>
                <div className="payment-detail-row">
                  <span className="detail-label">Summa:</span>
                  <span className="detail-value amount-highlight">
                    {formatCurrency(transactionToDelete.amount)}
                  </span>
                </div>
                <div className="payment-detail-row">
                  <span className="detail-label">Sana:</span>
                  <span className="detail-value">{formatDate(transactionToDelete.createdAt)}</span>
                </div>
              </div>

              <div className="delete-comment-section">
                <label className="delete-comment-label">
                  <span className="required-mark">*</span> O'chirish sababi (majburiy)
                </label>
                <textarea
                  className="delete-comment-input"
                  value={deleteComment}
                  onChange={(e) => setDeleteComment(e.target.value)}
                  placeholder="Nima uchun bu operatsiyani o'chiryapsiz?"
                  rows="3"
                />
              </div>

              <p className="delete-warning">
                Ushbu operatsiyani o'chirishga ishonchingiz komilmi?
              </p>
            </div>

            <div className="delete-modal-footer">
              <button className="modal-btn cancel-btn" onClick={() => setShowDeleteTransactionModal(false)}>
                <span>✕</span>
                <span>Bekor qilish</span>
              </button>
              <button
                className="modal-btn confirm-delete-btn"
                onClick={confirmDeleteTransaction}
                disabled={!deleteComment.trim()}
              >
                <span>🗑️</span>
                <span>Ha, o'chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Other Transaction Modal */}
      {showOtherModal && (
        <div className="modal-overlay" onClick={() => setShowOtherModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Yangi {otherFormData.type === 'income' ? 'kirim' : 'chiqim'} qo'shish</h2>
              <button className="modal-close" onClick={() => setShowOtherModal(false)}>&times;</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!otherFormData.amount || Number(otherFormData.amount) <= 0) {
                alert('Summani kiriting!');
                return;
              }
              const newTransaction = {
                _id: Date.now().toString(),
                ...otherFormData,
                createdAt: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString()
              };
              setOtherTransactions(prev => [newTransaction, ...prev]);
              setOtherFormData(prev => ({
                ...prev,
                amount: '',
                description: ''
              }));
              setTransactionDate(new Date().toISOString().split('T')[0]);
              setShowOtherModal(false);
              setSuccessMessage("Operatsiya muvaffaqiyatli qo'shildi!");
              setTimeout(() => setSuccessMessage(''), 3000);
            }} className="payment-form">
              <div className="form-group">
                <label>Kategoriya</label>
                <input
                  type="text"
                  value={otherFormData.category}
                  disabled
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Turi *</label>
                <div className="transaction-type-toggle" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className={`toggle-btn ${otherFormData.type === 'income' ? 'active income' : ''}`}
                    onClick={() => setOtherFormData(prev => ({ ...prev, type: 'income' }))}
                  >
                    📈 Kirim
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${otherFormData.type === 'expense' ? 'active expense' : ''}`}
                    onClick={() => setOtherFormData(prev => ({ ...prev, type: 'expense' }))}
                  >
                    📉 Chiqim
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Summa (so'm) *</label>
                  <input
                    type="number"
                    value={otherFormData.amount}
                    onChange={(e) => setOtherFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    min="0"
                    className="form-control"
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>To'lov turi *</label>
                  <select
                    value={otherFormData.paymentType}
                    onChange={(e) => setOtherFormData(prev => ({ ...prev, paymentType: e.target.value }))}
                    required
                    className="form-control"
                  >
                    <option value="cash">💵 Naqd</option>
                    <option value="card">💳 Karta</option>
                    <option value="bank_transfer">🏦 Bank o'tkazmasi</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Sana *</label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="form-control"
                  max={new Date().toISOString().split('T')[0]}
                />
                <small style={{ color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  O'tmishdagi sana uchun ham kirim qo'shishingiz mumkin
                </small>
              </div>

              <div className="form-group">
                <label>Izoh</label>
                <textarea
                  value={otherFormData.description}
                  onChange={(e) => setOtherFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="form-control"
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={() => setShowOtherModal(false)}>
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


      {/* Category Detail Modal */}
      {showCategoryDetailModal && selectedCategoryForDetails && (() => {
        const stats = getCategoryStats(selectedCategoryForDetails.name);
        const currentMonthIndex = new Date().getMonth();
        const lastMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;

        return (
          <div className="modal-overlay" onClick={() => setShowCategoryDetailModal(false)}>
            <div className="category-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="category-modal-header" style={{ background: `linear-gradient(135deg, ${selectedCategoryForDetails.color}, ${selectedCategoryForDetails.color}99)` }}>
                <div className="category-modal-title-section">
                  <div className="category-modal-icon-wrapper">
                    <span className="category-modal-icon">{selectedCategoryForDetails.icon}</span>
                  </div>
                  <div className="category-modal-title-info">
                    <h2 className="category-modal-title">{selectedCategoryForDetails.name}</h2>
                    <span className="category-modal-subtitle">Kategoriya statistikasi va tarixi</span>
                  </div>
                </div>
                <button className="category-modal-close" onClick={() => setShowCategoryDetailModal(false)}>&times;</button>
              </div>

              <div className="category-modal-body">
                {/* Statistics Section */}
                <div className="category-stats-section">
                  <h3 className="category-stats-title">📊 Oylik statistika</h3>
                  <div className="category-stats-grid">
                    <div className="category-stat-card current">
                      <div className="category-stat-header">
                        <span className="category-stat-month">{getMonthName(currentMonthIndex)}</span>
                        <span className="category-stat-badge current-badge">Joriy oy</span>
                      </div>
                      <div className="category-stat-amounts">
                        <div className="category-stat-row income">
                          <span>📈 Kirim:</span>
                          <span>{formatCurrency(stats.currentMonth.income)}</span>
                        </div>
                        <div className="category-stat-row expense">
                          <span>📉 Chiqim:</span>
                          <span>{formatCurrency(stats.currentMonth.expense)}</span>
                        </div>
                        <div className="category-stat-row total">
                          <span>📊 Jami:</span>
                          <span>{formatCurrency(stats.currentMonth.total)}</span>
                        </div>
                      </div>
                      <div className="category-stat-count">
                        {stats.currentMonth.count} ta operatsiya
                      </div>
                    </div>

                    <div className="category-stat-card previous">
                      <div className="category-stat-header">
                        <span className="category-stat-month">{getMonthName(lastMonthIndex)}</span>
                        <span className="category-stat-badge previous-badge">O'tgan oy</span>
                      </div>
                      <div className="category-stat-amounts">
                        <div className="category-stat-row income">
                          <span>📈 Kirim:</span>
                          <span>{formatCurrency(stats.lastMonth.income)}</span>
                        </div>
                        <div className="category-stat-row expense">
                          <span>📉 Chiqim:</span>
                          <span>{formatCurrency(stats.lastMonth.expense)}</span>
                        </div>
                        <div className="category-stat-row total">
                          <span>📊 Jami:</span>
                          <span>{formatCurrency(stats.lastMonth.total)}</span>
                        </div>
                      </div>
                      <div className="category-stat-count">
                        {stats.lastMonth.count} ta operatsiya
                      </div>
                    </div>

                    <div className="category-stat-card comparison">
                      <div className="category-stat-header">
                        <span className="category-stat-month">Solishtirish</span>
                        <span className={`category-stat-badge ${stats.percentChange >= 0 ? 'up-badge' : 'down-badge'}`}>
                          {stats.percentChange >= 0 ? '📈' : '📉'} {stats.percentChange >= 0 ? '+' : ''}{stats.percentChange}%
                        </span>
                      </div>
                      <div className="category-stat-amounts">
                        <div className="category-stat-row">
                          <span>Umumiy kirim:</span>
                          <span style={{ color: '#d97706' }}>{formatCurrency(stats.totalIncome)}</span>
                        </div>
                        <div className="category-stat-row">
                          <span>Umumiy chiqim:</span>
                          <span style={{ color: '#ef4444' }}>{formatCurrency(stats.totalExpense)}</span>
                        </div>
                        <div className="category-stat-row total">
                          <span>Barcha vaqt:</span>
                          <span>{formatCurrency(stats.totalIncome + stats.totalExpense)}</span>
                        </div>
                      </div>
                      <div className="category-stat-count">
                        {stats.allTransactions.length} ta operatsiya
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions History */}
                <div className="category-history-section">
                  <h3 className="category-history-title">📋 Operatsiyalar tarixi</h3>
                  {stats.allTransactions.length > 0 ? (
                    <div className="category-history-table-wrapper">
                      <table className="category-history-table">
                        <thead>
                          <tr>
                            <th>Turi</th>
                            <th>Summa</th>
                            <th>To'lov turi</th>
                            <th>Izoh</th>
                            <th>Sana</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.allTransactions.map(t => (
                            <tr key={t._id}>
                              <td>
                                <span className={`transaction-type-badge ${t.type === 'income' ? 'income-badge' : 'expense-badge'}`}>
                                  {t.type === 'income' ? '📈 Kirim' : '📉 Chiqim'}
                                </span>
                              </td>
                              <td>
                                <span className={`amount-badge ${t.type === 'expense' ? 'expense-amount' : ''}`}>
                                  {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                                </span>
                              </td>
                              <td>
                                <span className={`payment-type-badge badge-${t.paymentType}`}>
                                  {getPaymentTypeLabel(t.paymentType)}
                                </span>
                              </td>
                              <td>{t.description || '-'}</td>
                              <td>{formatDate(t.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="category-empty-state">
                      <span className="category-empty-icon">📭</span>
                      <p>Bu kategoriyada hali operatsiyalar mavjud emas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        /* ==================== BASE STYLES ==================== */
        .payment-management {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          animation: fadeIn 0.4s ease-in;
          background: linear-gradient(180deg, #fffbeb 0%, #f8fafc 280px);
          min-height: 100vh;
          box-sizing: border-box;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ==================== LOADING & ERROR ==================== */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(180, 83, 9, 0.95) 0%, rgba(245, 158, 11, 0.95) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(8px);
        }

        .loading-container {
          background: white;
          padding: 3rem 4rem;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
          animation: loadingPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        .loading-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #92400e, #d97706, #f59e0b, #d97706, #92400e);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }

        @keyframes loadingPopIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .loading-logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
          animation: logoPulse 2s ease-in-out infinite;
        }

        @keyframes logoPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3); }
          50% { transform: scale(1.05); box-shadow: 0 12px 32px rgba(245, 158, 11, 0.4); }
        }

        .logo-icon {
          font-size: 2.5rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .loading-animation {
          display: flex;
          gap: 0.75rem;
          margin: 0.5rem 0;
        }

        .loading-circle {
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #92400e, #d97706);
          border-radius: 50%;
          animation: loadingBounce 1.4s ease-in-out infinite;
        }

        .loading-circle:nth-child(1) {
          animation-delay: 0s;
        }

        .loading-circle:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-circle:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes loadingBounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .loading-text {
          text-align: center;
        }

        .loading-text h3 {
          margin: 0 0 0.375rem 0;
          font-size: 1.375rem;
          font-weight: 700;
          color: #1e293b;
          background: linear-gradient(135deg, #92400e, #d97706);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .loading-text p {
          margin: 0;
          font-size: 0.9375rem;
          color: #64748b;
          font-weight: 500;
        }

        .loading-progress {
          width: 200px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .loading-progress-bar {
          height: 100%;
          width: 30%;
          background: linear-gradient(90deg, #92400e, #d97706, #f59e0b);
          border-radius: 3px;
          animation: progressMove 1.5s ease-in-out infinite;
        }

        @keyframes progressMove {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }

        .error-banner {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
          border: 1px solid #fca5a5;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .error-icon {
          font-size: 1.5rem;
        }

        .error-text {
          flex: 1;
          font-weight: 600;
        }

        .error-close {
          background: #dc2626;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .error-close:hover {
          background: #991b1b;
          transform: scale(1.1);
        }

        /* ==================== REAL BALANCE SECTION ==================== */
        .real-balance-section {
          background: linear-gradient(135deg, #92400e 0%, #d97706 50%, #b45309 100%);
          border-radius: 14px;
          padding: 0.875rem 1.25rem;
          margin-bottom: 1rem;
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.25);
          position: relative;
          overflow: hidden;
        }

        .real-balance-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 60%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .balance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .balance-title {
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .balance-date {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.15);
          padding: 0.25rem 0.625rem;
          border-radius: 12px;
        }

        .balance-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.375rem;
          position: relative;
          z-index: 1;
        }

        .balance-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
        }

        .balance-card:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .balance-icon-wrapper {
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cash-icon-bg {
          background: rgba(245, 158, 11, 0.3);
        }

        .card-icon-bg {
          background: rgba(168, 85, 247, 0.3);
        }

        .bank-icon-bg {
          background: rgba(251, 191, 36, 0.3);
        }

        .balance-icon {
          font-size: 0.9rem;
        }

        .balance-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }

        .balance-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .balance-amount {
          color: white;
          font-size: 0.8125rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .total-balance .balance-amount {
          font-size: 0.9375rem;
        }

        /* ==================== TAB NAVIGATION ==================== */
        .tab-navigation {
          display: flex;
          gap: 0.375rem;
          margin-bottom: 1rem;
          background: white;
          padding: 0.375rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
          border: 1px solid #e2e8f0;
          border-left: 4px solid #d97706;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 0.875rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          background: #fffbeb;
          color: #92400e;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #92400e, #d97706);
          color: white;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .tab-icon {
          font-size: 0.875rem;
        }

        .tab-text {
          white-space: nowrap;
        }

        /* Teacher avatar color */
        .teacher-avatar {
          background: linear-gradient(135deg, #b45309, #d97706) !important;
        }

        /* Transaction type badges */
        .transaction-type-badge {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 700;
          display: inline-block;
        }

        .income-badge {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #78350f;
        }

        .expense-badge {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
        }

        .expense-amount {
          background: linear-gradient(135deg, #fee2e2, #fecaca) !important;
          color: #991b1b !important;
        }

        .category-text {
          font-weight: 600;
          color: #475569;
        }

        /* Transaction type selector in modal */
        .transaction-type-selector {
          display: flex;
          gap: 1rem;
        }

        .type-btn {
          flex: 1;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .type-btn:hover {
          border-color: #cbd5e1;
        }

        .income-btn.active {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-color: #d97706;
          color: #78350f;
        }

        .expense-btn.active {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border-color: #ef4444;
          color: #991b1b;
        }

        /* ==================== CATEGORY SECTION (Main) ==================== */
        .category-section {
          background: white;
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 4px 16px rgba(30, 58, 138, 0.08);
          border: 1px solid rgba(30, 58, 138, 0.06);
          margin-bottom: 1.5rem;
        }

        .category-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .category-section-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .transaction-type-toggle {
          display: flex;
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 0.25rem;
          border-radius: 12px;
        }

        .toggle-btn {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          background: transparent;
          color: #64748b;
        }

        .toggle-btn:hover {
          color: #1e293b;
        }

        .toggle-btn.active.income {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #78350f;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
        }

        .toggle-btn.active.expense {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
        }

        .category-cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .category-card-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 1rem;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
        }

        .category-card-main:hover {
          border-color: var(--cat-color);
          background: white;
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .category-card-main.selected {
          border-color: var(--cat-color);
          background: white;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          transform: translateY(-3px);
        }

        .category-card-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s ease;
        }

        .category-card-main:hover .category-card-icon-wrapper,
        .category-card-main.selected .category-card-icon-wrapper {
          transform: scale(1.1);
        }

        .category-card-icon-main {
          font-size: 1.75rem;
        }

        .category-card-name-main {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #475569;
          text-align: center;
          line-height: 1.3;
        }

        .category-card-main.selected .category-card-name-main {
          color: #1e293b;
          font-weight: 700;
        }

        .category-selected-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          background: var(--cat-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          animation: checkPop 0.3s ease;
        }

        @keyframes checkPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        /* Quick Add Form */
        .quick-add-form {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 1.25rem;
          border: 2px solid #e2e8f0;
          animation: slideDown 0.3s ease;
        }

        .quick-add-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px dashed #e2e8f0;
        }

        .quick-add-category {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }

        .quick-add-type {
          padding: 0.375rem 0.875rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 700;
        }

        .quick-add-type.income {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #78350f;
        }

        .quick-add-type.expense {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
        }

        .quick-add-fields {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: flex-end;
        }

        .quick-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          min-width: 150px;
        }

        .quick-field-wide {
          flex: 1;
          min-width: 200px;
        }

        .quick-field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #64748b;
        }

        .quick-field input,
        .quick-field select {
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 500;
          background: white;
          color: #1e293b;
          transition: all 0.2s ease;
        }

        .quick-field input:focus,
        .quick-field select:focus {
          outline: none;
          border-color: #d97706;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        .quick-add-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #92400e, #d97706);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
          white-space: nowrap;
        }

        .quick-add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        .quick-add-btn:active {
          transform: translateY(0);
        }

        /* ==================== CATEGORY CARDS (Modal) ==================== */
        .category-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          max-height: 320px;
          overflow-y: auto;
          padding: 0.5rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .category-cards-grid::-webkit-scrollbar {
          width: 6px;
        }

        .category-cards-grid::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .category-cards-grid::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .category-cards-grid::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .category-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 0.5rem;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .category-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--cat-color);
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .category-card:hover {
          border-color: var(--cat-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .category-card:hover::before {
          opacity: 1;
        }

        .category-card.selected {
          border-color: var(--cat-color);
          background: linear-gradient(135deg, white 0%, rgba(var(--cat-color-rgb), 0.05) 100%);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .category-card.selected::before {
          opacity: 1;
          height: 4px;
        }

        .category-card.selected::after {
          content: '✓';
          position: absolute;
          top: 6px;
          right: 6px;
          width: 18px;
          height: 18px;
          background: var(--cat-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          font-weight: 700;
        }

        .category-card-icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .category-card-name {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #475569;
          text-align: center;
          line-height: 1.2;
          word-break: break-word;
        }

        .category-card.selected .category-card-name {
          color: #1e293b;
          font-weight: 700;
        }

        /* ==================== STATS GRID ==================== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .stat-card {
          background: white;
          padding: 0.625rem 0.75rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(30, 58, 138, 0.06);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
          border: 1px solid rgba(30, 58, 138, 0.04);
          animation: scaleIn 0.4s ease-out backwards;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .stat-card:nth-child(2) { animation-delay: 0.1s; }
        .stat-card:nth-child(3) { animation-delay: 0.15s; }
        .stat-card:nth-child(4) { animation-delay: 0.2s; }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(30, 58, 138, 0.12);
        }

        .stat-decoration {
          position: absolute;
          right: -10px;
          top: -10px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          opacity: 0.1;
        }

        .stat-total .stat-decoration { background: #d97706; }
        .stat-amount .stat-decoration { background: #92400e; }
        .stat-cash .stat-decoration { background: #f59e0b; }
        .stat-card-payment .stat-decoration { background: #8b5cf6; }

        .stat-icon {
          font-size: 1.125rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .stat-total .stat-icon {
          background: #fef3c7;
        }

        .stat-amount .stat-icon {
          background: #fde68a;
        }

        .stat-cash .stat-icon {
          background: #fef3c7;
        }

        .stat-card-payment .stat-icon {
          background: #ede9fe;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          line-height: 1.2;
        }

        /* ==================== FILTERS SECTION ==================== */
        .filters-container {
          margin-bottom: 1rem;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .filter-card {
          background: white;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1rem;
          border: 1px solid rgba(30, 58, 138, 0.06);
        }

        .filter-left {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex: 1;
          flex-wrap: wrap;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .filter-item.search-item {
          flex: 1;
          min-width: 300px;
        }

        .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .label-icon {
          font-size: 0.875rem;
        }

        .search-wrapper {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          background: #f8fafc;
          color: #1e293b;
          font-weight: 500;
        }

        .search-input:focus {
          outline: none;
          border-color: #d97706;
          background: white;
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #ef4444;
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          transition: all 0.2s ease;
        }

        .search-clear:hover {
          background: #dc2626;
          transform: translateY(-50%) scale(1.1);
        }

        .filter-select {
          padding: 0.5rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          background: #f8fafc;
          color: #1e293b;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 140px;
        }

        .filter-select:focus {
          outline: none;
          border-color: #d97706;
          background: white;
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
        }

        .btn-add-compact {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.1rem;
          background: linear-gradient(135deg, #92400e, #d97706);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3);
          white-space: nowrap;
        }

        .btn-add-compact:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(245, 158, 11, 0.4);
          background: linear-gradient(135deg, #b45309, #f59e0b);
        }

        .btn-add-compact:active {
          transform: translateY(0);
        }

        .add-icon {
          font-size: 0.875rem;
        }

        /* ==================== TABLE VIEW ==================== */
        .payments-container {
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .table-view {
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.06);
          overflow: hidden;
          border: 1px solid rgba(30, 58, 138, 0.06);
        }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
        }

        .payments-table thead {
          background: linear-gradient(135deg, #92400e, #d97706);
        }

        .payments-table th {
          padding: 0.625rem 0.875rem;
          text-align: left;
          font-size: 0.72rem;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #92400e;
        }

        .payments-table tbody tr {
          transition: all 0.2s ease;
          border-bottom: 1px solid #f1f5f9;
        }

        .payments-table tbody tr:hover {
          background: #fffbeb;
          transform: scale(1.005);
        }

        .payments-table tbody tr.deleted-row {
          background: #fef2f2;
          opacity: 0.7;
          position: relative;
        }

        .payments-table tbody tr.deleted-row::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 2px;
          background: linear-gradient(to right, transparent, #ef4444, transparent);
          pointer-events: none;
        }

        .payments-table tbody tr.deleted-row:hover {
          background: #fee2e2;
          opacity: 0.8;
        }

        .payments-table tbody tr.deleted-row td {
          text-decoration: line-through;
          color: #991b1b;
        }

        .payments-table td {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #334155;
        }

        .student-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .student-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #92400e, #d97706);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.25);
          flex-shrink: 0;
        }

        .student-avatar span {
          color: white !important;
        }

        .student-info-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .student-name-text {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.8125rem;
        }

        .student-id-text {
          font-size: 0.6875rem;
          color: #64748b;
        }

        .deleted-badge {
          display: inline-block;
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
          margin-left: 0.5rem;
          text-decoration: none !important;
          border: 1px solid #ef4444;
        }

        .deleted-info-text {
          font-size: 0.75rem;
          color: #dc2626;
          font-style: italic;
          margin-top: 0.25rem;
          text-decoration: none !important;
        }

        .amount-badge {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #78350f;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.8125rem;
          display: inline-block;
          box-shadow: 0 1px 4px rgba(245, 158, 11, 0.15);
        }

        .payment-type-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          display: inline-block;
        }

        .badge-cash {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #78350f;
        }

        .badge-card {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
        }

        .badge-bank_transfer {
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          color: #5b21b6;
        }

        .month-badge {
          background: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.6875rem;
          color: #475569;
          display: inline-block;
        }

        .date-text, .receiver-text {
          color: #64748b;
          font-size: 0.6875rem;
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          gap: 0.375rem;
          align-items: center;
          justify-content: center;
        }

        .action-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }

        .print-btn {
          background: #dbeafe;
          color: #1e40af;
        }

        .print-btn:hover {
          background: #3b82f6;
          color: white;
          transform: scale(1.1);
        }

        .delete-btn {
          background: #fee2e2;
          color: #991b1b;
        }

        .delete-btn:hover {
          background: #ef4444;
          color: white;
          transform: scale(1.1);
        }

        /* ==================== EMPTY STATE ==================== */
        .empty-state {
          background: white;
          padding: 4rem 2rem;
          text-align: center;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(30, 58, 138, 0.08);
          border: 1px solid rgba(30, 58, 138, 0.06);
        }

        .empty-title {
          font-size: 1.5rem;
          color: #1e293b;
          margin: 0 0 1rem 0;
          font-weight: 700;
        }

        .empty-text {
          color: #64748b;
          font-size: 1rem;
          margin: 0;
          line-height: 1.6;
        }

        /* ==================== MODAL STYLES ==================== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modalSlideIn {
          from {
            transform: scale(0.8) translateY(-30px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          background: linear-gradient(135deg, #92400e, #d97706);
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .modal-close {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          line-height: 1;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .payment-form {
          padding: 1.25rem 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.375rem;
          font-weight: 600;
          color: #334155;
          font-size: 0.8125rem;
        }

        .form-control {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.8125rem;
          transition: all 0.2s ease;
          background: #f8fafc;
          color: #1e293b;
          font-weight: 500;
        }

        .form-control:focus {
          outline: none;
          border-color: #d97706;
          background: white;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 1.25rem;
          padding-top: 1.25rem;
          border-top: 1px solid #f1f5f9;
        }

        .form-actions .btn-outline {
          padding: 0.6rem 1.1rem;
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .form-actions .btn-outline:hover {
          background: #fef3c7;
          border-color: #fcd34d;
        }

        .form-actions .btn-primary {
          padding: 0.6rem 1.1rem;
          background: linear-gradient(135deg, #92400e, #d97706);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3);
          font-size: 0.875rem;
        }

        .form-actions .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(245, 158, 11, 0.4);
        }

        /* ==================== SUCCESS NOTIFICATION ==================== */
        .success-notification {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 10000;
          animation: slideInRight 0.3s ease-out;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .success-content {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 8px 32px rgba(245, 158, 11, 0.25);
          border: 2px solid #d97706;
          min-width: 300px;
        }

        .success-icon {
          font-size: 1.5rem;
          animation: scaleUp 0.5s ease-out;
        }

        @keyframes scaleUp {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .success-text {
          font-weight: 700;
          color: #78350f;
          font-size: 1rem;
        }

        /* ==================== DELETE MODAL ==================== */
        .delete-modal {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 420px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          animation: modalBounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modalBounceIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .delete-modal-header {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          padding: 1.25rem;
          text-align: center;
          border-bottom: 2px solid #ef4444;
        }

        .delete-icon-wrapper {
          width: 56px;
          height: 56px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.75rem;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .delete-icon {
          font-size: 2rem;
        }

        .delete-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #991b1b;
          margin: 0 0 0.375rem 0;
        }

        .delete-subtitle {
          font-size: 0.8125rem;
          color: #dc2626;
          font-weight: 600;
          margin: 0;
          font-style: italic;
        }

        .delete-modal-body {
          padding: 1.25rem;
        }

        .payment-info-card {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          border: 1px solid #e2e8f0;
        }

        .payment-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px dashed #cbd5e1;
        }

        .payment-detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 600;
          color: #64748b;
          font-size: 0.8125rem;
        }

        .detail-value {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.8125rem;
        }

        .amount-highlight {
          color: #b45309;
          font-size: 0.9375rem;
        }

        .delete-warning {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border-left: 3px solid #f59e0b;
          color: #78350f;
          font-weight: 600;
          font-size: 0.8125rem;
          line-height: 1.5;
          margin: 0;
        }

        .delete-modal-footer {
          padding: 1rem 1.25rem;
          background: #f8fafc;
          display: flex;
          gap: 0.75rem;
          border-top: 1px solid #e2e8f0;
        }

        .modal-btn {
          flex: 1;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
        }

        .cancel-btn {
          background: white;
          color: #64748b;
          border: 2px solid #e2e8f0;
        }

        .cancel-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-2px);
        }

        .confirm-delete-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .confirm-delete-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
          background: linear-gradient(135deg, #dc2626, #b91c1c);
        }

        .confirm-delete-btn:active {
          transform: translateY(0);
        }

        /* ==================== RESPONSIVE STYLES ==================== */
        /* ============ DESIGN_SYSTEM.md — Noutbuk (992-1199) ============ */
        @media (min-width: 992px) and (max-width: 1199px) {
          .payment-management { padding: 1.5rem; }
          .stats-grid { gap: 0.75rem; }
          .balance-cards { gap: 0.875rem; }
          .real-balance-section { padding: 1.5rem; }
          .tab-navigation { gap: 0.5rem; }
          .tab-btn { padding: 0.875rem 1.125rem; font-size: 0.9rem; }
          .category-cards-container { grid-template-columns: repeat(4, 1fr); }
        }

        /* ============ DESIGN_SYSTEM.md — Planshet (768-991) ============ */
        @media (min-width: 768px) and (max-width: 991px) {
          .payment-management { padding: 1.25rem; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.875rem; }
          .balance-cards { grid-template-columns: repeat(2, 1fr); gap: 0.875rem; }
          .real-balance-section { padding: 1.25rem; }
          .balance-header { gap: 0.625rem; }
          .balance-title { font-size: 1.25rem; }
          .tab-navigation { flex-wrap: wrap; gap: 0.5rem; }
          .tab-btn { flex: 1 1 calc(50% - 0.25rem); padding: 0.8rem 1rem; font-size: 0.9rem; }
          .category-cards-container { grid-template-columns: repeat(3, 1fr); gap: 0.875rem; }
          .filter-card { flex-wrap: wrap; gap: 0.75rem; }
          .filter-select { min-width: 140px; }
          .modal-content { width: 90%; }
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .balance-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .payment-management {
            padding: 1rem;
          }

          .loading-container {
            padding: 2rem 2.5rem;
            margin: 1rem;
            border-radius: 20px;
          }

          .loading-logo {
            width: 70px;
            height: 70px;
          }

          .logo-icon {
            font-size: 2rem;
          }

          .loading-text h3 {
            font-size: 1.125rem;
          }

          .loading-text p {
            font-size: 0.875rem;
          }

          .loading-progress {
            width: 160px;
          }

          .category-section {
            padding: 1rem;
          }

          .category-section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .category-cards-container {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
          }

          .category-card-main {
            padding: 1rem 0.75rem;
          }

          .category-card-icon-wrapper {
            width: 48px;
            height: 48px;
          }

          .category-card-icon-main {
            font-size: 1.5rem;
          }

          .category-card-name-main {
            font-size: 0.75rem;
          }

          .quick-add-fields {
            flex-direction: column;
          }

          .quick-field {
            width: 100%;
            min-width: auto;
          }

          .quick-field-wide {
            min-width: auto;
          }

          .quick-add-btn {
            width: 100%;
            justify-content: center;
          }

          .real-balance-section {
            padding: 1.25rem;
            border-radius: 16px;
          }

          .balance-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .balance-title {
            font-size: 1.125rem;
          }

          .balance-cards {
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }

          .balance-card {
            padding: 1rem;
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .balance-icon-wrapper {
            width: 44px;
            height: 44px;
          }

          .balance-icon {
            font-size: 1.25rem;
          }

          .balance-info {
            align-items: center;
          }

          .balance-amount {
            font-size: 1rem;
          }

          .total-balance .balance-amount {
            font-size: 1.125rem;
          }

          .tab-navigation {
            flex-direction: column;
            gap: 0.375rem;
            padding: 0.375rem;
          }

          .tab-btn {
            padding: 0.875rem 1rem;
            font-size: 0.9375rem;
          }

          .tab-icon {
            font-size: 1.1rem;
          }

          .transaction-type-selector {
            flex-direction: column;
            gap: 0.75rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .stat-card {
            padding: 0.875rem 1rem;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .stat-value {
            font-size: 1.125rem;
          }

          .stat-label {
            font-size: 0.6875rem;
          }

          .filter-card {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-left {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-item {
            width: 100%;
          }

          .filter-select {
            min-width: auto;
            width: 100%;
          }

          .btn-add-compact {
            width: 100%;
            justify-content: center;
          }

          .table-view {
            overflow-x: auto;
          }

          .payments-table {
            min-width: 800px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
            max-height: 95vh;
          }

          .modal-header {
            padding: 1.5rem;
          }

          .modal-header h2 {
            font-size: 1.375rem;
          }

          .payment-form {
            padding: 1.5rem;
          }

          .category-cards-grid {
            grid-template-columns: repeat(3, 1fr);
            max-height: 280px;
            gap: 0.5rem;
          }

          .category-card {
            padding: 0.75rem 0.375rem;
          }

          .category-card-icon {
            font-size: 1.25rem;
          }

          .category-card-name {
            font-size: 0.625rem;
          }
        }

        @media (max-width: 480px) {
          .stat-icon {
            width: 50px;
            height: 50px;
            font-size: 2rem;
          }

          .stat-value {
            font-size: 1.5rem;
          }

          .modal-header {
            padding: 1.25rem;
          }

          .payment-form {
            padding: 1.25rem;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions button {
            width: 100%;
          }

          .success-notification {
            top: 1rem;
            right: 1rem;
            left: 1rem;
          }

          .success-content {
            min-width: auto;
          }

          .delete-modal {
            width: 95%;
          }

          .delete-modal-header {
            padding: 1.5rem;
          }

          .delete-icon-wrapper {
            width: 60px;
            height: 60px;
          }

          .delete-icon {
            font-size: 2rem;
          }

          .delete-title {
            font-size: 1.375rem;
          }

          .delete-modal-body {
            padding: 1.5rem;
          }

          .delete-modal-footer {
            padding: 1rem 1.5rem;
            flex-direction: column;
          }

          .category-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            max-height: 240px;
          }

          .category-card {
            padding: 0.625rem 0.25rem;
            gap: 0.375rem;
          }

          .category-card-icon {
            font-size: 1.125rem;
          }

          .category-card-name {
            font-size: 0.5625rem;
          }

          .category-card.selected::after {
            width: 14px;
            height: 14px;
            font-size: 0.5rem;
            top: 4px;
            right: 4px;
          }
        }

        /* ==================== CATEGORY DETAIL BUTTON ==================== */
        .category-card-clickable {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          cursor: pointer;
        }

        .category-detail-btn {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: var(--cat-color);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: all 0.25s ease;
          opacity: 0;
          transform: scale(0.8);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .category-card-main:hover .category-detail-btn {
          opacity: 1;
          transform: scale(1);
        }

        .category-detail-btn:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* ==================== CATEGORY DETAIL MODAL ==================== */
        .category-detail-modal {
          background: white;
          border-radius: 20px;
          width: 95%;
          max-width: 900px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .category-modal-header {
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .category-modal-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 60%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .category-modal-title-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .category-modal-icon-wrapper {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .category-modal-icon {
          font-size: 2rem;
        }

        .category-modal-title-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .category-modal-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
        }

        .category-modal-subtitle {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .category-modal-close {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 1.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          position: relative;
          z-index: 1;
        }

        .category-modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .category-modal-body {
          padding: 1.5rem 2rem 2rem;
          overflow-y: auto;
          flex: 1;
        }

        /* ==================== CATEGORY STATS SECTION ==================== */
        .category-stats-section {
          margin-bottom: 2rem;
        }

        .category-stats-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }

        .category-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .category-stat-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 1.25rem;
          border: 2px solid #e2e8f0;
          transition: all 0.25s ease;
        }

        .category-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .category-stat-card.current {
          border-color: #d97706;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .category-stat-card.previous {
          border-color: #94a3b8;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .category-stat-card.comparison {
          border-color: #8b5cf6;
          background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%);
        }

        .category-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px dashed #e2e8f0;
        }

        .category-stat-month {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
        }

        .category-stat-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .current-badge {
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: white;
        }

        .previous-badge {
          background: #94a3b8;
          color: white;
        }

        .up-badge {
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: white;
        }

        .down-badge {
          background: linear-gradient(135deg, #ef4444, #f87171);
          color: white;
        }

        .section-header-compact {
          margin-bottom: 1.5rem;
          padding: 1.25rem 1.5rem;
          background: white;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #d97706;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-title-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .section-title-icon {
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.15);
        }

        .section-title-text {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.025em;
        }

        .category-stat-amounts {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .category-stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .category-stat-row span:first-child {
          color: #64748b;
          font-weight: 500;
        }

        .category-stat-row span:last-child {
          font-weight: 700;
          color: #1e293b;
        }

        .category-stat-row.income span:last-child {
          color: #d97706;
        }

        .category-stat-row.expense span:last-child {
          color: #ef4444;
        }

        .category-stat-row.total {
          padding-top: 0.5rem;
          border-top: 1px solid #e2e8f0;
          margin-top: 0.375rem;
        }

        .category-stat-row.total span:last-child {
          font-size: 1rem;
        }

        .category-stat-count {
          margin-top: 0.875rem;
          padding-top: 0.75rem;
          border-top: 2px dashed #e2e8f0;
          text-align: center;
          font-size: 0.8125rem;
          color: #64748b;
          font-weight: 600;
        }

        /* ==================== CATEGORY HISTORY SECTION ==================== */
        .category-history-section {
          margin-top: 1rem;
        }

        .category-history-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }

        .category-history-table-wrapper {
          background: #f8fafc;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
          overflow: hidden;
          max-height: 300px;
          overflow-y: auto;
        }

        .category-history-table {
          width: 100%;
          border-collapse: collapse;
        }

        .category-history-table th,
        .category-history-table td {
          padding: 0.875rem 1rem;
          text-align: left;
          font-size: 0.875rem;
        }

        .category-history-table th {
          background: linear-gradient(135deg, #92400e, #d97706);
          color: white;
          font-weight: 700;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .category-history-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .category-history-table tbody tr:last-child {
          border-bottom: none;
        }

        .category-history-table tbody tr:hover {
          background: white;
        }

        .category-empty-state {
          padding: 3rem;
          text-align: center;
          background: #f8fafc;
          border-radius: 16px;
          border: 2px dashed #e2e8f0;
        }

        .category-empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }

        .category-empty-state p {
          margin: 0;
          color: #64748b;
          font-weight: 500;
        }

        /* ==================== CATEGORY FULL PAGE ==================== */
        .category-full-page {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .category-page-header {
          padding: 1.5rem 2rem;
          border-radius: 16px;
          color: white;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .category-page-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }

        .category-back-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }

        .category-back-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateX(-2px);
        }

        .category-page-title-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .category-page-icon-wrapper {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }

        .category-page-icon {
          font-size: 2rem;
        }

        .category-page-title-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .category-page-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .category-page-subtitle {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        /* ==================== CATEGORY PAGE FILTERS ==================== */
        .category-page-filters {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          margin-top: 1.5rem;
          padding: 1rem 1.5rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-group .filter-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
        }

        .filter-group .filter-select {
          min-width: 140px;
        }

        .category-page-filters .btn-add-compact {
          margin-left: auto;
        }

        /* ==================== CATEGORY CHART SECTION ==================== */
        .category-chart-section {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .category-chart-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }

        .category-chart-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .category-chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          height: 200px;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .chart-bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          height: 100%;
        }

        .chart-bars {
          display: flex;
          gap: 2px;
          align-items: flex-end;
          height: 100%;
          width: 100%;
          max-width: 40px;
        }

        .chart-bar {
          flex: 1;
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .chart-bar:hover {
          opacity: 0.8;
          transform: scaleY(1.02);
        }

        .income-bar {
          background: linear-gradient(180deg, #d97706, #b45309);
        }

        .expense-bar {
          background: linear-gradient(180deg, #ef4444, #dc2626);
        }

        .chart-month-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 2rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .income-color {
          background: linear-gradient(180deg, #d97706, #b45309);
        }

        .expense-color {
          background: linear-gradient(180deg, #ef4444, #dc2626);
        }

        /* ==================== CATEGORY TRANSACTIONS SECTION ==================== */
        .category-transactions-section {
          margin-top: 1.5rem;
        }

        .category-transactions-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }

        /* ==================== CATEGORY CARD ENHANCEMENTS ==================== */
        .category-card-clickable-full {
          cursor: pointer;
          transition: all 0.3s ease;
          flex-direction: column;
          padding: 1.25rem;
          position: relative;
        }

        .category-card-clickable-full:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
          border-color: var(--cat-color);
        }

        .category-card-stats {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          margin-top: 0.5rem;
        }

        .cat-stat-count {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 500;
        }

        .cat-stat-amount {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .cat-stat-amount.positive {
          color: #d97706;
        }

        .cat-stat-amount.negative {
          color: #ef4444;
        }

        .category-card-arrow {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.25rem;
          color: #94a3b8;
          transition: all 0.2s ease;
        }

        .category-card-clickable-full:hover .category-card-arrow {
          transform: translateY(-50%) translateX(4px);
          color: var(--cat-color);
        }

        .category-section-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0.25rem 0 0 0;
          font-weight: 500;
        }

        /* ==================== DELETE COMMENT MODAL ==================== */
        .delete-comment-modal {
          max-width: 480px;
        }

        .delete-comment-section {
          margin-top: 1rem;
        }

        .delete-comment-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .required-mark {
          color: #ef4444;
          margin-right: 0.25rem;
        }

        .delete-comment-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .delete-comment-input:focus {
          outline: none;
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .delete-comment-input::placeholder {
          color: #94a3b8;
        }

        .confirm-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .confirm-delete-btn:disabled:hover {
          transform: none;
          box-shadow: none;
        }

        /* Category Modal Responsive */

        @media (max-width: 768px) {
          .category-detail-modal {
            width: 100%;
            max-height: 95vh;
            border-radius: 16px 16px 0 0;
          }

          .category-modal-header {
            padding: 1.25rem 1.5rem;
          }

          .category-modal-icon-wrapper {
            width: 48px;
            height: 48px;
          }

          .category-modal-icon {
            font-size: 1.5rem;
          }

          .category-modal-title {
            font-size: 1.25rem;
          }

          .category-modal-body {
            padding: 1rem 1.5rem 1.5rem;
          }

          .category-stats-grid {
            grid-template-columns: 1fr;
          }

          .category-history-table th,
          .category-history-table td {
            padding: 0.625rem 0.75rem;
            font-size: 0.8125rem;
          }

          /* Category Page Responsive */
          .category-page-header {
            flex-direction: column;
            padding: 1.25rem;
            gap: 1rem;
          }

          .category-back-btn {
            align-self: flex-start;
          }

          .category-page-title-section {
            width: 100%;
          }

          .category-page-icon-wrapper {
            width: 48px;
            height: 48px;
          }

          .category-page-icon {
            font-size: 1.5rem;
          }

          .category-page-title {
            font-size: 1.25rem;
          }

          .category-page-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group {
            width: 100%;
          }

          .filter-group .filter-select {
            width: 100%;
          }

          .category-page-filters .btn-add-compact {
            margin-left: 0;
            width: 100%;
            justify-content: center;
          }

          .category-chart-bars {
            height: 150px;
            gap: 0.25rem;
            padding: 0.75rem;
          }

          .chart-month-label {
            font-size: 0.5625rem;
          }

          .category-card-clickable-full {
            padding: 1rem;
          }

          .category-card-arrow {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .category-chart-section {
            padding: 1rem;
          }

          .chart-legend {
            gap: 1rem;
            flex-wrap: wrap;
          }

          .legend-item {
            font-size: 0.75rem;
          }
        }
      `}</style>

    </div>
  );
};

export default PaymentManagement;
