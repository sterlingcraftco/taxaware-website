import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Briefcase, Code, Building2, Gift } from "lucide-react";
import { IncomeFormData, InputPeriod } from "./types";
import { formatCurrency } from "@/lib/taxCalculations";

interface IncomeStepProps {
  income: IncomeFormData;
  inputPeriod: InputPeriod;
  onIncomeChange: (field: keyof IncomeFormData, value: string) => void;
}

const incomeFields = [
  {
    key: "salary" as keyof IncomeFormData,
    label: "Employment Salary",
    description: "Regular income from employment",
    icon: Briefcase,
    placeholder: "e.g. 500,000",
    tooltip: "Your gross salary from your primary employer before any deductions.",
  },
  {
    key: "freelance" as keyof IncomeFormData,
    label: "Freelance / Consulting Income",
    description: "Side gigs and consulting work",
    icon: Code,
    placeholder: "e.g. 100,000",
    tooltip: "Income from freelance work, consulting, or side projects.",
  },
  {
    key: "business" as keyof IncomeFormData,
    label: "Business Income",
    description: "Profits from business activities",
    icon: Building2,
    placeholder: "e.g. 200,000",
    tooltip: "Net income from your business after business expenses.",
  },
  {
    key: "benefitsInKind" as keyof IncomeFormData,
    label: "Benefits in Kind",
    description: "Non-cash benefits from employer",
    icon: Gift,
    placeholder: "e.g. 50,000",
    tooltip: "Taxable value of non-cash benefits like company car, housing allowance, etc.",
  },
];

export function IncomeStep({ income, inputPeriod, onIncomeChange }: IncomeStepProps) {
  const handleInputChange = (field: keyof IncomeFormData, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue) {
      onIncomeChange(field, parseInt(numericValue).toLocaleString());
    } else {
      onIncomeChange(field, "");
    }
  };

  const getNumericValue = (value: string) => parseFloat(value.replace(/,/g, "")) || 0;
  
  const toAnnual = (value: number) => inputPeriod === "monthly" ? value * 12 : value;
  
  const totalIncome = Object.values(income).reduce((sum, val) => sum + getNumericValue(val), 0);
  const annualTotal = toAnnual(totalIncome);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          What are your income sources?
        </h3>
        <p className="text-muted-foreground">
          Enter all sources of {inputPeriod} income. Leave blank if not applicable.
        </p>
      </div>

      <div className="grid gap-4">
        {incomeFields.map(({ key, label, description, icon: Icon, placeholder, tooltip }) => (
          <div key={key} className="bg-muted/50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{label}</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
              <Input
                type="text"
                value={income[key]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder={placeholder}
                className="pl-8 h-12"
              />
            </div>
            {income[key] && inputPeriod === "monthly" && (
              <p className="text-xs text-muted-foreground mt-2">
                Annual: {formatCurrency(toAnnual(getNumericValue(income[key])))}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="bg-primary/10 rounded-xl p-5 mt-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total {inputPeriod === "monthly" ? "Monthly" : "Annual"} Income</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalIncome)}</p>
          </div>
          {inputPeriod === "monthly" && totalIncome > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Annual Total</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(annualTotal)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
