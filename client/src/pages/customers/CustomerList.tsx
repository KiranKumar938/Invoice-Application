import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  IndianRupee,
  Plus,
  Download,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  Edit2,
  ShieldCheck,
  FileText,
  CreditCard,
  AlertCircle,
  Archive,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { formatINR, isValidGSTIN } from '../../utils/currency.js';
import { useNavigate } from 'react-router-dom';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [customers, setCustomers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({
    totalCustomers: 12,
    totalCustomersChange: '+12% vs. last month',
    activeCustomers: 10,
    activeCustomersChange: '+10% vs. last month',
    totalOutstanding: 136420,
    totalOutstandingChange: '-6% vs. last month',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [stateFilter, setStateFilter] = useState('All States');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'invoices' | 'payments' | 'info'>('invoices');

  const [deleteModalCustomer, setDeleteModalCustomer] = useState<any | null>(null);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);

  // Form State
  const initialForm = {
    name: '',
    type: 'BUSINESS',
    email: '',
    phone: '',
    gstin: '',
    pan: '',
    billingAddress: '',
    billingCity: '',
    billingState: 'Delhi',
    billingPostalCode: '',
    billingCountry: 'India',
    sameAsBilling: true,
    shippingAddress: '',
    shippingCity: '',
    shippingState: 'Delhi',
    shippingPostalCode: '',
    shippingCountry: 'India',
    openingBalance: 0,
    status: 'ACTIVE',
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({
        search: search.trim(),
        status: statusFilter,
        state: stateFilter,
        page: pagination.page,
        sortBy,
        sortOrder,
      });

      setCustomers(res.customers || []);
      if (res.kpis) setKpis(res.kpis);
      if (res.pagination) setPagination(res.pagination);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, stateFilter, pagination.page, sortBy, sortOrder]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(customers.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await api.exportCustomersCsv({
        search: search.trim(),
        status: statusFilter,
        state: stateFilter,
      });
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export customers to CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData(initialForm);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      type: customer.type || 'BUSINESS',
      email: customer.email || '',
      phone: customer.phone || '',
      gstin: customer.gstin && customer.gstin !== 'Unregistered' ? customer.gstin : '',
      pan: customer.pan || '',
      billingAddress: customer.billingAddress || '',
      billingCity: customer.billingCity || '',
      billingState: customer.billingState || 'Delhi',
      billingPostalCode: customer.billingPostalCode || '',
      billingCountry: 'India',
      sameAsBilling: !customer.shippingAddress,
      shippingAddress: customer.shippingAddress || '',
      shippingCity: customer.shippingCity || '',
      shippingState: customer.shippingState || 'Delhi',
      shippingPostalCode: customer.shippingPostalCode || '',
      shippingCountry: 'India',
      openingBalance: customer.openingBalance || 0,
      status: customer.accountStatus || customer.status === 'Paid' ? 'ACTIVE' : 'ACTIVE',
      notes: customer.notes || '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
    setActionMenuOpen(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate GSTIN format if entered
    if (formData.gstin.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(formData.gstin.trim().toUpperCase())) {
        setFormError('Invalid GSTIN format. Must be a valid 15-character Indian GSTIN (e.g. 07AAACC81234F1Z5).');
        return;
      }
    }

    // Validate PAN format if entered
    if (formData.pan.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.pan.trim().toUpperCase())) {
        setFormError('Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gstin: formData.gstin.trim() ? formData.gstin.trim().toUpperCase() : null,
        pan: formData.pan.trim() ? formData.pan.trim().toUpperCase() : null,
        billingAddress: formData.billingAddress.trim(),
        billingCity: formData.billingCity.trim(),
        billingState: formData.billingState,
        billingPostalCode: formData.billingPostalCode.trim(),
        billingCountry: formData.billingCountry,
        shippingAddress: formData.sameAsBilling ? null : formData.shippingAddress.trim(),
        shippingCity: formData.sameAsBilling ? null : formData.shippingCity.trim(),
        shippingState: formData.sameAsBilling ? null : formData.shippingState,
        shippingPostalCode: formData.sameAsBilling ? null : formData.shippingPostalCode.trim(),
        shippingCountry: formData.sameAsBilling ? null : formData.shippingCountry,
        openingBalance: Number(formData.openingBalance) || 0,
        status: formData.status,
        notes: formData.notes.trim() || null,
      };

      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, payload);
      } else {
        await api.createCustomer(payload);
      }

      setIsFormModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (customerId: string) => {
    setActionMenuOpen(null);
    setIsDetailsDrawerOpen(true);
    setDetailsLoading(true);
    try {
      const data = await api.getCustomerById(customerId);
      setSelectedCustomer(data);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const promptDeleteCustomer = (customer: any) => {
    setActionMenuOpen(null);
    setDeleteModalCustomer(customer);
    setArchiveNotice(null);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteModalCustomer) return;
    try {
      await api.deleteCustomer(deleteModalCustomer.id);
      setDeleteModalCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      // If customer has invoices, safe archiving rule triggered
      setArchiveNotice(err.message || 'Cannot delete customer with existing invoices.');
    }
  };

  const handleArchiveCustomer = async () => {
    if (!deleteModalCustomer) return;
    try {
      await api.updateCustomer(deleteModalCustomer.id, { status: 'INACTIVE' });
      setDeleteModalCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Add Button (matching screenshot 5) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1938] tracking-tight">
            Customers
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">
            Manage your customer details and billing information.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* 3 KPI Cards (matching screenshot 5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{kpis.totalCustomers}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{kpis.totalCustomersChange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Customers</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{kpis.activeCustomers}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{kpis.activeCustomersChange}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {formatINR(kpis.totalOutstanding).replace('.00', '')}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-rose-600">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{kpis.totalOutstandingChange}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List Card (matching screenshot 5) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Top Filter and Actions Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-800">Customer List</h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="Search customers..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option>All Status</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>ACTIVE</option>
              <option>INACTIVE</option>
            </select>

            {/* State Dropdown */}
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option>All States</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={customers.length > 0 && selectedIds.length === customers.length}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">GSTIN</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Email</th>
                <th
                  onClick={() => handleSort('currentOutstanding')}
                  className="py-3.5 px-4 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Outstanding</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3.5 px-4 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No customers found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => handleSelectRow(c.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                          style={{ backgroundColor: c.badgeColor || '#2563eb' }}
                        >
                          {c.initials}
                        </div>
                        <div>
                          <span
                            onClick={() => handleViewDetails(c.id)}
                            className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors block"
                          >
                            {c.name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {c.type || 'Business'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {c.gstin}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{c.phone}</td>
                    <td className="py-3.5 px-4 text-slate-500">{c.email}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatINR(c.outstanding).replace('.00', '')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-bold text-[10px] ${
                          c.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === c.id ? null : c.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {actionMenuOpen === c.id && (
                        <div className="absolute right-4 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in">
                          <button
                            onClick={() => handleViewDetails(c.id)}
                            className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" /> View History & Info
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit Customer
                          </button>
                          <button
                            onClick={() => {
                              setActionMenuOpen(null);
                              navigate(`/invoices/new?customerId=${c.id}`);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
                          >
                            <Plus className="w-3.5 h-3.5" /> Create Invoice
                          </button>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            onClick={() => promptDeleteCustomer(c)}
                            className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete / Archive
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (matching screenshot 5) */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing {customers.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}-
            {Math.min(pagination.page * pagination.limit, pagination.total || customers.length)} of{' '}
            {pagination.total || customers.length} customers
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPagination((p) => ({ ...p, page: pageNum }))}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                  pagination.page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  page: Math.min(pagination.totalPages, p.page + 1),
                }))
              }
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 p-6 sm:p-8 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter customer tax details and addresses for GST billing.
                </p>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Customer Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Type</label>
                <div className="flex gap-3">
                  {['BUSINESS', 'INDIVIDUAL'].map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setFormData({ ...formData, type })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.type === type
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type === 'BUSINESS' ? 'Business / Corporate' : 'Individual / Consumer'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {formData.type === 'BUSINESS' ? 'Company / Business Name *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Acme Corporation Pvt Ltd"
                    className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="billing@company.com"
                    className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>

              {/* Phone, GSTIN & PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 07AAACC81234F1Z5"
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN (Optional)</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. AAACC8123F"
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block mb-2">Billing Address</span>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={formData.billingAddress}
                    onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                    placeholder="Street Address, Building, Floor *"
                    className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={formData.billingCity}
                      onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                      placeholder="City *"
                      className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                    />

                    <select
                      value={formData.billingState}
                      onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      required
                      value={formData.billingPostalCode}
                      onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                      placeholder="PIN Code *"
                      className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.sameAsBilling}
                    onChange={(e) => setFormData({ ...formData, sameAsBilling: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Shipping address is same as billing address</span>
                </label>

                {!formData.sameAsBilling && (
                  <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <input
                      type="text"
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                      placeholder="Shipping Street Address"
                      className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={formData.shippingCity}
                        onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                        placeholder="Shipping City"
                        className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                      />
                      <select
                        value={formData.shippingState}
                        onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formData.shippingPostalCode}
                        onChange={(e) => setFormData({ ...formData, shippingPostalCode: e.target.value })}
                        placeholder="Shipping PIN"
                        className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status & Opening Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none font-medium"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE (Archived)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Internal Remarks</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special billing instructions or delivery terms..."
                  className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAILS SIDE PANEL / DRAWER */}
      {isDetailsDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0c1938] text-white flex items-center justify-center font-bold text-sm">
                  {selectedCustomer?.name?.slice(0, 2).toUpperCase() || 'CU'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedCustomer?.name || 'Customer Profile'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full uppercase">
                      {selectedCustomer?.type || 'Business'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                      {selectedCustomer?.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(selectedCustomer)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Customer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDetailsDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            {detailsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Invoiced</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {formatINR(selectedCustomer?.summary?.totalInvoicedAmount || 0)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {selectedCustomer?.summary?.totalInvoices || 0} Invoices generated
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
                    <p className="text-[10px] uppercase font-bold text-amber-600">Current Outstanding</p>
                    <p className="text-base font-black text-amber-700 mt-0.5">
                      {formatINR(selectedCustomer?.summary?.currentOutstanding || 0)}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-1">
                      {selectedCustomer?.summary?.currentOutstanding > 0 ? 'Pending Payment' : 'Settled'}
                    </p>
                  </div>
                </div>

                {/* Last Invoice & Payment Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Last Invoice</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {selectedCustomer?.summary?.lastInvoice?.invoiceNumber || 'None yet'}
                    </p>
                    {selectedCustomer?.summary?.lastInvoice && (
                      <p className="text-[10px] text-slate-500">
                        {new Date(selectedCustomer.summary.lastInvoice.date).toLocaleDateString()} •{' '}
                        {formatINR(selectedCustomer.summary.lastInvoice.amount)}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Latest Payment</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {selectedCustomer?.summary?.latestPayment?.paymentNumber || 'None yet'}
                    </p>
                    {selectedCustomer?.summary?.latestPayment && (
                      <p className="text-[10px] text-emerald-600 font-semibold">
                        {new Date(selectedCustomer.summary.latestPayment.date).toLocaleDateString()} •{' '}
                        {formatINR(selectedCustomer.summary.latestPayment.amount)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details Tab Switcher */}
                <div className="flex border-b border-slate-100 text-xs">
                  {[
                    { id: 'invoices', label: `Invoices (${selectedCustomer?.invoices?.length || 0})` },
                    { id: 'payments', label: `Payments (${selectedCustomer?.payments?.length || 0})` },
                    { id: 'info', label: 'Company Info' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDetailsTab(tab.id as any)}
                      className={`pb-3 px-4 font-semibold transition-all border-b-2 -mb-px ${
                        activeDetailsTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: INVOICES HISTORY */}
                {activeDetailsTab === 'invoices' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800">Historical Invoices</span>
                      <button
                        onClick={() => navigate(`/invoices/new?customerId=${selectedCustomer?.id}`)}
                        className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Invoice
                      </button>
                    </div>

                    {selectedCustomer?.invoices?.length > 0 ? (
                      <div className="space-y-2.5">
                        {selectedCustomer.invoices.map((inv: any) => (
                          <div
                            key={inv.id}
                            onClick={() => navigate(`/invoices/${inv.id}/preview`)}
                            className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 cursor-pointer transition-colors flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Issued: {new Date(inv.issueDate).toLocaleDateString()} • Due:{' '}
                                {new Date(inv.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{formatINR(inv.totalAmount)}</p>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : inv.status === 'OVERDUE'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No invoices created for this client yet.</p>
                    )}
                  </div>
                )}

                {/* TAB 2: PAYMENTS HISTORY */}
                {activeDetailsTab === 'payments' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-800">Received Payments</span>

                    {selectedCustomer?.payments?.length > 0 ? (
                      <div className="space-y-2.5">
                        {selectedCustomer.payments.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{p.paymentNumber}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(p.paymentDate).toLocaleDateString()} • {p.paymentMethod}
                                {p.transactionReference && ` (${p.transactionReference})`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">{formatINR(p.amount)}</p>
                              <span className="text-[10px] text-slate-400">Cleared</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No recorded payments for this customer yet.</p>
                    )}
                  </div>
                )}

                {/* TAB 3: CONTACT & TAX DETAILS */}
                {activeDetailsTab === 'info' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Contact Details</span>
                        <p className="text-slate-800 font-medium mt-1 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedCustomer?.email}
                        </p>
                        <p className="text-slate-800 font-medium mt-1 flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedCustomer?.phone}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Tax Registration</span>
                        <p className="font-mono text-slate-900 mt-1">
                          GSTIN: <strong className="text-blue-700">{selectedCustomer?.gstin || 'Unregistered'}</strong>
                        </p>
                        {selectedCustomer?.pan && (
                          <p className="font-mono text-slate-900 mt-0.5">
                            PAN: <strong>{selectedCustomer.pan}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Billing Address</span>
                      <p className="text-slate-800 font-medium">
                        {selectedCustomer?.billingAddress}, {selectedCustomer?.billingCity},{' '}
                        {selectedCustomer?.billingState} - {selectedCustomer?.billingPostalCode},{' '}
                        {selectedCustomer?.billingCountry}
                      </p>

                      {selectedCustomer?.shippingAddress && (
                        <div className="pt-2 border-t border-slate-200/60 mt-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Shipping Address</span>
                          <p className="text-slate-800 font-medium mt-1">
                            {selectedCustomer.shippingAddress}, {selectedCustomer.shippingCity},{' '}
                            {selectedCustomer.shippingState} - {selectedCustomer.shippingPostalCode}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedCustomer?.notes && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Notes & Remarks</span>
                        <p className="text-slate-700 mt-1">{selectedCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => {
                  setIsDetailsDrawerOpen(false);
                  navigate(`/invoices/new?customerId=${selectedCustomer?.id}`);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Create New Invoice
              </button>
              <button
                onClick={() => setIsDetailsDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      {deleteModalCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Delete Customer: {deleteModalCustomer.name}
            </h3>

            {archiveNotice ? (
              <div className="my-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-2">
                <p className="font-semibold">{archiveNotice}</p>
                <p>
                  Would you like to archive this customer instead? Archiving preserves historical GST invoices and payment receipts while hiding the customer from active dropdowns.
                </p>
                <button
                  onClick={handleArchiveCustomer}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 mt-2"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive Customer (Set Inactive)
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-6">
                Are you sure you want to delete this customer? This action cannot be undone if they have no associated invoices.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setDeleteModalCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              {!archiveNotice && (
                <button
                  onClick={confirmDeleteCustomer}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow"
                >
                  Confirm Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
