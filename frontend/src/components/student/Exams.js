import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import './Exams.css';

const Exams = () => {
  const { user } = useAuth();

  // Main states
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'completed', 'upcoming'

  // Date filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Test taking states
  const [takingTest, setTakingTest] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Anti-cheat states
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [isMobileBlocked, setIsMobileBlocked] = useState(false);

  // View results states
  const [viewingResults, setViewingResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Check if device is mobile or tablet
  const isMobileOrTablet = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile', 'tablet'];
    const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));
    const isSmallScreen = window.innerWidth < 1024;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isMobile || (isSmallScreen && isTouchDevice);
  }, []);

  const months = useMemo(() => [
    { value: 1, label: 'Yanvar' },
    { value: 2, label: 'Fevral' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Aprel' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Iyun' },
    { value: 7, label: 'Iyul' },
    { value: 8, label: 'Avgust' },
    { value: 9, label: 'Sentyabr' },
    { value: 10, label: 'Oktyabr' },
    { value: 11, label: 'Noyabr' },
    { value: 12, label: 'Dekabr' }
  ], []);

  // Fetch tests
  const fetchTests = useCallback(async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const testsData = await apiService.getStudentTests({
        year: selectedYear,
        month: selectedMonth
      });
      setTests(testsData || []);
    } catch (err) {
      setError('Testlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [user, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Submit test function - defined before useEffect that uses it
  const handleSubmitTest = useCallback(async (isAutoSubmit = false) => {
    if (submitting) return;

    const unansweredCount = testQuestions.length - Object.keys(answers).length;
    // Only show confirmation if manual submit and there are unanswered questions
    if (!isAutoSubmit && unansweredCount > 0) {
      if (!window.confirm(`${unansweredCount} ta savolga javob berilmagan. Testni yakunlashni xohlaysizmi?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);

      const formattedAnswers = Object.entries(answers).map(([questionIndex, answer]) => ({
        questionIndex: parseInt(questionIndex),
        answer
      }));

      const result = await apiService.submitTestAnswers(takingTest._id, formattedAnswers);
      setTestResult(result);

    } catch (err) {
      setError(err.response?.data?.message || 'Testni topshirishda xatolik');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, testQuestions.length, answers, takingTest]);

  // Timer effect
  useEffect(() => {
    if (!takingTest || timeLeft === null) return;

    if (timeLeft <= 0) {
      handleSubmitTest(true); // Auto-submit without confirmation
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        return newTime >= 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [takingTest, timeLeft, handleSubmitTest]);

  // Fullscreen functions
  const enterFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    } catch (err) {
    }
  }, []);

  // Add/remove body class for fullscreen test mode
  useEffect(() => {
    if (takingTest && !testResult) {
      document.body.classList.add('test-fullscreen-mode');
    } else {
      document.body.classList.remove('test-fullscreen-mode');
    }
    return () => {
      document.body.classList.remove('test-fullscreen-mode');
    };
  }, [takingTest, testResult]);

  // Anti-cheat: Detect tab/window switch and prevent shortcuts
  useEffect(() => {
    if (!takingTest || testResult) return;

    let blurTimeout = null;

    // Handle violation detection
    const handleViolation = () => {
      if (takingTest && !testResult && !showViolationWarning) {
        setViolationCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            // Second violation - end test
            setShowViolationWarning(true);
            return newCount;
          }
          // First violation - show warning
          setShowViolationWarning(true);
          return newCount;
        });
      }
    };

    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    // Handle window blur (switching to another app)
    const handleWindowBlur = () => {
      // Small delay to avoid false positives
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus()) {
          handleViolation();
        }
      }, 100);
    };

    // Handle window focus - clear blur timeout
    const handleWindowFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    // Handle fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        handleViolation();
      }
    };

    // Prevent keyboard shortcuts (PrintScreen, Alt+Tab hints, etc.)
    const handleKeyDown = (e) => {
      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+P, Ctrl+S, Ctrl+U
      if (e.ctrlKey && ['c', 'v', 'a', 'p', 's', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      // Block F5 (Refresh)
      if (e.key === 'F5') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+R (Refresh)
      if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        return false;
      }
    };

    // Detect DevTools opening (console)
    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold ||
          window.outerHeight - window.innerHeight > threshold) {
        handleViolation();
      }
    };
    const devToolsInterval = setInterval(detectDevTools, 1000);

    // Prevent right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent copy/paste
    const handleCopy = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      clearInterval(devToolsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [takingTest, testResult, showViolationWarning]);

  // Handle first warning - continue test
  const handleContinueTest = useCallback(() => {
    setShowViolationWarning(false);
    enterFullscreen();
  }, [enterFullscreen]);

  // Handle violation - end test
  const handleViolationEndTest = useCallback(() => {
    handleSubmitTest(true);
    setShowViolationWarning(false);
    exitFullscreen();
  }, [handleSubmitTest, exitFullscreen]);

  // Categorize tests
  const categorizedTests = useMemo(() => {
    const now = new Date();
    return {
      available: tests.filter(t => {
        if (t.hasResult) return false;
        const start = new Date(t.startTime);
        const end = new Date(t.endTime);
        return now >= start && now <= end;
      }),
      completed: tests.filter(t => t.hasResult),
      upcoming: tests.filter(t => {
        if (t.hasResult) return false;
        const start = new Date(t.startTime);
        return now < start;
      }),
      expired: tests.filter(t => {
        if (t.hasResult) return false;
        const end = new Date(t.endTime);
        return now > end;
      })
    };
  }, [tests]);

  // Statistics
  const statistics = useMemo(() => {
    const completed = categorizedTests.completed;
    if (completed.length === 0) {
      return { total: 0, average: 0, highest: 0, passed: 0 };
    }
    const scores = completed.map(t => t.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    return {
      total: completed.length,
      average: (sum / completed.length).toFixed(1),
      highest: Math.max(...scores),
      passed: scores.filter(s => s >= 60).length
    };
  }, [categorizedTests.completed]);

  // Handlers
  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const today = new Date();
    if (selectedYear === today.getFullYear() && selectedMonth >= today.getMonth() + 1) {
      return;
    }
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Start taking test
  const handleStartTest = async (test) => {
    // Check for mobile/tablet device
    if (isMobileOrTablet()) {
      setIsMobileBlocked(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const testData = await apiService.getTestForTaking(test._id);

      setTakingTest(testData);
      setTestQuestions(testData.questions || []);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setViolationCount(0);
      setShowViolationWarning(false);

      // Calculate time left
      const endTime = new Date(testData.endTime);
      const now = new Date();
      const remainingSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      const durationSeconds = (testData.duration || 45) * 60;
      const calculatedTime = Math.min(remainingSeconds, durationSeconds);
      setTimeLeft(Math.max(0, calculatedTime));

      // Enter fullscreen mode
      enterFullscreen();

    } catch (err) {
      setError(err.response?.data?.message || 'Testni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Answer handlers
  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleMultipleAnswerChange = (questionIndex, optionIndex, checked) => {
    setAnswers(prev => {
      const current = prev[questionIndex] || [];
      if (checked) {
        return { ...prev, [questionIndex]: [...current, optionIndex] };
      } else {
        return { ...prev, [questionIndex]: current.filter(i => i !== optionIndex) };
      }
    });
  };

  // Close test
  const handleCloseTest = () => {
    setTakingTest(null);
    setTestQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(null);
    setTestResult(null);
    setViolationCount(0);
    setShowViolationWarning(false);
    exitFullscreen();
    fetchTests();
  };

  // View detailed results
  const handleViewResults = async (testId) => {
    try {
      setLoadingResults(true);
      const results = await apiService.getTestResults(testId);
      setViewingResults(results);
    } catch (err) {
      setError(err.response?.data?.message || 'Natijalarni yuklashda xatolik');
    } finally {
      setLoadingResults(false);
    }
  };

  // Close results view
  const handleCloseResults = () => {
    setViewingResults(null);
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!viewingResults) return;

    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test natijasi - ${viewingResults.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #065f46; padding-bottom: 20px; }
          .header h1 { color: #065f46; font-size: 24px; margin-bottom: 10px; }
          .header p { color: #666; font-size: 14px; }
          .score-summary { background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 30px; display: flex; justify-content: space-around; text-align: center; }
          .score-item { padding: 10px; }
          .score-value { font-size: 28px; font-weight: bold; color: #065f46; }
          .score-label { font-size: 12px; color: #666; margin-top: 5px; }
          .question { margin-bottom: 25px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; }
          .question-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .question-number { font-weight: bold; color: #065f46; }
          .question-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-correct { background: #dcfce7; color: #166534; }
          .status-incorrect { background: #fee2e2; color: #991b1b; }
          .question-text { font-size: 15px; margin-bottom: 15px; line-height: 1.5; }
          .answers { margin-left: 20px; }
          .answer-row { margin-bottom: 8px; font-size: 14px; }
          .answer-label { font-weight: bold; color: #666; }
          .correct-answer { color: #166534; }
          .wrong-answer { color: #991b1b; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${viewingResults.title}</h1>
          <p>Fan: ${viewingResults.subject?.name || ''} | O'qituvchi: ${viewingResults.teacher?.firstName || ''} ${viewingResults.teacher?.lastName || ''}</p>
          <p>Topshirilgan sana: ${new Date(viewingResults.submittedAt).toLocaleDateString('uz-UZ')}</p>
        </div>

        <div class="score-summary">
          <div class="score-item">
            <div class="score-value">${viewingResults.percentage}%</div>
            <div class="score-label">Umumiy ball</div>
          </div>
          <div class="score-item">
            <div class="score-value">${viewingResults.correctCount}/${viewingResults.questionsCount}</div>
            <div class="score-label">To'g'ri javoblar</div>
          </div>
          <div class="score-item">
            <div class="score-value">${viewingResults.score}/${viewingResults.totalPoints}</div>
            <div class="score-label">Ball</div>
          </div>
        </div>

        ${viewingResults.questions.map(q => `
          <div class="question">
            <div class="question-header">
              <span class="question-number">${q.questionNumber}-savol (${q.points} ball)</span>
              <span class="question-status ${q.isCorrect ? 'status-correct' : 'status-incorrect'}">
                ${q.isCorrect ? '✓ To\'g\'ri' : '✗ Noto\'g\'ri'}
              </span>
            </div>
            <div class="question-text">${q.questionText}</div>
            <div class="answers">
              <div class="answer-row">
                <span class="answer-label">Sizning javobingiz: </span>
                <span class="${q.isCorrect ? 'correct-answer' : 'wrong-answer'}">${q.studentAnswerText || 'Javob berilmagan'}</span>
              </div>
              ${!q.isCorrect ? `
                <div class="answer-row">
                  <span class="answer-label">To'g'ri javob: </span>
                  <span class="correct-answer">${q.correctAnswerText}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}

        <div class="footer">
          <p>My Dream School - Test natijasi</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Format time
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || seconds < 0) {
      return '00:00';
    }
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Get score grade
  const getScoreGrade = (score) => {
    if (score >= 90) return "A'lo";
    if (score >= 70) return 'Yaxshi';
    if (score >= 60) return 'Qoniqarli';
    return 'Qoniqarsiz';
  };

  // Render test result modal
  if (testResult) {
    return (
      <div className="exam-result-overlay">
        <div className="exam-result-modal">
          <div className={`result-icon ${testResult.percentage >= 60 ? 'success' : 'fail'}`}>
            {testResult.percentage >= 60 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>

          <h2>Test yakunlandi!</h2>

          <div className="result-score-circle" style={{ '--score-color': getScoreColor(testResult.percentage), '--score-percent': testResult.percentage }}>
            <div className="score-value">{testResult.percentage}%</div>
            <div className="score-label">{getScoreGrade(testResult.percentage)}</div>
          </div>

          <div className="result-details">
            <div className="result-detail">
              <span className="detail-label">To'plangan ball:</span>
              <span className="detail-value">{testResult.score} / {testResult.totalPoints}</span>
            </div>
            <div className="result-detail">
              <span className="detail-label">Natija:</span>
              <span className={`detail-value ${testResult.percentage >= 60 ? 'pass' : 'fail'}`}>
                {testResult.percentage >= 60 ? "O'tdi" : "O'tmadi"}
              </span>
            </div>
          </div>

          <button className="btn-close-result" onClick={handleCloseTest}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  // Render test taking interface
  if (takingTest) {
    const currentQuestion = testQuestions[currentQuestionIndex] || null;
    const isLastQuestion = currentQuestionIndex === testQuestions.length - 1;
    const isFirstQuestion = currentQuestionIndex === 0;
    const answeredCount = Object.keys(answers).length;

    // If no questions available, show error
    if (!currentQuestion && testQuestions.length === 0) {
      return (
        <div className="exam-taking-container">
          <div className="error-alert">
            <span>Test savollarini yuklashda xatolik yuz berdi</span>
            <button onClick={handleCloseTest}>Yopish</button>
          </div>
        </div>
      );
    }

    return (
      <div className="exam-taking-container no-select">
        {/* Violation Warning/End Modal */}
        {showViolationWarning && (
          <div className="violation-overlay">
            <div className="violation-modal">
              <div className={`violation-icon ${violationCount >= 2 ? 'danger' : 'warning'}`}>
                {violationCount >= 2 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                )}
              </div>

              {violationCount >= 2 ? (
                <>
                  <h2>Test yakunlandi!</h2>
                  <p>Siz ikkinchi marta test oynasidan chiqdingiz. Qoidabuzarlik tufayli testingiz avtomatik yakunlandi.</p>
                  <button className="btn-violation-end" onClick={handleViolationEndTest}>
                    Natijalarni ko'rish
                  </button>
                </>
              ) : (
                <>
                  <h2>Ogohlantirish!</h2>
                  <p>Siz test oynasidan chiqdingiz. Bu birinchi ogohlantirish. Agar yana bir marta chiqsangiz, testingiz avtomatik yakunlanadi!</p>
                  <div className="violation-buttons">
                    <button className="btn-continue-test" onClick={handleContinueTest}>
                      Testni davom ettirish
                    </button>
                  </div>
                  <div className="violation-count">
                    Ogohlantirish: {violationCount} / 2
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="exam-taking-header">
          <div className="exam-info">
            <h2>{takingTest.title}</h2>
            <span className="exam-subject">{takingTest.subject?.name}</span>
          </div>
          <div className="exam-timer" style={{ color: timeLeft < 60 ? '#ef4444' : timeLeft < 300 ? '#f59e0b' : '#10b981' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="exam-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%` }} />
          </div>
          <div className="progress-text">
            {currentQuestionIndex + 1} / {testQuestions.length} savol
          </div>
        </div>

        {/* Question navigation dots */}
        <div className="question-dots">
          {testQuestions.map((_, index) => (
            <button
              key={index}
              className={`question-dot ${index === currentQuestionIndex ? 'active' : ''} ${answers[index] !== undefined ? 'answered' : ''}`}
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Question */}
        <div className="question-container">
          <div className="question-header">
            <span className="question-number">Savol {currentQuestionIndex + 1}</span>
            <span className="question-points">{currentQuestion?.points} ball</span>
          </div>

          <div className="question-text">
            {currentQuestion?.questionText}
          </div>

          {currentQuestion?.imageUrl && (
            <div className="question-image">
              <img src={currentQuestion.imageUrl} alt="Savol rasmi" />
            </div>
          )}

          {/* Options */}
          <div className="options-container">
            {currentQuestion?.questionType === 'text' ? (
              <div className="text-answer-input">
                <textarea
                  value={answers[currentQuestionIndex] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                  placeholder="Javobingizni yozing..."
                  rows={4}
                />
              </div>
            ) : currentQuestion?.questionType === 'multiple' ? (
              currentQuestion.options?.map((option, index) => (
                <label key={index} className={`option-item checkbox ${(answers[currentQuestionIndex] || []).includes(index) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={(answers[currentQuestionIndex] || []).includes(index)}
                    onChange={(e) => handleMultipleAnswerChange(currentQuestionIndex, index, e.target.checked)}
                  />
                  <span className="option-marker">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option.text}</span>
                </label>
              ))
            ) : (
              currentQuestion?.options?.map((option, index) => (
                <label key={index} className={`option-item radio ${answers[currentQuestionIndex] === index ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    checked={answers[currentQuestionIndex] === index}
                    onChange={() => handleAnswerChange(currentQuestionIndex, index)}
                  />
                  <span className="option-marker">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option.text}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="exam-navigation">
          <button
            className="nav-btn prev"
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={isFirstQuestion}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Oldingi
          </button>

          <div className="answered-count">
            {answeredCount} / {testQuestions.length} javob berildi
          </div>

          {isLastQuestion ? (
            <button
              className="nav-btn submit"
              onClick={() => handleSubmitTest(false)}
              disabled={submitting}
            >
              {submitting ? 'Yuklanmoqda...' : 'Yakunlash'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          ) : (
            <button
              className="nav-btn next"
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            >
              Keyingi
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main exams list view
  const currentTests = activeTab === 'available' ? categorizedTests.available :
                       activeTab === 'completed' ? categorizedTests.completed :
                       categorizedTests.upcoming;

  return (
    <div className="exams-page">
      {/* Mobile/Tablet Blocked Modal */}
      {isMobileBlocked && (
        <div className="violation-overlay">
          <div className="violation-modal">
            <div className="violation-icon danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <h2>Qurilma ruxsat etilmagan!</h2>
            <p>Testlarni faqat kompyuterda topshirish mumkin. Telefon yoki planshetda test topshirish taqiqlangan.</p>
            <button className="btn-violation-end" onClick={() => setIsMobileBlocked(false)}>
              Tushundim
            </button>
          </div>
        </div>
      )}

      {/* Results Viewing Modal */}
      {viewingResults && (
        <div className="results-modal-overlay">
          <div className="results-modal">
            <div className="results-modal-header">
              <h2>{viewingResults.title}</h2>
              <button className="close-results-btn" onClick={handleCloseResults}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="results-summary">
              <div className="summary-item">
                <div className="summary-circle" style={{ '--score-color': getScoreColor(viewingResults.percentage), '--score-percent': viewingResults.percentage }}>
                  <span className="summary-value">{viewingResults.percentage}%</span>
                </div>
                <span className="summary-label">Umumiy ball</span>
              </div>
              <div className="summary-item">
                <div className="summary-stat correct">{viewingResults.correctCount}</div>
                <span className="summary-label">To'g'ri</span>
              </div>
              <div className="summary-item">
                <div className="summary-stat incorrect">{viewingResults.questionsCount - viewingResults.correctCount}</div>
                <span className="summary-label">Noto'g'ri</span>
              </div>
            </div>

            <div className="results-questions">
              {viewingResults.questions.map((q) => (
                <div key={q.questionNumber} className={`result-question ${q.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <span className="question-num">{q.questionNumber}-savol</span>
                    <span className={`question-badge ${q.isCorrect ? 'correct' : 'incorrect'}`}>
                      {q.isCorrect ? '✓ To\'g\'ri' : '✗ Noto\'g\'ri'} ({q.pointsEarned}/{q.points} ball)
                    </span>
                  </div>
                  <p className="question-text">{q.questionText}</p>

                  <div className="question-answers">
                    <div className="answer-item your-answer">
                      <span className="answer-label">Sizning javobingiz:</span>
                      <span className={`answer-value ${q.isCorrect ? 'correct' : 'incorrect'}`}>
                        {q.studentAnswerText || 'Javob berilmagan'}
                      </span>
                    </div>
                    {!q.isCorrect && (
                      <div className="answer-item correct-answer">
                        <span className="answer-label">To'g'ri javob:</span>
                        <span className="answer-value correct">{q.correctAnswerText}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="results-modal-footer">
              <button className="btn-download-pdf" onClick={handleDownloadPDF}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                PDF yuklab olish
              </button>
              <button className="btn-close-results" onClick={handleCloseResults}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="exams-header">
        <div className="header-content">
          <h1>Imtihonlar</h1>
          <p>O'qituvchi tomonidan tayinlangan testlar</p>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="date-navigator">
        <button className="nav-arrow" onClick={handlePreviousMonth}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="date-display">
          <span className="month-name">{months.find(m => m.value === selectedMonth)?.label}</span>
          <span className="year-name">{selectedYear}</span>
        </div>
        <button
          className="nav-arrow"
          onClick={handleNextMonth}
          disabled={selectedYear === new Date().getFullYear() && selectedMonth >= new Date().getMonth() + 1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Statistics */}
      {statistics.total > 0 && (
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{statistics.total}</span>
              <span className="stat-label">Jami testlar</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{statistics.average}%</span>
              <span className="stat-label">O'rtacha ball</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{statistics.highest}%</span>
              <span className="stat-label">Eng yuqori</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{statistics.passed}/{statistics.total}</span>
              <span className="stat-label">O'tgan testlar</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="exams-tabs">
        <button
          className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          <span className="tab-icon available"></span>
          Mavjud testlar
          {categorizedTests.available.length > 0 && (
            <span className="tab-badge">{categorizedTests.available.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <span className="tab-icon completed"></span>
          Topshirilgan
          {categorizedTests.completed.length > 0 && (
            <span className="tab-badge success">{categorizedTests.completed.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <span className="tab-icon upcoming"></span>
          Kutilmoqda
          {categorizedTests.upcoming.length > 0 && (
            <span className="tab-badge warning">{categorizedTests.upcoming.length}</span>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Tests List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Yuklanmoqda...</p>
        </div>
      ) : currentTests.length === 0 ? (
        <div className="empty-state">
          <h3>
            {activeTab === 'available' ? 'Hozirda mavjud test yo\'q' :
             activeTab === 'completed' ? 'Topshirilgan testlar yo\'q' :
             'Kutilayotgan testlar yo\'q'}
          </h3>
          <p>
            {activeTab === 'available' ? 'O\'qituvchi yangi test tayinlashi bilan bu yerda ko\'rinadi' :
             activeTab === 'completed' ? 'Siz hali test topshirmagansiz' :
             'Kelajakda rejalashtirilgan testlar yo\'q'}
          </p>
        </div>
      ) : (
        <div className="tests-grid">
          {currentTests.map(test => {
            const now = new Date();
            const startTime = new Date(test.startTime);
            const endTime = new Date(test.endTime);
            const isActive = now >= startTime && now <= endTime;
            const isUpcoming = now < startTime;
            const isExpired = now > endTime && !test.hasResult;

            return (
              <div key={test._id} className={`test-card ${test.hasResult ? 'completed' : isActive ? 'active' : isUpcoming ? 'upcoming' : 'expired'}`}>
                <div className="test-card-header">
                  <div className="subject-badge">
                    {test.subject?.name || 'Fan'}
                  </div>
                  <div className={`status-badge ${test.hasResult ? 'completed' : isActive ? 'active' : isUpcoming ? 'upcoming' : 'expired'}`}>
                    {test.hasResult ? 'Topshirilgan' : isActive ? 'Faol' : isUpcoming ? 'Kutilmoqda' : 'Tugagan'}
                  </div>
                </div>

                <h3 className="test-title">{test.title}</h3>

                {test.description && (
                  <p className="test-description">{test.description}</p>
                )}

                <div className="test-meta">
                  <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{test.teacher?.firstName} {test.teacher?.lastName}</span>
                  </div>
                  <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{test.duration} daqiqa</span>
                  </div>
                  <div className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span>{test.questionsCount} savol</span>
                  </div>
                </div>

                <div className="test-time-info">
                  <div className="time-row">
                    <span className="time-label">Boshlanish:</span>
                    <span className="time-value">{formatDate(test.startTime)}</span>
                  </div>
                  <div className="time-row">
                    <span className="time-label">Tugash:</span>
                    <span className="time-value">{formatDate(test.endTime)}</span>
                  </div>
                </div>

                {test.hasResult ? (
                  <div className="test-result">
                    <div className="result-score" style={{ '--score-color': getScoreColor(test.score), '--score-percent': test.score }}>
                      <span className="score-value">{test.score}%</span>
                      <span className="score-grade">{getScoreGrade(test.score)}</span>
                    </div>
                    <div className="result-date">
                      Topshirilgan: {formatDate(test.submittedAt)}
                    </div>
                    <button
                      className="btn-view-results"
                      onClick={() => handleViewResults(test._id)}
                      disabled={loadingResults}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Natijalarni ko'rish
                    </button>
                  </div>
                ) : isActive ? (
                  <button className="btn-start-test" onClick={() => handleStartTest(test)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Testni boshlash
                  </button>
                ) : isUpcoming ? (
                  <div className="test-countdown">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Boshlanishga kutilmoqda</span>
                  </div>
                ) : isExpired ? (
                  <div className="test-expired">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span>Vaqt tugagan</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Expired tests section */}
      {categorizedTests.expired.length > 0 && activeTab === 'available' && (
        <div className="expired-section">
          <h3 className="section-title">Muddati o'tgan testlar ({categorizedTests.expired.length})</h3>
          <div className="expired-list">
            {categorizedTests.expired.map(test => (
              <div key={test._id} className="expired-item">
                <div className="expired-info">
                  <span className="expired-subject">{test.subject?.name}</span>
                  <span className="expired-title">{test.title}</span>
                </div>
                <span className="expired-date">Tugagan: {formatDate(test.endTime)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
