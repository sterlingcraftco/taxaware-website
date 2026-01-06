import { ExternalLink, FileText, Phone } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="hero-gradient rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary-foreground/10 blur-2xl" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Take Action?
              </h2>
              <p className="text-lg text-primary-foreground/85 mb-8 max-w-xl mx-auto">
                Get your Tax Identification Number, file your returns, or speak with a tax officer at the Nigeria Revenue Service.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://nrs.gov.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full gold-gradient text-accent-foreground font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg"
                >
                  <FileText className="w-5 h-5" />
                  Visit NRS Portal
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href="tel:+2342094602700"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/30 text-primary-foreground font-semibold text-lg transition-all hover:bg-primary-foreground/20"
                >
                  <Phone className="w-5 h-5" />
                  Call NRS Helpline
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
