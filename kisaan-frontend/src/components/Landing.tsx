import React from 'react';
import { Logo } from './ui/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, BarChart3, ArrowRight, CheckCircle, Smartphone, Shield, Zap } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          {/* Enhanced Logo Display */}
          <div className="flex justify-center">
            <Logo size="xl" variant="default" />
          </div>
          
          {/* Clear Value Proposition */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              Digital Bahi Khata for{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Farmers & Shop Owners
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Track sales, manage farmer credits, and grow your agricultural business with real-time digital ledger. 
              Connect farmers, buyers, and your shop in one simple app.
            </p>
          </div>

          {/* Visual Mockup - Owner with Farmers and Real-time Ledger */}
          <div className="mt-12 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-emerald-100">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Illustration Side */}
                <div className="text-center space-y-4">
                  <div className="relative">
                    {/* Owner Icon */}
                    <div className="w-20 h-20 bg-emerald-600 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold">
                      👨‍💼
                    </div>
                    <div className="text-sm text-gray-600 mt-2">Shop Owner</div>
                    
                    {/* Connecting Lines to Farmers */}
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-px h-16 bg-emerald-300"></div>
                    
                    {/* Farmers */}
                    <div className="flex justify-center space-x-8 mt-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">
                          👨‍🌾
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Farmer 1</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">
                          👩‍🌾
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Farmer 2</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">
                          👨‍🌾
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Farmer 3</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Manage your entire network effortlessly</p>
                </div>
                
                {/* Real-time Ledger Display */}
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Zap className="w-4 h-4 text-green-500 mr-2" />
                    Real-time Sales Ledger
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span>Ram Kumar (Farmer)</span>
                      <span className="text-green-600 font-medium">+₹2,500</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span>Sita Devi (Farmer)</span>
                      <span className="text-green-600 font-medium">+₹1,800</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span>Mohan Singh (Farmer)</span>
                      <span className="text-red-600 font-medium">-₹500</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="font-medium">Total Outstanding</span>
                      <span className="text-blue-600 font-bold">₹3,800</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Last updated: Just now
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="grid md:grid-cols-4 gap-4 mt-12 max-w-6xl mx-auto">
            {[
              {
                icon: Smartphone,
                title: "Mobile First",
                description: "Access anywhere, anytime on your phone"
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Your data stays safe and confidential"
              },
              {
                icon: Zap,
                title: "Real-time Updates",
                description: "Instant sync across all your devices"
              },
              {
                icon: CheckCircle,
                title: "Easy to Use",
                description: "Simple interface designed for everyone"
              }
            ].map((benefit, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow border-emerald-100">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
                    <benefit.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-sm">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-xs">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-12 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="emerald" size="xl" className="w-full sm:w-auto shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 text-lg">
                <Link to="/login" className="flex items-center justify-center">
                  Try for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Link to="/dashboard">
                  View Demo
                  <BarChart3 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Join 10,000+ farmers and shop owners already using Kisaan Center. No credit card required.
            </p>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-emerald-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-green-200 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </div>
  );
};

export default Landing;
