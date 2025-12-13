
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole, getVisibleNavItems, isActive } from '@/config/navigationConfig';
import { useSidebar } from '../../context/SidebarContext';
import { Button } from '../ui/button';

// Colorful icon theme mapping
function getActiveIconColor(itemKey: string): string {
  const colorMap: Record<string, string> = {
    // Dashboard - Blue
    'owner-dashboard': 'text-blue-600',
    'superadmin-dashboard': 'text-blue-600',
    'generic-dashboard': 'text-blue-600',
    
        // Transactions & Payments - Green  
    'owner-transactions': 'text-slate-400 group-hover:text-green-500',
    'owner-payments': 'text-slate-400 group-hover:text-green-500',
    'owner-balance': 'text-slate-400 group-hover:text-green-500',
    'simple-transactions': 'text-emerald-600',
    
    // Users & Team - Purple
    'owner-users': 'text-purple-600',
    'superadmin-users': 'text-purple-600',
    
    // Products & Inventory - Orange
    'owner-products': 'text-orange-600',
    'superadmin-products': 'text-orange-600',
    'employee-products': 'text-orange-600',
    'superadmin-categories': 'text-orange-600',
    'superadmin-assign-products': 'text-orange-600',
    
    // Reports & Analytics - Indigo
    'owner-reports': 'text-indigo-600',
    'superadmin-reports': 'text-indigo-600',
    'owner-expenses': 'text-indigo-600',
    
    // Management & Settings - Gray
    'superadmin-shops': 'text-slate-600',
    'owner-settings': 'text-slate-600',
    'superadmin-settings': 'text-slate-600',
  };
  
  return colorMap[itemKey] || 'text-emerald-600';
}

function getInactiveIconColor(itemKey: string): string {
  const colorMap: Record<string, string> = {
    // Dashboard - Blue
    'owner-dashboard': 'text-blue-400 group-hover:text-blue-500',
    'superadmin-dashboard': 'text-blue-400 group-hover:text-blue-500',
    'generic-dashboard': 'text-blue-400 group-hover:text-blue-500',
    
    // Transactions & Payments - Green
    'owner-transactions': 'text-green-400 group-hover:text-green-500',
    'owner-payments': 'text-green-400 group-hover:text-green-500',
    'owner-balance': 'text-green-400 group-hover:text-green-500',
    
    // Users & Team - Purple
    'owner-users': 'text-purple-400 group-hover:text-purple-500',
    'superadmin-users': 'text-purple-400 group-hover:text-purple-500',
    
    // Products & Inventory - Orange
    'owner-products': 'text-orange-400 group-hover:text-orange-500',
    'superadmin-products': 'text-orange-400 group-hover:text-orange-500',
    'employee-products': 'text-orange-400 group-hover:text-orange-500',
    'superadmin-categories': 'text-orange-400 group-hover:text-orange-500',
    'superadmin-assign-products': 'text-orange-400 group-hover:text-orange-500',
    
    // Reports & Analytics - Indigo
    'owner-reports': 'text-indigo-400 group-hover:text-indigo-500',
    'superadmin-reports': 'text-indigo-400 group-hover:text-indigo-500',
    'owner-expenses': 'text-indigo-400 group-hover:text-indigo-500',
    
    // Management & Settings - Gray
    'superadmin-shops': 'text-slate-400 group-hover:text-slate-500',
    'owner-settings': 'text-slate-400 group-hover:text-slate-500',
    'superadmin-settings': 'text-slate-400 group-hover:text-slate-500',
  };
  
  return colorMap[itemKey] || 'text-muted-foreground group-hover:text-emerald-500';
}

