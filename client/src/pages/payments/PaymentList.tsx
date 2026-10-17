import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Building,
  X,
  FileText,
  Clock,
  Download,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Building2,
  DollarSign,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { formatINR, formatDate, numberToIndianWords } from '../../utils/currency.js';
import { KlanvisionLogo } from '../../components/branding/KlanvisionLogo.js';

export const PaymentList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoiceId');

  const [payments, setPayments] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [kpis, setKpis] = useState({
    totalCollections: 0,
    thisMonthCollections: 0,
    totalTransactions: 0,
    reversedCount: 0,
    reversedAmount: 0,
    methodCounts: { BANK_TRANSFER: 0, UPI: 0, CASH: 0, CARD: 0, CHEQUE: 0 },
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(!!preselectedInvoiceId);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any | null>(null);
  const [paymentToReverse, setPaymentToReverse] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const [receiptDownloading, setReceiptDownloading] = useState(false);

  // Record Payment Form State
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceId: preselectedInvoiceId || '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    transactionReference: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch payments list
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments({
        search,
        status: statusFilter,
        paymentMethod: methodFilter,
        customerId: customerFilter,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        page,
        limit,
      });

      setPayments(res.payments || []);
      if (res.pagination) setPagination(res.pagination);
      if (res.kpis) setKpis(res.kpis);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, methodFilter, customerFilter, startDate, endDate, sortBy, sortOrder, page, limit]);

  // Load customers for filter & modal
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const custRes = await api.getCustomers();
        setCustomers(custRes.customers || []);
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    };
    loadCustomers();
  }, []);

  // Handle Date Preset Changes
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'LAST_30') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setCustomerFilter('');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('paymentDate');
    setSortOrder('desc');
    setPage(1);
  };

  // When customer changes in Record Payment Modal, load customer's unpaid invoices
  useEffect(() => {
    if (!formData.customerId) {
      setCustomerInvoices([]);
      return;
    }

    const loadCustomerInvoices = async () => {
      try {
        const res = await api.getInvoices({ customerId: formData.customerId, limit: 50 });
        const pending = (res.invoices || []).filter(
          (i: any) => i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.outstandingAmount > 0
        );
        setCustomerInvoices(pending);

        // If preselected invoice exists, set it
        if (preselectedInvoiceId) {
          const match = pending.find((i: any) => i.id === preselectedInvoiceId);
          if (match) {
            setFormData((prev) => ({
              ...prev,
              invoiceId: match.id,
              amount: match.outstandingAmount,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load customer pending invoices:', err);
      }
    };

    loadCustomerInvoices();
  }, [formData.customerId, preselectedInvoiceId]);

  const handleInvoiceSelectInModal = (invId: string) => {
    const inv = customerInvoices.find((i) => i.id === invId);
    if (inv) {
      setFormData((prev) => ({
        ...prev,
        invoiceId: invId,
        amount: inv.outstandingAmount,
      }));
    } else {
      setFormData((prev) => ({ ...prev, invoiceId: invId }));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.amount <= 0) {
      setFormError('Please enter a payment amount greater than zero.');
      return;
    }

    // Check against selected invoice outstanding balance
    if (formData.invoiceId) {
      const inv = customerInvoices.find((i) => i.id === formData.invoiceId);
      if (inv && formData.amount > inv.outstandingAmount) {
        setFormError(
          `Payment amount ₹${formData.amount.toLocaleString('en-IN')} exceeds the invoice outstanding balance of ₹${inv.outstandingAmount.toLocaleString('en-IN')}.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.recordPayment({
        customerId: formData.customerId,
        invoiceId: formData.invoiceId || null,
        amount: parseFloat(formData.amount as any),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference || null,
        notes: formData.notes || null,
      });

      setIsRecordModalOpen(false);
      setFormData({
        customerId: '',
        invoiceId: '',
        amount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: '',
        notes: '',
      });
      fetchPayments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await api.exportPaymentsCsv({
        search,
        customerId: customerFilter,
        paymentMethod: methodFilter,
        status: statusFilter,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // Reversal Execution
  const handleConfirmReversal = async () => {
    if (!paymentToReverse) return;
    setReversing(true);
    try {
      await api.reversePayment(paymentToReverse.id, reversalReason);
      setPaymentToReverse(null);
      setReversalReason('');
      fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Failed to reverse payment');
    } finally {
      setReversing(false);
    }
  };

  // PDF Receipt Download
  const handleDownloadReceipt = async (pmt: any) => {
    setReceiptDownloading(true);
    try {
      await api.downloadPaymentReceiptPdf(pmt.id, pmt.paymentNumber);
    } catch (err) {
      console.error('Failed to download receipt:', err);
      window.print();
    } finally {
      setReceiptDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1938] tracking-tight">
            Payments & Collections
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Track bank receipts, UPI payments, allocations, customer settlements, and refunds.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold rounded-xl border border-slate-200/80 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Collections</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatINR(kpis.totalCollections)}</div>
          <p className="text-[11px] text-slate-400">Cumulative received & settled</p>
        </div>

        {/* This Month's Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>This Month</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600">{formatINR(kpis.thisMonthCollections)}</div>
          <p className="text-[11px] text-slate-400">Current calendar month intake</p>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Transactions Count</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.totalTransactions}</div>
          <p className="text-[11px] text-slate-400">
            UPI: {kpis.methodCounts?.UPI || 0} • Bank: {kpis.methodCounts?.BANK_TRANSFER || 0}
          </p>
        </div>

        {/* Reversals & Refunds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Reversed / Refunded</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{formatINR(kpis.reversedAmount)}</div>
          <p className="text-[11px] text-slate-400">{kpis.reversedCount} payments reversed</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Payments' },
            { key: 'SUCCESS', label: 'Settled (Success)' },
            { key: 'REVERSED', label: 'Reversed / Refunded' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Multi-Faceted Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search payment #, customer, UTR..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Customer Filter */}
          <div>
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
            >
              <option value="ALL">All Methods</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div>
            <select
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none font-medium"
            >
              <option value="ALL">All Dates</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_30">Last 30 Days</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center">
            <button
              onClick={handleResetFilters}
              className="w-full py-2 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 text-xs">
            <span className="font-semibold text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
            />
            <span className="font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        )}
      </div>

      {/* Main Payments Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1938] text-white font-bold">
              <tr>
                <th
                  onClick={() => {
                    if (sortBy === 'paymentNumber') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortBy('paymentNumber');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Receipt / Payment #</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'paymentDate') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortBy('paymentDate');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice(s) Settled</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Ref / UTR #</th>
                <th
                  onClick={() => {
                    if (sortBy === 'amount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortBy('amount');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-800"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading payments data...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No payment records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting filters or record a new collection.</p>
                  </td>
                </tr>
              ) : (
                payments.map((pmt) => {
                  const isReversed = pmt.status === 'REVERSED';
                  return (
                    <tr key={pmt.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Payment Number */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedReceiptPayment(pmt)}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <span>{pmt.paymentNumber}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatDate(pmt.paymentDate)}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{pmt.customer?.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{pmt.customer?.gstin || 'Unregistered'}</p>
                      </td>

                      {/* Invoices Settled */}
                      <td className="py-3.5 px-4">
                        {pmt.allocations && pmt.allocations.length > 0 ? (
                          <div className="space-y-0.5">
                            {pmt.allocations.map((a: any, idx: number) => (
                              <div key={idx} className="font-mono text-[11px] text-slate-700">
                                <span className="font-semibold text-blue-700">{a.invoice?.invoiceNumber}</span>
                                <span className="text-slate-400 text-[10px] ml-1">({formatINR(a.amount)})</span>
                              </div>
                            ))}
                          </div>
                        ) : pmt.invoice ? (
                          <span className="font-mono font-bold text-blue-700">{pmt.invoice.invoiceNumber}</span>
                        ) : (
                          <span className="text-slate-400 italic">Account Balance</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {pmt.paymentMethod.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Transaction Reference / UTR */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {pmt.transactionReference || '-'}
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3.5 px-4 text-right font-black text-sm ${
                          isReversed ? 'text-slate-400 line-through' : 'text-emerald-600'
                        }`}
                      >
                        {formatINR(pmt.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isReversed
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isReversed ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          <span>{isReversed ? 'REVERSED' : 'SETTLED'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReceiptPayment(pmt)}
                            title="View / Print Receipt"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDownloadReceipt(pmt)}
                            title="Download PDF Receipt"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {!isReversed && (
                            <button
                              onClick={() => {
                                setPaymentToReverse(pmt);
                                setReversalReason('');
                              }}
                              title="Reverse / Refund Payment"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span>
              Showing {payments.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, pagination.total)} of {pagination.total} records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Record Customer Payment</h3>
                  <p className="text-xs text-slate-500">Settle invoice balance with real-time allocation</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="mt-5 space-y-4 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => {
                    setFormData({ ...formData, customerId: e.target.value, invoiceId: '', amount: 0 });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 font-medium"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.currentOutstanding > 0 ? `(Balance: ₹${c.currentOutstanding.toLocaleString('en-IN')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice to Settle */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-700">Select Invoice to Settle</label>
                  {formData.customerId && (
                    <span className="text-[11px] text-slate-400">
                      {customerInvoices.length} pending invoice{customerInvoices.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => handleInvoiceSelectInModal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 font-medium"
                >
                  <option value="">-- Direct Customer Account Settlement (No Specific Invoice) --</option>
                  {customerInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - Due: {formatDate(inv.dueDate)} (Outstanding: {formatINR(inv.outstandingAmount)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={1}
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 font-black text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Payment Method & UTR / Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 font-medium"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UTR / Transaction Ref #</label>
                  <input
                    type="text"
                    value={formData.transactionReference}
                    onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                    placeholder="e.g. UTR987654321"
                    className="w-full px-3 py-2 font-mono bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional settlement notes..."
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/25 disabled:opacity-60"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT RECEIPT MODAL */}
      {selectedReceiptPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment Receipt</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedReceiptPayment.paymentNumber}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReceiptPayment(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary Sheet */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
              <div className="flex justify-between items-start border-b border-slate-200/70 pb-3">
                <div>
                  <span className="text-slate-400 text-[11px] block">Payer / Customer:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedReceiptPayment.customer?.name}</span>
                  {selectedReceiptPayment.customer?.gstin && (
                    <span className="block text-[11px] font-mono text-slate-500">
                      GSTIN: {selectedReceiptPayment.customer.gstin}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Payment Date:</span>
                  <span className="font-bold text-slate-900">{formatDate(selectedReceiptPayment.paymentDate)}</span>
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Amount Received
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    {formatINR(selectedReceiptPayment.amount)}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 shadow-xs">
                  {selectedReceiptPayment.paymentMethod.replace(/_/g, ' ')}
                </span>
              </div>

              {/* In Words */}
              <div className="text-[11px] text-slate-600">
                <span className="font-semibold text-slate-500">Amount in Words: </span>
                <span className="font-bold text-slate-900">
                  {numberToIndianWords(selectedReceiptPayment.amount)}
                </span>
              </div>

              {/* UTR Reference */}
              {selectedReceiptPayment.transactionReference && (
                <div className="text-[11px] text-slate-600 font-mono">
                  <span className="font-semibold text-slate-500">Ref / UTR #: </span>
                  <span className="font-bold text-slate-900">{selectedReceiptPayment.transactionReference}</span>
                </div>
              )}

              {/* Allocations Table */}
              {selectedReceiptPayment.allocations && selectedReceiptPayment.allocations.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                  <span className="font-bold text-slate-700 block">Settled Invoice Allocations:</span>
                  <table className="w-full text-left text-[11px] bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3 text-right">Allocated (₹)</th>
                        <th className="py-2 px-3 text-right">Remaining Due (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReceiptPayment.allocations.map((a: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold text-blue-600">{a.invoice?.invoiceNumber}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatINR(a.amount)}</td>
                          <td className="py-2 px-3 text-right text-slate-700 font-mono">
                            {formatINR(a.invoice?.outstandingAmount ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReceiptPayment.notes && (
                <div className="text-[11px] text-slate-600 pt-1">
                  <span className="font-semibold text-slate-500">Remarks: </span>
                  <span>{selectedReceiptPayment.notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setSelectedReceiptPayment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>

              <button
                onClick={() => handleDownloadReceipt(selectedReceiptPayment)}
                disabled={receiptDownloading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{receiptDownloading ? 'Generating PDF...' : 'Download PDF Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLLED REVERSAL / REFUND MODAL */}
      {paymentToReverse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reverse Payment Confirmation</h3>
                <p className="text-xs text-slate-500 font-mono">{paymentToReverse.paymentNumber}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-xs text-rose-900 space-y-1.5 leading-relaxed">
              <p className="font-bold">Important Audit Notice:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800">
                <li>
                  Reversing will restore <strong>{formatINR(paymentToReverse.amount)}</strong> back to the invoice balance and customer outstanding.
                </li>
                <li>The payment record is preserved with a REVERSED audit state (never silently deleted).</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Reversal *</label>
              <textarea
                rows={2}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Customer refund, cheque returned, or duplicate entry..."
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentToReverse(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReversal}
                disabled={reversing}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/25 disabled:opacity-60"
              >
                {reversing ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
