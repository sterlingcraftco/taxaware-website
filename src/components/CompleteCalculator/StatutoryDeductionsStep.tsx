import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, PiggyBank, Home, Heart } from "lucide-react";
import { DeductionsFormData, InputPeriod } from "./types";
import { formatCurrency } from "@/lib/taxCalculations";

interface StatutoryDeductionsStepProps {
  deductions: DeductionsFormData;
  inputPeriod: InputPeriod;
  grossIncome: number;
  onDeductionsChange: (field: keyof DeductionsFormData, value: unknown) => void;
}

export function StatutoryDeductionsStep({
  deductions,
  inputPeriod,
  grossIncome,
  onDeductionsChange,
}: StatutoryDeductionsStepProps) {
  const periodLabel = inputPeriod === "monthly" ? "Monthly" : "Annual";
  
  const handleInputChange = (field: keyof DeductionsFormData, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue) {
      onDeductionsChange(field, parseInt(numericValue).toLocaleString());
    } else {
      onDeductionsChange(field, "");
    }
  };

  const getNumericValue = (value: string) => parseFloat(value.replace(/,/g, "")) || 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Statutory Deductions
        </h3>
        <p className="text-muted-foreground">
          These are mandatory or common deductions that reduce your taxable income.
        </p>
      </div>

      <div className="space-y-4">
        {/* Pension */}
        <div className="bg-muted/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="has-pension" className="text-sm font-medium cursor-pointer">
                    Pension Contribution (RSA)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Employee contribution to Retirement Savings Account. Standard rate is 8% of qualifying emoluments.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">Standard rate: 8% of gross income</p>
              </div>
            </div>
            <Switch
              id="has-pension"
              checked={deductions.hasPension}
              onCheckedChange={(checked) => onDeductionsChange("hasPension", checked)}
            />
          </div>

          {deductions.hasPension && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground">{periodLabel} Contribution</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pension-default"
                    checked={deductions.usePensionDefault}
                    onCheckedChange={(checked) => onDeductionsChange("usePensionDefault", checked)}
                  />
                  <Label htmlFor="pension-default" className="text-xs text-muted-foreground cursor-pointer">
                    Use standard 8%
                  </Label>
                </div>
              </div>
              {deductions.usePensionDefault ? (
                <div className="h-10 px-4 rounded-md border border-input bg-muted/50 flex items-center text-muted-foreground">
                  {grossIncome > 0 ? formatCurrency(grossIncome * 0.08) : "₦0"}
                  <span className="text-xs ml-2">({inputPeriod})</span>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                  <Input
                    type="text"
                    value={deductions.customPension}
                    onChange={(e) => handleInputChange("customPension", e.target.value)}
                    placeholder="Enter amount"
                    className="pl-8 h-10"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* NHF */}
        <div className="bg-muted/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="has-nhf" className="text-sm font-medium cursor-pointer">
                    National Housing Fund (NHF)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Mandatory for employees earning above minimum wage. Standard rate is 2.5% of basic salary.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">Standard rate: 2.5% of basic salary</p>
              </div>
            </div>
            <Switch
              id="has-nhf"
              checked={deductions.hasNhf}
              onCheckedChange={(checked) => onDeductionsChange("hasNhf", checked)}
            />
          </div>

          {deductions.hasNhf && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground">{periodLabel} Contribution</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nhf-default"
                    checked={deductions.useNhfDefault}
                    onCheckedChange={(checked) => onDeductionsChange("useNhfDefault", checked)}
                  />
                  <Label htmlFor="nhf-default" className="text-xs text-muted-foreground cursor-pointer">
                    Use standard 2.5%
                  </Label>
                </div>
              </div>
              {deductions.useNhfDefault ? (
                <div className="h-10 px-4 rounded-md border border-input bg-muted/50 flex items-center text-muted-foreground">
                  {grossIncome > 0 ? formatCurrency(grossIncome * 0.025) : "₦0"}
                  <span className="text-xs ml-2">({inputPeriod})</span>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                  <Input
                    type="text"
                    value={deductions.customNhf}
                    onChange={(e) => handleInputChange("customNhf", e.target.value)}
                    placeholder="Enter amount"
                    className="pl-8 h-10"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* NHIS */}
        <div className="bg-muted/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="has-nhis" className="text-sm font-medium cursor-pointer">
                    NHIS Health Insurance
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>National Health Insurance Scheme contribution. Typically around 1.75% of basic salary.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">Standard rate: ~1.75% of basic salary</p>
              </div>
            </div>
            <Switch
              id="has-nhis"
              checked={deductions.hasNhis}
              onCheckedChange={(checked) => onDeductionsChange("hasNhis", checked)}
            />
          </div>

          {deductions.hasNhis && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground">{periodLabel} Contribution</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nhis-default"
                    checked={deductions.useNhisDefault}
                    onCheckedChange={(checked) => onDeductionsChange("useNhisDefault", checked)}
                  />
                  <Label htmlFor="nhis-default" className="text-xs text-muted-foreground cursor-pointer">
                    Use standard 1.75%
                  </Label>
                </div>
              </div>
              {deductions.useNhisDefault ? (
                <div className="h-10 px-4 rounded-md border border-input bg-muted/50 flex items-center text-muted-foreground">
                  {grossIncome > 0 ? formatCurrency(grossIncome * 0.0175) : "₦0"}
                  <span className="text-xs ml-2">({inputPeriod})</span>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                  <Input
                    type="text"
                    value={deductions.customNhis}
                    onChange={(e) => handleInputChange("customNhis", e.target.value)}
                    placeholder="Enter amount"
                    className="pl-8 h-10"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
