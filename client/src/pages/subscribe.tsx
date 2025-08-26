import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, Bitcoin, CheckCircle, Shield, Zap, Infinity, Users, Headphones } from "lucide-react";
import { useLocation } from "wouter";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const features = [
    {
      icon: Infinity,
      title: "Unlimited Searches",
      description: "No daily limits - search as much as you need"
    },
    {
      icon: Zap,
      title: "Priority Processing", 
      description: "Faster query processing and results delivery"
    },
    {
      icon: Shield,
      title: "Advanced Analytics",
      description: "Detailed threat intelligence and risk assessments"
    },
    {
      icon: Users,
      title: "Team Features",
      description: "Share insights and collaborate with your team"
    },
    {
      icon: Headphones,
      title: "Priority Support",
      description: "24/7 dedicated support for premium users"
    }
  ];

  return (
    <div className="min-h-screen bg-dark-primary">
      {/* Header */}
      <div className="border-b border-dark-tertiary">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button 
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-slate-400 hover:text-slate-200 p-0"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Intelligence Security X
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-6 flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Upgrade to Premium
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Unlock the full power of Intelligence Security X with unlimited OSINT searches and advanced threat intelligence capabilities.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="bg-dark-secondary border-dark-tertiary shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
            
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Bitcoin className="w-6 h-6 text-warning" />
                  <span className="text-3xl font-bold text-primary">0.001 BTC</span>
                </div>
                <span className="text-slate-400">/month</span>
              </div>
              <CardTitle className="text-2xl text-white">Premium Monthly</CardTitle>
              <p className="text-slate-400">Paid with cryptocurrency for enhanced privacy</p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Features List */}
              <div className="space-y-4">
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{feature.title}</h3>
                        <p className="text-slate-400 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Security Notice */}
              <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-secondary font-medium mb-1">Enhanced Privacy</h4>
                    <p className="text-slate-300 text-sm">
                      Pay with Bitcoin for complete transaction privacy. No credit cards, no personal financial data stored.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Button 
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 text-white font-semibold py-4 text-lg"
                data-testid="button-subscribe-premium"
              >
                <Bitcoin className="w-5 h-5 mr-2" />
                Subscribe with Crypto
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Subscription auto-expires after 30 days. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Free Plan */}
          <Card className="bg-dark-secondary border-dark-tertiary">
            <CardHeader>
              <CardTitle className="text-white text-center">Free Plan</CardTitle>
              <p className="text-slate-400 text-center">Limited daily access</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-slate-400">
                <CheckCircle className="w-4 h-4 text-slate-500" />
                <span>3 searches per day</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <CheckCircle className="w-4 h-4 text-slate-500" />
                <span>Basic search results</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <CheckCircle className="w-4 h-4 text-slate-500" />
                <span>Community support</span>
              </div>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="bg-dark-secondary border-primary relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 text-xs font-semibold rounded-full">
                RECOMMENDED
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-white text-center">Premium Plan</CardTitle>
              <p className="text-slate-400 text-center">Unlimited access & advanced features</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-white">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Unlimited searches</span>
              </div>
              <div className="flex items-center space-x-2 text-white">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Advanced analytics</span>
              </div>
              <div className="flex items-center space-x-2 text-white">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Priority support</span>
              </div>
              <div className="flex items-center space-x-2 text-white">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Team collaboration</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 text-left">
            <Card className="bg-dark-secondary border-dark-tertiary">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">How does crypto payment work?</h3>
                <p className="text-slate-400 text-sm">
                  Simply send the exact Bitcoin amount to our generated payment address. Once confirmed on the blockchain, 
                  your premium access will be activated automatically.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-dark-secondary border-dark-tertiary">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">What happens after 30 days?</h3>
                <p className="text-slate-400 text-sm">
                  Your subscription will automatically expire and you'll return to the free plan. 
                  You can subscribe again at any time to regain premium access.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-dark-secondary border-dark-tertiary">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">Is my data secure?</h3>
                <p className="text-slate-400 text-sm">
                  Yes! All searches are encrypted and we don't store personal payment information. 
                  Bitcoin payments provide an additional layer of financial privacy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <CryptoPaymentModal 
        open={showPaymentModal} 
        onOpenChange={setShowPaymentModal} 
      />
    </div>
  );
}