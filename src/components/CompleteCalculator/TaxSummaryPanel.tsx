import { TrendingDown, TrendingUp, PiggyBank, Receipt, Calculator, Loader2 } from "lucide-react";
import { formatCurrency, CompleteTaxResult } from "@/lib/taxCalculations";

interface TaxSummaryPanelProps {
  result: CompleteTaxResult | null;
  isCalculating?: boolean;
}

export function TaxSummaryPanel({ result, isCalculating }: TaxSummaryPanelProps) {
  if (!result) {
    return (
      <div className="bg-muted/30 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <Calculator className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">Tax Summary</h3>
        <p className="text-sm text-muted-foreground/70">
          Enter your income details to see your tax calculation update in real-time.
        </p>
      </div>
    );
  }

  const effectiveRate = result.grossIncome > 0 ? (result.total / result.grossIncome) * 100 : 0;
  const takeHome = result.grossIncome - result.total - result.deductions.pension - result.deductions.nhf - result.deductions.nhis;
  const monthlyTakeHome = takeHome / 12;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-4">
      {/* Header */}
      <div className="bg-primary/10 px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Tax Summary
          </h3>
          {isCalculating && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Gross Income */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Gross Income</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(result.grossIncome)}</p>
        </div>

        {/* Deductions Summary */}
        {result.deductions.totalDeductions > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="w-4 h-4 text-green-600" />
              Deductions
            </div>
            <div className="space-y-1.5 text-sm">
              {result.deductions.pension > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pension</span>
                  <span className="text-foreground">-{formatCurrency(result.deductions.pension)}</span>
                </div>
              )}
              {result.deductions.nhf > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NHF</span>
                  <span className="text-foreground">-{formatCurrency(result.deductions.nhf)}</span>
                </div>
              )}
              {result.deductions.nhis > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NHIS</span>
                  <span className="text-foreground">-{formatCurrency(result.deductions.nhis)}</span>
                </div>
              )}
              {result.deductions.lifeAssurance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Life Assurance</span>
                  <span className="text-foreground">-{formatCurrency(result.deductions.lifeAssurance)}</span>
                </div>
              )}
              {result.deductions.mortgageInterest > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mortgage Interest</span>
                  <span className="text-foreground">-{formatCurrency(result.deductions.mortgageInterest)}</span>
                </div>
              )}
              {result.deductions.rentRelief > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rent Relief</span>
                  <span className="text-foreground">-{formatCurrency(result.deductions.rentRelief)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border/50 font-medium">
                <span className="text-muted-foreground">Total Deductions</span>
                <span className="text-green-600">-{formatCurrency(result.deductions.totalDeductions)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Chargeable Income */}
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Chargeable Income</span>
          <span className="font-semibold">{formatCurrency(result.chargeableIncome)}</span>
        </div>

        {/* Tax Amount */}
        <div className="bg-destructive/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-destructive/70 font-medium">Annual Tax</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(result.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Effective Rate</p>
              <p className="text-lg font-semibold text-foreground">{effectiveRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Take Home */}
        <div className="bg-primary/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Net Take Home</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(takeHome)}</p>
              <p className="text-xs text-muted-foreground">Annual</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">{formatCurrency(monthlyTakeHome)}</p>
              <p className="text-xs text-muted-foreground">Monthly</p>
            </div>
          </div>
        </div>

        {/* Monthly Savings Recommendation */}
        <div className="bg-amber-500/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Save Monthly</span>
          </div>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {formatCurrency(result.monthlySavingsRecommended)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Recommended to set aside for annual tax (includes 10% buffer)
          </p>
        </div>
      </div>
    </div>
  );
}
