import { Building2, Percent, CircleDollarSign, CalendarCheck, AlertCircle, ArrowRight } from "lucide-react";

const DevelopmentLevySection = () => {
  const keyPoints = [
    {
      icon: Building2,
      title: "Who Pays",
      description: "Only companies are liable — individuals, sole proprietors, and partnerships are exempt from this levy.",
    },
    {
      icon: Percent,
      title: "Rate Applied",
      description: "A flat 4% is charged on assessable profits of the company for the relevant year of assessment.",
    },
    {
      icon: CircleDollarSign,
      title: "Purpose",
      description: "Funds collected go towards national development priorities including infrastructure, education, and healthcare.",
    },
    {
      icon: CalendarCheck,
      title: "Payment Timeline",
      description: "The levy is payable alongside company income tax filings and follows the same assessment periods.",
    },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-4">
            <CircleDollarSign className="w-4 h-4 inline mr-1" />
            NTA 2025 Provision
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            The 4% Development Levy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A new levy introduced under NTA 2025 that applies specifically to companies operating in Nigeria.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Main explanation card */}
          <div className="bg-card rounded-2xl card-shadow border border-border p-8 md:p-10 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                <Percent className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">What is the Development Levy?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The Development Levy is a <strong className="text-foreground">4% charge on the assessable profits of companies</strong> introduced 
                  under the Nigeria Tax Act 2025. It is separate from Company Income Tax (CIT) and is designed to fund 
                  critical national development projects. This levy does <strong className="text-foreground">not apply to individuals</strong> — 
                  only registered companies are required to pay.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-5 border border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Important Distinction</p>
                  <p className="text-sm text-muted-foreground">
                    If you're an individual taxpayer, salaried employee, or run an unincorporated business, 
                    the Development Levy does not apply to you. It only affects limited liability companies 
                    and corporate entities.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key points grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {keyPoints.map((point, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <point.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{point.title}</h4>
                    <p className="text-sm text-muted-foreground">{point.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Example calculation */}
          <div className="mt-8 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 border border-border">
            <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              Example Calculation
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 text-muted-foreground">Company Assessable Profit</td>
                    <td className="py-3 text-right font-semibold text-foreground">₦50,000,000</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 text-muted-foreground">Development Levy Rate</td>
                    <td className="py-3 text-right font-semibold text-foreground">4%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-foreground font-medium">Development Levy Payable</td>
                    <td className="py-3 text-right font-bold text-primary">₦2,000,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              This is in addition to any Company Income Tax (CIT) the company owes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DevelopmentLevySection;
