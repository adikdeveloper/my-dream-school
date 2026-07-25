import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/apiService';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const FILE_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';

const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`);

const CoinLeaderboard = () => {
  const now = new Date();
  const [scope, setScope] = useState('month'); // 'month' | 'all'
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = scope === 'month' ? { month, year } : {};
      const data = await apiService.getCoinLeaderboard(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, month, year]);

  useEffect(() => { load(); }, [load]);

  const totalCoins = rows.reduce((s, r) => s + (r.totalCoins || 0), 0);

  return (
    <div className="coin-lb">
      <div className="coin-lb-header">
        <div>
          <h1>🪙 Coin reytingi</h1>
          <p>Uy vazifalarni a'lo bajargan o'quvchilar (1 dars = 1 coin)</p>
        </div>
        <div className="coin-lb-total">{totalCoins} <span>coin</span></div>
      </div>

      <div className="coin-lb-filters">
        <button className={`clb-tab ${scope === 'month' ? 'active' : ''}`} onClick={() => setScope('month')}>Oylik</button>
        <button className={`clb-tab ${scope === 'all' ? 'active' : ''}`} onClick={() => setScope('all')}>Umumiy</button>
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
        <div className="coin-lb-empty">Yuklanmoqda...</div>
      ) : rows.length === 0 ? (
        <div className="coin-lb-empty">Bu davr uchun coin yo'q</div>
      ) : (
        <div className="coin-lb-list">
          {rows.map((r, i) => (
            <div key={r._id} className={`coin-row ${i < 3 ? 'top' : ''}`}>
              <div className="coin-rank">{medal(i + 1)}</div>
              <div
                className="coin-avatar"
                style={r.profileImage ? { backgroundImage: `url(${FILE_BASE}${r.profileImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!r.profileImage && <span>{r.firstName?.[0]}{r.lastName?.[0]}</span>}
              </div>
              <div className="coin-info">
                <span className="coin-name">{r.firstName} {r.lastName}</span>
                <span className="coin-meta">{r.className || '—'}{r.studentNumber ? ` · ${r.studentNumber}` : ''}</span>
              </div>
              <div className="coin-count">🪙 {r.totalCoins}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .coin-lb { padding: 1.5rem; background: #f8fafc; min-height: calc(100vh - 85px); }
        .coin-lb-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; padding: 1.5rem 1.75rem; border-radius: 18px; margin-bottom: 1.25rem; box-shadow: 0 10px 30px rgba(245,158,11,0.25); }
        .coin-lb-header h1 { margin: 0 0 0.25rem; font-size: 1.4rem; font-weight: 800; }
        .coin-lb-header p { margin: 0; opacity: 0.95; font-size: 0.875rem; }
        .coin-lb-total { font-size: 2rem; font-weight: 800; line-height: 1; }
        .coin-lb-total span { font-size: 0.9rem; font-weight: 600; opacity: 0.9; }
        .coin-lb-filters { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1.25rem; align-items: center; }
        .clb-tab { padding: 0.5rem 1.1rem; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer; color: #475569; }
        .clb-tab.active { background: #f59e0b; border-color: #f59e0b; color: #fff; }
        .coin-lb-filters select { padding: 0.5rem 0.9rem; border: 2px solid #e2e8f0; border-radius: 10px; background: #fff; font-weight: 500; cursor: pointer; }
        .coin-lb-empty { text-align: center; padding: 3rem; color: #94a3b8; background: #fff; border-radius: 14px; }
        .coin-lb-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .coin-row { display: flex; align-items: center; gap: 1rem; background: #fff; border-radius: 14px; padding: 0.75rem 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
        .coin-row.top { border-color: #fcd34d; background: linear-gradient(135deg, #fffbeb 0%, #fff 60%); }
        .coin-rank { width: 36px; text-align: center; font-size: 1.25rem; font-weight: 800; color: #64748b; }
        .coin-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
        .coin-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .coin-name { font-weight: 700; color: #1e293b; font-size: 0.95rem; }
        .coin-meta { font-size: 0.78rem; color: #94a3b8; }
        .coin-count { font-weight: 800; color: #b45309; font-size: 1.05rem; white-space: nowrap; }
        @media (max-width: 480px) { .coin-lb { padding: 1rem; } .coin-lb-header { flex-direction: column; align-items: flex-start; } }
      `}</style>
    </div>
  );
};

export default CoinLeaderboard;
