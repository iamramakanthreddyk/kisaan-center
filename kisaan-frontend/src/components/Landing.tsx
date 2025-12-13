import React from 'react';
import { Logo } from './ui/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';

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
          
          {/* Welcome Message */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                KisaanCenter
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your comprehensive agricultural business platform. Streamline operations, 
              connect with stakeholders, and grow your agribusiness with confidence.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
            {[
              {
                icon: Users,
                title: "Community Network",
                description: "Connect farmers, buyers, and shop owners in one unified platform"
              },
              {
                icon: TrendingUp,
                title: "Business Growth",
                description: "Scale your operations with intelligent insights and automation"
              },
              {
                icon: BarChart3,
                title: "Data Analytics",
                description: "Make informed decisions with comprehensive reporting and analytics"
              }
            ].map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-emerald-100">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-12 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">
                  Get Started
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-gray-500">
              Ready to transform your agricultural business? Join thousands of users worldwide.
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
