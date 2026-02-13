import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Plus, Smartphone, Monitor, Zap, Sparkles, Database, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCanUseCompleteCalculator } from "@/hooks/useDeviceType";
import { useTransactionTaxData } from "@/hooks/useTransactionTaxData";
import { useSubscription } from "@/hooks/useSubscription";
import { CompleteCalculator } from "@/components/CompleteCalculator";
import SimpleCalculatorContent from "./SimpleCalculatorContent";

interface DashboardCalculatorProps {
  onCalculationSaved?: () => void;
}

type CalculatorType = "choice" | "simple" | "complete";

export default function DashboardCalculator({ onCalculationSaved }: DashboardCalculatorProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [calculatorType, setCalculatorType] = useState<CalculatorType>("choice");
  const [useTransactionData, setUseTransactionData] = useState(false);
  const canUseComplete = useCanUseCompleteCalculator();
  const { data: transactionData, hasData: hasTransactionData } = useTransactionTaxData();
  const { isPro } = useSubscription();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setCalculatorType("choice");
      setUseTransactionData(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCalculatorType("choice");
    setUseTransactionData(false);
  };

  const handleSelectComplete = (prefill: boolean) => {
    setUseTransactionData(prefill);
    setCalculatorType("complete");
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Calculation
        </Button>
      </DialogTrigger>
      <DialogContent className={calculatorType === "complete" ? "w-[95vw] max-w-[95vw] lg:max-w-[80vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6" : "w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {calculatorType === "choice" ? "Choose Calculator" : calculatorType === "simple" ? "Simple Calculator" : "Complete Calculator"}
          </DialogTitle>
        </DialogHeader>
        
        {calculatorType === "choice" && (
          <div className="space-y-6 py-4">
            <p className="text-muted-foreground text-center">
              Select the calculator that best fits your needs
            </p>
            
            {/* Auto-populate banner */}
            {hasTransactionData && canUseComplete && (
              <Alert className="border-primary/30 bg-primary/5">
                <Database className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <span className="font-medium">Transaction data available!</span> You can auto-populate the calculator with your {transactionData.taxYear} logged income and deductions.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Simple Calculator Option */}
              <button
                onClick={() => setCalculatorType("simple")}
                className="group relative bg-muted/50 hover:bg-muted rounded-xl p-6 text-left transition-all border-2 border-transparent hover:border-primary/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Simple</h3>
                    <p className="text-xs text-muted-foreground">Quick estimate</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Single income with basic deductions (pension, NHF, rent)
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs text-primary">
                  <Smartphone className="w-3.5 h-3.5" />
                  Works on all devices
                </div>
              </button>

              {/* Complete Calculator Option */}
              <div className={`group relative rounded-xl p-6 text-left transition-all border-2 ${
                canUseComplete && isPro
                  ? "bg-primary/5 border-primary/20" 
                  : "bg-muted/30 border-transparent opacity-60"
              }`}>
                {!isPro && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    canUseComplete && isPro ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Sparkles className={`w-6 h-6 ${canUseComplete && isPro ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Complete</h3>
                    <p className="text-xs text-muted-foreground">Comprehensive analysis</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Multiple income sources, all deductions (NHIS, life assurance, mortgage)
                </p>
                
                {!isPro ? (
                  <Button
                    onClick={() => navigate('/subscription')}
                    variant="outline"
                    className="w-full gap-2"
                    size="sm"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Unlock
                  </Button>
                ) : canUseComplete ? (
                  <div className="space-y-2">
                    {hasTransactionData && (
                      <Button
                        onClick={() => handleSelectComplete(true)}
                        className="w-full gap-2"
                        size="sm"
                      >
                        <Database className="w-4 h-4" />
                        Auto-fill from Transactions
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSelectComplete(false)}
                      variant={hasTransactionData ? "outline" : "default"}
                      className="w-full gap-2"
                      size="sm"
                    >
                      <Calculator className="w-4 h-4" />
                      {hasTransactionData ? "Start Fresh" : "Start Calculator"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Monitor className="w-3.5 h-3.5" />
                    Requires tablet or desktop
                  </div>
                )}
              </div>
            </div>

            {!canUseComplete && (
              <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
                💡 The complete calculator requires a larger screen. Please use a tablet or desktop for the full experience.
              </p>
            )}
          </div>
        )}

        {calculatorType === "simple" && (
          <SimpleCalculatorContent 
            onCalculationSaved={onCalculationSaved} 
            onClose={handleClose}
          />
        )}

        {calculatorType === "complete" && (
          <CompleteCalculator 
            onCalculationSaved={onCalculationSaved}
            onClose={handleClose}
            initialTransactionData={useTransactionData ? transactionData : null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
