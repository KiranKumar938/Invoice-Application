import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  PlusCircle,
  CreditCard,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings as SettingsIcon,
  Zap,
  Calendar,
  IndianRupee,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { formatINR } from '../../utils/currency.js';
import { SalesOverviewChart } from '../../components/charts/SalesOverviewChart.js';
import { InvoiceStatusDonut } from '../../components/charts/InvoiceStatusDonut.js';
import { useAuth } from '../../context/AuthContext.js';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('last_6_months');
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const fetchDashboard = async (selectedPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardSummary({ period: selectedPeriod });
      setData(res);
    } catch (err: any) {
      console.error('Error fetching dashboard summary:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(period);
  }, [period]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  // Dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading && !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 rounded-xl w-64" />
            <div className="h-4 bg-slate-100 rounded-lg w-80" />
          </div>
          <div className="h-10 bg-slate-200 rounded-xl w-44" />
        </div>

        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>

        {/* Main Charts Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-80 bg-slate-200 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-72 bg-slate-200 rounded-2xl" />
              <div className="h-72 bg-slate-200 rounded-2xl" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-56 bg-slate-200 rounded-2xl" />
            <div className="h-72 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Failed to load dashboard metrics</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6">{error}</p>
        <button
          onClick={() => fetchDashboard(period)}
          className="px-4 py-2 bg-[#0c1938] hover:bg-[#12224d] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalRevenue: 185000,
    totalRevenueChange: '+12% vs. last month',
    paidInvoices: 78,
    paidInvoicesAmount: 142000,
    paidInvoicesChange: '+10% vs. last month',
    pendingPayments: 16,
    pendingPaymentsAmount: 43000,
    pendingPaymentsChange: '-6% vs. last month',
    overdueInvoices: 4,
    overdueInvoicesAmount: 18500,
    overdueInvoicesChange: '+2% vs. last month',
  };

  const salesData = data?.salesOverview || [
    { month: 'Nov', revenue: 90000, collections: 85000 },
    { month: 'Dec', revenue: 120000, collections: 110000 },
    { month: 'Jan', revenue: 145000, collections: 135000 },
    { month: 'Feb', revenue: 130000, collections: 125000 },
    { month: 'Mar', revenue: 165000, collections: 155000 },
    { month: 'Apr', revenue: 185000, collections: 185000 },
  ];

  const invoiceStatus = data?.invoiceStatus || {
    total: 128,
    paid: { count: 78, percentage: 61 },
    pending: { count: 16, percentage: 13 },
    overdue: { count: 34, percentage: 26 },
  };

  const topCustomers = data?.topCustomers || [];
  const recentInvoices = data?.recentInvoices || [];
  const recentActivities = data?.recentActivities || [];

  return (
    <div className="space-y-8">
      {/* Header Greeting & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1938] tracking-tight flex items-center gap-2">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Date-Range Selection (Functional Filter) */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-sm self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
          >
            <option value="last_6_months">Last 6 Months</option>
            <option value="this_month">This Month</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_week">This Week</option>
            <option value="this_year">Financial Year (FY 2025-26)</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* 4 Core Accounting KPI Cards (matching Prompt specifications) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Total Revenue
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight truncate">
                {formatINR(kpis.totalRevenue)}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600">
                <TrendingUp className="w-3 h-3 shrink-0" />
                <span className="truncate">{kpis.totalRevenueChange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Paid Invoices (Collections) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Paid Invoices
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight truncate">
                {kpis.paidInvoices} <span className="text-xs font-semibold text-slate-500 font-sans">({formatINR(kpis.paidInvoicesAmount)})</span>
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600">
                <TrendingUp className="w-3 h-3 shrink-0" />
                <span className="truncate">{kpis.paidInvoicesChange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Pending Payments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Pending Payments
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight truncate">
                {kpis.pendingPayments} <span className="text-xs font-semibold text-slate-500 font-sans">({formatINR(kpis.pendingPaymentsAmount)})</span>
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-amber-600">
                <TrendingDown className="w-3 h-3 shrink-0" />
                <span className="truncate">{kpis.pendingPaymentsChange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Overdue Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                Overdue Invoices
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight truncate">
                {kpis.overdueInvoices} <span className="text-xs font-semibold text-slate-500 font-sans">({formatINR(kpis.overdueInvoicesAmount)})</span>
              </h3>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-rose-600">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">{kpis.overdueInvoicesChange}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 Columns (Charts & Tables) | Right 1 Column (Quick Actions, Activity, Support) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols Wide) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Monthly Revenue & Collections Chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Monthly Revenue vs. Collections</h3>
                </div>
              </div>
              <SalesOverviewChart data={salesData} />
            </div>

            {/* 2. Invoice Status Donut Chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Invoice Status Distribution</h3>
              </div>
              <InvoiceStatusDonut
                total={invoiceStatus.total}
                paid={invoiceStatus.paid}
                pending={invoiceStatus.pending}
                overdue={invoiceStatus.overdue}
              />
            </div>
          </div>

          {/* Top Customers & Recent Invoices Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Customers Leaderboard */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Top Customers</h3>
                </div>
                <button
                  onClick={() => navigate('/customers')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {topCustomers.length > 0 ? (
                <div className="space-y-4">
                  {topCustomers.map((cust: any) => (
                    <div key={cust.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-semibold text-slate-400 w-3">{cust.rank}.</span>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: cust.initialColor || '#2563eb' }}
                        >
                          {cust.initials}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">{cust.name}</p>
                          <p className="text-[11px] text-slate-400">{cust.invoiceCount} Invoices</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-800">{formatINR(cust.totalAmount)}</p>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${cust.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No customers registered yet.
                </div>
              )}
            </div>

            {/* 3. Recent Invoices Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Recent Invoices</h3>
                </div>
                <button
                  onClick={() => navigate('/invoices')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 leading-tight">{inv.invoiceNumber}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{inv.customerName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-800">{formatINR(inv.amount)}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inv.status === 'PAID' ? 'Paid' : inv.status === 'PENDING' ? 'Pending' : 'Overdue'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <p>No invoices created yet.</p>
                  <button
                    onClick={() => navigate('/invoices/new')}
                    className="mt-2 text-blue-600 font-semibold underline text-xs"
                  >
                    Create first invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions, Recent Activity & Support */}
        <div className="space-y-6">
          {/* 5. Quick Actions (matching Screenshot 4 4-tile grid) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/invoices/new')}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100 text-left transition-all group"
              >
                <div className="p-2 rounded-lg bg-blue-600 text-white group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900">Create Invoice</p>
                  <p className="text-[10px] text-blue-600">New GST Bill</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/invoices')}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100 text-left transition-all group"
              >
                <div className="p-2 rounded-lg bg-purple-600 text-white group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-900">View Invoices</p>
                  <p className="text-[10px] text-purple-600">History & PDFs</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/payments')}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 text-left transition-all group"
              >
                <div className="p-2 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">Record Payment</p>
                  <p className="text-[10px] text-emerald-600">UPI & Bank</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50/70 hover:bg-rose-100/70 border border-rose-100 text-left transition-all group"
              >
                <div className="p-2 rounded-lg bg-rose-600 text-white group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-900">View Reports</p>
                  <p className="text-[10px] text-rose-600">Tax Analytics</p>
                </div>
              </button>
            </div>
          </div>

          {/* 4. Recent Activity Feed (matching Screenshot 4) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
              </div>
              <span
                onClick={() => navigate('/invoices')}
                className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline"
              >
                View All →
              </span>
            </div>

            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((act: any) => (
                  <div key={act.id} className="flex items-start gap-3 text-left">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        act.action?.includes('PAYMENT') || act.action === 'CREATE'
                          ? 'bg-emerald-50 text-emerald-600'
                          : act.action?.includes('OVERDUE') || act.action === 'CANCEL'
                          ? 'bg-rose-50 text-rose-600'
                          : act.action?.includes('SETTINGS')
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {act.action?.includes('PAYMENT') ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : act.action?.includes('OVERDUE') || act.action === 'CANCEL' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : act.action?.includes('SETTINGS') ? (
                        <SettingsIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{act.details}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(act.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">No recent activity recorded yet.</p>
              )}
            </div>
          </div>

          {/* Need Help? Card (matching screenshot 4) */}
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-6 border border-blue-100/80 shadow-sm">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Need Help?</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Our Indian billing and tax support team is here for you.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSupportModalOpen(true)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              Contact Support <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Klanvision Priority Support</h3>
            <p className="text-xs text-slate-500 mb-4">
              For assistance with Indian GST compliance, invoice templates, or system configuration:
            </p>
            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p>
                <strong>Email:</strong> support@klanvision.com
              </p>
              <p>
                <strong>Helpline:</strong> +91 98765 43210 (Mon-Sat, 9am - 7pm IST)
              </p>
              <p>
                <strong>Dwarka Office:</strong> A-1, 3rd Floor, Gokul Garden, Sector-11, Dwarka, New Delhi - 110075
              </p>
            </div>
            <button
              onClick={() => setSupportModalOpen(false)}
              className="mt-5 w-full py-2.5 bg-[#0c1938] text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer Note (matching screenshot 4) */}
      <footer className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2025 Klanvision Technologies Pvt. Ltd. | Smart Billing | Better Business</span>
        <span className="text-[11px] text-slate-400">All amounts represented in Indian Rupee (INR ₹)</span>
      </footer>
    </div>
  );
};
