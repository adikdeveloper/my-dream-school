/**
 * AdminHome.js - Admin Dashboard Bosh Sahifasi
 * 
 * Bu komponent admin panelining asosiy bosh sahifasini ko'rsatadi.
 * Quyidagi bo'limlarni o'z ichiga oladi:
 * - Xush kelibsiz bo'limi (vaqt va sana bilan)
 * - Statistika kartalari (o'quvchilar, o'qituvchilar, sinflar, fanlar)
 * - Tezkor amallar (foydalanuvchi, sinf, fan, to'lov qo'shish)
 * - So'nggi harakatlar (real-time faoliyat)
 * - Statistika grafiklari (moliyaviy, baholar, davomat)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import LoadingOverlay from '../common/LoadingOverlay';
import styles from './AdminHome.module.css';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Chart.js registratsiyasi
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Oy nomlari (o'zbek tilida)
const MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

const HomeIcon = ({ name, size = 22 }) => {
  const paths = {
    students: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>,
    teachers: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a7 7 0 0 1 14 0v2M18 8l4 2-4 2-4-2 4-2Z" /></>,
    classes: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></>,
    subjects: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" /><path d="M8 8h8M8 12h6" /></>,
    payment: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    activity: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    chart: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
    empty: <><path d="M4 5h16v14H4zM4 8l8 6 8-6" /></>,
    plus: <path d="M12 5v14M5 12h14" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.chart}
    </svg>
  );
};

const hasChartValues = (chartData) =>
  chartData?.datasets?.some((dataset) =>
    Array.isArray(dataset.data) && dataset.data.some((value) => Number(value) > 0)
  );

const AdminHome = () => {
  const navigate = useNavigate();
  const { setLoading, setError } = useData();

  // ==================== STATE ====================

  // Asosiy statistika
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    changes: {
      students: '0%',
      teachers: '0%',
      studentChangeType: 'neutral',
      teacherChangeType: 'neutral'
    }
  });

  // So'nggi faoliyatlar
  const [recentActivities, setRecentActivities] = useState([]);

  // Vaqt va sana
  const [currentTime, setCurrentTime] = useState(new Date());

  // Loading holatlari
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  // Grafik ma'lumotlari
  const [paymentData, setPaymentData] = useState(null);
  const [gradeData, setGradeData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesDistData, setGradesDistData] = useState(null);

  // ==================== EFFECTS ====================

  // Real-time soat yangilanishi
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dashboard ma'lumotlarini yuklash
  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== DATA LOADING ====================

  /**
   * Dashboard uchun barcha ma'lumotlarni yuklaydi
   */
  const loadDashboardData = async () => {
    try {
      setDashboardError('');
      setIsLoadingDashboard(true);
      setLoading(true);

      // Statistika ma'lumotlarini yuklash
      const statsData = await apiService.getAdminStats();
      setStats(statsData);

      // Parallel ravishda qolgan ma'lumotlarni yuklash
      loadActivities();
      loadChartData();
    } catch (error) {
      const message = error.response?.data?.message || 'Dashboard ma\'lumotlarini yuklashda xatolik';
      setDashboardError(message);
      setError(message);
    } finally {
      setLoading(false);
      setIsLoadingDashboard(false);
    }
  };

  /**
   * So'nggi faoliyatlarni yuklaydi
   */
  const loadActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const activities = await apiService.getRecentActivities(3);
      setRecentActivities(activities);
    } catch {
      // Faoliyatlar yuklash muhim emas, xato ko'rsatmaymiz
      setRecentActivities([]);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  /**
   * Grafik ma'lumotlarini yuklaydi (to'lovlar, baholar, davomat)
   */
  const loadChartData = async () => {
    try {
      setIsLoadingCharts(true);

      // Parallel API chaqiruvlari
      const [paymentStats, gradeDistribution, attendanceStats] = await Promise.all([
        apiService.getPaymentStatistics().catch(() => null),
        apiService.getGradeDistributionReport().catch(() => null),
        apiService.getAttendanceSummaryReport().catch(() => null)
      ]);

      // To'lov statistikasini o'rnatish
      setPaymentChartData(paymentStats);

      // Baholar statistikasini o'rnatish
      setGradeChartData(gradeDistribution);

      // Davomat statistikasini o'rnatish
      setAttendanceChartData(attendanceStats);

    } catch {
      // Grafik xatolari ekranga chiqarilmaydi
    } finally {
      setIsLoadingCharts(false);
    }
  };

  // ==================== CHART DATA HELPERS ====================

  /**
   * To'lov grafigi ma'lumotlarini tayyorlaydi
   */
  const setPaymentChartData = (paymentStats) => {
    if (paymentStats?.monthlyData) {
      const months = paymentStats.monthlyData.map(item => MONTH_NAMES[item.month - 1] || `Oy ${item.month}`);
      const incomeData = paymentStats.monthlyData.map(item => item.total || 0);

      setPaymentData({
        labels: months,
        datasets: [{
          fill: true,
          label: 'Tushumlar (So\'m)',
          data: incomeData,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          tension: 0.4,
        }],
      });
    } else {
      // Ma'lumot yo'q bo'lsa fallback
      setPaymentData({
        labels: ['Ma\'lumot yo\'q'],
        datasets: [{
          fill: true,
          label: 'Tushumlar (So\'m)',
          data: [0],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          tension: 0.4,
        }],
      });
    }
  };

  /**
   * Baholar grafigi ma'lumotlarini tayyorlaydi
   */
  const setGradeChartData = (gradeDistribution) => {
    if (gradeDistribution?.distribution) {
      const dist = gradeDistribution.distribution;

      // Baholar taqsimoti (Doughnut)
      setGradesDistData({
        labels: ['A\'lo (5)', 'Yaxshi (4)', 'Qoniqarli (3)', 'Qoniqarsiz (2)'],
        datasets: [{
          label: 'Baholar soni',
          data: [dist['5'] || 0, dist['4'] || 0, dist['3'] || 0, dist['2'] || 0],
          backgroundColor: [
            '#2563eb',
            '#16a34a',
            '#f59e0b',
            '#ef4444',
          ],
          borderColor: [
            '#1d4ed8',
            '#166534',
            '#92400e',
            '#991b1b',
          ],
          borderWidth: 1,
        }],
      });

      // Sinflar bo'yicha o'rtacha (Bar)
      if (gradeDistribution.byClass?.length > 0) {
        const classLabels = gradeDistribution.byClass.map(c => c.className || c.name);
        const classAverages = gradeDistribution.byClass.map(c => c.average || 0);

        setGradeData({
          labels: classLabels,
          datasets: [{
            label: 'O\'rtacha o\'zlashtirish',
            data: classAverages,
            backgroundColor: '#60a5fa',
            borderColor: 'rgba(0,0,0,0)',
            borderWidth: 1,
            borderRadius: 8,
          }],
        });
      } else {
        setGradeData(null);
      }
    } else {
      // Fallback
      setGradesDistData({
        labels: ['A\'lo (5)', 'Yaxshi (4)', 'Qoniqarli (3)', 'Qoniqarsiz (2)'],
        datasets: [{
          label: 'Baholar soni',
          data: [0, 0, 0, 0],
          backgroundColor: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444'],
          borderWidth: 1,
        }],
      });
      setGradeData(null);
    }
  };

  /**
   * Davomat grafigi ma'lumotlarini tayyorlaydi
   */
  const setAttendanceChartData = (attendanceStats) => {
    if (attendanceStats) {
      const present = attendanceStats.present || attendanceStats.totalPresent || 0;
      const excused = attendanceStats.excused || attendanceStats.totalExcused || 0;
      const absent = attendanceStats.absent || attendanceStats.totalAbsent || 0;

      setAttendanceData({
        labels: ['Kelgan', 'Sababli', 'Sababsiz'],
        datasets: [{
          data: [present, excused, absent],
          backgroundColor: [
            '#16a34a',
            '#f59e0b',
            '#ef4444',
          ],
          borderColor: [
            '#166534',
            '#92400e',
            '#991b1b',
          ],
          borderWidth: 1,
          hoverOffset: 4
        }],
      });
    } else {
      // Fallback
      setAttendanceData({
        labels: ['Kelgan', 'Sababli', 'Sababsiz'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#16a34a', '#f59e0b', '#ef4444'],
          borderWidth: 1,
        }],
      });
    }
  };

  // ==================== NAVIGATION HANDLERS ====================

  const handleAddUser = () => navigate('/director/users');
  const handleCreateClass = () => navigate('/director/classes');
  const handleAddSubject = () => navigate('/director/subjects');
  const handleAddPayment = () => navigate('/director/payments');
  const handleViewAllActivities = () => navigate('/director/reports');

  // ==================== STATIC DATA ====================

  // Statistika kartalari
  const statCards = [
    {
      title: 'Jami o\'quvchilar',
      value: stats.totalStudents,
      icon: '👨‍🎓',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      change: stats.changes.students,
      changeType: stats.changes.studentChangeType
    },
    {
      title: 'Jami o\'qituvchilar',
      value: stats.totalTeachers,
      icon: '👨‍🏫',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      change: stats.changes.teachers,
      changeType: stats.changes.teacherChangeType
    },
    {
      title: 'Faol sinflar',
      value: stats.totalClasses,
      icon: '🏫',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Fanlar',
      value: stats.totalSubjects,
      icon: '📚',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      change: '0%',
      changeType: 'neutral'
    }
  ];

  // Tezkor amallar
  const quickActions = [
    { icon: '👤', label: 'Foydalanuvchi qo\'shish', color: '#667eea', handler: handleAddUser },
    { icon: '🏫', label: 'Sinf yaratish', color: '#f093fb', handler: handleCreateClass },
    { icon: '📚', label: 'Fan qo\'shish', color: '#4facfe', handler: handleAddSubject },
    { icon: '💰', label: 'To\'lov qo\'shish', color: '#00e096', handler: handleAddPayment }
  ];

  // ==================== RENDER ====================

  // Dashboard yuklanayotganda loading ko'rsatish
  if (isLoadingDashboard) {
    return <LoadingOverlay message="Dashboard yuklanmoqda" subMessage="Ma'lumotlar tayyorlanmoqda..." />;
  }

  return (
    <div className={styles.adminHome}>
      {/* Xush kelibsiz bo'limi */}
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.pageTitle}>
            Direktor boshqaruv paneli
          </h1>
          <p className={styles.pageDescription}>
            Maktab faoliyatini ushbu markaziy paneldan kuzating va boshqaring.
          </p>
        </div>
        <div className={styles.currentTime}>
          <div className={styles.timeDisplay}>
            {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className={styles.dateDisplay}>
            {currentTime.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {dashboardError && (
        <div className={styles.errorAlert} role="alert">
          <div>
            <strong>Ma'lumotlarni yuklab bo'lmadi</strong>
            <p>{dashboardError}</p>
          </div>
          <button type="button" onClick={loadDashboardData}>Qayta urinish</button>
        </div>
      )}

      {/* Statistika kartalari */}
      <div className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div key={index} className={`${styles.statCard} ${styles[`statTone${index + 1}`]}`}>
            <div className={styles.statIconWrapper}>
              <div className={styles.statIcon}>
                <HomeIcon name={['students', 'teachers', 'classes', 'subjects'][index]} />
              </div>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.title}</div>
            </div>
            <div className={`${styles.statChange} ${stat.changeType}`}>
              <span className={styles.changeArrow}>
                {stat.changeType === 'positive' ? '↑' : stat.changeType === 'negative' ? '↓' : '→'}
              </span>
              {stat.change}
            </div>
            <div className={styles.statDecoration}></div>
          </div>
        ))}
      </div>

      {/* Dashboard asosiy qismi */}
      <div className={styles.dashboardGrid}>
        {/* Tezkor amallar */}
        <div className={styles.quickActionsCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.titleIcon}><HomeIcon name="plus" size={18} /></span>
              Tezkor amallar
            </h2>
          </div>
          <div className={styles.actionGrid}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={styles.actionBtn}
                onClick={action.handler}
                aria-label={action.label}
              >
                <div className={styles.actionIcon}>
                  <HomeIcon name={['students', 'classes', 'subjects', 'payment'][index]} />
                </div>
                <span className={styles.actionLabel}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* So'nggi harakatlar */}
        <div className={styles.activitiesCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.titleIcon}><HomeIcon name="activity" size={18} /></span>
              So'nggi harakatlar
            </h2>
            <button
              className={styles.viewAllBtn}
              onClick={handleViewAllActivities}
              aria-label="Barcha harakatlarni ko'rish"
            >
              Barchasini ko'rish
            </button>
          </div>
          <div className={styles.activityList}>
            {isLoadingActivities ? (
              // Loading skeleton
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${styles.activityItem} ${styles.skeleton}`}>
                    <div className={styles.skeletonIcon}></div>
                    <div className={styles.skeletonContent}>
                      <div className={styles.skeletonText}></div>
                      <div className={styles.skeletonTextSmall}></div>
                    </div>
                  </div>
                ))}
              </>
            ) : recentActivities.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}><HomeIcon name="empty" size={28} /></span>
                <p className={styles.emptyText}>Hozircha faoliyat yo'q</p>
              </div>
            ) : (
              recentActivities.map((activity, index) => (
                <div key={activity.id} className={styles.activityItem} style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className={styles.activityIconWrapper} style={{ background: `${activity.color}15` }}>
                    <span className={styles.activityIcon}>{activity.icon}</span>
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityMessage}>{activity.message}</div>
                    <div className={styles.activityTime}>{activity.time}</div>
                  </div>
                  <div className={styles.activityDot} style={{ background: activity.color }}></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Statistika grafiklari */}
      <div className={styles.chartsSection}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <span className={styles.titleIcon}><HomeIcon name="chart" size={18} /></span>
            Statistika
          </h2>
        </div>

        {isLoadingCharts ? (
          <div className={`${styles.chartsGrid} ${styles.skeleton}`}>
            <div className={`${styles.chartCard} ${styles.skeleton}`} style={{ height: '300px' }}></div>
            <div className={`${styles.chartCard} ${styles.skeleton}`} style={{ height: '300px' }}></div>
          </div>
        ) : (
          <div className={styles.chartsGrid}>
            {/* Moliyaviy ko'rsatkichlar */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Moliyaviy ko'rsatkichlar</h3>
              <div className={styles.chartContainer}>
                {hasChartValues(paymentData) ? <Line data={paymentData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } }
                }} /> : (
                  <div className={styles.chartEmpty}>
                    <HomeIcon name="payment" size={28} />
                    <strong>Moliyaviy statistika uchun ma'lumot yo'q</strong>
                    <span>To'lovlar kiritilgach tushumlar grafigi shu yerda ko'rinadi.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sinflar o'zlashtirish ko'rsatkichi */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Sinflar o'zlashtirish ko'rsatkichi</h3>
              <div className={styles.chartContainer}>
                {hasChartValues(gradeData) ? <Bar data={gradeData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                  scales: { y: { beginAtZero: true, max: 5 } }
                }} /> : (
                  <div className={styles.chartEmpty}>
                    <HomeIcon name="chart" size={28} />
                    <strong>Hozircha baholar statistikasi yo'q</strong>
                    <span>Baholar kiritilgach sinflar ko'rsatkichi shu yerda chiqadi.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Kunlik davomat */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Davomat (Bugun)</h3>
              <div className={`${styles.chartContainer} ${styles.pieContainer}`}>
                {hasChartValues(attendanceData) ? <Pie data={attendanceData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right' } }
                }} /> : (
                  <div className={styles.chartEmpty}>
                    <HomeIcon name="students" size={28} />
                    <strong>Bugungi davomat hali kiritilmagan</strong>
                    <span>Davomat belgilanishi bilan diagramma avtomatik ko'rinadi.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Baholar taqsimoti */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Baholar taqsimoti</h3>
              <div className={`${styles.chartContainer} ${styles.pieContainer}`}>
                {hasChartValues(gradesDistData) ? <Doughnut data={gradesDistData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right' } }
                }} /> : (
                  <div className={styles.chartEmpty}>
                    <HomeIcon name="subjects" size={28} />
                    <strong>Baholar taqsimoti uchun ma'lumot yo'q</strong>
                    <span>O'quvchilarga baho qo'yilgach diagramma shakllanadi.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHome;
