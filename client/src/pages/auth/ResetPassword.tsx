import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { KlanvisionLogo } from '../../components/branding/KlanvisionLogo.js';
import { api } from '../../services/api.js';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isValidatingToken, setIsValidatingToken] = useState(!!initialToken);
  const [tokenValid, setTokenValid] = useState<boolean | null>(initialToken ? null : true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      setIsValidatingToken(true);
      api
        .verifyResetToken(initialToken)
        .then(() => {
          setTokenValid(true);
          setTokenError(null);
        })
        .catch((err: any) => {
          setTokenValid(false);
          setTokenError(err.message || 'The password reset link is invalid or has expired.');
        })
        .finally(() => {
          setIsValidatingToken(false);
        });
    }
  }, [initialToken]);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: '', color: 'bg-slate-200' };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token.trim()) {
      setFormError('Reset token is required. Please follow the link from your email.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resetPassword({
        token: token.trim(),
        newPassword: password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-100 p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <KlanvisionLogo variant="dark" size="lg" />
        </div>

        {isValidatingToken ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-slate-500">Verifying your secure password recovery token...</p>
          </div>
        ) : tokenValid === false ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid or Expired Link</h2>
            <p className="text-xs text-slate-500 mb-6">
              {tokenError || 'The password reset token is either expired, already used, or invalid.'}
            </p>
            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full py-2.5 px-4 bg-[#0c1938] hover:bg-[#12224d] text-white font-semibold text-xs rounded-xl shadow transition-all text-center"
              >
                Request a New Reset Link
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Password Reset Successful!</h2>
            <p className="text-xs text-slate-500 mb-6">
              Your password has been securely updated and all previous sessions revoked. You can now sign in with your new credentials.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 bg-[#0c1938] hover:bg-[#12224d] text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
            >
              Sign In Now
            </button>
          </div>
        ) : (
          <>
            <div className="text-left mb-6">
              <h1 className="text-2xl font-bold text-[#0c1938] tracking-tight">
                Create new password
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your new secure password below to regain account access.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!initialToken && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recovery Token
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    placeholder="Paste 64-character token"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Password Strength</span>
                      <span className="font-semibold">{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full h-full transition-all ${
                            step <= strength.score ? strength.color : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#0c1938] hover:bg-[#12224d] text-white font-semibold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
