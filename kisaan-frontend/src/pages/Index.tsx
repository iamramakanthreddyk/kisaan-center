import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "react-router-dom"
import { 
  Users, 
  Store, 
  TrendingUp, 
  Shield, 
  Smartphone, 
  BarChart3,
  CheckCircle,
  ArrowRight,
  Target,
  Zap
} from "lucide-react"

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          {/* Clear Value Proposition */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              Digital Khata for{" "}
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
              <Button asChild size="xl" className="w-full sm:w-auto shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 text-lg">
                <Link to="/login" className="flex items-center justify-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Link to="/demo">
                  See How It Works
                  <BarChart3 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your agricultural business efficiently
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Farmer Management",
                description: "Add and manage farmers with detailed profiles, contact information, and transaction history."
              },
              {
                icon: Store,
                title: "Shop Management",
                description: "Complete shop management with inventory tracking, product catalogs, and multi-tenant support."
              },
              {
                icon: TrendingUp,
                title: "Transaction Tracking",
                description: "Streamlined three-party transaction model with real-time processing and commission tracking."
              },
              {
                icon: Shield,
                title: "Secure Payments",
                description: "Built-in payment processing with credit management and secure financial transactions."
              },
              {
                icon: BarChart3,
                title: "Business Analytics",
                description: "Comprehensive analytics dashboard with business insights and performance metrics."
              },
              {
                icon: Smartphone,
                title: "Mobile Optimized",
                description: "Responsive design that works seamlessly across all devices and platforms."
              }
            ].map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Empowering Agricultural Businesses
              </h2>
              <p className="text-lg text-gray-600">
                KisaanCenter was born from the need to modernize traditional agricultural business practices.
                We understand the challenges faced by farmers and shop owners in managing their operations manually.
              </p>
              <p className="text-lg text-gray-600">
                Our platform bridges the gap between traditional farming practices and modern digital solutions,
                making it easier for everyone in the agricultural ecosystem to thrive.
              </p>
              <div className="grid grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">10K+</div>
                  <div className="text-gray-600">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">50+</div>
                  <div className="text-gray-600">Regions Served</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">99.9%</div>
                  <div className="text-gray-600">Uptime</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-emerald-100 rounded-2xl p-8">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🌾</div>
                  <h3 className="text-xl font-semibold">Our Mission</h3>
                  <p className="text-gray-600">
                    To digitize and streamline agricultural business operations,
                    connecting farmers, buyers, and shop owners in one unified platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle>Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Ready to get started? Our sales team is here to help.</p>
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle>Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Need help? Our support team is available 24/7.</p>
                <Button variant="outline" className="w-full">
                  Get Support
                </Button>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle>Partnerships</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Interested in partnering with us?</p>
                <Button variant="outline" className="w-full">
                  Partner With Us
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-12">
            <p className="text-gray-600">
              Email us at <a href="mailto:hello@kisaancenter.com" className="text-emerald-600 hover:underline">hello@kisaancenter.com</a>
            </p>
          </div>
        </div>
      </section>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-emerald-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-green-200 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </div>
  )
}

export default Index