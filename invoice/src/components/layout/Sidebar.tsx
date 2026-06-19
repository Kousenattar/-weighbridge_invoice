import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Settings, LogOut,
  Menu, X, Moon, Sun, BarChart3, Plus, ShoppingCart, TrendingUp, ClipboardList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices',    icon: FileText,         label: 'Invoices' },
  { to: '/invoices/new', icon: Plus,            label: 'Create Invoice' },
  { to: '/purchases',   icon: ShoppingCart,     label: 'Purchases' },
  { to: '/purchases/new', icon: Plus,           label: 'New Purchase' },
  { to: '/estimates',   icon: ClipboardList,    label: 'Estimates' },
  { to: '/estimates/new', icon: Plus,           label: 'New Estimate' },
  { to: '/gst-analysis', icon: TrendingUp,      label: 'GST Analysis' },
  { to: '/clients',     icon: Users,            label: 'Clients' },
  { to: '/reports',     icon: BarChart3,        label: 'Reports' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
];

export default function Sidebar({ darkMode, onToggleDark }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigate and close sidebar on mobile — using navigate directly avoids NavLink re-mount issues
  const handleNav = useCallback((to: string) => {
    navigate(to);
    setMobileOpen(false);
  }, [navigate]);

  const isActive = (to: string) => {
    if (to === '/invoices' && location.pathname.startsWith('/invoices/new')) return false;
    if (to === '/invoices' && location.pathname.startsWith('/invoices')) return true;
    if (to === '/purchases' && location.pathname.startsWith('/purchases/new')) return false;
    if (to === '/purchases' && location.pathname.startsWith('/purchases')) return true;
    if (to === '/estimates' && location.pathname.startsWith('/estimates/new')) return false;
    if (to === '/estimates' && location.pathname.startsWith('/estimates')) return true;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        className="fixed top-3 left-3 z-[300] md:hidden bg-white rounded-xl p-2.5 shadow-lg border border-gray-100"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} className="text-gray-700" /> : <Menu size={20} className="text-gray-700" />}
      </button>

      {/* Mobile Overlay — sits below sidebar, above content */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[200] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="sidebar"
        style={{
          transform: mobileOpen ? 'translateX(0)' : undefined,
          zIndex: 250,
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                G
              </div>
              <div>
                <div className="font-bold text-white text-sm leading-tight">GST Billing</div>
                <div className="text-blue-300 text-xs">Invoice Manager</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto">
            <div className="px-4 mb-2">
              <span className="text-xs font-semibold text-blue-300/60 uppercase tracking-wider">Main Menu</span>
            </div>
            {navItems.map(({ to, icon: Icon, label }) => (
              <button
                key={to}
                onClick={() => handleNav(to)}
                className={`sidebar-link w-full text-left ${isActive(to) ? 'active' : ''}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span>{label}</span>
                {label === 'Create Invoice' && (
                  <span className="ml-auto bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">New</span>
                )}
                {label === 'New Purchase' && (
                  <span className="ml-auto bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">New</span>
                )}
                {label === 'New Estimate' && (
                  <span className="ml-auto bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">New</span>
                )}
                {label === 'GST Analysis' && (
                  <span className="ml-auto bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">📊</span>
                )}
              </button>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
                <div className="text-blue-300 text-xs capitalize">{user?.role}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onToggleDark}
                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-all"
              >
                {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                {darkMode ? 'Light' : 'Dark'}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 text-xs transition-all"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
