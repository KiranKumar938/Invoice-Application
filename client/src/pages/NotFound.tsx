import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { KlanvisionLogo } from '../components/branding/KlanvisionLogo.js';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
      <div className="mb-8">
        <KlanvisionLogo variant="dark" size="lg" />
      </div>

      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <span className="text-6xl font-black text-blue-600">404</span>
        <h1 className="text-xl font-extrabold text-slate-900 mt-3 mb-2">Page Not Found</h1>
        <p className="text-xs text-slate-500 mb-6">
          The billing module or page you are trying to access does not exist or has been relocated.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          <Home className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
