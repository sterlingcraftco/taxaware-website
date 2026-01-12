import { useState } from "react";
import { Calculator, TrendingDown, Wallet, PiggyBank, Save, Download, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { calculateSimpleTax, formatCurrency, formatCurrencyPDF, CompleteTaxResult } from "@/lib/taxCalculations";

type InputPeriod = "monthly" | "annual";

interface SimpleCalculatorContentProps {
  onCalculationSaved?: () => void;
  onClose?: () => void;
}

export default function SimpleCalculatorContent({ onCalculationSaved, onClose }: SimpleCalculatorContentProps) {
  const [inputPeriod, setInputPeriod] = useState<InputPeriod>("monthly");
  const [income, setIncome] = useState("");
  const [hasPension, setHasPension] = useState(false);
  const [usePensionDefault, setUsePensionDefault] = useState(true);
  const [customPension, setCustomPension] = useState("");
  const [hasNhf, setHasNhf] = useState(false);
  const [useNhfDefault, setUseNhfDefault] = useState(true);
  const [customNhf, setCustomNhf] = useState("");
  const [paysRent, setPaysRent] = useState(false);
  const [rent, setRent] = useState("");
  const [result, setResult] = useState<CompleteTaxResult | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const toAnnual = (value: number) => inputPeriod === "monthly" ? value * 12 : value;
  const getNumericValue = (value: string) => parseFloat(value.replace(/,/g, "")) || 0;

  const numericIncome = getNumericValue(income);
  const annualIncome = toAnnual(numericIncome);

  const handleInputChange = (value: string, setter: (v: string) => void) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setter(numericValue ? parseInt(numericValue).toLocaleString() : "");
    setError("");
  };

  const handleCalculate = () => {
    setError("");
    if (isNaN(numericIncome) || numericIncome <= 0) {
      setError("Please enter a valid income amount");
      return;
    }

    let pensionAmount = 0;
    if (hasPension) {
      pensionAmount = usePensionDefault ? annualIncome * 0.08 : toAnnual(getNumericValue(customPension));
    }

    let nhfAmount = 0;
    if (hasNhf) {
      nhfAmount = useNhfDefault ? annualIncome * 0.025 : toAnnual(getNumericValue(customNhf));
    }

    const annualRent = paysRent ? toAnnual(getNumericValue(rent)) : 0;

    const taxResult = calculateSimpleTax(annualIncome, pensionAmount, nhfAmount, annualRent);
    setResult(taxResult);
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("saved_calculations").insert([{
        user_id: user.id,
        annual_income: result.grossIncome,
        tax_result: JSON.parse(JSON.stringify(result)),
      }]);
      if (error) throw error;
      toast.success("Calculation saved!");
      onCalculationSaved?.();
      onClose?.();
    } catch {
      toast.error("Failed to save calculation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const effectiveRate = result.grossIncome > 0 ? (result.total / result.grossIncome) * 100 : 0;
    const takeHome = result.grossIncome - result.total - result.deductions.pension - result.deductions.nhf;

    doc.setFillColor(34, 139, 84);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 45, pageWidth, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Tax Calculation Report", pageWidth / 2, 22, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-NG", { dateStyle: "long" })}`, pageWidth / 2, 38, { align: "center" });

    let yPos = 60;
    doc.setTextColor(27, 51, 38);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Gross Income: ${formatCurrencyPDF(result.grossIncome)}`, 20, yPos); yPos += 8;
    doc.text(`Total Tax: ${formatCurrencyPDF(result.total)}`, 20, yPos); yPos += 8;
    doc.text(`Effective Rate: ${effectiveRate.toFixed(1)}%`, 20, yPos); yPos += 8;
    doc.text(`Take Home: ${formatCurrencyPDF(takeHome)}`, 20, yPos);

    doc.save(`tax-calculation-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF Downloaded!");
  };

  const periodLabel = inputPeriod === "monthly" ? "Monthly" : "Annual";
  const effectiveRate = result && result.grossIncome > 0 ? (result.total / result.grossIncome) * 100 : 0;
  const takeHome = result ? result.grossIncome - result.total - result.deductions.pension - result.deductions.nhf : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <span className="text-sm font-medium">Input Values As</span>
        <Tabs value={inputPeriod} onValueChange={(v) => setInputPeriod(v as InputPeriod)}>
          <TabsList className="grid w-[180px] grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div>
        <Label className="mb-2 block">{periodLabel} Gross Income (₦)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
          <Input value={income} onChange={(e) => handleInputChange(e.target.value, setIncome)} placeholder="e.g. 500,000" className="pl-8 h-12" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <Label htmlFor="pension" className="cursor-pointer">Pension Contribution (8%)</Label>
          <Switch id="pension" checked={hasPension} onCheckedChange={setHasPension} />
        </div>
        {hasPension && (
          <div className="pl-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={usePensionDefault} onCheckedChange={(c) => setUsePensionDefault(c as boolean)} />
              <span className="text-xs text-muted-foreground">Use standard 8%</span>
            </div>
            {!usePensionDefault && (
              <Input value={customPension} onChange={(e) => handleInputChange(e.target.value, setCustomPension)} placeholder="Custom amount" className="h-9" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <Label htmlFor="nhf" className="cursor-pointer">NHF Contribution (2.5%)</Label>
          <Switch id="nhf" checked={hasNhf} onCheckedChange={setHasNhf} />
        </div>
        {hasNhf && (
          <div className="pl-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={useNhfDefault} onCheckedChange={(c) => setUseNhfDefault(c as boolean)} />
              <span className="text-xs text-muted-foreground">Use standard 2.5%</span>
            </div>
            {!useNhfDefault && (
              <Input value={customNhf} onChange={(e) => handleInputChange(e.target.value, setCustomNhf)} placeholder="Custom amount" className="h-9" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <Label htmlFor="rent" className="cursor-pointer">Rent Payment</Label>
          <Switch id="rent" checked={paysRent} onCheckedChange={setPaysRent} />
        </div>
        {paysRent && (
          <div className="pl-4">
            <Input value={rent} onChange={(e) => handleInputChange(e.target.value, setRent)} placeholder={`${periodLabel} rent`} className="h-9" />
          </div>
        )}
      </div>

      <Button onClick={handleCalculate} className="w-full h-11 gold-gradient text-accent-foreground">
        <Calculator className="w-4 h-4 mr-2" />Calculate
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {result && (
        <div className="space-y-4 animate-fade-up">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <TrendingDown className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Tax</p>
              <p className="font-bold">{formatCurrency(result.total)}</p>
            </div>
            <div className="bg-accent/10 rounded-lg p-3 text-center">
              <Wallet className="w-4 h-4 mx-auto mb-1 text-accent-foreground" />
              <p className="text-xs text-muted-foreground">Rate</p>
              <p className="font-bold">{effectiveRate.toFixed(1)}%</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <PiggyBank className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Take Home</p>
              <p className="font-bold">{formatCurrency(takeHome)}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} variant="outline" className="flex-1">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
            <Button onClick={handleDownloadPDF} className="flex-1 gold-gradient text-accent-foreground">
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
