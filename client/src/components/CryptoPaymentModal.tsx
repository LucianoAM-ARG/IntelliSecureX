import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown, Copy, CheckCircle, X, Bitcoin, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CryptoPaymentModal({ open, onOpenChange }: CryptoPaymentModalProps) {
  const [step, setStep] = useState<'create' | 'payment' | 'verify'>('create');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [txHash, setTxHash] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/crypto/create-payment");
      return await response.json();
    },
    onSuccess: (data) => {
      setPaymentData(data);
      setStep('payment');
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
      
      toast({
        title: "Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, txHash }: { paymentId: string; txHash: string }) => {
      const response = await apiRequest("POST", "/api/crypto/verify-payment", { paymentId, txHash });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Verified",
        description: "Welcome to Premium! You now have unlimited searches.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onOpenChange(false);
      setStep('create');
      setPaymentData(null);
      setTxHash('');
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
      
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    onOpenChange(false);
    setStep('create');
    setPaymentData(null);
    setTxHash('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const handleCreatePayment = () => {
    createPaymentMutation.mutate();
  };

  const handleVerifyPayment = () => {
    if (!txHash.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter the transaction hash",
        variant: "destructive",
      });
      return;
    }

    verifyPaymentMutation.mutate({
      paymentId: paymentData.paymentId,
      txHash: txHash.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-dark-secondary border-dark-tertiary max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Upgrade to Premium</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200 p-1"
              data-testid="button-close-modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {step === 'create' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-400">Pay with cryptocurrency to unlock unlimited searches</p>
            </div>

            <Card className="bg-dark-primary border-dark-tertiary mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Premium Monthly</span>
                  <div className="flex items-center space-x-2">
                    <Bitcoin className="w-4 h-4 text-warning" />
                    <span className="text-primary font-bold text-xl">0.001 BTC</span>
                  </div>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-secondary flex-shrink-0" />
                    <span>Unlimited searches</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-secondary flex-shrink-0" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-secondary flex-shrink-0" />
                    <span>Priority support</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleCreatePayment}
              disabled={createPaymentMutation.isPending}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
              data-testid="button-create-payment"
            >
              {createPaymentMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Payment...</span>
                </div>
              ) : (
                "Create Payment"
              )}
            </Button>
          </>
        )}

        {step === 'payment' && paymentData && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-warning/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Bitcoin className="w-8 h-8 text-warning" />
              </div>
              <p className="text-slate-400">Send Bitcoin to the address below</p>
            </div>

            <Card className="bg-dark-primary border-dark-tertiary mb-4">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Amount</div>
                    <div className="flex items-center space-x-2">
                      <Bitcoin className="w-4 h-4 text-warning" />
                      <span className="text-white font-mono">{paymentData.amount} BTC</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Payment Address</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono text-sm break-all">{paymentData.paymentAddress}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentData.paymentAddress)}
                        className="text-primary hover:text-primary/80 p-1"
                        data-testid="button-copy-address"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="bg-warning/10 border-warning/20 mb-4">
              <AlertCircle className="w-4 h-4 text-warning" />
              <AlertDescription className="text-warning text-sm">
                Payment expires in 24 hours. Send the exact amount to the address above.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setStep('verify')}
              className="w-full bg-dark-tertiary hover:bg-dark-tertiary/80 text-slate-300"
              data-testid="button-payment-sent"
            >
              I've Sent the Payment
            </Button>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
              <p className="text-slate-400">Enter your transaction hash to verify payment</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-2">Transaction Hash</div>
                <Input
                  type="text"
                  placeholder="Enter the transaction hash from your wallet..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="bg-dark-primary border-dark-tertiary text-white placeholder-slate-500"
                  data-testid="input-tx-hash"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => setStep('payment')}
                className="flex-1 border-dark-tertiary text-slate-300 hover:bg-dark-tertiary"
                data-testid="button-back"
              >
                Back
              </Button>
              <Button 
                onClick={handleVerifyPayment}
                disabled={verifyPaymentMutation.isPending || !txHash.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
                data-testid="button-verify-payment"
              >
                {verifyPaymentMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Payment"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}