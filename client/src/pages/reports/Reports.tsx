import React, { useState, useEffect } from 'react';
import {
  Coins,
  Receipt,
  FileCheck2,
  Calendar,
  ChevronDown,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  FileText,
  Calculator,
  Percent,
  IndianRupee,
  Clock,
  Download,
  Printer,
  Users,
  Package,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { formatINR, formatDate } from '../../utils/currency.js';
import { MonthlySalesBarChart } from '../../components/charts/MonthlySalesBarChart.js';
import { InvoiceStatusDonut } from '../../components/charts/InvoiceStatusDonut.js';

export const Reports: React.FC = () => {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [periodPreset, setPeriodPreset] = useState('all_time');
  const [periodLabel, setPeriodLabel] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [chartRange, setChartRange] = useState('Last 6 Months');

  // Detailed Reports Tab State
  const [activeTab, setActiveTab] = useState<
    'collections' | 'receivables' | 'aging' | 'customer_sales' | 'gst' | 'product_sales'
  >('collections');

  // Load Customers for Filter Dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await api.getCustomers();
        setCustomers(res.customers || []);
      } catch (err) {
        console.error('Failed to load customers for reports filter:', err);
      }
    };
    loadCustomers();
  }, []);

  // Fetch Reports Data
  const fetchReports = async () => {
    setLoading(true);
    try {
      const filterParams = {
        period: periodPreset,
        chartRange,
        startDate: periodPreset === 'custom' ? startDate : undefined,
        endDate: periodPreset === 'custom' ? endDate : undefined,
        customerId: selectedCustomerId || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      };

      const [summaryRes, detailedRes] = await Promise.all([
        api.getReportsSummary(filterParams),
        api.getReportsDetailed(filterParams),
      ]);

      setSummaryData(summaryRes);
      setDetailedData(detailedRes);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [periodPreset, chartRange, selectedCustomerId, selectedStatus, startDate, endDate]);

  const handlePeriodChange = (preset: string) => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setPeriodLabel(
        `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(
          'en-US',
          { month: 'short', day: 'numeric', year: 'numeric' }
        )}`
      );
    } else if (preset === 'last_30_days') {
      setPeriodLabel('Last 30 Days');
    } else if (preset === 'this_quarter') {
      setPeriodLabel('This Quarter');
    } else if (preset === 'this_year') {
      setPeriodLabel(`Calendar Year ${now.getFullYear()}`);
    } else if (preset === 'custom') {
      setPeriodLabel('Custom Date Range');
    } else {
      setPeriodLabel('All Time');
    }
  };

  // CSV Export for the currently active detailed report
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await api.exportReportCsv(activeTab, {
        period: periodPreset,
        startDate: periodPreset === 'custom' ? startDate : undefined,
        endDate: periodPreset === 'custom' ? endDate : undefined,
      });
    } catch (err) {
      console.error('Failed to export CSV report:', err);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const metrics = summaryData?.metrics || {
    totalSales: 0,
    totalSalesChange: '+12% vs. prior period',
    totalTax: 0,
    totalTaxChange: '+8% vs. prior period',
    totalInvoices: 0,
    totalInvoicesChange: '+15% vs. prior period',
    totalGst: 0,
    totalDiscount: 0,
    totalAmount: 0,
    avgInvoiceValue: 0,
  };

  const monthlySales = summaryData?.monthlySales || [];
  const statusDist = summaryData?.statusDistribution || {
    total: 0,
    paid: { count: 0, percentage: 0 },
    pending: { count: 0, percentage: 0 },
    overdue: { count: 0, percentage: 0 },
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {/* Top Header & Global Filter Bar (hidden on print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1938] tracking-tight">Reports</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-time sales, GST tax summaries, collections, aging, and product performance.
          </p>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Preset Dropdown */}
          <div className="relative">
            <select
              value={periodPreset}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="appearance-none inline-flex items-center gap-2 px-3.5 py-2 pr-8 bg-white text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-sm hover:bg-slate-50 focus:outline-none"
            >
              <option value="all_time">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Customer Filter */}
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="px-3 py-2 bg-white text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-sm focus:outline-none"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-sm focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="ISSUED">Issued / Unpaid</option>
            <option value="OVERDUE">Overdue</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
            title="Export Active Report to CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            title="Print Reports"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (when Custom is selected) */}
      {periodPreset === 'custom' && (
        <div className="no-print p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3 text-xs shadow-sm">
          <span className="font-semibold text-slate-500">From Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
          />
          <span className="font-semibold text-slate-500">To Date:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
          />
        </div>
      )}

      {/* 3 Top Metric KPI Cards (matching screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Sales</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{formatINR(metrics.totalSales)}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>↑ {metrics.totalSalesChange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Tax */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Tax</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{formatINR(metrics.totalTax)}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>↑ {metrics.totalTaxChange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Invoices</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{metrics.totalInvoices}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>↑ {metrics.totalInvoicesChange}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Monthly Sales Bar Chart & Invoice Status Donut Chart (matching screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 break-inside-avoid">
        {/* Monthly Sales (58% width) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Monthly Sales</h3>
            </div>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 focus:outline-none"
            >
              <option>Last 6 Months</option>
              <option>This Year</option>
            </select>
          </div>
          {monthlySales.length > 0 ? (
            <MonthlySalesBarChart data={monthlySales} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">No monthly sales data</div>
          )}
        </div>

        {/* Invoice Status Donut (42% width) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Invoice Status Distribution</h3>
          </div>
          <InvoiceStatusDonut
            total={statusDist.total}
            paid={statusDist.paid}
            pending={statusDist.pending}
            overdue={statusDist.overdue}
          />
        </div>
      </div>

      {/* Additional Details Summary Card (matching screenshot) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm break-inside-avoid">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Financial Summary Details</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total GST */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total GST Tax</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">{formatINR(metrics.totalGst)}</h4>
            </div>
          </div>

          {/* Total Discount */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Discounts</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">{formatINR(metrics.totalDiscount)}</h4>
            </div>
          </div>

          {/* Total Amount */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Net Sales Volume</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">{formatINR(metrics.totalAmount)}</h4>
            </div>
          </div>

          {/* Avg. Invoice Value */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Avg. Invoice Value</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">{formatINR(metrics.avgInvoiceValue)}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED REPORTS SECTION (Interactive Tab Switcher) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'collections', label: 'Collections & Payments', icon: Receipt },
              { id: 'receivables', label: 'Outstanding Receivables', icon: IndianRupee },
              { id: 'aging', label: 'Overdue Aging', icon: Clock },
              { id: 'customer_sales', label: 'Customer-wise Sales', icon: Users },
              { id: 'gst', label: 'GST Summary', icon: Calculator },
              { id: 'product_sales', label: 'Product & Service Sales', icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 self-end md:self-auto shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Active Table</span>
          </button>
        </div>

        {/* Tab 1: Collection & Payment Report */}
        {activeTab === 'collections' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1938] text-white font-bold">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">UTR / Ref #</th>
                  <th className="py-3 px-4">Invoices Settled</th>
                  <th className="py-3 px-4 text-right">Amount Collected</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedData?.collectionsReport?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No collections recorded in this period.
                    </td>
                  </tr>
                ) : (
                  detailedData?.collectionsReport?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.paymentNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.customerName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {p.paymentMethod.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.transactionReference}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{p.invoicesSettled}</td>
                      <td
                        className={`py-3 px-4 text-right font-black ${
                          p.status === 'REVERSED' ? 'text-slate-400 line-through' : 'text-emerald-600'
                        }`}
                      >
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'REVERSED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Outstanding Receivables Report */}
        {activeTab === 'receivables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1938] text-white font-bold">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-center">Invoices</th>
                  <th className="py-3 px-4 text-right">Total Invoiced</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Overdue Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedData?.receivablesReport?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No customer receivables records found.
                    </td>
                  </tr>
                ) : (
                  detailedData?.receivablesReport?.map((r: any) => (
                    <tr key={r.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.customerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{r.customerGstin}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">{r.invoicesCount}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">{formatINR(r.totalInvoiced)}</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatINR(r.totalPaid)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatINR(r.outstandingAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">
                        {r.overdueAmount > 0 ? formatINR(r.overdueAmount) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'Clear'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'Overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Overdue Aging Report */}
        {activeTab === 'aging' && (
          <div className="space-y-4 p-4">
            {/* 5 Aging Buckets Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Current (Not Due)</span>
                <p className="text-base font-black text-emerald-700 mt-1">
                  {formatINR(detailedData?.agingReport?.buckets?.current ?? 0)}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800">1 - 30 Days</span>
                <p className="text-base font-black text-amber-700 mt-1">
                  {formatINR(detailedData?.agingReport?.buckets?.days1To30 ?? 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                <span className="text-[10px] font-bold uppercase text-orange-800">31 - 60 Days</span>
                <p className="text-base font-black text-orange-700 mt-1">
                  {formatINR(detailedData?.agingReport?.buckets?.days31To60 ?? 0)}
                </p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-800">61 - 90 Days</span>
                <p className="text-base font-black text-rose-700 mt-1">
                  {formatINR(detailedData?.agingReport?.buckets?.days61To90 ?? 0)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl border border-red-300">
                <span className="text-[10px] font-bold uppercase text-red-900">90+ Days</span>
                <p className="text-base font-black text-red-800 mt-1">
                  {formatINR(detailedData?.agingReport?.buckets?.days90Plus ?? 0)}
                </p>
              </div>
            </div>

            {/* Overdue Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c1938] text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-center">Days Overdue</th>
                    <th className="py-2.5 px-3 text-center">Aging Bucket</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailedData?.agingReport?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No overdue or pending invoices.
                      </td>
                    </tr>
                  ) : (
                    detailedData?.agingReport?.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{item.invoiceNumber}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.customerName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(item.dueDate)}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600">{item.daysOverdue} days</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.bucket === 'Current'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.bucket}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatINR(item.outstandingAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Customer-wise Sales Report */}
        {activeTab === 'customer_sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1938] text-white font-bold">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-center">Invoices</th>
                  <th className="py-3 px-4 text-right">Gross Subtotal</th>
                  <th className="py-3 px-4 text-right">Discounts</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">GST Total</th>
                  <th className="py-3 px-4 text-right">Net Sales</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedData?.customerSalesReport?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No sales recorded for customers in this period.
                    </td>
                  </tr>
                ) : (
                  detailedData?.customerSalesReport?.map((cs: any) => (
                    <tr key={cs.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{cs.customerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{cs.customerGstin}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">{cs.invoicesCount}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatINR(cs.grossSubtotal)}</td>
                      <td className="py-3 px-4 text-right text-emerald-600">
                        {cs.totalDiscount > 0 ? `- ${formatINR(cs.totalDiscount)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">{formatINR(cs.taxableAmount)}</td>
                      <td className="py-3 px-4 text-right text-blue-600 font-semibold">{formatINR(cs.totalTax)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatINR(cs.netSales)}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {cs.outstandingBalance > 0 ? formatINR(cs.outstandingBalance) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: GST Summary Report */}
        {activeTab === 'gst' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1938] text-white font-bold">
                <tr>
                  <th className="py-3 px-4">GST Rate Slab</th>
                  <th className="py-3 px-4 text-center">Items Count</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">CGST</th>
                  <th className="py-3 px-4 text-right">SGST</th>
                  <th className="py-3 px-4 text-right">IGST</th>
                  <th className="py-3 px-4 text-right">Total Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedData?.gstSummaryReport?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No GST records found in this period.
                    </td>
                  </tr>
                ) : (
                  detailedData?.gstSummaryReport?.map((s: any) => (
                    <tr key={s.rate} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-blue-600">{s.rateLabel}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-600">{s.itemsCount}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatINR(s.taxableAmount)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatINR(s.cgstAmount)}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatINR(s.sgstAmount)}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{formatINR(s.igstAmount)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatINR(s.totalTaxAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: Product & Service Sales Report */}
        {activeTab === 'product_sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1938] text-white font-bold">
                <tr>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4 text-center">HSN/SAC</th>
                  <th className="py-3 px-4 text-center">Invoices</th>
                  <th className="py-3 px-4 text-center">Qty Sold</th>
                  <th className="py-3 px-4 text-right">Total Discounts</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">Tax Amount</th>
                  <th className="py-3 px-4 text-right">Total Sales Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedData?.productSalesReport?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No product sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  detailedData?.productSalesReport?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">{p.hsnSacCode || '-'}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-600">{p.invoicesCount}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{p.quantitySold}</td>
                      <td className="py-3 px-4 text-right text-emerald-600">
                        {p.totalDiscount > 0 ? `- ${formatINR(p.totalDiscount)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatINR(p.taxableAmount)}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-600 font-semibold">{formatINR(p.taxAmount)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatINR(p.totalSales)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
