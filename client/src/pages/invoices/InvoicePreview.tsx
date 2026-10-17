import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  Download,
  CreditCard,
  ArrowLeft,
  Share2,
  Check,
  Copy,
  Clock,
  ShieldCheck,
  QrCode,
  Building2,
  AlertCircle,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { formatINR, formatDate, numberToIndianWords } from '../../utils/currency.js';
import { KlanvisionLogo } from '../../components/branding/KlanvisionLogo.js';
import { KlanvisionOfficialInvoice, InvoiceDataModel } from '../../components/invoice/KlanvisionOfficialInvoice.js';

interface InvoicePreviewProps {
  isPublic?: boolean;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ isPublic = false }) => {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [templateStyle, setTemplateStyle] = useState<'official' | 'classic'>('official');

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{ shareToken: string; expiresAt: string } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isPublic && token) {
          const res = await api.getPublicInvoice(token);
          setInvoice(res);
        } else if (id) {
          const res = await api.getInvoiceById(id);
          setInvoice(res);
        }
      } catch (err: any) {
        console.error('Error loading invoice preview:', err);
        setError(err.message || 'Invoice could not be loaded or share link has expired');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [id, token, isPublic]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloading(true);

    try {
      if (isPublic && token) {
        await api.downloadPublicInvoicePdf(token, invoice.invoiceNumber);
      } else if (id) {
        await api.downloadInvoicePdf(id, invoice.invoiceNumber);
      }
    } catch (err) {
      console.error('Server PDF download error, triggering print fallback:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenShareModal = async () => {
    if (!id) return;
    setShareLoading(true);
    setShowShareModal(true);
    try {
      const res = await api.shareInvoice(id);
      setShareData(res);
    } catch (err: any) {
      console.error('Failed to generate share link:', err);
    } finally {
      setShareLoading(false);
    }
  };

  const shareUrl = shareData?.shareToken
    ? `${window.location.origin}/invoices/share/${shareData.shareToken}`
    : '';

  const handleCopyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading tax invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-100 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Invoice Unavailable</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || 'The requested invoice could not be found, was removed, or the share link has expired.'}
        </p>
        {!isPublic && (
          <button
            onClick={() => navigate('/invoices')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Back to Invoice List
          </button>
        )}
      </div>
    );
  }

  const tenant = invoice.tenant || {};
  const settings = tenant.settings || {};
  const customer = invoice.customer || {};
  const isInterState = invoice.isInterState;
  const isOverdue = invoice.status === 'OVERDUE';

  // Compute GST Rate groups for the Tax Summary
  const gstRateSummary: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};
  if (invoice.lineItems) {
    for (const item of invoice.lineItems) {
      const rate = item.gstRate || 0;
      if (!gstRateSummary[rate]) {
        gstRateSummary[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      }
      gstRateSummary[rate].taxable += item.taxableAmount || 0;
      gstRateSummary[rate].cgst += item.cgstAmount || 0;
      gstRateSummary[rate].sgst += item.sgstAmount || 0;
      gstRateSummary[rate].igst += item.igstAmount || 0;
      gstRateSummary[rate].totalTax += (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
    }
  }

  // Mapped object for Klanvision Official Invoice Template (matching screenshot)
  const officialInvoiceData: Partial<InvoiceDataModel> = {
    invoiceNumber: invoice.invoiceNumber || '004',
    invoiceDate: formatDate(invoice.issueDate),
    dueDate: formatDate(invoice.dueDate),
    billedBy: {
      name: tenant.legalName || tenant.name || 'Klanvision Technologies Pvt. Ltd.',
      address: tenant.address || '4A, Raghaveer Dham Society,',
      cityStateZip: `${tenant.city || 'Surat'}, ${tenant.state || 'Gujarat'}, India - ${tenant.postalCode || '395006'}`,
      phone: tenant.phone || '+91 98765 43210',
      email: tenant.email || 'info@klanvision.com',
      website: tenant.website || 'www.klanvision.com',
      gstin: tenant.gstin || '24ABCDE01234F2Z5',
      pan: tenant.pan || 'ABCED1234F',
    },
    billedTo: {
      name: customer.name || 'Wox Studio',
      address: customer.billingAddress || '305, 3rd Floor Orion mall, Bengaluru,',
      cityStateZip: `${customer.billingCity || 'Bengaluru'}, ${customer.billingState || 'Karnataka'}, India - ${customer.billingPostalCode || '560055'}`,
      gstin: customer.gstin || '29AGCED1234KZ26',
      pan: customer.pan || 'VOCCD1234K',
    },
    placeOfSupply: customer.billingState || tenant.state || 'Karnataka',
    countryOfSupply: 'India',
    lineItems: invoice.lineItems?.map((item: any, idx: number) => ({
      id: item.id || idx,
      description: item.description,
      hsn: item.hsnSacCode || '06',
      qty: item.quantity || 1,
      gstRate: `${item.gstRate || 9}%`,
      taxableAmount: item.taxableAmount || (item.unitPrice * (item.quantity || 1)),
      sgst: item.sgstAmount || ((item.taxableAmount || 0) * 0.09),
      cgst: item.cgstAmount || ((item.taxableAmount || 0) * 0.09),
      amount: item.totalAmount,
    })),
    financials: {
      subTotal: invoice.subtotal,
      discountAmount: invoice.discountTotal || 0,
      discountPercent: invoice.discountPercent || (invoice.discountTotal ? 10 : 0),
      taxableAmount: invoice.taxableAmount,
      cgst: invoice.cgstTotal,
      sgst: invoice.sgstTotal,
      total: invoice.totalAmount,
      inWords: numberToIndianWords(invoice.totalAmount),
    },
    bankDetails: {
      accountHolder: tenant.legalName || tenant.name || 'Klanvision',
      accountNumber: settings.bankAccountNumber || '123456789012345',
      ifsc: settings.bankIfsc || 'KLAN0001234',
      accountType: 'Savings',
      bankName: settings.bankName || 'HDFC Bank',
      upi: settings.upiId || 'klanvision@okhdfc',
    },
    terms: invoice.terms ? invoice.terms.split('\n') : undefined,
    notes: invoice.notes,
    authorizedSignatoryText: settings.authorizedSignatory || 'Authorized Signatory',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Public Share Notice Banner */}
      {isPublic && (
        <div className="no-print bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Secure Public View • Verified Tax Invoice from <strong>{tenant.legalName || tenant.name}</strong>
            </span>
          </div>
          {invoice.expiresAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Link expires on {formatDate(invoice.expiresAt)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Toolbar (hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {!isPublic ? (
          <button
            onClick={() => navigate('/invoices')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Invoice #{invoice.invoiceNumber}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          {!isPublic && (
            <>
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && invoice.status !== 'DRAFT' && (
                <button
                  onClick={() => navigate(`/payments?invoiceId=${invoice.id}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              )}

              <button
                onClick={handleOpenShareModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-all"
                title="Generate secure public share link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>
            </>
          )}

          {/* Template Style Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTemplateStyle('official')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                templateStyle === 'official'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Official Design (Screenshot)
            </button>
            <button
              type="button"
              onClick={() => setTemplateStyle('classic')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                templateStyle === 'classic'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Classic Sheet
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-70"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Preparing PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {templateStyle === 'official' ? (
        <div className="w-full flex justify-center">
          <KlanvisionOfficialInvoice
            data={officialInvoiceData}
            invoiceRef={invoiceRef}
          />
        </div>
      ) : (
        /* Main Tax Invoice Sheet */
        <div
          ref={invoiceRef}
          className="printable-area bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 text-slate-800 space-y-6"
        >
          {/* Header: Company Profile & Tax Invoice Details */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
            <div>
            <KlanvisionLogo variant="dark" size="lg" showTagline={true} />
            <div className="mt-4 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{tenant.legalName || tenant.name || 'Klanvision Technologies Pvt. Ltd.'}</p>
              <p>{tenant.address || 'A-1, 3rd Floor, Gokul Garden, Sector-11, Dwarka'}</p>
              <p>
                {tenant.city || 'New Delhi'}, {tenant.state || 'Delhi'} - {tenant.postalCode || '110075'}, India
              </p>
              <p className="pt-0.5">
                <strong className="text-slate-800">GSTIN:</strong>{' '}
                <span className="font-mono font-bold text-slate-900">{tenant.gstin || '07AAACC81234F1Z5'}</span>
                {tenant.pan && (
                  <>
                    {' '}| <strong className="text-slate-800">PAN:</strong>{' '}
                    <span className="font-mono font-bold text-slate-900">{tenant.pan}</span>
                  </>
                )}
              </p>
              <p>
                <strong>Email:</strong> {tenant.email || 'info@klanvision.com'} | <strong>Phone:</strong> {tenant.phone || '+91 98765 43210'}
              </p>
              {tenant.website && <p><strong>Web:</strong> {tenant.website}</p>}
            </div>
          </div>

          <div className="text-right sm:self-start space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#0c1938] text-white text-xs font-black tracking-widest uppercase rounded-lg shadow-sm">
              TAX INVOICE
            </div>
            <div className="space-y-1 text-xs">
              <p>
                <span className="text-slate-500">Invoice No:</span>{' '}
                <strong className="font-mono font-black text-slate-900 text-sm ml-1">{invoice.invoiceNumber}</strong>
              </p>
              <p>
                <span className="text-slate-500">Invoice Date:</span>{' '}
                <strong className="text-slate-900 ml-1">{formatDate(invoice.issueDate)}</strong>
              </p>
              <p>
                <span className="text-slate-500">Due Date:</span>{' '}
                <strong className={`ml-1 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                  {formatDate(invoice.dueDate)}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">Place of Supply:</span>{' '}
                <strong className="text-slate-900 ml-1">{customer.billingState || tenant.state}</strong>
              </p>
              <p>
                <span className="text-slate-500">Reverse Charge:</span>{' '}
                <strong className="text-slate-900 ml-1">No</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Bill To & Ship To 2-Column Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2 text-xs">
          {/* Bill To */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <h4 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Billed To (Buyer)
            </h4>
            <p className="font-bold text-slate-900 text-sm">{customer.name}</p>
            <p className="text-slate-600">{customer.billingAddress}</p>
            <p className="text-slate-600">
              {customer.billingCity}, {customer.billingState} - {customer.billingPostalCode}
            </p>
            <p className="pt-1">
              <strong>GSTIN:</strong>{' '}
              <span className="font-mono font-bold text-slate-900">{customer.gstin || 'Unregistered / B2C'}</span>
            </p>
            {customer.pan && (
              <p>
                <strong>PAN:</strong> <span className="font-mono font-bold text-slate-900">{customer.pan}</span>
              </p>
            )}
            <p className="text-slate-500 pt-0.5">
              Phone: {customer.phone || 'N/A'} | Email: {customer.email || 'N/A'}
            </p>
          </div>

          {/* Ship To & Status Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <h4 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">
              Shipped To (Consignee) & Status
            </h4>
            <p className="font-bold text-slate-900 text-sm">{customer.name}</p>
            <p className="text-slate-600">{customer.shippingAddress || customer.billingAddress}</p>
            <p className="text-slate-600">
              {customer.shippingCity || customer.billingCity}, {customer.shippingState || customer.billingState} -{' '}
              {customer.shippingPostalCode || customer.billingPostalCode}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : invoice.status === 'OVERDUE'
                    ? 'bg-rose-100 text-rose-800'
                    : invoice.status === 'PARTIALLY_PAID'
                    ? 'bg-amber-100 text-amber-800'
                    : invoice.status === 'CANCELLED'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {invoice.status}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {isInterState ? '• Inter-State (IGST)' : '• Intra-State (CGST + SGST)'}
              </span>
            </div>
            {invoice.outstandingAmount > 0 ? (
              <p className="text-rose-600 font-bold pt-1">
                Outstanding Balance: {formatINR(invoice.outstandingAmount)}
              </p>
            ) : (
              <p className="text-emerald-600 font-bold flex items-center gap-1 pt-1">
                <Check className="w-3.5 h-3.5" /> Fully Settled
              </p>
            )}
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="overflow-x-auto py-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0c1938] text-white font-bold">
                <th className="py-2.5 px-3 w-10 text-center rounded-l-lg">#</th>
                <th className="py-2.5 px-3">Item & Description</th>
                <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-center">Disc %</th>
                <th className="py-2.5 px-3 text-right">Taxable</th>
                <th className="py-2.5 px-3 text-center">GST %</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems?.map((item: any, idx: number) => (
                <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : ''}>
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{item.description}</p>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{item.hsnSacCode || '-'}</td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-800">{item.quantity}</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatINR(item.unitPrice)}</td>
                  <td className="py-3 px-3 text-center text-slate-600">
                    {item.discountPercent ? `${item.discountPercent}%` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-800">{formatINR(item.taxableAmount)}</td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600">{item.gstRate}%</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST Tax Summary Breakdown Table */}
        <div className="py-2 break-inside-avoid">
          <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
            GST Tax Breakdown
          </h4>
          <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-left">GST Rate Slab</th>
                <th className="py-2 px-3 text-right">Taxable Value</th>
                <th className="py-2 px-3 text-right">CGST</th>
                <th className="py-2 px-3 text-right">SGST</th>
                <th className="py-2 px-3 text-right">IGST</th>
                <th className="py-2 px-3 text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {Object.entries(gstRateSummary).map(([rate, group]) => (
                <tr key={rate}>
                  <td className="py-2 px-3 font-semibold text-slate-900">GST @ {rate}%</td>
                  <td className="py-2 px-3 text-right">{formatINR(group.taxable)}</td>
                  <td className="py-2 px-3 text-right">{formatINR(group.cgst)}</td>
                  <td className="py-2 px-3 text-right">{formatINR(group.sgst)}</td>
                  <td className="py-2 px-3 text-right">{formatINR(group.igst)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">{formatINR(group.totalTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Bank Details Section */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 pt-4 border-t-2 border-slate-900 break-inside-avoid">
          {/* Left Column: Bank Details, Terms & QR Code */}
          <div className="sm:col-span-7 space-y-4 text-xs">
            {/* Bank Details Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                  Bank & Payment Instructions
                </h4>
                {settings.upiId && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    <QrCode className="w-3 h-3" /> UPI Enabled
                  </span>
                )}
              </div>
              <p><strong>Bank:</strong> {settings.bankName || 'HDFC Bank'}</p>
              <p><strong>Account Name:</strong> {tenant.legalName || tenant.name || 'Klanvision Technologies Pvt. Ltd.'}</p>
              <p>
                <strong>Account Number:</strong>{' '}
                <span className="font-mono font-bold text-slate-900">{settings.bankAccountNumber || '50200012345678'}</span>
              </p>
              <p>
                <strong>IFSC Code:</strong>{' '}
                <span className="font-mono font-bold text-slate-900">{settings.bankIfsc || 'HDFC0001234'}</span>
              </p>
              <p><strong>Branch:</strong> {settings.bankBranch || 'Dwarka Sector 11, New Delhi'}</p>
              {settings.upiId && (
                <p className="pt-1">
                  <strong>UPI ID:</strong>{' '}
                  <span className="font-mono text-blue-600 font-bold">{settings.upiId}</span>
                </p>
              )}
            </div>

            {/* Customer Notes */}
            {invoice.notes && (
              <div className="text-[11px] space-y-1 text-slate-600">
                <p className="font-bold text-slate-800">Notes & Instructions:</p>
                <p className="whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">{invoice.notes}</p>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="text-[11px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">Terms & Conditions:</p>
              <p className="whitespace-pre-line text-slate-600">
                {invoice.terms ||
                  settings.termsAndConditions ||
                  '1. Payment due within 30 days of invoice date.\n2. Goods once sold will not be returned.\n3. Subject to local jurisdiction.'}
              </p>
            </div>
          </div>

          {/* Right Column: Financial Totals Breakdown */}
          <div className="sm:col-span-5 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Subtotal (Gross):</span>
              <span className="font-bold text-slate-900">{formatINR(invoice.subtotal)}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-bold">- {formatINR(invoice.discountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Taxable Value:</span>
              <span className="font-bold text-slate-900">{formatINR(invoice.taxableAmount)}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Integrated GST (IGST):</span>
                <span className="font-bold text-slate-900">{formatINR(invoice.igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Central GST (CGST):</span>
                  <span className="font-bold text-slate-900">{formatINR(invoice.cgstTotal)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">State GST (SGST):</span>
                  <span className="font-bold text-slate-900">{formatINR(invoice.sgstTotal)}</span>
                </div>
              </>
            )}

            {invoice.roundOff !== 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500">
                <span>Round Off:</span>
                <span className="font-mono">{invoice.roundOff >= 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="flex justify-between items-center py-2.5 border-t-2 border-slate-900 bg-slate-50 px-3 rounded-xl mt-2">
              <span className="font-black text-slate-900 text-sm uppercase">Total Payable:</span>
              <span className="font-black text-xl text-blue-600">{formatINR(invoice.totalAmount)}</span>
            </div>

            {/* Amount in Words */}
            <div className="py-2 text-[11px] space-y-0.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Amount in Words:</span>
              <p className="font-bold text-slate-900 leading-snug">
                {numberToIndianWords(invoice.totalAmount)}
              </p>
            </div>

            <div className="flex justify-between py-1 text-slate-600">
              <span>Amount Paid:</span>
              <span className="font-bold text-emerald-600">{formatINR(invoice.paidAmount)}</span>
            </div>

            <div className="flex justify-between py-1 text-slate-900 font-bold border-t border-slate-200">
              <span>Balance Due:</span>
              <span className="text-rose-600 font-black text-sm">{formatINR(invoice.outstandingAmount)}</span>
            </div>

            {/* Signature Block */}
            <div className="pt-8 text-center break-inside-avoid">
              <div className="w-44 border-b border-slate-400 mx-auto mb-1.5" />
              <p className="text-[11px] font-bold text-slate-800">
                {settings.authorizedSignatory || `For ${tenant.legalName || tenant.name || 'Klanvision Technologies'}`}
              </p>
              <p className="text-[10px] text-slate-400">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400">
          This is a computer-generated tax invoice and requires no physical seal or signature.
        </div>
      </div>
      )}

      {/* Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Share Tax Invoice</h3>
                  <p className="text-xs text-slate-500">Secure, expiring public link for customers</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shareLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Generating encrypted share link...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Public Share URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyShareUrl}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-500 bg-amber-50/70 border border-amber-200/60 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Security & Privacy Controls</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                    <li>This URL contains a cryptographic token; no internal database IDs are exposed.</li>
                    <li>
                      Expires on{' '}
                      <strong>
                        {shareData?.expiresAt ? formatDate(shareData.expiresAt) : '7 days from now'}
                      </strong>
                      .
                    </li>
                    <li>Allows view and PDF download only; no access to edit, delete, or other customer data.</li>
                  </ul>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Public View</span>
                  </a>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
