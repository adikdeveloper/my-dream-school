import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/authService';
import { usePermissions } from '../../context/PermissionsContext';
import styles from './StudentLists.module.css';

const StudentLists = () => {
  const { can } = usePermissions();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState(false);
  // Yangi o'quvchi qo'shish
  const [showAddModal, setShowAddModal] = useState(false);
  const [myClasses, setMyClasses] = useState([]);
  const [addForm, setAddForm] = useState({
    firstName: '', lastName: '', phone: '', password: '', classId: '',
    dateOfBirth: '', address: '', parentName: '', parentPhone: ''
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const studentsPerPage = 10;
  const canCreate = can('teacher.create_student');
  const canDelete = can('teacher.delete_student');

  useEffect(() => {
    fetchStudents();
  }, []);

  // O'quvchi qo'shish ruxsati bo'lsa — o'qituvchining sinflarini yuklaymiz
  useEffect(() => {
    if (!canCreate) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/classes/teacher/my-classes');
        if (!cancelled) setMyClasses(Array.isArray(res.data) ? res.data : []);
      } catch (_) { /* sinflar yuklanmadi — qo'shish formasi bo'sh bo'ladi */ }
    })();
    return () => { cancelled = true; };
  }, [canCreate]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/classes/teacher/students');
      setStudents(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Sizga biriktirilgan o\'quvchilar topilmadi');
      } else if (err.response?.status === 403) {
        setError('Sizda bu ma\'lumotlarga kirish huquqi yo\'q');
      } else if (!err.response) {
        setError('Internet aloqasini tekshiring');
      } else {
        setError('O\'quvchilarni yuklashda xatolik yuz berdi');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get unique classes for filter
  const availableClasses = useMemo(() => {
    const classSet = new Set();
    students.forEach(student => {
      if (student.classes && Array.isArray(student.classes)) {
        student.classes.forEach(cls => classSet.add(cls));
      } else if (student.className) {
        classSet.add(student.className);
      }
    });
    return Array.from(classSet).sort();
  }, [students]);

  // Filter and search students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        searchQuery === '' ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        filterClass === '' ||
        student.className?.includes(filterClass) ||
        student.classes?.includes(filterClass);

      return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, filterClass]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage;
    return filteredStudents.slice(startIndex, startIndex + studentsPerPage);
  }, [filteredStudents, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClass]);

  const handleViewProfile = useCallback((student) => {
    setSelectedStudent(student);
    setShowProfileModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowProfileModal(false);
    setSelectedStudent(null);
  }, []);

  const handleRetry = useCallback(() => {
    fetchStudents();
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterClass('');
    setCurrentPage(1);
  }, []);

  const handleStartEdit = useCallback(() => {
    setEditForm({
      firstName: selectedStudent?.firstName || '',
      lastName: selectedStudent?.lastName || '',
      phone: selectedStudent?.phone || '',
      address: selectedStudent?.address || '',
      dateOfBirth: selectedStudent?.dateOfBirth?.split('T')[0] || '',
      parentName: selectedStudent?.parentName || '',
      parentPhone: selectedStudent?.parentPhone || ''
    });
    setIsEditing(true);
    setEditError('');
    setEditSuccess('');
  }, [selectedStudent]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({});
    setEditError('');
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedStudent?._id) return;

    setSaving(true);
    setEditError('');
    setEditSuccess('');

    try {
      const submitData = new FormData();
      Object.keys(editForm).forEach(key => {
        if (editForm[key]) {
          submitData.append(key, editForm[key]);
        }
      });

      await api.put(`/users/${selectedStudent._id}`, submitData);

      // Update local state
      setStudents(prev => prev.map(s =>
        s._id === selectedStudent._id
          ? { ...s, ...editForm }
          : s
      ));
      setSelectedStudent(prev => ({ ...prev, ...editForm }));

      setEditSuccess('O\'quvchi ma\'lumotlari saqlandi!');
      setIsEditing(false);

      // Refresh students list
      setTimeout(() => {
        fetchStudents();
        setEditSuccess('');
      }, 1500);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }, [selectedStudent, editForm]);

  const handleDeleteStudent = useCallback(async () => {
    if (!selectedStudent?._id) return;
    const ok = window.confirm(
      `"${selectedStudent.firstName} ${selectedStudent.lastName}" o'quvchisini o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.`
    );
    if (!ok) return;

    setDeleting(true);
    setEditError('');
    try {
      await api.delete(`/users/${selectedStudent._id}`);
      setStudents(prev => prev.filter(s => s._id !== selectedStudent._id));
      handleCloseModal();
    } catch (err) {
      setEditError(err.response?.data?.message || "O'chirishda xatolik yuz berdi");
    } finally {
      setDeleting(false);
    }
  }, [selectedStudent, handleCloseModal]);

  const handleOpenAdd = useCallback(() => {
    setAddForm({
      firstName: '', lastName: '', phone: '', password: '',
      classId: myClasses.length === 1 ? myClasses[0]._id : '',
      dateOfBirth: '', address: '', parentName: '', parentPhone: ''
    });
    setAddError('');
    setAddSuccess('');
    setShowAddModal(true);
  }, [myClasses]);

  const handleAddChange = useCallback((e) => {
    const { name, value } = e.target;
    setAddForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleAddSubmit = useCallback(async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setAddError('Ism va familiya kiritilishi shart');
      return;
    }
    if (!addForm.classId) {
      setAddError('Sinf tanlanishi shart');
      return;
    }
    if (!addForm.phone.trim()) {
      setAddError('Telefon raqami kiritilishi shart');
      return;
    }
    if (!addForm.password || addForm.password.length < 6) {
      setAddError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    setAdding(true);
    try {
      await api.post('/auth/register', {
        role: 'student',
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        phone: addForm.phone.trim(),
        password: addForm.password,
        classId: addForm.classId,
        dateOfBirth: addForm.dateOfBirth || undefined,
        address: addForm.address || undefined,
        parentName: addForm.parentName || undefined,
        parentPhone: addForm.parentPhone || undefined
      });
      setAddSuccess('Yangi o\'quvchi qo\'shildi!');
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
        fetchStudents();
      }, 1200);
    } catch (err) {
      setAddError(err.response?.data?.message || 'O\'quvchi qo\'shishda xatolik yuz berdi');
    } finally {
      setAdding(false);
    }
  }, [addForm]);

  if (loading) {
    return (
      <div className={styles.studentLists}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Mening O'quvchilarim</h1>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>O'quvchilar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.studentLists}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Mening O'quvchilarim</h1>
        </div>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <p className={styles.errorMessage}>{error}</p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleRetry}>
            🔄 Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.studentLists}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className={styles.pageTitle}>Mening O'quvchilarim</h1>
            <p className={styles.pageSubtitle}>
              Jami {filteredStudents.length} ta o'quvchi
            </p>
          </div>
          {canCreate && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleOpenAdd}
              style={{ whiteSpace: 'nowrap' }}
            >
              ➕ Yangi o'quvchi
            </button>
          )}
        </div>
      </div>

      {students.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📚</div>
          <h3>Hozircha o'quvchilar yo'q</h3>
          <p>Sizga biriktirilgan sinflar va o'quvchilar bu yerda ko'rinadi</p>
        </div>
      ) : (
        <>
          {/* Filters Section */}
          <div className={styles.filtersSection}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Ism, familiya, ID yoki telefon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {(searchQuery || filterClass) && (
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.clearBtn}`} onClick={handleClearFilters}>
                ✕ Tozalash
              </button>
            )}
          </div>

          {/* Class Filter Boxes */}
          {availableClasses.length > 0 && (
            <div className={styles.classFilterSection}>
              <h3 className={styles.filterTitle}>Sinflar:</h3>
              <div className={styles.classBoxesGrid}>
                <div
                  className={`${styles.classBox} ${filterClass === '' ? styles.classBoxActive : ''}`}
                  onClick={() => setFilterClass('')}
                >
                  <div className={styles.classBoxIcon}>📚</div>
                  <div className={styles.classBoxLabel}>Barchasi</div>
                  <div className={styles.classBoxCount}>{students.length}</div>
                </div>
                {availableClasses.map((cls) => {
                  const classStudentCount = students.filter(s =>
                    s.className?.includes(cls) || s.classes?.includes(cls)
                  ).length;
                  return (
                    <div
                      key={cls}
                      className={`${styles.classBox} ${filterClass === cls ? styles.classBoxActive : ''}`}
                      onClick={() => setFilterClass(cls)}
                    >
                      <div className={styles.classBoxIcon}>🎓</div>
                      <div className={styles.classBoxLabel}>{cls}</div>
                      <div className={styles.classBoxCount}>{classStudentCount}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredStudents.length === 0 ? (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>🔍</div>
              <h3>Natija topilmadi</h3>
              <p>Qidiruv shartlariga mos o'quvchi yo'q</p>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleClearFilters}>
                Tozalash
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={`${styles.tableContainer} ${styles.desktopView}`}>
                <table className={styles.studentsTable}>
                  <thead>
                    <tr>
                      <th>Avatar</th>
                      <th>ID</th>
                      <th>Ism Familiya</th>
                      <th>Sinf</th>
                      <th>Telefon</th>
                      <th>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map(student => (
                      <tr key={student._id}>
                        <td>
                          <div className={styles.studentAvatar}>
                            {student.profileImage ? (
                              <img
                                src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${student.profileImage}`}
                                alt={`${student.firstName} ${student.lastName}`}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`;
                                }}
                              />
                            ) : (
                              `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`
                            )}
                          </div>
                        </td>
                        <td className={styles.studentId}>{student.studentId || 'N/A'}</td>
                        <td className={styles.studentName}>
                          {student.firstName} {student.lastName}
                        </td>
                        <td className={styles.studentClass}>
                          {student.className || 'N/A'}
                        </td>
                        <td className={styles.studentPhone}>{student.phone || 'N/A'}</td>
                        <td>
                          <button
                            className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
                            onClick={() => handleViewProfile(student)}
                          >
                            👁️ Profil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className={`${styles.cardsContainer} ${styles.mobileView}`}>
                {paginatedStudents.map(student => (
                  <div key={student._id} className={styles.studentCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.studentAvatar}>
                        {student.profileImage ? (
                          <img
                            src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${student.profileImage}`}
                            alt={`${student.firstName} ${student.lastName}`}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`;
                            }}
                          />
                        ) : (
                          `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`
                        )}
                      </div>
                      <div className={styles.cardTitle}>
                        <h3>{student.firstName} {student.lastName}</h3>
                        <span className={styles.studentIdBadge}>{student.studentId}</span>
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardInfo}>
                        <span className={styles.infoLabel}>Sinf:</span>
                        <span className={styles.infoValue}>{student.className || 'N/A'}</span>
                      </div>
                      <div className={styles.cardInfo}>
                        <span className={styles.infoLabel}>Telefon:</span>
                        <span className={styles.infoValue}>{student.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <div className={styles.cardFooter}>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
                        onClick={() => handleViewProfile(student)}
                      >
                        👁️ Profilni ko'rish
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.paginationBtn}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    ← Oldingi
                  </button>

                  <div className={styles.paginationNumbers}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            className={`${styles.paginationNumber} ${page === currentPage ? styles.paginationNumberActive : ''}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className={styles.paginationDots}>...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    className={styles.paginationBtn}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Keyingi →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedStudent && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>O'quvchi profili</h2>
              <button className={styles.modalClose} onClick={handleCloseModal}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.profileAvatarLarge}>
                {selectedStudent.profileImage ? (
                  <img
                    src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${selectedStudent.profileImage}`}
                    alt={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `${selectedStudent.firstName?.[0] || ''}${selectedStudent.lastName?.[0] || ''}`;
                    }}
                  />
                ) : (
                  `${selectedStudent.firstName?.[0] || ''}${selectedStudent.lastName?.[0] || ''}`
                )}
              </div>
              <h3 className={styles.profileName}>
                {selectedStudent.firstName} {selectedStudent.lastName}
              </h3>
              <div className={styles.profileDetails}>
                {editSuccess && (
                  <div className={styles.successAlert}>✅ {editSuccess}</div>
                )}
                {editError && (
                  <div className={styles.errorAlert}>⚠️ {editError}</div>
                )}

                {isEditing ? (
                  // Edit Form
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Ism</label>
                      <input
                        type="text"
                        name="firstName"
                        value={editForm.firstName}
                        onChange={handleEditChange}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Familiya</label>
                      <input
                        type="text"
                        name="lastName"
                        value={editForm.lastName}
                        onChange={handleEditChange}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Telefon</label>
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditChange}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tug'ilgan sana</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={editForm.dateOfBirth}
                        onChange={handleEditChange}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Manzil</label>
                      <input
                        type="text"
                        name="address"
                        value={editForm.address}
                        onChange={handleEditChange}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Ota-ona ismi</label>
                      <input
                        type="text"
                        name="parentName"
                        value={editForm.parentName}
                        onChange={handleEditChange}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Ota-ona telefoni</label>
                      <input
                        type="tel"
                        name="parentPhone"
                        value={editForm.parentPhone}
                        onChange={handleEditChange}
                        className={styles.formInput}
                      />
                    </div>
                  </>
                ) : (
                  // View Mode
                  <>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>O'quvchi ID:</span>
                      <span className={styles.detailValue}>{selectedStudent.studentId || 'N/A'}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Sinf:</span>
                      <span className={styles.detailValue}>{selectedStudent.className || 'N/A'}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Telefon:</span>
                      <span className={styles.detailValue}>{selectedStudent.phone || 'N/A'}</span>
                    </div>
                    {selectedStudent.dateOfBirth && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Tug'ilgan sana:</span>
                        <span className={styles.detailValue}>{new Date(selectedStudent.dateOfBirth).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    )}
                    {selectedStudent.address && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Manzil:</span>
                        <span className={styles.detailValue}>{selectedStudent.address}</span>
                      </div>
                    )}
                    {selectedStudent.parentName && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Ota-ona:</span>
                        <span className={styles.detailValue}>{selectedStudent.parentName}</span>
                      </div>
                    )}
                    {selectedStudent.parentPhone && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Ota-ona tel:</span>
                        <span className={styles.detailValue}>{selectedStudent.parentPhone}</span>
                      </div>
                    )}
                    {selectedStudent.classes && selectedStudent.classes.length > 1 && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Barcha sinflar:</span>
                        <span className={styles.detailValue}>{selectedStudent.classes.join(', ')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              {!isEditing ? (
                <>
                  {can('teacher.edit_student_info') && (
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleStartEdit}>
                      ✏️ Tahrirlash
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={handleDeleteStudent}
                      disabled={deleting}
                      style={{ background: '#ef4444', color: '#fff' }}
                    >
                      {deleting ? 'O\'chirilmoqda...' : '🗑️ O\'chirish'}
                    </button>
                  )}
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCloseModal}>
                    Yopish
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`${styles.btn} ${styles.btnSuccess}`}
                    onClick={handleSaveEdit}
                    disabled={saving}
                  >
                    {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCancelEdit}>
                    Bekor qilish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Yangi o'quvchi qo'shish modali */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => !adding && setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Yangi o'quvchi qo'shish</h2>
              <button className={styles.modalClose} onClick={() => !adding && setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.profileDetails}>
                  {addSuccess && <div className={styles.successAlert}>✅ {addSuccess}</div>}
                  {addError && <div className={styles.errorAlert}>⚠️ {addError}</div>}

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Sinf *</label>
                    <select
                      name="classId"
                      value={addForm.classId}
                      onChange={handleAddChange}
                      className={styles.formInput}
                      required
                    >
                      <option value="">— Sinfni tanlang —</option>
                      {myClasses.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    {myClasses.length === 0 && (
                      <small style={{ color: '#ef4444' }}>
                        Sizga biriktirilgan sinf topilmadi. O'quvchi qo'shish uchun avval sinfga biriktirilishingiz kerak.
                      </small>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ism *</label>
                    <input type="text" name="firstName" value={addForm.firstName} onChange={handleAddChange} className={styles.formInput} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Familiya *</label>
                    <input type="text" name="lastName" value={addForm.lastName} onChange={handleAddChange} className={styles.formInput} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Telefon *</label>
                    <input type="tel" name="phone" value={addForm.phone} onChange={handleAddChange} className={styles.formInput} placeholder="901234567" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Parol *</label>
                    <input type="text" name="password" value={addForm.password} onChange={handleAddChange} className={styles.formInput} placeholder="Kamida 6 ta belgi" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tug'ilgan sana</label>
                    <input type="date" name="dateOfBirth" value={addForm.dateOfBirth} onChange={handleAddChange} className={styles.formInput} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Manzil</label>
                    <input type="text" name="address" value={addForm.address} onChange={handleAddChange} className={styles.formInput} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ota-ona ismi</label>
                    <input type="text" name="parentName" value={addForm.parentName} onChange={handleAddChange} className={styles.formInput} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ota-ona telefoni</label>
                    <input type="tel" name="parentPhone" value={addForm.parentPhone} onChange={handleAddChange} className={styles.formInput} placeholder="901234567" />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="submit" className={`${styles.btn} ${styles.btnSuccess}`} disabled={adding || myClasses.length === 0}>
                  {adding ? 'Qo\'shilmoqda...' : '💾 Qo\'shish'}
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowAddModal(false)} disabled={adding}>
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLists;
