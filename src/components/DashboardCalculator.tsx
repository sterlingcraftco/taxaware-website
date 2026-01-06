import { useState } from "react";
import { Calculator, TrendingDown, Wallet, PiggyBank, Save, Download, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface TaxBreakdown {
  band: string;
  rate: number;
  taxableInBand: number;
  taxInBand: number;
}

interface TaxResult {
  total: number;
  breakdown: TaxBreakdown[];
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

const formatCurrencyPDF = (amount: number): string => {
  return "NGN " + new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateTax = (income: number): TaxResult => {
  let remainingIncome = income;
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

  return { total: totalTax, breakdown };
};

interface DashboardCalculatorProps {
  onCalculationSaved?: () => void;
}

export default function DashboardCalculator({ onCalculationSaved }: DashboardCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [income, setIncome] = useState<string>("");
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const handleCalculate = () => {
    setError("");
    const numericIncome = parseFloat(income.replace(/,/g, ""));

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

    setResult(calculateTax(numericIncome));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value) {
      setIncome(parseInt(value).toLocaleString());
    } else {
      setIncome("");
    }
    setError("");
  };

  const numericIncome = parseFloat(income.replace(/,/g, "")) || 0;
  const effectiveRate = result && numericIncome > 0 ? (result.total / numericIncome) * 100 : 0;
  const takeHome = numericIncome - (result?.total || 0);

  const handleSaveCalculation = async () => {
    if (!user || !result) return;

    setIsSaving(true);
    try {
      const taxResultJson = JSON.parse(JSON.stringify(result));
      const { error } = await supabase.from("saved_calculations").insert([{
        user_id: user.id,
        annual_income: numericIncome,
        tax_result: taxResultJson,
      }]);

      if (error) throw error;

      toast.success("Calculation saved!");
      onCalculationSaved?.();
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error("Failed to save calculation");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setIncome("");
    setResult(null);
    setError("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const primaryGreen = { r: 34, g: 139, b: 84 };
    const goldAccent = { r: 234, g: 179, b: 8 };
    const darkText = { r: 27, g: 51, b: 38 };
    
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(0, 0, pageWidth, 45, "F");
    
    doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
    doc.rect(0, 45, pageWidth, 4, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Nigerian Tax Calculator", pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Personal Income Tax Estimate", pageWidth / 2, 32, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-NG", { dateStyle: "long" })}`, pageWidth / 2, 40, { align: "center" });

    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    let yPos = 65;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Summary", 20, yPos);
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    
    const summaryData = [
      ["Annual Income:", formatCurrencyPDF(numericIncome)],
      ["Total Tax:", formatCurrencyPDF(result.total)],
      ["Effective Rate:", `${effectiveRate.toFixed(1)}%`],
      ["Take Home Pay:", formatCurrencyPDF(takeHome)],
    ];

    summaryData.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(value, 80, yPos);
      yPos += 10;
    });

    yPos += 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Tax Band Breakdown", 20, yPos);

    yPos += 15;
    doc.setFontSize(10);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    
    doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
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

    yPos += 5;
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Total Tax Liability", 25, yPos);
    doc.text(formatCurrencyPDF(result.total), pageWidth - 25, yPos, { align: "right" });

    yPos += 25;
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(0, yPos, pageWidth, 1, "F");
    
    yPos += 15;
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This is an estimate only. Actual tax may vary based on reliefs, deductions, and allowances.",
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
    
    yPos += 15;
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TaxAware Nigeria", pageWidth / 2, yPos, { align: "center" });

    doc.save(`taxaware-nigeria-calculation-${new Date().toISOString().split("T")[0]}.pdf`);
    
    toast.success("PDF Downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Calculation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Tax Calculator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Input Section */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Annual Gross Income (₦)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  ₦
                </span>
                <Input
                  type="text"
                  value={income}
                  onChange={handleInputChange}
                  placeholder="e.g. 5,000,000"
                  className="pl-8 h-12 text-lg font-medium"
                  maxLength={20}
                />
              </div>
              <Button
                onClick={handleCalculate}
                className="h-12 px-6 font-semibold gold-gradient text-accent-foreground hover:opacity-90 transition-opacity"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-destructive font-medium">{error}</p>
            )}
          </div>

          {/* Results Section */}
          {result && (
            <div className="animate-fade-up space-y-6">
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-primary/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Total Tax</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(result.total)}</p>
                </div>

                <div className="bg-accent/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-accent-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Effective Rate</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{effectiveRate.toFixed(1)}%</p>
                </div>

                <div className="bg-secondary rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PiggyBank className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Take Home</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(takeHome)}</p>
                </div>
              </div>

              {/* Visual Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Income Distribution</span>
                  <span className="text-foreground">{formatCurrency(numericIncome)}</span>
                </div>
                <div className="h-6 rounded-full overflow-hidden flex bg-muted">
                  <div
                    className="hero-gradient transition-all duration-500"
                    style={{ width: `${Math.min((result.total / numericIncome) * 100, 100)}%` }}
                  />
                  <div
                    className="bg-accent transition-all duration-500"
                    style={{ width: `${Math.max(100 - (result.total / numericIncome) * 100, 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-primary font-medium">Tax: {formatCurrency(result.total)}</span>
                  <span className="text-accent-foreground font-medium">Take Home: {formatCurrency(takeHome)}</span>
                </div>
              </div>

              {/* Breakdown Table */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Tax Band Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Band</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Rate</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Taxable</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.breakdown.map((row, index) => (
                        <tr key={index} className="border-b border-border/50 last:border-0">
                          <td className="py-2 px-3 font-medium text-foreground">{row.band}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{row.rate}%</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(row.taxableInBand)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-primary">{formatCurrency(row.taxInBand)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50">
                        <td colSpan={3} className="py-2 px-3 font-bold text-foreground">Total Tax Liability</td>
                        <td className="py-2 px-3 text-right font-bold text-primary">{formatCurrency(result.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSaveCalculation}
                  disabled={isSaving}
                  className="flex-1 h-11"
                  variant="outline"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save to Dashboard
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="flex-1 h-11 gold-gradient text-accent-foreground hover:opacity-90"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center">
                This is an estimate only. Actual tax may vary based on reliefs, deductions, and allowances.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
