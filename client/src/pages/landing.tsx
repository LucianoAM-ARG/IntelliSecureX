import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Search, Zap, Crown, CheckCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-primary text-slate-100">
      {/* Header */}
      <div className="bg-dark-secondary border-b border-dark-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Intelligence Security X</h1>
                <p className="text-xs text-slate-400">Professional OSINT Platform</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="bg-primary hover:bg-primary/80"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Advanced OSINT
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Intelligence</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-3xl mx-auto">
            Uncover hidden intelligence with our professional-grade OSINT platform. 
            Search domains, IPs, emails, and more with advanced threat intelligence capabilities.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 text-lg px-8 py-6"
            data-testid="button-get-started"
          >
            Get Started Free
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Powerful Intelligence Features</h2>
          <p className="text-slate-400 text-lg">Everything you need for comprehensive OSINT investigations</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-dark-secondary border-dark-tertiary">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Multi-Source Search</h3>
              <p className="text-slate-400">
                Search across domains, IPs, emails, and hashes with advanced filtering and real-time results.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-dark-secondary border-dark-tertiary">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Threat Intelligence</h3>
              <p className="text-slate-400">
                Access comprehensive threat data including breaches, malware, and dark web intelligence.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-dark-secondary border-dark-tertiary">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Real-time Results</h3>
              <p className="text-slate-400">
                Get instant access to intelligence data with our high-performance search infrastructure.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Choose Your Plan</h2>
          <p className="text-slate-400 text-lg">Start free, upgrade when you need more power</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="bg-dark-secondary border-dark-tertiary">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="text-4xl font-bold text-white mb-4">$0</div>
                <p className="text-slate-400">Perfect for getting started</p>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">3 searches per day</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">Basic search types</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">Search history</span>
                </div>
              </div>

              <Button 
                className="w-full bg-dark-tertiary hover:bg-dark-tertiary/80"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-free-plan"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-primary to-secondary px-4 py-1 rounded-full text-white text-sm font-medium">
                Most Popular
              </div>
            </div>
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Crown className="w-6 h-6 text-warning" />
                  <h3 className="text-2xl font-bold text-white">Premium</h3>
                </div>
                <div className="text-4xl font-bold text-white mb-4">$29</div>
                <p className="text-slate-400">Unlimited intelligence power</p>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">Unlimited searches</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">Advanced threat intelligence</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">API access & integrations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">Priority support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-secondary" />
                  <span className="text-slate-300">Export capabilities</span>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-premium-plan"
              >
                Start Premium Trial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-dark-secondary border-t border-dark-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-400">
            <p>&copy; 2024 Intelligence Security X. Professional OSINT Platform.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
