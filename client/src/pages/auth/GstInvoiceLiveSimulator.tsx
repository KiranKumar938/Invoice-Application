import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Receipt, 
  Zap, 
  Hash, 
  ArrowUpRight
} from 'lucide-react';

export const GstInvoiceLiveSimulator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'einvoice' | 'tax' | 'audit'>('einvoice');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [baseAmount, setBaseAmount] = useState<number>(125000);
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [tickerIndex, setTickerIndex] = useState<number>(0);

  const tickerItems = [
    { label: 'Live GSTN Handshake', value: '18ms Latency', status: 'Optimal' },
    { label: 'E-Way Bill Generation', value: 'Instant API', status: 'Active' },
    { label: 'GSTR-1 & 3B Reconciliation', value: '100% Match', status: 'Automated' },
    { label: 'Digital Cryptographic Signature', value: 'SHA-256 Verified', status: 'Secured' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const taxAmount = (baseAmount * taxRate) / 100;
  const halfTax = taxAmount / 2;
  const totalAmount = baseAmount + taxAmount;

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-3xl bg-gradient-to-b from-[#0e1e42]/90 via-[#0a1530]/90 to-[#070e24]/95 p-6 lg:p-7 border border-blue-500/20 shadow-2xl shadow-blue-950/60 backdrop-blur-xl overflow-hidden group">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition-all duration-700" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/25 transition-all duration-700" />
      
      {/* Subtle Scanline Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/[0.03] to-transparent h-20 animate-scanline pointer-events-none" />

      {/* Header Pill & System Health */}
      <div className="relative z-10 flex items-center justify-between pb-5 border-b border-blue-900/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 tracking-wide uppercase text-[11px]">
            Live GST Engine Simulation
          </span>
        </div>

        {/* Live cycling ticker */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800/40 text-[11px] text-blue-200">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-400">{tickerItems[tickerIndex].label}:</span>
          <span className="font-semibold text-cyan-300">{tickerItems[tickerIndex].value}</span>
        </div>
      </div>

      {/* Feature Navigation Tabs */}
      <div className="relative z-10 flex items-center gap-2 my-5 p-1 bg-black/30 rounded-2xl border border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab('einvoice')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300 ${
            activeTab === 'einvoice'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>E-Invoice & IRN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tax')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300 ${
            activeTab === 'tax'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>GST Calculator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300 ${
            activeTab === 'audit'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Ledger</span>
        </button>
      </div>

      {/* TAB 1: E-Invoice & IRN Live Showcase */}
      {activeTab === 'einvoice' && (
        <div className="relative z-10 space-y-4 animate-fadeIn">
          {/* Mock E-Invoice Preview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase block">
                  Govt. of India • E-Invoice Portal
                </span>
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                  <span>TAX INVOICE #KV-2026-0892</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    B2B Verified
                  </span>
                </h4>
              </div>

              {/* QR Code Simulation */}
              <div className="p-2 rounded-xl bg-white text-slate-900 shadow-md flex flex-col items-center justify-center shrink-0">
                <QrCode className="w-9 h-9" />
                <span className="text-[8px] font-bold mt-0.5 text-slate-700">GSTN QR</span>
              </div>
            </div>

            {/* IRN Hash Bar */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-blue-500/20 mb-3 text-[11px] font-mono flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-slate-400">IRN:</span>
                <span className="text-cyan-300 font-semibold truncate">
                  8f3a9e1b2c4d...e7f809d3b5c1
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-sans font-semibold shrink-0 ml-2">
                NIC Signed ✓
              </span>
            </div>

            {/* Buyer & Seller Mini Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-900/40">
                <span className="text-[10px] text-slate-400 block font-medium">Billed By (Supplier)</span>
                <p className="font-semibold text-white truncate">Klanvision Tech Pvt Ltd</p>
                <p className="text-[10px] text-cyan-300/90 font-mono">GSTIN: 07AAACC81234F1Z5</p>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-900/40">
                <span className="text-[10px] text-slate-400 block font-medium">Billed To (Client)</span>
                <p className="font-semibold text-white truncate">Reliance Retail Ent.</p>
                <p className="text-[10px] text-cyan-300/90 font-mono">GSTIN: 27AABCR0987K1ZV</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Invoice</p>
              <p className="text-base font-extrabold text-white mt-0.5">₹1,47,500</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">GST Component</p>
              <p className="text-base font-extrabold text-cyan-300 mt-0.5">₹22,500</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">E-Way Bill Status</p>
              <p className="text-xs font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Generated
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Dynamic Live GST Calculator */}
      {activeTab === 'tax' && (
        <div className="relative z-10 space-y-4 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-300">Quick Tax Simulation</span>
              
              {/* Intra vs Inter-State Switch */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsInterState(false)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    !isInterState ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Intra-State (CGST+SGST)
                </button>
                <button
                  type="button"
                  onClick={() => setIsInterState(true)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    isInterState ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Inter-State (IGST)
                </button>
              </div>
            </div>

            {/* GST Rate Selector */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-xs text-slate-400">Select GST Bracket:</span>
              <div className="flex items-center gap-2">
                {[5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setTaxRate(rate)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      taxRate === rate
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation Breakdown */}
            <div className="space-y-2 p-3 rounded-xl bg-black/40 border border-blue-900/30 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Taxable Base Value:</span>
                <span className="font-semibold text-white font-mono">₹{baseAmount.toLocaleString('en-IN')}</span>
              </div>

              {!isInterState ? (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Central GST (CGST @ {taxRate / 2}%):</span>
                    <span className="font-semibold text-cyan-300 font-mono">+₹{halfTax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>State GST (SGST @ {taxRate / 2}%):</span>
                    <span className="font-semibold text-cyan-300 font-mono">+₹{halfTax.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-400">
                  <span>Integrated GST (IGST @ {taxRate}%):</span>
                  <span className="font-semibold text-cyan-300 font-mono">+₹{taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-bold">
                <span className="text-white">Gross Total (INR):</span>
                <span className="text-emerald-400 font-mono text-base font-extrabold">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Complies with Section 31 of CGST Act</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-300">HSN: 998314</span>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Trail & Security */}
      {activeTab === 'audit' && (
        <div className="relative z-10 space-y-3 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Immutable Enterprise Audit Stream
            </span>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-300">AUTH_SESSION_INIT</span>
                </div>
                <span className="text-slate-500">Just now</span>
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-300">GSTN_SANDBOX_HANDSHAKE_OK</span>
                </div>
                <span className="text-slate-500">2s ago</span>
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-slate-300">ENCRYPTION_KEY_ROTATED_AES256</span>
                </div>
                <span className="text-slate-500">12s ago</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Multi-Tenant Data Isolated</span>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Automated 24/7 Backup</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer stats badge */}
      <div className="relative z-10 mt-5 pt-4 border-t border-blue-900/40 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Used by 10,000+ Indian Businesses</span>
        </div>
        <span className="text-cyan-400/80 font-mono font-medium">Klanvision OS v2.4</span>
      </div>
    </div>
  );
};
