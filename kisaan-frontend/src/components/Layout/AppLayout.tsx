/**
 * Main application layout component
 * Mobile-first responsive design with role-based navigation
 */

import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

import Header from './Header';
import { Sidebar } from './Sidebar';
// Removed unused import

interface AppLayoutProps {
  readonly className?: string;
}

export function AppLayout({ className }: Readonly<AppLayoutProps>) {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const location = useLocation();
  const showSidebar = user?.role === 'owner' || user?.role === 'superadmin';

  // Extract sidebar padding class from nested ternary
  const sidebarPaddingClass = showSidebar
    ? isCollapsed
      ? 'md:pl-16'
      : 'md:pl-64'
    : '';

  // Extract main content to avoid nested ternary in JSX
  const mainContent = <Outlet key={location.pathname} />;

  // Extract footer padding class from nested ternary
  const footerPaddingClass = showSidebar
    ? isCollapsed
      ? 'md:pl-16'
      : 'md:pl-64'
    : '';

  return (
    <div className={"min-h-screen bg-background font-sans antialiased" + (className ? ` ${className}` : "") }>
      <div className="relative flex min-h-screen">
        {/* Header - Full width */}
        <div className="fixed top-0 left-0 right-0 z-30">
          <Header />
        </div>
        
        {/* Sidebar for owners and superadmins */}
        {showSidebar && (
          <div className="flex flex-shrink-0 fixed left-0 top-16 bottom-0 z-50">
            <Sidebar />
          </div>
        )}
        
        {/* Main content area */}
        <div className="flex flex-1 flex-col">
          {/* Main content with padding for fixed header and sidebar */}
          <main className={`flex-1 bg-gradient-to-br from-background via-background to-muted/20 pt-16 transition-all duration-300 ${sidebarPaddingClass}`}>
            <div className="min-h-full">
              {mainContent}
            </div>
          </main>

          {/* Enhanced Footer */}
          <footer className={`border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${footerPaddingClass}`}>
            <div className="px-6 py-6">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 max-w-7xl mx-auto">
                {/* Footer branding */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex items-center gap-3">
                    <svg 
                      className="h-5 w-5" 
                      viewBox="0 0 44 44"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient id="appLayoutIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
                          <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
                          <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
                        </linearGradient>
                      </defs>
                      
                      <circle cx="22" cy="22" r="22" fill="url(#appLayoutIconGradient)" />
                      
                      <g fill="white" opacity="0.95" transform="scale(0.5) translate(22, 22)">
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
                    <span className="text-sm font-medium text-foreground/80">
                      KisaanCenter
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    © 2025 Agricultural Management Platform. All rights reserved.
                  </div>
                </div>
                
                {/* Footer status and info */}
                <div className="flex flex-col md:flex-row items-center gap-4 text-sm">
                  {user && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span>System Active</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <a href="#" className="hover:text-foreground transition-colors">
                      Support
                    </a>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Privacy
                    </a>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Terms
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;