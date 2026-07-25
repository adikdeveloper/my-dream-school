import React from 'react';
import { useParams } from 'react-router-dom';

const StaffPlaceholder = () => {
  const { type } = useParams();
  
  const staffTypes = {
    admin: { title: 'Adminlar bo\'limi', icon: '🛡️' },
    accountant: { title: 'Hisobchilar bo\'limi', icon: '💰' },
    hr: { title: 'HR bo\'limi', icon: '📋' },
    reception: { title: 'Reception bo\'limi', icon: '🛎️' },
    'call-center': { title: 'Call markaz bo\'limi', icon: '📞' },
    grading: { title: 'Baholash bo\'limi', icon: '📝' },
    exams: { title: 'Imtihonlar bo\'limi', icon: '✍️' },
    salaries: { title: 'Maoshlar bo\'limi', icon: '💳' },
    other: { title: 'Boshqa kirim chiqimlar', icon: '🔄' },
    chats: { title: 'Chatlar boshqaruvi', icon: '💬' },
    permissions: { title: 'Ruxsatnomalar bo\'limi', icon: '🔑' },
    branches: { title: 'Filiallar boshqaruvi', icon: '🏢' },
    applications: { title: 'Arizalar bo\'limi', icon: '📥' },
    leads: { title: 'Lidlar bo\'limi', icon: '🎯' },
    parents: { title: 'Ota-onalar bilan aloqa', icon: '👨‍👩‍👧‍👦' },
    notifications: { title: 'SMS / Telegram xabarnomalar', icon: '📱' },
    reminders: { title: 'Eslatmalar bo\'limi', icon: '⏰' }
  };

  const currentType = staffTypes[type] || { title: 'Xodimlar bo\'limi', icon: '👥' };

  return (
    <div className="staff-placeholder">
      <div className="placeholder-content">
        <span className="placeholder-icon">{currentType.icon}</span>
        <h2>{currentType.title}</h2>
        <p>Ushbu bo'lim hozirda ishlab chiqilmoqda.</p>
        <div className="placeholder-animation">
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>
        </div>
      </div>

      <style>{`
        .staff-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          height: 100%;
          width: 100%;
          padding: 2rem;
        }

        .placeholder-content {
          text-align: center;
          background: white;
          padding: 3rem;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          max-width: 500px;
          width: 100%;
          position: relative;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .placeholder-icon {
          font-size: 4rem;
          display: block;
          margin-bottom: 1.5rem;
        }

        .placeholder-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .placeholder-content p {
          color: #64748b;
          font-size: 1rem;
        }

        .placeholder-animation {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
          gap: 1rem;
          height: 40px;
          position: relative;
        }

        .pulse-ring {
          width: 12px;
          height: 12px;
          background: #f59e0b;
          border-radius: 50%;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .delay-1 { animation-delay: 0.2s; }
        .delay-2 { animation-delay: 0.4s; }

        @keyframes pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StaffPlaceholder;
