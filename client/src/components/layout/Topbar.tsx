import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  User as UserIcon,
  FileText,
  Package,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    invoices: any[];
    products: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchGlobal(searchQuery.trim());
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const notifications = [
    {
      id: 1,
      title: 'Payment received',
      desc: '₹ 75,000.00 received from ABC Traders (INV-2025-0012)',
      time: '10:24 AM',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-50',
    },
    {
      id: 2,
      title: 'Invoice Due Warning',
      desc: 'INV-2025-0011 for XYZ Ltd. is due tomorrow',
      time: 'Yesterday',
      icon: AlertTriangle,
      color: 'text-amber-500 bg-amber-50',
    },
    {
      id: 3,
      title: 'GST Return Reminder',
      desc: 'GSTR-1 filing deadline approaching on 11th May',
      time: '2 days ago',
      icon: Info,
      color: 'text-blue-500 bg-blue-50',
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchResults(false);
      navigate(`/invoices?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectResult = (url: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(url);
  };

  const hasResults =
    searchResults &&
    (searchResults.customers.length > 0 ||
      searchResults.invoices.length > 0 ||
      searchResults.products.length > 0);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-6 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      {/* Mobile Menu Button */}
      <button
        onClick={onOpenMobileSidebar}
        className="lg:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Global Search Bar (matching screenshots 2, 4, 5) */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-xl mx-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setShowSearchResults(true);
            }}
            placeholder="Search invoices, customers, products..."
            className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setShowSearchResults(false);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Global Search Results Dropdown */}
        {showSearchResults && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-400">Searching workspace records...</div>
            ) : hasResults ? (
              <div className="space-y-3">
                {/* Invoices */}
                {searchResults!.invoices.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                      Invoices
                    </span>
                    <div className="mt-1 space-y-1">
                      {searchResults!.invoices.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.url)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/60 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-100/60 text-blue-600">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{item.title}</p>
                              <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customers */}
                {searchResults!.customers.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                      Customers
                    </span>
                    <div className="mt-1 space-y-1">
                      {searchResults!.customers.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.url)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/60 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-100/60 text-emerald-600">
                              <UserIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{item.title}</p>
                              <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {searchResults!.products.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                      Products & Services
                    </span>
                    <div className="mt-1 space-y-1">
                      {searchResults!.products.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.url)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/60 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-purple-100/60 text-purple-600">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{item.title}</p>
                              <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching records found for "{searchQuery}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-rose-500 rounded-full">
              3
            </span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800">Notifications</span>
                <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">
                  Mark all as read
                </span>
              </div>
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div key={n.id} className="p-3.5 hover:bg-slate-50 flex items-start gap-3 cursor-pointer">
                      <div className={`p-2 rounded-xl shrink-0 ${n.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.desc}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Pill Dropdown (matching screenshot 2 & 4: Admin badge with avatar) */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#0c1938] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <UserIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {user?.role === 'ADMIN' ? 'Admin' : user?.name || 'Admin'}
            </span>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user?.name || 'Mahesh Kumar'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@klanvision.com'}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/profile');
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                Account Profile
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                Settings & Billing
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
