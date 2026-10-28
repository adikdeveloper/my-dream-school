import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../../services/apiService';

const QUARTER_META = [
  { quarter: 1, label: '1-chorak', hint: 'Sentabr — Oktabr' },
  { quarter: 2, label: '2-chorak', hint: 'Noyabr — Dekabr' },
  { quarter: 3, label: '3-chorak', hint: 'Yanvar — Mart' },
  { quarter: 4, label: '4-chorak', hint: 'Aprel — May' }
];

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function toInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function buildDefaultQuarters(academicYear) {
  const startYear = parseInt(String(academicYear).slice(0, 4), 10);
  const endYear = startYear + 1;

  return [
    { quarter: 1, startDate: `${startYear}-09-02`, endDate: `${startYear}-10-25` },
    { quarter: 2, startDate: `${startYear}-11-05`, endDate: `${startYear}-12-28` },
    { quarter: 3, startDate: `${endYear}-01-09`, endDate: `${endYear}-03-20` },
    { quarter: 4, startDate: `${endYear}-04-01`, endDate: `${endYear}-05-30` }
  ];
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDateOnly(value);
  if (!date) return '—';
  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getQuarterStatus(quarter) {
  const start = parseDateOnly(quarter.startDate);
  const end = parseDateOnly(quarter.endDate);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (!start || !end) return { key: 'empty', label: 'Sana kiritilmagan' };
  if (today >= start && today <= end) return { key: 'current', label: 'Joriy chorak' };
  if (today > end) return { key: 'past', label: 'Tugagan' };
  return { key: 'upcoming', label: 'Kelgusi' };
}

function getDurationDays(quarter) {
  const start = parseDateOnly(quarter.startDate);
  const end = parseDateOnly(quarter.endDate);
  if (!start || !end || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function validateQuarters(quarters) {
  const sorted = [...quarters].sort((a, b) => a.quarter - b.quarter);

  for (const quarter of sorted) {
    if (!quarter.startDate || !quarter.endDate) {
      return `${quarter.quarter}-chorak uchun boshlanish va tugash sanasini kiriting`;
    }

    const start = parseDateOnly(quarter.startDate);
    const end = parseDateOnly(quarter.endDate);
    if (!start || !end) {
      return `${quarter.quarter}-chorak sanasi noto'g'ri`;
    }
    if (start > end) {
      return `${quarter.quarter}-chorakda boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas`;
    }
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previousEnd = parseDateOnly(sorted[index - 1].endDate);
    const currentStart = parseDateOnly(sorted[index].startDate);
    if (previousEnd && currentStart && currentStart <= previousEnd) {
      return `${sorted[index - 1].quarter}- va ${sorted[index].quarter}-chorak sanalari bir-biriga kirib ketmasligi kerak`;
    }
  }

  return null;
}

const QuarterSettings = () => {
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const [quarters, setQuarters] = useState(() => buildDefaultQuarters(getCurrentAcademicYear()));
  const [isConfigured, setIsConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const yearOptions = useMemo(() => {
    const currentStartYear = parseInt(getCurrentAcademicYear().slice(0, 4), 10);
    return [currentStartYear - 1, currentStartYear, currentStartYear + 1]
      .map(year => `${year}-${year + 1}`);
  }, []);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiService.getAcademicCalendar(academicYear);
      const source = Array.isArray(data.quarters) && data.quarters.length === 4
        ? data.quarters
        : buildDefaultQuarters(academicYear);

      const normalized = source
        .map(item => ({
          quarter: Number(item.quarter),
          startDate: toInputDate(item.startDate),
          endDate: toInputDate(item.endDate)
        }))
        .sort((a, b) => a.quarter - b.quarter);

      setQuarters(normalized);
      setIsConfigured(Boolean(data.isConfigured));
      setUpdatedAt(data.updatedAt || null);
      setCurrentQuarter(data.currentQuarter || null);
    } catch (err) {
      setError(err.response?.data?.message || "Chorak sanalarini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const handleQuarterChange = (index, field, value) => {
    setQuarters(previous => previous.map((quarter, quarterIndex) => (
      quarterIndex === index ? { ...quarter, [field]: value } : quarter
    )));
    setSuccess('');
    setError('');
  };

  const handleResetDefaults = () => {
    setQuarters(buildDefaultQuarters(academicYear));
    setSuccess('Standart sanalar tiklandi. Saqlash tugmasini bosing.');
    setError('');
  };

  const handleSave = async () => {
    const validationError = validateQuarters(quarters);
    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiService.updateAcademicCalendar({
        academicYear,
        quarters: quarters.map(quarter => ({
          quarter: quarter.quarter,
          startDate: quarter.startDate,
          endDate: quarter.endDate
        }))
      });

      const savedQuarters = (data.quarters || quarters)
        .map(item => ({
          quarter: Number(item.quarter),
          startDate: toInputDate(item.startDate),
          endDate: toInputDate(item.endDate)
        }))
        .sort((a, b) => a.quarter - b.quarter);

      setQuarters(savedQuarters);
      setIsConfigured(Boolean(data.isConfigured));
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setCurrentQuarter(data.currentQuarter || null);
      setSuccess('Chorak sanalari saqlandi. Chorak baholari avtomatik qayta hisoblanadi.');
    } catch (err) {
      setError(err.response?.data?.message || "Chorak sanalarini saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qs-page">
      <header className="qs-header">
        <div className="qs-header-text">
          <span className="qs-eyebrow">O'quv jarayoni</span>
          <h1>Chorak sozlamalari</h1>
          <p>
            Chorak tugash sanalarini admin va direktor belgilaydi. Chorak bahosi shu sanalar
            asosida avtomatik hisoblanadi.
          </p>
        </div>
        <div className="qs-year-select">
          <label htmlFor="qs-academic-year">O'quv yili</label>
          <select
            id="qs-academic-year"
            value={academicYear}
            onChange={event => setAcademicYear(event.target.value)}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </header>

      <div className={`qs-banner ${isConfigured ? 'ok' : 'warn'}`}>
        <span className="qs-banner-icon">{isConfigured ? '✓' : '!'}</span>
        <div>
          <strong>{isConfigured ? 'Chorak sanalari saqlangan' : 'Standart sanalar ishlatilmoqda'}</strong>
          <p>
            {isConfigured
              ? "Admin yoki direktor tomonidan belgilangan sanalar asosida hisoblanadi."
              : "Hali sanalar saqlanmagan. Standart o'quv kalendari bo'yicha vaqtinchalik hisoblanadi."}
          </p>
        </div>
      </div>

      {error && <div className="qs-alert error">{error}</div>}
      {success && <div className="qs-alert success">{success}</div>}

      <div className="qs-summary">
        <div className="qs-summary-item">
          <span>Joriy chorak</span>
          <strong>{currentQuarter?.label || '—'}</strong>
          <small>
            {currentQuarter?.startDate && currentQuarter?.endDate
              ? `${formatDate(toInputDate(currentQuarter.startDate))} — ${formatDate(toInputDate(currentQuarter.endDate))}`
              : "Sanalar belgilanmagan"}
          </small>
        </div>
        <div className="qs-summary-item">
          <span>Sozlama holati</span>
          <strong>{isConfigured ? 'Saqlangan' : 'Standart'}</strong>
          <small>{isConfigured ? 'Admin/direktor tasdiqlagan' : 'Vaqtinchalik kalendar'}</small>
        </div>
        <div className="qs-summary-item">
          <span>Oxirgi o'zgarish</span>
          <strong>{formatDateTime(updatedAt)}</strong>
          <small>Chorak baholari har safar qayta hisoblanadi</small>
        </div>
      </div>

      {loading ? (
        <div className="qs-loading">
          <span className="qs-spinner" />
          <p>Chorak sanalari yuklanmoqda...</p>
        </div>
      ) : (
        <div className="qs-grid">
          {quarters.map((quarter, index) => {
            const meta = QUARTER_META.find(item => item.quarter === quarter.quarter) || QUARTER_META[index];
            const status = getQuarterStatus(quarter);
            const duration = getDurationDays(quarter);

            return (
              <section key={quarter.quarter} className={`qs-card ${status.key}`}>
                <div className="qs-card-head">
                  <div className="qs-qnum">{quarter.quarter}</div>
                  <div className="qs-card-title">
                    <h2>{meta?.label || `${quarter.quarter}-chorak`}</h2>
                    <p>{meta?.hint || ''}</p>
                  </div>
                  <span className={`qs-status ${status.key}`}>{status.label}</span>
                </div>

                <div className="qs-dates">
                  <label>
                    <span>Boshlanish</span>
                    <input
                      type="date"
                      value={quarter.startDate}
                      onChange={event => handleQuarterChange(index, 'startDate', event.target.value)}
                    />
                  </label>
                  <span className="qs-date-arrow">→</span>
                  <label>
                    <span>Tugash</span>
                    <input
                      type="date"
                      value={quarter.endDate}
                      onChange={event => handleQuarterChange(index, 'endDate', event.target.value)}
                    />
                  </label>
                </div>

                <div className="qs-card-foot">
                  <span className="qs-duration">{duration} kun</span>
                  <span>{formatDate(quarter.startDate)} — {formatDate(quarter.endDate)}</span>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="qs-rule">
        <div className="qs-rule-icon">∑</div>
        <div>
          <h3>Chorak bahosi qanday hisoblanadi?</h3>
          <p>
            Har bir baho foizga aylantiriladi: kunlik baho 0.5 (yoki 5) ballik shkalada,
            imtihon esa <code>examMaxScore</code> bo'yicha. So'ngra chorakdagi barcha
            baholarning o'rtachasi olinadi va 10 ballik tizimga o'tkaziladi:
            <b> 80% → 8</b>, <b>70% → 7</b>.
          </p>
        </div>
      </section>

      <div className="qs-actions">
        <button type="button" className="qs-btn ghost" onClick={handleResetDefaults} disabled={saving}>
          Standart sanalar
        </button>
        <button type="button" className="qs-btn primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saqlanmoqda...' : 'Sanani saqlash'}
        </button>
      </div>

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .qs-page {
    --qs-navy: #1e3a8a;
    --qs-navy-dark: #172554;
    --qs-gold: #f59e0b;
    --qs-slate-50: #f8fafc;
    --qs-slate-100: #f1f5f9;
    --qs-slate-200: #e2e8f0;
    --qs-slate-500: #64748b;
    --qs-slate-700: #334155;
    --qs-slate-900: #0f172a;
    min-height: 100%;
    padding: 1.75rem;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
    color: var(--qs-slate-900);
  }

  .qs-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.75rem 2rem;
    margin-bottom: 1.25rem;
    color: #fff;
    background: linear-gradient(135deg, #172554 0%, #1e3a8a 55%, #1d4ed8 100%);
    border-radius: 20px;
    box-shadow: 0 16px 40px rgba(30, 58, 138, .24);
  }

  .qs-eyebrow {
    display: inline-block;
    margin-bottom: .5rem;
    color: #fbbf24;
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .qs-header h1 {
    margin: 0 0 .4rem;
    font-size: 1.65rem;
    font-weight: 800;
    letter-spacing: -.02em;
  }

  .qs-header p {
    max-width: 640px;
    margin: 0;
    color: #dbeafe;
    font-size: .92rem;
    line-height: 1.55;
  }

  .qs-year-select {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    min-width: 160px;
    padding: .75rem .9rem;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 14px;
  }

  .qs-year-select label {
    color: #bfdbfe;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .qs-year-select select {
    width: 100%;
    padding: .55rem .65rem;
    color: #0f172a;
    background: #fff;
    border: 1px solid transparent;
    border-radius: 9px;
    font-size: .9rem;
    font-weight: 700;
    cursor: pointer;
  }

  .qs-banner {
    display: flex;
    align-items: flex-start;
    gap: .9rem;
    padding: 1rem 1.15rem;
    margin-bottom: 1.25rem;
    border-radius: 14px;
    border: 1px solid transparent;
  }

  .qs-banner.ok {
    color: #166534;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .qs-banner.warn {
    color: #92400e;
    background: #fffbeb;
    border-color: #fde68a;
  }

  .qs-banner-icon {
    display: grid;
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    place-items: center;
    border-radius: 50%;
    background: currentColor;
    color: #fff;
    font-size: .85rem;
    font-weight: 900;
  }

  .qs-banner strong {
    display: block;
    margin-bottom: .15rem;
    font-size: .92rem;
  }

  .qs-banner p {
    margin: 0;
    font-size: .82rem;
    line-height: 1.45;
    opacity: .9;
  }

  .qs-alert {
    padding: .85rem 1rem;
    margin-bottom: 1rem;
    border-radius: 12px;
    font-size: .85rem;
    font-weight: 600;
  }

  .qs-alert.error {
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  .qs-alert.success {
    color: #166534;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }

  .qs-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .qs-summary-item {
    padding: 1rem 1.15rem;
    background: #fff;
    border: 1px solid var(--qs-slate-200);
    border-radius: 14px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, .04);
  }

  .qs-summary-item span {
    display: block;
    margin-bottom: .3rem;
    color: var(--qs-slate-500);
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .qs-summary-item strong {
    display: block;
    margin-bottom: .2rem;
    color: var(--qs-navy-dark);
    font-size: 1.05rem;
    font-weight: 800;
  }

  .qs-summary-item small {
    color: var(--qs-slate-500);
    font-size: .75rem;
  }

  .qs-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .9rem;
    min-height: 260px;
    color: var(--qs-slate-500);
    background: #fff;
    border: 1px solid var(--qs-slate-200);
    border-radius: 16px;
  }

  .qs-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid #e2e8f0;
    border-top-color: var(--qs-navy);
    border-radius: 50%;
    animation: qs-spin .8s linear infinite;
  }

  @keyframes qs-spin {
    to { transform: rotate(360deg); }
  }

  .qs-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .qs-card {
    position: relative;
    padding: 1.25rem;
    background: #fff;
    border: 1px solid var(--qs-slate-200);
    border-radius: 16px;
    box-shadow: 0 4px 18px rgba(15, 23, 42, .04);
    overflow: hidden;
  }

  .qs-card::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: var(--qs-slate-200);
  }

  .qs-card.current::before { background: #16a34a; }
  .qs-card.past::before { background: #94a3b8; }
  .qs-card.upcoming::before { background: var(--qs-gold); }

  .qs-card-head {
    display: flex;
    align-items: center;
    gap: .75rem;
    margin-bottom: 1rem;
  }

  .qs-qnum {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, var(--qs-navy), #2563eb);
    border-radius: 12px;
    font-size: 1.15rem;
    font-weight: 800;
    box-shadow: 0 6px 14px rgba(30, 58, 138, .22);
  }

  .qs-card-title {
    flex: 1;
    min-width: 0;
  }

  .qs-card-title h2 {
    margin: 0 0 .1rem;
    color: var(--qs-slate-900);
    font-size: 1rem;
    font-weight: 800;
  }

  .qs-card-title p {
    margin: 0;
    color: var(--qs-slate-500);
    font-size: .76rem;
  }

  .qs-status {
    padding: .3rem .6rem;
    border-radius: 999px;
    font-size: .68rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .qs-status.current { color: #166534; background: #dcfce7; }
  .qs-status.past { color: #475569; background: #f1f5f9; }
  .qs-status.upcoming { color: #92400e; background: #fef3c7; }
  .qs-status.empty { color: #991b1b; background: #fee2e2; }

  .qs-dates {
    display: flex;
    align-items: flex-end;
    gap: .55rem;
  }

  .qs-dates label {
    flex: 1;
    min-width: 0;
  }

  .qs-dates label span {
    display: block;
    margin-bottom: .35rem;
    color: var(--qs-slate-500);
    font-size: .7rem;
    font-weight: 700;
    letter-spacing: .03em;
    text-transform: uppercase;
  }

  .qs-dates input {
    width: 100%;
    padding: .6rem .65rem;
    color: var(--qs-slate-900);
    background: var(--qs-slate-50);
    border: 1px solid var(--qs-slate-200);
    border-radius: 10px;
    font-size: .85rem;
    font-weight: 600;
    outline: none;
    transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
  }

  .qs-dates input:focus {
    background: #fff;
    border-color: var(--qs-navy);
    box-shadow: 0 0 0 3px rgba(30, 58, 138, .1);
  }

  .qs-date-arrow {
    padding-bottom: .6rem;
    color: #94a3b8;
    font-size: .9rem;
  }

  .qs-card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .5rem;
    margin-top: .85rem;
    padding-top: .7rem;
    color: var(--qs-slate-500);
    border-top: 1px dashed var(--qs-slate-200);
    font-size: .73rem;
  }

  .qs-duration {
    color: var(--qs-navy);
    font-weight: 800;
  }

  .qs-rule {
    display: flex;
    gap: .9rem;
    margin-top: 1.25rem;
    padding: 1.15rem 1.25rem;
    background: #fff;
    border: 1px solid var(--qs-slate-200);
    border-left: 4px solid var(--qs-gold);
    border-radius: 14px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, .04);
  }

  .qs-rule-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    place-items: center;
    color: #92400e;
    background: #fef3c7;
    border-radius: 11px;
    font-size: 1.05rem;
    font-weight: 900;
  }

  .qs-rule h3 {
    margin: 0 0 .25rem;
    color: var(--qs-slate-900);
    font-size: .9rem;
    font-weight: 800;
  }

  .qs-rule p {
    margin: 0;
    color: var(--qs-slate-500);
    font-size: .8rem;
    line-height: 1.55;
  }

  .qs-rule code {
    padding: .05rem .3rem;
    color: var(--qs-navy);
    background: #eff6ff;
    border-radius: 5px;
    font-size: .76rem;
  }

  .qs-actions {
    display: flex;
    justify-content: flex-end;
    gap: .75rem;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--qs-slate-200);
  }

  .qs-btn {
    min-height: 42px;
    padding: .65rem 1.2rem;
    border-radius: 11px;
    font-size: .86rem;
    font-weight: 800;
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
  }

  .qs-btn:disabled {
    cursor: not-allowed;
    opacity: .6;
  }

  .qs-btn.ghost {
    color: var(--qs-slate-700);
    background: #fff;
    border: 1px solid var(--qs-slate-200);
  }

  .qs-btn.ghost:hover:not(:disabled) {
    background: var(--qs-slate-50);
  }

  .qs-btn.primary {
    color: #fff;
    background: linear-gradient(135deg, var(--qs-navy), #2563eb);
    border: 1px solid transparent;
    box-shadow: 0 8px 20px rgba(30, 58, 138, .2);
  }

  .qs-btn.primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(30, 58, 138, .26);
  }

  @media (max-width: 900px) {
    .qs-summary { grid-template-columns: 1fr; }
    .qs-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .qs-page { padding: 1rem; }
    .qs-header { flex-direction: column; padding: 1.35rem; }
    .qs-year-select { width: 100%; }
    .qs-dates { flex-direction: column; align-items: stretch; }
    .qs-date-arrow { display: none; }
    .qs-actions { flex-direction: column-reverse; }
    .qs-btn { width: 100%; }
  }
`;

export default QuarterSettings;
