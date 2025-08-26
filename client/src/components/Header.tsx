import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Crown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CryptoPaymentModal from "./CryptoPaymentModal";

export default function Header() {
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    retry: false,
  });

  const isPremium = subscriptionStatus?.isPremium || false;
  const userPlan = isPremium ? "PREMIUM" : "FREE";

  return (
    <>
      <div className="bg-dark-secondary border-b border-dark-tertiary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white" data-testid="text-app-title">
                  Intelligence Security X
                </h1>
                <p className="text-xs text-muted-foreground">Professional OSINT Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge 
                variant={isPremium ? "default" : "secondary"}
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  isPremium 
                    ? "bg-gradient-to-r from-primary to-secondary text-white" 
                    : "bg-warning/20 text-warning"
                }`}
                data-testid="badge-user-plan"
              >
                {isPremium && <Crown className="w-3 h-3 mr-1" />}
                {userPlan}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 bg-dark-tertiary rounded-full flex items-center justify-center p-0"
                    data-testid="button-user-menu"
                  >
                    <User className="w-4 h-4 text-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-dark-secondary border-dark-tertiary">
                  <DropdownMenuItem className="text-foreground focus:bg-dark-tertiary">
                    <div className="flex flex-col">
                      <span className="font-medium" data-testid="text-user-email">
                        {user?.email || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {subscriptionStatus?.remainingQueries !== null 
                          ? `${subscriptionStatus?.remainingQueries || 0} searches left today`
                          : "Unlimited searches"
                        }
                      </span>
                    </div>
                  </DropdownMenuItem>
                  
                  {!isPremium && (
                    <DropdownMenuItem 
                      onClick={() => setShowUpgradeModal(true)}
                      className="text-primary focus:bg-dark-tertiary"
                      data-testid="button-upgrade"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={() => window.location.href = "/api/logout"}
                    className="text-foreground focus:bg-dark-tertiary"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
