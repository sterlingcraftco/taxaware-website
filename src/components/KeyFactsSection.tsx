import { 
  BanknoteIcon, 
  FileText, 
  TrendingUp, 
  Clock, 
  Calculator,
  UserCheck 
} from "lucide-react";

const facts = [
  {
    icon: BanknoteIcon,
    title: "No Automatic Bank Deductions",
    description: "The government will NEVER deduct tax directly from your bank account. Any such claims are false.",
    highlight: true,
  },
  {
    icon: UserCheck,
    title: "Self-Reporting Is Your Duty",
    description: "You are responsible for declaring your income annually and paying any tax you owe. This is called self-assessment.",
    highlight: false,
  },
  {
    icon: TrendingUp,
    title: "Taxed on Income, Not Inflows",
    description: "Money entering your account isn't automatically taxable. Only actual income (salary, business profits, etc.) is subject to tax.",
    highlight: true,
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
    title: "Understand Tax Bands",
    description: "Nigeria uses progressive tax rates from 7% to 24%. The more you earn, the higher your rate on income above certain thresholds.",
    highlight: false,
  },
];

const KeyFactsSection = () => {
  return (
    <section id="key-facts" className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
            Essential Knowledge
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Every Nigerian Must Know
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            These are the core facts about the new tax system. Understanding them protects you from misinformation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facts.map((fact, index) => (
            <div
              key={index}
              className={`group relative p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
                fact.highlight
                  ? "bg-primary text-primary-foreground elevated-shadow"
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
                    Important
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
