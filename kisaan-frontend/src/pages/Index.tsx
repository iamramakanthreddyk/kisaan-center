import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import heroImage from "@/assets/hero-agriculture.jpg"
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
  Leaf,
  Target,
  Globe
} from "lucide-react"

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container px-4 py-24 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                  Modernize Your{" "}
                  <span className="bg-gradient-to-r from-primary-emerald to-accent-amber bg-clip-text text-transparent">
                    Agricultural Business
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  Connect farmers, buyers, and shop owners in one comprehensive platform. 
                  Streamline transactions, manage inventory, and grow your agribusiness with confidence.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="xl" className="group" asChild>
                  <Link to="/login">
                    <span className="block sm:hidden">Login</span>
                    <span className="hidden sm:inline">Start Your Journey</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link to="/pricing">
                    View Pricing
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Multi-tenant Ready</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Real-time Tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Secure Payments</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero rounded-3xl opacity-20 blur-3xl"></div>
              <img 
                src={heroImage} 
                alt="Modern agriculture with digital technology" 
                className="relative rounded-3xl shadow-strong w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/50">
        <div className="container px-4 mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need to{" "}
              <span className="text-primary-emerald">Succeed</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools designed specifically for agricultural businesses, 
              from small farms to large enterprises.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Multi-Role Management",
                description: "Support for farmers, buyers, shop owners, and administrators with role-based access control."
              },
              {
                icon: Store,
                title: "Shop Management",
                description: "Complete shop management system with inventory tracking, product catalogs, and multi-tenant support."
              },
              {
                icon: TrendingUp,
                title: "Transaction Processing",
                description: "Streamlined three-party transaction model with real-time processing and commission tracking."
              },
              {
                icon: Shield,
                title: "Secure Payments",
                description: "Built-in payment processing with credit management and secure financial transactions."
              },
              {
                icon: BarChart3,
                title: "Analytics & Reports",
                description: "Comprehensive analytics dashboard with business insights and performance metrics."
              },
              {
                icon: Smartphone,
                title: "Mobile Ready",
                description: "Responsive design that works seamlessly across all devices and platforms."
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-gradient-card border-border/50 hover:shadow-medium transition-all duration-300">
                <CardHeader>
                  <div className="bg-primary-emerald/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-emerald" />
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

      {/* Stats Section */}
      <section className="py-24">
        <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Target, number: "10K+", label: "Active Users" },
              { icon: Globe, number: "50+", label: "Supported Regions" },
              { icon: Leaf, number: "99.9%", label: "Uptime Guarantee" }
            ].map((stat, index) => (
              <div key={index} className="space-y-4">
                <div className="bg-primary-emerald/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                  <stat.icon className="h-8 w-8 text-primary-emerald" />
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-primary-emerald">{stat.number}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-hero">
        <div className="container px-4 mx-auto text-center">
          <div className="space-y-8 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              Ready to Transform Your Agricultural Business?
            </h2>
            <p className="text-xl text-primary-foreground/80">
              Join thousands of farmers, buyers, and shop owners who trust KisaanCenter 
              to power their agricultural operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="xl" className="bg-background text-foreground hover:bg-background/90" asChild>
                <Link to="/login">Start Free Trial</Link>
              </Button>
              <Button variant="outline" size="xl" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Index