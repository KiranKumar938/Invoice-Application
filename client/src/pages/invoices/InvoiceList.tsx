import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  Ban,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Edit3,
  Copy,
  Calendar,
  Building,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  X,
  Check,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { formatINR, formatDate } from '../../utils/currency.js';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  status: string;
  paymentStatus: string;
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
  notes?: string;
  terms?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    gstin?: string;
    billingState?: string;
  };
  lineItems?: any[];
  payments?: any[];
}

export const InvoiceList: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({
    totalInvoices: 0,
    totalInvoicedAmount: 0,
    totalPaidAmount: 0,
    totalOutstandingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    draftCount: 0,
    paidCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL_TIME');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // UI Menus & Modals
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceItem | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Quick Payment Modal
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<InvoiceItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'CHEQUE'>('UPI');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Load customer filter options on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await api.getCustomers();
        setCustomers(res.customers || []);
      } catch (err) {
        console.error('Failed to load customers for filter:', err);
      }
    };
    loadCustomers();
  }, []);

  // Compute actual date parameters based on quick date range selection
  const computedDateRange = useMemo(() => {
    if (dateRangeFilter === 'THIS_MONTH') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { startDate: firstDay, endDate: lastDay };
    }
    if (dateRangeFilter === 'LAST_30_DAYS') {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    if (dateRangeFilter === 'THIS_QUARTER') {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
      return { startDate: firstDay, endDate: lastDay };
    }
    if (dateRangeFilter === 'CUSTOM') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateRangeFilter, customStartDate, customEndDate]);

  // Fetch Invoices with all parameters
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.getInvoices({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        customerId: customerFilter !== 'ALL' ? customerFilter : undefined,
        startDate: computedDateRange.startDate,
        endDate: computedDateRange.endDate,
        sortBy,
        sortOrder,
        page,
        limit,
      });

      setInvoices(res.invoices || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.total || 0);
      }
      if (res.kpis) {
        setKpis(res.kpis);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [
    search,
    statusFilter,
    customerFilter,
    dateRangeFilter,
    customStartDate,
    customEndDate,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCustomerFilter('ALL');
    setDateRangeFilter('ALL_TIME');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('issueDate');
    setSortOrder('desc');
    setPage(1);
  };

  // Sorting toggle
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await api.exportInvoicesCsv({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        customerId: customerFilter !== 'ALL' ? customerFilter : undefined,
        startDate: computedDateRange.startDate,
        endDate: computedDateRange.endDate,
      });
      showToast('Invoices exported to CSV successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to export invoices');
    } finally {
      setExporting(false);
    }
  };

  // Duplicate Invoice
  const handleDuplicateInvoice = async (inv: InvoiceItem) => {
    try {
      setActionMenuOpen(null);
      const res = await api.duplicateInvoice(inv.id);
      showToast(`Invoice duplicated successfully as draft ${res.invoiceNumber}!`);
      fetchInvoices();
      navigate(`/invoices/${res.id}/edit`);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  // Cancel Invoice Confirm Execution
  const handleConfirmCancel = async () => {
    if (!cancelModalInvoice) return;
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await api.cancelInvoice(cancelModalInvoice.id);
      showToast(`Invoice ${cancelModalInvoice.invoiceNumber} cancelled and balance reversed.`);
      setCancelModalInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel invoice');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Quick Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError('Payment amount must be greater than 0.');
      return;
    }
    if (amountNum > paymentModalInvoice.outstandingAmount) {
      setPaymentError(`Payment amount cannot exceed outstanding balance of ${formatINR(paymentModalInvoice.outstandingAmount)}.`);
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError(null);

    try {
      await api.recordPayment({
        customerId: paymentModalInvoice.customerId,
        invoiceId: paymentModalInvoice.id,
        amount: amountNum,
        paymentDate,
        paymentMethod,
        transactionReference: paymentRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      showToast(`Payment of ${formatINR(amountNum)} recorded for ${paymentModalInvoice.invoiceNumber}!`);
      setPaymentModalInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Status Badge Rendering
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paid</span>
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Partially Paid</span>
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Overdue</span>
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Issued</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Draft</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400 line-through border border-slate-200">
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-bounce-subtle">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Page Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1938] tracking-tight">
            Invoices
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Create, track and manage GST tax invoices, receivable balances, and customer statements.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting || invoices.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold rounded-xl border border-slate-200 shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/invoices/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Invoiced */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#0c1938] tracking-tight">{formatINR(kpis.totalInvoicedAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpis.totalInvoices} non-cancelled invoices</p>
          </div>
        </div>

        {/* Collected Revenue */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collected Revenue</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatINR(kpis.totalPaidAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpis.paidCount} fully settled invoices</p>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding Receivables</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600 tracking-tight">{formatINR(kpis.totalOutstandingAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pending client settlements</p>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Invoices</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-rose-600 tracking-tight">{formatINR(kpis.overdueAmount)}</p>
            <p className="text-[11px] text-rose-500 font-semibold mt-0.5">{kpis.overdueCount} invoices past due date</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
        {/* Status Filter Tabs */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70 overflow-x-auto max-w-full">
            {[
              { id: 'ALL', label: 'All Invoices' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'ISSUED', label: 'Issued' },
              { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
              { id: 'PAID', label: 'Paid' },
              { id: 'OVERDUE', label: 'Overdue' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Date Range Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-semibold outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="ALL_TIME">All Dates</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="CUSTOM">Custom Date Range...</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Controls: Search, Customer, Custom Dates, Clear */}
        <div className="px-6 pb-2 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by invoice number, customer, GSTIN..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Customer Filter */}
          <div className="md:col-span-3">
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Pickers (if CUSTOM selected) */}
          {dateRangeFilter === 'CUSTOM' ? (
            <div className="md:col-span-4 flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200"
              />
            </div>
          ) : (
            <div className="md:col-span-4"></div>
          )}

          {/* Reset Filters Button */}
          <div className="md:col-span-1 flex justify-end">
            {(search || statusFilter !== 'ALL' || customerFilter !== 'ALL' || dateRangeFilter !== 'ALL_TIME') && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset all filters"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoice Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-y border-slate-200/80 text-slate-600 select-none">
                <th
                  onClick={() => handleSort('invoiceNumber')}
                  className="py-3.5 px-6 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/70 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Invoice Number</span>
                    {renderSortIcon('invoiceNumber')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('customerName')}
                  className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/70 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer</span>
                    {renderSortIcon('customerName')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('issueDate')}
                  className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/70 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Issue Date</span>
                    {renderSortIcon('issueDate')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('dueDate')}
                  className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/70 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Due Date</span>
                    {renderSortIcon('dueDate')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('totalAmount')}
                  className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/70 transition-colors group text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Amount</span>
                    {renderSortIcon('totalAmount')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('outstandingAmount')}
                  className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/70 transition-colors group text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Balance / Paid</span>
                    {renderSortIcon('outstandingAmount')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('status')}
                  className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/70 transition-colors group text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>

                <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-[11px] text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting search terms, status filters, or create your first invoice.
                    </p>
                    <button
                      onClick={() => navigate('/invoices/new')}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Create Invoice
                    </button>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const now = new Date();
                  const isPastDue = new Date(inv.dueDate) < now && inv.outstandingAmount > 0 && inv.status !== 'CANCELLED' && inv.status !== 'PAID';

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Invoice Number */}
                      <td className="py-4 px-6 font-mono font-bold text-blue-600">
                        <button
                          type="button"
                          onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                          className="hover:underline flex items-center gap-1.5 text-left"
                        >
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{inv.invoiceNumber}</span>
                        </button>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <div
                          onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                          className="cursor-pointer"
                        >
                          <p className="font-bold text-slate-900 leading-snug">{inv.customer?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-500">
                              {inv.customer?.gstin || 'B2C / Unreg'}
                            </span>
                            {inv.customer?.billingState && (
                              <span className="text-[10px] text-slate-400">• {inv.customer.billingState}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(inv.issueDate)}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={isPastDue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {formatDate(inv.dueDate)}
                          </span>
                          {isPastDue && (
                            <span title="Overdue" className="text-rose-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-4 font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatINR(inv.totalAmount)}
                      </td>

                      {/* Balance & Paid Amount */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {inv.status === 'PAID' ? (
                          <span className="font-semibold text-emerald-600">Fully Settled</span>
                        ) : inv.status === 'CANCELLED' ? (
                          <span className="text-slate-400 font-medium">Reversed</span>
                        ) : inv.status === 'DRAFT' ? (
                          <span className="text-slate-400 font-medium">Unissued Draft</span>
                        ) : (
                          <div>
                            <span className="font-extrabold text-rose-600 block">
                              {formatINR(inv.outstandingAmount)}
                            </span>
                            {inv.paidAmount > 0 && (
                              <span className="text-[10px] text-emerald-600 block font-medium">
                                Paid: {formatINR(inv.paidAmount)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(inv.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center relative whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                            title="Preview / Details"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActionMenuOpen(actionMenuOpen === inv.id ? null : inv.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Action Menu Popover */}
                        {actionMenuOpen === inv.id && (
                          <div className="absolute right-6 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-40 text-left animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpen(null);
                                navigate(`/invoices/${inv.id}/preview`);
                              }}
                              className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                            >
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span>View / Print Tax Invoice</span>
                            </button>

                            {/* Edit draft or amend */}
                            {inv.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpen(null);
                                  navigate(`/invoices/${inv.id}/edit`);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 font-semibold"
                              >
                                <Edit3 className="w-4 h-4 text-blue-500" />
                                <span>Edit Draft Invoice</span>
                              </button>
                            )}

                            {inv.status === 'ISSUED' && inv.paidAmount === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpen(null);
                                  navigate(`/invoices/${inv.id}/edit`);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 font-semibold"
                              >
                                <Edit3 className="w-4 h-4 text-amber-500" />
                                <span>Amend Invoice</span>
                              </button>
                            )}

                            {/* Record Payment */}
                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpen(null);
                                  setPaymentModalInvoice(inv);
                                  setPaymentAmount(inv.outstandingAmount);
                                  setPaymentError(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 font-semibold"
                              >
                                <CreditCard className="w-4 h-4 text-emerald-500" />
                                <span>Record Payment</span>
                              </button>
                            )}

                            {/* Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateInvoice(inv)}
                              className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium"
                            >
                              <Copy className="w-4 h-4 text-slate-400" />
                              <span>Duplicate as Draft</span>
                            </button>

                            {/* Cancel */}
                            {inv.status !== 'CANCELLED' && inv.paidAmount === 0 && (
                              <div className="pt-1 mt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpen(null);
                                    setCancelModalInvoice(inv);
                                    setCancelError(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold"
                                >
                                  <Ban className="w-4 h-4 text-rose-500" />
                                  <span>Cancel Invoice</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Showing {totalCount === 0 ? 0 : (page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, totalCount)} of {totalCount} invoices
            </span>

            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 text-slate-700 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= page - 1 && pageNumber <= page + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      page === pageNumber
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              }
              if (pageNumber === page - 2 || pageNumber === page + 2) {
                return <span key={pageNumber} className="px-1 text-slate-400">...</span>;
              }
              return null;
            })}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Cancel Invoice Confirmation Modal */}
      {/* ========================================================================= */}
      {cancelModalInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cancel Invoice {cancelModalInvoice.invoiceNumber}?
                </h3>
                <p className="text-xs text-slate-500">
                  Client: {cancelModalInvoice.customer?.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this invoice will mark it as cancelled, prevent further payments, and reverse{' '}
              <strong className="text-slate-900">{formatINR(cancelModalInvoice.outstandingAmount)}</strong> from the customer's outstanding balance. This financial record will remain visible in audit logs.
            </p>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {cancelError}
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Keep Invoice
              </button>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Quick Record Payment Modal */}
      {/* ========================================================================= */}
      {paymentModalInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Record Payment Settlement
                  </h3>
                  <p className="text-xs text-slate-500">
                    For {paymentModalInvoice.invoiceNumber} • {paymentModalInvoice.customer?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Total Invoiced:</span>
                  <span className="font-bold text-slate-900">{formatINR(paymentModalInvoice.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Already Paid:</span>
                  <span className="font-bold text-emerald-600">{formatINR(paymentModalInvoice.paidAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Outstanding Due:</span>
                  <span className="font-extrabold text-rose-600 text-sm">
                    {formatINR(paymentModalInvoice.outstandingAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Settlement Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={paymentModalInvoice.outstandingAmount}
                    step={0.01}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none font-medium"
                  >
                    <option value="UPI">UPI Transfer</option>
                    <option value="BANK_TRANSFER">NEFT / RTGS / IMPS</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Ref / UTR</label>
                  <input
                    type="text"
                    value={paymentRef}
                    placeholder="e.g. UTR123456789 or UPI Ref"
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  placeholder="e.g. Received via HDFC Bank NEFT"
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{paymentSubmitting ? 'Recording...' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