function getActiveBackgroundColor(itemKey: string): string {
  const colorMap: Record<string, string> = {
    // Dashboard - Blue
    'owner-dashboard': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm border border-blue-200/50',
    'superadmin-dashboard': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm border border-blue-200/50',
    'generic-dashboard': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm border border-blue-200/50',
    
    // Transactions & Payments - Green
    'owner-transactions': 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 shadow-sm border border-green-200/50',
    'owner-payments': 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 shadow-sm border border-green-200/50',
    'owner-balance': 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 shadow-sm border border-green-200/50',
    'simple-transactions': 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 shadow-sm border border-emerald-200/50',
    
    // Users & Team - Purple
    'owner-users': 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 shadow-sm border border-purple-200/50',
    'superadmin-users': 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 shadow-sm border border-purple-200/50',
    
    // Products & Inventory - Orange
    'owner-products': 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 shadow-sm border border-orange-200/50',
    'superadmin-products': 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 shadow-sm border border-orange-200/50',
    'employee-products': 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 shadow-sm border border-orange-200/50',
    'superadmin-categories': 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 shadow-sm border border-orange-200/50',
    'superadmin-assign-products': 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 shadow-sm border border-orange-200/50',
    
    // Reports & Analytics - Indigo
    'owner-reports': 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 shadow-sm border border-indigo-200/50',
    'superadmin-reports': 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 shadow-sm border border-indigo-200/50',
    'owner-expenses': 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 shadow-sm border border-indigo-200/50',
    
    // Management & Settings - Gray
    'superadmin-shops': 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 shadow-sm border border-slate-200/50',
    'owner-settings': 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 shadow-sm border border-slate-200/50',
    'superadmin-settings': 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 shadow-sm border border-slate-200/50',
  };
  
  return colorMap[itemKey] || 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 shadow-sm border border-emerald-200/50';
}

function getActiveDotColor(itemKey: string): string {
  const colorMap: Record<string, string> = {
    // Dashboard - Blue
    'owner-dashboard': 'bg-blue-500',
    'superadmin-dashboard': 'bg-blue-500',
    'generic-dashboard': 'bg-blue-500',
    
    // Transactions & Payments - Green
    'owner-transactions': 'bg-green-500',
    'owner-payments': 'bg-green-500',
    'owner-balance': 'bg-green-500',
    'simple-transactions': 'bg-emerald-500',
    
    // Users & Team - Purple
    'owner-users': 'bg-purple-500',
    'superadmin-users': 'bg-purple-500',
    
    // Products & Inventory - Orange
    'owner-products': 'bg-orange-500',
    'superadmin-products': 'bg-orange-500',
    'employee-products': 'bg-orange-500',
    'superadmin-categories': 'bg-orange-500',
    'superadmin-assign-products': 'bg-orange-500',
    
    // Reports & Analytics - Indigo
    'owner-reports': 'bg-indigo-500',
    'superadmin-reports': 'bg-indigo-500',
    'owner-expenses': 'bg-indigo-500',
    
    // Management & Settings - Gray
    'superadmin-shops': 'bg-slate-500',
    'owner-settings': 'bg-slate-500',
    'superadmin-settings': 'bg-slate-500',
  };
  
  return colorMap[itemKey] || 'bg-emerald-500';
}

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const role = normalizeRole(user?.role);
  // Show all items for owner, including quick actions
  const navigation = getVisibleNavItems(role, { includeQuick: true }).filter(i => !i.mobileOnly); // sidebar = desktop style

  return (
    <>
      {/* Toggle button for desktop - rendered outside sidebar for max visibility */}
      <div
        style={{ position: 'fixed', top: 80, left: isCollapsed ? 64 : 256, zIndex: 99999 }}
        className="hidden md:flex"
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 rounded-full border bg-white shadow-md hover:shadow-lg transition-shadow"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar - ensure z-50 when mobile open */}
      <div
        className={cn(
          "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden",
          "fixed left-0 top-16",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "z-50 translate-x-0 h-[calc(100vh-4rem)]" : "z-40 -translate-x-full md:translate-x-0 h-[calc(100vh-4rem)]"
        )}
      >
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const active = isActive(location.pathname, item);
            return (
              <Link
                key={item.key}
                to={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  active
                    ? getActiveBackgroundColor(item.key)
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground hover:shadow-sm',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {item.icon && (
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    active ? getActiveIconColor(item.key) : getInactiveIconColor(item.key),
                    !isCollapsed && 'mr-3'
                  )}
                />)}
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {active && !isCollapsed && (
                  <div className={cn("ml-auto w-2 h-2 rounded-full shadow-sm", getActiveDotColor(item.key))} />
                )}
              </Link>
            );
          })}
        </nav>
        {/* Logout button pinned to bottom */}
        <div className="px-3 py-4 mt-auto border-t border-border/40">
          <button
            onClick={() => {
              logout();
              setIsMobileOpen(false);
            }}
            className={cn(
              'group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
              'text-destructive hover:bg-destructive/10 hover:text-destructive hover:shadow-sm',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut
              className={cn(
                'h-5 w-5 flex-shrink-0 transition-colors',
                'text-destructive group-hover:text-destructive',
                !isCollapsed && 'mr-3'
              )}
            />
            {!isCollapsed && (
              <span className="truncate">Logout</span>
            )}
          </button>
        </div>
      </div>
      {/* Mobile overlay - rendered after sidebar so sidebar is above overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}