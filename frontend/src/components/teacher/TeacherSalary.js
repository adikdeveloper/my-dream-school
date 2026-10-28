import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../../services/apiService';
import { formatUzShortDate } from '../../utils/uzDate';
import TeacherUiIcon from './TeacherUiIcon';
import styles from './TeacherSalary.module.css';

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

const TRANSACTION_META = {
  lesson_taught: { label: "Baho qo'yildi", icon: 'assignment', tone: 'green' },
  lesson_missed: { label: 'Darsga kelmadi', icon: 'close', tone: 'red' },
  lesson_covered: { label: "O'rnini bosib dars o'tildi", icon: 'star', tone: 'gold' },
  bonus: { label: 'Bonus', icon: 'coins', tone: 'gold' },
  deduction: { label: 'Chegirma', icon: 'warning', tone: 'red' }
};

const TeacherSalary = () => {
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
    } catch (err) {
      setError(err.response?.data?.message || "Maosh ma'lumotlarini yuklashda xatolik");
      setSalaryData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadSalaryData();
  }, [loadSalaryData]);

  const formatCurrency = (amount) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(Number(amount) || 0))} so'm`;

  const formatDate = (date) => formatUzShortDate(date, { year: true }) || '—';

  const handleMonthChange = (direction) => {
    let nextMonth = selectedMonth + direction;
    let nextYear = selectedYear;
    if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }
    if (nextMonth < 1) { nextMonth = 12; nextYear -= 1; }
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  };

  const grossSalary = salaryData?.grossSalary != null
    ? salaryData.grossSalary
    : (salaryData?.totalEarned || 0) - (salaryData?.totalDeductions || 0);

  const taxRate = Math.round((salaryData?.incomeTaxRate != null ? salaryData.incomeTaxRate : 0.12) * 100);
  const taxAmount = salaryData?.incomeTaxAmount || 0;
  const netSalary = salaryData?.netSalary || 0;

  const transactions = useMemo(() => {
    const list = Array.isArray(salaryData?.transactions) ? [...salaryData.transactions] : [];
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [salaryData?.transactions]);

  const stats = [
    {
      label: "Baho qo'yilgan darslar",
      value: salaryData?.totalLessonsTaught || 0,
      note: 'Maosh hisoblangan darslar',
      icon: 'assignment',
      tone: 'green'
    },
    {
      label: "O'tkazib yuborilgan",
      value: salaryData?.totalLessonsMissed || 0,
      note: 'Hisobga olinmagan darslar',
      icon: 'close',
      tone: 'red'
    },
    {
      label: "O'rinbosarlik",
      value: salaryData?.totalLessonsCovered || 0,
      note: "O'rniga o'tilgan darslar",
      icon: 'star',
      tone: 'gold'
    },
    {
      label: 'Dars uchun to\'lov',
      value: formatCurrency(salaryData?.baseSalaryPerLesson || 0),
      note: 'Bitta dars narxi',
      icon: 'salary',
      tone: 'navy',
      compact: true
    }
  ];

  return (
    <div className={styles.salary}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Moliya</p>
          <h1 className={styles.title}>Maosh</h1>
          <p className={styles.subtitle}>Darslar, bonuslar va soliq hisob-kitobi bir joyda.</p>
        </div>
        <div className={styles.monthPicker} aria-label="Oy tanlash">
          <button type="button" onClick={() => handleMonthChange(-1)} aria-label="Oldingi oy">
            <TeacherUiIcon name="chevron" size={15} className={styles.prevIcon} />
          </button>
          <span>{MONTHS[selectedMonth - 1]} {selectedYear}</span>
          <button type="button" onClick={() => handleMonthChange(1)} aria-label="Keyingi oy">
            <TeacherUiIcon name="chevron" size={15} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingGrid}>
          <div className={`td-skeleton ${styles.loadingHero}`} />
          <div className={styles.loadingCards}>
            {[1, 2, 3, 4].map((item) => <div className={`td-skeleton ${styles.loadingCard}`} key={item} />)}
          </div>
        </div>
      ) : error || !salaryData ? (
        <div className={`td-card ${styles.errorCard}`}>
          <span className={styles.errorIcon}><TeacherUiIcon name="warning" size={22} /></span>
          <strong>{error || "Maosh ma'lumotlari topilmadi"}</strong>
          <p>Tanlangan oy uchun hisob-kitob hali shakllanmagan bo'lishi mumkin.</p>
          <button type="button" className="td-btn td-btn--gold" onClick={loadSalaryData}>Qayta urinish</button>
        </div>
      ) : (
        <>
          <section className={styles.hero}>
            <div className={styles.heroMain}>
              <span className={styles.heroLabel}>Sof maosh</span>
              <strong className={styles.heroAmount}>{formatCurrency(netSalary)}</strong>
              <span className={styles.heroPeriod}>{MONTHS[selectedMonth - 1]} {selectedYear} · soliq ushlangandan keyin</span>
              <span className={styles.heroBadge}>
                <TeacherUiIcon name="check" size={13} /> Hisob-kitob yakunlangan
              </span>
            </div>
            <div className={styles.heroBreakdown}>
              <div>
                <span>Jami daromad</span>
                <strong className={styles.positive}>+{formatCurrency(salaryData.totalEarned || 0)}</strong>
              </div>
              <div>
                <span>Bonuslar</span>
                <strong className={styles.positive}>+{formatCurrency(salaryData.totalBonuses || 0)}</strong>
              </div>
              <div>
                <span>Chegirmalar</span>
                <strong className={styles.negative}>−{formatCurrency(salaryData.totalDeductions || 0)}</strong>
              </div>
              <div>
                <span>Daromad solig'i ({taxRate}%)</span>
                <strong className={styles.negative}>−{formatCurrency(taxAmount)}</strong>
              </div>
            </div>
          </section>

          <section className={styles.stats}>
            {stats.map((stat) => (
              <article className={styles.statCard} key={stat.label}>
                <span className={`${styles.statIcon} ${styles[`tone_${stat.tone}`]}`}>
                  <TeacherUiIcon name={stat.icon} size={18} />
                </span>
                <div>
                  <strong className={stat.compact ? styles.statValueCompact : styles.statValue}>{stat.value}</strong>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <small>{stat.note}</small>
                </div>
              </article>
            ))}
          </section>

          <div className={styles.grid}>
            <section className={`td-card ${styles.card}`}>
              <div className="td-card-head">
                <div>
                  <h2 className="td-card-title">Tranzaksiyalar tarixi</h2>
                  <p className="td-card-sub">{transactions.length > 0 ? `${transactions.length} ta yozuv` : "Bu oy uchun yozuvlar yo'q"}</p>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="td-empty">
                  <span className="td-empty-icon"><TeacherUiIcon name="salary" size={20} /></span>
                  <strong>Tranzaksiyalar yo'q</strong>
                  <span>Darslar baholangach, to'lovlar shu yerda ko'rinadi.</span>
                </div>
              ) : (
                <div className={styles.transactions}>
                  {transactions.map((transaction, index) => {
                    const meta = TRANSACTION_META[transaction.type] || { label: 'Boshqa', icon: 'info', tone: 'gray' };
                    const positive = Number(transaction.amount) >= 0;
                    return (
                      <div className={styles.transaction} key={`${transaction.date}-${index}`}>
                        <span className={`${styles.transactionIcon} ${styles[`tone_${meta.tone}`]}`}>
                          <TeacherUiIcon name={meta.icon} size={16} />
                        </span>
                        <div className={styles.transactionInfo}>
                          <strong>{meta.label}</strong>
                          <span>
                            {formatDate(transaction.date)}
                            {transaction.relatedSubject?.name ? ` · ${transaction.relatedSubject.name}` : ''}
                            {transaction.relatedClass?.name ? ` · ${transaction.relatedClass.name}` : ''}
                          </span>
                          {transaction.description && <small>{transaction.description}</small>}
                          {transaction.coveredForTeacher && (
                            <small>Kimning o'rniga: {transaction.coveredForTeacher.firstName} {transaction.coveredForTeacher.lastName}</small>
                          )}
                        </div>
                        <strong className={`${styles.transactionAmount} ${positive ? styles.positive : styles.negative}`}>
                          {positive ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount || 0))}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className={styles.side}>
              <section className={`td-card ${styles.card}`}>
                <div className="td-card-head">
                  <div>
                    <h2 className="td-card-title">Oylik hisob-kitob</h2>
                    <p className="td-card-sub">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
                  </div>
                </div>
                <div className={styles.breakdown}>
                  <div>
                    <span>Jami daromad</span>
                    <strong>{formatCurrency(salaryData.totalEarned || 0)}</strong>
                  </div>
                  <div>
                    <span>Chegirmalar</span>
                    <strong className={styles.negative}>−{formatCurrency(salaryData.totalDeductions || 0)}</strong>
                  </div>
                  <div>
                    <span>Bonuslar</span>
                    <strong className={styles.positive}>+{formatCurrency(salaryData.totalBonuses || 0)}</strong>
                  </div>
                  <div>
                    <span>Soliqdan oldin</span>
                    <strong>{formatCurrency(grossSalary)}</strong>
                  </div>
                  <div>
                    <span>JShDS ({taxRate}%)</span>
                    <strong className={styles.negative}>−{formatCurrency(taxAmount)}</strong>
                  </div>
                  <div className={styles.breakdownTotal}>
                    <span>Sof maosh</span>
                    <strong>{formatCurrency(netSalary)}</strong>
                  </div>
                </div>
              </section>

              <section className={styles.infoCard}>
                <span className={styles.infoIcon}><TeacherUiIcon name="info" size={18} /></span>
                <div>
                  <strong>Maosh qanday hisoblanadi?</strong>
                  <p>To'lov faqat baho qo'yilgan darslar uchun hisoblanadi. Baholanmagan darslar maoshga kiritilmaydi.</p>
                  <p>O'zbekiston qonunchiligiga ko'ra ish haqidan 12% JShDS ushlab qolinadi.</p>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherSalary;
