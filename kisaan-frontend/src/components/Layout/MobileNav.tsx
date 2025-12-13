/**
 * Mobile-first navigation component
 * Role-based navigation with responsive design
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { normalizeRole, getVisibleNavItems, getQuickActions, isActive } from '@/config/navigationConfig';


export function MobileNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const role = normalizeRole(user?.role);
  const visibleNavItems = getVisibleNavItems(role, { includeQuick: true }).filter(i => !i.desktopOnly);
  const quick = getQuickActions(role);

  // If farmer, always show only logout button
  const isFarmer = role === 'farmer';
  const showOnlyLogout = isFarmer;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (!user) return null;

  if (showOnlyLogout) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 flex items-center justify-center"
        onClick={handleLogout}
        aria-label="Logout"
      >
        <LogOut className="h-6 w-6 text-destructive" />
      </Button>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="block sm:block md:hidden lg:hidden xl:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
  <div className="flex flex-col h-full relative p-1">
          {/* Header */}
          <div className="p-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-3 mb-2">
              <svg 
                className="h-8 w-8" 
                viewBox="0 0 44 44"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="mobileNavIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
                    <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
                  </linearGradient>
                </defs>
                
                <circle cx="22" cy="22" r="22" fill="url(#mobileNavIconGradient)" />
                
                <g fill="white" opacity="0.95">
                  <path d="M22 10 L22 34 M20 12 L24 12 M19 15 L25 15 M18 18 L26 18 M19 21 L25 21 M20 24 L24 24" 
                        stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  
                  <circle cx="16" cy="14" r="1.5"/>
                  <circle cx="15" cy="17" r="1.5"/>
                  <circle cx="16" cy="20" r="1.5"/>
                  <circle cx="17" cy="23" r="1.5"/>
                  
                  <circle cx="28" cy="14" r="1.5"/>
                  <circle cx="29" cy="17" r="1.5"/>
                  <circle cx="28" cy="20" r="1.5"/>
                  <circle cx="27" cy="23" r="1.5"/>
                </g>
              </svg>
              <h2 className="text-lg font-semibold text-foreground">
                KisaanCenter
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {user.firstname && user.firstname.trim() ? user.firstname : user.username} • {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>
          </div>

          {/* Navigation - scrollable */}
          <nav className="flex-1 overflow-y-auto p-2">
            <div className="space-y-0.5">
              {visibleNavItems.map((item) => {
                const Icon = item.icon!; // all configured nav items here have icon
                const active = isActive(location.pathname, item);

                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full" />
                    )}
                  </Link>
                );
              })}
              
              {/* Logout item styled like other nav items */}
              <button
                onClick={handleLogout}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left',
                  'text-destructive hover:bg-destructive/10 hover:text-destructive'
                )}
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
            
            {/* Quick Actions Section */}
            {quick.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Quick Actions
                </h3>
                <div className="space-y-0.5">
                  {quick.map(action => (
                    <Button
                      key={action.key}
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setIsOpen(false);
                        window.location.href = action.href;
                      }}
                      className="w-full flex items-center justify-center h-10 rounded-md border-2 border-dashed border-primary text-primary font-semibold text-base hover:bg-primary/10 transition"
                      title={action.label}
                    >
                      {action.icon && <action.icon className="h-5 w-5 mr-2 text-primary" />}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}