import { Button } from "../ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, UserCircle, Sun, Moon, LogOut } from "lucide-react";
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
  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 w-full h-16 sticky top-0 z-50">
      <div className="flex h-16 items-center px-6 justify-between max-w-7xl mx-auto">
        <Link to={user?.role === 'owner' ? "/simple-ledger" : "/"} className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
          <Logo size="md" variant="default" />
        </Link>
        <div className="flex items-center space-x-3 md:space-x-3 flex-wrap md:flex-nowrap">
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
                  variant="destructive"
                  size="sm"
                  onClick={logout}
                  className="ml-2"
                  title="Logout"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
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
                  className="lg:hidden"
                  aria-label="Toggle theme"
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-red-600 hover:text-red-700 hover:bg-red-50"
                  aria-label="Logout"
                  onClick={logout}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
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
              <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium">
                <a href="/#features" className="text-foreground/70 hover:text-foreground transition-colors hover:underline underline-offset-4" onClick={e => handleNav(e, 'features')}>
                  Features
                </a>
                <a href="/#about" className="text-foreground/70 hover:text-foreground transition-colors hover:underline underline-offset-4" onClick={e => handleNav(e, 'about')}>
                  About Us
                </a>
                <a href="/#contact" className="text-foreground/70 hover:text-foreground transition-colors hover:underline underline-offset-4" onClick={e => handleNav(e, 'contact')}>
                  Contact
                </a>
              </nav>
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
  );
};

export default Header;