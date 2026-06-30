import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';

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
   * Opens native system sharing interface.
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
