import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import styles from './TeacherSalary.module.css';
import TeacherUiIcon from './TeacherUiIcon';

const TeacherSalary = () => {
  useAuth();
  const [salaryData, setSalaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const loadSalaryData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiService.getTeacherMonthlySalary(selectedYear, selectedMonth);
      setSalaryData(data);
    } catch (error) {
      setError(error.response?.data?.message || 'Maosh ma\'lumotlarini yuklashda xatolik');
      setSalaryData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadSalaryData();
  }, [loadSalaryData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Kalendar oy nomi (selectedMonth = 1..12, Yanvar=1)
  const getMonthName = (month) => {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];
    return months[month - 1] || 'Noma\'lum';
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'lesson_taught':
        return '📝';
      case 'lesson_missed':
        return '❌';
      case 'lesson_covered':
        return '⭐';
      case 'bonus':
        return '🎁';
      case 'deduction':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'lesson_taught':
        return 'Baho qo\'yildi';
      case 'lesson_missed':
        return 'Darsga kelmadi';
      case 'lesson_covered':
        return 'O\'rnini bosib dars o\'tildi';
      case 'bonus':
        return 'Bonus';
      case 'deduction':
        return 'Chegirma';
      default:
        return 'Boshqa';
    }
  };

  const handleMonthChange = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const header = (
    <div className={styles.salaryHeader}>
      <h1 className={styles.pageTitle}><TeacherUiIcon name="salary" size={24} /> Maosh ma'lumotlari</h1>
      <div className={styles.monthSelector}>
        <button className={styles.monthNavBtn} onClick={() => handleMonthChange(-1)} aria-label="Oldingi oy">
          ←
        </button>
        <div className={styles.currentMonth}>
          {getMonthName(selectedMonth)} {selectedYear}
        </div>
        <button className={styles.monthNavBtn} onClick={() => handleMonthChange(1)} aria-label="Keyingi oy">
          →
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.teacherSalary}>
        {header}
        <div className={styles.loadingMessage}>Maosh ma'lumotlari yuklanmoqda...</div>
      </div>
    );
  }

  if (error || !salaryData) {
    return (
      <div className={styles.teacherSalary}>
        {header}
        <div className={styles.errorBox}>
          <span><TeacherUiIcon name="warning" size={17} /> {error || "Maosh ma'lumotlari topilmadi"}</span>
          <button className={styles.retryBtn} onClick={loadSalaryData}>Qayta urinish</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.teacherSalary} ${styles.fadeIn}`}>
      {header}

      {/* Main Salary Card */}
      <div className={styles.salarySummaryCard}>
        <div className={styles.salaryAmountSection}>
          <div className={styles.salaryLabel}>Sof maosh</div>
          <div className={styles.salaryAmount}>{formatCurrency(salaryData.netSalary || 0)}</div>
          <div className={styles.salaryPeriod}>{getMonthName(selectedMonth)} oyi uchun</div>
        </div>

        <div className={styles.salaryBreakdown}>
          <div className={`${styles.breakdownItem} ${styles.positive}`}>
            <span className={styles.breakdownLabel}>Jami daromad</span>
            <span className={styles.breakdownValue}>+{formatCurrency(salaryData.totalEarned || 0)}</span>
          </div>
          <div className={`${styles.breakdownItem} ${styles.negative}`}>
            <span className={styles.breakdownLabel}>Chegirmalar</span>
            <span className={styles.breakdownValue}>-{formatCurrency(salaryData.totalDeductions || 0)}</span>
          </div>
          <div className={`${styles.breakdownItem} ${styles.bonus}`}>
            <span className={styles.breakdownLabel}>Bonuslar</span>
            <span className={styles.breakdownValue}>+{formatCurrency(salaryData.totalBonuses || 0)}</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Soliqdan oldin</span>
            <span className={styles.breakdownValue}>
              {formatCurrency(salaryData.grossSalary != null ? salaryData.grossSalary : ((salaryData.totalEarned || 0) - (salaryData.totalDeductions || 0)))}
            </span>
          </div>
          <div className={`${styles.breakdownItem} ${styles.negative}`}>
            <span className={styles.breakdownLabel}>
              Daromad solig'i (JShDS, {Math.round((salaryData.incomeTaxRate != null ? salaryData.incomeTaxRate : 0.12) * 100)}%)
            </span>
            <span className={styles.breakdownValue}>-{formatCurrency(salaryData.incomeTaxAmount || 0)}</span>
          </div>
        </div>
      </div>

      {/* Salary Info Banner */}
      <div className={styles.salaryInfoBanner}>
        <div className={styles.infoIcon}><TeacherUiIcon name="info" size={20} /></div>
        <div className={styles.infoText}>
          Maosh faqat <strong>baho qo'yilgan</strong> darslar uchun hisoblanadi.
          Baho qo'yilmagan darslarga to'lov hisoblanmaydi.
        </div>
      </div>

      {/* Soliq tushuntirishi */}
      <div className={styles.salaryInfoBanner}>
        <div className={styles.infoIcon}><TeacherUiIcon name="test" size={20} /></div>
        <div className={styles.infoText}>
          <strong>Nega 12% olinadi?</strong> O'zbekiston qonunchiligiga ko'ra ish haqidan{' '}
          <strong>jismoniy shaxslardan olinadigan daromad solig'i (JShDS)</strong> — yagona 12% stavkada ushlab qolinadi.
          "Sof maosh" — bu soliq ushlangandan keyin qo'lingizga tegadigan summa.
        </div>
      </div>

      {/* Statistics Grid */}
      <div className={styles.salaryStatsGrid}>
        <div className={`${styles.statCard} ${styles.graded}`}>
          <div className={styles.statIcon}><TeacherUiIcon name="assignment" size={22} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{salaryData.totalLessonsTaught || 0}</div>
            <div className={styles.statLabel}>Baho qo'yilgan darslar</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.missed}`}>
          <div className={styles.statIcon}><TeacherUiIcon name="close" size={22} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{salaryData.totalLessonsMissed || 0}</div>
            <div className={styles.statLabel}>O'tkazib yuborildi</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.covered}`}>
          <div className={styles.statIcon}><TeacherUiIcon name="star" size={22} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{salaryData.totalLessonsCovered || 0}</div>
            <div className={styles.statLabel}>O'rnini bosib o'tildi</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.payment}`}>
          <div className={styles.statIcon}><TeacherUiIcon name="salary" size={22} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{formatCurrency(salaryData.baseSalaryPerLesson || 0)}</div>
            <div className={styles.statLabel}>Dars uchun to'lov</div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className={styles.transactionsSection}>
        <h2 className={styles.sectionTitle}>Tranzaksiyalar tarixi</h2>
        {salaryData.transactions && salaryData.transactions.length > 0 ? (
          <div className={styles.transactionsList}>
            {salaryData.transactions
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((transaction, index) => (
                <div key={index} className={`${styles.transactionItem} ${transaction.amount >= 0 ? styles.transactionPositive : styles.transactionNegative}`}>
                  <div className={styles.transactionIcon}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className={styles.transactionDetails}>
                    <div className={styles.transactionTitle}>
                      {getTransactionLabel(transaction.type)}
                    </div>
                    <div className={styles.transactionInfo}>
                      {formatDate(transaction.date)}
                      {transaction.relatedSubject && ` • ${transaction.relatedSubject.name}`}
                      {transaction.relatedClass && ` • ${transaction.relatedClass.name}`}
                    </div>
                    {transaction.description && (
                      <div className={styles.transactionDescription}>{transaction.description}</div>
                    )}
                    {transaction.coveredForTeacher && (
                      <div className={styles.transactionNote}>
                        Kimning o'rniga: {transaction.coveredForTeacher.firstName} {transaction.coveredForTeacher.lastName}
                      </div>
                    )}
                    {transaction.coveredByTeacher && (
                      <div className={styles.transactionNote}>
                        O'rningizga o'tdi: {transaction.coveredByTeacher.firstName} {transaction.coveredByTeacher.lastName}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.transactionAmount} ${transaction.amount >= 0 ? styles.amountPositive : styles.amountNegative}`}>
                    {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className={styles.noTransactions}>
            Bu oyda hali tranzaksiyalar mavjud emas
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSalary;
