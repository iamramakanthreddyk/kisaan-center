import { Button } from "../ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, UserCircle, Sun, Moon, LogOut, Home, Users, Settings } from "lucide-react";
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { Logo } from '../ui/logo';
import { Badge } from '../ui/badge';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { SearchDropdown } from '../ui/SearchDropdown';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setIsMobileOpen } = useSidebar();

  const isFarmer = user?.role === 'farmer';

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, section: string) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate(`/#${section}`);
      setTimeout(() => {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else window.location.hash = `#${section}`;
    }
  };
  
  const { logout } = useAuth();
  
  // Mobile Bottom Navigation for owners
  const MobileBottomNav = () => {
    if (!user || user.role !== 'owner') return null;
    
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t border-border/40 z-50">
        <div className="flex items-center justify-center h-16 max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between w-full max-w-md">
            <Link 
              to="/simple-ledger" 
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                location.pathname === '/simple-ledger' 
                  ? 'text-emerald-600 bg-emerald-50' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Home className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Ledger</span>
            </Link>
            
            <Link 
              to="/users" 
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                location.pathname === '/users' 
                  ? 'text-emerald-600 bg-emerald-50' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Users</span>
            </Link>
            
            <Link 
              to="/settings" 
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                location.pathname === '/settings' 
                  ? 'text-emerald-600 bg-emerald-50' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Settings className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 w-full h-16 sticky top-0 z-50">
      <div className="flex h-16 items-center px-4 md:px-6 justify-between max-w-7xl mx-auto">
        <Link to={user?.role === 'owner' ? "/simple-ledger" : "/"} className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
          <Logo size="sm" variant="default" />
        </Link>
        <div className="flex items-center space-x-2 md:space-x-3 flex-wrap md:flex-nowrap">
          {user ? (
            isFarmer ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  <span className="font-semibold">{user.firstname && user.firstname.trim() ? user.firstname : user.username}</span>
                </span>
                <Badge variant="secondary" className="text-xs capitalize">
                  {user.role}
                </Badge>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Online" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 touch-manipulation text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                {/* Mobile: Compact layout */}
                <div className="md:hidden flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    <span className="font-semibold">{user.firstname && user.firstname.trim() ? user.firstname : user.username}</span>
                  </span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {user.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Logout"
                    onClick={logout}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Desktop: Full layout */}
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      <span className="font-semibold">{user.firstname && user.firstname.trim() ? user.firstname : user.username}</span>
                    </span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {user.role}
                    </Badge>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Online" />
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <NotificationDropdown />
                  <SearchDropdown />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle theme"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
                <div className="hidden md:flex items-center space-x-2">
                  <Button asChild variant="ghost" size="sm" className="font-medium">
                    <Link to="/login">
                      <UserCircle className="h-4 w-4 mr-2" />
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm">
                    <Link to="/login">Get Started</Link>
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setIsMobileOpen(true)}
                  aria-label="Open mobile menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
    <MobileBottomNav />
    </>
  );
};

export default Header;