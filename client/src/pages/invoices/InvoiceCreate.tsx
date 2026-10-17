import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Calendar,
  Building,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Save,
  X,
  CreditCard,
  Percent,
  Sparkles,
  Truck,
  RotateCcw,
  Check,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { formatINR, numberToIndianWords, isValidGSTIN } from '../../utils/currency.js';
import { INDIAN_STATES } from '../../utils/indianStates.js';
import { useAuth } from '../../context/AuthContext.js';
import { KlanvisionLogo } from '../../components/branding/KlanvisionLogo.js';

interface LineItemForm {
  id?: string;
  productId?: string;
  description: string;
  hsnSacCode: string;
  quantity: number | '';
  unitPrice: number | '';
  discountPercent: number | '';
  gstRate: number;
}

interface NewCustomerForm {
  name: string;
  type: 'BUSINESS' | 'INDIVIDUAL';
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  sameAsBilling: boolean;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
}

const PAYMENT_TERMS_OPTIONS = [
  { label: 'Due on Receipt', days: 0 },
  { label: 'Net 15 (15 Days)', days: 15 },
  { label: 'Net 30 (30 Days)', days: 30 },
  { label: 'Net 45 (45 Days)', days: 45 },
  { label: 'Net 60 (60 Days)', days: 60 },
  { label: 'Custom Date', days: -1 },
];

