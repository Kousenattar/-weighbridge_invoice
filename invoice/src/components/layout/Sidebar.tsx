import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Settings, LogOut,
  Menu, X, BarChart3, Plus, ShoppingCart,
  TrendingUp, ClipboardList, PieChart, ChevronDown, List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

// Groups with children collapse/expand
interface NavGroup {
  label: string;
  icon: React.ElementType;
  basePath: string;
  accentColor: string;
  children: { to: string; icon: React.ElementType; label: string }[];
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const gstGroups: NavGroup[] = [
  {
    label: 'Invoices',
    icon: FileText,
    basePath: '/invoices',
    accentColor: '#3b82f6',
    children: [
      { to: '/invoices',     icon: List,  label: 'All Invoices' },
      { to: '/invoices/new', icon: Plus,  label: 'Create Invoice' },
    ],
  },
  {
    label: 'Purchases',
    icon: ShoppingCart,
    basePath: '/purchases',
    accentColor: '#10b981',
    children: [
      { to: '/purchases',     icon: List, label: 'All Purchases' },
      { to: '/purchases/new', icon: Plus, label: 'New Purchase' },
    ],
  },
  {
    label: 'Estimates',
    icon: ClipboardList,
    basePath: '/estimates',
    accentColor: '#f59e0b',
    children: [
      { to: '/estimates',     icon: List, label: 'All Estimates' },
      { to: '/estimates/new', icon: Plus, label: 'New Estimate' },
    ],
  },
];

const nonGstGroups: NavGroup[] = [
  {
    label: 'Invoices',
    icon: FileText,
    basePath: '/invoices',
    accentColor: '#3b82f6',
    children: [
      { to: '/invoices',     icon: List,  label: 'All Invoices' },
      { to: '/invoices/new', icon: Plus,  label: 'Create Invoice' },
    ],
  },
];

const gstTopItems: NavItem[] = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
];
const gstBottomItems: NavItem[] = [
  { to: '/gst-analysis', icon: TrendingUp,       label: 'GST Analysis' },
  { to: '/clients',      icon: Users,            label: 'Clients' },
  { to: '/reports',      icon: BarChart3,        label: 'Reports' },
  { to: '/settings',     icon: Settings,         label: 'Settings' },
];

const nonGstTopItems: NavItem[] = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
];
const nonGstBottomItems: NavItem[] = [
  { to: '/combined-analysis', icon: PieChart,         label: 'Analysis' },
  { to: '/clients',           icon: Users,            label: 'Clients' },
  { to: '/reports',           icon: BarChart3,        label: 'Reports' },
  { to: '/settings',          icon: Settings,         label: 'Settings' },
];

