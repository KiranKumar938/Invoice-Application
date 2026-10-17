import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Clock, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  Sparkles,
  ShieldAlert,
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { sound } from '../../utils/soundEffects.js';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Administrator contact modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [adminRequestSent, setAdminRequestSent] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');

  // Key event listeners for CapsLock & shortcut
  const handleKeyEvent = (e: React.KeyboardEvent) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      sound.playError();
      return;
    }

    setError(null);
    setLoading(true);
    sound.playClick();

    try {
      await login({ email, password });
      sound.playSuccess();
      setLoginSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 600);
    } catch (err: any) {
      sound.playError();
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill Demo Credentials
  const handleFillDemo = (demoEmail = 'admin@klanvision.com', demoPassword = 'Password123!') => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    sound.playClick();
  };

  // Copy Admin Email to Clipboard
  const handleCopyAdminEmail = () => {
    navigator.clipboard.writeText('admin@klanvision.com');
    setCopiedEmail(true);
    sound.playClick();
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Handle Admin Request Submit
  const handleSendAdminRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail) return;
    setAdminRequestSent(true);
    sound.playSuccess();
    setTimeout(() => {
      setAdminRequestSent(false);
      setShowAdminModal(false);
      setRequestEmail('');
    }, 2200);
  };

  return (
    <div 
      onKeyDown={handleKeyEvent}
      onKeyUp={handleKeyEvent}
      className="min-h-screen w-full flex flex-col lg:flex-row bg-[#040d27] font-sans selection:bg-[#38bdf8] selection:text-[#040d27]"
    >
      {/* ======================================================== */}
      {/* LEFT COLUMN: Dark Navy Branding & Showcase Side          */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen bg-gradient-to-br from-[#061234] via-[#040d27] to-[#02081a] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-hidden">
        
        {/* Subtle Ambient Radial Lighting */}
        <div 
          className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full pointer-events-none opacity-40 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, rgba(37,99,235,0) 70%)' }}
        />
        <div 
          className="absolute bottom-10 left-1/3 w-[450px] h-[450px] rounded-full pointer-events-none opacity-25 blur-[140px]"
          style={{ background: 'radial-gradient(circle, #0284c7 0%, rgba(2,132,199,0) 70%)' }}
        />

        {/* 1. TOP BRAND BANNER (Left-hand top position) */}
        <div className="relative z-10 flex items-center justify-start">
          <Link to="/" className="inline-block transition-transform duration-300 hover:scale-[1.02]">
            <img
              src="/klanvision-banner.png"
              alt="Klanvision - See Beyond. Solve Smarter."
              className="w-[280px] sm:w-[320px] lg:w-[360px] h-auto object-contain drop-shadow-[0_4px_24px_rgba(56,189,248,0.25)] select-none"
              loading="eager"
            />
          </Link>
        </div>

        {/* 2. CENTER HERO HEADLINE & INTRO */}
        <div className="relative z-10 my-12 sm:my-16 lg:my-auto max-w-xl">
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-white tracking-tight leading-[1.18]">
            Professional Invoicing <br />
            for a Smarter Tomorrow
          </h1>

          <p className="text-slate-300 text-sm sm:text-base lg:text-[17px] leading-relaxed max-w-md mt-5 font-normal">
            Create, manage and track your invoices with ease. Save time, stay organized and grow your business with Klanvision.
          </p>
        </div>

        {/* 3. BOTTOM 4 CIRCULAR FEATURE BADGES */}
        <div className="relative z-10 pt-6">
          <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-lg">
            
            {/* Feature 1: Fast Invoicing */}
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0a1e4a] border border-[#1b3b7e] flex items-center justify-center text-white shadow-lg shadow-blue-950/40 group-hover:border-[#38bdf8] group-hover:scale-105 transition-all duration-300">
                <Clock className="w-6 h-6 text-white stroke-[2]" />
              </div>
              <div className="mt-2.5 text-center">
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">Fast</p>
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">Invoicing</p>
              </div>
            </div>

            {/* Feature 2: Secure & Reliable */}
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0a1e4a] border border-[#1b3b7e] flex items-center justify-center text-white shadow-lg shadow-blue-950/40 group-hover:border-[#38bdf8] group-hover:scale-105 transition-all duration-300">
                <ShieldCheck className="w-6 h-6 text-white stroke-[2]" />
              </div>
              <div className="mt-2.5 text-center">
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">Secure</p>
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">& Reliable</p>
              </div>
            </div>

            {/* Feature 3: Real-time Reports */}
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0a1e4a] border border-[#1b3b7e] flex items-center justify-center text-white shadow-lg shadow-blue-950/40 group-hover:border-[#38bdf8] group-hover:scale-105 transition-all duration-300">
                <BarChart3 className="w-6 h-6 text-white stroke-[2]" />
              </div>
              <div className="mt-2.5 text-center">
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">Real-time</p>
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">Reports</p>
              </div>
            </div>

            {/* Feature 4: Multi-user Access */}
            <div className="flex flex-col items-center text-center group cursor-default">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0a1e4a] border border-[#1b3b7e] flex items-center justify-center text-white shadow-lg shadow-blue-950/40 group-hover:border-[#38bdf8] group-hover:scale-105 transition-all duration-300">
                <Users className="w-6 h-6 text-white stroke-[2]" />
              </div>
              <div className="mt-2.5 text-center">
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">Multi-user</p>
                <p className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">Access</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: Crisp White Login Form Side                */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white text-slate-900 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative overflow-hidden">
        
        {/* Subtle Decorative Flowing Waves in Bottom-Right Corner */}
        <div className="absolute bottom-0 right-0 w-[340px] sm:w-[460px] lg:w-[540px] pointer-events-none select-none z-0">
          <svg 
            viewBox="0 0 540 280" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto opacity-70"
          >
            {/* Wave Layer 1 */}
            <path 
              d="M0 280C140 250 240 270 340 230C440 190 490 140 540 120V280H0Z" 
              fill="#f0f9ff" 
            />
            {/* Wave Layer 2 */}
            <path 
              d="M80 280C220 230 310 260 410 210C480 170 510 130 540 100V280H80Z" 
              fill="#e0f2fe" 
              fillOpacity="0.8" 
            />
            {/* Wave Layer 3 */}
            <path 
              d="M180 280C290 235 370 245 450 195C500 160 525 125 540 85V280H180Z" 
              fill="#bae6fd" 
              fillOpacity="0.45" 
            />
            {/* Wave Layer 4 Top Highlight */}
            <path 
              d="M260 280C340 250 420 240 480 190C515 160 530 130 540 90V280H260Z" 
              fill="#dbeafe" 
              fillOpacity="0.5" 
            />
          </svg>
        </div>

        {/* Quick Demo Helper Pill (Discreet, Top-Right) */}
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            onClick={() => handleFillDemo()}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs text-slate-600 hover:text-blue-700 transition-all shadow-xs"
            title="Auto-fill with official sandbox demo credentials"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500 group-hover:rotate-12 transition-transform" />
            <span className="font-semibold">Quick Demo Fill</span>
          </button>
        </div>

        {/* Centered Login Card Form */}
        <div className="w-full max-w-[440px] mx-auto z-10 py-6 sm:py-10">
          
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-[34px] font-bold text-[#0c1633] tracking-tight">
              Welcome Back
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-1.5 font-normal">
              Sign in to your Klanvision account
            </p>
          </div>

          {/* Error Alert Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium text-xs sm:text-sm">{error}</span>
            </div>
          )}

          {/* Caps Lock Alert */}
          {capsLockActive && (
            <div className="mb-5 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">Caps Lock is active on your keyboard</span>
            </div>
          )}

          {/* Success Banner */}
          {loginSuccess && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
              <div className="font-semibold text-xs sm:text-sm">
                Login successful! Launching workspace...
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
            
            {/* Input 1: Email Address Box */}
            <div className="rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100/80 p-3 sm:p-3.5 bg-white transition-all shadow-xs">
              <div className="flex items-center gap-3.5">
                <Mail className="w-5 h-5 text-slate-400 shrink-0 stroke-[1.8]" />
                <div className="flex-1 min-w-0">
                  <label 
                    htmlFor="email" 
                    className="block text-xs font-medium text-slate-500 leading-tight mb-0.5 select-none"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    enterKeyHint="next"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full text-sm sm:text-[15px] text-slate-900 placeholder:text-slate-400 font-normal outline-none bg-transparent border-0 p-0 focus:ring-0 leading-normal"
                  />
                </div>
              </div>
            </div>

            {/* Input 2: Password Box */}
            <div className="rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100/80 p-3 sm:p-3.5 bg-white transition-all shadow-xs">
              <div className="flex items-center gap-3.5">
                <Lock className="w-5 h-5 text-slate-400 shrink-0 stroke-[1.8]" />
                <div className="flex-1 min-w-0">
                  <label 
                    htmlFor="password" 
                    className="block text-xs font-medium text-slate-500 leading-tight mb-0.5 select-none"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full text-sm sm:text-[15px] text-slate-900 placeholder:text-slate-400 font-normal outline-none bg-transparent border-0 p-0 focus:ring-0 leading-normal"
                  />
                </div>
                {/* Password Eye Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 stroke-[1.8]" />
                  ) : (
                    <Eye className="w-5 h-5 stroke-[1.8]" />
                  )}
                </button>
              </div>
            </div>

            {/* Row: Remember Me & Forgot Password */}
            <div className="pt-1 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-slate-600 text-sm font-normal">Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Gradient CTA Button: Sign In */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || loginSuccess}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white text-base shadow-sm hover:opacity-95 hover:shadow-lg active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 select-none"
                style={{
                  background: 'linear-gradient(90deg, #3643f4 0%, #db3385 52%, #ff7536 100%)'
                }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>

          </form>

          {/* Footer: Don't have an account? Contact your administrator */}
          <div className="mt-8 text-center text-sm text-slate-600">
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="text-blue-600 font-medium underline hover:text-blue-700 transition-colors cursor-pointer"
            >
              Contact your administrator
            </button>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* ADMINISTRATOR CONTACT MODAL                              */}
      {/* ======================================================== */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#061234] to-[#0d2258] text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Contact Workspace Administrator</h3>
                <p className="text-xs text-slate-300 mt-0.5">Klanvision Enterprise IT Help Desk</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-slate-700 text-sm">
              <p className="text-slate-600 text-xs leading-relaxed">
                Klanvision accounts are provisioned and managed by your organization's IT department. Please reach out to your system administrator to receive your access invite.
              </p>

              {/* Administrator Contact Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Primary IT Administrator
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800 text-sm">
                    admin@klanvision.com
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAdminEmail}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs text-slate-500">
                  Response SLA: &lt; 2 business hours • Mon - Sat 9:00 AM - 6:00 PM IST
                </div>
              </div>

              {/* Quick Request Dispatch */}
              {!adminRequestSent ? (
                <form onSubmit={handleSendAdminRequest} className="space-y-3 pt-1">
                  <label htmlFor="request-email" className="block text-xs font-semibold text-slate-700">
                    Send instant access request from your work email:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="request-email"
                      type="email"
                      required
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      placeholder="your.name@company.com"
                      className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Request</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Request dispatched to administrator! Check your inbox shortly.</span>
                </div>
              )}

              {/* Quick Link to Register if self-service is enabled */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Creating a brand new company?</span>
                <Link
                  to="/register"
                  onClick={() => setShowAdminModal(false)}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Create Organization Account →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
