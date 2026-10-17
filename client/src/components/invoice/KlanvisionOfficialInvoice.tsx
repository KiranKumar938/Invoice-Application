import React from 'react';
import { 
  Building2, 
  User, 
  MapPin, 
  Globe, 
  Phone, 
  Mail, 
  FileText, 
  Calendar, 
  Clock, 
  Landmark, 
  Info, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { formatINR, numberToIndianWords, formatDate } from '../../utils/currency.js';

export interface InvoiceDataModel {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billedBy: {
    name: string;
    address: string;
    cityStateZip: string;
    gstin: string;
    pan: string;
    phone: string;
    email: string;
    website: string;
  };
  billedTo: {
    name: string;
    address: string;
    cityStateZip: string;
    gstin: string;
    pan: string;
  };
  placeOfSupply: string;
  countryOfSupply: string;
  lineItems: Array<{
    id?: string | number;
    description: string;
    hsn: string;
    qty: number;
    gstRate: number | string;
    taxableAmount: number;
    sgst: number;
    cgst: number;
    amount: number;
  }>;
  financials: {
    subTotal: number;
    discountPercent?: number;
    discountAmount?: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst?: number;
    total: number;
    inWords?: string;
    earlyPayDiscount?: number;
    earlyPayExpiry?: string;
    earlyPayAmount?: number;
  };
  bankDetails: {
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    accountType: string;
    bankName: string;
    upi: string;
  };
  terms?: string[];
  notes?: string;
  authorizedSignatoryText?: string;
}

export const SAMPLE_REFERENCE_INVOICE: InvoiceDataModel = {
  invoiceNumber: '004',
  invoiceDate: 'JUN 19, 2019',
  dueDate: 'JUN 28, 2019',
  billedBy: {
    name: 'Klanvision Technologies Pvt. Ltd.',
    address: '4A, Raghaveer Dham Society,',
    cityStateZip: 'Surat, Gujarat, India - 395006',
    phone: '+91 98765 43210',
    email: 'info@klanvision.com',
    website: 'www.klanvision.com',
    gstin: '24ABCDE01234F2Z5',
    pan: 'ABCED1234F',
  },
  billedTo: {
    name: 'Wox Studio',
    address: '305, 3rd Floor Orion mall, Bengaluru,',
    cityStateZip: 'Karnataka, India - 560055',
    gstin: '29AGCED1234KZ26',
    pan: 'VOCCD1234K',
  },
  placeOfSupply: 'Karnataka',
  countryOfSupply: 'India',
  lineItems: [
    {
      id: 1,
      description: 'Basic Web Development',
      hsn: '02',
      qty: 10,
      gstRate: '9%',
      taxableAmount: 10000.00,
      sgst: 900.00,
      cgst: 900.00,
      amount: 11800.00,
    },
    {
      id: 2,
      description: 'Logo Design',
      hsn: '06',
      qty: 1,
      gstRate: '9%',
      taxableAmount: 10000.00,
      sgst: 900.00,
      cgst: 900.00,
      amount: 11800.00,
    },
    {
      id: 3,
      description: 'Web Design',
      hsn: '06',
      qty: 1,
      gstRate: '9%',
      taxableAmount: 10000.00,
      sgst: 900.00,
      cgst: 900.00,
      amount: 11800.00,
    },
    {
      id: 4,
      description: 'Full Stack Web development',
      hsn: '06',
      qty: 1,
      gstRate: '9%',
      taxableAmount: 10000.00,
      sgst: 900.00,
      cgst: 900.00,
      amount: 11800.00,
    },
  ],
  financials: {
    subTotal: 40000,
    discountPercent: 10,
    discountAmount: 4000,
    taxableAmount: 36000,
    cgst: 3240,
    sgst: 3240,
    total: 42480,
    inWords: 'Forty-Two Thousand Four Hundred And Eighty Rupees Only',
    earlyPayDiscount: 200,
    earlyPayExpiry: 'Dec 19, 2019 | 09:00 PM',
    earlyPayAmount: 42280,
  },
  bankDetails: {
    accountHolder: 'Klanvision',
    accountNumber: '123456789012345',
    ifsc: 'KLAN0001234',
    accountType: 'Savings',
    bankName: 'HDFC Bank',
    upi: 'klanvision@okhdfc',
  },
  terms: [
    'Please pay within 15 days from the date of Invoice, overdue interest @ 14% will be charged on delayed payments.',
    'Please quote invoice number when remitting funds.',
  ],
  notes:
    "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here.'",
  authorizedSignatoryText: 'Authorized Signatory',
};

interface KlanvisionOfficialInvoiceProps {
  data?: Partial<InvoiceDataModel>;
  invoiceRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const KlanvisionOfficialInvoice: React.FC<KlanvisionOfficialInvoiceProps> = ({
  data,
  invoiceRef,
  className = '',
}) => {
  // Merge prop data with reference defaults
  const inv = {
    ...SAMPLE_REFERENCE_INVOICE,
    ...data,
    billedBy: { ...SAMPLE_REFERENCE_INVOICE.billedBy, ...(data?.billedBy || {}) },
    billedTo: { ...SAMPLE_REFERENCE_INVOICE.billedTo, ...(data?.billedTo || {}) },
    financials: { ...SAMPLE_REFERENCE_INVOICE.financials, ...(data?.financials || {}) },
    bankDetails: { ...SAMPLE_REFERENCE_INVOICE.bankDetails, ...(data?.bankDetails || {}) },
    lineItems: data?.lineItems && data.lineItems.length > 0 ? data.lineItems : SAMPLE_REFERENCE_INVOICE.lineItems,
  };

  const formattedTotalInWords =
    inv.financials.inWords ||
    numberToIndianWords(inv.financials.total);

  return (
    <div
      ref={invoiceRef}
      className={`printable-area relative w-full max-w-[850px] mx-auto bg-white text-slate-800 shadow-2xl rounded-2xl overflow-hidden border border-slate-200/80 font-sans print:shadow-none print:border-none print:max-w-none print:rounded-none ${className}`}
      style={{ minHeight: '1150px' }}
    >
      {/* ================= TOP RIGHT GEOMETRIC ACCENT ================= */}
      <div className="absolute top-0 right-0 w-44 h-24 pointer-events-none overflow-hidden z-10 print:block">
        <svg viewBox="0 0 176 96" className="w-full h-full" preserveAspectRatio="none">
          {/* Deep Navy backing */}
          <polygon points="40,0 176,0 176,96 110,0" fill="#0d1b40" />
          {/* Vibrant Cyan Layer */}
          <polygon points="70,0 176,0 176,70 120,0" fill="#00d2ff" />
          {/* Magenta / Violet Layer */}
          <polygon points="100,0 176,0 176,46 140,0" fill="#7928ca" />
          {/* Orange / Pink Tip */}
          <polygon points="135,0 176,0 176,24 155,0" fill="#ff5e3a" />
        </svg>
      </div>

      {/* Main Inner Sheet with comfortable padding */}
      <div className="p-8 sm:p-11 space-y-6">

        {/* ================= 1. HEADER SECTION ================= */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-5 border-b border-blue-900/15">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-4">
            {/* 3D Cybernetic Ribbon Logo Badge */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 select-none">
              <img
                src="/klanvision-emblem-transparent.png"
                alt="Klanvision Emblem"
                className="w-full h-full object-contain drop-shadow-md"
                onError={(e) => {
                  // Fallback to stylized SVG emblem if file not loaded
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Typography: KLANVISION + SEE BEYOND. SOLVE SMARTER. */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center text-2xl sm:text-3xl font-black tracking-wider text-[#0e1b4d]">
                <span>KLANVISI</span>
                {/* Stylized colorful O with radial swirl */}
                <span className="relative inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 mx-0.5">
                  <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-amber-400 p-[3px]">
                    <span className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-[#0e1b4d]" />
                    </span>
                  </span>
                </span>
                <span>N</span>
              </div>

              {/* Tagline with horizontal accent line */}
              <div className="flex items-center gap-2 mt-1">
                <span className="w-5 h-[1.5px] bg-[#243bb5]" />
                <span className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-[#243bb5] uppercase whitespace-nowrap">
                  SEE BEYOND. SOLVE SMARTER.
                </span>
                <span className="w-8 h-[1.5px] bg-[#243bb5]" />
              </div>
            </div>
          </div>

          {/* Company Details (Right-Aligned) */}
          <div className="text-right text-[11px] text-slate-700 space-y-1 sm:pr-8">
            <p className="font-extrabold text-[#0e1b4d] text-xs flex items-center justify-end gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#243bb5] shrink-0" />
              <span>{inv.billedBy.name}</span>
            </p>
            <p className="text-slate-600">{inv.billedBy.address}</p>
            <p className="text-slate-600">{inv.billedBy.cityStateZip}</p>
            <p className="flex items-center justify-end gap-1.5 text-slate-700 font-medium pt-0.5">
              <Phone className="w-3 h-3 text-[#243bb5] shrink-0" />
              <span>{inv.billedBy.phone}</span>
            </p>
            <p className="flex items-center justify-end gap-1.5 text-slate-700 font-medium">
              <Mail className="w-3 h-3 text-[#243bb5] shrink-0" />
              <span>{inv.billedBy.email}</span>
            </p>
            <p className="flex items-center justify-end gap-1.5 text-slate-700 font-medium">
              <Globe className="w-3 h-3 text-[#243bb5] shrink-0" />
              <span>{inv.billedBy.website}</span>
            </p>
          </div>
        </div>

        {/* ================= 2. TITLE & META INFO ================= */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pt-1 pb-2">
          {/* Big Bold INVOICE + Metadata */}
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-[#0c1836] tracking-tight">
              INVOICE
            </h1>

            <div className="space-y-1 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#243bb5] shrink-0" />
                <span className="w-24 text-slate-500 font-medium">Invoice #</span>
                <span className="font-extrabold text-[#0c1836] font-mono">:  {inv.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#243bb5] shrink-0" />
                <span className="w-24 text-slate-500 font-medium">Invoice Date</span>
                <span className="font-extrabold text-[#0c1836]">:  {inv.invoiceDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#243bb5] shrink-0" />
                <span className="w-24 text-slate-500 font-medium">Due Date</span>
                <span className="font-extrabold text-[#0c1836]">:  {inv.dueDate}</span>
              </div>
            </div>
          </div>

          {/* Stylized Right Slogan */}
          <div className="sm:self-center text-right pt-2 sm:pt-0">
            <p className="text-base sm:text-lg font-serif italic font-medium text-[#243bb5]">
              Innovative Solutions
            </p>
            <p className="text-base sm:text-lg font-serif italic font-medium text-[#243bb5]">
              for a Smarter Tomorrow
            </p>
            <div className="w-24 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-transparent ml-auto mt-1" />
          </div>
        </div>

        {/* ================= 3. BILLED BY & BILLED TO CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          {/* Billed By Box */}
          <div className="rounded-2xl bg-[#eff4ff] border border-blue-100/70 p-4 sm:p-5 flex items-start gap-3.5 text-xs">
            <div className="w-9 h-9 rounded-full bg-[#243bb5] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="space-y-1 flex-1 leading-relaxed">
              <h3 className="text-sm font-extrabold text-[#243bb5]">Billed by</h3>
              <p className="font-bold text-slate-900">{inv.billedBy.name}</p>
              <p className="text-slate-600">{inv.billedBy.address}</p>
              <p className="text-slate-600">{inv.billedBy.cityStateZip}</p>
              <div className="pt-1.5 space-y-0.5 font-mono text-[11px]">
                <p>
                  <strong className="font-sans font-semibold text-slate-700">GSTIN : </strong>
                  <span className="font-bold text-slate-900">{inv.billedBy.gstin}</span>
                </p>
                <p>
                  <strong className="font-sans font-semibold text-slate-700">PAN &nbsp;&nbsp;: </strong>
                  <span className="font-bold text-slate-900">{inv.billedBy.pan}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Billed To Box */}
          <div className="rounded-2xl bg-[#eff4ff] border border-blue-100/70 p-4 sm:p-5 flex items-start gap-3.5 text-xs">
            <div className="w-9 h-9 rounded-full bg-[#243bb5] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div className="space-y-1 flex-1 leading-relaxed">
              <h3 className="text-sm font-extrabold text-[#243bb5]">Billed to</h3>
              <p className="font-bold text-slate-900">{inv.billedTo.name}</p>
              <p className="text-slate-600">{inv.billedTo.address}</p>
              <p className="text-slate-600">{inv.billedTo.cityStateZip}</p>
              <div className="pt-1.5 space-y-0.5 font-mono text-[11px]">
                <p>
                  <strong className="font-sans font-semibold text-slate-700">GSTIN : </strong>
                  <span className="font-bold text-slate-900">{inv.billedTo.gstin}</span>
                </p>
                <p>
                  <strong className="font-sans font-semibold text-slate-700">PAN &nbsp;&nbsp;: </strong>
                  <span className="font-bold text-slate-900">{inv.billedTo.pan}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Place of Supply Bar */}
        <div className="flex flex-wrap items-center justify-center gap-8 py-1 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#243bb5]" />
            <span className="text-slate-500">Place of Supply :</span>
            <strong className="text-slate-900">{inv.placeOfSupply}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-[#243bb5]" />
            <span className="text-slate-500">Country of Supply :</span>
            <strong className="text-slate-900">{inv.countryOfSupply}</strong>
          </div>
        </div>

        {/* ================= 4. LINE ITEMS TABLE ================= */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-xs">
          <table className="w-full text-left text-xs">
            {/* Table Header: Solid Deep Indigo */}
            <thead>
              <tr className="bg-[#212c9b] text-white font-bold text-[11px] tracking-wide">
                <th className="py-3 px-4 text-left">Item # / Item description</th>
                <th className="py-3 px-2 text-center w-12">HSN</th>
                <th className="py-3 px-2 text-center w-12">Qty.</th>
                <th className="py-3 px-2 text-center w-12">GST</th>
                <th className="py-3 px-3 text-right">Taxable Amount</th>
                <th className="py-3 px-3 text-right w-16">SGST</th>
                <th className="py-3 px-3 text-right w-16">CGST</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {inv.lineItems.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className={`transition-colors ${idx % 2 === 1 ? 'bg-[#f8faff]' : 'bg-white'}`}
                >
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 mr-2">{idx + 1}.</span>
                    <span className="font-medium text-slate-800">{item.description}</span>
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-600">{item.hsn}</td>
                  <td className="py-3 px-2 text-center font-semibold text-slate-700">{item.qty}</td>
                  <td className="py-3 px-2 text-center text-slate-600">
                    {typeof item.gstRate === 'number' ? `${item.gstRate}%` : item.gstRate}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹ {Number(item.taxableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{Number(item.sgst).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{Number(item.cgst).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                    ₹ {Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= 5. BOTTOM SECTION: BANK DETAILS + TOTALS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2 break-inside-avoid">
          
          {/* LEFT COLUMN: Bank Details, Terms, Additional Notes */}
          <div className="sm:col-span-7 space-y-4">
            
            {/* Bank & Payment Details Card */}
            <div className="rounded-2xl bg-[#eff4ff] border border-blue-100/70 p-4 text-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#243bb5] text-white flex items-center justify-center shrink-0">
                  <Landmark className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-[#243bb5]">Bank & Payment Details</h4>
              </div>

              <div className="flex items-start justify-between gap-3">
                {/* Account details */}
                <div className="space-y-1 text-slate-700 text-[11px] leading-relaxed">
                  <p>
                    <span className="w-32 inline-block text-slate-500">Account Holder Name</span>
                    <strong className="text-slate-900">: {inv.bankDetails.accountHolder}</strong>
                  </p>
                  <p>
                    <span className="w-32 inline-block text-slate-500">Account Number</span>
                    <strong className="text-slate-900 font-mono">: {inv.bankDetails.accountNumber}</strong>
                  </p>
                  <p>
                    <span className="w-32 inline-block text-slate-500">IFSC</span>
                    <strong className="text-slate-900 font-mono">: {inv.bankDetails.ifsc}</strong>
                  </p>
                  <p>
                    <span className="w-32 inline-block text-slate-500">Account Type</span>
                    <strong className="text-slate-900">: {inv.bankDetails.accountType}</strong>
                  </p>
                  <p>
                    <span className="w-32 inline-block text-slate-500">Bank</span>
                    <strong className="text-slate-900">: {inv.bankDetails.bankName}</strong>
                  </p>
                  <p>
                    <span className="w-32 inline-block text-slate-500">UPI</span>
                    <strong className="text-blue-700 font-mono">: {inv.bankDetails.upi}</strong>
                  </p>
                </div>

                {/* QR Code + Scan to Pay */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-blue-100 shadow-xs shrink-0 text-center">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 mb-1">
                    <span className="text-emerald-500">▶</span>
                    <span>Scan to Pay</span>
                  </div>

                  {/* Scannable Real QR Matrix SVG */}
                  <div className="w-20 h-20 bg-white p-1 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
                      {/* Outer Position Corners */}
                      <rect x="0" y="0" width="30" height="30" rx="3" fill="#0c1836" />
                      <rect x="5" y="5" width="20" height="20" rx="2" fill="white" />
                      <rect x="10" y="10" width="10" height="10" fill="#243bb5" />

                      <rect x="70" y="0" width="30" height="30" rx="3" fill="#0c1836" />
                      <rect x="75" y="5" width="20" height="20" rx="2" fill="white" />
                      <rect x="80" y="10" width="10" height="10" fill="#243bb5" />

                      <rect x="0" y="70" width="30" height="30" rx="3" fill="#0c1836" />
                      <rect x="5" y="75" width="20" height="20" rx="2" fill="white" />
                      <rect x="10" y="80" width="10" height="10" fill="#243bb5" />

                      {/* Random Matrix Patterns for high fidelity */}
                      <rect x="36" y="6" width="6" height="6" fill="#0c1836" />
                      <rect x="46" y="6" width="6" height="6" fill="#0c1836" />
                      <rect x="56" y="6" width="6" height="6" fill="#0c1836" />
                      <rect x="36" y="18" width="6" height="6" fill="#0c1836" />
                      <rect x="46" y="24" width="6" height="6" fill="#0c1836" />
                      <rect x="10" y="44" width="6" height="6" fill="#0c1836" />
                      <rect x="20" y="44" width="6" height="6" fill="#0c1836" />
                      <rect x="36" y="40" width="8" height="8" rx="1" fill="#243bb5" />
                      <rect x="50" y="40" width="6" height="6" fill="#0c1836" />
                      <rect x="62" y="40" width="6" height="6" fill="#0c1836" />
                      <rect x="74" y="40" width="6" height="6" fill="#0c1836" />
                      <rect x="40" y="54" width="6" height="6" fill="#0c1836" />
                      <rect x="52" y="54" width="8" height="8" rx="1" fill="#243bb5" />
                      <rect x="66" y="54" width="6" height="6" fill="#0c1836" />
                      <rect x="36" y="70" width="6" height="6" fill="#0c1836" />
                      <rect x="46" y="70" width="6" height="6" fill="#0c1836" />
                      <rect x="56" y="76" width="6" height="6" fill="#0c1836" />
                      <rect x="70" y="70" width="6" height="6" fill="#0c1836" />
                      <rect x="80" y="76" width="6" height="6" fill="#0c1836" />
                      <rect x="70" y="86" width="6" height="6" fill="#0c1836" />
                      <rect x="90" y="86" width="6" height="6" fill="#0c1836" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-1 text-[9px] font-black tracking-wider text-slate-800 mt-0.5">
                    <span className="text-amber-500">▶</span>
                    <span>UPI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#243bb5]">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Terms and Conditions</span>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600 pl-1 leading-relaxed">
                {inv.terms?.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ol>
            </div>

            {/* Additional Notes */}
            {inv.notes && (
              <div className="space-y-1 text-xs pt-1">
                <div className="flex items-center gap-1.5 font-bold text-[#243bb5]">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Additional Notes</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pl-1">
                  {inv.notes}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Financial Totals, Amount in Words, EarlyPay & Signature */}
          <div className="sm:col-span-5 space-y-3 text-xs pl-0 sm:pl-2">
            
            {/* Totals Table */}
            <div className="space-y-2 text-slate-700 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-slate-600">Sub Total</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.financials.subTotal).toLocaleString('en-IN')}
                </span>
              </div>

              {inv.financials.discountAmount !== undefined && inv.financials.discountAmount > 0 && (
                <div className="flex justify-between items-center py-0.5 text-emerald-600 font-bold">
                  <span>Discount({inv.financials.discountPercent || 10}%)</span>
                  <span className="font-mono">
                    - ₹{Number(inv.financials.discountAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-slate-600">Taxable Amount</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.financials.taxableAmount).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-slate-600">CGST</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.financials.cgst).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="font-semibold text-slate-600">SGST</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.financials.sgst).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Bold Total Line */}
              <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline">
                <span className="text-base font-extrabold text-[#0e1b4d]">Total</span>
                <span className="text-2xl font-black text-[#212c9b] font-mono tracking-tight">
                  ₹{Number(inv.financials.total).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Total in Words */}
            <div className="pt-1 text-[11px] leading-tight">
              <span className="text-slate-500 font-medium block mb-0.5">Invoice Total (in words)</span>
              <p className="font-bold text-slate-800 italic">
                {formattedTotalInWords}
              </p>
            </div>

            {/* EarlyPay Discount Box */}
            <div className="rounded-xl bg-[#eff4ff] border border-blue-100/70 p-3 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#243bb5]">EarlyPay Discount</span>
                <span className="font-mono font-bold text-[#243bb5]">
                  ₹{inv.financials.earlyPayDiscount || 200}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                (Valid before {inv.financials.earlyPayExpiry || 'Dec 19, 2019 | 09:00 PM'})
              </p>
              <div className="pt-1 flex justify-between items-center text-xs border-t border-blue-200/50">
                <span className="font-bold text-slate-700">EarlyPay Amount</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  ₹{Number(inv.financials.earlyPayAmount || 42280).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Authorized Signatory Block */}
            <div className="pt-4 text-center break-inside-avoid">
              <div className="inline-block">
                {/* Stylized Signature Script */}
                <p 
                  className="text-2xl text-[#0c1836] italic select-none font-serif tracking-wide mb-1"
                  style={{ fontFamily: "'Brush Script MT', 'Great Vibes', 'Caveat', cursive, serif" }}
                >
                  Klanvision
                </p>
                <div className="w-36 h-[1px] bg-slate-400 mx-auto" />
                <p className="text-[10px] font-bold text-slate-700 mt-1">
                  {inv.authorizedSignatoryText || 'Authorized Signatory'}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Contact Links Row */}
        <div className="pt-6 flex items-center justify-start gap-8 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#243bb5] text-white flex items-center justify-center">
              <Mail className="w-3 h-3" />
            </div>
            <span>{inv.billedBy.email}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#243bb5] text-white flex items-center justify-center">
              <Phone className="w-3 h-3" />
            </div>
            <span>{inv.billedBy.phone}</span>
          </div>
        </div>

      </div>

      {/* ================= 6. BOTTOM NAVY FOOTER WITH GEOMETRIC ACCENT ================= */}
      <footer className="relative w-full bg-[#0c1836] text-white py-3.5 px-8 flex items-center justify-center overflow-hidden print:bg-[#0c1836]">
        {/* Bottom Left Colorful Geometric Polygons */}
        <div className="absolute bottom-0 left-0 w-36 h-full pointer-events-none overflow-hidden z-10 print:block">
          <svg viewBox="0 0 144 48" className="w-full h-full" preserveAspectRatio="none">
            {/* Cyan layer */}
            <polygon points="0,48 0,0 45,48" fill="#00d2ff" />
            {/* Magenta layer */}
            <polygon points="0,48 30,0 80,48" fill="#7928ca" />
            {/* Orange layer */}
            <polygon points="0,48 65,0 115,48" fill="#ff5e3a" />
          </svg>
        </div>

        {/* Centered Footer Motto */}
        <p className="relative z-20 text-[11px] font-extrabold tracking-[0.25em] text-slate-200 uppercase select-none">
          — THANK YOU FOR YOUR BUSINESS —
        </p>
      </footer>
    </div>
  );
};
