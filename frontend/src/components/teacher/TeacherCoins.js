import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/apiService';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`);

const TeacherCoins = () => {
  const now = new Date();
  const [scope, setScope] = useState('month');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = scope === 'month' ? { month, year } : {};
      const data = await apiService.getTeacherCoins(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, month, year]);

  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, r) => s + (r.totalCoins || 0), 0);

  return (
    <div className="tc-page">
      <div className="tc-header">
        <div>
          <h1>🪙 Mening coinlarim</h1>
          <p>Siz o'z faningizdan bergan coinlar (boshqa o'qituvchilarning coinlari bu yerga aralashmaydi)</p>
        </div>
        <div className="tc-total">{total} <span>coin</span></div>
      </div>

      <div className="tc-filters">
        <button className={`tc-tab ${scope === 'month' ? 'active' : ''}`} onClick={() => setScope('month')}>Oylik</button>
        <button className={`tc-tab ${scope === 'all' ? 'active' : ''}`} onClick={() => setScope('all')}>Umumiy</button>
        {scope === 'month' && (
          <>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="tc-empty">Yuklanmoqda...</div>
      ) : rows.length === 0 ? (
        <div className="tc-empty">Bu davr uchun coin berilmagan</div>
      ) : (
        <div className="tc-list">
          {rows.map((r, i) => (
            <div key={r._id} className={`tc-row ${i < 3 ? 'top' : ''}`}>
              <div className="tc-rank">{medal(i + 1)}</div>
              <div className="tc-avatar"><span>{r.firstName?.[0]}{r.lastName?.[0]}</span></div>
              <div className="tc-info">
                <span className="tc-name">{r.firstName} {r.lastName}</span>
                {r.studentNumber && <span className="tc-meta">{r.studentNumber}</span>}
              </div>
              <div className="tc-count">🪙 {r.totalCoins}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .tc-page { padding: 1.5rem; background: #f8fafc; min-height: calc(100vh - 85px); }
        .tc-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: #fff; padding: 1.5rem 1.75rem; border-radius: 18px; margin-bottom: 1.25rem; box-shadow: 0 10px 30px rgba(37,99,235,0.25); }
        .tc-header h1 { margin: 0 0 0.25rem; font-size: 1.35rem; font-weight: 800; }
        .tc-header p { margin: 0; opacity: 0.95; font-size: 0.85rem; }
        .tc-total { font-size: 2rem; font-weight: 800; line-height: 1; }
        .tc-total span { font-size: 0.9rem; font-weight: 600; opacity: 0.9; }
        .tc-filters { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1.25rem; align-items: center; }
        .tc-tab { padding: 0.5rem 1.1rem; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer; color: #475569; }
        .tc-tab.active { background: #0f766e; border-color: #0f766e; color: #fff; }
        .tc-filters select { padding: 0.5rem 0.9rem; border: 2px solid #e2e8f0; border-radius: 10px; background: #fff; font-weight: 500; cursor: pointer; }
        .tc-empty { text-align: center; padding: 3rem; color: #94a3b8; background: #fff; border-radius: 14px; }
        .tc-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .tc-row { display: flex; align-items: center; gap: 1rem; background: #fff; border-radius: 14px; padding: 0.75rem 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
        .tc-row.top { border-color: #93c5fd; background: linear-gradient(135deg, #f0fdfa 0%, #fff 60%); }
        .tc-rank { width: 36px; text-align: center; font-size: 1.25rem; font-weight: 800; color: #64748b; }
        .tc-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #0f766e, #115e59); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
        .tc-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .tc-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
        .tc-meta { font-size: 0.78rem; color: #94a3b8; }
        .tc-count { font-weight: 800; color: #1d4ed8; font-size: 1.05rem; white-space: nowrap; }
        @media (max-width: 480px) { .tc-page { padding: 1rem; } .tc-header { flex-direction: column; align-items: flex-start; } }
      `}</style>
    </div>
  );
};

export default TeacherCoins;
