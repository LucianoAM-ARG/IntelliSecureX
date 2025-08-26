import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown, CheckCircle, X, Bitcoin } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const [, setLocation] = useLocation();

  const handleSubscribe = () => {
    onOpenChange(false);
    setLocation("/subscribe");
  };

  const features = [
    "Unlimited searches",
    "Advanced analytics", 
    "Priority processing",
    "Team collaboration",
    "Export capabilities",
    "24/7 Priority support",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-dark-secondary border-dark-tertiary max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Upgrade to Premium</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-slate-200 p-1"
              data-testid="button-close-modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-400">Unlock the full power of Intelligence Security X</p>
        </div>

        <div className="space-y-4 mb-6">
          <Card className="bg-dark-primary border-dark-tertiary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Monthly Plan</span>
                <div className="flex items-center space-x-1">
                  <Bitcoin className="w-4 h-4 text-warning" />
                  <span className="text-primary font-bold text-xl">0.001 BTC</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-secondary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium">Annual Plan</span>
                  <Badge className="bg-secondary px-2 py-1 text-xs font-medium text-white">
                    Save 25%
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 line-through text-sm">$348</span>
                  <span className="text-primary font-bold text-xl ml-2">$261</span>
                </div>
              </div>
              <p className="text-sm text-slate-300">$21.75/month - Best value</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-dark-tertiary text-slate-300 hover:bg-dark-tertiary"
            data-testid="button-cancel-upgrade"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubscribe}
            className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
            data-testid="button-subscribe-now"
          >
            Subscribe Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
