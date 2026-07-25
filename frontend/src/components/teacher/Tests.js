import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import styles from './Tests.module.css';
import { Can } from '../../context/PermissionsContext';

const Tests = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // State
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  // Selected data
  const [selectedTest, setSelectedTest] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [previewTest, setPreviewTest] = useState(null);

  // Create test form
  const [createStep, setCreateStep] = useState(1);
  const [testInfo, setTestInfo] = useState({
    title: '',
    description: '',
    classId: '',
    subject: '',
    month: currentMonth,
    year: currentYear,
    testDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    duration: 45,
    totalPoints: 0
  });

  // Questions
  const [questions, setQuestions] = useState([]);

  // Create empty question helper
  const createEmptyQuestion = useCallback(() => ({
    questionText: '',
    questionType: 'single',
    points: 1,
    imageUrl: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    correctAnswer: '',
    id: Date.now()
  }), []);

  // Edit form
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    testDate: ''
  });

  // Results
  const [resultInputs, setResultInputs] = useState({});

  // Constants
  const months = useMemo(() => [
    { value: 1, label: 'Yanvar', short: 'Yan' },
    { value: 2, label: 'Fevral', short: 'Fev' },
    { value: 3, label: 'Mart', short: 'Mar' },
    { value: 4, label: 'Aprel', short: 'Apr' },
    { value: 5, label: 'May', short: 'May' },
    { value: 6, label: 'Iyun', short: 'Iyun' },
    { value: 7, label: 'Iyul', short: 'Iyul' },
    { value: 8, label: 'Avgust', short: 'Avg' },
    { value: 9, label: 'Sentyabr', short: 'Sen' },
    { value: 10, label: 'Oktyabr', short: 'Okt' },
    { value: 11, label: 'Noyabr', short: 'Noy' },
    { value: 12, label: 'Dekabr', short: 'Dek' }
  ], []);

  const questionTypes = [
    { value: 'single', label: 'Bir variantli', icon: '○' },
    { value: 'multiple', label: 'Ko\'p variantli', icon: '☐' },
    { value: 'text', label: 'Yozma javob', icon: '✎' },
    { value: 'image', label: 'Rasmli savol', icon: '🖼' }
  ];

  // API calls
  const fetchAssignedData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/tests/teacher/assigned`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClasses(response.data.classes);
      setSubjects(response.data.subjects);
    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xatolik');
    }
  }, []);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth
      });

      if (selectedClass) params.append('classId', selectedClass);
      if (selectedSubject) params.append('subjectId', selectedSubject);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/tests/teacher?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTests(response.data);
    } catch (err) {
      setError('Testlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedClass, selectedSubject]);

  const fetchStudentsByClass = useCallback(async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/classes/${classId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(response.data.students || []);
    } catch (err) {
      setError('O\'quvchilarni yuklashda xatolik');
    }
  }, []);

  useEffect(() => {
    fetchAssignedData();
  }, [fetchAssignedData]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  useEffect(() => {
    const total = questions.reduce((sum, q) => sum + (parseFloat(q.points) || 0), 0);
    setTestInfo(prev => ({ ...prev, totalPoints: Math.round(total * 10) / 10 }));
  }, [questions]);

  // Get available years from tests
  const availableYears = useMemo(() => {
    const years = new Set();
    tests.forEach(test => {
      if (test.year) {
        years.add(test.year);
      }
    });
    // Add current year if not present
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  }, [tests, currentYear]);

  // Filter available subjects - exclude subjects that already have tests for selected class+month+year
  const availableSubjects = useMemo(() => {
    if (!testInfo.classId || !testInfo.month || !testInfo.year) {
      return subjects;
    }

    // Get subject IDs that already have tests for this class+month+year
    const usedSubjectIds = tests
      .filter(test =>
        test.class?._id === testInfo.classId &&
        test.month === testInfo.month &&
        test.year === testInfo.year
      )
      .map(test => test.subject?._id);

    // Filter out used subjects
    return subjects.filter(subject => !usedSubjectIds.includes(subject._id));
  }, [subjects, tests, testInfo.classId, testInfo.month, testInfo.year]);

  // Helper function to format date for datetime-local input (local timezone)
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Modal handlers
  const openCreateModal = () => {
    setCreateStep(1);
    const now = new Date();
    const startDefault = new Date(now.getTime() + 60 * 60 * 1000);
    const endDefault = new Date(startDefault.getTime() + 60 * 60 * 1000);

    setTestInfo({
      title: '',
      description: '',
      classId: '',
      subject: '',
      month: currentMonth,
      year: currentYear,
      testDate: formatDateTimeLocal(new Date()).split('T')[0],
      startTime: formatDateTimeLocal(startDefault),
      endTime: formatDateTimeLocal(endDefault),
      duration: 45,
      totalPoints: 0
    });
    setQuestions([createEmptyQuestion()]);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep(1);
    setQuestions([]);
    setError('');
  };

  // Question handlers
  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion()]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const duplicateQuestion = (index) => {
    const original = questions[index];
    const questionToDuplicate = {
      ...original,
      id: Date.now(),
      options: original.options ? original.options.map(opt => ({ ...opt })) : []
    };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, questionToDuplicate);
    setQuestions(newQuestions);
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };

    if (field === 'questionType') {
      if (value === 'text') {
        newQuestions[index].options = [];
        newQuestions[index].correctAnswer = '';
      } else {
        newQuestions[index].options = [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ];
      }
    }

    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex, optionIndex, field, value, event) => {
    if (event && field === 'isCorrect') {
      event.stopPropagation();
    }

    const newQuestions = [...questions];
    const question = newQuestions[questionIndex];

    if (field === 'isCorrect' && (question.questionType === 'single' || question.questionType === 'image')) {
      question.options = question.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === optionIndex ? value : false
      }));
    } else {
      question.options[optionIndex] = { ...question.options[optionIndex], [field]: value };
    }

    setQuestions(newQuestions);
  };

  const addOption = (questionIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length < 6) {
      newQuestions[questionIndex].options.push({ text: '', isCorrect: false });
      setQuestions(newQuestions);
    }
  };

  const removeOption = (questionIndex, optionIndex, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options.splice(optionIndex, 1);
      setQuestions(newQuestions);
    }
  };

  // Image upload handler
  const handleImageUpload = async (questionIndex, file) => {
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Faqat rasm fayllarini yuklash mumkin');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/upload/image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      updateQuestion(questionIndex, 'imageUrl', response.data.url);
    } catch (err) {
      // If server upload fails, use local URL for preview
      const localUrl = URL.createObjectURL(file);
      updateQuestion(questionIndex, 'imageUrl', localUrl);
    }
  };

  const removeImage = (questionIndex) => {
    updateQuestion(questionIndex, 'imageUrl', '');
  };

  // Validation
  const validateStep1 = () => {
    if (!testInfo.title.trim()) {
      setError('Test nomini kiriting');
      return false;
    }
    if (!testInfo.classId) {
      setError('Sinfni tanlang');
      return false;
    }
    if (!testInfo.subject) {
      setError('Fanni tanlang');
      return false;
    }
    if (!testInfo.startTime) {
      setError('Test boshlanish vaqtini kiriting');
      return false;
    }
    if (!testInfo.endTime) {
      setError('Test tugash vaqtini kiriting');
      return false;
    }
    const start = new Date(testInfo.startTime);
    const end = new Date(testInfo.endTime);
    if (end <= start) {
      setError('Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak');
      return false;
    }
    setError('');
    return true;
  };

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`${i + 1}-savol matnini kiriting`);
        return false;
      }
      if (q.questionType !== 'text') {
        const hasCorrectAnswer = q.options.some(opt => opt.isCorrect);
        if (!hasCorrectAnswer) {
          setError(`${i + 1}-savol uchun to'g'ri javobni belgilang`);
          return false;
        }
        const hasEmptyOption = q.options.some(opt => !opt.text.trim());
        if (hasEmptyOption) {
          setError(`${i + 1}-savol variantlarini to'ldiring`);
          return false;
        }
      }
    }
    setError('');
    return true;
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      setCreateStep(2);
    }
  };

  const goToStep1 = () => {
    setCreateStep(1);
  };

  // CRUD operations
  const handleCreateTest = async () => {
    if (!validateQuestions()) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const testData = {
        title: testInfo.title,
        description: testInfo.description,
        subject: testInfo.subject,
        classId: testInfo.classId,
        month: testInfo.month,
        year: testInfo.year,
        testDate: testInfo.testDate,
        startTime: testInfo.startTime,
        endTime: testInfo.endTime,
        duration: testInfo.duration,
        questions: questions.map(q => ({
          questionText: q.questionText,
          questionType: q.questionType,
          points: parseFloat(q.points) || 1,
          imageUrl: q.imageUrl || '',
          options: q.questionType !== 'text' ? q.options : [],
          correctAnswer: q.questionType === 'text' ? q.correctAnswer : ''
        }))
      };

      await axios.post(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/tests`,
        testData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      closeCreateModal();
      setSuccess('Test muvaffaqiyatli yaratildi!');
      setTimeout(() => setSuccess(''), 3000);
      fetchTests();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Test yaratishda xatolik';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    setEditFormData({
      title: test.title,
      description: test.description || '',
      testDate: new Date(test.testDate).toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  const handleUpdateTest = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/tests/${editingTest._id}`,
        editFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowEditModal(false);
      setEditingTest(null);
      setSuccess('Test muvaffaqiyatli yangilandi!');
      setTimeout(() => setSuccess(''), 3000);
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.message || 'Testni yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTestToDelete(null);
  };

  // Confirm delete
  const handleDeleteTest = async () => {
    if (!testToDelete) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/tests/${testToDelete._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Test muvaffaqiyatli o\'chirildi!');
      setTimeout(() => setSuccess(''), 3000);
      closeDeleteModal();
      fetchTests();
    } catch (err) {
      setError(err.response?.data?.message || 'Testni o\'chirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (test) => {
    setSelectedTest(test);
    setShowResultsModal(true);
    await fetchStudentsByClass(test.class._id);

    const inputs = {};
    test.results?.forEach(result => {
      inputs[result.student._id] = result.score;
    });
    setResultInputs(inputs);
  };

  const handlePreviewTest = (test) => {
    setPreviewTest(test);
    setShowPreviewModal(true);
  };

  const handleAddResult = async (studentId) => {
    const score = resultInputs[studentId];

    if (score === undefined || score === null || score === '') {
      setError('Ballni kiriting');
      return;
    }

    if (score < 0 || score > 100) {
      setError('Ball 0 dan 100 gacha bo\'lishi kerak');
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'https://my-dream-school.onrender.com/api'}/tests/${selectedTest._id}/results`,
        { studentId, score: Number(score) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedTest(response.data);
      setSuccess('Natija muvaffaqiyatli saqlandi!');
      setTimeout(() => setSuccess(''), 3000);
      fetchTests();
    } catch (err) {
      setError('Natija qo\'shishda xatolik');
    }
  };

  const handleResultInputChange = (studentId, value) => {
    setResultInputs(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  // Get month name helper
  const getMonthName = (monthValue) => {
    return months.find(m => m.value === monthValue)?.label || '';
  };

  const getMonthShortName = (monthValue) => {
    return months.find(m => m.value === monthValue)?.short || '';
  };

  const getStudentResult = (studentId) => {
    return selectedTest?.results?.find(r => r.student._id === studentId);
  };

  const getTestStatus = (test) => {
    const now = new Date();
    const startTime = test.startTime ? new Date(test.startTime) : null;
    const endTime = test.endTime ? new Date(test.endTime) : null;

    if (startTime && endTime) {
      if (now < startTime) return { label: 'Kutilmoqda', class: 'upcoming' };
      if (now > endTime) return { label: 'Tugagan', class: 'ended' };
      return { label: 'Faol', class: 'active' };
    }
    return { label: 'Noma\'lum', class: 'unknown' };
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day}.${month} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.testsContainer}>
      {/* Header */}
      <header className={styles.testsHeader}>
        <div className={styles.headerInfo}>
          <h1>Testlar</h1>
          <p>Nazorat testlarini yaratish va boshqarish</p>
        </div>
        <Can perm="test.create">
          <button className={styles.btnCreate} onClick={openCreateModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Yangi test
          </button>
        </Can>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Oy
          </label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Yil
          </label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Sinf
          </label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Barchasi</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Fan
          </label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            <option value="">Barchasi</option>
            {subjects.map(subject => (
              <option key={subject._id} value={subject._id}>{subject.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{success}</span>
          <button onClick={() => setSuccess('')}>&times;</button>
        </div>
      )}

      {error && !showCreateModal && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Tests Grid */}
      <div className={styles.testsGrid}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Yuklanmoqda...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Testlar topilmadi</h3>
            <p>Bu oy uchun hali testlar yaratilmagan</p>
            <button className={styles.btnPrimary} onClick={openCreateModal}>
              Birinchi testni yaratish
            </button>
          </div>
        ) : (
          tests.map(test => {
            const status = getTestStatus(test);
            return (
              <div key={test._id} className={styles.testCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleSection}>
                    <h3>{test.title}</h3>
                    <div className={styles.cardBadges}>
                      <span className={styles.monthBadge}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {getMonthShortName(test.month)} {test.year}
                      </span>
                      <span className={`${styles.status} ${styles[status.class]}`}>{status.label}</span>
                    </div>
                  </div>
                </div>

                {test.description && (
                  <p className={styles.description}>{test.description}</p>
                )}

                <div className={styles.testMeta}>
                  <div className={styles.metaItem}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    <span>{test.class?.name}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span>{test.subject?.name}</span>
                  </div>
                </div>

                <div className={styles.testInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Savollar:</span>
                    <span className={styles.value}>{test.questions?.length || 0} ta</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Jami ball:</span>
                    <span className={styles.value}>{test.totalPoints || 0}</span>
                  </div>
                </div>

                {test.startTime && test.endTime && (
                  <div className={styles.timeInfo}>
                    <div className={styles.timeRow}>
                      <span className={styles.timeLabel}>Boshlanish:</span>
                      <span>{formatDateTime(test.startTime)}</span>
                    </div>
                    <div className={styles.timeRow}>
                      <span className={styles.timeLabel}>Tugash:</span>
                      <span>{formatDateTime(test.endTime)}</span>
                    </div>
                  </div>
                )}

                <div className={styles.cardActions}>
                  <button className={styles.btnIcon} onClick={() => handlePreviewTest(test)} title="Ko'rish">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button className={styles.btnIcon} onClick={() => handleViewResults(test)} title="Natijalar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </button>
                  <button className={styles.btnIcon} onClick={() => handleEditTest(test)} title="Tahrirlash">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button className={`${styles.btnIcon} ${styles.btnDanger}`} onClick={() => openDeleteModal(test)} title="O'chirish">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={closeCreateModal}>
          <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <h2>Yangi test yaratish</h2>
                <div className={styles.steps}>
                  <div className={`${styles.step} ${createStep >= 1 ? styles.active : ''}`}>
                    <span className={styles.stepNum}>1</span>
                    <span className={styles.stepText}>Asosiy ma'lumot</span>
                  </div>
                  <div className={styles.stepLine}></div>
                  <div className={`${styles.step} ${createStep >= 2 ? styles.active : ''}`}>
                    <span className={styles.stepNum}>2</span>
                    <span className={styles.stepText}>Savollar</span>
                  </div>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={closeCreateModal}>&times;</button>
            </div>

            <div className={styles.modalBody}>
              {error && (
                <div className={styles.modalError}>
                  <span>{error}</span>
                  <button onClick={() => setError('')}>&times;</button>
                </div>
              )}

              {createStep === 1 ? (
                <div className={styles.formStep}>
                  <div className={styles.formSection}>
                    <h3>Test ma'lumotlari</h3>

                    <div className={styles.formGroup}>
                      <label>Test nomi <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={testInfo.title}
                        onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
                        placeholder="Masalan: Matematika 1-chorak nazorat"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Tavsif</label>
                      <textarea
                        value={testInfo.description}
                        onChange={(e) => setTestInfo({ ...testInfo, description: e.target.value })}
                        placeholder="Test haqida qo'shimcha ma'lumot"
                        rows="3"
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Sinf <span className={styles.required}>*</span></label>
                        <select
                          value={testInfo.classId}
                          onChange={(e) => setTestInfo({ ...testInfo, classId: e.target.value, subject: '' })}
                        >
                          <option value="">Tanlang</option>
                          {classes.map(cls => (
                            <option key={cls._id} value={cls._id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Fan <span className={styles.required}>*</span></label>
                        <select
                          value={testInfo.subject}
                          onChange={(e) => setTestInfo({ ...testInfo, subject: e.target.value })}
                          disabled={!testInfo.classId}
                        >
                          <option value="">{testInfo.classId ? 'Tanlang' : 'Avval sinf tanlang'}</option>
                          {availableSubjects.map(subject => (
                            <option key={subject._id} value={subject._id}>{subject.name}</option>
                          ))}
                          {testInfo.classId && availableSubjects.length === 0 && (
                            <option value="" disabled>Barcha fanlar uchun test mavjud</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Test sanasi</label>
                        <input
                          type="date"
                          value={testInfo.testDate}
                          onChange={(e) => setTestInfo({ ...testInfo, testDate: e.target.value })}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Davomiyligi (daqiqa)</label>
                        <input
                          type="number"
                          value={testInfo.duration}
                          onChange={(e) => setTestInfo({ ...testInfo, duration: parseInt(e.target.value) || 45 })}
                          min="5"
                          max="180"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h3>Test faollik vaqti</h3>
                    <p className={styles.sectionHint}>Test faqat shu vaqtlar oralig'ida topshirilishi mumkin</p>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Boshlanish vaqti <span className={styles.required}>*</span></label>
                        <input
                          type="datetime-local"
                          value={testInfo.startTime}
                          onChange={(e) => {
                            const newStartTime = e.target.value;
                            const startDate = new Date(newStartTime);
                            setTestInfo({
                              ...testInfo,
                              startTime: newStartTime,
                              testDate: newStartTime.split('T')[0],
                              month: startDate.getMonth() + 1,
                              year: startDate.getFullYear()
                            });
                          }}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Tugash vaqti <span className={styles.required}>*</span></label>
                        <input
                          type="datetime-local"
                          value={testInfo.endTime}
                          onChange={(e) => setTestInfo({ ...testInfo, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className={styles.formStep}>
                  <div className={styles.questionsHeader}>
                    <h3>Savollar</h3>
                    <div className={styles.questionsStats}>
                      <span>{questions.length} ta savol</span>
                      <span className={styles.divider}>•</span>
                      <span>Jami: {testInfo.totalPoints} ball</span>
                    </div>
                  </div>

                  <div className={styles.questionsList}>
                    {questions.map((question, qIndex) => (
                      <div key={question.id || qIndex} className={styles.questionCard}>
                        <div className={styles.questionHeader}>
                          <span className={styles.questionNum}>{qIndex + 1}</span>
                          <select
                            value={question.questionType}
                            onChange={(e) => updateQuestion(qIndex, 'questionType', e.target.value)}
                            className={styles.typeSelect}
                          >
                            {questionTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.icon} {type.label}
                              </option>
                            ))}
                          </select>
                          <div className={styles.pointsInput}>
                            <input
                              type="number"
                              value={question.points}
                              onChange={(e) => updateQuestion(qIndex, 'points', e.target.value)}
                              min="0.5"
                              max="25"
                              step="0.5"
                            />
                            <span>ball</span>
                          </div>
                          <div className={styles.questionActions}>
                            <button onClick={() => duplicateQuestion(qIndex)} title="Nusxa olish">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => removeQuestion(qIndex)}
                              disabled={questions.length <= 1}
                              className={styles.deleteBtn}
                              title="O'chirish"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className={styles.questionBody}>
                          <textarea
                            value={question.questionText}
                            onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                            placeholder="Savol matnini kiriting..."
                            rows="2"
                          />

                          {/* Image upload section - available for all question types */}
                          <div className={styles.imageUploadSection}>
                            {question.imageUrl ? (
                              <div className={styles.imagePreview}>
                                <img src={question.imageUrl} alt="Savol rasmi" />
                                <div className={styles.imageActions}>
                                  <label className={styles.changeImageBtn}>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleImageUpload(qIndex, e.target.files[0])}
                                      hidden
                                    />
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    O'zgartirish
                                  </label>
                                  <button
                                    type="button"
                                    className={styles.removeImageBtn}
                                    onClick={() => removeImage(qIndex)}
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    O'chirish
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className={styles.imageUploadLabel}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(qIndex, e.target.files[0])}
                                  hidden
                                />
                                <div className={styles.uploadPlaceholder}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                  </svg>
                                  <span>Rasm qo'shish (ixtiyoriy)</span>
                                  <small>JPG, PNG, GIF - max 5MB</small>
                                </div>
                              </label>
                            )}
                          </div>

                          {question.questionType !== 'text' && (
                            <div className={styles.optionsSection}>
                              <label>
                                Javob variantlari
                                <span className={styles.hint}>
                                  {question.questionType === 'single' || question.questionType === 'image'
                                    ? '(bitta to\'g\'ri javobni belgilang)'
                                    : '(bir nechta to\'g\'ri javobni belgilang)'}
                                </span>
                              </label>
                              <div className={styles.optionsList}>
                                {question.options.map((option, oIndex) => (
                                  <div key={oIndex} className={styles.optionItem}>
                                    <label className={styles.optionCheck}>
                                      <input
                                        type={question.questionType === 'single' || question.questionType === 'image' ? 'radio' : 'checkbox'}
                                        name={`q-${qIndex}-correct`}
                                        checked={option.isCorrect}
                                        onChange={(e) => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked, e)}
                                      />
                                      <span className={`${styles.checkmark} ${option.isCorrect ? styles.correct : ''}`}>
                                        {option.isCorrect ? '✓' : String.fromCharCode(65 + oIndex)}
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      value={option.text}
                                      onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                                      placeholder={`${String.fromCharCode(65 + oIndex)} varianti`}
                                    />
                                    {question.options.length > 2 && (
                                      <button
                                        type="button"
                                        className={styles.removeOption}
                                        onClick={(e) => removeOption(qIndex, oIndex, e)}
                                        title="Variantni o'chirish"
                                      >
                                        &times;
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {question.options.length < 6 && (
                                <button className={styles.addOption} onClick={() => addOption(qIndex)}>
                                  + Variant qo'shish
                                </button>
                              )}
                            </div>
                          )}

                          {question.questionType === 'text' && (
                            <div className={styles.textAnswer}>
                              <label>To'g'ri javob (tekshirish uchun)</label>
                              <input
                                type="text"
                                value={question.correctAnswer}
                                onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                                placeholder="To'g'ri javobni kiriting (ixtiyoriy)"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className={styles.addQuestion} onClick={addQuestion}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Savol qo'shish
                  </button>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {createStep === 1 ? (
                <>
                  <button className={styles.btnSecondary} onClick={closeCreateModal}>Bekor qilish</button>
                  <button className={styles.btnPrimary} onClick={goToStep2}>Davom etish</button>
                </>
              ) : (
                <>
                  <button className={styles.btnSecondary} onClick={goToStep1}>Orqaga</button>
                  <button className={styles.btnPrimary} onClick={handleCreateTest} disabled={loading}>
                    {loading ? 'Saqlanmoqda...' : `Saqlash (${testInfo.totalPoints} ball)`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTest && (
        <div className={styles.modalOverlay} onClick={() => setShowPreviewModal(false)}>
          <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <h2>{previewTest.title}</h2>
                <p>{previewTest.class?.name} • {previewTest.subject?.name} • {previewTest.totalPoints || 0} ball</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowPreviewModal(false)}>&times;</button>
            </div>
            <div className={`${styles.modalBody} ${styles.previewBody}`}>
              {previewTest.questions?.length > 0 ? (
                <div className={styles.previewQuestions}>
                  {previewTest.questions.map((q, index) => (
                    <div key={index} className={styles.previewQuestion}>
                      <div className={styles.previewHeader}>
                        <span className={styles.previewNum}>{index + 1}</span>
                        <span className={styles.previewType}>
                          {questionTypes.find(t => t.value === q.questionType)?.icon}{' '}
                          {questionTypes.find(t => t.value === q.questionType)?.label}
                        </span>
                        <span className={styles.previewPoints}>{q.points} ball</span>
                      </div>
                      <p className={styles.previewText}>{q.questionText}</p>
                      {q.imageUrl && (
                        <div className={styles.previewImageContainer}>
                          <img src={q.imageUrl} alt="Savol rasmi" className={styles.previewImage} />
                        </div>
                      )}
                      {q.questionType !== 'text' && q.options && (
                        <div className={styles.previewOptions}>
                          {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className={`${styles.previewOption} ${opt.isCorrect ? styles.correct : ''}`}>
                              <span className={styles.optionLetter}>{String.fromCharCode(65 + oIndex)}</span>
                              <span>{opt.text}</span>
                              {opt.isCorrect && <span className={styles.correctMark}>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.questionType === 'text' && (
                        <div className={styles.previewAnswer}>
                          <span>To'g'ri javob:</span>
                          <span>{q.correctAnswer || 'Belgilanmagan'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyPreview}>
                  <p>Bu testda savollar mavjud emas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTest && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Testni tahrirlash</h2>
              <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateTest} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Test nomi <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Test nomini kiriting"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tavsif</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Test haqida qo'shimcha ma'lumot"
                  rows="3"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Test sanasi <span className={styles.required}>*</span></label>
                <input
                  type="date"
                  required
                  value={editFormData.testDate}
                  onChange={(e) => setEditFormData({ ...editFormData, testDate: e.target.value })}
                />
              </div>

              <div className={styles.infoBox}>
                <p><strong>Sinf:</strong> {editingTest.class?.name}</p>
                <p><strong>Fan:</strong> {editingTest.subject?.name}</p>
                <p><strong>Oy:</strong> {getMonthName(editingTest.month)}</p>
                <p><strong>Yil:</strong> {editingTest.year}</p>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowEditModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedTest && (
        <div className={styles.modalOverlay} onClick={() => setShowResultsModal(false)}>
          <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <h2>{selectedTest.title}</h2>
                <p>{selectedTest.class?.name} • {selectedTest.subject?.name}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowResultsModal(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <h3>Test natijalari</h3>
              <div className={styles.resultsTableWrapper}>
                <table className={styles.resultsTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>O'quvchi</th>
                      <th>Ball (%)</th>
                      <th>Sana</th>
                      <th>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length > 0 ? (
                      students.map((student, index) => {
                        const result = getStudentResult(student._id);
                        return (
                          <tr key={student._id}>
                            <td>{index + 1}</td>
                            <td>{student.firstName} {student.lastName}</td>
                            <td>
                              {result ? (
                                <span className={`${styles.score} ${result.score >= 60 ? styles.pass : styles.fail}`}>
                                  {result.score}%
                                </span>
                              ) : (
                                <span className={`${styles.score} ${styles.pending}`}>—</span>
                              )}
                            </td>
                            <td>
                              {result
                                ? new Date(result.submittedAt).toLocaleDateString('uz-UZ')
                                : '—'}
                            </td>
                            <td>
                              <div className={styles.resultInputGroup}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={resultInputs[student._id] || ''}
                                  onChange={(e) => handleResultInputChange(student._id, e.target.value)}
                                  placeholder="Ball"
                                />
                                <button
                                  className={styles.btnSave}
                                  onClick={() => handleAddResult(student._id)}
                                >
                                  {result ? '✎' : '✓'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className={styles.emptyRow}>Bu sinfda o'quvchilar topilmadi</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && testToDelete && (
        <div className={styles.modalOverlay} onClick={closeDeleteModal}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>Testni o'chirish</h3>
            <p>
              <strong>"{testToDelete.title}"</strong> testini o'chirishga ishonchingiz komilmi?
            </p>
            <p className={styles.deleteWarning}>Bu amalni ortga qaytarib bo'lmaydi!</p>
            <div className={styles.deleteModalActions}>
              <button className={styles.btnCancel} onClick={closeDeleteModal}>
                Bekor qilish
              </button>
              <button className={styles.btnDelete} onClick={handleDeleteTest} disabled={loading}>
                {loading ? 'O\'chirilmoqda...' : 'O\'chirish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tests;
