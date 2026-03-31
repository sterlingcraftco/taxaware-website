import { useTaxReadiness } from '@/hooks/useTaxReadiness';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, AlertTriangle, TrendingUp, Briefcase, Info, Wallet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formatCurrency = (amount: number) =>
  '₦' + new Intl.NumberFormat('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

function ReadinessRing({ percent }: { percent: number }) {
  const radius = 40;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color = percent >= 80 ? 'hsl(var(--primary))' : percent >= 40 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))';

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{percent}%</span>
        <span className="text-[10px] text-muted-foreground">Ready</span>
      </div>
    </div>
  );
}

export function TaxReadinessCard() {
  const data = useTaxReadiness();

  if (data.loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse text-center text-muted-foreground text-sm">Loading tax readiness...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data.hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Tax Readiness</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No income data yet for {data.taxYear}</p>
            <p className="text-xs mt-1">Record transactions or payslips to see your readiness</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColor = data.readinessPercent >= 80 ? 'text-primary' : data.readinessPercent >= 40 ? 'text-accent-foreground' : 'text-destructive';
  const statusLabel = data.readinessPercent >= 80 ? 'On Track' : data.readinessPercent >= 40 ? 'Partial' : 'Underprepared';
  const StatusIcon = data.readinessPercent >= 80 ? ShieldCheck : AlertTriangle;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
            <CardTitle className="text-base">Tax Readiness</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px]">
                <p className="text-xs">Based on your {data.taxYear} income transactions, payslip PAYE deductions, and tax savings balance.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-xs">
          {data.taxYear} Tax Year · <span className={statusColor}>{statusLabel}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ring + Key Figure */}
        <div className="flex items-center gap-4">
          <ReadinessRing percent={data.readinessPercent} />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Estimated Tax
              </span>
              <span className="font-semibold">{formatCurrency(data.estimatedLiability)}</span>
            </div>
            {data.payePaid > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> PAYE Paid
                </span>
                <span className="font-semibold text-primary">{formatCurrency(data.payePaid)}</span>
              </div>
            )}
            {data.taxSaved > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5" /> Tax Saved
                </span>
                <span className="font-semibold text-primary">{formatCurrency(data.taxSaved)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Shortfall bar */}
        {data.shortfall > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Shortfall</span>
              <span className="font-medium text-destructive">{formatCurrency(data.shortfall)}</span>
            </div>
            <Progress value={data.readinessPercent} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              Save ~{formatCurrency(Math.ceil(data.shortfall / Math.max(1, 12 - new Date().getMonth())))}/mo to cover
            </p>
          </div>
        )}

        {data.readinessPercent >= 100 && data.totalCovered > data.estimatedLiability && (
          <div className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            You've covered your estimated tax — potential overpayment of {formatCurrency(data.totalCovered - data.estimatedLiability)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
