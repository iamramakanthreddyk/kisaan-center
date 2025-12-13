
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle, Star, ArrowRight, Users, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import type { Plan } from '../types/api';

const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await apiClient.get('/plans') as { success: boolean; data: Plan[] };
        if (response?.success && Array.isArray(response.data)) {
          setPlans(response.data.filter((plan: Plan) => plan.is_active));
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (monthly: number, yearly: number) => {
    if (isYearly) {
      return {
        price: yearly,
        period: 'year',
        savings: Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100)
      };
    }
    return { price: monthly, period: 'month', savings: 0 };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="container mx-auto px-4 py-16">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <svg 
                className="h-8 w-8" 
                viewBox="0 0 44 44"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="pricingIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
                    <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
                  </linearGradient>
                </defs>
                
                <circle cx="22" cy="22" r="22" fill="url(#pricingIconGradient)" />
                
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
              <span className="text-xl font-bold text-gray-900">KisaanCenter</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link to="/login">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Choose Your Perfect Plan
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Streamline your agricultural business with our comprehensive management platform. 
          From transactions to inventory, we've got you covered.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isYearly
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isYearly
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">
                Save up to 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const pricing = formatPrice(plan.price_monthly, plan.price_yearly);
            
            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  plan.is_popular
                    ? 'border-emerald-500 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white px-4 py-1 text-sm font-medium">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        ₹{pricing.price.toLocaleString()}
                      </span>
                      <span className="text-lg text-gray-600 ml-1">
                        /{pricing.period}
                      </span>
                    </div>
                    {pricing.savings > 0 && (
                      <p className="text-sm text-emerald-600 mt-1">
                        Save {pricing.savings}% with yearly billing
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-sm font-medium">{plan.max_users} Users</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Zap className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-sm font-medium">{plan.max_transactions.toLocaleString()} Transactions</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-emerald-600" />
                      Features Included
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Support Level */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      {plan.support_level} Support
                    </p>
                  </div>

                  {/* CTA Button */}
                  <Link to="/login" className="block">
                    <Button
                      className={`w-full transition-all duration-300 ${
                        plan.is_popular
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need a Custom Solution?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            For large enterprises or specialized requirements, we offer custom plans 
            tailored to your specific business needs.
          </p>
          <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
            Contact Sales
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg 
                className="h-6 w-6" 
                viewBox="0 0 44 44"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="footerIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#10b981", stopOpacity:1}} />
                    <stop offset="50%" style={{stopColor:"#059669", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#047857", stopOpacity:1}} />
                  </linearGradient>
                </defs>
                
                <circle cx="22" cy="22" r="22" fill="url(#footerIconGradient)" />
                
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
              <span className="text-xl font-bold">KisaanCenter</span>
            </div>
          </div>
          <p className="text-gray-400 max-w-md mx-auto">
            Empowering agricultural businesses with modern technology and comprehensive management solutions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;