export const InvoiceCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id: editInvoiceId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');
  const { tenant } = useAuth();

  // Master Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [nextInvoiceNo, setNextInvoiceNo] = useState('INV-2025-0001');

  // Page States
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // SECTION 1: Customer Details State
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [placeOfSupply, setPlaceOfSupply] = useState('Delhi');

  // SECTION 2: Invoice Details State
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTermDays, setSelectedTermDays] = useState(30);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [taxMode, setTaxMode] = useState<'AUTO' | 'FORCE_INTRA' | 'FORCE_INTER' | 'EXEMPT'>('AUTO');
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);

  // SECTION 3: Line Items State
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      description: '',
      hsnSacCode: '998314',
      quantity: 1,
      unitPrice: 1000,
      discountPercent: 0,
      gstRate: 18,
    },
  ]);
  const [itemErrors, setItemErrors] = useState<{ [index: number]: { [key: string]: string } }>({});

  // SECTION 4: Notes & Terms
  const [notes, setNotes] = useState('Payment via NEFT/RTGS or UPI is preferred.');
  const [terms, setTerms] = useState(
    '1. Payment is due within agreed terms.\n2. Overdue payments will incur 18% annual interest.\n3. Goods or services once delivered are non-refundable.'
  );

  // New Customer Modal Form State
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
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
    sameAsBilling: true,
    shippingAddress: '',
    shippingCity: '',
    shippingState: 'Delhi',
    shippingPostalCode: '',
  });
  const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  // Unsaved changes listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load initial data and existing invoice if editing
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        setPageLoading(true);
        const [custRes, prodRes, seqRes, settingsRes] = await Promise.all([
          api.getCustomers(),
          api.getProducts(),
          api.getNextInvoiceNumber(),
          api.getSettings().catch(() => null),
        ]);

        const loadedCustomers = custRes.customers || [];
        setCustomers(loadedCustomers);
        setProducts(prodRes || []);
        if (settingsRes) {
          setSettings(settingsRes);
          if (settingsRes.notes) setNotes(settingsRes.notes);
          if (settingsRes.termsAndConditions) setTerms(settingsRes.termsAndConditions);
          if (typeof settingsRes.roundOffEnabled === 'boolean') {
            setRoundOffEnabled(settingsRes.roundOffEnabled);
          }
        }

        if (seqRes?.nextInvoiceNumber) {
          setNextInvoiceNo(seqRes.nextInvoiceNumber);
        }

        // If editing an existing invoice (draft or amendment)
        if (editInvoiceId) {
          const inv = await api.getInvoiceById(editInvoiceId);
          if (inv) {
            setCustomerId(inv.customerId);
            setIssueDate(inv.issueDate ? inv.issueDate.split('T')[0] : '');
            setDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : '');
            setNextInvoiceNo(inv.invoiceNumber);
            if (inv.notes) setNotes(inv.notes);
            if (inv.terms) setTerms(inv.terms);
            if (inv.customer?.billingState) {
              setPlaceOfSupply(inv.customer.billingState);
            }
            if (inv.lineItems && inv.lineItems.length > 0) {
              setLineItems(
                inv.lineItems.map((li: any) => ({
                  id: li.id,
                  productId: li.productId || undefined,
                  description: li.description,
                  hsnSacCode: li.hsnSacCode || '998314',
                  quantity: li.quantity,
                  unitPrice: li.unitPrice,
                  discountPercent: li.discountPercent || 0,
                  gstRate: li.gstRate || 18,
                }))
              );
            }
          }
        } else if (!customerId && loadedCustomers.length > 0) {
          const defaultCust = preselectedCustomerId
            ? loadedCustomers.find((c: any) => c.id === preselectedCustomerId) || loadedCustomers[0]
            : loadedCustomers[0];
          setCustomerId(defaultCust.id);
          setPlaceOfSupply(defaultCust.billingState || 'Delhi');
        }
      } catch (err) {
        console.error('Failed to load invoice dependencies:', err);
        setFormError('Failed to load customers, catalog items, or invoice numbering sequence.');
      } finally {
        setPageLoading(false);
      }
    };

    loadDependencies();
  }, [editInvoiceId]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  // Sync place of supply when customer selection changes
  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    setIsDirty(true);
    const cust = customers.find((c) => c.id === newCustId);
    if (cust?.billingState) {
      setPlaceOfSupply(cust.billingState);
    }
  };

  // Determine supply type (Intra-state vs Inter-state)
  const companyState = tenant?.state || 'Delhi';
  const isInterState = useMemo(() => {
    if (taxMode === 'FORCE_INTRA') return false;
    if (taxMode === 'FORCE_INTER') return true;
    if (taxMode === 'EXEMPT') return false;
    return companyState.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase();
  }, [taxMode, companyState, placeOfSupply]);

  // Handle payment term change and auto-adjust due date
  const handlePaymentTermChange = (days: number) => {
    setSelectedTermDays(days);
    setIsDirty(true);
    if (days >= 0 && issueDate) {
      const issue = new Date(issueDate);
      if (!isNaN(issue.getTime())) {
        issue.setDate(issue.getDate() + days);
        setDueDate(issue.toISOString().split('T')[0]);
      }
    }
  };

  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    setIsDirty(true);
    if (selectedTermDays >= 0 && newDate) {
      const issue = new Date(newDate);
      if (!isNaN(issue.getTime())) {
        issue.setDate(issue.getDate() + selectedTermDays);
        setDueDate(issue.toISOString().split('T')[0]);
      }
    }
  };

  const handleDueDateChange = (newDate: string) => {
    setDueDate(newDate);
    setSelectedTermDays(-1); // Switch to Custom
    setIsDirty(true);
  };

  // Line Item Handlers
  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: '',
        hsnSacCode: '998314',
        quantity: 1,
        unitPrice: 1000,
        discountPercent: 0,
        gstRate: taxMode === 'EXEMPT' ? 0 : 18,
      },
    ]);
    setIsDirty(true);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateLineItem = (index: number, field: keyof LineItemForm, value: any) => {
    setIsDirty(true);
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Validate on the fly
    setItemErrors((prev) => {
      const rowErrors = { ...(prev[index] || {}) };
      if (field === 'description') {
        if (!value || !String(value).trim()) {
          rowErrors.description = 'Item description is required';
        } else {
          delete rowErrors.description;
        }
      }
      if (field === 'quantity') {
        if (value === '' || Number(value) <= 0) {
          rowErrors.quantity = 'Qty must be > 0';
        } else {
          delete rowErrors.quantity;
        }
      }
      if (field === 'unitPrice') {
        if (value === '' || Number(value) < 0) {
          rowErrors.unitPrice = 'Price must be ≥ 0';
        } else {
          delete rowErrors.unitPrice;
        }
      }
      if (field === 'discountPercent') {
        if (Number(value) < 0 || Number(value) > 100) {
          rowErrors.discountPercent = '0% - 100%';
        } else {
          delete rowErrors.discountPercent;
        }
      }
      return { ...prev, [index]: rowErrors };
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setIsDirty(true);
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        description: prod.name,
        hsnSacCode: prod.hsnSacCode || '998314',
        unitPrice: prod.unitPrice,
        gstRate: taxMode === 'EXEMPT' ? 0 : prod.gstRate,
        discountPercent: prod.discount || 0,
      };
      return updated;
    });

    // Clear description/qty errors for this item
    setItemErrors((prev) => {
      const row = { ...(prev[index] || {}) };
      delete row.description;
      delete row.unitPrice;
      return { ...prev, [index]: row };
    });
  };

  // Live Decimal-Safe Client Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const rateBreakdown: { [rate: number]: { taxable: number; tax: number } } = {};

    lineItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const lineGross = Math.round(qty * price * 100) / 100;

      const discPerc = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
      const lineDisc = Math.round(((lineGross * discPerc) / 100) * 100) / 100;
      const lineTaxable = Math.round((lineGross - lineDisc) * 100) / 100;

      const rate = taxMode === 'EXEMPT' ? 0 : Math.max(0, Number(item.gstRate) || 0);

      let lineTax = 0;
      if (isInterState) {
        const igst = Math.round(((lineTaxable * rate) / 100) * 100) / 100;
        igstTotal = Math.round((igstTotal + igst) * 100) / 100;
        lineTax = igst;
      } else {
        const halfRate = rate / 2;
        const cgst = Math.round(((lineTaxable * halfRate) / 100) * 100) / 100;
        const sgst = Math.round(((lineTaxable * halfRate) / 100) * 100) / 100;
        cgstTotal = Math.round((cgstTotal + cgst) * 100) / 100;
        sgstTotal = Math.round((sgstTotal + sgst) * 100) / 100;
        lineTax = Math.round((cgst + sgst) * 100) / 100;
      }

      if (rate > 0) {
        if (!rateBreakdown[rate]) rateBreakdown[rate] = { taxable: 0, tax: 0 };
        rateBreakdown[rate].taxable = Math.round((rateBreakdown[rate].taxable + lineTaxable) * 100) / 100;
        rateBreakdown[rate].tax = Math.round((rateBreakdown[rate].tax + lineTax) * 100) / 100;
      }

      subtotal = Math.round((subtotal + lineGross) * 100) / 100;
      discountTotal = Math.round((discountTotal + lineDisc) * 100) / 100;
      taxableAmount = Math.round((taxableAmount + lineTaxable) * 100) / 100;
    });

    const taxTotal = isInterState ? igstTotal : Math.round((cgstTotal + sgstTotal) * 100) / 100;
    const netBeforeRound = Math.round((taxableAmount + taxTotal) * 100) / 100;

    let roundOff = 0;
    let totalAmount = netBeforeRound;

    if (roundOffEnabled) {
      const rounded = Math.round(netBeforeRound);
      roundOff = Math.round((rounded - netBeforeRound) * 100) / 100;
      totalAmount = rounded;
    }

    return {
      subtotal,
      discountTotal,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      taxTotal,
      roundOff,
      totalAmount,
      rateBreakdown,
    };
  }, [lineItems, isInterState, taxMode, roundOffEnabled]);

  // Form Validation
  const validateForm = (): boolean => {
    setFormError(null);

    if (!customerId) {
      setFormError('Please select a customer for this invoice.');
      return false;
    }

    if (!issueDate) {
      setFormError('Please enter a valid invoice issue date.');
      return false;
    }

    if (!dueDate) {
      setFormError('Please enter a valid invoice due date.');
      return false;
    }

    if (new Date(dueDate) < new Date(issueDate)) {
      setFormError('Due date cannot be earlier than the invoice issue date.');
      return false;
    }

    if (lineItems.length === 0) {
      setFormError('At least one line item is required.');
      return false;
    }

    const errors: { [index: number]: { [key: string]: string } } = {};
    let hasItemErrors = false;

    lineItems.forEach((item, index) => {
      const rowErr: { [key: string]: string } = {};
      if (!item.description.trim()) {
        rowErr.description = 'Description is required';
        hasItemErrors = true;
      }
      if (item.quantity === '' || Number(item.quantity) <= 0) {
        rowErr.quantity = 'Qty must be > 0';
        hasItemErrors = true;
      }
      if (item.unitPrice === '' || Number(item.unitPrice) < 0) {
        rowErr.unitPrice = 'Price must be ≥ 0';
        hasItemErrors = true;
      }
      if (Number(item.discountPercent) < 0 || Number(item.discountPercent) > 100) {
        rowErr.discountPercent = '0% - 100%';
        hasItemErrors = true;
      }
      if (Object.keys(rowErr).length > 0) {
        errors[index] = rowErr;
      }
    });

    if (hasItemErrors) {
      setItemErrors(errors);
      setFormError('Please fix validation errors in the line items table.');
      return false;
    }

    return true;
  };

  // Submit Handler (Draft or Issued)
  const handleSubmit = async (status: 'DRAFT' | 'ISSUED') => {
    if (!validateForm()) return;

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const payload = {
        customerId,
        issueDate,
        dueDate,
        status,
        placeOfSupply,
        isInterState,
        roundOffEnabled,
        notes,
        terms,
        lineItems: lineItems.map((item) => ({
          productId: item.productId || null,
          description: item.description.trim(),
          hsnSacCode: item.hsnSacCode || '998314',
          quantity: parseFloat(String(item.quantity)),
          unitPrice: parseFloat(String(item.unitPrice)),
          discountPercent: parseFloat(String(item.discountPercent)) || 0,
          gstRate: taxMode === 'EXEMPT' ? 0 : parseFloat(String(item.gstRate)),
        })),
      };

      let result;
      if (editInvoiceId) {
        result = await api.updateInvoice(editInvoiceId, payload);
      } else {
        result = await api.createInvoice(payload);
      }

      setIsDirty(false);

      if (status === 'ISSUED') {
        navigate(`/invoices/${result.id}/preview`);
      } else {
        setFormSuccess(`Draft saved successfully with reference ${result.invoiceNumber}!`);
        if (!editInvoiceId) {
          navigate(`/invoices/${result.id}/preview`);
        }
      }
    } catch (err: any) {
      console.error('Invoice submission failed:', err);
      setFormError(err.message || 'Failed to generate invoice. Please check entries and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Customer In-Page Modal Handler
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewCustomerError(null);

    if (!newCustomer.name.trim()) {
      setNewCustomerError('Customer or business name is required.');
      return;
    }
    if (!newCustomer.email.trim() || !newCustomer.email.includes('@')) {
      setNewCustomerError('Valid email address is required.');
      return;
    }
    if (!newCustomer.phone.trim() || newCustomer.phone.length < 10) {
      setNewCustomerError('Valid 10-digit phone number is required.');
      return;
    }
    if (!newCustomer.billingAddress.trim()) {
      setNewCustomerError('Billing address is required.');
      return;
    }
    if (!newCustomer.billingCity.trim()) {
      setNewCustomerError('Billing city is required.');
      return;
    }
    if (!newCustomer.billingPostalCode.trim()) {
      setNewCustomerError('Postal PIN code is required.');
      return;
    }

    if (newCustomer.gstin.trim() && !isValidGSTIN(newCustomer.gstin.trim())) {
      setNewCustomerError('Invalid GSTIN format. Example: 07AAACC81234F1Z5.');
      return;
    }

    setNewCustomerSubmitting(true);
    try {
      const customerPayload = {
        name: newCustomer.name.trim(),
        type: newCustomer.type,
        email: newCustomer.email.trim().toLowerCase(),
        phone: newCustomer.phone.trim(),
        gstin: newCustomer.gstin.trim() ? newCustomer.gstin.trim().toUpperCase() : null,
        pan: newCustomer.pan.trim() ? newCustomer.pan.trim().toUpperCase() : null,
        billingAddress: newCustomer.billingAddress.trim(),
        billingCity: newCustomer.billingCity.trim(),
        billingState: newCustomer.billingState,
        billingPostalCode: newCustomer.billingPostalCode.trim(),
        billingCountry: 'India',
        shippingAddress: newCustomer.sameAsBilling
          ? newCustomer.billingAddress.trim()
          : newCustomer.shippingAddress.trim() || null,
        shippingCity: newCustomer.sameAsBilling
          ? newCustomer.billingCity.trim()
          : newCustomer.shippingCity.trim() || null,
        shippingState: newCustomer.sameAsBilling
          ? newCustomer.billingState
          : newCustomer.shippingState || null,
        shippingPostalCode: newCustomer.sameAsBilling
          ? newCustomer.billingPostalCode.trim()
          : newCustomer.shippingPostalCode.trim() || null,
        shippingCountry: 'India',
      };

      const createdCust = await api.createCustomer(customerPayload);

      // Append to customers list and auto-select without losing any form state!
      setCustomers((prev) => [createdCust, ...prev]);
      setCustomerId(createdCust.id);
      setPlaceOfSupply(createdCust.billingState || 'Delhi');
      setShowAddCustomerModal(false);

      // Reset modal fields
      setNewCustomer({
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
        sameAsBilling: true,
        shippingAddress: '',
        shippingCity: '',
        shippingState: 'Delhi',
        shippingPostalCode: '',
      });

      setFormSuccess(`New customer "${createdCust.name}" added and selected without losing invoice data!`);
    } catch (err: any) {
      setNewCustomerError(err.message || 'Failed to create customer');
    } finally {
      setNewCustomerSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      navigate('/invoices');
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading invoice workspace & tax configurations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Top Navigation & Action Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleCancelClick}
            aria-label="Back to Invoices"
            className="p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-[#0c1938] tracking-tight">
                {editInvoiceId ? 'Edit Draft / Tax Invoice' : 'Create GST Tax Invoice'}
              </h1>
              <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Sequence: {nextInvoiceNo}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Accurate place-of-supply tax engine, instant line item calculations, and verifiable GST compliance.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-200/70 hover:bg-slate-300/80 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>{submitting ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('ISSUED')}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Issuing Invoice...' : 'Generate & Issue Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <div className="flex-1 font-medium">{formError}</div>
          <button onClick={() => setFormError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <div className="flex-1 font-medium">{formSuccess}</div>
          <button onClick={() => setFormSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: Customer Details */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Customer Details & Place of Supply
              </h2>
              <p className="text-xs text-slate-500">
                Select registered client or create a new one instantly without losing invoice draft data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Customer Dropdown */}
          <div className="md:col-span-6 space-y-2">
            <label htmlFor="customerSelect" className="block text-xs font-bold text-slate-700">
              Select Customer <span className="text-rose-500">*</span>
            </label>
            <select
              id="customerSelect"
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium transition-all"
            >
              <option value="">-- Choose Existing Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.gstin ? `(${c.gstin})` : '(Unregistered / B2C)'} • {c.billingState || 'Delhi'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Populates billing address, GSTIN, and determines base tax rules.
            </p>
          </div>

          {/* Place of Supply Dropdown */}
          <div className="md:col-span-6 space-y-2">
            <label htmlFor="placeOfSupplySelect" className="block text-xs font-bold text-slate-700">
              Place of Supply (Destination State) <span className="text-rose-500">*</span>
            </label>
            <select
              id="placeOfSupplySelect"
              value={placeOfSupply}
              onChange={(e) => {
                setPlaceOfSupply(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium transition-all"
            >
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state} {state.toLowerCase() === companyState.toLowerCase() ? '(Intra-State Supply)' : '(Inter-State Supply)'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Supplier State: <span className="font-semibold text-slate-700">{companyState}</span>.
              Affects whether CGST+SGST or IGST applies.
            </p>
          </div>
        </div>

        {/* Selected Customer Card Details */}
        {selectedCustomer ? (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
              <div>
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                  {selectedCustomer.name}
                </span>
                <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-700">
                  {selectedCustomer.type || 'BUSINESS'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Tax Treatment:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isInterState
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isInterState ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              {/* Billing Address */}
              <div>
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-500" /> Billing Address
                </p>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedCustomer.billingAddress || 'Address on record'}
                </p>
                <p className="text-slate-500">
                  {selectedCustomer.billingCity}, {selectedCustomer.billingState} - {selectedCustomer.billingPostalCode}
                </p>
              </div>

              {/* Shipping Address */}
              <div>
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-500" /> Shipping / Consignee Address
                </p>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedCustomer.shippingAddress || selectedCustomer.billingAddress || 'Same as billing'}
                </p>
                <p className="text-slate-500">
                  {selectedCustomer.shippingCity || selectedCustomer.billingCity},{' '}
                  {selectedCustomer.shippingState || selectedCustomer.billingState} -{' '}
                  {selectedCustomer.shippingPostalCode || selectedCustomer.billingPostalCode}
                </p>
              </div>

              {/* Tax & Contact Identifiers */}
              <div className="space-y-1.5 bg-white/80 p-3 rounded-xl border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">GSTIN:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedCustomer.gstin || 'Unregistered / B2C'}
                  </span>
                </div>
                {selectedCustomer.pan && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAN:</span>
                    <span className="font-mono font-medium text-slate-800">{selectedCustomer.pan}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-700">{selectedCustomer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-700">{selectedCustomer.phone}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
            No customer selected. Choose an existing customer from above or click "+ Add New Customer".
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: Invoice Details */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Invoice Dates, Terms & Tax Configuration
            </h2>
            <p className="text-xs text-slate-500">
              Set issuance date, payment credit window, and specify tax treatment rules.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {/* Invoice Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Invoice Number</label>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-blue-600 flex items-center justify-between">
              <span>{nextInvoiceNo}</span>
              <span className="text-[10px] text-slate-400 font-sans font-medium">Auto-Allocated</span>
            </div>
            <p className="text-[10px] text-slate-400">Guaranteed sequential & collision-free on issuance.</p>
          </div>

          {/* Issue Date */}
          <div className="space-y-1.5">
            <label htmlFor="issueDateInput" className="block text-xs font-bold text-slate-700">
              Invoice Issue Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="issueDateInput"
              type="date"
              value={issueDate}
              onChange={(e) => handleIssueDateChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium transition-all"
            />
          </div>

          {/* Payment Terms */}
          <div className="space-y-1.5">
            <label htmlFor="paymentTermsSelect" className="block text-xs font-bold text-slate-700">
              Payment Terms
            </label>
            <select
              id="paymentTermsSelect"
              value={selectedTermDays}
              onChange={(e) => handlePaymentTermChange(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium transition-all"
            >
              {PAYMENT_TERMS_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="dueDateInput" className="block text-xs font-bold text-slate-700">
              Payment Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="dueDateInput"
              type="date"
              value={dueDate}
              min={issueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border outline-none font-medium transition-all ${
                dueDate && issueDate && new Date(dueDate) < new Date(issueDate)
                  ? 'border-rose-400 bg-rose-50/50 text-rose-800'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            {dueDate && issueDate && new Date(dueDate) < new Date(issueDate) && (
              <p className="text-[10px] text-rose-600 font-semibold">Due date cannot be before issue date</p>
            )}
          </div>
        </div>

        {/* Tax Mode and Round-Off Controls */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <Percent className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <label htmlFor="taxRegimeSelect" className="block text-xs font-bold text-slate-800">
                Tax Treatment Override
              </label>
              <select
                id="taxRegimeSelect"
                value={taxMode}
                onChange={(e) => {
                  setTaxMode(e.target.value as any);
                  setIsDirty(true);
                }}
                className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 outline-none"
              >
                <option value="AUTO">Auto (Dynamic from Place of Supply)</option>
                <option value="FORCE_INTRA">Force Intra-State (CGST + SGST)</option>
                <option value="FORCE_INTER">Force Inter-State (IGST)</option>
                <option value="EXEMPT">SEZ / Zero Rated / Exempt (0% Tax)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">Rupee Round-Off Adjustment</p>
                <p className="text-[11px] text-slate-500">
                  {roundOffEnabled ? 'Round off total to the nearest Rupee' : 'Keep exact paise without rounding'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={roundOffEnabled}
                onChange={(e) => {
                  setRoundOffEnabled(e.target.checked);
                  setIsDirty(true);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: Line Items & Services */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Line Items & Services
              </h2>
              <p className="text-xs text-slate-500">
                Pick products from your catalog or specify custom descriptions, HSN, rates, and tax.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Line Items Container */}
        <div className="space-y-4">
          {lineItems.map((item, index) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            const lineGross = Math.round(qty * price * 100) / 100;
            const discPerc = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
            const lineDisc = Math.round(((lineGross * discPerc) / 100) * 100) / 100;
            const lineTaxable = Math.round((lineGross - lineDisc) * 100) / 100;
            const rate = taxMode === 'EXEMPT' ? 0 : Math.max(0, Number(item.gstRate) || 0);
            const lineTax = Math.round(((lineTaxable * rate) / 100) * 100) / 100;
            const lineTotal = Math.round((lineTaxable + lineTax) * 100) / 100;

            const err = itemErrors[index] || {};

            return (
              <div
                key={index}
                className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4 transition-all hover:border-slate-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Item Description & Catalog Pick */}
                  <div className="md:col-span-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Item Description / Catalog <span className="text-rose-500">*</span>
                      </label>
                      {products.length > 0 && (
                        <span className="text-[10px] text-blue-600 font-semibold">Or pick from catalog</span>
                      )}
                    </div>

                    {products.length > 0 && (
                      <select
                        value={item.productId || ''}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 focus:border-blue-500 outline-none"
                      >
                        <option value="">-- Choose from Catalog (Auto-fill) --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.unitPrice} • {p.gstRate}% GST)
                          </option>
                        ))}
                      </select>
                    )}

                    <input
                      type="text"
                      value={item.description}
                      placeholder="e.g. Cloud Infrastructure Setup & Maintenance"
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className={`w-full px-3 py-2 text-xs bg-white rounded-xl border outline-none font-medium transition-all ${
                        err.description ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {err.description && (
                      <p className="text-[10px] text-rose-600 font-semibold">{err.description}</p>
                    )}
                  </div>

                  {/* HSN / SAC Code */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">HSN / SAC</label>
                    <input
                      type="text"
                      value={item.hsnSacCode}
                      placeholder="998314"
                      onChange={(e) => updateLineItem(index, 'hsnSacCode', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 text-center">
                      Qty <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className={`w-full px-2 py-2 text-xs text-center bg-white rounded-xl border outline-none font-semibold ${
                        err.quantity ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {err.quantity && <p className="text-[10px] text-rose-600 text-center">{err.quantity}</p>}
                  </div>

                  {/* Unit Rate */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Unit Rate (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className={`w-full px-3 py-2 text-xs bg-white rounded-xl border outline-none font-semibold ${
                        err.unitPrice ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
                      }`}
                    />
                    {err.unitPrice && <p className="text-[10px] text-rose-600">{err.unitPrice}</p>}
                  </div>

                  {/* Discount % */}
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 text-center">Disc %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={item.discountPercent}
                      onChange={(e) => updateLineItem(index, 'discountPercent', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-2 py-2 text-xs text-center bg-white rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold"
                    />
                  </div>

                  {/* GST Rate */}
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 text-center">GST %</label>
                    <select
                      disabled={taxMode === 'EXEMPT'}
                      value={item.gstRate}
                      onChange={(e) => updateLineItem(index, 'gstRate', parseFloat(e.target.value))}
                      className="w-full px-1.5 py-2 text-xs text-center bg-white rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                </div>

                {/* Sub-row with live arithmetic calculations & delete button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-3 border-t border-slate-200/60 gap-2">
                  <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                    <span>
                      Gross: <strong className="text-slate-800">{formatINR(lineGross)}</strong>
                    </span>
                    {lineDisc > 0 && (
                      <span className="text-emerald-600 font-semibold">
                        Discount ({item.discountPercent}%): -{formatINR(lineDisc)}
                      </span>
                    )}
                    <span>
                      Taxable: <strong className="text-slate-800">{formatINR(lineTaxable)}</strong>
                    </span>
                    <span>
                      {isInterState ? `IGST (${item.gstRate}%)` : `CGST+SGST (${item.gstRate}%)`}:{' '}
                      <strong className="text-slate-800">{formatINR(lineTax)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Line Total</span>
                      <span className="text-sm font-extrabold text-[#0c1938]">
                        {formatINR(lineTotal)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={lineItems.length === 1}
                      onClick={() => removeLineItem(index)}
                      title={lineItems.length === 1 ? 'At least one line item is required' : 'Delete item'}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: Summary & Additional Details */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Notes, Terms, and Bank Instructions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Notes & Bank Details Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" /> Payment Instructions & Bank Details
            </h3>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setIsDirty(true);
              }}
              placeholder="e.g. Bank Account details, UPI ID, or settlement instructions..."
              className="w-full p-3.5 text-xs bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none leading-relaxed"
            />
            {settings?.bankName && (
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/70 text-[11px] text-blue-900 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Bank:</span> <strong>{settings.bankName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">A/C:</span>{' '}
                  <strong className="font-mono">{settings.bankAccountNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">IFSC:</span>{' '}
                  <strong className="font-mono">{settings.bankIfsc}</strong>
                </div>
                <div>
                  <span className="text-slate-500">UPI:</span>{' '}
                  <strong className="font-mono">{settings.upiId || 'klanvision@upi'}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Terms & Conditions Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Terms and Conditions
            </h3>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => {
                setTerms(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Standard billing terms, interest on overdue payments, dispute jurisdiction..."
              className="w-full p-3.5 text-xs bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* Right Side: Financial Calculation Summary Box */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 sticky top-28">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Financial Summary</span>
              <span className="text-[10px] text-slate-400 font-medium">All figures in INR (₹)</span>
            </h3>

            {/* Subtotal */}
            <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-50">
              <span>Gross Subtotal</span>
              <span className="font-semibold text-slate-900">{formatINR(calculations.subtotal)}</span>
            </div>

            {/* Discounts */}
            {calculations.discountTotal > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 py-1 border-b border-slate-50">
                <span>Total Item Discounts</span>
                <span className="font-semibold">- {formatINR(calculations.discountTotal)}</span>
              </div>
            )}

            {/* Net Taxable Amount */}
            <div className="flex justify-between text-xs text-slate-700 py-1.5 border-b border-slate-100 font-medium">
              <span>Net Taxable Value</span>
              <span className="font-bold text-slate-900">{formatINR(calculations.taxableAmount)}</span>
            </div>

            {/* GST Tax Slabs / Breakdown */}
            <div className="space-y-1.5 py-1 border-b border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>GST Breakdown</span>
                <span className="font-semibold text-slate-700">
                  {isInterState ? 'IGST Applicable' : 'CGST + SGST Split'}
                </span>
              </div>

              {isInterState ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Integrated GST (IGST)</span>
                  <span className="font-semibold text-slate-900">{formatINR(calculations.igstTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Central GST (CGST)</span>
                    <span className="font-semibold text-slate-900">{formatINR(calculations.cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>State GST (SGST)</span>
                    <span className="font-semibold text-slate-900">{formatINR(calculations.sgstTotal)}</span>
                  </div>
                </>
              )}

              {/* Rate slabs breakdown chips */}
              {Object.keys(calculations.rateBreakdown).length > 1 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {Object.entries(calculations.rateBreakdown).map(([rateStr, slab]) => (
                    <span
                      key={rateStr}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-mono"
                    >
                      {rateStr}% slab: Taxable {formatINR(slab.taxable)} • Tax {formatINR(slab.tax)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Round-off Adjustment */}
            {roundOffEnabled && (
              <div className="flex justify-between text-xs text-slate-500 py-1 border-b border-slate-50">
                <span>Round-off Adjustment</span>
                <span className="font-mono">
                  {calculations.roundOff >= 0 ? `+${calculations.roundOff.toFixed(2)}` : calculations.roundOff.toFixed(2)}
                </span>
              </div>
            )}

            {/* Grand Total */}
            <div className="pt-3 border-t-2 border-slate-900 space-y-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-sm font-black text-slate-900 tracking-tight">Total Payable Amount</p>
                  <p className="text-[10px] text-slate-400">Inclusive of all taxes</p>
                </div>
                <span className="text-2xl font-black text-blue-600 tracking-tight">
                  {formatINR(calculations.totalAmount)}
                </span>
              </div>

              {/* Amount in Words */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  Amount in Words
                </span>
                <span className="font-medium italic leading-relaxed">
                  {numberToIndianWords(calculations.totalAmount)}
                </span>
              </div>
            </div>

            {/* Big Action Buttons */}
            <div className="pt-4 space-y-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('ISSUED')}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Issuing Tax Invoice...' : 'Generate & Issue Tax Invoice'}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('DRAFT')}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save as Draft</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: Add New Customer In-Page Modal */}
      {/* ========================================================================= */}
      {showAddCustomerModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="newCustomerModalTitle"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="newCustomerModalTitle" className="text-lg font-bold text-slate-900">
                    Add New Customer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Invoice draft state will remain preserved while this customer is added.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newCustomerError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{newCustomerError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer / Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="e.g. Nexus Corp Technologies"
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Type</label>
                  <select
                    value={newCustomer.type}
                    onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none font-medium"
                  >
                    <option value="BUSINESS">Business (B2B)</option>
                    <option value="INDIVIDUAL">Individual (B2C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="billing@nexuscorp.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={newCustomer.gstin}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value.toUpperCase() })}
                    placeholder="07AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PAN (Optional)</label>
                  <input
                    type="text"
                    value={newCustomer.pan}
                    onChange={(e) => setNewCustomer({ ...newCustomer, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Billing Address Details */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Billing Address</p>
                <div>
                  <input
                    type="text"
                    required
                    value={newCustomer.billingAddress}
                    onChange={(e) => setNewCustomer({ ...newCustomer, billingAddress: e.target.value })}
                    placeholder="Street Address, Building, Floor..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={newCustomer.billingCity}
                      onChange={(e) => setNewCustomer({ ...newCustomer, billingCity: e.target.value })}
                      placeholder="New Delhi"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
                    <select
                      value={newCustomer.billingState}
                      onChange={(e) => setNewCustomer({ ...newCustomer, billingState: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">PIN Code</label>
                    <input
                      type="text"
                      required
                      value={newCustomer.billingPostalCode}
                      onChange={(e) => setNewCustomer({ ...newCustomer, billingPostalCode: e.target.value })}
                      placeholder="110001"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address Checkbox */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={newCustomer.sameAsBilling}
                    onChange={(e) => setNewCustomer({ ...newCustomer, sameAsBilling: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Shipping address is identical to billing address</span>
                </label>
              </div>

              {!newCustomer.sameAsBilling && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Shipping Address</p>
                  <input
                    type="text"
                    value={newCustomer.shippingAddress}
                    onChange={(e) => setNewCustomer({ ...newCustomer, shippingAddress: e.target.value })}
                    placeholder="Shipping Street Address, Warehouse..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newCustomer.shippingCity}
                      onChange={(e) => setNewCustomer({ ...newCustomer, shippingCity: e.target.value })}
                      placeholder="City"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200"
                    />
                    <select
                      value={newCustomer.shippingState}
                      onChange={(e) => setNewCustomer({ ...newCustomer, shippingState: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newCustomer.shippingPostalCode}
                      onChange={(e) => setNewCustomer({ ...newCustomer, shippingPostalCode: e.target.value })}
                      placeholder="PIN"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCustomerSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {newCustomerSubmitting ? 'Saving...' : 'Save & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Cancel Confirmation Modal */}
      {/* ========================================================================= */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Discard unsaved changes?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You have unsaved changes in this invoice form. Are you sure you want to discard your edits and leave?
            </p>
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDirty(false);
                  setShowCancelModal(false);
                  navigate('/invoices');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Live Invoice Preview Modal */}
      {/* ========================================================================= */}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Printable Tax Invoice Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Invoice Document */}
            <div className="border border-slate-200 rounded-2xl p-6 md:p-8 bg-white space-y-6 font-sans">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <KlanvisionLogo />
                  <p className="text-xs font-bold text-slate-800 mt-2">{tenant?.legalName || 'Klanvision Technologies Pvt. Ltd.'}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {tenant?.address || 'Dwarka Sector 11'}, {tenant?.city || 'New Delhi'}, {tenant?.state || 'Delhi'} - {tenant?.postalCode || '110075'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    GSTIN: <span className="font-mono font-semibold text-slate-800">{tenant?.gstin || '07AABCK1234P1Z8'}</span>
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    TAX INVOICE
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-2">{nextInvoiceNo}</p>
                  <p className="text-xs text-slate-500">Issue Date: {issueDate}</p>
                  <p className="text-xs text-slate-500">Due Date: {dueDate}</p>
                </div>
              </div>

              {/* Bill To & Supply Info */}
              <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-6">
                <div>
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">Billed To:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedCustomer?.name || 'Selected Customer'}</p>
                  <p className="text-slate-600">{selectedCustomer?.billingAddress}</p>
                  <p className="text-slate-600">
                    {selectedCustomer?.billingCity}, {selectedCustomer?.billingState} - {selectedCustomer?.billingPostalCode}
                  </p>
                  <p className="text-slate-600 mt-1">
                    GSTIN: <span className="font-mono font-semibold">{selectedCustomer?.gstin || 'Unregistered'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">Place of Supply:</p>
                  <p className="font-bold text-slate-900 text-sm">{placeOfSupply}</p>
                  <p className="text-slate-500 mt-1">
                    Supply Rule:{' '}
                    <span className="font-semibold text-blue-700">
                      {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600">
                    <th className="py-2">#</th>
                    <th className="py-2">Description</th>
                    <th className="py-2">HSN/SAC</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Taxable</th>
                    <th className="py-2 text-right">GST</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item, idx) => {
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.unitPrice) || 0;
                    const gross = qty * price;
                    const disc = (gross * (Number(item.discountPercent) || 0)) / 100;
                    const taxable = gross - disc;
                    const gst = (taxable * (Number(item.gstRate) || 0)) / 100;
                    const total = taxable + gst;

                    return (
                      <tr key={idx} className="py-2">
                        <td className="py-2 text-slate-400">{idx + 1}</td>
                        <td className="py-2 font-medium text-slate-900">{item.description}</td>
                        <td className="py-2 font-mono text-slate-500">{item.hsnSacCode}</td>
                        <td className="py-2 text-right font-medium">{qty}</td>
                        <td className="py-2 text-right font-medium">{formatINR(price)}</td>
                        <td className="py-2 text-right font-medium">{formatINR(taxable)}</td>
                        <td className="py-2 text-right font-medium">{item.gstRate}%</td>
                        <td className="py-2 text-right font-bold text-slate-900">{formatINR(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount</span>
                    <span className="font-semibold text-slate-900">{formatINR(calculations.taxableAmount)}</span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Total</span>
                      <span className="font-semibold text-slate-900">{formatINR(calculations.igstTotal)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST Total</span>
                        <span className="font-semibold text-slate-900">{formatINR(calculations.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST Total</span>
                        <span className="font-semibold text-slate-900">{formatINR(calculations.sgstTotal)}</span>
                      </div>
                    </>
                  )}
                  {calculations.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off</span>
                      <span className="font-mono">{calculations.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                    <span>Total Payable</span>
                    <span className="text-blue-600">{formatINR(calculations.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  handleSubmit('ISSUED');
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Issue This Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
