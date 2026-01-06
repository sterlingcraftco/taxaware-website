import { ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const oldBands = [
  { income: "First ₦300,000", rate: "7%" },
  { income: "Next ₦300,000", rate: "11%" },
  { income: "Next ₦500,000", rate: "15%" },
  { income: "Next ₦500,000", rate: "19%" },
  { income: "Next ₦1,600,000", rate: "21%" },
  { income: "Above ₦3,200,000", rate: "24%" },
];

const newBands = [
  { income: "First ₦800,000", rate: "0%", highlight: true },
  { income: "Next ₦2,200,000", rate: "15%" },
  { income: "Next ₦9,000,000", rate: "18%" },
  { income: "Next ₦13,000,000", rate: "21%" },
  { income: "Next ₦25,000,000", rate: "23%" },
  { income: "Above ₦50,000,000", rate: "25%" },
];

const TaxBandsComparison = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Side-by-Side Comparison
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Old Tax Bands vs NTA 2025
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how the personal income tax brackets have changed under the new Nigeria Tax Act 2025.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Desktop view - side by side tables */}
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            {/* Old Bands */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/50">
                <h3 className="text-lg font-bold text-foreground">Previous Tax Bands</h3>
                <p className="text-sm text-muted-foreground mt-1">Before NTA 2025</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Income Bracket</TableHead>
                    <TableHead className="text-right font-semibold">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oldBands.map((band, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{band.income}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{band.rate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* New Bands */}
            <div className="bg-card rounded-2xl border-2 border-primary/30 overflow-hidden relative">
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  NTA 2025
                </span>
              </div>
              <div className="p-6 border-b border-border hero-gradient">
                <h3 className="text-lg font-bold text-primary-foreground">New Tax Bands</h3>
                <p className="text-sm text-primary-foreground/80 mt-1">NTA 2025 (Current)</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Income Bracket</TableHead>
                    <TableHead className="text-right font-semibold">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newBands.map((band, index) => (
                    <TableRow key={index} className={band.highlight ? "bg-accent/10" : ""}>
                      <TableCell className="font-medium">
                        {band.income}
                        {band.highlight && (
                          <span className="ml-2 text-xs text-accent-foreground font-semibold">TAX FREE</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right ${band.highlight ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {band.rate}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile view - stacked with arrow */}
          <div className="md:hidden space-y-4">
            {/* Old Bands */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border bg-muted/50">
                <h3 className="text-base font-bold text-foreground">Previous Tax Bands</h3>
                <p className="text-xs text-muted-foreground mt-1">Before NTA 2025</p>
              </div>
              <div className="p-4">
                {oldBands.map((band, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm font-medium text-foreground">{band.income}</span>
                    <span className="text-sm text-muted-foreground">{band.rate}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-primary-foreground rotate-90" />
              </div>
            </div>

            {/* New Bands */}
            <div className="bg-card rounded-2xl border-2 border-primary/30 overflow-hidden">
              <div className="p-5 border-b border-border hero-gradient flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-primary-foreground">New Tax Bands</h3>
                  <p className="text-xs text-primary-foreground/80 mt-1">NTA 2025 (Current)</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-primary-foreground text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  NEW
                </span>
              </div>
              <div className="p-4">
                {newBands.map((band, index) => (
                  <div 
                    key={index} 
                    className={`flex justify-between py-2 border-b border-border/50 last:border-0 ${band.highlight ? "bg-accent/10 -mx-4 px-4" : ""}`}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {band.income}
                      {band.highlight && (
                        <span className="ml-2 text-xs text-accent-foreground font-semibold">TAX FREE</span>
                      )}
                    </span>
                    <span className={`text-sm ${band.highlight ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {band.rate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key changes summary */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-5 border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">₦800K</p>
              <p className="text-sm text-muted-foreground">Tax-free threshold (up from ₦300K)</p>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border text-center">
              <p className="text-3xl font-bold text-accent-foreground mb-1">25%</p>
              <p className="text-sm text-muted-foreground">Top rate (up from 24%)</p>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border text-center">
              <p className="text-3xl font-bold text-foreground mb-1">6</p>
              <p className="text-sm text-muted-foreground">Total tax bands (unchanged)</p>
            </div>
          </div>

          <p className="mt-8 text-xs text-muted-foreground text-center max-w-2xl mx-auto">
            The NTA 2025 significantly increases the tax-free threshold, providing relief for lower and middle-income earners. 
            Higher earners may see slightly increased rates at the top end.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TaxBandsComparison;
