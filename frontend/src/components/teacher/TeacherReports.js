import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../services/apiService';
import { formatUzShortDate } from '../../utils/uzDate';
import TeacherUiIcon from './TeacherUiIcon';
import './TeacherReports.css';

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
    if (average >= 85) return '#1f9d68';
    if (average >= 70) return '#2f6fdb';
    if (average >= 60) return '#c98a18';
    return '#c5453b';
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return '#1f9d68';
    if (rate >= 75) return '#2f6fdb';
    if (rate >= 60) return '#c98a18';
    return '#c5453b';
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
          <p className="page-eyebrow">Tahlil</p>
          <h1 className="page-title">Hisobotlar</h1>
          <p className="page-subtitle">Sinf va o'quvchilar bo'yicha batafsil statistika</p>
        </div>
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Ma'lumotlar yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  // Sinf biriktirilmagan yoki ma'lumot yo'q
  if (classStats.length === 0) {
    return (
      <div className="teacher-reports">
        <div className="page-header">
          <p className="page-eyebrow">Tahlil</p>
          <h1 className="page-title">Hisobotlar</h1>
          <p className="page-subtitle">Sinf va o'quvchilar bo'yicha batafsil statistika</p>
        </div>
        {error && (
          <div className="error-banner">
            <span className="error-icon-small"><TeacherUiIcon name="warning" size={17} /></span>
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
      </div>
    );
  }

  return (
    <div className="teacher-reports">
      <div className="page-header">
        <p className="page-eyebrow">Tahlil</p>
          <h1 className="page-title">Hisobotlar</h1>
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
          <span className="error-icon-small"><TeacherUiIcon name="warning" size={17} /></span>
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
          <span className="tab-icon"><TeacherUiIcon name="report" size={17} /></span>
          Umumiy ko'rinish
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'students'}
          aria-controls="students-panel"
          className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <span className="tab-icon"><TeacherUiIcon name="users" size={17} /></span>
          O'quvchilar
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'attendance'}
          aria-controls="attendance-panel"
          className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <span className="tab-icon"><TeacherUiIcon name="calendar" size={17} /></span>
          Davomat
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'assignments'}
          aria-controls="assignments-panel"
          className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <span className="tab-icon"><TeacherUiIcon name="assignment" size={17} /></span>
          Vazifalar
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div id="overview-panel" role="tabpanel" className="overview-tab">
            <h2 className="section-title"><TeacherUiIcon name="report" /> Sinf ko'rsatkichlari</h2>

            {selectedSubjectData && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <TeacherUiIcon name="report" size={22} />
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
                  <div className="stat-icon">
                    <TeacherUiIcon name="check" size={22} />
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
                  <div className="stat-icon">
                    <TeacherUiIcon name="users" size={22} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{selectedClassData.studentCount || 0}</div>
                    <div className="stat-label">O'quvchilar soni</div>
                    <div className="stat-meta">{selectedClassData.className}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <TeacherUiIcon name="star" size={22} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{selectedSubjectData.excellentCount || 0}</div>
                    <div className="stat-label">A'lo baholar</div>
                    <div className="stat-meta">85%+ o'zlashtirish</div>
                  </div>
                </div>
              </div>
            )}

            <h3 className="subsection-title"><TeacherUiIcon name="report" size={18} /> Baholar taqsimoti</h3>
            {selectedSubjectData && (
              <div className="grade-distribution">
                <div className="distribution-item" style={{borderLeft: '4px solid #1f9d68'}}>
                  <div className="distribution-label">A'lo (85-100)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.excellentCount, selectedSubjectData.totalGrades)}%`,
                        background: '#1f9d68'
                      }}
                    ></div>
                  </div>
                  <div className="distribution-value">{selectedSubjectData.excellentCount || 0} ta</div>
                </div>

                <div className="distribution-item" style={{borderLeft: '4px solid #2f6fdb'}}>
                  <div className="distribution-label">Yaxshi (70-84)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.goodCount, selectedSubjectData.totalGrades)}%`,
                        background: '#2f6fdb'
                      }}
                    ></div>
                  </div>
                  <div className="distribution-value">{selectedSubjectData.goodCount || 0} ta</div>
                </div>

                <div className="distribution-item" style={{borderLeft: '4px solid #d9a441'}}>
                  <div className="distribution-label">Qoniqarli (60-69)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.averageCount, selectedSubjectData.totalGrades)}%`,
                        background: '#d9a441'
                      }}
                    ></div>
                  </div>
                  <div className="distribution-value">{selectedSubjectData.averageCount || 0} ta</div>
                </div>

                <div className="distribution-item" style={{borderLeft: '4px solid #c5453b'}}>
                  <div className="distribution-label">Qoniqarsiz (0-59)</div>
                  <div className="distribution-bar">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${calculatePercentage(selectedSubjectData.poorCount, selectedSubjectData.totalGrades)}%`,
                        background: '#c5453b'
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
            <h2 className="section-title"><TeacherUiIcon name="users" /> O'quvchilar bo'yicha hisobot</h2>

            {studentStats.length === 0 ? (
              <div className="empty-message">
                <div className="empty-icon-small"><TeacherUiIcon name="report" size={24} /></div>
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
                            className="detail-btn"
                            onClick={() => openStudentDetail(student.studentId)}
                          >
                            <TeacherUiIcon name="report" size={14} /> Batafsil
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
            <h2 className="section-title"><TeacherUiIcon name="calendar" /> Davomat statistikasi</h2>

            {attendanceStats && attendanceStats.summary ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <TeacherUiIcon name="check" size={22} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value" style={{color: '#1f9d68'}}>
                        {attendanceStats.summary.presentCount || 0}
                      </div>
                      <div className="stat-label">Kelganlar</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <TeacherUiIcon name="close" size={22} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value" style={{color: '#c5453b'}}>
                        {attendanceStats.summary.absentCount || 0}
                      </div>
                      <div className="stat-label">Kelmaganlar</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <TeacherUiIcon name="report" size={22} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value" style={{color: '#2f6fdb'}}>
                        {attendanceStats.summary.attendanceRate || 0}%
                      </div>
                      <div className="stat-label">Umumiy davomat</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <TeacherUiIcon name="assignment" size={22} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{attendanceStats.summary.totalRecords || 0}</div>
                      <div className="stat-label">Jami yozuvlar</div>
                    </div>
                  </div>
                </div>

                <h3 className="subsection-title"><TeacherUiIcon name="calendar" size={18} /> Kunlik davomat (oxirgi 30 kun)</h3>
                <div className="attendance-chart">
                  {attendanceStats.byDate && attendanceStats.byDate.length > 0 ? (
                    attendanceStats.byDate.slice(0, 10).map(day => (
                      <div key={day.date} className="day-attendance">
                        <div className="day-date">
                          {formatUzShortDate(day.date)}
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
                <div className="empty-icon-small"><TeacherUiIcon name="calendar" size={24} /></div>
                <p>Davomat ma'lumotlari yo'q</p>
                <small>O'quvchilar davomat kiritganingizdan keyin bu yerda statistika ko'rinadi</small>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div id="assignments-panel" role="tabpanel" className="assignments-tab">
            <h2 className="section-title"><TeacherUiIcon name="assignment" /> Vazifalar statistikasi</h2>

            {assignmentStats && assignmentStats.summary ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <TeacherUiIcon name="assignment" size={22} />
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
                    <div className="stat-icon">
                      <TeacherUiIcon name="clock" size={22} />
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
                    <div className="stat-icon">
                      <TeacherUiIcon name="check" size={22} />
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
                    <div className="stat-icon">
                      <TeacherUiIcon name="report" size={22} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{assignmentStats.summary.averageGrade || 0}</div>
                      <div className="stat-label">O'rtacha ball</div>
                      <div className="stat-meta">Barcha vazifalar</div>
                    </div>
                  </div>
                </div>

                <h3 className="subsection-title"><TeacherUiIcon name="assignment" size={18} /> Vazifalar ro'yxati</h3>
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
                            <span className="stat-icon-small"><TeacherUiIcon name="check" size={13} /></span>
                            <span>Baholangan: {assignment.submissions.graded || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon-small"><TeacherUiIcon name="clock" size={13} /></span>
                            <span>Topshirilgan: {assignment.submissions.submitted || 0}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-icon-small"><TeacherUiIcon name="clock" size={13} /></span>
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
                <div className="empty-icon-small"><TeacherUiIcon name="assignment" size={24} /></div>
                <p>Vazifalar statistikasi yo'q</p>
                <small>Vazifa yaratganingizdan keyin bu yerda statistika ko'rinadi</small>
              </div>
            )}
          </div>
        )}
      </div>

      {studentDetail && (
        <div className="detail-overlay" onClick={() => setStudentDetail(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            {studentDetail._loading ? (
              <div className="detail-loading">Yuklanmoqda...</div>
            ) : studentDetail._error ? (
              <div className="detail-error">
                <p>Ma'lumotlarni yuklab bo'lmadi</p>
                <button type="button" className="retry-btn-small" onClick={() => setStudentDetail(null)}>
                  Yopish
                </button>
              </div>
            ) : (
              <>
                <div className="detail-head">
                  <div>
                    <h2 className="detail-title">
                      {studentDetail.student?.firstName} {studentDetail.student?.lastName}
                    </h2>
                    <div className="detail-id">ID: {studentDetail.student?.studentId || '—'}</div>
                  </div>
                  <button type="button" className="detail-close" onClick={() => setStudentDetail(null)} aria-label="Yopish">
                    <TeacherUiIcon name="close" size={17} />
                  </button>
                </div>

                <div className="detail-metrics">
                  {[
                    { label: "O'qish", value: studentDetail.academicPercent, icon: 'book' },
                    { label: 'Davomat', value: studentDetail.attendancePercent, icon: 'check' },
                    { label: 'Umumiy', value: studentDetail.overallPercent, icon: 'star' }
                  ].map((m) => (
                    <div key={m.label} className="detail-metric">
                      <div className="detail-metric-icon"><TeacherUiIcon name={m.icon} size={19} /></div>
                      <div className="detail-metric-value" style={{ color: getGradeColor(m.value) }}>{m.value}%</div>
                      <div className="detail-metric-label">{m.label}</div>
                    </div>
                  ))}
                </div>

                <div className="detail-block">
                  <div className="detail-block-title">Oylik o'rtacha foiz trendi</div>
                  {studentDetail.trend?.labels?.length ? (
                    <div className="detail-trend">
                      {studentDetail.trend.labels.map((lbl, i) => {
                        const v = studentDetail.trend.averages[i] || 0;
                        return (
                          <div key={i} className="detail-trend-col">
                            <div className="detail-trend-value" style={{ color: getGradeColor(v) }}>{v}%</div>
                            <div className="detail-trend-bar" style={{ height: `${Math.max(4, v)}%`, background: getGradeColor(v) }} />
                            <div className="detail-trend-label">{lbl}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="detail-empty">Trend uchun ma'lumot yo'q</div>
                  )}
                </div>

                <div className="detail-block">
                  <div className="detail-block-title">Fan bo'yicha o'zlashtirish</div>
                  {studentDetail.subjects?.length ? studentDetail.subjects.map((s) => (
                    <div key={s.name} className="detail-subject-row">
                      <div className="detail-subject-name">{s.name}</div>
                      <div className="detail-subject-track">
                        <div className="detail-subject-fill" style={{ width: `${s.percent}%`, background: getGradeColor(s.percent) }} />
                      </div>
                      <div className="detail-subject-value" style={{ color: getGradeColor(s.percent) }}>{s.percent}%</div>
                    </div>
                  )) : (
                    <div className="detail-empty">Baholar yo'q</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};


export default TeacherReports;
