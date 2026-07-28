import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../services/apiService';

const TeacherReports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classStats, setClassStats] = useState([]);
  const [studentStats, setStudentStats] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [assignmentStats, setAssignmentStats] = useState(null);

  // Bitta o'quvchining batafsil ko'rsatkichlari (drill-down modal)
  const [studentDetail, setStudentDetail] = useState(null);

  const openStudentDetail = async (studentMongoId) => {
    setStudentDetail({ _loading: true });
    try {
      const data = await apiService.getStudentDetailStats(studentMongoId);
      setStudentDetail(data);
    } catch (e) {
      setStudentDetail({ _error: true });
    }
  };

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  // Ref to track if component is mounted (prevent memory leak)
  const isMountedRef = useRef(true);

  useEffect(() => {
    fetchClassStats();
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchDetailedStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSubject]);

  const fetchClassStats = async () => {
    try {
      setError(null);
      setInitialLoading(true);
      const data = await apiService.getTeacherClassStats();

      if (!isMountedRef.current) return;

      if (data && data.length > 0) {
        setClassStats(data);

        const classes = data.map(c => ({
          id: c.classId,
          name: c.className,
          grade: c.grade,
          section: c.section
        }));
        setAvailableClasses(classes);

        // Auto-select first class and subject
        setSelectedClass(classes[0].id);
        const firstClassSubjects = data[0].subjects || [];
        if (firstClassSubjects.length > 0) {
          setSelectedSubject(firstClassSubjects[0].subjectId);
          setAvailableSubjects(firstClassSubjects);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setError(error.response?.data?.message || "Hisobot ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      if (isMountedRef.current) {
        setInitialLoading(false);
      }
    }
  };

  const fetchDetailedStats = useCallback(async () => {
    if (!selectedClass || !selectedSubject) return;

    try {
      setDataLoading(true);
      setError(null);

      // Fetch all stats in parallel for better performance
      const [students, attendance, assignments] = await Promise.all([
        apiService.getTeacherStudentStats(selectedClass, selectedSubject),
        apiService.getTeacherAttendanceStats({
          classId: selectedClass,
          subjectId: selectedSubject
        }),
        apiService.getTeacherAssignmentStats({
          classId: selectedClass,
          subjectId: selectedSubject
        })
      ]);

      if (!isMountedRef.current) return;

      setStudentStats(students || []);
      setAttendanceStats(attendance || null);
      setAssignmentStats(assignments || null);
    } catch (error) {
      if (!isMountedRef.current) return;
      setError(error.response?.data?.message || "Statistikani yuklashda xatolik yuz berdi");
    } finally {
      if (isMountedRef.current) {
        setDataLoading(false);
      }
    }
  }, [selectedClass, selectedSubject]);

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    const selectedClassData = classStats.find(c => c.classId === classId);
    if (selectedClassData && selectedClassData.subjects.length > 0) {
      setAvailableSubjects(selectedClassData.subjects);
      setSelectedSubject(selectedClassData.subjects[0].subjectId);
    }
  };

  const getGradeColor = (average) => {
    if (average >= 85) return '#10b981';
    if (average >= 70) return '#0d9488';
    if (average >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return '#10b981';
    if (rate >= 75) return '#0d9488';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Safe percentage calculation to prevent division by zero
  const calculatePercentage = (numerator, denominator) => {
    if (!denominator || denominator === 0) return 0;
    return ((numerator / denominator) * 100).toFixed(1);
  };

  const selectedClassData = classStats.find(c => c.classId === selectedClass);
  const selectedSubjectData = selectedClassData?.subjects.find(s => s.subjectId === selectedSubject);

  // Birinchi yuklanish — real ma'lumot kelguncha spinner
  if (initialLoading) {
    return (
      <div className="teacher-reports">
        <div className="page-header">
          <h1 className="page-title">📊 Hisobotlar</h1>
          <p className="page-subtitle">Sinf va o'quvchilar bo'yicha batafsil statistika</p>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Ma'lumotlar yuklanmoqda...</span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Sinf biriktirilmagan yoki ma'lumot yo'q
  if (classStats.length === 0) {
    return (
      <div className="teacher-reports">
        <div className="page-header">
          <h1 className="page-title">📊 Hisobotlar</h1>
          <p className="page-subtitle">Sinf va o'quvchilar bo'yicha batafsil statistika</p>
        </div>
        {error && (
          <div className="error-banner">
            <span className="error-icon-small">⚠️</span>
            <span>{error}</span>
            <button onClick={fetchClassStats} className="retry-btn-small">
              Qayta urinish
            </button>
          </div>
        )}
        <div className="empty-state">
          <h3>Hozircha hisobot ma'lumotlari yo'q</h3>
          <p>
            Sizga sinf va fan biriktirilgach hamda jurnalga baho/davomat kiritilgach,
            bu yerda real statistika ko'rinadi.
          </p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="teacher-reports">
      <div className="page-header">
        <h1 className="page-title">📊 Hisobotlar</h1>
        <p className="page-subtitle">Sinf va o'quvchilar bo'yicha batafsil statistika</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="class-filter">Sinf</label>
          <select
            id="class-filter"
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className="filter-select"
            aria-label="Sinfni tanlang"
          >
            {availableClasses.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="subject-filter">Fan</label>
          <select
            id="subject-filter"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="filter-select"
            aria-label="Fanni tanlang"
          >
            {availableSubjects.map(subj => (
              <option key={subj.subjectId} value={subj.subjectId}>
                {subj.subjectName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading indicator for data fetching */}
      {dataLoading && (
        <div className="data-loading">
          <div className="spinner-small"></div>
          <span>Ma'lumotlar yuklanmoqda...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-banner">
          <span className="error-icon-small">⚠️</span>
          <span>{error}</span>
          <button onClick={fetchDetailedStats} className="retry-btn-small">
            Qayta urinish
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'overview'}
          aria-controls="overview-panel"
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📈</span>
          Umumiy ko'rinish
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'students'}
          aria-controls="students-panel"
          className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <span className="tab-icon">👥</span>
          O'quvchilar
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'attendance'}
          aria-controls="attendance-panel"
          className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <span className="tab-icon">📅</span>
          Davomat
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'assignments'}
          aria-controls="assignments-panel"
          className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <span className="tab-icon">📝</span>
          Vazifalar
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div id="overview-panel" role="tabpanel" className="overview-tab">
            <h2 className="section-title">📊 Sinf ko'rsatkichlari</h2>

            {selectedSubjectData && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{background: 'linear-gradient(135deg, #0d9488, #0f766e)'}}>
                    📊
                  </div>
                  <div className="stat-content">
                    <div className="stat-value" style={{color: getGradeColor(selectedSubjectData.average)}}>
                      {selectedSubjectData.average || 0}%
                    </div>
                    <div className="stat-label">O'rtacha o'zlashtirish</div>
                    <div className="stat-meta">{selectedSubjectData.totalGrades || 0} ta baho</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
                    ✅
                  </div>
                  <div className="stat-content">
                    <div className="stat-value" style={{color: getAttendanceColor(selectedSubjectData.attendanceRate)}}>
                      {selectedSubjectData.attendanceRate || 0}%
                    </div>
                    <div className="stat-label">Davomat</div>
                    <div className="stat-meta">O'rtacha kelish darajasi</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
                    👥
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{selectedClassData.studentCount || 0}</div>
                    <div className="stat-label">O'quvchilar soni</div>
                    <div className="stat-meta">{selectedClassData.className}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
                    🏆
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{selectedSubjectData.excellentCount || 0}</div>
                    <div className="stat-label">A'lo baholar</div>
                    <div className="stat-meta">85%+ o'zlashtirish</div>
                  </div>
                </div>
              </div>
            )}

            <h3 className="subsection-title">📈 Baholar taqsimoti</h3>
            {selectedSubjectData && (
              <div className="grade-distribution">
                <div className="distribution-item" style={{borderLeft: '4px solid #10b981'}}>
                  <div className="distribution-label">A'lo (85-100)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.excellentCount, selectedSubjectData.totalGrades)}%`,
                        background: '#10b981'
                      }}
                    ></div>
                  </div>
                  <div className="distribution-value">{selectedSubjectData.excellentCount || 0} ta</div>
                </div>

                <div className="distribution-item" style={{borderLeft: '4px solid #0d9488'}}>
                  <div className="distribution-label">Yaxshi (70-84)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.goodCount, selectedSubjectData.totalGrades)}%`,
                        background: '#0d9488'
                      }}
                    ></div>
                  </div>
                  <div className="distribution-value">{selectedSubjectData.goodCount || 0} ta</div>
                </div>

                <div className="distribution-item" style={{borderLeft: '4px solid #f59e0b'}}>
                  <div className="distribution-label">Qoniqarli (60-69)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.averageCount, selectedSubjectData.totalGrades)}%`,
                        background: '#f59e0b'
                      }}
                    ></div>
                  </div>
                  <div className="distribution-value">{selectedSubjectData.averageCount || 0} ta</div>
                </div>

                <div className="distribution-item" style={{borderLeft: '4px solid #ef4444'}}>
                  <div className="distribution-label">Qoniqarsiz (0-59)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.poorCount, selectedSubjectData.totalGrades)}%`,
                        background: '#ef4444'
                      }}
                    ></div>
                  </div>
                  <div className="distribution-value">{selectedSubjectData.poorCount || 0} ta</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div id="students-panel" role="tabpanel" className="students-tab">
            <h2 className="section-title">👥 O'quvchilar bo'yicha hisobot</h2>

            {studentStats.length === 0 ? (
              <div className="empty-message">
                <div className="empty-icon-small">📊</div>
                <p>Hali statistika ma'lumotlari yo'q</p>
                <small>O'quvchilarga baholar va davomat kiritganingizdan keyin bu yerda statistika ko'rinadi</small>
              </div>
            ) : (
              <div className="students-table-container">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th scope="col">№</th>
                      <th scope="col">O'quvchi</th>
                      <th scope="col">O'rtacha %</th>
                      <th scope="col">Baholar soni</th>
                      <th scope="col">Davomat</th>
                      <th scope="col">Vazifalar</th>
                      <th scope="col">Status</th>
                      <th scope="col">Batafsil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((student, index) => (
                      <tr key={student.studentId}>
                        <td className="rank-cell">{index + 1}</td>
                        <td className="student-cell">
                          <div className="student-info">
                            <div className="student-avatar" aria-hidden="true">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div>
                              <div className="student-name">{student.firstName} {student.lastName}</div>
                              <div className="student-id" aria-label="O'quvchi IDsi">{student.studentNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="grade-cell">
                          <span
                            className="grade-badge"
                            style={{background: getGradeColor(student.average || 0)}}
                          >
                            {student.average || 0}%
                          </span>
                        </td>
                        <td>{student.totalGrades || 0}</td>
                        <td>
                          <span
                            className="attendance-badge"
                            style={{background: getAttendanceColor(student.attendanceRate || 0)}}
                          >
                            {student.attendanceRate || 0}%
                          </span>
                        </td>
                        <td>
                          <div className="assignment-progress">
                            <span>{student.assignmentStats?.graded || 0}/{student.assignmentStats?.total || 0}</span>
                            <small>({student.assignmentStats?.completionRate || 0}%)</small>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${(student.average || 0) >= 85 ? 'excellent' : (student.average || 0) >= 70 ? 'good' : (student.average || 0) >= 60 ? 'average' : 'poor'}`}>
                            {(student.average || 0) >= 85 ? 'A\'lo' : (student.average || 0) >= 70 ? 'Yaxshi' : (student.average || 0) >= 60 ? 'Qoniqarli' : 'Qoniqarsiz'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openStudentDetail(student.studentId)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', padding: '0.4rem 0.7rem', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            📊 Batafsil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div id="attendance-panel" role="tabpanel" className="attendance-tab">
            <h2 className="section-title">📅 Davomat statistikasi</h2>

            {attendanceStats && attendanceStats.summary ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
                      ✅
                    </div>
                    <div className="stat-content">
                      <div className="stat-value" style={{color: '#10b981'}}>
                        {attendanceStats.summary.presentCount || 0}
                      </div>
                      <div className="stat-label">Kelganlar</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #ef4444, #dc2626)'}}>
                      ❌
                    </div>
                    <div className="stat-content">
                      <div className="stat-value" style={{color: '#ef4444'}}>
                        {attendanceStats.summary.absentCount || 0}
                      </div>
                      <div className="stat-label">Kelmaganlar</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #0d9488, #0f766e)'}}>
                      📊
                    </div>
                    <div className="stat-content">
                      <div className="stat-value" style={{color: '#0d9488'}}>
                        {attendanceStats.summary.attendanceRate || 0}%
                      </div>
                      <div className="stat-label">Umumiy davomat</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
                      📝
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{attendanceStats.summary.totalRecords || 0}</div>
                      <div className="stat-label">Jami yozuvlar</div>
                    </div>
                  </div>
                </div>

                <h3 className="subsection-title">📆 Kunlik davomat (oxirgi 30 kun)</h3>
                <div className="attendance-chart">
                  {attendanceStats.byDate && attendanceStats.byDate.length > 0 ? (
                    attendanceStats.byDate.slice(0, 10).map(day => (
                      <div key={day.date} className="day-attendance">
                        <div className="day-date">
                          {new Date(day.date).toLocaleDateString('uz-UZ', {month: 'short', day: 'numeric'})}
                        </div>
                        <div className="day-bars">
                          <div className="day-bar present" style={{width: `${calculatePercentage(day.present, day.total)}%`}}>
                            {day.present > 0 && <span>{day.present}</span>}
                          </div>
                          <div className="day-bar absent" style={{width: `${calculatePercentage(day.absent, day.total)}%`}}>
                            {day.absent > 0 && <span>{day.absent}</span>}
                          </div>
                        </div>
                        <div className="day-total">{day.total || 0} ta</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-message">
                      <p>Kunlik davomat ma'lumotlari yo'q</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-message">
                <div className="empty-icon-small">📅</div>
                <p>Davomat ma'lumotlari yo'q</p>
                <small>O'quvchilar davomat kiritganingizdan keyin bu yerda statistika ko'rinadi</small>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div id="assignments-panel" role="tabpanel" className="assignments-tab">
            <h2 className="section-title">📝 Vazifalar statistikasi</h2>

            {assignmentStats && assignmentStats.summary ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #0d9488, #0f766e)'}}>
                      📝
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{assignmentStats.summary.total || 0}</div>
                      <div className="stat-label">Jami vazifalar</div>
                      <div className="stat-meta">
                        Faol: {assignmentStats.summary.active || 0} | Yopiq: {assignmentStats.summary.closed || 0}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
                      ⏳
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{assignmentStats.summary.submissions?.submitted || 0}</div>
                      <div className="stat-label">Topshirilgan</div>
                      <div className="stat-meta">
                        Kutilmoqda: {assignmentStats.summary.submissions?.pending || 0}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
                      ✅
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{assignmentStats.summary.submissions?.graded || 0}</div>
                      <div className="stat-label">Baholangan</div>
                      <div className="stat-meta">
                        {assignmentStats.summary.completionRate || 0}% bajarildi
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
                      📊
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{assignmentStats.summary.averageGrade || 0}</div>
                      <div className="stat-label">O'rtacha ball</div>
                      <div className="stat-meta">Barcha vazifalar</div>
                    </div>
                  </div>
                </div>

                <h3 className="subsection-title">📋 Vazifalar ro'yxati</h3>
                <div className="assignments-list">
                  {assignmentStats.assignments && assignmentStats.assignments.length > 0 ? (
                    assignmentStats.assignments.map(assignment => (
                      <div key={assignment._id} className="assignment-card">
                        <div className="assignment-header">
                          <h4 className="assignment-title">{assignment.title}</h4>
                          <span className={`assignment-status ${assignment.status}`}>
                            {assignment.status === 'active' ? 'Faol' : 'Yopiq'}
                          </span>
                        </div>
                        <div className="assignment-meta">
                          <span>{assignment.className}</span>
                          <span>•</span>
                          <span>{assignment.subjectName}</span>
                          <span>•</span>
                          <span>Max: {assignment.maxScore} ball</span>
                        </div>
                        <div className="assignment-progress-bar">
                          <div className="progress-section graded" style={{width: `${calculatePercentage(assignment.submissions.graded, assignment.submissions.total)}%`}}>
                            {assignment.submissions.graded > 0 && <span>{assignment.submissions.graded}</span>}
                          </div>
                          <div className="progress-section submitted" style={{width: `${calculatePercentage(assignment.submissions.submitted, assignment.submissions.total)}%`}}>
                            {assignment.submissions.submitted > 0 && <span>{assignment.submissions.submitted}</span>}
                          </div>
                          <div className="progress-section pending" style={{width: `${calculatePercentage(assignment.submissions.pending, assignment.submissions.total)}%`}}>
                            {assignment.submissions.pending > 0 && <span>{assignment.submissions.pending}</span>}
                          </div>
                        </div>
                        <div className="assignment-stats-row">
                          <div className="stat-item">
                            <span className="stat-icon-small">✅</span>
                            <span>Baholangan: {assignment.submissions.graded || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon-small">⏳</span>
                            <span>Topshirilgan: {assignment.submissions.submitted || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon-small">⏰</span>
                            <span>Kutilmoqda: {assignment.submissions.pending || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-message">
                      <p>Vazifalar yo'q</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-message">
                <div className="empty-icon-small">📝</div>
                <p>Vazifalar statistikasi yo'q</p>
                <small>Vazifa yaratganingizdan keyin bu yerda statistika ko'rinadi</small>
              </div>
            )}
          </div>
        )}
      </div>

      {studentDetail && (
        <div
          onClick={() => setStudentDetail(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '18px', maxWidth: '560px', width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            {studentDetail._loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Yuklanmoqda...</div>
            ) : studentDetail._error ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
                Ma'lumotlarni yuklab bo'lmadi
                <div>
                  <button type="button" onClick={() => setStudentDetail(null)} style={{ marginTop: '1rem', border: 'none', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Yopish</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                      {studentDetail.student?.firstName} {studentDetail.student?.lastName}
                    </h2>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {studentDetail.student?.studentId || '—'}</div>
                  </div>
                  <button type="button" onClick={() => setStudentDetail(null)} aria-label="Yopish" style={{ border: 'none', background: '#f1f5f9', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: "O'qish", value: studentDetail.academicPercent, icon: '📚' },
                    { label: 'Davomat', value: studentDetail.attendancePercent, icon: '✅' },
                    { label: 'Umumiy', value: studentDetail.overallPercent, icon: '⭐' }
                  ].map((m) => (
                    <div key={m.label} style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.9rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem' }}>{m.icon}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getGradeColor(m.value) }}>{m.value}%</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem' }}>Oylik o'rtacha foiz trendi</div>
                  {studentDetail.trend?.labels?.length ? (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '130px', padding: '0.5rem', background: '#f8fafc', borderRadius: '12px' }}>
                      {studentDetail.trend.labels.map((lbl, i) => {
                        const v = studentDetail.trend.averages[i] || 0;
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: getGradeColor(v) }}>{v}%</div>
                            <div style={{ width: '100%', maxWidth: '34px', height: `${Math.max(4, v)}%`, background: getGradeColor(v), borderRadius: '6px 6px 0 0' }} />
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.3rem' }}>{lbl}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>Trend uchun ma'lumot yo'q</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem' }}>Fan bo'yicha o'zlashtirish</div>
                  {studentDetail.subjects?.length ? studentDetail.subjects.map((s) => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '34%', fontSize: '0.82rem', color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${s.percent}%`, height: '100%', background: getGradeColor(s.percent) }} />
                      </div>
                      <div style={{ width: '42px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: getGradeColor(s.percent) }}>{s.percent}%</div>
                    </div>
                  )) : (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Baholar yo'q</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .teacher-reports {
    padding: 1.5rem;
    background: #f8fafc;
    min-height: 100vh;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    gap: 1rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e2e8f0;
    border-top-color: #0d9488;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-small {
    width: 20px;
    height: 20px;
    border: 3px solid #e2e8f0;
    border-top-color: #0d9488;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .data-loading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    border-radius: 8px;
    margin-bottom: 1rem;
    color: #115e59;
    font-size: 0.875rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin-bottom: 1rem;
    color: #991b1b;
    font-size: 0.875rem;
  }

  .error-icon-small {
    font-size: 1.25rem;
  }

  .retry-btn-small {
    margin-left: auto;
    padding: 0.375rem 0.75rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-btn-small:hover {
    background: #b91c1c;
  }

  .error-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-state h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #991b1b;
    margin-bottom: 0.5rem;
  }

  .error-state p {
    font-size: 1rem;
    color: #dc2626;
    margin-bottom: 1.5rem;
  }

  .retry-btn {
    padding: 0.75rem 1.5rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-btn:hover {
    background: #b91c1c;
    transform: translateY(-1px);
  }

  .page-header {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .page-subtitle {
    font-size: 0.9375rem;
    color: #64748b;
    margin: 0;
  }

  .demo-banner {
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
    border: 1px solid #93c5fd;
    border-left: 4px solid #0d9488;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .demo-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .demo-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .demo-content strong {
    color: #115e59;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .demo-content span {
    color: #115e59;
    font-size: 0.8125rem;
  }

  .filters-section {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
  }

  .filter-select {
    padding: 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.9375rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-select:focus {
    outline: none;
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .tabs-container {
    background: white;
    padding: 0.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
  }

  .tab-button {
    flex: 1;
    min-width: 150px;
    padding: 0.875rem 1rem;
    border: none;
    background: transparent;
    color: #64748b;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .tab-button:hover {
    background: #f8fafc;
    color: #1e293b;
  }

  .tab-button:focus {
    outline: 2px solid #0d9488;
    outline-offset: 2px;
  }

  .tab-button.active {
    background: linear-gradient(135deg, #0d9488, #0f766e);
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .tab-icon {
    font-size: 1.125rem;
  }

  .tab-content {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
  }

  .section-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1.5rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e2e8f0;
  }

  .subsection-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 2rem 0 1rem 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    gap: 1rem;
    align-items: center;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .stat-meta {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .grade-distribution {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .distribution-item {
    background: #f8fafc;
    padding: 1rem;
    border-radius: 8px;
    display: grid;
    grid-template-columns: 150px 1fr 80px;
    gap: 1rem;
    align-items: center;
  }

  .distribution-label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #1e293b;
  }

  .distribution-bar {
    background: #e2e8f0;
    height: 32px;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .distribution-fill {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.8125rem;
    transition: width 0.5s ease;
    min-width: 0;
  }

  .distribution-value {
    text-align: right;
    font-weight: 700;
    color: #1e293b;
  }

  .students-table-container {
    overflow-x: auto;
    margin-top: 1rem;
  }

  .students-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  .students-table th {
    background: #f8fafc;
    padding: 0.875rem 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.875rem;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
  }

  .students-table td {
    padding: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .students-table tbody tr:hover {
    background: #f8fafc;
  }

  .rank-cell {
    font-weight: 700;
    color: #0d9488;
    font-size: 1.125rem;
  }

  .student-cell {
    min-width: 220px;
  }

  .student-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .student-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8125rem;
  }

  .student-name {
    font-weight: 600;
    color: #1e293b;
  }

  .student-id {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .grade-badge, .attendance-badge {
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    color: white;
    font-weight: 700;
    font-size: 0.875rem;
    display: inline-block;
  }

  .assignment-progress {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .assignment-progress small {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .status-badge {
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 600;
    display: inline-block;
  }

  .status-excellent {
    background: #d1fae5;
    color: #065f46;
  }

  .status-good {
    background: #ccfbf1;
    color: #115e59;
  }

  .status-average {
    background: #fef3c7;
    color: #92400e;
  }

  .status-poor {
    background: #fee2e2;
    color: #991b1b;
  }

  .attendance-chart {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .day-attendance {
    display: grid;
    grid-template-columns: 80px 1fr 80px;
    gap: 1rem;
    align-items: center;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 8px;
  }

  .day-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
  }

  .day-bars {
    display: flex;
    height: 32px;
    border-radius: 6px;
    overflow: hidden;
    background: #e2e8f0;
  }

  .day-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.75rem;
    min-width: 0;
  }

  .day-bar.present {
    background: #10b981;
  }

  .day-bar.absent {
    background: #ef4444;
  }

  .day-total {
    text-align: right;
    font-weight: 600;
    color: #1e293b;
  }

  .assignments-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .assignment-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem;
    transition: all 0.2s;
  }

  .assignment-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  .assignment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .assignment-title {
    font-size: 1.0625rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .assignment-status {
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .assignment-status.active {
    background: #d1fae5;
    color: #065f46;
  }

  .assignment-status.closed {
    background: #e2e8f0;
    color: #475569;
  }

  .assignment-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .assignment-progress-bar {
    display: flex;
    height: 36px;
    border-radius: 8px;
    overflow: hidden;
    background: #e2e8f0;
    margin-bottom: 1rem;
  }

  .progress-section {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.875rem;
    transition: width 0.5s ease;
    min-width: 0;
  }

  .progress-section.graded {
    background: #10b981;
  }

  .progress-section.submitted {
    background: #f59e0b;
  }

  .progress-section.pending {
    background: #64748b;
  }

  .assignment-stats-row {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #475569;
  }

  .stat-icon-small {
    font-size: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-state h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    font-size: 0.9375rem;
    color: #64748b;
  }

  .empty-message {
    text-align: center;
    padding: 3rem 2rem;
    color: #64748b;
    font-size: 1rem;
  }

  .empty-icon-small {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .empty-message small {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #94a3b8;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .teacher-reports {
      padding: 1rem;
    }

    .page-header {
      padding: 1.25rem;
    }

    .page-title {
      font-size: 1.5rem;
    }

    .filters-section {
      grid-template-columns: 1fr;
    }

    .tabs-container {
      flex-direction: column;
    }

    .tab-button {
      width: 100%;
      min-width: 0;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .distribution-item {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .distribution-bar {
      order: 3;
    }

    .students-table {
      font-size: 0.875rem;
    }

    .students-table th,
    .students-table td {
      padding: 0.75rem 0.5rem;
    }

    .day-attendance {
      grid-template-columns: 70px 1fr 70px;
      gap: 0.75rem;
    }
  }
`;

export default TeacherReports;
