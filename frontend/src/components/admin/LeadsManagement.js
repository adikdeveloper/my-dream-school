import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import { useData } from '../../context/DataContext';
import LoadingOverlay from '../common/LoadingOverlay';

const LeadsManagement = () => {
  const { setLoading, setError } = useData();
  const [leads, setLeads] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    yangi: 0,
    aloqada: 0,
    oquvchi: 0
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '+998-',
    source: 'Boshqa',
    status: 'Yangi',
    notes: '',
    interestedCourse: ''
  });

  const fetchLeads = async () => {
    try {
      setLocalLoading(true);
      setLoading(true);
      const data = await apiService.getLeads();
      setLeads(data);
      calculateStats(data);
    } catch (error) {
      setLocalError('Lidlarni yuklashda xatolik yuz berdi.');
      setError('Lidlarni yuklashda xatolik yuz berdi.');
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateStats = (data) => {
    const s = {
      total: data.length,
      yangi: data.filter(l => l.status === 'Yangi').length,
      aloqada: data.filter(l => l.status === 'Aloqaga chiqildi').length,
      oquvchi: data.filter(l => l.status === 'O\'quvchi bo\'ldi').length
    };
    setStats(s);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    let inputVal = e.target.value;
    
    if (inputVal === '+998' || inputVal === '+99' || inputVal === '+9' || inputVal === '+' || inputVal === '') {
        setFormData(prev => ({ ...prev, phone: '+998-' }));
        return;
    }

    let digits = inputVal.replace(/\D/g, '');
    
    if (digits.startsWith('998')) {
        digits = digits.substring(3);
    }
    
    let formatted = '+998-';
    if (digits.length > 0) formatted += digits.substring(0, 2);
    if (digits.length > 2) formatted += '-' + digits.substring(2, 5);
    if (digits.length > 5) formatted += '-' + digits.substring(5, 7);
    if (digits.length > 7) formatted += '-' + digits.substring(7, 9);

    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setCurrentLead(lead);
      setFormData({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        phone: lead.phone || '+998-',
        source: lead.source || 'Boshqa',
        status: lead.status || 'Yangi',
        notes: lead.notes || '',
        interestedCourse: lead.interestedCourse || ''
      });
    } else {
      setCurrentLead(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '+998-',
        source: 'Boshqa',
        status: 'Yangi',
        notes: '',
        interestedCourse: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentLead(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLocalLoading(true);
      if (currentLead) {
        await apiService.updateLead(currentLead._id, formData);
      } else {
        await apiService.createLead(formData);
      }
      handleCloseModal();
      fetchLeads();
    } catch (error) {
      setLocalError('Lidni saqlashda xatolik yuz berdi.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setLocalLoading(true);
      await apiService.deleteLead(deleteConfirmId);
      fetchLeads();
      setIsDeleteModalOpen(false);
      setDeleteConfirmId(null);
    } catch (error) {
      setLocalError('Lidni o\'chirishda xatolik yuz berdi.');
    } finally {
      setLocalLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Yangi': return '#3b82f6';
      case 'Aloqaga chiqildi': return '#f59e0b';
      case 'Sinov darsida': return '#8b5cf6';
      case 'O\'quvchi bo\'ldi': return '#10b981';
      case 'Rad etildi': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSourceIcon = (source) => {
    switch(source) {
      case 'Telegram': return '✈️';
      case 'Instagram': return '📸';
      case 'Veb-sayt': return '🌐';
      case 'Tavsiya': return '👥';
      default: return '📌';
    }
  };

  return (
    <div className="leads-management">
      {localLoading && <LoadingOverlay message="Yuklanmoqda..." />}
      
      {localError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{localError}</span>
          <button className="error-close" onClick={() => setLocalError('')}>✕</button>
        </div>
      )}

      {/* Modern Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Jami Lidlar</div>
          </div>
          <div className="stat-decoration" style={{background: '#3b82f6'}}></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>✨</div>
          <div className="stat-content">
            <div className="stat-value">{stats.yangi}</div>
            <div className="stat-label">Yangi Lidlar</div>
          </div>
          <div className="stat-decoration" style={{background: '#10b981'}}></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>📞</div>
          <div className="stat-content">
            <div className="stat-value">{stats.aloqada}</div>
            <div className="stat-label">Aloqaga Chiqilgan</div>
          </div>
          <div className="stat-decoration" style={{background: '#f59e0b'}}></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6'}}>🎓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.oquvchi}</div>
            <div className="stat-label">O'quvchi Bo'lgan</div>
          </div>
          <div className="stat-decoration" style={{background: '#8b5cf6'}}></div>
        </div>
      </div>

      <div className="filters-container">
        <div className="filter-card" style={{justifyContent: 'space-between'}}>
          <div className="filter-left">
            <h2 className="section-title" style={{margin:0}}>Mijozlar bilan ishlash (Lidlar)</h2>
          </div>
          <div className="filter-right" style={{display: 'flex', gap: '1rem'}}>
            <button className="btn-integration" onClick={() => setIsIntegrationModalOpen(true)}>
              <span className="add-icon">🔗</span>
              <span className="add-text">Target Integratsiya</span>
            </button>
            <button className="btn-add-premium" onClick={() => handleOpenModal()}>
              <span className="add-icon">➕</span>
              <span className="add-text">Yangi Lid Qo'shish</span>
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mijoz</th>
              <th>Telefon</th>
              <th>Manba</th>
              <th>Qiziqqan kursi</th>
              <th>Sana</th>
              <th>Holati</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {leads.length > 0 ? (
              leads.map((lead, index) => (
                <tr key={lead._id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="table-user-info">
                      <div className="table-avatar">
                        {lead.firstName?.charAt(0)}{lead.lastName?.charAt(0)}
                      </div>
                      <div className="table-name-group">
                        <span className="table-name">{lead.firstName} {lead.lastName}</span>
                        {lead.notes && <span className="table-notes" title={lead.notes}>{lead.notes.length > 30 ? lead.notes.substring(0, 30) + '...' : lead.notes}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="table-phone">{lead.phone}</td>
                  <td>
                    <span className="table-source" title="Kelib chiqish manbasi">
                      {getSourceIcon(lead.source)} {lead.source}
                    </span>
                  </td>
                  <td>{lead.interestedCourse || '-'}</td>
                  <td className="table-date">{new Date(lead.createdAt).toLocaleDateString('uz-UZ')}</td>
                  <td>
                    <div className="table-status" style={{backgroundColor: `${getStatusColor(lead.status)}15`, color: getStatusColor(lead.status)}}>
                      <span className="status-dot" style={{backgroundColor: getStatusColor(lead.status)}}></span>
                      {lead.status}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <a href={`tel:${lead.phone.replace(/\D/g, '')}`} className="action-btn-icon call-btn" title="Qo'ng'iroq qilish">
                        📞
                      </a>
                      <a href={`sms:${lead.phone.replace(/\D/g, '')}`} className="action-btn-icon sms-btn" title="SMS yozish">
                        💬
                      </a>
                      <a href={`https://t.me/+${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="action-btn-icon telegram-btn" title="Telegram orqali yozish">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.833.94z"/>
                        </svg>
                      </a>
                      <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="action-btn-icon whatsapp-btn" title="WhatsApp orqali yozish">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                      <button className="action-btn-icon instagram-btn" onClick={() => alert("Instagram orqali yozish uchun mijozning profili nomi (username) kerak bo'ladi. Hozircha faqat raqam orqali to'g'ridan-to'g'ri DM ga o'tish imkonsiz.")} title="Instagram">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                      </button>
                      <button className="action-btn-icon edit-btn" onClick={() => handleOpenModal(lead)} title="Tahrirlash">
                        ✏️
                      </button>
                      <button className="action-btn-icon delete-btn" onClick={() => handleDeleteClick(lead._id)} title="O'chirish">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">
                  <div className="empty-state">
                    <h3 className="empty-title">Lidlar topilmadi</h3>
                    <p className="empty-text">Hozircha tizimda hech qanday lid mavjud emas. Yangi lid qo'shish tugmasi orqali kiriting.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {/* Integration Modal */}
      {isIntegrationModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIntegrationModalOpen(false)}>
          <div className="integration-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Instagram / Facebook Target Integratsiyasi</h2>
              <button className="close-btn" onClick={() => setIsIntegrationModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{padding: '1.5rem', textAlign: 'left'}}>
              <p style={{color: '#64748b', marginBottom: '1rem', lineHeight: '1.5'}}>
                Instagram yoki Facebook reklamasidan (Lead Generation) tushgan ma'lumotlarni to'g'ridan-to'g'ri shu tizimga olib kelish uchun quyidagi <strong>Webhook URL</strong> dan foydalaning. Buning uchun <strong>Zapier</strong> yoki <strong>Make.com</strong> xizmatlaridan foydalanishingiz mumkin.
              </p>
              
              <div className="webhook-box">
                <span className="webhook-label">Webhook URL (POST):</span>
                <code className="webhook-url">https://{window.location.hostname}/api/communication/leads/webhook/instagram?secret=dream_school_secret_2026</code>
              </div>

              <h4 style={{marginTop: '1.5rem', marginBottom: '0.75rem', color: '#1e293b'}}>Yuborilishi kerak bo'lgan ma'lumotlar (JSON formati):</h4>
              <pre className="json-example">
{`{
  "firstName": "Mijozning ismi",
  "lastName": "Mijozning familiyasi",
  "phone": "+998901234567", // Majburiy
  "course": "Ingliz tili",
  "notes": "Qo'shimcha izoh..."
}`}
              </pre>

              <div className="integration-alert">
                💡 <strong>Maslahat:</strong> Zapier orqali "Facebook Lead Ads" ni tanlang, action sifatida "Webhooks by Zapier (POST)" ni tanlab, yuqoridagi URL ga JSON formatda datani yuboring.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon">
              ⚠️
            </div>
            <h3 className="delete-modal-title">Lidni o'chirish</h3>
            <p className="delete-modal-text">
              Haqiqatan ham ushbu lidni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setIsDeleteModalOpen(false)}>
                Bekor qilish
              </button>
              <button className="btn-delete-confirm" onClick={handleConfirmDelete}>
                Ha, o'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="lead-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{currentLead ? 'Lidni tahrirlash' : 'Yangi Lid qo\'shish'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Ism *</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required placeholder="Mijoz ismi" />
                </div>
                <div className="form-group">
                  <label>Familiya</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Mijoz familiyasi" />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Telefon raqam *</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handlePhoneChange} required placeholder="+998-90-123-45-67" />
                </div>
                <div className="form-group">
                  <label>Manba</label>
                  <select name="source" value={formData.source} onChange={handleInputChange}>
                    <option value="Telegram">Telegram</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Veb-sayt">Veb-sayt</option>
                    <option value="Tavsiya">Tavsiya</option>
                    <option value="Boshqa">Boshqa</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Holati</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="Yangi">Yangi</option>
                    <option value="Aloqaga chiqildi">Aloqaga chiqildi</option>
                    <option value="Sinov darsida">Sinov darsida</option>
                    <option value="O'quvchi bo'ldi">O'quvchi bo'ldi</option>
                    <option value="Rad etildi">Rad etildi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Qiziqqan kursi</label>
                  <input type="text" name="interestedCourse" value={formData.interestedCourse} onChange={handleInputChange} placeholder="Masalan: Matematika" />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Qo'shimcha izoh</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" placeholder="Mijoz haqida qo'shimcha ma'lumotlar..."></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Bekor qilish</button>
                <button type="submit" className="btn-save">{currentLead ? 'Saqlash' : 'Qo\'shish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .leads-management {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: #ffffff;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .stat-decoration {
          position: absolute;
          right: -20px;
          top: -20px;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          opacity: 0.1;
        }

        .stat-icon {
          font-size: 1.75rem;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 0.25rem;
        }

        .filters-container {
          margin-bottom: 2rem;
        }

        .filter-card {
          background: white;
          padding: 1.25rem 1.5rem;
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .section-title {
          font-size: 1.4rem;
          color: #1e293b;
          font-weight: 700;
        }

        .btn-add-premium {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
        }

        .btn-add-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
        }

        .btn-integration {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-integration:hover {
          background: #e2e8f0;
          transform: translateY(-2px);
        }

        .integration-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 650px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: modalSlideUp 0.3s ease-out;
        }

        .webhook-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .webhook-label {
          display: block;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .webhook-url {
          display: block;
          background: #0f172a;
          color: #10b981;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.9rem;
          word-break: break-all;
        }

        .json-example {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          overflow-x: auto;
        }

        .integration-alert {
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 1rem;
          margin-top: 1.5rem;
          border-radius: 0 8px 8px 0;
          color: #92400e;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .table-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(226, 232, 240, 0.8);
          overflow-x: auto;
        }

        .leads-table {
          width: 100%;
          border-collapse: collapse;
          white-space: nowrap;
        }

        .leads-table th {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          text-align: left;
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }

        .leads-table td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .leads-table tbody tr {
          transition: all 0.2s;
        }

        .leads-table tbody tr:hover {
          background: #f8fafc;
        }

        .table-user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .table-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
        }

        .table-name-group {
          display: flex;
          flex-direction: column;
        }

        .table-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
        }

        .table-notes {
          font-size: 0.8rem;
          color: #94a3b8;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .table-phone {
          font-weight: 500;
          color: #334155;
        }

        .table-source {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.75rem;
          background: #f1f5f9;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #475569;
          font-weight: 500;
        }

        .table-date {
          font-size: 0.85rem;
          color: #64748b;
        }

        .table-status {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .table-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .action-btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .call-btn {
          background: #dcfce7;
          color: #16a34a;
        }
        .call-btn:hover { background: #bbf7d0; transform: translateY(-1px); }

        .sms-btn {
          background: #fef3c7;
          color: #d97706;
        }
        .sms-btn:hover { background: #fde68a; transform: translateY(-1px); }

        .telegram-btn {
          background: #e0f2fe;
          color: #0ea5e9;
        }
        .telegram-btn:hover { background: #bae6fd; transform: translateY(-1px); }

        .whatsapp-btn {
          background: #dcfce7;
          color: #22c55e;
        }
        .whatsapp-btn:hover { background: #bbf7d0; transform: translateY(-1px); }

        .instagram-btn {
          background: #fce7f3;
          color: #ec4899;
        }
        .instagram-btn:hover { background: #fbcfe8; transform: translateY(-1px); }

        .edit-btn {
          background: #eff6ff;
          color: #3b82f6;
        }
        .edit-btn:hover { background: #dbeafe; transform: translateY(-1px); }

        .delete-btn {
          background: #fef2f2;
          color: #ef4444;
        }
        .delete-btn:hover { background: #fee2e2; transform: translateY(-1px); }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .lead-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          animation: modalSlideUp 0.3s ease-out;
        }

        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #1e293b;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .modal-form {
          padding: 1.5rem;
        }

        .form-row {
          display: flex;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .form-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #334155;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 0.95rem;
          color: #1e293b;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .btn-cancel {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #f1f5f9;
        }

        .btn-save {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }

        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(79, 70, 229, 0.3);
        }

        /* Delete Modal Styles */
        .delete-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          padding: 2.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: modalSlideUp 0.3s ease-out;
        }

        .delete-modal-icon {
          font-size: 3.5rem;
          margin-bottom: 1.5rem;
          display: inline-flex;
          background: #fef2f2;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.1);
        }

        .delete-modal-title {
          font-size: 1.4rem;
          color: #1e293b;
          margin-bottom: 0.75rem;
          font-weight: 700;
        }

        .delete-modal-text {
          color: #64748b;
          font-size: 1rem;
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }

        .delete-modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .delete-modal-actions button {
          flex: 1;
          padding: 0.85rem;
          font-size: 1rem;
        }

        .btn-delete-confirm {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .btn-delete-confirm:hover {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(239, 68, 68, 0.3);
        }

        /* Empty State */
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 16px;
          border: 1px dashed #cbd5e1;
        }

        .empty-title {
          font-size: 1.25rem;
          color: #334155;
          margin-bottom: 0.5rem;
        }

        .empty-text {
          color: #64748b;
          max-width: 400px;
          margin: 0 auto;
        }

        /* Error Banner */
        .error-banner {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 1rem;
          margin-bottom: 1.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .error-text {
          flex: 1;
          color: #991b1b;
          font-size: 0.95rem;
        }

        .error-close {
          background: none;
          border: none;
          color: #991b1b;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
        }

        .error-close:hover {
          background: #fee2e2;
        }

        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
            gap: 1.25rem;
          }
          .leads-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default LeadsManagement;
