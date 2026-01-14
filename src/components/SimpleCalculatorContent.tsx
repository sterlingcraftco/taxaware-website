import { useState } from "react";
import { Calculator, TrendingDown, Wallet, PiggyBank, Save, Download, Loader2, HelpCircle, Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateSimpleTax, formatCurrency, CompleteTaxResult } from "@/lib/taxCalculations";
import { generateTaxPDF } from "@/lib/pdfGenerator";

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

    if (annualIncome > 100000000000) {
      setError("Please enter a realistic income amount");
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
    generateTaxPDF(result);
  };

  const periodLabel = inputPeriod === "monthly" ? "Monthly" : "Annual";
  const effectiveRate = result && result.grossIncome > 0 ? (result.total / result.grossIncome) * 100 : 0;
  const takeHome = result ? result.grossIncome - result.total - result.deductions.pension - result.deductions.nhf : 0;
  const monthlySavingsRecommended = result ? Math.ceil((result.total * 1.1) / 12) : 0;

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Period Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Input Values As</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how you want to enter amounts</p>
        </div>
        <Tabs value={inputPeriod} onValueChange={(v) => setInputPeriod(v as InputPeriod)}>
          <TabsList className="grid w-[180px] grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Gross Income */}
      <div>
        <Label className="mb-2 block text-sm font-medium">{periodLabel} Gross Income (₦)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
          <Input
            value={income}
            onChange={(e) => handleInputChange(e.target.value, setIncome)}
            placeholder={inputPeriod === "monthly" ? "e.g. 500,000" : "e.g. 6,000,000"}
            className="pl-8 h-12 text-lg"
          />
        </div>
        {inputPeriod === "monthly" && numericIncome > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Annual equivalent: {formatCurrency(annualIncome)}
          </p>
        )}
      </div>

      {/* Deductions Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          Deductions & Reliefs
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>These reduce your taxable income before tax is calculated.</p>
            </TooltipContent>
          </Tooltip>
        </h3>

        {/* Pension */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="pension" className="cursor-pointer text-sm font-medium">
                Pension Contribution (RSA)
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Employee contribution to Retirement Savings Account. Standard rate is 8%.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch id="pension" checked={hasPension} onCheckedChange={setHasPension} />
          </div>
          {hasPension && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground">{periodLabel} Contribution</Label>
                <div className="flex items-center gap-2">
                  <Checkbox checked={usePensionDefault} onCheckedChange={(c) => setUsePensionDefault(c as boolean)} />
                  <span className="text-xs text-muted-foreground">Use standard 8%</span>
                </div>
              </div>
              {usePensionDefault ? (
                <div className="h-10 px-4 rounded-md border border-input bg-muted/50 flex items-center text-muted-foreground">
                  {numericIncome > 0 ? formatCurrency(numericIncome * 0.08) : "₦0"}
                  <span className="text-xs ml-2">({inputPeriod})</span>
                </div>
              ) : (
                <Input value={customPension} onChange={(e) => handleInputChange(e.target.value, setCustomPension)} placeholder="Custom amount" className="h-10" />
              )}
            </div>
          )}
        </div>

        {/* NHF */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="nhf" className="cursor-pointer text-sm font-medium">
                National Housing Fund (NHF)
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Mandatory for employees earning above minimum wage. Standard rate is 2.5%.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch id="nhf" checked={hasNhf} onCheckedChange={setHasNhf} />
          </div>
          {hasNhf && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground">{periodLabel} Contribution</Label>
                <div className="flex items-center gap-2">
                  <Checkbox checked={useNhfDefault} onCheckedChange={(c) => setUseNhfDefault(c as boolean)} />
                  <span className="text-xs text-muted-foreground">Use standard 2.5%</span>
                </div>
              </div>
              {useNhfDefault ? (
                <div className="h-10 px-4 rounded-md border border-input bg-muted/50 flex items-center text-muted-foreground">
                  {numericIncome > 0 ? formatCurrency(numericIncome * 0.025) : "₦0"}
                  <span className="text-xs ml-2">({inputPeriod})</span>
                </div>
              ) : (
                <Input value={customNhf} onChange={(e) => handleInputChange(e.target.value, setCustomNhf)} placeholder="Custom amount" className="h-10" />
              )}
            </div>
          )}
        </div>

        {/* Rent */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="rent" className="cursor-pointer text-sm font-medium">
                Rent Payment
              </Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>You can claim 20% of your rent as relief, up to ₦500,000 annually.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch id="rent" checked={paysRent} onCheckedChange={setPaysRent} />
          </div>
          {paysRent && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <Label className="text-sm text-muted-foreground mb-3 block">{periodLabel} Rent Paid (₦)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                <Input
                  value={rent}
                  onChange={(e) => handleInputChange(e.target.value, setRent)}
                  placeholder={inputPeriod === "monthly" ? "e.g. 100,000" : "e.g. 1,200,000"}
                  className="pl-8 h-10"
                />
              </div>
              {rent && (
                <p className="text-xs text-muted-foreground mt-2">
                  Rent relief: {formatCurrency(Math.min(toAnnual(getNumericValue(rent)) * 0.2, 500000))}
                  <span className="text-primary"> (20% of annual rent, max ₦500,000)</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleCalculate} className="w-full h-12 text-lg font-semibold gold-gradient text-accent-foreground">
        <Calculator className="w-5 h-5 mr-2" />Calculate My Tax
      </Button>
      {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-fade-up pt-4 border-t border-border">
          {/* Deductions Summary */}
          {result.deductions.totalDeductions > 0 && (
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Deductions Applied (Annual)</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
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
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Annual Tax</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(result.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(result.total / 12)}/month
              </p>
            </div>

            <div className="bg-accent/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Effective Rate</span>
              </div>
              <p className="text-xl font-bold text-foreground">{effectiveRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">On gross income</p>
            </div>

            <div className="bg-secondary rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Net Take Home</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(takeHome)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(takeHome / 12)}/month
              </p>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 border-2 border-dashed border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Save Monthly</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Recommended amount to set aside each month for your annual tax payment. Includes a 10% buffer.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <p className="text-xl font-bold text-primary">{formatCurrency(monthlySavingsRecommended)}</p>
              <p className="text-xs text-muted-foreground mt-1">Includes 10% buffer</p>
            </div>
          </div>

          {/* Visual Bar */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-muted-foreground">Income Distribution (Annual)</span>
              <span className="text-foreground">{formatCurrency(result.grossIncome)}</span>
            </div>
            <div className="h-6 rounded-full overflow-hidden flex bg-muted">
              {result.deductions.totalDeductions > 0 && (
                <div
                  className="bg-muted-foreground/30 transition-all duration-500"
                  style={{ width: `${(result.deductions.totalDeductions / result.grossIncome) * 100}%` }}
                  title="Deductions"
                />
              )}
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
            <div className="flex justify-between text-xs mt-2 flex-wrap gap-2">
              {result.deductions.totalDeductions > 0 && (
                <span className="text-muted-foreground font-medium">Deductions: {formatCurrency(result.deductions.totalDeductions)}</span>
              )}
              <span className="text-primary font-medium">Tax: {formatCurrency(result.total)}</span>
              <span className="text-accent-foreground font-medium">Take Home: {formatCurrency(takeHome)}</span>
            </div>
          </div>

          {/* Tax Band Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Tax Band Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Band</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Rate</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Taxable</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((row, index) => (
                    <tr key={index} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-2 text-foreground">{row.band}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{row.rate}%</td>
                      <td className="py-2 px-2 text-right text-foreground">{formatCurrency(row.taxableInBand)}</td>
                      <td className="py-2 px-2 text-right font-medium text-primary">{formatCurrency(row.taxInBand)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/10">
                    <td colSpan={3} className="py-2 px-2 font-semibold text-foreground">Total Tax</td>
                    <td className="py-2 px-2 text-right font-bold text-primary">{formatCurrency(result.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} variant="outline" className="flex-1">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
            <Button onClick={handleDownloadPDF} className="flex-1 gold-gradient text-accent-foreground">
              <Download className="w-4 h-4 mr-2" />Download PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
