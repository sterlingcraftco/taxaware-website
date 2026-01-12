import { Button } from "@/components/ui/button";
import { TrendingDown, Wallet, PiggyBank, Landmark, Download, Save, Loader2 } from "lucide-react";
import { CompleteTaxResult, formatCurrency } from "@/lib/taxCalculations";

interface ResultsStepProps {
  result: CompleteTaxResult;
  onSave: () => void;
  onDownloadPDF: () => void;
  isSaving: boolean;
  isAuthenticated: boolean;
}

export function ResultsStep({ result, onSave, onDownloadPDF, isSaving, isAuthenticated }: ResultsStepProps) {
  const effectiveRate = result.grossIncome > 0 ? (result.total / result.grossIncome) * 100 : 0;
  const takeHome = result.grossIncome - result.total - result.deductions.pension - result.deductions.nhf - result.deductions.nhis;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Your Tax Summary
        </h3>
        <p className="text-muted-foreground">
          Based on your income and deductions, here's your estimated tax liability.
        </p>
      </div>

      {/* Income Sources Breakdown */}
      {(result.totalIncome.freelance > 0 || result.totalIncome.business > 0 || result.totalIncome.benefitsInKind > 0) && (
        <div className="bg-muted/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Income Sources (Annual)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Salary</p>
              <p className="font-medium text-foreground">{formatCurrency(result.totalIncome.salary)}</p>
            </div>
            {result.totalIncome.freelance > 0 && (
              <div>
                <p className="text-muted-foreground">Freelance</p>
                <p className="font-medium text-foreground">{formatCurrency(result.totalIncome.freelance)}</p>
              </div>
            )}
            {result.totalIncome.business > 0 && (
              <div>
                <p className="text-muted-foreground">Business</p>
                <p className="font-medium text-foreground">{formatCurrency(result.totalIncome.business)}</p>
              </div>
            )}
            {result.totalIncome.benefitsInKind > 0 && (
              <div>
                <p className="text-muted-foreground">Benefits</p>
                <p className="font-medium text-foreground">{formatCurrency(result.totalIncome.benefitsInKind)}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Gross Income</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(result.grossIncome)}</span>
          </div>
        </div>
      )}

      {/* Deductions Summary */}
      {result.deductions.totalDeductions > 0 && (
        <div className="bg-muted/30 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Deductions Applied (Annual)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {result.deductions.pension > 0 && (
              <div>
                <p className="text-muted-foreground">Pension</p>
                <p className="font-medium text-foreground">{formatCurrency(result.deductions.pension)}</p>
              </div>
            )}
            {result.deductions.nhf > 0 && (
              <div>
                <p className="text-muted-foreground">NHF</p>
                <p className="font-medium text-foreground">{formatCurrency(result.deductions.nhf)}</p>
              </div>
            )}
            {result.deductions.nhis > 0 && (
              <div>
                <p className="text-muted-foreground">NHIS</p>
                <p className="font-medium text-foreground">{formatCurrency(result.deductions.nhis)}</p>
              </div>
            )}
            {result.deductions.lifeAssurance > 0 && (
              <div>
                <p className="text-muted-foreground">Life Assurance</p>
                <p className="font-medium text-foreground">{formatCurrency(result.deductions.lifeAssurance)}</p>
              </div>
            )}
            {result.deductions.mortgageInterest > 0 && (
              <div>
                <p className="text-muted-foreground">Mortgage Interest</p>
                <p className="font-medium text-foreground">{formatCurrency(result.deductions.mortgageInterest)}</p>
              </div>
            )}
            {result.deductions.rentRelief > 0 && (
              <div>
                <p className="text-muted-foreground">Rent Relief</p>
                <p className="font-medium text-foreground">{formatCurrency(result.deductions.rentRelief)}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Deductions</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(result.deductions.totalDeductions)}</span>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Chargeable Income</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(result.chargeableIncome)}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-primary/10 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Annual Tax</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(result.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(result.total / 12)}/month
          </p>
        </div>

        <div className="bg-accent/10 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Effective Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{effectiveRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            On gross income
          </p>
        </div>

        <div className="bg-secondary rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Net Take Home</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(takeHome)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(takeHome / 12)}/month
          </p>
        </div>

        <div className="bg-primary/5 rounded-xl p-5 border-2 border-dashed border-primary/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Save Monthly</span>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(result.monthlySavingsRecommended)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Includes 10% buffer
          </p>
        </div>
      </div>

      {/* Visual Bar */}
      <div>
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-muted-foreground">Income Distribution (Annual)</span>
          <span className="text-foreground">{formatCurrency(result.grossIncome)}</span>
        </div>
        <div className="h-8 rounded-full overflow-hidden flex bg-muted">
          {result.deductions.totalDeductions > 0 && (
            <div
              className="bg-muted-foreground/30 transition-all duration-500"
              style={{ width: `${(result.deductions.totalDeductions / result.grossIncome) * 100}%` }}
              title="Deductions"
            />
          )}
          <div
            className="bg-primary transition-all duration-500"
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

      {/* Tax Breakdown Table */}
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
                  <td className="py-3 px-4 font-medium text-foreground">{row.band}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground">{row.rate}%</td>
                  <td className="py-3 px-4 text-right text-foreground">{formatCurrency(row.taxableInBand)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-primary">{formatCurrency(row.taxInBand)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50">
                <td colSpan={3} className="py-3 px-4 font-bold text-foreground">Total Tax Liability</td>
                <td className="py-3 px-4 text-right font-bold text-primary">{formatCurrency(result.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 h-12"
          variant="outline"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isAuthenticated ? "Save to Dashboard" : "Sign in to Save"}
        </Button>
        <Button
          onClick={onDownloadPDF}
          className="flex-1 h-12 gold-gradient text-accent-foreground hover:opacity-90"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This is an estimate only. Actual tax may vary based on additional reliefs and allowances.
      </p>
    </div>
  );
}
