import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import ExpoPdfToImage from 'expo-pdf-to-image';

export class PdfService {
  /**
   * Generates a PDF invoice from an Order structure and Workspace settings.
   */
  static async generateInvoicePdf(order: any, settings: any): Promise<string> {
    const clinicName = order.workspace?.name || 'OptiFlow Clinic';
    const email = settings?.clinicEmail || 'N/A';
    const phone = settings?.clinicPhone || 'N/A';
    const website = settings?.clinicWebsite || 'N/A';
    const taxId = settings?.taxIdNumber || 'N/A';

    const balance = Math.max(0, order.total - order.paidAmount);
    const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN');
    const deliveryStr = order.expectedDeliveryDate 
      ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN') 
      : 'N/A';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-info h1 { margin: 0 0 5px 0; font-size: 24px; color: #0f172a; }
          .clinic-info p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .invoice-details { text-align: right; }
          .invoice-details h2 { margin: 0 0 10px 0; font-size: 20px; color: #06b6d4; }
          .invoice-details p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px; }
          .customer-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
          .customer-box p { margin: 4px 0; font-size: 13px; }
          .customer-box strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px 10px; font-size: 13px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          .financials { display: flex; justify-content: flex-end; margin-top: 30px; }
          .financials-table { width: 280px; }
          .financials-table td { padding: 6px 10px; border-bottom: none; }
          .financials-table tr.total { font-weight: bold; font-size: 15px; border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
          .financials-table tr.total td { padding: 12px 10px; color: #0f172a; }
          .balance-due { color: #ef4444; font-weight: bold; }
          .footer { text-align: center; margin-top: 80px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-info">
            <h1>${clinicName}</h1>
            <p>📧 ${email} | 📞 ${phone}</p>
            <p>🌐 ${website}</p>
            <p>Tax ID/GSTIN: ${taxId}</p>
          </div>
          <div class="invoice-details">
            <h2>INVOICE</h2>
            <p><strong>Order #:</strong> ${order.orderNumber}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Expected Delivery:</strong> ${deliveryStr}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Billed To</div>
          <div class="customer-box">
            <p><strong>Patient Name:</strong> ${order.customer?.fullName}</p>
            <p><strong>Phone:</strong> ${order.customer?.phone}</p>
            ${order.customer?.email ? `<p><strong>Email:</strong> ${order.customer.email}</p>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Product Specifications</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Specifications</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Frame</strong></td>
                <td>${order.frameBrand ? `${order.frameBrand} ${order.frameModel || ''}` : 'N/A'} ${order.frameName ? `(${order.frameName})` : ''}</td>
                <td>${order.quantity || 1}</td>
              </tr>
              <tr>
                <td><strong>Lens</strong></td>
                <td>Type: ${order.lensType || 'N/A'} | Coating: ${order.lensCoating || 'N/A'}</td>
                <td>${order.quantity || 1}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="financials">
          <table class="financials-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">₹${order.subtotal?.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Discount:</td>
              <td style="text-align: right; color: #ef4444;">-₹${order.discount?.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Tax (${settings?.taxRate || 0}%):</td>
              <td style="text-align: right;">+₹${order.tax?.toLocaleString('en-IN')}</td>
            </tr>
            <tr class="total">
              <td>Total:</td>
              <td style="text-align: right;">₹${order.total?.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="color: #10b981;">Amount Paid:</td>
              <td style="text-align: right; color: #10b981; font-weight: bold;">₹${order.paidAmount?.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td>Balance Due:</td>
              <td style="text-align: right;" class="${balance > 0 ? 'balance-due' : ''}">₹${balance?.toLocaleString('en-IN')}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Thank you for choosing ${clinicName} for your vision care needs!</p>
          <p>Generated dynamically by OptiFlow SaaS platform.</p>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      return uri;
    } catch (err) {
      console.error('Error generating PDF:', err);
      throw new Error('PDF Generation Failed');
    }
  }

  /**
   * Generates a PDF prescription from a Prescription record and Customer details.
   */
  static async generatePrescriptionPdf(prescription: any, customer: any): Promise<string> {
    const clinicName = prescription.workspace?.name || 'OptiFlow Clinic';
    const dateStr = new Date(prescription.prescriptionDate).toLocaleDateString('en-IN');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 35px; }
          .clinic-info h1 { margin: 0 0 5px 0; font-size: 24px; color: #0f172a; }
          .clinic-info p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .rx-title { text-align: right; }
          .rx-title h2 { margin: 0 0 10px 0; font-size: 22px; color: #06b6d4; letter-spacing: 1px; }
          .rx-title p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.5px; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
          .patient-box p { margin: 4px 0; font-size: 13px; }
          .patient-box strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; text-align: center; padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: bold; border: 1px solid #cbd5e1; }
          td { padding: 12px 10px; font-size: 13px; text-align: center; border: 1px solid #e2e8f0; color: #334155; }
          .eye-side { text-align: left; font-weight: bold; background: #f8fafc; }
          .signature-box { display: flex; justify-content: flex-end; margin-top: 80px; }
          .signature { width: 220px; border-top: 1px solid #94a3b8; text-align: center; font-size: 12px; color: #64748b; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-info">
            <h1>${clinicName}</h1>
            <p>Ophthalmic Prescription Department</p>
          </div>
          <div class="rx-title">
            <h2>Rx PRESCRIPTION</h2>
            <p><strong>Date:</strong> ${dateStr}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Patient Profile</div>
          <div class="patient-box">
            <p><strong>Name:</strong> ${customer?.fullName}</p>
            <p><strong>Phone:</strong> ${customer?.phone}</p>
            ${customer?.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Refraction Details</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left; width: 80px;">Eye</th>
                <th>Sphere (SPH)</th>
                <th>Cylinder (CYL)</th>
                <th>Axis</th>
                <th>Addition (ADD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="eye-side">O.D. (Right)</td>
                <td>${prescription.rightSphere !== null ? (prescription.rightSphere > 0 ? '+' : '') + prescription.rightSphere : '0.00'}</td>
                <td>${prescription.rightCylinder !== null ? (prescription.rightCylinder > 0 ? '+' : '') + prescription.rightCylinder : '0.00'}</td>
                <td>${prescription.rightAxis !== null ? prescription.rightAxis + '°' : '—'}</td>
                <td>${prescription.rightAdd !== null ? '+' + prescription.rightAdd : '—'}</td>
              </tr>
              <tr>
                <td class="eye-side">O.S. (Left)</td>
                <td>${prescription.leftSphere !== null ? (prescription.leftSphere > 0 ? '+' : '') + prescription.leftSphere : '0.00'}</td>
                <td>${prescription.leftCylinder !== null ? (prescription.leftCylinder > 0 ? '+' : '') + prescription.leftCylinder : '0.00'}</td>
                <td>${prescription.leftAxis !== null ? prescription.leftAxis + '°' : '—'}</td>
                <td>${prescription.leftAdd !== null ? '+' + prescription.leftAdd : '—'}</td>
              </tr>
            </tbody>
          </table>
          
          ${prescription.pupillaryDistance ? `
            <p style="margin-top: 15px; font-size: 13px;">
              <strong>Pupillary Distance (PD):</strong> ${prescription.pupillaryDistance} mm
            </p>
          ` : ''}
        </div>

        ${prescription.notes ? `
          <div class="section">
            <div class="section-title">Notes / Recommendations</div>
            <p style="font-size: 13px; color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid #06b6d4;">
              ${prescription.notes}
            </p>
          </div>
        ` : ''}

        <div class="signature-box">
          <div class="signature">
            <strong>Dr. ${prescription.doctorName || 'Optometrist Specialist'}</strong>
            <p>Authorized Signature</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      return uri;
    } catch (err) {
      console.error('Error generating Prescription PDF:', err);
      throw new Error('Prescription PDF Compilation Failed');
    }
  }

  /**
   * Generates a PDF optical receipt from the ReceiptPad data.
   */
  static async generateOpticalReceiptPdf(data: any): Promise<string> {
    const receiptNo = data.receiptNo || '';
    const date = data.date || '';
    const customerName = data.customerName || '';
    const customerAddress = data.customerAddress || '';
    const customerMobile = data.customerMobile || '';

    // We render exactly 5 rows in the table
    const tableRows = Array.from({ length: 5 }).map((_, idx) => {
      const item = data.items[idx] || { particulars: '', qty: '', rate: '', amount: '' };
      return `
        <tr class="item-row">
          <td style="text-align: center; font-size: 11px; width: 10%; border-right: 1px solid #000; height: 26px;">${idx + 1}</td>
          <td style="text-align: left; padding-left: 5px; font-size: 11px; width: 50%; border-right: 1px solid #000;">${item.particulars}</td>
          <td style="text-align: center; font-size: 11px; width: 10%; border-right: 1px solid #000;">${item.qty}</td>
          <td style="text-align: right; padding-right: 5px; font-size: 11px; width: 15%; border-right: 1px solid #000;">${item.rate ? '₹' + item.rate : ''}</td>
          <td style="text-align: right; padding-right: 5px; font-weight: 500; font-size: 11px; width: 15%;">${item.amount ? '₹' + item.amount : ''}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Hind:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A5;
            margin: 0;
          }
          body {
            font-family: 'Hind', sans-serif;
            color: #000;
            margin: 0;
            padding: 10px;
            box-sizing: border-box;
            background-color: #fff;
            width: 148mm;
            height: 210mm;
          }
          .outer-border {
            border: 1.5px solid #000;
            width: 100%;
            height: 100%;
            padding: 12px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          .header-title {
            font-size: 20px;
            font-weight: 700;
            text-align: center;
            margin: 0;
            padding: 0;
            letter-spacing: 0.5px;
          }
          .header-subtitle {
            font-size: 10px;
            text-align: center;
            margin: 2px 0 10px 0;
            font-weight: 600;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .meta-row span.val {
            border-bottom: 1px solid #000;
            padding: 0 4px;
            font-weight: 700;
          }
          .field-row {
            display: flex;
            align-items: flex-end;
            font-size: 11px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .field-row span.lbl {
            white-space: nowrap;
          }
          .field-row span.val-line {
            flex: 1;
            border-bottom: 1px dashed #000;
            margin-left: 5px;
            padding-left: 5px;
            font-weight: 700;
            min-height: 15px;
          }
          .billing-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000;
            margin-top: 5px;
          }
          .billing-table th {
            border: 1px solid #000;
            font-size: 9px;
            font-weight: 700;
            text-align: center;
            background-color: #f2f2f2;
            padding: 4px 2px;
          }
          .billing-table td {
            padding: 0;
          }
          .item-row {
            border-bottom: 1px solid #000;
          }
          .totals-row td {
            border: 1px solid #000;
            padding: 3px 6px;
            font-size: 10px;
            font-weight: 700;
          }
          .totals-lbl {
            text-align: right;
            background-color: #f9f9f9;
          }
          .footer-container {
            display: flex;
            margin-top: auto;
            align-items: stretch;
            padding-top: 10px;
          }
          .rx-table {
            width: 70%;
            border-collapse: collapse;
            border: 1px solid #000;
          }
          .rx-table th {
            border: 0.5px solid #000;
            font-size: 8px;
            font-weight: 700;
            text-align: center;
            padding: 2px;
          }
          .rx-table td {
            border: 0.5px solid #000;
            font-size: 9px;
            text-align: center;
            padding: 3px 2px;
            height: 20px;
          }
          .rx-label {
            font-size: 8px;
            font-weight: 700;
            background-color: #f9f9f9;
            width: 12%;
            line-height: 1.1;
          }
          .sig-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            font-weight: 700;
            font-size: 11px;
            padding-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="outer-border">
          <div class="header-title">राज आई केयर एण्ड ऑप्टिकल्स</div>
          <div class="header-subtitle">स्टेट बैंक के सामने, टपूकड़ा बाईपास, (राज.)</div>

          <div class="meta-row">
            <div>No. <span class="val" style="min-width: 60px; display: inline-block;">${receiptNo}</span></div>
            <div>Date : <span class="val" style="min-width: 80px; display: inline-block; text-align: center;">${date}</span></div>
          </div>

          <div class="field-row">
            <span class="lbl">Name</span>
            <span class="val-line">${customerName}</span>
          </div>

          <div class="field-row">
            <span class="lbl">Add. :</span>
            <span class="val-line" style="flex: 2;">${customerAddress}</span>
            <span class="lbl" style="margin-left: 10px;">Mob. :</span>
            <span class="val-line" style="flex: 1;">${customerMobile}</span>
          </div>

          <table class="billing-table">
            <thead>
              <tr>
                <th style="width: 10%;">S. No.</th>
                <th style="width: 50%;">PARTICULARS</th>
                <th style="width: 10%;">QTY.</th>
                <th style="width: 15%;">RATE</th>
                <th style="width: 15%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="totals-row">
                <td colspan="4" class="totals-lbl">TOTAL</td>
                <td style="text-align: right; padding-right: 5px;">${data.total ? '₹' + data.total : ''}</td>
              </tr>
              <tr class="totals-row">
                <td colspan="4" class="totals-lbl">ADVANCE</td>
                <td style="text-align: right; padding-right: 5px;">${data.advance ? '₹' + data.advance : ''}</td>
              </tr>
              <tr class="totals-row">
                <td colspan="4" class="totals-lbl">BALANCE</td>
                <td style="text-align: right; padding-right: 5px; font-weight: bold;">${data.balance ? '₹' + data.balance : ''}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-container">
            <table class="rx-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 12%;">Eye</th>
                  <th colspan="3">RIGHT</th>
                  <th colspan="3">LEFT</th>
                </tr>
                <tr>
                  <th style="width: 14.6%;">SPH</th>
                  <th style="width: 14.6%;">CYL</th>
                  <th style="width: 14.6%;">AXIS</th>
                  <th style="width: 14.6%;">SPH</th>
                  <th style="width: 14.6%;">CYL</th>
                  <th style="width: 14.6%;">AXIS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="rx-label">DIST.</td>
                  <td>${data.rxDistanceRight.sph}</td>
                  <td>${data.rxDistanceRight.cyl}</td>
                  <td>${data.rxDistanceRight.axis}</td>
                  <td>${data.rxDistanceLeft.sph}</td>
                  <td>${data.rxDistanceLeft.cyl}</td>
                  <td>${data.rxDistanceLeft.axis}</td>
                </tr>
                <tr>
                  <td class="rx-label">NEAR</td>
                  <td>${data.rxReadingRight.sph}</td>
                  <td>${data.rxReadingRight.cyl}</td>
                  <td>${data.rxReadingRight.axis}</td>
                  <td>${data.rxReadingLeft.sph}</td>
                  <td>${data.rxReadingLeft.cyl}</td>
                  <td>${data.rxReadingLeft.axis}</td>
                </tr>
              </tbody>
            </table>

            <div class="sig-box">
              हस्ताक्षर
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 420,
        height: 595,
      });
      return uri;
    } catch (err) {
      console.error('Error generating Optical Receipt PDF:', err);
      throw new Error('Optical Receipt Compilation Failed');
    }
  }

  /**
   * Generates a PDF Ledger statement for a customer.
   */
  static async generateLedgerPdf(customerSummary: any, transactions: any[], settings: any): Promise<string> {
    const clinicName = settings?.workspace?.name || 'OptiFlow Clinic';
    const email = settings?.clinicEmail || 'N/A';
    const phone = settings?.clinicPhone || 'N/A';
    const website = settings?.clinicWebsite || 'N/A';

    const dateStr = new Date().toLocaleDateString('en-IN');
    const totalPurchase = customerSummary.totalPurchase || 0;
    const totalPaid = customerSummary.totalPaid || 0;
    const totalDue = customerSummary.totalDue || 0;
    const lastPaymentDateStr = customerSummary.lastPaymentDate
      ? new Date(customerSummary.lastPaymentDate).toLocaleDateString('en-IN')
      : 'N/A';

    const transactionRows = transactions.map((tx) => {
      const txDate = new Date(tx.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const formatType = tx.type.replace(/_/g, ' ');
      const debitStr = tx.debit > 0 ? `₹${tx.debit.toLocaleString('en-IN')}` : '—';
      const creditStr = tx.credit > 0 ? `₹${tx.credit.toLocaleString('en-IN')}` : '—';
      const isDebit = tx.debit > 0;
      const typeStyle = isDebit ? 'color: #ef4444; font-weight: 600;' : 'color: #10b981; font-weight: 600;';

      return `
        <tr>
          <td style="font-size: 11px; white-space: nowrap;">${txDate}</td>
          <td style="font-size: 11px; text-transform: capitalize; ${typeStyle}">${formatType.toLowerCase()}</td>
          <td style="font-size: 11px;">${tx.notes || '—'}</td>
          <td style="font-size: 11px; font-family: monospace;">${tx.referenceId || '—'}</td>
          <td style="font-size: 11px; text-align: right; color: #ef4444;">${debitStr}</td>
          <td style="font-size: 11px; text-align: right; color: #10b981;">${creditStr}</td>
          <td style="font-size: 11px; text-align: right; font-weight: bold;">₹${tx.balance.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
          .clinic-info h1 { margin: 0 0 5px 0; font-size: 22px; color: #0f172a; }
          .clinic-info p { margin: 2px 0; font-size: 11px; color: #64748b; }
          .report-title { text-align: right; }
          .report-title h2 { margin: 0 0 5px 0; font-size: 18px; color: #0891b2; }
          .report-title p { margin: 2px 0; font-size: 11px; color: #64748b; }
          .customer-section { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 15px; }
          .box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .box h3 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
          .box p { margin: 4px 0; font-size: 12px; }
          .box strong { color: #0f172a; }
          .stats-grid { display: flex; gap: 10px; margin-bottom: 20px; justify-content: space-between; }
          .stat-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
          .stat-card .label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .stat-card .val { font-size: 14px; font-weight: bold; margin-top: 4px; color: #0f172a; }
          .stat-card.due { border-color: #ef444440; background: #ef444405; }
          .stat-card.due .val { color: #ef4444; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; color: #475569; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
          td { padding: 8px; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-info">
            <h1>${clinicName}</h1>
            <p>📧 ${email} | 📞 ${phone}</p>
            <p>🌐 ${website}</p>
          </div>
          <div class="report-title">
            <h2>Ledger Statement</h2>
            <p><strong>Date Generated:</strong> ${dateStr}</p>
          </div>
        </div>

        <div class="customer-section">
          <div class="box">
            <h3>Customer Details</h3>
            <p><strong>Patient Name:</strong> ${customerSummary.customerName}</p>
            <p><strong>Phone:</strong> ${customerSummary.phone}</p>
          </div>
          <div class="box">
            <h3>Ledger Summary</h3>
            <p><strong>Total Orders:</strong> ${customerSummary.totalOrders}</p>
            <p><strong>Last Payment Date:</strong> ${lastPaymentDateStr}</p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Total Billed</div>
            <div class="val">₹${totalPurchase.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-card">
            <div class="label">Total Paid</div>
            <div class="val">₹${totalPaid.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-card due">
            <div class="label">Current Due</div>
            <div class="val">₹${totalDue.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-card">
            <div class="label">Avg Purchase</div>
            <div class="val">₹${Math.round(customerSummary.averagePurchase || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Transaction Type</th>
              <th>Description</th>
              <th>Ref #</th>
              <th style="text-align: right;">Debit</th>
              <th style="text-align: right;">Credit</th>
              <th style="text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows}
          </tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated ledger statement for ${customerSummary.customerName}.</p>
          <p>Thank you for your business! OptiFlow SaaS platform.</p>
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      return uri;
    } catch (err) {
      console.error('Error generating Ledger PDF:', err);
      throw new Error('Ledger PDF Generation Failed');
    }
  }

  /**
   * Opens native system sharing interface.
   * Converts PDF to image first to allow sharing as an image on messengers like WhatsApp,
   * with a fallback to raw PDF sharing.
   */
  static async shareFile(uri: string, filename: string) {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Toast.show({
          type: 'error',
          text1: 'Sharing Unavailable',
          text2: 'This device does not support native file sharing.',
        });
        return;
      }

      try {
        console.log('Attempting to convert PDF to image for sharing:', uri);
        const imagePaths = await ExpoPdfToImage.convertPdfToImages(uri);
        if (imagePaths && imagePaths.length > 0) {
          const imageUri = imagePaths[0];
          console.log('Successfully converted PDF to image for sharing:', imageUri);
          await Sharing.shareAsync(imageUri, {
            dialogTitle: `Share ${filename.replace('.pdf', '')}`,
            mimeType: 'image/jpeg',
            UTI: 'public.jpeg',
          });
          return;
        }
      } catch (conversionError) {
        console.warn('PDF to Image conversion failed, falling back to PDF sharing:', conversionError);
      }

      // Fallback: share raw PDF file
      await Sharing.shareAsync(uri, {
        dialogTitle: `Share ${filename}`,
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Error sharing file:', error);
      Toast.show({ type: 'error', text1: 'Sharing Failed', text2: 'Could not open share dialogue.' });
    }
  }
}
