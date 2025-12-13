/**
 * Combined Authentication page for login and signup
 * Mobile-first responsive design with form validation
 */

import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const { login, isAuthenticated, isLoading, clearError } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!loginData.email || !loginData.password) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await login(loginData.email, loginData.password);
      toast({
        title: 'Success',
        description: 'Welcome to KisaanCenter!',
      });
    } catch (error) {
      let message = 'Please check your credentials and try again';
      if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
        message = (error as { message: string }).message;
      }
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    // For now, since signup is not implemented in the backend,
    // show a message directing users to contact admin
    toast({
      title: 'Account Creation',
      description: 'Please contact your system administrator to create an account',
      variant: 'default',
    });
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg 
              className="h-12 w-12" 
              viewBox="0 0 44 44"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="authIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
                  <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
                </linearGradient>
              </defs>
              
              <circle cx="22" cy="22" r="22" fill="url(#authIconGradient)" />
              
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
          <h1 className="text-3xl font-bold text-primary-foreground">
            Welcome to KisaanCenter
          </h1>
          <p className="text-primary-foreground/80 mt-2">
            Agricultural market management platform
          </p>
        </div>

        {/* Auth Tabs */}
        <Card className="bg-background/95 backdrop-blur border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">Get Started</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
           <CardContent>
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="login">Sign In</TabsTrigger>
              </TabsList>

              {/* Demo Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-sm border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-900 dark:text-blue-100 text-center mb-2">
                  🚀 Welcome to KisaanCenter!
                </p>
                <div className="text-blue-700 dark:text-blue-200 space-y-1 text-center">
                  <p>No account yet? <strong>Create one first using the "Sign Up" tab!</strong></p>
                  <p className="text-xs">Use any email address to get started</p>
                </div>
              </div>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      value={loginData.email}
                      onChange={handleLoginInputChange}
                      placeholder="Enter your email"
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      value={loginData.password}
                      onChange={handleLoginInputChange}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username (Optional)</Label>
                    <Input
                      id="signup-username"
                      name="username"
                      type="text"
                      value={signupData.username}
                      onChange={handleSignupInputChange}
                      placeholder="Choose a username"
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      value={signupData.email}
                      onChange={handleSignupInputChange}
                      placeholder="Enter your email"
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      value={signupData.password}
                      onChange={handleSignupInputChange}
                      placeholder="Create a password (min 6 characters)"
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={handleSignupInputChange}
                      placeholder="Confirm your password"
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-primary-foreground/60">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
}