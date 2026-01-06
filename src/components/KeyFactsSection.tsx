import { 
  BanknoteIcon, 
  FileText, 
  TrendingUp, 
  Clock, 
  Calculator,
  UserCheck,
  Gift,
  Building2
} from "lucide-react";

const facts = [
  {
    icon: Gift,
    title: "₦800,000 Tax-Free Threshold",
    description: "Under NTA 2025, if you earn ₦800,000 or less annually, you pay ZERO income tax. This is a major relief for low-income earners.",
    highlight: true,
  },
  {
    icon: BanknoteIcon,
    title: "No Automatic Bank Deductions",
    description: "The government will NEVER deduct tax directly from your bank account. Any such claims are false and should be reported.",
    highlight: true,
  },
  {
    icon: UserCheck,
    title: "Self-Reporting Is Your Duty",
    description: "You are responsible for declaring your income annually and paying any tax you owe to the Nigeria Revenue Service (NRS).",
    highlight: false,
  },
  {
    icon: TrendingUp,
    title: "Taxed on Income, Not Inflows",
    description: "Money entering your account isn't automatically taxable. Only actual income (salary, business profits, etc.) is subject to tax.",
    highlight: false,
  },
  {
    icon: Building2,
    title: "FIRS Is Now NRS",
    description: "The Federal Inland Revenue Service has been transformed into the Nigeria Revenue Service (NRS) as the central tax authority.",
    highlight: false,
  },
  {
    icon: FileText,
    title: "Keep Proper Records",
    description: "Maintain records of your income and expenses. This helps you file accurate returns and claim allowable deductions.",
    highlight: false,
  },
  {
    icon: Clock,
    title: "Know Your Deadlines",
    description: "Tax returns are due by March 31st for individuals. Filing late may result in penalties, so mark your calendar.",
    highlight: false,
  },
  {
    icon: Calculator,
    title: "Progressive Tax Rates: 0% - 25%",
    description: "NTA 2025 uses progressive rates from 0% to 25%. The more you earn above ₦800,000, the higher your rate on income above thresholds.",
    highlight: false,
  },
];

const KeyFactsSection = () => {
  return (
    <section id="key-facts" className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
            NTA 2025 Essentials
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Every Nigerian Must Know
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            These are the core facts about the Nigeria Tax Act 2025. Understanding them protects you from misinformation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {facts.map((fact, index) => (
            <div
              key={index}
              className={`group relative p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
                fact.highlight
                  ? "bg-primary text-primary-foreground elevated-shadow md:col-span-2 lg:col-span-2"
                  : "bg-card card-shadow border border-border hover:border-primary/30"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${
                  fact.highlight
                    ? "bg-primary-foreground/20"
                    : "bg-secondary"
                }`}
              >
                <fact.icon
                  className={`w-7 h-7 ${
                    fact.highlight ? "text-accent" : "text-primary"
                  }`}
                />
              </div>

              <h3
                className={`text-xl font-bold mb-3 ${
                  fact.highlight ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {fact.title}
              </h3>

              <p
                className={`leading-relaxed ${
                  fact.highlight
                    ? "text-primary-foreground/85"
                    : "text-muted-foreground"
                }`}
              >
                {fact.description}
              </p>

              {fact.highlight && (
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-accent text-accent-foreground">
                    Key Change
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KeyFactsSection;
