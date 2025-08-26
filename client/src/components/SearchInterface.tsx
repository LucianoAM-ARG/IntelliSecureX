import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Server, Mail, Fingerprint, Search, AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import CryptoPaymentModal from "./CryptoPaymentModal";

interface SearchInterfaceProps {
  onSearchResults: (results: any) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
}

const searchTypes = [
  { id: 'domain', label: 'Domain', icon: Globe },
  { id: 'ip', label: 'IP Address', icon: Server },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'hash', label: 'Hash', icon: Fingerprint },
];

export default function SearchInterface({ onSearchResults, isSearching, setIsSearching }: SearchInterfaceProps) {
  const [selectedSearchType, setSelectedSearchType] = useState('domain');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    retry: false,
  });

  const searchMutation = useMutation({
    mutationFn: async ({ queryType, queryTerm }: { queryType: string; queryTerm: string }) => {
      setIsSearching(true);
      const response = await apiRequest("POST", "/api/search", { queryType, queryTerm });
      return await response.json();
    },
    onSuccess: (data) => {
      onSearchResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/search/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Search Completed",
        description: `Found ${data.total} results`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      if (error.message.includes("Daily query limit reached")) {
        setShowUpgradeModal(true);
        toast({
          title: "Daily Limit Reached",
          description: "Upgrade to Premium for unlimited searches",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSearching(false);
    }
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    searchMutation.mutate({
      queryType: selectedSearchType,
      queryTerm: searchQuery.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  const isPremium = (subscriptionStatus as any)?.isPremium || false;
  const remainingQueries = (subscriptionStatus as any)?.remainingQueries;

  return (
    <>
      <Card className="bg-dark-secondary border-dark-tertiary shadow-lg">
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-search-title">
              Intelligence Search
            </h2>
            <p className="text-muted-foreground">
              Search domains, IPs, emails, and more using advanced OSINT techniques
            </p>
          </div>

          {/* Search Type Selector */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {searchTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedSearchType === type.id;
                
                return (
                  <Button
                    key={type.id}
                    variant={isSelected ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setSelectedSearchType(type.id)}
                    className={`${
                      isSelected
                        ? "bg-primary text-white hover:bg-primary/80"
                        : "bg-dark-tertiary text-foreground hover:bg-dark-tertiary/80"
                    }`}
                    data-testid={`button-search-type-${type.id}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder="Enter domain, IP, email, or hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-16 bg-dark-primary border-dark-tertiary text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isSearching}
              data-testid="input-search-query"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary/80 px-4 py-2"
              data-testid="button-perform-search"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-white" />
              )}
            </Button>
          </div>

          {/* Free User Limitations */}
          {!isPremium && (
            <Alert className="bg-warning/10 border-warning/20">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <AlertDescription className="text-warning">
                <span className="font-medium">Free Account Limitations</span>
                <br />
                <span className="text-foreground/80 text-sm">
                  You have <span className="font-bold text-warning" data-testid="text-remaining-queries">
                    {remainingQueries || 0}
                  </span> searches remaining today.{' '}
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-primary hover:underline"
                    data-testid="button-upgrade-inline"
                  >
                    Upgrade to Premium
                  </button> for unlimited searches.
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <CryptoPaymentModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
      />
    </>
  );
}
