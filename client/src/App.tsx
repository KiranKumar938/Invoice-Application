import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Auth Pages
import { Login } from './pages/auth/Login.js';
import { Register } from './pages/auth/Register.js';
import { ForgotPassword } from './pages/auth/ForgotPassword.js';
import { ResetPassword } from './pages/auth/ResetPassword.js';

// Dashboard & Core Modules
import { Dashboard } from './pages/dashboard/Dashboard.js';
import { CustomerList } from './pages/customers/CustomerList.js';
import { ProductList } from './pages/products/ProductList.js';
import { InvoiceList } from './pages/invoices/InvoiceList.js';
import { InvoiceCreate } from './pages/invoices/InvoiceCreate.js';
import { InvoicePreview } from './pages/invoices/InvoicePreview.js';
import { FinalInvoiceView } from './pages/invoices/FinalInvoiceView.js';
import { PaymentList } from './pages/payments/PaymentList.js';
import { Reports } from './pages/reports/Reports.js';
import { Settings } from './pages/settings/Settings.js';
import { UserProfile } from './pages/profile/UserProfile.js';
import { NotFound } from './pages/NotFound.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public Secure Invoice Share Route */}
          <Route path="/invoices/share/:token" element={<InvoicePreview isPublic={true} />} />

          {/* Direct Final Web Page Invoice Output Route */}
          <Route path="/invoice" element={<FinalInvoiceView />} />
          <Route path="/invoices/output" element={<FinalInvoiceView />} />
          <Route path="/invoices/sample" element={<FinalInvoiceView />} />
          <Route path="/invoices/:id/output" element={<FinalInvoiceView />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Customers */}
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/new" element={<CustomerList />} />
            <Route path="customers/:id" element={<CustomerList />} />

            {/* Products */}
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductList />} />

            {/* Invoices */}
            <Route path="invoices" element={<InvoiceList />} />
            <Route path="invoices/new" element={<InvoiceCreate />} />
            <Route path="invoices/:id" element={<InvoicePreview />} />
            <Route path="invoices/:id/edit" element={<InvoiceCreate />} />
            <Route path="invoices/:id/preview" element={<InvoicePreview />} />

            {/* Payments & Reports */}
            <Route path="payments" element={<PaymentList />} />
            <Route path="reports" element={<Reports />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/company" element={<Settings />} />
            <Route path="settings/gst" element={<Settings />} />
            <Route path="settings/invoice-numbering" element={<Settings />} />
            <Route path="settings/templates" element={<Settings />} />
            <Route path="settings/payment-methods" element={<Settings />} />
            <Route path="settings/notifications" element={<Settings />} />
            <Route path="settings/users" element={<Settings />} />

            {/* Profile */}
            <Route path="profile" element={<UserProfile />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
