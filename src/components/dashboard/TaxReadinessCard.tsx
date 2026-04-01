import { useTaxReadiness, TaxReadinessData } from '@/hooks/useTaxReadiness';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, AlertTriangle, Info } from 'lucide-react';
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
    <div className="relative w-20 h-20 flex-shrink-0">
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

function ScenarioSummary({ data }: { data: TaxReadinessData }) {
  const { scenario, grossIncome, employmentIncome, nonEmploymentIncome, estimatedLiability, payePaid, remainingLiability, monthlyRecommendation, taxYear } = data;

  if (scenario === 'employment_only') {
    if (payePaid >= estimatedLiability && estimatedLiability > 0) {
      const overpayment = payePaid - estimatedLiability;
      return (
        <div className="space-y-2 text-sm">
          <p>You've earned <strong>{formatCurrency(employmentIncome)}</strong> through employment in {taxYear}.</p>
          <p>Estimated tax: <strong>{formatCurrency(estimatedLiability)}</strong>. Your payslips show you've paid <strong>{formatCurrency(payePaid)}</strong> in PAYE already.</p>
          {overpayment > 0 && (
            <p className="text-primary">You may have overpaid by {formatCurrency(overpayment)} — consider checking with your employer.</p>
          )}
          {overpayment === 0 && (
            <p className="text-primary">Your PAYE fully covers your estimated tax. You're on track!</p>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-2 text-sm">
        <p>You've earned <strong>{formatCurrency(employmentIncome)}</strong> through employment in {taxYear}.</p>
        <p>Estimated tax: <strong>{formatCurrency(estimatedLiability)}</strong>. Your payslips show <strong>{formatCurrency(payePaid)}</strong> paid in PAYE so far.</p>
        {remainingLiability > 0 && (
          <p className="text-destructive">
            You still have <strong>{formatCurrency(remainingLiability)}</strong> in estimated tax not yet covered by PAYE.
            {monthlyRecommendation > 0 && <> That's about <strong>{formatCurrency(monthlyRecommendation)}/mo</strong> for the rest of the year.</>}
          </p>
        )}
      </div>
    );
  }

  if (scenario === 'self_employed') {
    return (
      <div className="space-y-2 text-sm">
        <p>You've earned <strong>{formatCurrency(grossIncome)}</strong> this tax year ({taxYear}).</p>
        <p>Estimated tax: <strong>{formatCurrency(estimatedLiability)}</strong>.</p>
        {estimatedLiability > 0 ? (
          <p className="text-destructive">
            You should have <strong>{formatCurrency(estimatedLiability)}</strong> saved for tax.
            {monthlyRecommendation > 0 && <> That's about <strong>{formatCurrency(monthlyRecommendation)}/mo</strong> for the rest of the year.</>}
          </p>
        ) : (
          <p className="text-primary">Your income falls within the tax-free threshold. No tax liability estimated.</p>
        )}
      </div>
    );
  }

  if (scenario === 'mixed') {
    const nonEmpTaxShare = estimatedLiability > 0
      ? Math.max(0, remainingLiability)
      : 0;

    return (
      <div className="space-y-2 text-sm">
        <p>You've earned <strong>{formatCurrency(grossIncome)}</strong> total in {taxYear}.</p>
        <p>
          <strong>{formatCurrency(employmentIncome)}</strong> from employment
          {nonEmploymentIncome > 0 && <> and <strong>{formatCurrency(nonEmploymentIncome)}</strong> from other sources</>}.
        </p>
        <p>Estimated tax: <strong>{formatCurrency(estimatedLiability)}</strong>.</p>
        {payePaid > 0 && (
          <p>Your payslips show <strong>{formatCurrency(payePaid)}</strong> already paid in PAYE.</p>
        )}
        {nonEmpTaxShare > 0 ? (
          <p className="text-destructive">
            Outside employment, you should save <strong>{formatCurrency(nonEmpTaxShare)}</strong> for tax.
            {monthlyRecommendation > 0 && <> (~{formatCurrency(monthlyRecommendation)}/mo remaining)</>}
          </p>
        ) : (
          <p className="text-primary">Your PAYE covers your estimated tax — you're on track!</p>
        )}
      </div>
    );
  }

  return null;
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

  if (!data.hasData || data.scenario === 'no_data') {
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
  const statusLabel = data.readinessPercent >= 80 ? 'On Track' : data.readinessPercent >= 40 ? 'Partial' : 'Needs Attention';
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
                <p className="text-xs">Based on your {data.taxYear} income transactions and payslip PAYE deductions.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-xs">
          {data.taxYear} Tax Year · <span className={statusColor}>{statusLabel}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <ReadinessRing percent={data.readinessPercent} />
          <div className="flex-1 min-w-0">
            <ScenarioSummary data={data} />
          </div>
        </div>

        {data.remainingLiability > 0 && (
          <Progress value={data.readinessPercent} className="h-2" />
        )}
      </CardContent>
    </Card>
  );
}
