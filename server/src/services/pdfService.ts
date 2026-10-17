import PDFDocument from 'pdfkit';
import { formatINRBackend, numberToIndianWordsBackend } from '../utils/currencyUtils.js';

interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  status: string;
  isInterState: boolean;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  notes?: string | null;
  terms?: string | null;
  customer: {
    name: string;
    gstin?: string | null;
    pan?: string | null;
    phone?: string | null;
    email?: string | null;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingPostalCode: string;
    shippingAddress?: string | null;
    shippingCity?: string | null;
    shippingState?: string | null;
    shippingPostalCode?: string | null;
  };
  tenant: {
    name: string;
    legalName?: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    gstin: string;
    pan?: string | null;
    email: string;
    phone: string;
    website?: string | null;
    settings?: {
      bankName?: string | null;
      bankAccountNumber?: string | null;
      bankIfsc?: string | null;
      bankBranch?: string | null;
      upiId?: string | null;
      termsAndConditions?: string | null;
      notes?: string | null;
      authorizedSignatory?: string | null;
    } | null;
  };
  lineItems: Array<{
    description: string;
    hsnSacCode: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxableAmount: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>;
}

export class PdfService {
  /**
   * Generates a professional, vector Indian Tax Invoice PDF buffer.
   * Uses historical saved values from the invoice record without recalculation.
   */
  static async generateInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 36, bottom: 42, left: 36, right: 36 },
          bufferPages: true,
          info: {
            Title: `Tax Invoice - ${invoice.invoiceNumber}`,
            Author: invoice.tenant.legalName || invoice.tenant.name || 'Klanvision Technologies',
            Subject: `Invoice ${invoice.invoiceNumber}`,
            Keywords: 'Tax Invoice, GST, Klanvision',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const marginLeft = 36;
        const contentWidth = pageWidth - marginLeft * 2; // 523.28 pt

        const formatDateStr = (date: Date | string | undefined): string => {
          if (!date) return '';
          const d = new Date(date);
          return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        };

        // Brand colors
        const navyDark = '#0c1938';
        const slateText = '#334155';
        const slateMuted = '#64748b';
        const borderLight = '#e2e8f0';
        const bgLight = '#f8fafc';
        const primaryBlue = '#2563eb';

        // -------------------------------------------------------------
        // HEADER SECTION
        // -------------------------------------------------------------
        doc.save();

        // Left: Company Branding
        doc.fillColor(navyDark).fontSize(16).font('Helvetica-Bold');
        doc.text(invoice.tenant.legalName || invoice.tenant.name, marginLeft, 36);

        doc.fillColor(slateMuted).fontSize(8.5).font('Helvetica');
        let headerY = 56;
        doc.text(invoice.tenant.address, marginLeft, headerY);
        headerY += 11;
        doc.text(
          `${invoice.tenant.city}, ${invoice.tenant.state} - ${invoice.tenant.postalCode}, India`,
          marginLeft,
          headerY
        );
        headerY += 11;
        doc.fillColor(slateText).font('Helvetica-Bold');
        doc.text(`GSTIN: `, marginLeft, headerY, { continued: true });
        doc.font('Helvetica').text(invoice.tenant.gstin || 'N/A');
        if (invoice.tenant.pan) {
          headerY += 11;
          doc.font('Helvetica-Bold').text(`PAN: `, marginLeft, headerY, { continued: true });
          doc.font('Helvetica').text(invoice.tenant.pan);
        }
        headerY += 11;
        doc.font('Helvetica').text(
          `Email: ${invoice.tenant.email} | Phone: ${invoice.tenant.phone}`,
          marginLeft,
          headerY
        );

        // Right: TAX INVOICE Badge & Metadata
        const rightColX = 350;
        const badgeY = 36;
        doc.rect(rightColX + 50, badgeY, 123.28, 22).fill(navyDark);
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        doc.text('TAX INVOICE', rightColX + 50, badgeY + 6, {
          width: 123.28,
          align: 'center',
        });

        let metaY = badgeY + 30;
        const drawMetaRow = (label: string, value: string, boldVal = true) => {
          doc.fontSize(8.5).fillColor(slateMuted).font('Helvetica');
          doc.text(label, rightColX, metaY, { width: 90, align: 'right' });
          doc.fillColor(slateText).font(boldVal ? 'Helvetica-Bold' : 'Helvetica');
          doc.text(value, rightColX + 96, metaY, { width: 77.28, align: 'right' });
          metaY += 12;
        };

        drawMetaRow('Invoice No:', invoice.invoiceNumber);
        drawMetaRow('Invoice Date:', formatDateStr(invoice.issueDate));
        drawMetaRow('Due Date:', formatDateStr(invoice.dueDate));
        drawMetaRow('Place of Supply:', invoice.customer.billingState || invoice.tenant.state);
        drawMetaRow(
          'Supply Type:',
          invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
          false
        );
        drawMetaRow('Status:', invoice.status);

        doc.restore();

        // Divider
        let currentY = Math.max(headerY + 16, metaY + 10);
        doc.strokeColor(navyDark).lineWidth(1.5).moveTo(marginLeft, currentY).lineTo(marginLeft + contentWidth, currentY).stroke();
        currentY += 10;

        // -------------------------------------------------------------
        // BILL TO & SHIP TO SECTION
        // -------------------------------------------------------------
        const colWidth = (contentWidth - 16) / 2;
        const col1X = marginLeft;
        const col2X = marginLeft + colWidth + 16;

        // Billed To Box
        doc.rect(col1X, currentY, colWidth, 90).fillAndStroke(bgLight, borderLight);
        doc.fillColor(primaryBlue).fontSize(8).font('Helvetica-Bold');
        doc.text('BILLED TO (BUYER):', col1X + 10, currentY + 8);

        doc.fillColor(navyDark).fontSize(9.5).font('Helvetica-Bold');
        doc.text(invoice.customer.name, col1X + 10, currentY + 22, { width: colWidth - 20, ellipsis: true });

        doc.fillColor(slateText).fontSize(8).font('Helvetica');
        let bY = currentY + 35;
        doc.text(invoice.customer.billingAddress, col1X + 10, bY, { width: colWidth - 20, lineBreak: false, ellipsis: true });
        bY += 10;
        doc.text(
          `${invoice.customer.billingCity}, ${invoice.customer.billingState} - ${invoice.customer.billingPostalCode}`,
          col1X + 10,
          bY
        );
        bY += 11;
        doc.font('Helvetica-Bold').text(`GSTIN: `, col1X + 10, bY, { continued: true });
        doc.font('Helvetica').text(invoice.customer.gstin || 'Unregistered / B2C');
        bY += 10;
        doc.text(`Phone: ${invoice.customer.phone || 'N/A'} | Email: ${invoice.customer.email || 'N/A'}`, col1X + 10, bY, { width: colWidth - 20, lineBreak: false, ellipsis: true });

        // Shipped To Box
        doc.rect(col2X, currentY, colWidth, 90).fillAndStroke(bgLight, borderLight);
        doc.fillColor(primaryBlue).fontSize(8).font('Helvetica-Bold');
        doc.text('SHIPPED TO (CONSIGNEE):', col2X + 10, currentY + 8);

        doc.fillColor(navyDark).fontSize(9.5).font('Helvetica-Bold');
        doc.text(invoice.customer.name, col2X + 10, currentY + 22, { width: colWidth - 20, ellipsis: true });

        doc.fillColor(slateText).fontSize(8).font('Helvetica');
        let sY = currentY + 35;
        const shipAddress = invoice.customer.shippingAddress || invoice.customer.billingAddress;
        const shipCity = invoice.customer.shippingCity || invoice.customer.billingCity;
        const shipState = invoice.customer.shippingState || invoice.customer.billingState;
        const shipZip = invoice.customer.shippingPostalCode || invoice.customer.billingPostalCode;

        doc.text(shipAddress, col2X + 10, sY, { width: colWidth - 20, lineBreak: false, ellipsis: true });
        sY += 10;
        doc.text(`${shipCity}, ${shipState} - ${shipZip}`, col2X + 10, sY);
        sY += 11;
        doc.font('Helvetica-Bold').text(`State Code: `, col2X + 10, sY, { continued: true });
        doc.font('Helvetica').text(shipState);
        sY += 10;
        doc.text(
          invoice.customer.shippingAddress ? 'Delivery Address Specified' : 'Same as Billed Address',
          col2X + 10,
          sY
        );

        currentY += 100;

        // -------------------------------------------------------------
        // ITEM TABLE DEFINITIONS
        // -------------------------------------------------------------
        // Columns setup:
        // S.No: 20
        // Description: 175
        // HSN/SAC: 45
        // Qty: 28
        // Unit Rate: 50
        // Disc%: 32
        // Taxable: 55
        // GST%: 35
        // Total: 83.28
        // Total: 523.28
        const tableCols = [
          { key: 'sno', label: '#', x: marginLeft, width: 20, align: 'center' as const },
          { key: 'desc', label: 'Item & Description', x: marginLeft + 20, width: 175, align: 'left' as const },
          { key: 'hsn', label: 'HSN/SAC', x: marginLeft + 195, width: 45, align: 'center' as const },
          { key: 'qty', label: 'Qty', x: marginLeft + 240, width: 28, align: 'center' as const },
          { key: 'rate', label: 'Rate (INR)', x: marginLeft + 268, width: 50, align: 'right' as const },
          { key: 'disc', label: 'Disc %', x: marginLeft + 318, width: 32, align: 'center' as const },
          { key: 'taxable', label: 'Taxable', x: marginLeft + 350, width: 55, align: 'right' as const },
          { key: 'gst', label: 'GST %', x: marginLeft + 405, width: 35, align: 'center' as const },
          { key: 'amount', label: 'Amount (INR)', x: marginLeft + 440, width: 83.28, align: 'right' as const },
        ];

        const drawTableHeader = (y: number) => {
          doc.rect(marginLeft, y, contentWidth, 20).fill(navyDark);
          doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
          for (const col of tableCols) {
            doc.text(col.label, col.x + 2, y + 6, {
              width: col.width - 4,
              align: col.align,
            });
          }
          return y + 20;
        };

        currentY = drawTableHeader(currentY);

        // Render Rows with Multi-Page Break Handling
        let isAlt = false;
        const pageBottomMargin = pageHeight - 50;

        for (let i = 0; i < invoice.lineItems.length; i++) {
          const item = invoice.lineItems[i];

          // Calculate height required for description text
          doc.fontSize(8).font('Helvetica');
          const descHeight = doc.heightOfString(item.description, { width: 171 });
          const rowHeight = Math.max(22, descHeight + 10);

          // Page break check
          if (currentY + rowHeight > pageBottomMargin) {
            doc.addPage();
            currentY = drawTableHeader(36);
          }

          // Row background
          if (isAlt) {
            doc.rect(marginLeft, currentY, contentWidth, rowHeight).fill('#f1f5f9');
          }
          doc.strokeColor(borderLight).lineWidth(0.5).rect(marginLeft, currentY, contentWidth, rowHeight).stroke();

          // S.No
          doc.fillColor(slateMuted).fontSize(7.5).font('Helvetica');
          doc.text((i + 1).toString(), tableCols[0].x, currentY + 6, { width: tableCols[0].width, align: 'center' });

          // Description (with wrapping)
          doc.fillColor(navyDark).fontSize(8).font('Helvetica-Bold');
          doc.text(item.description, tableCols[1].x + 2, currentY + 6, { width: tableCols[1].width - 4 });

          // HSN
          doc.fillColor(slateText).fontSize(7.5).font('Helvetica');
          doc.text(item.hsnSacCode || '-', tableCols[2].x, currentY + 6, { width: tableCols[2].width, align: 'center' });

          // Qty
          doc.text(item.quantity.toString(), tableCols[3].x, currentY + 6, { width: tableCols[3].width, align: 'center' });

          // Unit Rate
          doc.text(formatINRBackend(item.unitPrice), tableCols[4].x, currentY + 6, { width: tableCols[4].width - 2, align: 'right' });

          // Discount %
          doc.text(item.discountPercent ? `${item.discountPercent}%` : '-', tableCols[5].x, currentY + 6, { width: tableCols[5].width, align: 'center' });

          // Taxable Amount
          doc.text(formatINRBackend(item.taxableAmount), tableCols[6].x, currentY + 6, { width: tableCols[6].width - 2, align: 'right' });

          // GST %
          doc.fillColor(primaryBlue).font('Helvetica-Bold');
          doc.text(`${item.gstRate}%`, tableCols[7].x, currentY + 6, { width: tableCols[7].width, align: 'center' });

          // Total Amount
          doc.fillColor(navyDark).font('Helvetica-Bold');
          doc.text(formatINRBackend(item.totalAmount), tableCols[8].x, currentY + 6, { width: tableCols[8].width - 4, align: 'right' });

          currentY += rowHeight;
          isAlt = !isAlt;
        }

        currentY += 10;

        // -------------------------------------------------------------
        // TAX SUMMARY BREAKDOWN TABLE (GST SLABS)
        // -------------------------------------------------------------
        // Group line items by GST rate
        const rateGroups: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};
        for (const it of invoice.lineItems) {
          const r = it.gstRate;
          if (!rateGroups[r]) {
            rateGroups[r] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
          }
          rateGroups[r].taxable += it.taxableAmount;
          rateGroups[r].cgst += it.cgstAmount;
          rateGroups[r].sgst += it.sgstAmount;
          rateGroups[r].igst += it.igstAmount;
          rateGroups[r].totalTax += it.cgstAmount + it.sgstAmount + it.igstAmount;
        }

        const taxTableNeededHeight = 35 + Object.keys(rateGroups).length * 15;
        if (currentY + taxTableNeededHeight + 160 > pageBottomMargin) {
          doc.addPage();
          currentY = 36;
        }

        // Section Title: Tax Calculation
        doc.fillColor(navyDark).fontSize(8.5).font('Helvetica-Bold');
        doc.text('TAX SUMMARY (GST BREAKDOWN)', marginLeft, currentY);
        currentY += 12;

        const taxColWidth = contentWidth / 6;
        doc.rect(marginLeft, currentY, contentWidth, 16).fill(bgLight);
        doc.strokeColor(borderLight).lineWidth(0.5).rect(marginLeft, currentY, contentWidth, 16).stroke();
        doc.fillColor(slateMuted).fontSize(7).font('Helvetica-Bold');
        doc.text('Rate Slab', marginLeft + 4, currentY + 4, { width: taxColWidth - 8, align: 'left' });
        doc.text('Taxable Value', marginLeft + taxColWidth, currentY + 4, { width: taxColWidth - 4, align: 'right' });
        doc.text('CGST', marginLeft + taxColWidth * 2, currentY + 4, { width: taxColWidth - 4, align: 'right' });
        doc.text('SGST', marginLeft + taxColWidth * 3, currentY + 4, { width: taxColWidth - 4, align: 'right' });
        doc.text('IGST', marginLeft + taxColWidth * 4, currentY + 4, { width: taxColWidth - 4, align: 'right' });
        doc.text('Total Tax', marginLeft + taxColWidth * 5, currentY + 4, { width: taxColWidth - 4, align: 'right' });
        currentY += 16;

        for (const [rateStr, group] of Object.entries(rateGroups)) {
          doc.strokeColor(borderLight).lineWidth(0.5).rect(marginLeft, currentY, contentWidth, 14).stroke();
          doc.fillColor(slateText).fontSize(7.5).font('Helvetica');
          doc.text(`GST @ ${rateStr}%`, marginLeft + 4, currentY + 3, { width: taxColWidth - 8 });
          doc.text(formatINRBackend(group.taxable), marginLeft + taxColWidth, currentY + 3, { width: taxColWidth - 4, align: 'right' });
          doc.text(formatINRBackend(group.cgst), marginLeft + taxColWidth * 2, currentY + 3, { width: taxColWidth - 4, align: 'right' });
          doc.text(formatINRBackend(group.sgst), marginLeft + taxColWidth * 3, currentY + 3, { width: taxColWidth - 4, align: 'right' });
          doc.text(formatINRBackend(group.igst), marginLeft + taxColWidth * 4, currentY + 3, { width: taxColWidth - 4, align: 'right' });
          doc.text(formatINRBackend(group.totalTax), marginLeft + taxColWidth * 5, currentY + 3, { width: taxColWidth - 4, align: 'right' });
          currentY += 14;
        }

        currentY += 14;

        // -------------------------------------------------------------
        // BOTTOM SUMMARY: BANK DETAILS (LEFT) & TOTALS (RIGHT)
        // -------------------------------------------------------------
        const bottomSectionHeight = 175;
        if (currentY + bottomSectionHeight > pageBottomMargin) {
          doc.addPage();
          currentY = 36;
        }

        const leftWidth = 280;
        const rightWidth = contentWidth - leftWidth - 16;
        const rightColStartX = marginLeft + leftWidth + 16;

        // LEFT: Bank Details & Terms Box
        const bankSettings = invoice.tenant.settings || {};
        doc.rect(marginLeft, currentY, leftWidth, 90).fillAndStroke(bgLight, borderLight);
        doc.fillColor(primaryBlue).fontSize(8).font('Helvetica-Bold');
        doc.text('BANK & PAYMENT DETAILS', marginLeft + 10, currentY + 8);

        doc.fillColor(slateText).fontSize(7.5).font('Helvetica');
        let bankY = currentY + 22;
        doc.font('Helvetica-Bold').text(`Bank Name: `, marginLeft + 10, bankY, { continued: true });
        doc.font('Helvetica').text(bankSettings.bankName || 'HDFC Bank');
        bankY += 11;
        doc.font('Helvetica-Bold').text(`Account Name: `, marginLeft + 10, bankY, { continued: true });
        doc.font('Helvetica').text(invoice.tenant.legalName || invoice.tenant.name);
        bankY += 11;
        doc.font('Helvetica-Bold').text(`Account Number: `, marginLeft + 10, bankY, { continued: true });
        doc.font('Helvetica').text(bankSettings.bankAccountNumber || '50200012345678');
        bankY += 11;
        doc.font('Helvetica-Bold').text(`IFSC Code: `, marginLeft + 10, bankY, { continued: true });
        doc.font('Helvetica').text(bankSettings.bankIfsc || 'HDFC0001234');
        bankY += 11;
        doc.font('Helvetica-Bold').text(`Branch: `, marginLeft + 10, bankY, { continued: true });
        doc.font('Helvetica').text(bankSettings.bankBranch || 'Dwarka Sector 11, New Delhi');
        bankY += 11;
        doc.font('Helvetica-Bold').text(`UPI ID: `, marginLeft + 10, bankY, { continued: true });
        doc.font('Helvetica').fillColor(primaryBlue).text(bankSettings.upiId || 'klanvision@upi');

        // Customer Notes & Terms below Bank Box
        let notesY = currentY + 98;
        if (invoice.notes) {
          doc.fillColor(navyDark).fontSize(7.5).font('Helvetica-Bold');
          doc.text('Notes / Instructions:', marginLeft, notesY);
          notesY += 9;
          doc.fillColor(slateMuted).fontSize(7).font('Helvetica');
          doc.text(invoice.notes, marginLeft, notesY, { width: leftWidth, lineBreak: true });
          notesY += doc.heightOfString(invoice.notes, { width: leftWidth }) + 6;
        }

        const termsText = invoice.terms || bankSettings.termsAndConditions || 'Payment due within terms. Goods once sold will not be returned.';
        doc.fillColor(navyDark).fontSize(7.5).font('Helvetica-Bold');
        doc.text('Terms & Conditions:', marginLeft, notesY);
        notesY += 9;
        doc.fillColor(slateMuted).fontSize(7).font('Helvetica');
        doc.text(termsText, marginLeft, notesY, { width: leftWidth, lineBreak: true });

        // RIGHT: Financial Summary
        let totY = currentY;
        const drawSummaryRow = (label: string, amount: number, isMinus = false) => {
          doc.fillColor(slateMuted).fontSize(8).font('Helvetica');
          doc.text(label, rightColStartX, totY, { width: 110, align: 'left' });
          doc.fillColor(slateText).font('Helvetica-Bold');
          const prefix = isMinus ? '- ' : '';
          doc.text(`${prefix}INR ${formatINRBackend(amount)}`, rightColStartX + 110, totY, {
            width: rightWidth - 110,
            align: 'right',
          });
          totY += 13;
        };

        drawSummaryRow('Subtotal (Gross):', invoice.subtotal);
        if (invoice.discountTotal > 0) {
          drawSummaryRow('Total Discount:', invoice.discountTotal, true);
        }
        drawSummaryRow('Taxable Value:', invoice.taxableAmount);

        if (invoice.isInterState) {
          drawSummaryRow('Integrated GST (IGST):', invoice.igstTotal);
        } else {
          drawSummaryRow('Central GST (CGST):', invoice.cgstTotal);
          drawSummaryRow('State GST (SGST):', invoice.sgstTotal);
        }

        if (invoice.roundOff !== 0) {
          doc.fillColor(slateMuted).fontSize(8).font('Helvetica');
          doc.text('Round Off:', rightColStartX, totY, { width: 110, align: 'left' });
          doc.fillColor(slateText).font('Helvetica');
          const roStr = invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2);
          doc.text(roStr, rightColStartX + 110, totY, { width: rightWidth - 110, align: 'right' });
          totY += 13;
        }

        // Net Payable Grand Total Box
        doc.rect(rightColStartX, totY, rightWidth, 24).fill(navyDark);
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('TOTAL AMOUNT:', rightColStartX + 8, totY + 7);
        doc.text(`INR ${formatINRBackend(invoice.totalAmount)}`, rightColStartX + 100, totY + 7, {
          width: rightWidth - 108,
          align: 'right',
        });
        totY += 30;

        // Amount in Words
        doc.fillColor(slateMuted).fontSize(7.5).font('Helvetica-Bold');
        doc.text('Amount in Words:', rightColStartX, totY);
        totY += 10;
        doc.fillColor(navyDark).fontSize(7.5).font('Helvetica');
        const words = numberToIndianWordsBackend(invoice.totalAmount);
        doc.text(words, rightColStartX, totY, { width: rightWidth });
        totY += doc.heightOfString(words, { width: rightWidth }) + 8;

        // Payment status breakdown
        doc.fillColor(slateMuted).fontSize(7.5).font('Helvetica');
        doc.text('Amount Paid:', rightColStartX, totY);
        doc.fillColor('#059669').font('Helvetica-Bold').text(`INR ${formatINRBackend(invoice.paidAmount)}`, rightColStartX + 80, totY, { width: rightWidth - 80, align: 'right' });
        totY += 11;

        doc.fillColor(slateMuted).font('Helvetica').text('Balance Due:', rightColStartX, totY);
        doc.fillColor('#e11d48').font('Helvetica-Bold').text(`INR ${formatINRBackend(invoice.outstandingAmount)}`, rightColStartX + 80, totY, { width: rightWidth - 80, align: 'right' });
        totY += 18;

        // Signature Block
        doc.strokeColor(borderLight).lineWidth(1).moveTo(rightColStartX + 20, totY + 22).lineTo(rightColStartX + rightWidth - 20, totY + 22).stroke();
        doc.fillColor(navyDark).fontSize(7.5).font('Helvetica-Bold');
        doc.text(`For ${invoice.tenant.legalName || invoice.tenant.name}`, rightColStartX, totY + 26, {
          width: rightWidth,
          align: 'center',
        });
        doc.fillColor(slateMuted).fontSize(6.5).font('Helvetica');
        doc.text(bankSettings.authorizedSignatory || 'Authorized Signatory', rightColStartX, totY + 36, {
          width: rightWidth,
          align: 'center',
        });

        // -------------------------------------------------------------
        // RUNNING FOOTERS & PAGE NUMBERS (ACROSS ALL PAGES)
        // -------------------------------------------------------------
        const pages = doc.bufferedPageRange();
        for (let p = pages.start; p < pages.start + pages.count; p++) {
          doc.switchToPage(p);
          doc.strokeColor(borderLight).lineWidth(0.5).moveTo(marginLeft, pageHeight - 32).lineTo(marginLeft + contentWidth, pageHeight - 32).stroke();
          doc.fillColor(slateMuted).fontSize(7).font('Helvetica');
          doc.text(
            'This is a computer-generated tax invoice and requires no physical seal.',
            marginLeft,
            pageHeight - 25,
            { width: 350, align: 'left' }
          );
          doc.text(
            `Page ${p + 1} of ${pages.count}`,
            marginLeft + contentWidth - 100,
            pageHeight - 25,
            { width: 100, align: 'right' }
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generates a professional, vector Payment Receipt PDF buffer.
   */
  static async generateReceiptPdf(payment: {
    paymentNumber: string;
    paymentDate: Date | string;
    amount: number;
    paymentMethod: string;
    transactionReference?: string | null;
    notes?: string | null;
    status: string;
    customer: {
      name: string;
      gstin?: string | null;
      pan?: string | null;
      billingAddress?: string | null;
      billingCity?: string | null;
      billingState?: string | null;
      billingPostalCode?: string | null;
    };
    tenant: {
      name: string;
      legalName?: string | null;
      address: string;
      city: string;
      state: string;
      postalCode: string;
      gstin: string;
      email: string;
      phone: string;
      settings?: {
        bankName?: string | null;
        authorizedSignatory?: string | null;
      } | null;
    };
    allocations?: Array<{
      amount: number;
      invoice?: {
        invoiceNumber: string;
        issueDate: Date | string;
        totalAmount: number;
        outstandingAmount: number;
      } | null;
    }>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 36, bottom: 42, left: 36, right: 36 },
          info: {
            Title: `Payment Receipt - ${payment.paymentNumber}`,
            Author: payment.tenant.legalName || payment.tenant.name,
            Subject: `Receipt ${payment.paymentNumber}`,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const pageWidth = 595.28;
        const marginLeft = 36;
        const contentWidth = pageWidth - marginLeft * 2;

        const navyDark = '#0c1938';
        const slateText = '#334155';
        const slateMuted = '#64748b';
        const borderLight = '#e2e8f0';
        const bgLight = '#f8fafc';
        const primaryBlue = '#2563eb';
        const emerald = '#059669';

        const formatDateStr = (date: Date | string | undefined): string => {
          if (!date) return '';
          return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        };

        // Header: Company Profile
        doc.fillColor(navyDark).fontSize(16).font('Helvetica-Bold');
        doc.text(payment.tenant.legalName || payment.tenant.name, marginLeft, 36);

        doc.fillColor(slateMuted).fontSize(8.5).font('Helvetica');
        let headerY = 56;
        doc.text(payment.tenant.address, marginLeft, headerY);
        headerY += 11;
        doc.text(
          `${payment.tenant.city}, ${payment.tenant.state} - ${payment.tenant.postalCode}, India`,
          marginLeft,
          headerY
        );
        headerY += 11;
        doc.fillColor(slateText).font('Helvetica-Bold').text(`GSTIN: `, marginLeft, headerY, { continued: true });
        doc.font('Helvetica').text(payment.tenant.gstin || 'N/A');
        headerY += 11;
        doc.font('Helvetica').text(`Email: ${payment.tenant.email} | Phone: ${payment.tenant.phone}`, marginLeft, headerY);

        // Header: Receipt Badge & Details
        const rightColX = 350;
        const badgeY = 36;
        doc.rect(rightColX + 40, badgeY, 133.28, 22).fill(emerald);
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        doc.text('PAYMENT RECEIPT', rightColX + 40, badgeY + 6, {
          width: 133.28,
          align: 'center',
        });

        let metaY = badgeY + 30;
        const drawMetaRow = (label: string, value: string) => {
          doc.fontSize(8.5).fillColor(slateMuted).font('Helvetica');
          doc.text(label, rightColX, metaY, { width: 90, align: 'right' });
          doc.fillColor(slateText).font('Helvetica-Bold');
          doc.text(value, rightColX + 96, metaY, { width: 77.28, align: 'right' });
          metaY += 12;
        };

        drawMetaRow('Receipt No:', payment.paymentNumber);
        drawMetaRow('Receipt Date:', formatDateStr(payment.paymentDate));
        drawMetaRow('Payment Mode:', payment.paymentMethod.replace(/_/g, ' '));
        if (payment.transactionReference) {
          drawMetaRow('Ref / UTR #:', payment.transactionReference);
        }
        drawMetaRow('Status:', payment.status);

        // Divider
        let currentY = Math.max(headerY + 16, metaY + 10);
        doc.strokeColor(navyDark).lineWidth(1.5).moveTo(marginLeft, currentY).lineTo(marginLeft + contentWidth, currentY).stroke();
        currentY += 14;

        // Received From Box
        doc.rect(marginLeft, currentY, contentWidth, 75).fillAndStroke(bgLight, borderLight);
        doc.fillColor(primaryBlue).fontSize(8).font('Helvetica-Bold');
        doc.text('RECEIVED WITH THANKS FROM (PAYER):', marginLeft + 12, currentY + 10);

        doc.fillColor(navyDark).fontSize(10).font('Helvetica-Bold');
        doc.text(payment.customer.name, marginLeft + 12, currentY + 24);

        doc.fillColor(slateText).fontSize(8).font('Helvetica');
        let custY = currentY + 38;
        if (payment.customer.billingAddress) {
          doc.text(`${payment.customer.billingAddress}, ${payment.customer.billingCity || ''} ${payment.customer.billingState || ''} ${payment.customer.billingPostalCode || ''}`, marginLeft + 12, custY);
          custY += 11;
        }
        if (payment.customer.gstin) {
          doc.font('Helvetica-Bold').text(`GSTIN: `, marginLeft + 12, custY, { continued: true });
          doc.font('Helvetica').text(payment.customer.gstin);
        }

        currentY += 88;

        // Amount Box (Large Highlight)
        doc.rect(marginLeft, currentY, contentWidth, 48).fillAndStroke('#ecfdf5', '#a7f3d0');
        doc.fillColor(emerald).fontSize(9).font('Helvetica-Bold');
        doc.text('AMOUNT RECEIVED', marginLeft + 14, currentY + 9);

        doc.fillColor(navyDark).fontSize(18).font('Helvetica-Bold');
        doc.text(`INR ${formatINRBackend(payment.amount)}`, marginLeft + 14, currentY + 22);

        // Amount in Words
        doc.fillColor(slateMuted).fontSize(8).font('Helvetica-Bold');
        doc.text('In Words:', marginLeft + 230, currentY + 12);
        doc.fillColor(navyDark).fontSize(8).font('Helvetica');
        const words = numberToIndianWordsBackend(payment.amount);
        doc.text(words, marginLeft + 230, currentY + 24, { width: contentWidth - 240 });

        currentY += 60;

        // Allocations Table
        if (payment.allocations && payment.allocations.length > 0) {
          doc.fillColor(navyDark).fontSize(9).font('Helvetica-Bold');
          doc.text('SETTLEMENT / INVOICE ALLOCATION BREAKDOWN', marginLeft, currentY);
          currentY += 12;

          const allocCols = [
            { label: '#', x: marginLeft, width: 25, align: 'center' as const },
            { label: 'Invoice Number', x: marginLeft + 25, width: 140, align: 'left' as const },
            { label: 'Invoice Date', x: marginLeft + 165, width: 85, align: 'center' as const },
            { label: 'Invoice Total', x: marginLeft + 250, width: 90, align: 'right' as const },
            { label: 'Amount Allocated', x: marginLeft + 340, width: 95, align: 'right' as const },
            { label: 'Balance Due', x: marginLeft + 435, width: 88.28, align: 'right' as const },
          ];

          doc.rect(marginLeft, currentY, contentWidth, 18).fill(navyDark);
          doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
          for (const col of allocCols) {
            doc.text(col.label, col.x + 2, currentY + 5, { width: col.width - 4, align: col.align });
          }
          currentY += 18;

          payment.allocations.forEach((alloc, idx) => {
            const inv = alloc.invoice;
            const rowHeight = 18;
            if (idx % 2 === 1) {
              doc.rect(marginLeft, currentY, contentWidth, rowHeight).fill('#f1f5f9');
            }
            doc.strokeColor(borderLight).lineWidth(0.5).rect(marginLeft, currentY, contentWidth, rowHeight).stroke();

            doc.fillColor(slateMuted).fontSize(7.5).font('Helvetica');
            doc.text((idx + 1).toString(), allocCols[0].x, currentY + 5, { width: allocCols[0].width, align: 'center' });

            doc.fillColor(navyDark).font('Helvetica-Bold');
            doc.text(inv?.invoiceNumber || 'Direct Account Settlement', allocCols[1].x + 4, currentY + 5, { width: allocCols[1].width - 8 });

            doc.fillColor(slateText).font('Helvetica');
            doc.text(inv?.issueDate ? formatDateStr(inv.issueDate) : '-', allocCols[2].x, currentY + 5, { width: allocCols[2].width, align: 'center' });
            doc.text(inv ? formatINRBackend(inv.totalAmount) : '-', allocCols[3].x, currentY + 5, { width: allocCols[3].width - 4, align: 'right' });

            doc.fillColor(emerald).font('Helvetica-Bold');
            doc.text(formatINRBackend(alloc.amount), allocCols[4].x, currentY + 5, { width: allocCols[4].width - 4, align: 'right' });

            doc.fillColor(navyDark).font('Helvetica');
            doc.text(inv ? formatINRBackend(inv.outstandingAmount) : 'Settled', allocCols[5].x, currentY + 5, { width: allocCols[5].width - 4, align: 'right' });

            currentY += rowHeight;
          });

          currentY += 14;
        }

        // Notes and Remarks
        if (payment.notes) {
          doc.fillColor(navyDark).fontSize(8).font('Helvetica-Bold');
          doc.text('Notes / Remarks:', marginLeft, currentY);
          currentY += 10;
          doc.fillColor(slateText).fontSize(7.5).font('Helvetica');
          doc.text(payment.notes, marginLeft, currentY, { width: 340, lineBreak: true });
          currentY += 25;
        }

        // Signature Block & Signatory
        const sigY = 680;
        doc.strokeColor(borderLight).lineWidth(1).moveTo(marginLeft + contentWidth - 180, sigY).lineTo(marginLeft + contentWidth, sigY).stroke();
        doc.fillColor(navyDark).fontSize(8).font('Helvetica-Bold');
        doc.text(
          `For ${payment.tenant.legalName || payment.tenant.name}`,
          marginLeft + contentWidth - 180,
          sigY + 5,
          { width: 180, align: 'center' }
        );
        doc.fillColor(slateMuted).fontSize(7).font('Helvetica');
        doc.text(
          payment.tenant.settings?.authorizedSignatory || 'Authorized Signatory',
          marginLeft + contentWidth - 180,
          sigY + 16,
          { width: 180, align: 'center' }
        );

        // Footer
        doc.strokeColor(borderLight).lineWidth(0.5).moveTo(marginLeft, 780).lineTo(marginLeft + contentWidth, 780).stroke();
        doc.fillColor(slateMuted).fontSize(7).font('Helvetica');
        doc.text(
          'This is an official computer-generated receipt issued by Klanvision SaaS Billing.',
          marginLeft,
          786,
          { width: contentWidth, align: 'center' }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
