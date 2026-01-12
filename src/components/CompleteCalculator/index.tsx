import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Calculator, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StepIndicator } from "./StepIndicator";
import { IncomeStep } from "./IncomeStep";
import { StatutoryDeductionsStep } from "./StatutoryDeductionsStep";
import { AdditionalReliefsStep } from "./AdditionalReliefsStep";
import { ResultsStep } from "./ResultsStep";
import {
  InputPeriod,
  IncomeFormData,
  DeductionsFormData,
  CALCULATOR_STEPS,
  initialIncomeData,
  initialDeductionsData,
} from "./types";
import { calculateCompleteTax, formatCurrency, formatCurrencyPDF, CompleteTaxResult } from "@/lib/taxCalculations";

interface CompleteCalculatorProps {
  onCalculationSaved?: () => void;
  onClose?: () => void;
}

export function CompleteCalculator({ onCalculationSaved, onClose }: CompleteCalculatorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [inputPeriod, setInputPeriod] = useState<InputPeriod>("monthly");
  const [income, setIncome] = useState<IncomeFormData>(initialIncomeData);
  const [deductions, setDeductions] = useState<DeductionsFormData>(initialDeductionsData);
  const [currentStep, setCurrentStep] = useState(1);
  const [result, setResult] = useState<CompleteTaxResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toAnnual = (value: number) => inputPeriod === "monthly" ? value * 12 : value;
  const getNumericValue = (value: string) => parseFloat(value.replace(/,/g, "")) || 0;

  const getTotalIncome = () => {
    return Object.values(income).reduce((sum, val) => sum + getNumericValue(val), 0);
  };

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
      if (currentStep === 3) {
        // Calculate results before showing step 4
        calculateResults();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateResults = () => {
    const grossIncome = getTotalIncome();
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
    const annualRent = deductions.paysRent ? toAnnual(getNumericValue(deductions.rent)) : 0;

    const taxResult = calculateCompleteTax(
      incomeSource,
      pensionAmount,
      nhfAmount,
      nhisAmount,
      lifeAssurance,
      mortgageInterest,
      annualRent
    );

    setResult(taxResult);
  };

  const handleSave = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!result) return;

    setIsSaving(true);
    try {
      const taxResultJson = JSON.parse(JSON.stringify(result));
      const { error } = await supabase.from("saved_calculations").insert([{
        user_id: user.id,
        annual_income: result.grossIncome,
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
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const primaryGreen = { r: 34, g: 139, b: 84 };
    const goldAccent = { r: 234, g: 179, b: 8 };
    const darkText = { r: 27, g: 51, b: 38 };
    
    // Header
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
    doc.rect(0, 45, pageWidth, 4, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Complete Tax Report", pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Personal Income Tax Estimate", pageWidth / 2, 32, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-NG", { dateStyle: "long" })}`, pageWidth / 2, 40, { align: "center" });

    let yPos = 65;
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    // Income Sources
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Income Sources", 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFont("helvetica", "normal");

    if (result.totalIncome.salary > 0) {
      doc.text("Employment Salary:", 20, yPos);
      doc.text(formatCurrencyPDF(result.totalIncome.salary), pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
    }
    if (result.totalIncome.freelance > 0) {
      doc.text("Freelance Income:", 20, yPos);
      doc.text(formatCurrencyPDF(result.totalIncome.freelance), pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
    }
    if (result.totalIncome.business > 0) {
      doc.text("Business Income:", 20, yPos);
      doc.text(formatCurrencyPDF(result.totalIncome.business), pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
    }
    if (result.totalIncome.benefitsInKind > 0) {
      doc.text("Benefits in Kind:", 20, yPos);
      doc.text(formatCurrencyPDF(result.totalIncome.benefitsInKind), pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Total Gross Income:", 20, yPos);
    doc.text(formatCurrencyPDF(result.grossIncome), pageWidth - 20, yPos, { align: "right" });
    yPos += 15;

    // Deductions
    if (result.deductions.totalDeductions > 0) {
      doc.setFontSize(14);
      doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
      doc.text("Deductions", 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(darkText.r, darkText.g, darkText.b);
      doc.setFont("helvetica", "normal");

      if (result.deductions.pension > 0) {
        doc.text("Pension Contribution:", 20, yPos);
        doc.text(`(${formatCurrencyPDF(result.deductions.pension)})`, pageWidth - 20, yPos, { align: "right" });
        yPos += 7;
      }
      if (result.deductions.nhf > 0) {
        doc.text("NHF Contribution:", 20, yPos);
        doc.text(`(${formatCurrencyPDF(result.deductions.nhf)})`, pageWidth - 20, yPos, { align: "right" });
        yPos += 7;
      }
      if (result.deductions.nhis > 0) {
        doc.text("NHIS Contribution:", 20, yPos);
        doc.text(`(${formatCurrencyPDF(result.deductions.nhis)})`, pageWidth - 20, yPos, { align: "right" });
        yPos += 7;
      }
      if (result.deductions.lifeAssurance > 0) {
        doc.text("Life Assurance:", 20, yPos);
        doc.text(`(${formatCurrencyPDF(result.deductions.lifeAssurance)})`, pageWidth - 20, yPos, { align: "right" });
        yPos += 7;
      }
      if (result.deductions.mortgageInterest > 0) {
        doc.text("Mortgage Interest:", 20, yPos);
        doc.text(`(${formatCurrencyPDF(result.deductions.mortgageInterest)})`, pageWidth - 20, yPos, { align: "right" });
        yPos += 7;
      }
      if (result.deductions.rentRelief > 0) {
        doc.text("Rent Relief:", 20, yPos);
        doc.text(`(${formatCurrencyPDF(result.deductions.rentRelief)})`, pageWidth - 20, yPos, { align: "right" });
        yPos += 7;
      }
      doc.setFont("helvetica", "bold");
      doc.text("Total Deductions:", 20, yPos);
      doc.text(formatCurrencyPDF(result.deductions.totalDeductions), pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
      doc.text("Chargeable Income:", 20, yPos);
      doc.text(formatCurrencyPDF(result.chargeableIncome), pageWidth - 20, yPos, { align: "right" });
      yPos += 15;
    }

    // Tax Summary
    doc.setFontSize(14);
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.setFont("helvetica", "bold");
    doc.text("Tax Summary", 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    const effectiveRate = result.grossIncome > 0 ? (result.total / result.grossIncome) * 100 : 0;
    const takeHome = result.grossIncome - result.total - result.deductions.pension - result.deductions.nhf - result.deductions.nhis;

    doc.setFont("helvetica", "normal");
    doc.text("Total Tax Liability:", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrencyPDF(result.total), pageWidth - 20, yPos, { align: "right" });
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.text("Effective Tax Rate:", 20, yPos);
    doc.text(`${effectiveRate.toFixed(1)}%`, pageWidth - 20, yPos, { align: "right" });
    yPos += 8;
    doc.text("Net Take Home:", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrencyPDF(takeHome), pageWidth - 20, yPos, { align: "right" });
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.text("Recommended Monthly Savings:", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrencyPDF(result.monthlySavingsRecommended), pageWidth - 20, yPos, { align: "right" });
    yPos += 20;

    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("This is an estimate only. Consult a tax professional for accurate calculations.", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TaxAware Nigeria", pageWidth / 2, yPos, { align: "center" });

    doc.save(`taxaware-complete-calculation-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF Downloaded!");
  };

  const grossIncome = getTotalIncome();

  return (
    <div className="space-y-6">
      {/* Period Toggle */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Input Values As</h3>
          <p className="text-xs text-muted-foreground mt-1">Choose how you want to enter amounts</p>
        </div>
        <Tabs value={inputPeriod} onValueChange={(v) => setInputPeriod(v as InputPeriod)}>
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} onStepClick={(step) => step <= currentStep && setCurrentStep(step)} />

      {/* Step Content */}
      <div className="min-h-[400px]">
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
        {currentStep === 4 && result && (
          <ResultsStep
            result={result}
            onSave={handleSave}
            onDownloadPDF={handleDownloadPDF}
            isSaving={isSaving}
            isAuthenticated={!!user}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 4 && (
        <div className="flex justify-between pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2 gold-gradient text-accent-foreground hover:opacity-90"
          >
            {currentStep === 3 ? (
              <>
                <Calculator className="w-4 h-4" />
                Calculate
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
          <AlertCircle className="w-4 h-4" />
          Enter at least one income source to continue
        </div>
      )}
    </div>
  );
}
