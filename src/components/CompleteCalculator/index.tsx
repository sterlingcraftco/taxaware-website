import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Calculator, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StepIndicator } from "./StepIndicator";
import { IncomeStep } from "./IncomeStep";
import { StatutoryDeductionsStep } from "./StatutoryDeductionsStep";
import { AdditionalReliefsStep } from "./AdditionalReliefsStep";
import { ResultsStep } from "./ResultsStep";
import { TaxSummaryPanel } from "./TaxSummaryPanel";
import {
  InputPeriod,
  IncomeFormData,
  DeductionsFormData,
  CALCULATOR_STEPS,
  initialIncomeData,
  initialDeductionsData,
  TransactionTaxData,
  createIncomeFromTransactions,
  createDeductionsFromTransactions,
} from "./types";
import { calculateCompleteTax, formatCurrency, formatCurrencyPDF, CompleteTaxResult } from "@/lib/taxCalculations";
import { generateTaxPDF } from "@/lib/pdfGenerator";

interface CompleteCalculatorProps {
  onCalculationSaved?: () => void;
  onClose?: () => void;
  initialTransactionData?: TransactionTaxData | null;
}

export function CompleteCalculator({ onCalculationSaved, onClose, initialTransactionData }: CompleteCalculatorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inputPeriod, setInputPeriod] = useState<InputPeriod>("annual"); // Default to annual when pre-filled
  const [income, setIncome] = useState<IncomeFormData>(() => 
    initialTransactionData ? createIncomeFromTransactions(initialTransactionData) : initialIncomeData
  );
  const [deductions, setDeductions] = useState<DeductionsFormData>(() =>
    initialTransactionData ? createDeductionsFromTransactions(initialTransactionData) : initialDeductionsData
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreFilled, setIsPreFilled] = useState(!!initialTransactionData);

  const toAnnual = (value: number) => inputPeriod === "monthly" ? value * 12 : value;
  const getNumericValue = (value: string) => parseFloat(value.replace(/,/g, "")) || 0;

  const getTotalIncome = () => {
    return Object.values(income).reduce((sum, val) => sum + getNumericValue(val), 0);
  };

  // Live calculation that updates as user inputs data
  const liveResult = useMemo((): CompleteTaxResult | null => {
    const grossIncome = getTotalIncome();
    if (grossIncome === 0) return null;

    const annualGross = toAnnual(grossIncome);

    // Calculate income sources
    const incomeSource = {
      salary: toAnnual(getNumericValue(income.salary)),
      freelance: toAnnual(getNumericValue(income.freelance)),
      business: toAnnual(getNumericValue(income.business)),
      benefitsInKind: toAnnual(getNumericValue(income.benefitsInKind)),
    };

    // Calculate pension
    let pensionAmount = 0;
    if (deductions.hasPension) {
      if (deductions.usePensionDefault) {
        pensionAmount = annualGross * 0.08;
      } else {
        pensionAmount = toAnnual(getNumericValue(deductions.customPension));
      }
    }

    // Calculate NHF
    let nhfAmount = 0;
    if (deductions.hasNhf) {
      if (deductions.useNhfDefault) {
        nhfAmount = annualGross * 0.025;
      } else {
        nhfAmount = toAnnual(getNumericValue(deductions.customNhf));
      }
    }

    // Calculate NHIS
    let nhisAmount = 0;
    if (deductions.hasNhis) {
      if (deductions.useNhisDefault) {
        nhisAmount = annualGross * 0.0175;
      } else {
        nhisAmount = toAnnual(getNumericValue(deductions.customNhis));
      }
    }

    // Calculate other reliefs
    const lifeAssurance = deductions.hasLifeAssurance ? toAnnual(getNumericValue(deductions.lifeAssurance)) : 0;
    const mortgageInterest = deductions.hasMortgage ? toAnnual(getNumericValue(deductions.mortgageInterest)) : 0;

    // Rent uses its own period setting
    const rentValue = getNumericValue(deductions.rent);
    const annualRent = deductions.paysRent
      ? (deductions.rentPeriod === "monthly" ? rentValue * 12 : rentValue)
      : 0;

    return calculateCompleteTax(
      incomeSource,
      pensionAmount,
      nhfAmount,
      nhisAmount,
      lifeAssurance,
      mortgageInterest,
      annualRent
    );
  }, [income, deductions, inputPeriod]);

  const handleIncomeChange = (field: keyof IncomeFormData, value: string) => {
    setIncome(prev => ({ ...prev, [field]: value }));
  };

  const handleDeductionsChange = (field: keyof DeductionsFormData, value: unknown) => {
    setDeductions(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return getTotalIncome() > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!liveResult) return;

    setIsSaving(true);
    try {
      const taxResultJson = JSON.parse(JSON.stringify(liveResult));
      const { error } = await supabase.from("saved_calculations").insert([{
        user_id: user.id,
        annual_income: liveResult.grossIncome,
        tax_result: taxResultJson,
      }]);

      if (error) throw error;

      toast.success("Calculation saved!");
      onCalculationSaved?.();
      onClose?.();
    } catch (err) {
      toast.error("Failed to save calculation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!liveResult) return;

    generateTaxPDF(liveResult, {
      filename: `taxaware-complete-calculation-${new Date().toISOString().split("T")[0]}.pdf`
    });
  };

  const grossIncome = getTotalIncome();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* Left Column - Form Steps */}
      <div className="lg:col-span-2 space-y-4 lg:space-y-6">
        {/* Period Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 lg:pb-6 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Input Values As</h3>
            <p className="text-xs text-muted-foreground mt-1">Choose how you want to enter amounts</p>
          </div>
          <Tabs value={inputPeriod} onValueChange={(v) => setInputPeriod(v as InputPeriod)}>
            <TabsList className="grid w-full sm:w-[200px] grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} onStepClick={(step) => step <= currentStep && setCurrentStep(step)} />

        {/* Step Content */}
        <div className="min-h-[300px] lg:min-h-[400px]">
          {currentStep === 1 && (
            <IncomeStep
              income={income}
              inputPeriod={inputPeriod}
              onIncomeChange={handleIncomeChange}
            />
          )}
          {currentStep === 2 && (
            <StatutoryDeductionsStep
              deductions={deductions}
              inputPeriod={inputPeriod}
              grossIncome={grossIncome}
              onDeductionsChange={handleDeductionsChange}
            />
          )}
          {currentStep === 3 && (
            <AdditionalReliefsStep
              deductions={deductions}
              inputPeriod={inputPeriod}
              onDeductionsChange={handleDeductionsChange}
            />
          )}
          {currentStep === 4 && liveResult && (
            <ResultsStep
              result={liveResult}
              onSave={handleSave}
              onDownloadPDF={handleDownloadPDF}
              isSaving={isSaving}
              isAuthenticated={!!user}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between pt-4 lg:pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2 gold-gradient text-accent-foreground hover:opacity-90"
            >
              {currentStep === 3 ? (
                <>
                  <Calculator className="w-4 h-4" />
                  <span className="hidden sm:inline">View Results</span>
                  <span className="sm:hidden">Results</span>
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Validation message */}
        {currentStep === 1 && !canProceed() && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Enter at least one income source to continue</span>
          </div>
        )}
      </div>

      {/* Right Column - Live Tax Summary (Desktop) */}
      <div className="hidden lg:block">
        <TaxSummaryPanel result={liveResult} />
      </div>

      {/* Mobile Tax Summary - Collapsible at bottom */}
      {currentStep < 4 && liveResult && (
        <div className="lg:hidden mt-4 border-t pt-4">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="text-sm font-semibold text-foreground">Tax Summary Preview</span>
              <span className="text-xs text-muted-foreground group-open:hidden">Tap to expand</span>
              <span className="text-xs text-muted-foreground hidden group-open:inline">Tap to collapse</span>
            </summary>
            <div className="mt-3">
              <TaxSummaryPanel result={liveResult} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
