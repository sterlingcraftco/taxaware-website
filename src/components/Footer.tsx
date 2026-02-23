import { Link } from "react-router-dom";
import { Phone, BookOpen } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">TA</span>
              </div>
              <span className="font-bold text-lg text-foreground">TaxAware NG</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Helping individual Nigerians understand NTA 2025 tax compliance
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Business/Company tax tools coming soon
            </p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground mb-1">
              This is an educational resource, not official NRS communication.
            </p>
            <p className="text-sm text-muted-foreground">
              For official information, visit{" "}
              <a
                href="https://nrs.gov.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                nrs.gov.ng
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TaxAware NG. Built with 💚 for Nigerians.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Blog
            </Link>
            <Link
              to="/book-consultation"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Book a Tax Consultation — ₦1,000
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
