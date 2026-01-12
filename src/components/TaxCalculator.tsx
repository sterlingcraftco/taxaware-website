import { useState } from "react";
import { Calculator, TrendingDown, Wallet, PiggyBank, Save, Download, Loader2, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { isAuthEnabled } from "@/lib/featureFlags";
import { analytics } from "@/lib/analytics";
import jsPDF from "jspdf";

export interface TaxBreakdown {
  band: string;
  rate: number;
  taxableInBand: number;
  taxInBand: number;
}

export interface Deductions {
  pension: number;
  nhf: number;
  rentRelief: number;
  totalDeductions: number;
}

export interface TaxResult {
  total: number;
  breakdown: TaxBreakdown[];
  grossIncome: number;
  chargeableIncome: number;
  deductions: Deductions;
}

const TAX_BANDS = [
  { threshold: 800000, rate: 0, label: "First ₦800,000" },
  { threshold: 2200000, rate: 0.15, label: "Next ₦2,200,000" },
  { threshold: 9000000, rate: 0.18, label: "Next ₦9,000,000" },
  { threshold: 13000000, rate: 0.21, label: "Next ₦13,000,000" },
  { threshold: 25000000, rate: 0.23, label: "Next ₦25,000,000" },
  { threshold: Infinity, rate: 0.25, label: "Above ₦50,000,000" },
];

const formatCurrency = (amount: number): string => {
  return "₦" + new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// PDF-safe format (Helvetica doesn't support ₦ symbol)
const formatCurrencyPDF = (amount: number): string => {
  return "NGN " + new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calculateTaxWithDeductions = (
  grossIncome: number,
  pensionContribution: number,
  nhfContribution: number,
  annualRent: number
): TaxResult => {
  // Calculate rent relief (20% of annual rent, max ₦500,000)
  const rentRelief = Math.min(annualRent * 0.2, 500000);
  
  // Total deductions
  const totalDeductions = pensionContribution + nhfContribution + rentRelief;
  
  // Chargeable income after deductions
  const chargeableIncome = Math.max(0, grossIncome - totalDeductions);
  
  let remainingIncome = chargeableIncome;
  let totalTax = 0;
  const breakdown: TaxBreakdown[] = [];

  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break;

    const taxableInBand = Math.min(remainingIncome, band.threshold);
    const taxInBand = taxableInBand * band.rate;

    breakdown.push({
      band: band.label,
      rate: band.rate * 100,
      taxableInBand,
      taxInBand,
    });

    totalTax += taxInBand;
    remainingIncome -= taxableInBand;
  }

  return {
    total: totalTax,
    breakdown,
    grossIncome,
    chargeableIncome,
    deductions: {
      pension: pensionContribution,
      nhf: nhfContribution,
      rentRelief,
      totalDeductions,
    },
  };
};

// Legacy function for backward compatibility
export const calculateTax = (income: number): TaxResult => {
  return calculateTaxWithDeductions(income, 0, 0, 0);
};

export { formatCurrency };

const TaxCalculator = () => {
  const [income, setIncome] = useState<string>("");
  const [usePensionDefault, setUsePensionDefault] = useState(true);
  const [customPension, setCustomPension] = useState<string>("");
  const [useNhfDefault, setUseNhfDefault] = useState(true);
  const [customNhf, setCustomNhf] = useState<string>("");
  const [annualRent, setAnnualRent] = useState<string>("");
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const authEnabled = isAuthEnabled();

  const numericIncome = parseFloat(income.replace(/,/g, "")) || 0;

  const handleCalculate = () => {
    setError("");

    if (isNaN(numericIncome) || numericIncome < 0) {
      setError("Please enter a valid income amount");
      setResult(null);
      return;
    }

    if (numericIncome > 100000000000) {
      setError("Please enter a realistic income amount");
      setResult(null);
      return;
    }

    // Calculate pension contribution
    const pensionAmount = usePensionDefault
      ? numericIncome * 0.08 // 8% of gross income
      : parseFloat(customPension.replace(/,/g, "")) || 0;

    // Calculate NHF contribution
    const nhfAmount = useNhfDefault
      ? numericIncome * 0.025 // 2.5% of basic salary (simplified as gross)
      : parseFloat(customNhf.replace(/,/g, "")) || 0;

    // Annual rent
    const rentAmount = parseFloat(annualRent.replace(/,/g, "")) || 0;

    const taxResult = calculateTaxWithDeductions(numericIncome, pensionAmount, nhfAmount, rentAmount);
    setResult(taxResult);
    analytics.calculateTax(numericIncome, taxResult.total);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value) {
      setter(parseInt(value).toLocaleString());
    } else {
      setter("");
    }
    setError("");
  };

  const effectiveRate = result && result.grossIncome > 0 ? (result.total / result.grossIncome) * 100 : 0;
  const takeHome = numericIncome - (result?.total || 0) - (result?.deductions.pension || 0) - (result?.deductions.nhf || 0);

  const handleSaveCalculation = async () => {
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
        annual_income: numericIncome,
        tax_result: taxResultJson,
      }]);

      if (error) throw error;

      analytics.saveCalculation(numericIncome);
      toast({
        title: "Calculation saved!",
        description: "Your tax calculation has been saved to your dashboard.",
      });
    } catch (err) {
      toast({
        title: "Error saving calculation",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Brand colors
    const primaryGreen = { r: 34, g: 139, b: 84 };
    const goldAccent = { r: 234, g: 179, b: 8 };
    const darkText = { r: 27, g: 51, b: 38 };
    
    // Header with green gradient
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(0, 0, pageWidth, 45, "F");
    
    // Gold accent line
    doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
    doc.rect(0, 45, pageWidth, 4, "F");
    
    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Nigerian Tax Calculator", pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Personal Income Tax Estimate", pageWidth / 2, 32, { align: "center" });
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-NG", { dateStyle: "long" })}`, pageWidth / 2, 40, { align: "center" });

    // Reset text color
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    // Summary section
    let yPos = 65;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Income Summary", 20, yPos);
    
    yPos += 12;
    doc.setFontSize(11);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    
    const summaryData = [
      ["Gross Annual Income:", formatCurrencyPDF(result.grossIncome)],
      ["Less: Pension Contribution:", `(${formatCurrencyPDF(result.deductions.pension)})`],
      ["Less: NHF Contribution:", `(${formatCurrencyPDF(result.deductions.nhf)})`],
      ["Less: Rent Relief (20% of rent, max 500k):", `(${formatCurrencyPDF(result.deductions.rentRelief)})`],
      ["Total Deductions:", formatCurrencyPDF(result.deductions.totalDeductions)],
      ["Chargeable Income:", formatCurrencyPDF(result.chargeableIncome)],
    ];

    summaryData.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, 20, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - 20, yPos, { align: "right" });
      yPos += 8;
    });

    // Tax Results
    yPos += 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Tax Calculation", 20, yPos);

    yPos += 12;
    doc.setFontSize(11);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    const taxSummary = [
      ["Total Tax Liability:", formatCurrencyPDF(result.total)],
      ["Effective Tax Rate:", `${effectiveRate.toFixed(1)}%`],
      ["Net Take Home (after tax & deductions):", formatCurrencyPDF(takeHome)],
    ];

    taxSummary.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, 20, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - 20, yPos, { align: "right" });
      yPos += 8;
    });

    // Tax breakdown section
    yPos += 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Tax Band Breakdown", 20, yPos);

    yPos += 12;
    doc.setFontSize(10);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    
    // Table header
    doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Band", 25, yPos);
    doc.text("Rate", 80, yPos);
    doc.text("Taxable Amount", 105, yPos);
    doc.text("Tax", pageWidth - 25, yPos, { align: "right" });

    yPos += 10;
    doc.setFont("helvetica", "normal");

    result.breakdown.forEach((row, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 250, 247);
        doc.rect(20, yPos - 5, pageWidth - 40, 8, "F");
      }
      doc.setTextColor(darkText.r, darkText.g, darkText.b);
      doc.text(row.band.replace("₦", "NGN "), 25, yPos);
      doc.text(`${row.rate}%`, 80, yPos);
      doc.text(formatCurrencyPDF(row.taxableInBand), 105, yPos);
      doc.text(formatCurrencyPDF(row.taxInBand), pageWidth - 25, yPos, { align: "right" });
      yPos += 8;
    });

    // Total row
    yPos += 5;
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Total Tax Liability", 25, yPos);
    doc.text(formatCurrencyPDF(result.total), pageWidth - 25, yPos, { align: "right" });

    // Disclaimer
    yPos += 20;
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This is an estimate only. Actual tax may vary based on additional reliefs and allowances.",
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    doc.text(
      "Consult a tax professional for accurate calculations.",
      pageWidth / 2,
      yPos + 5,
      { align: "center" }
    );
    
    // Website branding
    yPos += 15;
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TaxAware Nigeria", pageWidth / 2, yPos, { align: "center" });

    doc.save(`taxaware-nigeria-calculation-${new Date().toISOString().split("T")[0]}.pdf`);
    
    analytics.downloadPDF(numericIncome, result.total);
    toast({
      title: "PDF Downloaded!",
      description: "Your tax calculation report has been downloaded.",
    });
  };

  return (
    <section id="calculator" className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-4">
            <Calculator className="w-4 h-4 inline mr-1" />
            Interactive Tool
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Estimate Your Tax Liability
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enter your income and deductions to see a breakdown of your tax based on Nigeria's 2026 progressive tax bands.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl card-shadow border border-border overflow-hidden">
            {/* Input Section */}
            <div className="p-8 md:p-10 border-b border-border">
              {/* Gross Income */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Annual Gross Income (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ₦
                  </span>
                  <Input
                    type="text"
                    value={income}
                    onChange={(e) => handleInputChange(e, setIncome)}
                    placeholder="e.g. 5,000,000"
                    className="pl-10 h-14 text-lg font-medium"
                    maxLength={20}
                  />
                </div>
              </div>

              {/* Deductions Section */}
              <div className="bg-muted/50 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  Statutory Deductions
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>These are mandatory deductions that reduce your taxable income before tax is calculated.</p>
                    </TooltipContent>
                  </Tooltip>
                </h3>

                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Pension Contribution */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        Pension (RSA)
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Employee contribution to approved pension scheme. Standard rate is 8% of qualifying emoluments.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="pension-default"
                          checked={usePensionDefault}
                          onCheckedChange={(checked) => setUsePensionDefault(checked as boolean)}
                        />
                        <Label htmlFor="pension-default" className="text-xs text-muted-foreground cursor-pointer">
                          Use 8%
                        </Label>
                      </div>
                    </div>
                    {usePensionDefault ? (
                      <div className="h-10 px-4 rounded-md border border-input bg-muted/50 flex items-center text-muted-foreground">
                        {numericIncome > 0 ? formatCurrency(numericIncome * 0.08) : "₦0"}
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                        <Input
                          type="text"
                          value={customPension}
                          onChange={(e) => handleInputChange(e, setCustomPension)}
                          placeholder="Enter amount"
                          className="pl-8 h-10"
                        />
                      </div>
                    )}
                  </div>

                  {/* NHF Contribution */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        NHF
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>National Housing Fund contribution. Standard rate is 2.5% of basic salary.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="nhf-default"
                          checked={useNhfDefault}
                          onCheckedChange={(checked) => setUseNhfDefault(checked as boolean)}
                        />
                        <Label htmlFor="nhf-default" className="text-xs text-muted-foreground cursor-pointer">
                          Use 2.5%
                        </Label>
                      </div>
                    </div>
                    {useNhfDefault ? (
                      <div className="h-10 px-4 rounded-md border border-input bg-muted/50 flex items-center text-muted-foreground">
                        {numericIncome > 0 ? formatCurrency(numericIncome * 0.025) : "₦0"}
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                        <Input
                          type="text"
                          value={customNhf}
                          onChange={(e) => handleInputChange(e, setCustomNhf)}
                          placeholder="Enter amount"
                          className="pl-8 h-10"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rent Relief */}
              <div className="bg-muted/50 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  Rent Relief
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>You can claim 20% of your annual rent as relief, up to a maximum of ₦500,000. Keep proof of payment (tenancy agreement, receipts).</p>
                    </TooltipContent>
                  </Tooltip>
                </h3>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Annual Rent Paid (₦)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                    <Input
                      type="text"
                      value={annualRent}
                      onChange={(e) => handleInputChange(e, setAnnualRent)}
                      placeholder="e.g. 1,200,000"
                      className="pl-10 h-12"
                    />
                  </div>
                  {annualRent && (
                    <p className="text-xs text-muted-foreground">
                      Rent relief: {formatCurrency(Math.min((parseFloat(annualRent.replace(/,/g, "")) || 0) * 0.2, 500000))} 
                      <span className="text-primary"> (20% of rent, max ₦500,000)</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Calculate Button */}
              <Button
                onClick={handleCalculate}
                className="w-full h-14 text-lg font-semibold gold-gradient text-accent-foreground hover:opacity-90 transition-opacity"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Calculate My Tax
              </Button>
              {error && (
                <p className="mt-3 text-sm text-destructive font-medium text-center">{error}</p>
              )}
            </div>

            {/* Results Section */}
            {result && (
              <div className="p-8 md:p-10 animate-fade-up">
                {/* Deductions Summary */}
                <div className="bg-muted/30 rounded-xl p-5 mb-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Deductions Applied</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Pension</p>
                      <p className="font-medium text-foreground">{formatCurrency(result.deductions.pension)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">NHF</p>
                      <p className="font-medium text-foreground">{formatCurrency(result.deductions.nhf)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rent Relief</p>
                      <p className="font-medium text-foreground">{formatCurrency(result.deductions.rentRelief)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Deductions</p>
                      <p className="font-semibold text-primary">{formatCurrency(result.deductions.totalDeductions)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Chargeable Income</span>
                    <span className="text-lg font-bold text-foreground">{formatCurrency(result.chargeableIncome)}</span>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-primary/10 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Total Tax</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(result.total)}</p>
                  </div>

                  <div className="bg-accent/10 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Effective Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{effectiveRate.toFixed(1)}%</p>
                  </div>

                  <div className="bg-secondary rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PiggyBank className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Net Take Home</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(takeHome)}</p>
                  </div>
                </div>

                {/* Visual Bar */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-muted-foreground">Income Distribution</span>
                    <span className="text-foreground">{formatCurrency(result.grossIncome)}</span>
                  </div>
                  <div className="h-8 rounded-full overflow-hidden flex bg-muted">
                    <div
                      className="bg-muted-foreground/30 transition-all duration-500"
                      style={{ width: `${(result.deductions.totalDeductions / result.grossIncome) * 100}%` }}
                      title="Deductions"
                    />
                    <div
                      className="hero-gradient transition-all duration-500"
                      style={{ width: `${(result.total / result.grossIncome) * 100}%` }}
                      title="Tax"
                    />
                    <div
                      className="bg-accent transition-all duration-500"
                      style={{ width: `${(takeHome / result.grossIncome) * 100}%` }}
                      title="Take Home"
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-muted-foreground font-medium">Deductions: {formatCurrency(result.deductions.totalDeductions)}</span>
                    <span className="text-primary font-medium">Tax: {formatCurrency(result.total)}</span>
                    <span className="text-accent-foreground font-medium">Take Home: {formatCurrency(takeHome)}</span>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">Tax Band Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Band</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Rate</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Taxable</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.breakdown.map((row, index) => (
                          <tr key={index} className="border-b border-border/50 last:border-0">
                            <td className="py-3 px-4 text-sm font-medium text-foreground">{row.band}</td>
                            <td className="py-3 px-4 text-sm text-right text-muted-foreground">{row.rate}%</td>
                            <td className="py-3 px-4 text-sm text-right text-foreground">{formatCurrency(row.taxableInBand)}</td>
                            <td className="py-3 px-4 text-sm text-right font-semibold text-primary">{formatCurrency(row.taxInBand)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50">
                          <td colSpan={3} className="py-3 px-4 text-sm font-bold text-foreground">Total Tax Liability</td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-primary">{formatCurrency(result.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  {authEnabled && (
                    <Button
                      onClick={handleSaveCalculation}
                      disabled={isSaving}
                      className="flex-1 h-12"
                      variant="outline"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {user ? "Save to Dashboard" : "Sign in to Save"}
                    </Button>
                  )}
                  <Button
                    onClick={handleDownloadPDF}
                    className={`${authEnabled ? 'flex-1' : 'w-full sm:w-auto'} h-12 gold-gradient text-accent-foreground hover:opacity-90`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>

                {/* Disclaimer */}
                <p className="mt-6 text-xs text-muted-foreground text-center">
                  This is an estimate only. Actual tax may vary based on additional reliefs and allowances. 
                  Consult a tax professional for accurate calculations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TaxCalculator;
