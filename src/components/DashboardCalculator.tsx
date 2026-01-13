import { useState } from "react";
import { Calculator, Plus, Smartphone, Monitor, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCanUseCompleteCalculator } from "@/hooks/useDeviceType";
import { CompleteCalculator } from "@/components/CompleteCalculator";
import SimpleCalculatorContent from "./SimpleCalculatorContent";

interface DashboardCalculatorProps {
  onCalculationSaved?: () => void;
}

type CalculatorType = "choice" | "simple" | "complete";

export default function DashboardCalculator({ onCalculationSaved }: DashboardCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [calculatorType, setCalculatorType] = useState<CalculatorType>("choice");
  const canUseComplete = useCanUseCompleteCalculator();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setCalculatorType("choice");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCalculatorType("choice");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Calculation
        </Button>
      </DialogTrigger>
      <DialogContent className={calculatorType === "complete" ? "max-w-[80vw] max-h-[90vh] overflow-y-auto" : "max-w-2xl max-h-[90vh] overflow-y-auto"}>
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
              <button
                onClick={() => canUseComplete && setCalculatorType("complete")}
                disabled={!canUseComplete}
                className={`group relative rounded-xl p-6 text-left transition-all border-2 ${
                  canUseComplete 
                    ? "bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40" 
                    : "bg-muted/30 border-transparent opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    canUseComplete ? "bg-primary/20 group-hover:bg-primary/30" : "bg-muted"
                  }`}>
                    <Sparkles className={`w-6 h-6 ${canUseComplete ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Complete</h3>
                    <p className="text-xs text-muted-foreground">Comprehensive analysis</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Multiple income sources, all deductions (NHIS, life assurance, mortgage)
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs">
                  <Monitor className={`w-3.5 h-3.5 ${canUseComplete ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={canUseComplete ? "text-primary" : "text-muted-foreground"}>
                    {canUseComplete ? "Tablet & Desktop" : "Requires tablet or desktop"}
                  </span>
                </div>
              </button>
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
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
