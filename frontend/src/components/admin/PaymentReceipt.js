import React from 'react';

const PaymentReceipt = ({ payment, student, onClose, schoolInfo }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  };

  const getPaymentTypeLabel = (type) => {
    const types = {
      cash: 'Naqd pul',
      card: 'Plastik karta',
      bank_transfer: 'Bank o\'tkazmasi'
    };
    return types[type] || type;
  };

  // School logo path - will be loaded dynamically
  const logoPath = '/assets/images/logo.jpg';

  const handlePrintOrSave = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      alert('Pop-up blocker aktiv! Iltimos, pop-up larni yoqing.');
      return;
    }

    const receiptContent = document.getElementById('receipt-print');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>To'lov Cheki - ${payment.receiptNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            font-family: Arial, sans-serif;
            padding: 0.3cm;
            background: white;
          }

          .receipt-copy {
            padding: 0.3cm 0.4cm;
            margin-bottom: 0.2cm;
            page-break-inside: avoid;
            border: 1px dashed #000;
            background: white;
            min-height: 6cm;
            max-height: 9cm;
          }

          .receipt-copy:last-child {
            margin-bottom: 0;
          }

          .receipt-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.4rem;
            padding-bottom: 0.3rem;
            border-bottom: 1px solid #1e3a8a;
          }

          .receipt-logo img {
            width: 32px;
            height: 32px;
            object-fit: contain;
            border-radius: 4px;
          }

          .receipt-school-info h1 {
            font-size: 0.875rem;
            font-weight: 800;
            color: #FFFFFF;
            margin: 0;
            line-height: 1.2;
          }

          .receipt-school-info p {
            margin: 0;
            color: #FFFFFF;
            font-size: 0.625rem;
            line-height: 1.3;
          }

          .receipt-title {
            text-align: center;
            margin-bottom: 0.4rem;
          }

          .receipt-title h2 {
            font-size: 0.9375rem;
            font-weight: 800;
            color: #1e3a8a;
            margin: 0 0 0.125rem 0;
            letter-spacing: 0.5px;
          }

          .receipt-number {
            font-size: 0.6875rem;
            color: #64748b;
            font-weight: 600;
            margin: 0;
          }

          .copy-label {
            font-size: 0.625rem;
            color: #059669;
            font-weight: 700;
            margin: 0.0625rem 0 0 0;
            font-style: italic;
          }

          .receipt-info-compact {
            margin-bottom: 0.4rem;
            background: #f8fafc;
            padding: 0.3rem 0.4rem;
            border-radius: 4px;
          }

          .info-row-compact {
            display: flex;
            justify-content: space-between;
            padding: 0.15rem 0;
            border-bottom: 1px dotted #e2e8f0;
          }

          .info-row-compact:last-child {
            border-bottom: none;
          }

          .info-label {
            font-weight: 600;
            color: #475569;
            font-size: 0.6875rem;
          }

          .info-value {
            font-weight: 700;
            color: #1e293b;
            font-size: 0.6875rem;
          }

          .receipt-amount-section {
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            padding: 0.4rem 0.5rem;
            border-radius: 4px;
            margin: 0.4rem 0;
            border: 1px solid #86efac;
          }

          .amount-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.15rem 0;
          }

          .amount-row.discount-row {
            border-top: 1px dashed #a7f3d0;
          }

          .amount-row.total-row {
            border-top: 1px solid #22c55e;
            margin-top: 0.2rem;
            padding-top: 0.25rem;
          }

          .amount-label-inline {
            font-size: 0.6875rem;
            color: #166534;
            font-weight: 600;
          }

          .amount-value-inline {
            font-size: 0.75rem;
            font-weight: 700;
            color: #166534;
          }

          .amount-value-inline.discount-value {
            color: #dc2626;
          }

          .amount-value-inline.total-value {
            font-size: 0.875rem;
            font-weight: 800;
            color: #15803d;
          }

          .receipt-amount-compact {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            padding: 0.4rem 0.5rem;
            border-radius: 4px;
            text-align: center;
            margin: 0.4rem 0;
            border: 1px solid #fbbf24;
          }

          .amount-label {
            font-size: 0.6875rem;
            color: #78350f;
            font-weight: 600;
            margin-bottom: 0.0625rem;
          }

          .amount-value {
            font-size: 1rem;
            font-weight: 800;
            color: #78350f;
          }

          .receipt-footer-compact {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            margin-top: 0.4rem;
            padding-top: 0.4rem;
            border-top: 1px solid #e2e8f0;
          }

          .signature-block-compact,
          .school-stamp {
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .signature-line {
            height: 1px;
            background: #cbd5e1;
            margin: 0 0 0.25rem 0;
          }

          .signature-label,
          .stamp-label {
            color: #64748b;
            font-size: 0.625rem;
            font-weight: 600;
            margin: 0;
          }

          .stamp-circle-empty {
            width: 55px;
            height: 55px;
            border: 2px solid #64748b;
            border-radius: 50%;
            margin: 0 auto 0.25rem auto;
            background: white;
            position: relative;
          }

          .stamp-circle-empty::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 47px;
            height: 47px;
            border: 1px dashed #cbd5e1;
            border-radius: 50%;
          }

          @page {
            size: A4 portrait;
            margin: 0.3cm;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${receiptContent.innerHTML.replace(/src="\//g, 'src="' + window.location.origin + '/')}
      </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for images to load
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 500);
  };

  const schoolName = schoolInfo?.name || 'My Dream School';
  const schoolAddress = schoolInfo?.address || 'Beruniy tumani';
  const schoolPhone = schoolInfo?.phone || '+998 90 706 88 66';

  return (
    <div className="receipt-overlay print-only-receipt" onClick={onClose}>
      <div className="receipt-container" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-actions no-print">
          <button className="btn-print-save" onClick={handlePrintOrSave}>
            🖨️ Chop qilish / Saqlash
          </button>
          <button className="btn-close-receipt" onClick={onClose}>
            ✕ Yopish
          </button>
        </div>

        {/* Two copies of receipt for printing */}
        <div className="receipt-content" id="receipt-print">
          {[1, 2].map((copyNumber) => (
            <div key={copyNumber} className="receipt-copy">
              {/* Header */}
              <div className="receipt-header">
                <div className="receipt-logo">
                  <img src={logoPath} alt="School Logo" />
                </div>
                <div className="receipt-school-info">
                  <h1>{schoolName}</h1>
                  <p>{schoolAddress} • Tel: {schoolPhone}</p>
                </div>
              </div>

              {/* Title */}
              <div className="receipt-title">
                <h2>TO'LOV TASDIG'I</h2>
                <p className="receipt-number">№ {payment.receiptNumber}</p>
                <p className="copy-label">{copyNumber === 1 ? '(O\'quvchi nusxasi)' : '(Arxiv nusxasi)'}</p>
              </div>

              {/* Payment Info - Compact */}
              <div className="receipt-info-compact">
                <div className="info-row-compact">
                  <span className="info-label">Sana:</span>
                  <span className="info-value">{formatDate(payment.paymentDate)}</span>
                </div>

                <div className="info-row-compact">
                  <span className="info-label">O'quvchi:</span>
                  <span className="info-value">{student.firstName} {student.lastName}</span>
                </div>

                <div className="info-row-compact">
                  <span className="info-label">To'lov oyi:</span>
                  <span className="info-value">{formatMonth(payment.paymentMonth)}</span>
                </div>

                <div className="info-row-compact">
                  <span className="info-label">To'lov turi:</span>
                  <span className="info-value">{getPaymentTypeLabel(payment.paymentType)}</span>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="receipt-amount-section">
                <div className="amount-row">
                  <span className="amount-label-inline">To'lanishi kerak:</span>
                  <span className="amount-value-inline">{formatCurrency(payment.amount)}</span>
                </div>
                {payment.discount > 0 && (
                  <div className="amount-row discount-row">
                    <span className="amount-label-inline">Chegirma:</span>
                    <span className="amount-value-inline discount-value">- {formatCurrency(payment.discount)}</span>
                  </div>
                )}
                <div className="amount-row total-row">
                  <span className="amount-label-inline">Haqiqiy to'lov:</span>
                  <span className="amount-value-inline total-value">{formatCurrency(payment.actualPayment || (payment.amount - (payment.discount || 0)))}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="receipt-footer-compact">
                <div className="signature-block-compact">
                  <div className="signature-line"></div>
                  <p className="signature-label">To'lovchi imzosi</p>
                </div>
                <div className="school-stamp">
                  <div className="stamp-circle-empty">
                    {/* Bo'sh dumaloq joy - pechat uchun */}
                  </div>
                  <p className="stamp-label">Maktab muhri</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .receipt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease-out;
        }

        .receipt-container {
          background: white;
          border-radius: 16px;
          max-width: 800px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: slideUp 0.3s ease-out;
        }

        .receipt-actions {
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .btn-print-save,
        .btn-close-receipt {
          flex: 1;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-print-save {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
        }

        .btn-print-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
        }

        .btn-close-receipt {
          background: white;
          color: #64748b;
          border: 2px solid #e2e8f0;
        }

        .btn-close-receipt:hover {
          background: #f8fafc;
        }

        .receipt-content {
          padding: 1.5rem;
          background: white;
          max-height: 90vh;
          overflow-y: auto;
        }

        .receipt-copy {
          padding: 0.5rem;
          margin-bottom: 0;
          page-break-after: avoid;
          page-break-inside: avoid;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          background: white;
          position: relative;
        }

        .receipt-copy:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        .receipt-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
          padding-bottom: 0.3rem;
          border-bottom: 1px solid #1e3a8a;
        }

        .receipt-logo img {
          width: 32px;
          height: 32px;
          object-fit: contain;
          border-radius: 4px;
        }

        .receipt-school-info h1 {
          font-size: 0.875rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.2;
        }

        .receipt-school-info p {
          margin: 0;
          color: #FFFFFF;
          font-size: 0.625rem;
          line-height: 1.3;
        }

        .receipt-title {
          text-align: center;
          margin-bottom: 0.4rem;
        }

        .receipt-title h2 {
          font-size: 0.9375rem;
          font-weight: 800;
          color: #1e3a8a;
          margin: 0 0 0.125rem 0;
          letter-spacing: 0.5px;
        }

        .receipt-number {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
          margin: 0;
        }

        .copy-label {
          font-size: 0.625rem;
          color: #059669;
          font-weight: 700;
          margin: 0.0625rem 0 0 0;
          font-style: italic;
        }

        .receipt-info-compact {
          margin-bottom: 0.4rem;
          background: #f8fafc;
          padding: 0.3rem 0.4rem;
          border-radius: 4px;
        }

        .info-row-compact {
          display: flex;
          justify-content: space-between;
          padding: 0.15rem 0;
          border-bottom: 1px dotted #e2e8f0;
        }

        .info-row-compact:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #475569;
          font-size: 0.6875rem;
        }

        .info-value {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.6875rem;
        }

        .receipt-amount-section {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          padding: 0.4rem 0.5rem;
          border-radius: 4px;
          margin: 0.4rem 0;
          border: 1px solid #86efac;
        }

        .amount-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.15rem 0;
        }

        .amount-row.discount-row {
          border-top: 1px dashed #a7f3d0;
        }

        .amount-row.total-row {
          border-top: 1px solid #22c55e;
          margin-top: 0.2rem;
          padding-top: 0.25rem;
        }

        .amount-label-inline {
          font-size: 0.6875rem;
          color: #166534;
          font-weight: 600;
        }

        .amount-value-inline {
          font-size: 0.75rem;
          font-weight: 700;
          color: #166534;
        }

        .amount-value-inline.discount-value {
          color: #dc2626;
        }

        .amount-value-inline.total-value {
          font-size: 0.875rem;
          font-weight: 800;
          color: #15803d;
        }

        .receipt-amount-compact {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 0.4rem 0.5rem;
          border-radius: 4px;
          text-align: center;
          margin: 0.4rem 0;
          border: 1px solid #fbbf24;
        }

        .amount-label {
          font-size: 0.6875rem;
          color: #78350f;
          font-weight: 600;
          margin-bottom: 0.0625rem;
        }

        .amount-value {
          font-size: 1rem;
          font-weight: 800;
          color: #78350f;
        }

        .receipt-footer-compact {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 0.4rem;
          padding-top: 0.4rem;
          border-top: 1px solid #e2e8f0;
        }

        .signature-block-compact {
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .signature-line {
          height: 1px;
          background: #cbd5e1;
          margin: 0 0 0.25rem 0;
          order: 1;
        }

        .signature-label {
          color: #64748b;
          font-size: 0.625rem;
          font-weight: 600;
          margin: 0;
          order: 2;
        }

        .school-stamp {
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .stamp-circle-empty {
          width: 55px;
          height: 55px;
          border: 2px solid #64748b;
          border-radius: 50%;
          margin: 0 auto 0.25rem auto;
          background: white;
          position: relative;
          order: 1;
        }

        .stamp-label {
          color: #64748b;
          font-size: 0.625rem;
          font-weight: 600;
          margin: 0;
          order: 2;
        }

        .stamp-circle-empty::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 47px;
          height: 47px;
          border: 1px dashed #cbd5e1;
          border-radius: 50%;
        }

        /* Print Styles */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide everything except receipt */
          body * {
            visibility: hidden !important;
            display: none !important;
          }

          /* Show only receipt overlay and its children */
          .print-only-receipt,
          .print-only-receipt * {
            visibility: visible !important;
            display: block !important;
          }

          .receipt-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: white !important;
            backdrop-filter: none !important;
            z-index: 99999 !important;
          }

          .receipt-container {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          .receipt-content {
            padding: 0.3cm !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.3cm !important;
          }

          .receipt-copy {
            width: 100% !important;
            height: auto !important;
            min-height: 6cm !important;
            max-height: 9cm !important;
            page-break-inside: avoid !important;
            page-break-after: auto !important;
            margin-bottom: 0.2cm !important;
            padding: 0.3cm 0.4cm !important;
            border: 1px dashed #000 !important;
            display: block !important;
          }

          .receipt-header,
          .receipt-title,
          .receipt-info-compact,
          .receipt-amount-compact,
          .receipt-footer-compact {
            display: block !important;
          }

          .receipt-header {
            display: flex !important;
          }

          .info-row-compact {
            display: flex !important;
          }

          .receipt-footer-compact {
            display: grid !important;
          }

          .receipt-copy:first-child {
            page-break-after: avoid !important;
          }

          .receipt-copy:last-child {
            page-break-before: avoid !important;
          }

          @page {
            size: A4 portrait;
            margin: 0.5cm;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .receipt-content {
            padding: 2rem 1.5rem;
          }

          .receipt-header {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .receipt-logo img {
            width: 60px;
            height: 60px;
          }

          .receipt-school-info h1 {
            font-size: 1.5rem;
          }

          .receipt-title h2 {
            font-size: 1.5rem;
          }

          .receipt-number {
            font-size: 1rem;
          }

          .info-row {
            flex-direction: column;
            gap: 0.25rem;
          }

          .amount-value {
            font-size: 2rem;
          }

          .receipt-footer {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .receipt-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentReceipt;
