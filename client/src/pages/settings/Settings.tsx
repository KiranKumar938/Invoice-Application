import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  CreditCard,
  Bell,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  LayoutTemplate,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  Save,
  Undo2,
  ExternalLink,
  Lock,
  Calendar,
  Clock,
  DollarSign,
  Palette,
  Eye,
  Sliders,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { KlanvisionLogo } from '../../components/branding/KlanvisionLogo.js';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
  status: string;
  isCurrentUser: boolean;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Data States
  const [company, setCompany] = useState<any>({
    name: 'Klanvision Technologies Pvt. Ltd.',
    legalName: 'Klanvision Technologies Pvt. Ltd.',
    address: 'A-1, 3rd Floor, Gokul Garden, Sector-11, Dwarka',
    city: 'New Delhi',
    state: 'Delhi',
    postalCode: '110075',
    country: 'India',
    phone: '+91 98765 43210',
    email: 'info@klanvision.com',
    website: 'https://www.klanvision.com',
    gstin: '07AAACC81234F1Z5',
    pan: 'AAACC81234F',
    cin: 'U72900DL2019PTC123456',
    logoUrl: '',
  });

  const [settings, setSettings] = useState<any>({
    // GST
    gstRegisteredState: 'Delhi (07)',
    isCompositionScheme: false,
    reverseChargeApplicable: false,
    eInvoicingEnabled: false,
    gstVerificationStatus: 'CONFIGURED',
    einvoicingGspProvider: 'NIC',

    // Numbering
    invoicePrefix: 'INV-2025-',
    invoiceNumberPadding: 4,
    nextInvoiceNumber: 489,
    sequenceResetFrequency: 'NEVER',
    numberingFormat: 'PREFIX_SEQ',

    // Templates
    templateTheme: 'MODERN',
    primaryColor: '#0c1938',
    accentColor: '#2563eb',
    showCompanyLogo: true,
    showTaxSummary: true,
    showPaymentQr: true,
    footerText: 'This is a computer generated invoice and does not require a physical signature unless configured.',
    termsAndConditions: '1. Payment due within 30 days of invoice date.\n2. Interest @ 18% p.a. will be charged on overdue payments.\n3. Goods once sold will not be taken back.',
    notes: 'Thank you for your business! For any billing queries, please contact info@klanvision.com.',
    authorizedSignatory: 'Authorized Signatory',
    signatureUrl: '',

    // Payment Methods
    bankName: 'HDFC Bank',
    accountHolderName: 'Klanvision Technologies Pvt. Ltd.',
    bankAccountNumber: '50200012345678',
    bankIfsc: 'HDFC0001234',
    bankBranch: 'Dwarka Sector 11, New Delhi',
    upiId: 'klanvision@upi',
    upiQrUrl: '',
    enableUpi: true,
    enableNetBanking: true,
    enableCardPayments: false,
    enableCash: true,
    enableCheque: true,
    paymentInstructions: 'Please quote invoice number in transaction remarks for faster payment reconciliation.',

    // Notifications
    emailNotifications: true,
    smsNotifications: true,
    paymentReminders: true,
    overdueReminders: true,
    invoiceSentNotifications: true,
    reminderDaysBeforeDue: 3,
    overdueReminderDaysAfterDue: 7,
    smtpHost: 'smtp.mailgun.org',
    smtpPort: 587,
    smtpUser: 'billing@klanvision.com',
    smtpSenderEmail: 'billing@klanvision.com',
    scheduledJobsActive: true,
    lastReminderJobRunAt: null,

    // Regional
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    timeZone: 'Asia/Kolkata',
    defaultPaymentTerms: 30,
    defaultTaxRate: 18.0,
    roundOffEnabled: true,
  });

  const [gstVerification, setGstVerification] = useState<any>({
    isConfigured: true,
    isValidFormat: true,
    status: 'CONFIGURED',
    verifiedTradeName: 'KLANVISION TECHNOLOGIES PRIVATE LIMITED',
    verifiedDate: null,
  });

  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [userRole, setUserRole] = useState('ADMIN');
  const [permissions, setPermissions] = useState<any>({ canEditSettings: true, canManageUsers: true });

  // Action states
  const [copiedGstin, setCopiedGstin] = useState(false);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'ACCOUNTANT' });
  const [inviting, setInviting] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [res, usersRes] = await Promise.all([
        api.getSettings(),
        api.getTeamUsers().catch(() => null),
      ]);

      if (res.company) setCompany(res.company);
      if (res.settings) setSettings((prev: any) => ({ ...prev, ...res.settings }));
      if (res.gstVerification) setGstVerification(res.gstVerification);
      if (res.userRole) setUserRole(res.userRole);
      if (res.permissions) setPermissions(res.permissions);

      if (usersRes) {
        if (usersRes.users) setTeamUsers(usersRes.users);
        else if (Array.isArray(usersRes)) setTeamUsers(usersRes);
        if (usersRes.pendingInvites) setPendingInvites(usersRes.pendingInvites);
      }
      setIsDirty(false);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      showToast('error', err.message || 'Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCompanyChange = (key: string, value: any) => {
    setCompany((prev: any) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSettingsChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await api.updateSettings({
        company,
        settings,
      });
      showToast('success', 'Workspace settings saved and applied successfully!');
      setIsDirty(false);
      fetchSettings();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast('error', err.message || 'Failed to save settings. Please check required fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyGstin = () => {
    navigator.clipboard.writeText(company.gstin || '07AAACC81234F1Z5');
    setCopiedGstin(true);
    setTimeout(() => setCopiedGstin(false), 2000);
  };

  const handleVerifyGst = async () => {
    if (!company.gstin) {
      showToast('error', 'Please enter a GSTIN first before verifying');
      return;
    }
    try {
      setVerifyingGst(true);
      const res = await api.verifyGstin(company.gstin);
      showToast('success', res.message || 'GSTIN successfully verified with Government GSTN records!');
      fetchSettings();
    } catch (err: any) {
      showToast('error', err.message || 'GST verification failed. Please check the 15-character format.');
    } finally {
      setVerifyingGst(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setTestingEmail(true);
      const res = await api.sendNotificationTestEmail(settings.smtpSenderEmail || company.email);
      showToast('success', res.message || 'Test notification email dispatched successfully!');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send test email.');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTriggerReminders = async () => {
    try {
      setRunningReminders(true);
      const res = await api.triggerPaymentReminders();
      showToast('success', res.message || 'Payment reminders job completed successfully.');
      fetchSettings();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to trigger scheduled reminders scan.');
    } finally {
      setRunningReminders(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email) return;
    try {
      setInviting(true);
      const res = await api.inviteTeamMember(inviteForm);
      showToast('success', res.message || 'Team member invited successfully!');
      setInviteModalOpen(false);
      setInviteForm({ name: '', email: '', role: 'ACCOUNTANT' });
      fetchSettings();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to invite team member.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      showToast('success', `Team member role updated to ${newRole}`);
      fetchSettings();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update user role');
    }
  };

  const handleRevokeUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to revoke this user access to this workspace?')) return;
    try {
      await api.revokeUserAccess(userId);
      showToast('success', 'User access revoked successfully');
      fetchSettings();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to revoke user access');
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await api.deleteInvite(inviteId);
      showToast('success', 'Invitation cancelled successfully');
      fetchSettings();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel invitation');
    }
  };

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'gst', label: 'GST Settings', icon: ShieldCheck },
    { id: 'numbering', label: 'Invoice Numbering', icon: FileText },
    { id: 'templates', label: 'Invoice Templates', icon: LayoutTemplate },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'regional', label: 'Regional Preferences', icon: Globe },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading workspace settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold transition-all animate-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header and Global Save Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1938] tracking-tight">Settings</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Configure company profile, GST compliance, invoice numbering, and workspace preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              onClick={fetchSettings}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <Undo2 className="w-4 h-4" />
              <span>Discard</span>
            </button>
          )}

          <button
            onClick={handleSaveAll}
            disabled={saving || !permissions.canEditSettings}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
              saving || !permissions.canEditSettings
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 active:scale-95'
            }`}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          {/* Company Header & Branding Preview */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center">
                  <KlanvisionLogo variant="dark" size="lg" showTagline={false} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0c1938]">{company.legalName || company.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Corporate Headquarters & Registered Business Entity</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono font-semibold bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl border border-blue-200">
                <span>GSTIN: {company.gstin || '07AAACC81234F1Z5'}</span>
              </div>
            </div>

            {/* Profile Form Grid */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Company Legal Name *</label>
                  <input
                    type="text"
                    value={company.legalName || ''}
                    onChange={(e) => handleCompanyChange('legalName', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none font-medium text-slate-800"
                    placeholder="e.g. Klanvision Technologies Pvt. Ltd."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Trade / Display Name</label>
                  <input
                    type="text"
                    value={company.name || ''}
                    onChange={(e) => handleCompanyChange('name', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none font-medium text-slate-800"
                    placeholder="e.g. Klanvision"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Work Email Address *</label>
                    <input
                      type="email"
                      value={company.email || ''}
                      onChange={(e) => handleCompanyChange('email', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="billing@klanvision.com"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Phone Number *</label>
                    <input
                      type="text"
                      value={company.phone || ''}
                      onChange={(e) => handleCompanyChange('phone', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Official Website</label>
                  <input
                    type="text"
                    value={company.website || ''}
                    onChange={(e) => handleCompanyChange('website', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                    placeholder="https://www.klanvision.com"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Logo URL (Optional)</label>
                  <input
                    type="text"
                    value={company.logoUrl || ''}
                    onChange={(e) => handleCompanyChange('logoUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              {/* Right Column: Address and Registration */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Street Address *</label>
                  <input
                    type="text"
                    value={company.address || ''}
                    onChange={(e) => handleCompanyChange('address', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                    placeholder="A-1, 3rd Floor, Gokul Garden, Sector-11, Dwarka"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">City *</label>
                    <input
                      type="text"
                      value={company.city || ''}
                      onChange={(e) => handleCompanyChange('city', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="New Delhi"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">State *</label>
                    <input
                      type="text"
                      value={company.state || ''}
                      onChange={(e) => handleCompanyChange('state', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="Delhi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Postal / PIN Code *</label>
                    <input
                      type="text"
                      value={company.postalCode || ''}
                      onChange={(e) => handleCompanyChange('postalCode', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="110075"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Country</label>
                    <input
                      type="text"
                      value={company.country || 'India'}
                      onChange={(e) => handleCompanyChange('country', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">PAN (Income Tax)</label>
                    <input
                      type="text"
                      value={company.pan || ''}
                      onChange={(e) => handleCompanyChange('pan', e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 uppercase font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="AAACC81234F"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">CIN (Company Reg. No.)</label>
                    <input
                      type="text"
                      value={company.cin || ''}
                      onChange={(e) => handleCompanyChange('cin', e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 uppercase font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="U72900DL2019PTC123456"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GST SETTINGS */}
      {activeTab === 'gst' && (
        <div className="space-y-6">
          {/* Government Verification & Status Banner */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-blue-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#0c1938]">Government GSTN Status:</h3>
                    {gstVerification.status === 'GOVT_VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified Taxpayer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" /> User-Configured (Unverified)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {gstVerification.status === 'GOVT_VERIFIED'
                      ? `Verified for trade name: ${gstVerification.verifiedTradeName || company.legalName}. Standard GST rules active.`
                      : 'Distinguishes local user inputs from verified government portal registration. Verify below to synchronize status.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleVerifyGst}
                disabled={verifyingGst}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 whitespace-nowrap"
              >
                {verifyingGst ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{verifyingGst ? 'Verifying...' : 'Verify with GSTN Portal'}</span>
              </button>
            </div>

            {/* GST Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Goods and Services Tax Identification Number (GSTIN) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={15}
                      value={company.gstin || ''}
                      onChange={(e) => handleCompanyChange('gstin', e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 uppercase font-mono font-bold tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="07AAACC81234F1Z5"
                    />
                    <button
                      type="button"
                      onClick={handleCopyGstin}
                      className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl"
                      title="Copy GSTIN"
                    >
                      {copiedGstin ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    15-character statutory format: 2-digit State code, 10-char PAN, 1 entity digit, 'Z', 1 checksum.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Principal Place of Business State</label>
                  <input
                    type="text"
                    value={settings.gstRegisteredState || 'Delhi (07)'}
                    onChange={(e) => handleSettingsChange('gstRegisteredState', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                    placeholder="Delhi (07)"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Determines automatic CGST + SGST (intra-state) vs IGST (inter-state) calculation.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">GSP / E-Invoicing API Provider</label>
                  <select
                    value={settings.einvoicingGspProvider || 'NIC'}
                    onChange={(e) => handleSettingsChange('einvoicingGspProvider', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value="NIC">National Informatics Centre (NIC / Sandbox)</option>
                    <option value="CLEARTAX">ClearTax Enterprise GSP</option>
                    <option value="CYGNET">Cygnet Infotech</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Toggles and Scheme configuration */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                  <h4 className="font-bold text-slate-800">GST Scheme & Special Provisions</h4>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.isCompositionScheme || false}
                      onChange={(e) => handleSettingsChange('isCompositionScheme', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Composition Scheme</span>
                      <p className="text-[11px] text-slate-400">
                        Enable if registered under Section 10 Composition Levy (No ITC collection).
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reverseChargeApplicable || false}
                      onChange={(e) => handleSettingsChange('reverseChargeApplicable', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Reverse Charge Mechanism (RCM) Default</span>
                      <p className="text-[11px] text-slate-400">
                        Apply reverse charge liability by default on specific service categories.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.eInvoicingEnabled || false}
                      onChange={(e) => handleSettingsChange('eInvoicingEnabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Automated E-Invoicing (IRN & QR Generation)</span>
                      <p className="text-[11px] text-slate-400">
                        Generate official IRN hash and signed QR code upon invoice issuance.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> GST Compliance Assurance
                  </p>
                  <p>
                    All issued invoices generate compliant Indian Tax Invoices with SAC/HSN codes, itemized taxable values,
                    and CGST/SGST/IGST breakdown tables.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICE NUMBERING */}
      {activeTab === 'numbering' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0c1938]">Invoice Numbering & Sequence Safety</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure prefixes, sequential numbering rules, and atomic concurrency controls.
              </p>
            </div>

            {/* Live Sample Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Allocated Invoice Number</span>
                <p className="font-mono text-base font-extrabold text-blue-600 tracking-wide mt-0.5">
                  {settings.invoicePrefix || 'INV-2025-'}
                  {String(settings.nextInvoiceNumber || 1).padStart(settings.invoiceNumberPadding || 4, '0')}
                </p>
              </div>
              <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Collision Protected (Database Sequence Counter)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Invoice Prefix *</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix || 'INV-2025-'}
                    onChange={(e) => handleSettingsChange('invoicePrefix', e.target.value)}
                    className="w-full px-3.5 py-2.5 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                    placeholder="INV-2025- or KLN/25-26/"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Preceding characters for all new tax invoices.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Sequence Padding Length</label>
                  <select
                    value={settings.invoiceNumberPadding || 4}
                    onChange={(e) => handleSettingsChange('invoiceNumberPadding', parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value={3}>3 digits (e.g. 001)</option>
                    <option value={4}>4 digits (e.g. 0001)</option>
                    <option value={5}>5 digits (e.g. 00001)</option>
                    <option value={6}>6 digits (e.g. 000001)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Next Sequence Counter Number *</label>
                  <input
                    type="number"
                    min={1}
                    value={settings.nextInvoiceNumber || 1}
                    onChange={(e) => handleSettingsChange('nextInvoiceNumber', parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    System prevents setting this lower than existing issued invoices to avoid duplicate collisions.
                  </p>
                </div>
              </div>

              {/* Right Column: Policies & Rules */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Sequence Reset Frequency</label>
                  <select
                    value={settings.sequenceResetFrequency || 'NEVER'}
                    onChange={(e) => handleSettingsChange('sequenceResetFrequency', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value="NEVER">Never (Continuous sequential numbering)</option>
                    <option value="YEARLY">Yearly (Reset to 1 on April 1st Financial Year)</option>
                    <option value="MONTHLY">Monthly (Reset to 1 at start of each month)</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <span>Safe Concurrent Allocation Guaranteed</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Under multiple simultaneous invoice creations, Klanvision executes atomic sequence reservation
                    inside database transactions. Numbers cannot be skipped, duplicated, or silently reset backwards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVOICE TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0c1938]">Invoice Branding & Template Styling</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize colors, visual theme, headers, payment instructions, and terms and conditions.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs">
              {/* Left Column: Template Controls */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Template Layout Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'MODERN', label: 'Modern Navy', desc: 'Dark solid headers' },
                      { id: 'CLASSIC', label: 'Classic Slate', desc: 'Clean corporate borders' },
                      { id: 'MINIMAL', label: 'Minimalist', desc: 'Light & airy' },
                    ].map((thm) => (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => handleSettingsChange('templateTheme', thm.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          settings.templateTheme === thm.id
                            ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-bold text-slate-800">{thm.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{thm.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Primary Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.primaryColor || '#0c1938'}
                        onChange={(e) => handleSettingsChange('primaryColor', e.target.value)}
                        className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={settings.primaryColor || '#0c1938'}
                        onChange={(e) => handleSettingsChange('primaryColor', e.target.value)}
                        className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Secondary Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.accentColor || '#2563eb'}
                        onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                        className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={settings.accentColor || '#2563eb'}
                        onChange={(e) => handleSettingsChange('accentColor', e.target.value)}
                        className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showCompanyLogo ?? true}
                      onChange={(e) => handleSettingsChange('showCompanyLogo', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-700">Display Company Logo in Header</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showTaxSummary ?? true}
                      onChange={(e) => handleSettingsChange('showTaxSummary', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-700">Display Itemized GST Tax Summary Table</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showPaymentQr ?? true}
                      onChange={(e) => handleSettingsChange('showPaymentQr', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-700">Display Instant UPI QR Code in Bank Section</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Default Terms & Conditions</label>
                  <textarea
                    rows={3}
                    value={settings.termsAndConditions || ''}
                    onChange={(e) => handleSettingsChange('termsAndConditions', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800 leading-relaxed font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Default Invoice Notes & Bank Remarks</label>
                  <textarea
                    rows={2}
                    value={settings.notes || ''}
                    onChange={(e) => handleSettingsChange('notes', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800 leading-relaxed text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Footer Disclaimer / Notice</label>
                  <input
                    type="text"
                    value={settings.footerText || ''}
                    onChange={(e) => handleSettingsChange('footerText', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800 text-[11px]"
                  />
                </div>
              </div>

              {/* Right Column: Live Mini Invoice Mockup */}
              <div className="lg:col-span-5">
                <div className="sticky top-6 p-4 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Live Template Preview
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      {settings.templateTheme}
                    </span>
                  </div>

                  {/* Stylized Miniature Invoice */}
                  <div className="p-4 bg-white rounded-xl shadow border border-slate-200 text-[10px] space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        {settings.showCompanyLogo && (
                          <div className="font-extrabold text-[#0c1938] text-xs">KLANVISION</div>
                        )}
                        <p className="text-[9px] text-slate-400">{company.city}, India</p>
                      </div>
                      <div className="text-right">
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-bold text-white inline-block"
                          style={{ backgroundColor: settings.primaryColor || '#0c1938' }}
                        >
                          TAX INVOICE
                        </span>
                        <p className="font-mono text-[9px] text-slate-500 mt-1">INV-2025-0489</p>
                      </div>
                    </div>

                    <div className="h-10 bg-slate-50 rounded p-1.5 border border-slate-100 flex items-center justify-between text-slate-500">
                      <span>Enterprise Cloud Hosting</span>
                      <span className="font-bold text-slate-800">₹45,000.00</span>
                    </div>

                    {settings.showTaxSummary && (
                      <div className="p-1.5 bg-blue-50/50 rounded border border-blue-100 text-[9px] flex justify-between text-blue-800">
                        <span>GST @ 18% (CGST 9% + SGST 9%)</span>
                        <span className="font-bold">₹8,100.00</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                      <span>Total Amount:</span>
                      <span style={{ color: settings.accentColor || '#2563eb' }}>₹53,100.00</span>
                    </div>

                    <div className="text-[8px] text-slate-400 border-t border-slate-100 pt-1">
                      {settings.footerText || 'Computer generated tax invoice.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENT METHODS */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0c1938]">Payment Methods & Bank Accounts</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enable supported payment channels and store company bank and UPI instructions securely.
              </p>
            </div>

            {/* Supported Payment Toggles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'enableNetBanking', label: 'Bank Transfer (NEFT/RTGS/IMPS)', icon: Building2 },
                { key: 'enableUpi', label: 'UPI (QR Code & VPA ID)', icon: QrCode },
                { key: 'enableCardPayments', label: 'Credit / Debit Cards', icon: CreditCard },
                { key: 'enableCash', label: 'Cash Payments', icon: DollarSign },
                { key: 'enableCheque', label: 'Cheques / Demand Drafts', icon: FileText },
              ].map((m) => {
                const Icon = m.icon;
                const isEnabled = settings[m.key] ?? false;
                return (
                  <div
                    key={m.key}
                    onClick={() => handleSettingsChange(m.key, !isEnabled)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isEnabled
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isEnabled ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{m.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>
                );
              })}
            </div>

            {/* Bank Details Inputs */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Primary Bank Account Details</h3>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Bank Name *</label>
                  <input
                    type="text"
                    value={settings.bankName || ''}
                    onChange={(e) => handleSettingsChange('bankName', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800 font-medium"
                    placeholder="e.g. HDFC Bank"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Account Holder Name *</label>
                  <input
                    type="text"
                    value={settings.accountHolderName || ''}
                    onChange={(e) => handleSettingsChange('accountHolderName', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800 font-medium"
                    placeholder="e.g. Klanvision Technologies Pvt. Ltd."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Account Number *</label>
                    <input
                      type="text"
                      value={settings.bankAccountNumber || ''}
                      onChange={(e) => handleSettingsChange('bankAccountNumber', e.target.value)}
                      className="w-full px-3.5 py-2.5 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="50200012345678"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">IFSC Code *</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={settings.bankIfsc || ''}
                      onChange={(e) => handleSettingsChange('bankIfsc', e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 uppercase font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Branch Name & Address</label>
                  <input
                    type="text"
                    value={settings.bankBranch || ''}
                    onChange={(e) => handleSettingsChange('bankBranch', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                    placeholder="Dwarka Sector 11, New Delhi"
                  />
                </div>
              </div>

              {/* UPI & Remarks */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">UPI & Settlement Remarks</h3>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">UPI ID (VPA) *</label>
                  <input
                    type="text"
                    value={settings.upiId || ''}
                    onChange={(e) => handleSettingsChange('upiId', e.target.value)}
                    className="w-full px-3.5 py-2.5 font-mono font-bold text-blue-600 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="klanvision@upi"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Used for generating customer QR code on tax invoices.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Payment Instructions for Invoices</label>
                  <textarea
                    rows={4}
                    value={settings.paymentInstructions || ''}
                    onChange={(e) => handleSettingsChange('paymentInstructions', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none text-slate-800 leading-relaxed font-medium"
                    placeholder="Please quote invoice number in NEFT/RTGS transaction remarks for automated settlement."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: NOTIFICATIONS & REMINDERS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0c1938]">Automated Notifications & Delivery Providers</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure real SMTP email delivery, client invoice alerts, and automated scheduled reminders.
              </p>
            </div>

            {/* Scheduled Reminder Engine Status Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-slate-50 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Scheduled Payment Reminder Job:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Last scan executed:{' '}
                    {settings.lastReminderJobRunAt
                      ? new Date(settings.lastReminderJobRunAt).toLocaleString()
                      : 'Recently initialized'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleTriggerReminders}
                disabled={runningReminders}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
              >
                {runningReminders ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{runningReminders ? 'Running Scan...' : 'Run Reminder Job Now'}</span>
              </button>
            </div>

            {/* Notification Toggles and Interval Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Client Event Notifications</h3>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.invoiceSentNotifications ?? true}
                    onChange={(e) => handleSettingsChange('invoiceSentNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Invoice Sent Notifications</span>
                    <p className="text-[11px] text-slate-400">Send PDF copy and share link immediately upon issuing invoice.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.paymentReminders ?? true}
                    onChange={(e) => handleSettingsChange('paymentReminders', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Upcoming Due Reminders</span>
                    <p className="text-[11px] text-slate-400">Notify customers when invoices are approaching their due date.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.overdueReminders ?? true}
                    onChange={(e) => handleSettingsChange('overdueReminders', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Overdue Escalation Alerts</span>
                    <p className="text-[11px] text-slate-400">Dispatch escalation notices for invoices remaining unpaid past due date.</p>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Days Before Due Date</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={settings.reminderDaysBeforeDue || 3}
                      onChange={(e) => handleSettingsChange('reminderDaysBeforeDue', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Days After Due Date</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={settings.overdueReminderDaysAfterDue || 7}
                      onChange={(e) => handleSettingsChange('overdueReminderDaysAfterDue', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* SMTP Provider Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">SMTP Delivery Provider Configuration</h3>
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={testingEmail}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    {testingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{testingEmail ? 'Sending...' : 'Send Test Email'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1.5">SMTP Host *</label>
                    <input
                      type="text"
                      value={settings.smtpHost || ''}
                      onChange={(e) => handleSettingsChange('smtpHost', e.target.value)}
                      className="w-full px-3.5 py-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                      placeholder="smtp.mailgun.org"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Port</label>
                    <input
                      type="number"
                      value={settings.smtpPort || 587}
                      onChange={(e) => handleSettingsChange('smtpPort', parseInt(e.target.value, 10))}
                      className="w-full px-3.5 py-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">SMTP Username</label>
                  <input
                    type="text"
                    value={settings.smtpUser || ''}
                    onChange={(e) => handleSettingsChange('smtpUser', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    placeholder="postmaster@klanvision.com"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Sender Email Address *</label>
                  <input
                    type="email"
                    value={settings.smtpSenderEmail || ''}
                    onChange={(e) => handleSettingsChange('smtpSenderEmail', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                    placeholder="billing@klanvision.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#0c1938]">Team Members & Access Control</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage workspace users, assign role-based permissions, and invite collaborators.
                </p>
              </div>

              {permissions.canManageUsers && (
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            {/* Role Hierarchy Matrix Reference */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { role: 'OWNER', desc: 'Workspace transfer, financial deletion, all settings' },
                { role: 'ADMIN', desc: 'Team invites, settings, all billing and payments' },
                { role: 'ACCOUNTANT', desc: 'Invoices, customers, payments, detailed reports' },
                { role: 'VIEWER', desc: 'Strictly read-only inspection of reports and invoices' },
              ].map((r) => (
                <div key={r.role} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="font-extrabold text-blue-700 text-[11px]">{r.role}</span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">{r.desc}</p>
                </div>
              ))}
            </div>

            {/* Active Members Table */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0c1938] text-white flex items-center justify-center font-bold text-[11px]">
                            {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {u.isCurrentUser && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {permissions.canManageUsers && !u.isCurrentUser && u.role !== 'OWNER' ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="ACCOUNTANT">ACCOUNTANT</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-[11px]">
                            {u.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {permissions.canManageUsers && !u.isCurrentUser && u.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRevokeUser(u.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Revoke access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pending Invites Table */}
            {pendingInvites.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-700 text-xs">Pending Invitations ({pendingInvites.length})</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {pendingInvites.map((inv) => (
                        <tr key={inv.id} className="bg-slate-50/40">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{inv.email}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px]">
                              {inv.role} (Pending)
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteInvite(inv.id)}
                              className="text-xs text-rose-600 hover:underline font-semibold"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: REGIONAL PREFERENCES */}
      {activeTab === 'regional' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#0c1938]">Regional Preferences & Currency Formatting</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure default accounting currency, calendar formatting, and tax rounding behaviors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Reporting & Billing Currency</label>
                  <select
                    value={settings.currency || 'INR'}
                    onChange={(e) => {
                      const cur = e.target.value;
                      const symbols: Record<string, string> = {
                        INR: '₹',
                        USD: '$',
                        EUR: '€',
                        GBP: '£',
                        AED: 'د.إ',
                      };
                      handleSettingsChange('currency', cur);
                      handleSettingsChange('currencySymbol', symbols[cur] || '₹');
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                    <option value="USD">USD ($ - United States Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="AED">AED (د.إ - UAE Dirham)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Currency Symbol</label>
                  <input
                    type="text"
                    value={settings.currencySymbol || '₹'}
                    onChange={(e) => handleSettingsChange('currencySymbol', e.target.value)}
                    className="w-full px-3.5 py-2.5 font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Date Display Format</label>
                  <select
                    value={settings.dateFormat || 'DD/MM/YYYY'}
                    onChange={(e) => handleSettingsChange('dateFormat', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard - e.g. 16/10/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard - e.g. 10/16/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard - e.g. 2026-10-16)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">System Time Zone</label>
                  <select
                    value={settings.timeZone || 'Asia/Kolkata'}
                    onChange={(e) => handleSettingsChange('timeZone', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">America/New_York (EST -5:00)</option>
                    <option value="Europe/London">Europe/London (GMT +0:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Invoicing Calculation Defaults */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Default Payment Terms (Days)</label>
                  <select
                    value={settings.defaultPaymentTerms || 30}
                    onChange={(e) => handleSettingsChange('defaultPaymentTerms', parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value={0}>Due Immediately on Receipt</option>
                    <option value={15}>Net 15 Days</option>
                    <option value={30}>Net 30 Days</option>
                    <option value={45}>Net 45 Days</option>
                    <option value={60}>Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Default Product Tax Rate (%)</label>
                  <select
                    value={settings.defaultTaxRate || 18.0}
                    onChange={(e) => handleSettingsChange('defaultTaxRate', parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-slate-800 font-medium"
                  >
                    <option value={0}>0% (Nil / Exempt)</option>
                    <option value={5}>5% (Essential Commodities)</option>
                    <option value={12}>12% (Standard Lower)</option>
                    <option value={18}>18% (Standard Services / Goods)</option>
                    <option value={28}>28% (Luxury / De-merit)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.roundOffEnabled ?? true}
                      onChange={(e) => handleSettingsChange('roundOffEnabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Auto Round-Off Total Invoices</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Automatically rounds off fractional invoice grand totals to the nearest integer rupee according to
                        Indian GST guidelines.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-extrabold text-[#0c1938]">Invite Team Member</h3>
            <p className="text-xs text-slate-500 mt-1">Assign role permissions and send workspace access.</p>

            <form onSubmit={handleInviteUser} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  placeholder="colleague@klanvision.com"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold"
                >
                  <option value="ACCOUNTANT">ACCOUNTANT (Invoices, Customers, Payments & Reports)</option>
                  <option value="ADMIN">ADMIN (Workspace Management & Settings)</option>
                  <option value="VIEWER">VIEWER (Read-Only Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/25"
                >
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
