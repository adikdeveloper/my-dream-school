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
      setIsLoadingDashboard(true);
      setLoading(true);

      // Statistika ma'lumotlarini yuklash
      const statsData = await apiService.getAdminStats();
      setStats(statsData);

      // Parallel ravishda qolgan ma'lumotlarni yuklash
      loadActivities();
      loadChartData();
    } catch (error) {
      setError(error.response?.data?.message || 'Dashboard ma\'lumotlarini yuklashda xatolik');
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
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.2)',
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
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.2)',
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
            'rgba(54, 162, 235, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 99, 132, 1)',
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
            backgroundColor: classLabels.map((_, i) => `hsla(${(i * 50) % 360}, 70%, 50%, 0.6)`),
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
          backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)', 'rgba(255, 99, 132, 0.6)'],
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
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)',
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
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderWidth: 1,
        }],
      });
    }
  };

  // ==================== NAVIGATION HANDLERS ====================

  const handleAddUser = () => navigate('/admin/users');
  const handleCreateClass = () => navigate('/admin/classes');
  const handleAddSubject = () => navigate('/admin/subjects');
  const handleAddPayment = () => navigate('/admin/payments');
  const handleViewAllActivities = () => navigate('/admin/reports');

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
            <span className={styles.wave}>👋</span>
            Administrator paneliga xush kelibsiz
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

      {/* Statistika kartalari */}
      <div className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div key={index} className={styles.statCard} style={{ background: stat.gradient }}>
            <div className={styles.statIconWrapper}>
              <div className={styles.statIcon}>{stat.icon}</div>
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
              <span className={styles.titleIcon}>⚡</span>
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
                <div className={styles.actionIcon} style={{ background: action.color }}>
                  {action.icon}
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
              <span className={styles.titleIcon}>🕐</span>
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
                <span className={styles.emptyIcon}>📭</span>
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
            <span className={styles.titleIcon}>📊</span>
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
                {paymentData && <Line data={paymentData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } }
                }} />}
              </div>
            </div>

            {/* Sinflar o'zlashtirish ko'rsatkichi */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Sinflar o'zlashtirish ko'rsatkichi</h3>
              <div className={styles.chartContainer}>
                {gradeData && <Bar data={gradeData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                  scales: { y: { beginAtZero: true, max: 5 } }
                }} />}
              </div>
            </div>

            {/* Kunlik davomat */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Davomat (Bugun)</h3>
              <div className={`${styles.chartContainer} ${styles.pieContainer}`}>
                {attendanceData && <Pie data={attendanceData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right' } }
                }} />}
              </div>
            </div>

            {/* Baholar taqsimoti */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Baholar taqsimoti</h3>
              <div className={`${styles.chartContainer} ${styles.pieContainer}`}>
                {gradesDistData && <Doughnut data={gradesDistData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right' } }
                }} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHome;
