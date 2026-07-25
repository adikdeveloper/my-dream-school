import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../../services/apiService';

const PAYMENT_TYPE_LABEL = { cash: 'Naqd', card: 'Karta', bank_transfer: 'Bank' };
const PAYMENT_TYPE_CLASS = { cash: 'rp-tag-cash', card: 'rp-tag-card', bank_transfer: 'rp-tag-bank' };
const PAGE_SIZE = 30;

// ─── Helpers ────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));
const fmtSom = (n) => fmt(n) + " so'm";

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AccountantReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [page, setPage] = useState(1);

  // Default: shu oy
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(toISODate(monthStart));
  const [endDate, setEndDate]     = useState(toISODate(today));
  const [paymentType, setPaymentType] = useState('all');
  const [classId, setClassId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load classes (once)
  useEffect(() => {
    apiService.getClasses()
      .then(res => setClasses(res?.classes || res || []))
      .catch(() => setClasses([]));
  }, []);

  // Load payments
  const loadPayments = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { startDate, endDate };
      if (paymentType !== 'all') params.paymentType = paymentType;
      const data = await apiService.getPayments(params);
      setAllPayments(Array.isArray(data) ? data : (data?.payments || []));
      setPage(1);
    } catch (e) {
      setError(e?.response?.data?.message || 'To\'lovlarni yuklashda xatolik');
      setAllPayments([]);
    } finally { setLoading(false); }
  }, [startDate, endDate, paymentType]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  // Client-side filter
  const filtered = useMemo(() => {
    let arr = allPayments.filter(p => p.status === 'completed' && !p.isDeleted);
    if (classId !== 'all') arr = arr.filter(p => {
      const cid = p.studentId?.classId?._id || p.studentId?.classId;
      return cid === classId;
    });
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      arr = arr.filter(p => {
        const s = p.studentId || {};
        return (`${s.firstName || ''} ${s.lastName || ''}`).toLowerCase().includes(q) ||
               (s.studentId || '').toLowerCase().includes(q);
      });
    }
    return arr.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }, [allPayments, classId, searchTerm]);

  const total = useMemo(() => filtered.reduce((s, p) => s + (p.amount || 0), 0), [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // ─── Excel export ───────────────────────────────────────────────
  const exportExcel = () => {
    if (filtered.length === 0) { setError('Eksport qilish uchun ma\'lumot yo\'q'); return; }
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" /><title>Hisobot</title>
<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Hisobot</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
<style>
  table { border-collapse: collapse; font-family: Calibri, sans-serif; }
  td, th { border: 1px solid #94a3b8; padding: 6px 10px; }
  th { background: #1e293b; color: #fff; font-weight: 700; }
  .num { mso-number-format: "#,##0"; text-align: right; }
  .total { background: #f1f5f9; font-weight: bold; }
</style></head><body>
<table>
  <tr><td colspan="6"><strong>Moliyaviy hisobot</strong></td></tr>
  <tr><td colspan="6">Davr: ${fmtDate(startDate)} — ${fmtDate(endDate)} | Yozuvlar: ${filtered.length} ta | Jami: ${fmtSom(total)}</td></tr>
  <tr><td colspan="6"></td></tr>
  <tr><th>№</th><th>Sana</th><th>O'quvchi</th><th>Sinf</th><th>Turi</th><th class="num">Summa</th></tr>`;
    filtered.forEach((p, i) => {
      const s = p.studentId || {};
      const cls = s.classId?.className || s.classId?.name || '—';
      html += `<tr>
        <td>${i + 1}</td>
        <td>${fmtDateTime(p.paymentDate)}</td>
        <td>${(s.firstName || '') + ' ' + (s.lastName || '')}</td>
        <td>${cls}</td>
        <td>${PAYMENT_TYPE_LABEL[p.paymentType] || p.paymentType || '—'}</td>
        <td class="num">${p.amount || 0}</td>
      </tr>`;
    });
    html += `<tr class="total"><td colspan="5">JAMI</td><td class="num">${total}</td></tr></table></body></html>`;
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hisobot_${startDate}_${endDate}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── PDF export (via print) ──────────────────────────────────────
  const exportPdf = () => {
    if (filtered.length === 0) { setError('Eksport qilish uchun ma\'lumot yo\'q'); return; }
    document.body.classList.add('rp-printing');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('rp-printing'), 500);
    }, 50);
  };

  const resetFilters = () => {
    setStartDate(toISODate(monthStart));
    setEndDate(toISODate(today));
    setPaymentType('all');
    setClassId('all');
    setSearchTerm('');
  };

  const activeClassLabel = classId === 'all'
    ? 'Barchasi'
    : (classes.find(c => c._id === classId)?.className || classes.find(c => c._id === classId)?.name || '—');

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="rp-page">
      {/* Page title */}
      <div className="rp-header rp-no-print">
        <div>
          <h1>Hisobotlar</h1>
          <p>To'lovlarni filterlang va Excel yoki PDF formatda yuklab oling</p>
        </div>
        <div className="rp-export">
          <button className="rp-btn rp-btn-excel" onClick={exportExcel}>
            <span>📊</span> Excel
          </button>
          <button className="rp-btn rp-btn-pdf" onClick={exportPdf}>
            <span>📄</span> PDF
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rp-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Filter card */}
      <div className="rp-filters rp-no-print">
        <div className="rp-filter">
          <label>Boshlanish</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={endDate} />
        </div>
        <div className="rp-filter">
          <label>Tugash</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} max={toISODate(new Date())} />
        </div>
        <div className="rp-filter">
          <label>To'lov turi</label>
          <select value={paymentType} onChange={e => setPaymentType(e.target.value)}>
            <option value="all">Barchasi</option>
            <option value="cash">Naqd</option>
            <option value="card">Karta</option>
            <option value="bank_transfer">Bank</option>
          </select>
        </div>
        <div className="rp-filter">
          <label>Sinf</label>
          <select value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="all">Barcha sinflar</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.className || c.name}</option>
            ))}
          </select>
        </div>
        <div className="rp-filter rp-filter-wide">
          <label>Qidiruv</label>
          <input
            type="search"
            placeholder="O'quvchi ismi yoki ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="rp-filter rp-filter-reset">
          <button className="rp-btn rp-btn-reset" onClick={resetFilters} title="Filterlarni tozalash">
            ↺ Tozalash
          </button>
        </div>
      </div>

      {/* Summary line */}
      <div className="rp-summary">
        <div className="rp-summary-item">
          <span>Davr:</span>
          <strong>{fmtDate(startDate)} — {fmtDate(endDate)}</strong>
        </div>
        <div className="rp-summary-item">
          <span>Yozuvlar:</span>
          <strong>{filtered.length} ta</strong>
        </div>
        <div className="rp-summary-item rp-summary-total">
          <span>Jami:</span>
          <strong>{fmtSom(total)}</strong>
        </div>
      </div>

      {/* Print-only meta */}
      <div className="rp-print-only">
        <h2>Moliyaviy hisobot</h2>
        <p>
          <strong>Davr:</strong> {fmtDate(startDate)} — {fmtDate(endDate)} &nbsp;|&nbsp;
          <strong>To'lov turi:</strong> {paymentType === 'all' ? 'Barchasi' : PAYMENT_TYPE_LABEL[paymentType]} &nbsp;|&nbsp;
          <strong>Sinf:</strong> {activeClassLabel} &nbsp;|&nbsp;
          <strong>Yozuvlar:</strong> {filtered.length} ta &nbsp;|&nbsp;
          <strong>Jami:</strong> {fmtSom(total)}
        </p>
      </div>

      {/* Results */}
      {loading ? (
        <div className="rp-loading">
          <div className="rp-spinner" />
          <p>Yuklanmoqda...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rp-empty">
          <span>📭</span>
          <p>To'lov topilmadi</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>№</th>
                  <th>Sana</th>
                  <th>O'quvchi</th>
                  <th>Sinf</th>
                  <th>Turi</th>
                  <th className="rp-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((p, i) => {
                  const s = p.studentId || {};
                  const cls = s.classId?.className || s.classId?.name || '—';
                  return (
                    <tr key={p._id || i}>
                      <td className="rp-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td>{fmtDateTime(p.paymentDate)}</td>
                      <td>
                        <div className="rp-student">
                          <strong>{s.firstName} {s.lastName}</strong>
                          {s.studentId && <small>{s.studentId}</small>}
                        </div>
                      </td>
                      <td><span className="rp-tag rp-tag-class">{cls}</span></td>
                      <td><span className={`rp-tag ${PAYMENT_TYPE_CLASS[p.paymentType] || ''}`}>{PAYMENT_TYPE_LABEL[p.paymentType] || p.paymentType}</span></td>
                      <td className="rp-right rp-amount">{fmtSom(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5"><strong>JAMI ({filtered.length} ta)</strong></td>
                  <td className="rp-right"><strong>{fmtSom(total)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile list */}
          <div className="rp-list">
            {pageData.map((p, i) => {
              const s = p.studentId || {};
              const cls = s.classId?.className || s.classId?.name || '—';
              return (
                <div key={p._id || i} className="rp-row">
                  <div className="rp-row-left">
                    <div className="rp-row-name">
                      <strong>{s.firstName} {s.lastName}</strong>
                      <div className="rp-row-tags">
                        <span className="rp-tag rp-tag-class">{cls}</span>
                        <span className={`rp-tag ${PAYMENT_TYPE_CLASS[p.paymentType] || ''}`}>{PAYMENT_TYPE_LABEL[p.paymentType] || p.paymentType}</span>
                      </div>
                    </div>
                    <small className="rp-row-date">{fmtDateTime(p.paymentDate)}</small>
                  </div>
                  <div className="rp-row-amount">{fmtSom(p.amount)}</div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="rp-pagination rp-no-print">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>← Oldingi</button>
              <span>{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Keyingi →</button>
            </div>
          )}
        </>
      )}

      {/* ─── STYLES ─────────────────────────────────────────── */}
      <style>{`
        /* === BASE - Kompyuter (≥1200px) === */
        .rp-page {
          padding: 1.5rem;
          max-width: 1280px;
          margin: 0 auto;
          box-sizing: border-box;
          background: linear-gradient(180deg, #fffbeb 0%, #f8fafc 280px);
          min-height: 100vh;
        }
        .rp-print-only { display: none; }

        /* Header */
        .rp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
          border-radius: 14px;
          color: #fff;
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.22);
        }
        .rp-header h1 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 0.2rem;
          letter-spacing: -0.02em;
        }
        .rp-header p {
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.92;
        }
        .rp-export { display: flex; gap: 0.5rem; }
        .rp-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1.1rem;
          border: none; border-radius: 10px;
          font-weight: 700; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
        }
        .rp-btn-excel {
          background: #fff; color: #a16207;
          box-shadow: 0 3px 10px rgba(0,0,0,0.12);
        }
        .rp-btn-excel:hover { background: #fffbeb; transform: translateY(-1px); }
        .rp-btn-pdf {
          background: rgba(255,255,255,0.18); color: #fff;
          border: 1px solid rgba(255,255,255,0.4);
          backdrop-filter: blur(6px);
        }
        .rp-btn-pdf:hover { background: rgba(255,255,255,0.28); transform: translateY(-1px); }
        .rp-btn-reset {
          background: #fffbeb; color: #92400e;
          border: 1px solid #fde68a;
          padding: 0.55rem 0.875rem;
        }
        .rp-btn-reset:hover { background: #fef3c7; border-color: #fcd34d; }

        /* Error */
        .rp-error {
          display: flex; align-items: center; gap: 0.75rem;
          background: #fef2f2; color: #991b1b;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #fecaca;
          font-size: 0.875rem;
        }
        .rp-error button {
          margin-left: auto; background: transparent; color: #991b1b;
          border: none; cursor: pointer; font-size: 1rem;
          width: 24px; height: 24px;
        }

        /* Filters */
        .rp-filters {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.875rem;
          background: #fff;
          padding: 1.125rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #d97706;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .rp-filter { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
        .rp-filter-wide { grid-column: span 2; }
        .rp-filter-reset { justify-content: flex-end; }
        .rp-filter label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .rp-filter input, .rp-filter select {
          padding: 0.55rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.875rem;
          background: #f8fafc;
          color: #0f172a;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
          transition: all 0.2s;
        }
        .rp-filter input:focus, .rp-filter select:focus {
          outline: none; border-color: #d97706;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        /* Summary - 3 ta rangli karta */
        .rp-summary {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1.3fr;
          gap: 0.875rem;
          margin-bottom: 1rem;
        }
        .rp-summary-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0.875rem 1.125rem;
          border-radius: 12px;
          border: 1px solid;
        }
        .rp-summary-item:nth-child(1) {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-color: #bfdbfe;
        }
        .rp-summary-item:nth-child(2) {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-color: #fcd34d;
        }
        .rp-summary-total {
          background: linear-gradient(135deg, #fef3c7, #fde68a) !important;
          border-color: #fcd34d !important;
        }
        .rp-summary-item span {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          opacity: 0.7;
        }
        .rp-summary-item:nth-child(1) span { color: #1e40af; }
        .rp-summary-item:nth-child(2) span { color: #92400e; }
        .rp-summary-total span { color: #92400e; }
        .rp-summary-item strong { font-size: 0.95rem; font-weight: 800; color: #0f172a; }
        .rp-summary-total strong { color: #92400e !important; font-size: 1.1rem; }

        /* Loading / empty */
        .rp-loading, .rp-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 3rem 1rem;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }
        .rp-spinner {
          width: 36px; height: 36px;
          border: 3px solid #e2e8f0; border-top-color: #0f172a;
          border-radius: 50%; animation: rp-spin 0.8s linear infinite;
          margin-bottom: 0.75rem;
        }
        @keyframes rp-spin { to { transform: rotate(360deg); } }
        .rp-empty span { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .rp-empty p { margin: 0; font-size: 0.95rem; font-weight: 600; }

        /* Table */
        .rp-table-wrap {
          overflow-x: auto;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .rp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }
        .rp-table thead {
          background: linear-gradient(135deg, #92400e 0%, #d97706 100%);
        }
        .rp-table th {
          padding: 0.85rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .rp-table th.rp-right, .rp-table td.rp-right { text-align: right; }
        .rp-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.875rem;
          color: #1e293b;
        }
        .rp-table tbody tr:hover { background: #fffbeb; }
        .rp-table tbody tr:last-child td { border-bottom: none; }
        .rp-table tfoot td {
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          font-weight: 800;
          border-top: 2px solid #d97706;
          color: #92400e;
          font-size: 0.9rem;
        }
        .rp-muted { color: #94a3b8; }
        .rp-amount { color: #a16207; font-weight: 800; }
        .rp-student { display: flex; flex-direction: column; gap: 1px; }
        .rp-student small { color: #94a3b8; font-size: 0.72rem; }

        /* Tags / badges */
        .rp-tag {
          display: inline-block;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .rp-tag-class { background: #dbeafe; color: #1e40af; }
        .rp-tag-cash  { background: #fef3c7; color: #78350f; }
        .rp-tag-card  { background: #ede9fe; color: #5b21b6; }
        .rp-tag-bank  { background: #fef3c7; color: #92400e; }

        /* Mobile list (hidden on desktop) */
        .rp-list { display: none; }

        /* Pagination */
        .rp-pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .rp-pagination button {
          padding: 0.5rem 1rem;
          background: #fff;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 8px;
          font-weight: 700; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s;
        }
        .rp-pagination button:hover:not(:disabled) {
          background: #fef3c7;
          border-color: #d97706;
        }
        .rp-pagination button:disabled {
          opacity: 0.45; cursor: not-allowed;
          color: #94a3b8; border-color: #e2e8f0;
        }
        .rp-pagination span {
          font-weight: 700; color: #92400e;
          font-size: 0.875rem;
          min-width: 70px; text-align: center;
          padding: 0.4rem 0.875rem;
          background: #fffbeb;
          border-radius: 8px;
        }

        /* === Noutbuk (992-1199) === */
        @media (min-width: 992px) and (max-width: 1199px) {
          .rp-filters { grid-template-columns: repeat(3, 1fr); }
          .rp-filter-wide { grid-column: span 2; }
          .rp-filter-reset { grid-column: span 1; }
        }

        /* === Planshet (768-991) === */
        @media (min-width: 768px) and (max-width: 991px) {
          .rp-page { padding: 1.25rem; }
          .rp-filters { grid-template-columns: repeat(2, 1fr); }
          .rp-filter-wide { grid-column: span 2; }
          .rp-filter-reset { grid-column: span 2; }
          .rp-summary { grid-template-columns: 1fr 1fr 1fr; gap: 0.625rem; }
        }

        /* === Telefon (481-767) === */
        @media (min-width: 481px) and (max-width: 767px) {
          .rp-page { padding: 1rem; }
          .rp-header h1 { font-size: 1.25rem; }
          .rp-header p { font-size: 0.8rem; }
          .rp-export { width: 100%; }
          .rp-export .rp-btn { flex: 1; }

          .rp-filters {
            grid-template-columns: 1fr 1fr;
            gap: 0.625rem;
            padding: 0.875rem;
          }
          .rp-filter-wide { grid-column: span 2; }
          .rp-filter-reset { grid-column: span 2; }
          .rp-btn-reset { width: 100%; }
          .rp-filter input, .rp-filter select { padding: 0.5rem 0.625rem; font-size: 0.82rem; }

          .rp-summary {
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }
          .rp-summary-total { grid-column: span 2; }
          .rp-summary-item { padding: 0.7rem 0.9rem; }
          .rp-summary-item strong { font-size: 0.88rem; }
          .rp-summary-total strong { font-size: 1rem; }

          /* hide table, show list */
          .rp-table-wrap { display: none; }
          .rp-list {
            display: flex; flex-direction: column; gap: 0.5rem;
          }
          .rp-row {
            display: flex; align-items: center; justify-content: space-between;
            gap: 0.875rem;
            padding: 0.875rem 1rem;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #d97706;
            border-radius: 10px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          }
          .rp-row-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
          .rp-row-name strong {
            display: block; font-size: 0.9rem; color: #0f172a;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .rp-row-tags {
            display: flex; flex-wrap: wrap; gap: 4px;
            margin-top: 3px;
          }
          .rp-row-date { font-size: 0.7rem; color: #94a3b8; margin-top: 2px; }
          .rp-row-amount {
            font-size: 1rem; font-weight: 800; color: #a16207;
            white-space: nowrap;
            background: #fffbeb;
            padding: 0.4rem 0.7rem;
            border-radius: 8px;
          }

          .rp-pagination button { padding: 0.45rem 0.75rem; font-size: 0.82rem; }
        }

        /* === Kichik telefon (≤480) === */
        @media (max-width: 480px) {
          .rp-page { padding: 0.75rem; }
          .rp-header h1 { font-size: 1.15rem; }
          .rp-header p { font-size: 0.75rem; }
          .rp-export { width: 100%; }
          .rp-export .rp-btn {
            flex: 1; padding: 0.5rem 0.75rem; font-size: 0.82rem;
          }

          .rp-filters {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            padding: 0.75rem;
          }
          .rp-filter-wide, .rp-filter-reset { grid-column: span 1; }
          .rp-filter label { font-size: 0.7rem; }
          .rp-filter input, .rp-filter select { padding: 0.5rem 0.625rem; font-size: 0.8rem; }
          .rp-btn-reset { width: 100%; }

          .rp-summary {
            grid-template-columns: 1fr 1fr;
            gap: 0.4rem;
          }
          .rp-summary-total { grid-column: span 2; }
          .rp-summary-item { padding: 0.6rem 0.8rem; }
          .rp-summary-item span { font-size: 0.65rem; }
          .rp-summary-item strong { font-size: 0.82rem; }
          .rp-summary-total strong { font-size: 0.95rem; }

          .rp-table-wrap { display: none; }
          .rp-list { border-radius: 8px; }
          .rp-row {
            padding: 0.75rem 0.875rem;
            gap: 0.625rem;
          }
          .rp-row-name strong { font-size: 0.85rem; }
          .rp-row-name small { font-size: 0.68rem; }
          .rp-row-date { font-size: 0.66rem; }
          .rp-row-amount { font-size: 0.88rem; }

          .rp-pagination {
            gap: 0.5rem;
          }
          .rp-pagination button { padding: 0.45rem 0.6rem; font-size: 0.78rem; }
          .rp-pagination span { font-size: 0.82rem; min-width: 56px; }

          .rp-loading, .rp-empty { padding: 2rem 1rem; }
        }

        /* === Print (PDF) === */
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body.rp-printing * { visibility: hidden; }
          body.rp-printing .rp-page,
          body.rp-printing .rp-page * { visibility: visible; }
          body.rp-printing .rp-page {
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 0; max-width: none;
          }
          .rp-no-print { display: none !important; }
          .rp-print-only { display: block !important; margin-bottom: 1rem; }
          .rp-print-only h2 { margin: 0 0 0.5rem; color: #0f172a; font-size: 1.25rem; }
          .rp-print-only p { margin: 0; font-size: 0.85rem; color: #475569; }

          .rp-summary { box-shadow: none; border: 1px solid #cbd5e1; }
          .rp-table-wrap { display: block !important; border: 1px solid #cbd5e1; overflow: visible; }
          .rp-table { min-width: 0; font-size: 0.78rem; }
          .rp-table th { background: #1e293b !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .rp-table th, .rp-table td { padding: 5px 8px; }
          .rp-list { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default AccountantReports;
