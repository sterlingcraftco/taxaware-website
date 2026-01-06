import { useState } from "react";
import { Calculator, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TaxBreakdown {
  band: string;
  rate: number;
  taxableInBand: number;
  taxInBand: number;
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
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateTax = (income: number): { total: number; breakdown: TaxBreakdown[] } => {
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

const TaxCalculator = () => {
  const [income, setIncome] = useState<string>("");
  const [result, setResult] = useState<{ total: number; breakdown: TaxBreakdown[] } | null>(null);
  const [error, setError] = useState<string>("");

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

  return (
    <section className="py-20 md:py-28 bg-muted/50">
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
            Enter your annual income to see a breakdown of your tax based on Nigeria's progressive tax bands.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl card-shadow border border-border overflow-hidden">
            {/* Input Section */}
            <div className="p-8 md:p-10 border-b border-border">
              <label className="block text-sm font-medium text-foreground mb-3">
                Annual Gross Income (₦)
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ₦
                  </span>
                  <Input
                    type="text"
                    value={income}
                    onChange={handleInputChange}
                    placeholder="e.g. 5,000,000"
                    className="pl-10 h-14 text-lg font-medium"
                    maxLength={20}
                  />
                </div>
                <Button
                  onClick={handleCalculate}
                  className="h-14 px-8 text-lg font-semibold gold-gradient text-accent-foreground hover:opacity-90 transition-opacity"
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  Calculate
                </Button>
              </div>
              {error && (
                <p className="mt-3 text-sm text-destructive font-medium">{error}</p>
              )}
            </div>

            {/* Results Section */}
            {result && (
              <div className="p-8 md:p-10 animate-fade-up">
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
                      <span className="text-sm font-medium text-muted-foreground">Take Home</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(takeHome)}</p>
                  </div>
                </div>

                {/* Visual Bar */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-muted-foreground">Income Distribution</span>
                    <span className="text-foreground">{formatCurrency(numericIncome)}</span>
                  </div>
                  <div className="h-8 rounded-full overflow-hidden flex bg-muted">
                    <div
                      className="hero-gradient transition-all duration-500"
                      style={{ width: `${Math.min((result.total / numericIncome) * 100, 100)}%` }}
                    />
                    <div
                      className="bg-accent transition-all duration-500"
                      style={{ width: `${Math.max(100 - (result.total / numericIncome) * 100, 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
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

                {/* Disclaimer */}
                <p className="mt-6 text-xs text-muted-foreground text-center">
                  This is an estimate only. Actual tax may vary based on reliefs, deductions, and allowances. 
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
