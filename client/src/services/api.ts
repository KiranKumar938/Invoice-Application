const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('klanvision_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem('klanvision_token');
    localStorage.removeItem('klanvision_user');
    const path = window.location.pathname;
    if (
      !path.startsWith('/login') &&
      !path.startsWith('/register') &&
      !path.startsWith('/forgot-password') &&
      !path.startsWith('/reset-password')
    ) {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Network request failed');
  }
  return data;
};

export const api = {
  // Auth
  login: async (credentials: any) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  register: async (details: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(details),
    });
    return handleResponse(res);
  },

  logout: async () => {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  forgotPassword: async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  verifyResetToken: async (token: string) => {
    const res = await fetch(`${API_BASE}/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    return handleResponse(res);
  },

  resetPassword: async (data: { token: string; newPassword: string }) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateProfile: async (profileData: { name: string; phone?: string }) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(profileData),
    });
    return handleResponse(res);
  },

  changePassword: async (passwords: { currentPassword: string; newPassword: string }) => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(passwords),
    });
    return handleResponse(res);
  },

  // Dashboard
  getDashboardSummary: async (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.period) query.append('period', params.period);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/dashboard/summary${queryStr}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  searchGlobal: async (q: string) => {
    const res = await fetch(`${API_BASE}/dashboard/search?q=${encodeURIComponent(q)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // Customers
  getCustomers: async (params?: {
    search?: string;
    status?: string;
    state?: string;
    page?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.state) query.append('state', params.state);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

    const res = await fetch(`${API_BASE}/customers?${query.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getCustomerById: async (id: string) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  createCustomer: async (customerData: any) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(customerData),
    });
    return handleResponse(res);
  },

  updateCustomer: async (id: string, customerData: any) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(customerData),
    });
    return handleResponse(res);
  },

  deleteCustomer: async (id: string) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  exportCustomersCsv: async (params?: { search?: string; status?: string; state?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.state) query.append('state', params.state);

    const res = await fetch(`${API_BASE}/customers/export?${query.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to export customers to CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klanvision-customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Products
  getProducts: async (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/products${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createProduct: async (productData: any) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return handleResponse(res);
  },

  // Invoices
  getNextInvoiceNumber: async () => {
    const res = await fetch(`${API_BASE}/invoices/next-number`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getInvoices: async (params?: {
    search?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.customerId) query.append('customerId', params.customerId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/invoices?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getInvoiceById: async (id: string) => {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createInvoice: async (invoiceData: any) => {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(invoiceData),
    });
    return handleResponse(res);
  },

  updateInvoice: async (id: string, invoiceData: any) => {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(invoiceData),
    });
    return handleResponse(res);
  },

  duplicateInvoice: async (id: string) => {
    const res = await fetch(`${API_BASE}/invoices/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  cancelInvoice: async (id: string) => {
    const res = await fetch(`${API_BASE}/invoices/${id}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  downloadInvoicePdf: async (id: string, invoiceNumber: string) => {
    const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate PDF from server');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber || 'tax-invoice'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  shareInvoice: async (id: string) => {
    const res = await fetch(`${API_BASE}/invoices/${id}/share`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getPublicInvoice: async (token: string) => {
    const res = await fetch(`${API_BASE}/public/invoices/${token}`);
    return handleResponse(res);
  },

  downloadPublicInvoicePdf: async (token: string, invoiceNumber: string) => {
    const res = await fetch(`${API_BASE}/public/invoices/${token}/pdf`);
    if (!res.ok) throw new Error('Failed to generate shared invoice PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber || 'tax-invoice'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportInvoicesCsv: async (params?: {
    search?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.customerId) query.append('customerId', params.customerId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/invoices/export?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to export invoices to CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klanvision-invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Payments
  getPayments: async (params?: {
    search?: string;
    customerId?: string;
    invoiceId?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.customerId) query.append('customerId', params.customerId);
    if (params?.invoiceId) query.append('invoiceId', params.invoiceId);
    if (params?.paymentMethod) query.append('paymentMethod', params.paymentMethod);
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/payments?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getPaymentById: async (id: string) => {
    const res = await fetch(`${API_BASE}/payments/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  recordPayment: async (paymentData: any) => {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
    return handleResponse(res);
  },

  reversePayment: async (id: string, reason?: string) => {
    const res = await fetch(`${API_BASE}/payments/${id}/reverse`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  downloadPaymentReceiptPdf: async (id: string, paymentNumber: string) => {
    const res = await fetch(`${API_BASE}/payments/${id}/receipt`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate payment receipt PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RECEIPT-${paymentNumber || 'payment'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportPaymentsCsv: async (params?: {
    search?: string;
    customerId?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.customerId) query.append('customerId', params.customerId);
    if (params?.paymentMethod) query.append('paymentMethod', params.paymentMethod);
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/payments/export?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to export payments to CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klanvision-payments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Reports
  getReportsSummary: async (params?: {
    period?: string;
    chartRange?: string;
    startDate?: string;
    endDate?: string;
    customerId?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.period) query.append('period', params.period);
    if (params?.chartRange) query.append('chartRange', params.chartRange);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.customerId) query.append('customerId', params.customerId);
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/reports/summary?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getReportsDetailed: async (params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    customerId?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.period) query.append('period', params.period);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.customerId) query.append('customerId', params.customerId);
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/reports/detailed?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  exportReportCsv: async (reportType: string, params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    query.append('reportType', reportType);
    if (params?.period) query.append('period', params.period);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/reports/export?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to export report to CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klanvision-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  updateSettings: async (settingsData: any) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settingsData),
    });
    return handleResponse(res);
  },

  verifyGstin: async (gstin: string) => {
    const res = await fetch(`${API_BASE}/settings/gst/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gstin }),
    });
    return handleResponse(res);
  },

  sendNotificationTestEmail: async (targetEmail?: string) => {
    const res = await fetch(`${API_BASE}/settings/notifications/test-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetEmail }),
    });
    return handleResponse(res);
  },

  triggerPaymentReminders: async () => {
    const res = await fetch(`${API_BASE}/settings/notifications/trigger-reminders`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getTeamUsers: async () => {
    const res = await fetch(`${API_BASE}/settings/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  inviteTeamMember: async (data: { email: string; name?: string; role: string }) => {
    const res = await fetch(`${API_BASE}/settings/users/invite`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateUserRole: async (userId: string, role: string) => {
    const res = await fetch(`${API_BASE}/settings/users/${userId}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return handleResponse(res);
  },

  revokeUserAccess: async (userId: string) => {
    const res = await fetch(`${API_BASE}/settings/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  deleteInvite: async (inviteId: string) => {
    const res = await fetch(`${API_BASE}/settings/invites/${inviteId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
