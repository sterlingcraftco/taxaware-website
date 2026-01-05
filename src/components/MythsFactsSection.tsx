import { XCircle, CheckCircle } from "lucide-react";

const mythsFacts = [
  {
    myth: "FIRS can automatically deduct taxes from my bank account",
    fact: "No government agency can withdraw money from your account without due legal process. Tax payment is your responsibility.",
  },
  {
    myth: "Every transfer I receive is taxable income",
    fact: "Only actual income is taxed. Gifts, loans, or money you're holding for others are not automatically considered income.",
  },
  {
    myth: "If I don't file, FIRS won't know about my income",
    fact: "Banks and employers report to tax authorities. Non-compliance can result in penalties and legal consequences.",
  },
  {
    myth: "Tax is only for employed people with salaries",
    fact: "Everyone earning above the threshold must pay tax—including business owners, freelancers, landlords, and investors.",
  },
];

const MythsFactsSection = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
            Stop The Misinformation
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Myths vs Facts
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don't fall for false information circulating on social media. Here's the truth.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {mythsFacts.map((item, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl overflow-hidden card-shadow border border-border"
            >
              <div className="grid md:grid-cols-2">
                {/* Myth side */}
                <div className="p-6 md:p-8 bg-destructive/5 border-b md:border-b-0 md:border-r border-border">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-destructive mb-2 block">
                        Myth
                      </span>
                      <p className="text-foreground font-medium leading-relaxed">
                        "{item.myth}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fact side */}
                <div className="p-6 md:p-8 bg-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 block">
                        Fact
                      </span>
                      <p className="text-foreground font-medium leading-relaxed">
                        {item.fact}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MythsFactsSection;
