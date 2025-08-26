import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Shield, Crown, Search, Calendar, Activity, Target } from "lucide-react";
import Header from "@/components/Header";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";
import { useState } from "react";

export default function Profile() {
  const { user, telegramWebApp, initData, telegramUser } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    retry: false,
  });

  const { data: searchHistory } = useQuery({
    queryKey: ["/api/search/history"],
    retry: false,
  });

  const isPremium = (subscriptionStatus as any)?.isPremium || false;
  const remainingQueries = (subscriptionStatus as any)?.remainingQueries || 0;
  const totalSearches = Array.isArray(searchHistory) ? searchHistory.length : 0;
  const dailyLimit = 3;
  const usedToday = dailyLimit - remainingQueries;

  // Calculate search type distribution
  const searchTypes = Array.isArray(searchHistory) 
    ? searchHistory.reduce((acc: Record<string, number>, search: any) => {
        acc[search.queryType] = (acc[search.queryType] || 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <>
      <div className="min-h-screen bg-dark-primary text-foreground">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Profile Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="text-profile-title">
                  Profile
                </h1>
                <p className="text-muted-foreground">
                  {(user as any)?.email || "OSINT Analyst"}
                </p>
              </div>
              <div className="ml-auto">
                <Badge 
                  variant={isPremium ? "default" : "secondary"}
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    isPremium 
                      ? "bg-gradient-to-r from-primary to-secondary text-white" 
                      : "bg-warning/20 text-warning"
                  }`}
                  data-testid="badge-profile-plan"
                >
                  {isPremium && <Crown className="w-4 h-4 mr-1" />}
                  {isPremium ? "PREMIUM" : "FREE"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Account Information */}
            <Card className="bg-dark-secondary border-dark-tertiary">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-primary" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="text-foreground font-mono text-sm" data-testid="text-user-id">
                    {(user as any)?.id ? `${(user as any).id.slice(0, 8)}...` : "Loading..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram ID</span>
                  <span className="text-foreground font-mono text-sm" data-testid="text-telegram-id">
                    {(user as any)?.telegramId || telegramUser?.id || "Not detected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground" data-testid="text-user-name">
                    {(user as any)?.firstName || telegramUser?.first_name || "Not available"} {(user as any)?.lastName || telegramUser?.last_name || ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username</span>
                  <span className="text-foreground" data-testid="text-username">
                    {(user as any)?.username || telegramUser?.username ? `@${(user as any)?.username || telegramUser?.username}` : "Not available"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan Status</span>
                  <span className={`font-medium ${isPremium ? 'text-primary' : 'text-warning'}`}>
                    {isPremium ? "Premium Active" : "Free Tier"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="text-foreground">
                    {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Debug Information (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <Card className="bg-dark-secondary border-dark-tertiary">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <Target className="w-5 h-5 mr-2 text-secondary" />
                    Debug Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telegram Available</span>
                      <span className={`${telegramWebApp ? 'text-green-500' : 'text-red-500'}`}>
                        {telegramWebApp ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Init Data Length</span>
                      <span className="text-foreground">{initData?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telegram User ID</span>
                      <span className="text-foreground font-mono text-xs">
                        {telegramUser?.id || 'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database User</span>
                      <span className={`${user ? 'text-green-500' : 'text-red-500'}`}>
                        {user ? 'Found' : 'Not found'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Usage Statistics */}
            <Card className="bg-dark-secondary border-dark-tertiary">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-accent" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Searches</span>
                  <span className="text-foreground font-bold" data-testid="text-total-searches">
                    {totalSearches}
                  </span>
                </div>
                
                {!isPremium && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Usage</span>
                        <span className="text-foreground">
                          {usedToday} / {dailyLimit}
                        </span>
                      </div>
                      <Progress 
                        value={(usedToday / dailyLimit) * 100} 
                        className="h-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        {remainingQueries} searches remaining today
                      </p>
                    </div>
                    <Separator className="bg-dark-tertiary" />
                  </>
                )}

                <div className="space-y-2">
                  <span className="text-muted-foreground text-sm">Search Types</span>
                  {Object.keys(searchTypes).length > 0 ? (
                    Object.entries(searchTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{type}</span>
                        <span className="text-foreground">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No searches yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Management */}
            <Card className="bg-dark-secondary border-dark-tertiary lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-warning" />
                  Subscription Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPremium ? (
                  <div className="text-center py-6">
                    <Crown className="w-12 h-12 text-warning mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Premium Active</h3>
                    <p className="text-muted-foreground mb-4">
                      You have unlimited access to all intelligence search features
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <Search className="w-6 h-6 text-primary mx-auto mb-1" />
                        <span className="text-sm text-muted-foreground">Unlimited Searches</span>
                      </div>
                      <div>
                        <Target className="w-6 h-6 text-secondary mx-auto mb-1" />
                        <span className="text-sm text-muted-foreground">Advanced Results</span>
                      </div>
                      <div>
                        <Shield className="w-6 h-6 text-accent mx-auto mb-1" />
                        <span className="text-sm text-muted-foreground">Priority Support</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-8 h-8 text-warning" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Upgrade to Premium</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Get unlimited searches, advanced results, and priority support with our premium plan
                    </p>
                    <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Free Plan</h4>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• 3 searches per day</li>
                          <li>• Basic results</li>
                          <li>• Standard support</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Premium Plan</h4>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Unlimited searches</li>
                          <li>• Advanced results</li>
                          <li>• Priority support</li>
                          <li>• Export functionality</li>
                        </ul>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowUpgradeModal(true)}
                      className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
                      data-testid="button-upgrade-premium"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CryptoPaymentModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
      />
    </>
  );
}