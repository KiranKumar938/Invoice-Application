import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  BarChart2,
  Settings,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { KlanvisionLogo } from '../branding/KlanvisionLogo.js';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Create Invoice', path: '/invoices/new', icon: PlusCircle },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Reports', path: '/reports', icon: BarChart2 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0a142f] text-slate-200 flex flex-col justify-between transition-all duration-300 ease-in-out border-r border-[#162758] lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Top Header & Brand */}
        <div className={`p-4 ${isCollapsed ? 'px-3' : 'p-5'}`}>
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
            <NavLink to="/dashboard" className="flex items-center gap-2 overflow-hidden">
              <KlanvisionLogo variant={isCollapsed ? 'compact' : 'light'} size={isCollapsed ? 'sm' : 'md'} />
            </NavLink>
            <div className="flex items-center">
              {/* Desktop Collapse Toggle */}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              )}
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${
                      isCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-4 py-3'
                    } rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Decorative Glowing Chevrons & User Badge */}
        <div className={`relative overflow-hidden ${isCollapsed ? 'p-3' : 'px-5 py-4'}`}>
          {!isCollapsed && (
            <>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="opacity-15 pointer-events-none mb-3">
                <svg width="80" height="60" viewBox="0 0 100 80" fill="none">
                  <path
                    d="M 40 20 L 20 40 L 40 60"
                    stroke="#38bdf8"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 60 20 L 40 40 L 60 60"
                    stroke="#818cf8"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </>
          )}

          {/* User Profile Badge */}
          <div className="relative pt-3 border-t border-slate-800">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-1' : 'justify-between p-2'
              } rounded-xl hover:bg-slate-800/60 transition-colors text-left`}
              title={isCollapsed ? user?.name || 'Admin Profile' : undefined}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-white font-semibold">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold">{user?.name?.slice(0, 2).toUpperCase() || 'MK'}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="truncate">
                    <p className="text-sm font-semibold text-white leading-tight truncate">
                      {user?.name || 'Mahesh Kumar'}
                    </p>
                    <p className="text-xs text-slate-400 capitalize truncate">
                      {user?.role?.toLowerCase() || 'admin'}
                    </p>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div
                className={`absolute ${
                  isCollapsed ? 'left-20 bottom-2 w-48' : 'bottom-16 left-4 right-4'
                } bg-[#0e1c40] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2`}
              >
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Company Settings</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