export default function Sidebar({ darkMode, onToggleDark }: SidebarProps) {
  const { user, logout, isGSTPanel } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track which groups are open; default open group based on current path
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const path = location.pathname;
    return {
      Invoices:  path.startsWith('/invoices'),
      Purchases: path.startsWith('/purchases'),
      Estimates: path.startsWith('/estimates'),
    };
  });

  const groups      = isGSTPanel ? gstGroups      : nonGstGroups;
  const topItems    = isGSTPanel ? gstTopItems    : nonGstTopItems;
  const bottomItems = isGSTPanel ? gstBottomItems : nonGstBottomItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNav = useCallback((to: string) => {
    navigate(to);
    setMobileOpen(false);
  }, [navigate]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (to: string) => location.pathname === to;

  const isGroupActive = (basePath: string) =>
    location.pathname.startsWith(basePath);

  // Panel-specific theming
  const logoGradient = isGSTPanel ? 'from-blue-400 to-blue-600' : 'from-emerald-400 to-teal-600';
  const logoLetter   = isGSTPanel ? 'G' : 'N';
  const logoTitle    = isGSTPanel ? 'GST Billing' : 'Invoice Manager';
  const logoSub      = isGSTPanel ? 'GST Panel' : 'Non-GST Panel';
  const panelBadge   = isGSTPanel ? 'bg-blue-500/20 text-blue-200' : 'bg-emerald-500/20 text-emerald-200';

  const renderTopItem = ({ to, icon: Icon, label }: NavItem) => (
    <button
      key={to}
      onClick={() => handleNav(to)}
      className={`sidebar-link w-full text-left ${isActive(to) ? 'active' : ''}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        className="fixed top-3 left-3 z-[300] md:hidden bg-white rounded-xl p-2.5 shadow-lg border border-gray-100 no-print"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} className="text-gray-700" /> : <Menu size={20} className="text-gray-700" />}
      </button>

      {/* Mobile Overlay */}
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
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${logoGradient} flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>
                {logoLetter}
              </div>
              <div>
                <div className="font-bold text-white text-sm leading-tight">{logoTitle}</div>
                <div className={`text-xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block font-semibold ${panelBadge}`}>
                  {logoSub}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-3 overflow-y-auto">

            {/* Top standalone items */}
            <div className="px-3 mb-1">
              <span className="text-xs font-semibold text-blue-300/50 uppercase tracking-wider px-2">
                Main Menu
              </span>
            </div>
            {topItems.map(renderTopItem)}

            {/* Divider */}
            <div className="mx-4 my-2 border-t border-white/10" />

            {/* Accordion Groups */}
            <div className="px-3 mb-1">
              <span className="text-xs font-semibold text-blue-300/50 uppercase tracking-wider px-2">
                Transactions
              </span>
            </div>

            {groups.map((group) => {
              const GroupIcon = group.icon;
              const isOpen    = openGroups[group.label];
              const groupActive = isGroupActive(group.basePath);

              return (
                <div key={group.label} className="mx-3 mb-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="sidebar-group-header w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                    style={{
                      background: groupActive
                        ? `${group.accentColor}22`
                        : 'transparent',
                      color: groupActive ? 'white' : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {/* Accent dot when active */}
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200"
                      style={{
                        background: groupActive ? group.accentColor : 'transparent',
                        boxShadow: groupActive ? `0 0 6px ${group.accentColor}` : 'none',
                      }}
                    />
                    <GroupIcon size={17} className="flex-shrink-0" />
                    <span className="flex-1 text-left font-semibold text-sm">{group.label}</span>
                    <ChevronDown
                      size={15}
                      className="flex-shrink-0 transition-transform duration-300"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>

                  {/* Animated Children */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: isOpen ? '200px' : '0px', opacity: isOpen ? 1 : 0 }}
                  >
                    <div className="pt-1 pb-1 pl-2">
                      {/* Left accent line */}
                      <div className="relative ml-1 border-l-2 border-white/10 pl-3">
                        {group.children.map(({ to, icon: ChildIcon, label }) => (
                          <button
                            key={to}
                            onClick={() => handleNav(to)}
                            className="sidebar-child-link w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 transition-all duration-200 text-sm"
                            style={{
                              background: isActive(to) ? `${group.accentColor}33` : 'transparent',
                              color: isActive(to) ? 'white' : 'rgba(255,255,255,0.6)',
                              fontWeight: isActive(to) ? 600 : 400,
                              borderLeft: isActive(to) ? `2px solid ${group.accentColor}` : '2px solid transparent',
                              marginLeft: '-2px',
                            }}
                          >
                            <ChildIcon size={14} className="flex-shrink-0" />
                            <span>{label}</span>
                            {label === 'Create Invoice' && (
                              <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: group.accentColor + '55', color: 'white' }}>
                                New
                              </span>
                            )}
                            {label === 'New Purchase' && (
                              <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: group.accentColor + '55', color: 'white' }}>
                                New
                              </span>
                            )}
                            {label === 'New Estimate' && (
                              <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: group.accentColor + '55', color: 'white' }}>
                                New
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            <div className="mx-4 my-2 border-t border-white/10" />

            {/* Bottom items */}
            <div className="px-3 mb-1">
              <span className="text-xs font-semibold text-blue-300/50 uppercase tracking-wider px-2">
                More
              </span>
            </div>
            {bottomItems.map(renderTopItem)}
          </nav>

          {/* User + Logout — always pinned at bottom */}
          <div className="border-t border-white/10" style={{ flexShrink: 0 }}>
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${isGSTPanel ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
                <div className="text-blue-300 text-xs capitalize">
                  {user?.panel === 'non_gst' ? 'Non-GST Panel' : 'GST Panel'}
                </div>
              </div>
            </div>
            <div className="px-3 pb-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.background='rgba(239,68,68,0.3)'; b.style.color='#fff'; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.background='rgba(239,68,68,0.15)'; b.style.color='#fca5a5'; }}
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}
