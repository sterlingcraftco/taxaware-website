import { ExternalLink, FileText, Phone, Building2, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { analytics } from "@/lib/analytics";

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Coming Soon - Business Tax */}
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-4">
              <Building2 className="w-4 h-4" />
              Coming Soon
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Business & Company Tax Tools
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              TaxAware NG will soon support tax calculations and guidance for businesses, companies, and corporate entities under NTA 2025.
            </p>
          </div>

          {/* Main CTA */}
          <div className="hero-gradient rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary-foreground/10 blur-2xl" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Take Action?
              </h2>
              <p className="text-lg text-primary-foreground/85 mb-8 max-w-xl mx-auto">
                Get your Tax Identification Number, file your returns, or create an account for comprehensive tax calculations.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full gold-gradient text-accent-foreground font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg"
                >
                  <UserCheck className="w-5 h-5" />
                  Create Free Account
                </Link>

                <a
                  href="https://nrs.gov.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => analytics.clickNRSPortal()}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/30 text-primary-foreground font-semibold text-lg transition-all hover:bg-primary-foreground/20"
                >
                  <FileText className="w-5 h-5" />
                  Visit NRS Portal
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <a
                href="tel:+2342094602700"
                onClick={() => analytics.clickNRSHelpline()}
                className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">NRS Helpline: +234 209 460 2700</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
