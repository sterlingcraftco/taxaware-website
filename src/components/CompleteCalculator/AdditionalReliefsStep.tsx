import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Shield, Building, Home } from "lucide-react";
import { DeductionsFormData, InputPeriod } from "./types";
import { formatCurrency } from "@/lib/taxCalculations";

interface AdditionalReliefsStepProps {
  deductions: DeductionsFormData;
  inputPeriod: InputPeriod;
  onDeductionsChange: (field: keyof DeductionsFormData, value: unknown) => void;
}

export function AdditionalReliefsStep({
  deductions,
  inputPeriod,
  onDeductionsChange,
}: AdditionalReliefsStepProps) {
  const periodLabel = inputPeriod === "monthly" ? "Monthly" : "Annual";
  
  const handleInputChange = (field: keyof DeductionsFormData, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue) {
      onDeductionsChange(field, parseInt(numericValue).toLocaleString());
    } else {
      onDeductionsChange(field, "");
    }
  };

  const toAnnual = (value: number) => inputPeriod === "monthly" ? value * 12 : value;
  const getNumericValue = (value: string) => parseFloat(value.replace(/,/g, "")) || 0;

  // Calculate rent with its own period setting
  const rentValue = getNumericValue(deductions.rent);
  const annualRent = deductions.rentPeriod === "monthly" ? rentValue * 12 : rentValue;
  const rentRelief = Math.min(annualRent * 0.2, 500000);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Additional Tax Reliefs
        </h3>
        <p className="text-muted-foreground">
          These optional reliefs can further reduce your taxable income.
        </p>
      </div>

      <div className="space-y-4">
        {/* Life Assurance */}
        <div className="bg-muted/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="has-life-assurance" className="text-sm font-medium cursor-pointer">
                    Life Assurance Premium
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Premiums paid on approved life assurance policies are tax-deductible up to 10% of your gross income.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">Capped at 10% of gross income</p>
              </div>
            </div>
            <Switch
              id="has-life-assurance"
              checked={deductions.hasLifeAssurance}
              onCheckedChange={(checked) => onDeductionsChange("hasLifeAssurance", checked)}
            />
          </div>

          {deductions.hasLifeAssurance && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <Label className="text-sm text-muted-foreground mb-3 block">{periodLabel} Premium (₦)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                <Input
                  type="text"
                  value={deductions.lifeAssurance}
                  onChange={(e) => handleInputChange("lifeAssurance", e.target.value)}
                  placeholder="e.g. 50,000"
                  className="pl-8 h-10"
                />
              </div>
            </div>
          )}
        </div>

        {/* Mortgage Interest */}
        <div className="bg-muted/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Building className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="has-mortgage" className="text-sm font-medium cursor-pointer">
                    Mortgage Interest
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Interest paid on mortgage for owner-occupied residential property is tax-deductible.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">For owner-occupied property only</p>
              </div>
            </div>
            <Switch
              id="has-mortgage"
              checked={deductions.hasMortgage}
              onCheckedChange={(checked) => onDeductionsChange("hasMortgage", checked)}
            />
          </div>

          {deductions.hasMortgage && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up">
              <Label className="text-sm text-muted-foreground mb-3 block">{periodLabel} Interest Paid (₦)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                <Input
                  type="text"
                  value={deductions.mortgageInterest}
                  onChange={(e) => handleInputChange("mortgageInterest", e.target.value)}
                  placeholder="e.g. 100,000"
                  className="pl-8 h-10"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rent with separate period toggle */}
        <div className="bg-muted/50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="pays-rent" className="text-sm font-medium cursor-pointer">
                    Rent Payment
                  </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>You can claim 20% of your rent as relief, up to ₦500,000 annually. Keep proof of payment.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">20% relief, max ₦500,000/year</p>
              </div>
            </div>
            <Switch
              id="pays-rent"
              checked={deductions.paysRent}
              onCheckedChange={(checked) => onDeductionsChange("paysRent", checked)}
            />
          </div>

          {deductions.paysRent && (
            <div className="mt-4 pt-4 border-t border-border/50 animate-fade-up space-y-4">
              {/* Rent Period Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Enter rent as</Label>
                <Tabs 
                  value={deductions.rentPeriod} 
                  onValueChange={(v) => onDeductionsChange("rentPeriod", v as InputPeriod)}
                >
                  <TabsList className="grid w-[160px] grid-cols-2 h-8">
                    <TabsTrigger value="monthly" className="text-xs h-7">Monthly</TabsTrigger>
                    <TabsTrigger value="annual" className="text-xs h-7">Annual</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground mb-3 block">
                  {deductions.rentPeriod === "monthly" ? "Monthly" : "Annual"} Rent Paid (₦)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                  <Input
                    type="text"
                    value={deductions.rent}
                    onChange={(e) => handleInputChange("rent", e.target.value)}
                    placeholder={deductions.rentPeriod === "monthly" ? "e.g. 100,000" : "e.g. 1,200,000"}
                    className="pl-8 h-10"
                  />
                </div>
              </div>

              {deductions.rent && (
                <div className="bg-purple-500/10 rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Annual Rent:</span>
                    <span className="font-medium text-foreground">{formatCurrency(annualRent)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Rent Relief (20%):</span>
                    <span className="font-semibold text-primary">{formatCurrency(rentRelief)}</span>
                  </div>
                  {annualRent * 0.2 > 500000 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Relief capped at ₦500,000 maximum
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
