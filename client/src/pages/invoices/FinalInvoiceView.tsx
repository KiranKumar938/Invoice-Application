import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Printer, 
  Download, 
  Share2, 
  ArrowLeft, 
  Eye, 
  Check, 
  Copy, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  CreditCard,
  Edit3
} from 'lucide-react';
import { api } from '../../services/api.js';
import { KlanvisionOfficialInvoice, SAMPLE_REFERENCE_INVOICE, InvoiceDataModel } from '../../components/invoice/KlanvisionOfficialInvoice.js';
import { formatDate } from '../../utils/currency.js';

export const FinalInvoiceView: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [liveInvoice, setLiveInvoice] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'sample' | 'live'>('sample');
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState<{ shareToken: string; expiresAt: string } | null>(null);

  // If an ID is provided in URL, load from backend
  useEffect(() => {
    if (id && id !== '004' && id !== 'sample') {
      const fetchInvoice = async () => {
        setLoading(true);
        try {
          const res = await api.getInvoiceById(id);
          setLiveInvoice(res);
          setViewMode('live');
        } catch (e) {
          console.warn('Failed to load live invoice, showing sample template #004:', e);
          setViewMode('sample');
        } finally {
          setLoading(false);
        }
      };
      fetchInvoice();
    } else {
      setViewMode('sample');
    }
  }, [id]);

  // Convert live backend invoice into KlanvisionOfficialInvoice format
  const mappedLiveInvoice: Partial<InvoiceDataModel> | undefined = liveInvoice
    ? {
        invoiceNumber: liveInvoice.invoiceNumber || '004',
        invoiceDate: formatDate(liveInvoice.issueDate),
        dueDate: formatDate(liveInvoice.dueDate),
        billedBy: {
          name: liveInvoice.tenant?.legalName || liveInvoice.tenant?.name || 'Klanvision Technologies Pvt. Ltd.',
          address: liveInvoice.tenant?.address || '4A, Raghaveer Dham Society,',
          cityStateZip: `${liveInvoice.tenant?.city || 'Surat'}, ${liveInvoice.tenant?.state || 'Gujarat'}, India - ${liveInvoice.tenant?.postalCode || '395006'}`,
          phone: liveInvoice.tenant?.phone || '+91 98765 43210',
          email: liveInvoice.tenant?.email || 'info@klanvision.com',
          website: liveInvoice.tenant?.website || 'www.klanvision.com',
          gstin: liveInvoice.tenant?.gstin || '24ABCDE01234F2Z5',
          pan: liveInvoice.tenant?.pan || 'ABCED1234F',
        },
        billedTo: {
          name: liveInvoice.customer?.name || 'Wox Studio',
          address: liveInvoice.customer?.billingAddress || '305, 3rd Floor Orion mall, Bengaluru,',
          cityStateZip: `${liveInvoice.customer?.billingCity || 'Bengaluru'}, ${liveInvoice.customer?.billingState || 'Karnataka'}, India - ${liveInvoice.customer?.billingPostalCode || '560055'}`,
          gstin: liveInvoice.customer?.gstin || '29AGCED1234KZ26',
          pan: liveInvoice.customer?.pan || 'VOCCD1234K',
        },
        placeOfSupply: liveInvoice.customer?.billingState || 'Karnataka',
        countryOfSupply: 'India',
        lineItems: liveInvoice.lineItems?.map((item: any, idx: number) => ({
          id: item.id || idx,
          description: item.description,
          hsn: item.hsnSacCode || '06',
          qty: item.quantity || 1,
          gstRate: `${item.gstRate || 9}%`,
          taxableAmount: item.taxableAmount || item.unitPrice * (item.quantity || 1),
          sgst: item.sgstAmount || (item.taxableAmount * 0.09),
          cgst: item.cgstAmount || (item.taxableAmount * 0.09),
          amount: item.totalAmount,
        })),
        financials: {
          subTotal: liveInvoice.subtotal,
          discountAmount: liveInvoice.discountTotal || 0,
          discountPercent: liveInvoice.discountPercent || (liveInvoice.discountTotal ? 10 : 0),
          taxableAmount: liveInvoice.taxableAmount,
          cgst: liveInvoice.cgstTotal,
          sgst: liveInvoice.sgstTotal,
          total: liveInvoice.totalAmount,
        },
      }
    : undefined;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      if (liveInvoice?.id) {
        await api.downloadInvoicePdf(liveInvoice.id, liveInvoice.invoiceNumber);
      } else {
        // High fidelity native browser print-to-pdf fallback
        window.print();
      }
    } catch (e) {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenShare = async () => {
    if (liveInvoice?.id) {
      try {
        const res = await api.shareInvoice(liveInvoice.id);
        setShareData(res);
        setShowShareModal(true);
      } catch (e) {
        console.error('Share error:', e);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const shareUrl = shareData
    ? `${window.location.origin}/invoices/share/${shareData.shareToken}`
    : `${window.location.origin}/invoice`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 sm:py-10 px-3 sm:px-6 space-y-6">
      
      {/* ================= TOP ACTION TOOLBAR (Hidden in Print) ================= */}
      <div className="no-print max-w-[850px] mx-auto bg-white p-4 rounded-2xl border border-slate-200/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Navigation and Mode Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">
                Final Web Page Invoice Output
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Official Klanvision Format
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Matching high-definition enterprise Indian GST invoice template
            </p>
          </div>
        </div>

        {/* Center: Toggle Between Reference Sample #004 and Live Invoice */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setViewMode('sample')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'sample'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sample #004 (Reference)
          </button>
          <button
            onClick={() => {
              setViewMode('live');
              if (!liveInvoice) {
                // If no live invoice currently loaded, redirect to invoices or fetch first
                navigate('/invoices');
              }
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'live'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {liveInvoice ? `Live #${liveInvoice.invoiceNumber}` : 'Live Invoices'}
          </button>
        </div>

        {/* Right: Actions (Print, PDF, Share) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#212c9b] hover:bg-[#1a237e] text-white text-xs font-bold shadow-md shadow-blue-900/20 transition-all cursor-pointer disabled:opacity-75"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handleOpenShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer"
            title="Share Public View Link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* ================= MAIN INVOICE OUTPUT SHEET ================= */}
      <div className="w-full flex justify-center">
        <KlanvisionOfficialInvoice
          invoiceRef={invoiceRef}
          data={viewMode === 'live' && mappedLiveInvoice ? mappedLiveInvoice : SAMPLE_REFERENCE_INVOICE}
        />
      </div>

      {/* ================= SHARE MODAL ================= */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Public Invoice Share</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Anyone with this secure link can view and download this verified tax invoice without logging in.
            </p>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-xs text-slate-800 font-mono focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalInvoiceView;
