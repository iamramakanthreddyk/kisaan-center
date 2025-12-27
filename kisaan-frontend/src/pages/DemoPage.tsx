import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Users,
  ArrowRight,
  Plus,
  Eye,
  Edit,
  BookOpen,
  Calendar,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-emerald-600">KisaanCenter</div>
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
              <Button asChild>
                <Link to="/login">Try for Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Demo Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            See KisaanCenter in Action
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the actual interface farmers and shop owners use daily.
            This demo shows your real dashboard and user management tools.
          </p>
        </div>

        {/* Main Demo Interface - Based on Actual App */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Farmer Accounts Ledger - Simple Ledger */}
          <Card className="border-emerald-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                Farmer Accounts Ledger
              </CardTitle>
              <CardDescription>Track credits, debits, and balances for all farmers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mock Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button className="px-4 py-2 border-b-2 border-emerald-600 text-emerald-600 font-medium">Entries</button>
                <button className="px-4 py-2 text-gray-500">Summary</button>
                <button className="px-4 py-2 text-gray-500">Commission</button>
              </div>

              {/* Mock Ledger Entries */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">Ram Kumar</div>
                    <div className="text-sm text-gray-600">Credit - Wheat Sale</div>
                    <div className="text-xs text-gray-500">Dec 25, 2025</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">+₹2,500</div>
                    <div className="text-sm text-gray-600">Balance: ₹2,500</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">Sita Devi</div>
                    <div className="text-sm text-gray-600">Debit - Cash Payment</div>
                    <div className="text-xs text-gray-500">Dec 24, 2025</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">-₹1,800</div>
                    <div className="text-sm text-gray-600">Balance: ₹700</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">Mohan Singh</div>
                    <div className="text-sm text-gray-600">Credit - Rice Sale</div>
                    <div className="text-xs text-gray-500">Dec 23, 2025</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">+₹1,200</div>
                    <div className="text-sm text-gray-600">Balance: ₹1,200</div>
                  </div>
                </div>
              </div>

              {/* Mock Filters */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Range
                </Button>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Management - Owner Users Page */}
          <Card className="border-emerald-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                User Management
              </CardTitle>
              <CardDescription>Manage farmers, buyers, and staff members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mock Search and Filters */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    defaultValue=""
                  />
                </div>
                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">All Roles</option>
                  <option value="farmer">Farmer</option>
                  <option value="buyer">Buyer</option>
                </select>
              </div>

              {/* Mock User Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-medium">
                      RK
                    </div>
                    <div>
                      <div className="font-medium">Ram Kumar</div>
                      <div className="text-sm text-gray-600">ram@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">Farmer</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                      SD
                    </div>
                    <div>
                      <div className="font-medium">Sita Devi</div>
                      <div className="text-sm text-gray-600">sita@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">Farmer</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium">
                      MS
                    </div>
                    <div>
                      <div className="font-medium">Mohan Singh</div>
                      <div className="text-sm text-gray-600">mohan@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">Buyer</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Demo - Based on Actual Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Real Features You Get</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Farmer Ledger",
                description: "Complete credit/debit tracking with balance management for each farmer"
              },
              {
                icon: Users,
                title: "User Management",
                description: "Add, edit, and manage farmers, buyers, and staff with role-based access"
              },
              {
                icon: Filter,
                title: "Advanced Filters",
                description: "Search and filter users and transactions by date, category, and status"
              },
              {
                icon: Calendar,
                title: "Date Range Reports",
                description: "Generate summaries and reports for better business insights"
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-emerald-50 rounded-2xl p-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers and shop owners who trust KisaanCenter for their business needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/login">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;