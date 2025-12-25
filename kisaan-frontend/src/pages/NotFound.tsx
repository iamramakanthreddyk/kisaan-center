/**
 * 404 Not Found page component
 * Mobile-first responsive design with navigation back to app
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  React.useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // If authenticated, redirect to appropriate dashboard instead of showing 404
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const redirectTimer = setTimeout(() => {
        if (user.role === 'owner') {
          navigate('/simple-ledger', { replace: true });
        } else if (user.role === 'superadmin') {
          navigate('/superadmin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 1500);
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg 
              className="h-12 w-12" 
              viewBox="0 0 44 44"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="notFoundIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
                  <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
                </linearGradient>
              </defs>
              
              <circle cx="22" cy="22" r="22" fill="url(#notFoundIconGradient)" />
              
              <g fill="white" opacity="0.95">
                <path d="M22 10 L22 34 M20 12 L24 12 M19 15 L25 15 M18 18 L26 18 M19 21 L25 21 M20 24 L24 24 M21 27 L23 27" 
                      stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                
                <circle cx="16" cy="14" r="1.5"/>
                <circle cx="15" cy="17" r="1.5"/>
                <circle cx="16" cy="20" r="1.5"/>
                <circle cx="17" cy="23" r="1.5"/>
                
                <circle cx="28" cy="14" r="1.5"/>
                <circle cx="29" cy="17" r="1.5"/>
                <circle cx="28" cy="20" r="1.5"/>
                <circle cx="27" cy="23" r="1.5"/>
                
                <circle cx="22" cy="16" r="1"/>
                <circle cx="22" cy="19" r="1"/>
                <circle cx="22" cy="22" r="1"/>
                <circle cx="22" cy="25" r="1"/>
              </g>
              
              <circle cx="22" cy="22" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">
            KisaanCenter
          </h1>
        </div>

        {/* 404 Card or Redirect Message */}
        <Card className="bg-background/95 backdrop-blur border-border/50">
          {isAuthenticated ? (
            <CardHeader className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Redirecting...</CardTitle>
              <CardDescription>
                You're being redirected to your {user?.role === 'owner' ? 'owner' : user?.role === 'superadmin' ? 'superadmin' : 'dashboard'} dashboard.
              </CardDescription>
            </CardHeader>
          ) : (
            <>
              <CardHeader className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="text-4xl font-bold text-muted-foreground mb-2">
                  404
                </div>
                <CardTitle>Page Not Found</CardTitle>
                <CardDescription>
                  The page you're looking for doesn't exist or has been moved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/" className="w-full">
                  <Button className="w-full" variant="default">
                    <Home className="mr-2 h-4 w-4" />
                    Go to Homepage
                  </Button>
                </Link>
                
                <Button 
                  onClick={() => window.history.back()} 
                  variant="outline" 
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        {/* Help Text */}
        <div className="text-center mt-8">
          <p className="text-sm text-primary-foreground/60">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
}
