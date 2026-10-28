import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';
import TeacherUiIcon from './TeacherUiIcon';
import styles from './TeacherCoins.module.css';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

const TeacherCoins = () => {
  const navigate = useNavigate();
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
    } catch (err) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope, month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + (row.totalCoins || 0), 0), [rows]);
  const maxCoins = useMemo(() => Math.max(1, ...rows.map((row) => row.totalCoins || 0)), [rows]);
  const topThree = rows.slice(0, 3);

  const initials = (row) => `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase() || 'O';
  const fullName = (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || "O'quvchi";

  return (
    <div className={styles.coins}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Motivatsiya</p>
          <h1 className={styles.title}>Coinlar</h1>
          <p className={styles.subtitle}>O'z faningizdan o'quvchilarga bergan coinlaringiz.</p>
        </div>
        <button type="button" className="td-btn td-btn--gold" onClick={() => navigate('/teacher/journal')}>
          <TeacherUiIcon name="coins" size={15} /> Coin berish
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <span className={styles.heroIcon}><TeacherUiIcon name="coins" size={22} /></span>
          <div>
            <span className={styles.heroLabel}>Berilgan coinlar</span>
            <strong className={styles.heroValue}>{loading ? '—' : total}</strong>
            <span className={styles.heroPeriod}>
              {scope === 'month' ? `${MONTHS[month - 1]} ${year}` : 'Barcha davr'} · {rows.length} ta o'quvchi
            </span>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div>
            <span>O'quvchilar</span>
            <strong>{loading ? '—' : rows.length}</strong>
          </div>
          <div>
            <span>Eng faol</span>
            <strong>{loading || rows.length === 0 ? '—' : fullName(rows[0])}</strong>
          </div>
          <div>
            <span>Eng ko'p coin</span>
            <strong>{loading || rows.length === 0 ? '—' : rows[0].totalCoins}</strong>
          </div>
        </div>
      </section>

      <div className={styles.filters}>
        <div className={styles.tabs}>
          <button type="button" className={scope === 'month' ? styles.tabActive : ''} onClick={() => setScope('month')}>Oylik</button>
          <button type="button" className={scope === 'all' ? styles.tabActive : ''} onClick={() => setScope('all')}>Umumiy</button>
        </div>
        {scope === 'month' && (
          <div className={styles.selects}>
            <select className="td-select" value={month} onChange={(event) => setMonth(Number(event.target.value))} aria-label="Oy">
              {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
            </select>
            <select className="td-select" value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Yil">
              {[now.getFullYear(), now.getFullYear() - 1].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={`td-skeleton ${styles.loadingHero}`} />
          <div className={styles.loadingRows}>
            {[1, 2, 3, 4, 5].map((item) => <div className={`td-skeleton ${styles.loadingRow}`} key={item} />)}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className={`td-card ${styles.emptyCard}`}>
          <span className={styles.emptyIcon}><TeacherUiIcon name="coins" size={22} /></span>
          <strong>Bu davr uchun coin berilmagan</strong>
          <p>Darslarda o'quvchilarni baholab, ularga coin bering. Natijalar shu yerda jamlanadi.</p>
          <button type="button" className="td-btn td-btn--gold" onClick={() => navigate('/teacher/journal')}>
            Jurnalga o'tish
          </button>
        </div>
      ) : (
        <>
          {topThree.length === 3 && (
            <section className={styles.podium} aria-label="Eng faol o'quvchilar">
              {[topThree[1], topThree[0], topThree[2]].map((row, index) => {
                const place = index === 0 ? 2 : index === 1 ? 1 : 3;
                return (
                  <article className={`${styles.podiumCard} ${place === 1 ? styles.podiumFirst : ''}`} key={row._id || fullName(row)}>
                    <span className={styles.podiumRank}>{place}</span>
                    <span className={`${styles.podiumAvatar} ${place === 1 ? styles.podiumAvatarFirst : ''}`}>{initials(row)}</span>
                    <strong>{fullName(row)}</strong>
                    <span className={styles.podiumClass}>{row.studentNumber || "O'quvchi"}</span>
                    <span className={styles.podiumCoins}><TeacherUiIcon name="coins" size={14} /> {row.totalCoins}</span>
                  </article>
                );
              })}
            </section>
          )}

          <section className={`td-card ${styles.tableCard}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">O'quvchilar reytingi</h2>
                <p className="td-card-sub">Berilgan coinlar bo'yicha saralangan</p>
              </div>
              <span className="td-chip td-chip--gold">{rows.length} o'quvchi</span>
            </div>
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>#</span>
                <span>O'quvchi</span>
                <span className={styles.hideMobile}>Sinf</span>
                <span>Coin</span>
              </div>
              {rows.map((row, index) => (
                <div className={styles.tableRow} key={row._id || `${fullName(row)}-${index}`}>
                  <span className={`${styles.rank} ${index < 3 ? styles.rankTop : ''}`}>{index + 1}</span>
                  <div className={styles.student}>
                    <span className={styles.avatar}>{initials(row)}</span>
                    <span>
                      <strong>{fullName(row)}</strong>
                      <small>{row.studentNumber || "O'quvchi"}</small>
                    </span>
                  </div>
                  <span className={`${styles.className} ${styles.hideMobile}`}>{row.studentNumber || '—'}</span>
                  <div className={styles.coinCell}>
                    <span className={styles.coinValue}><TeacherUiIcon name="coins" size={13} /> {row.totalCoins}</span>
                    <span className={styles.coinBar}>
                      <span style={{ width: `${Math.round(((row.totalCoins || 0) / maxCoins) * 100)}%` }} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default TeacherCoins;
