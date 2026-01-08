import { Shield, ArrowDown, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { isAuthEnabled } from "@/lib/featureFlags";

const HeroSection = () => {
  const { user } = useAuth();
  const authEnabled = isAuthEnabled();

  const scrollToContent = () => {
    document.getElementById("key-facts")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero-gradient relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-accent blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
      </div>

      <div className="container relative z-10 py-20 md:py-32">
        {/* Sign in button - only show when auth is enabled */}
        {authEnabled && (
          <div className="absolute top-4 right-4 md:top-8 md:right-8">
            {user ? (
              <Button asChild variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                <Link to="/dashboard">
                  <User className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                <Link to="/auth">
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        )}

        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-8 animate-fade-in">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">
              Nigeria Tax Act 2025 • Citizen Awareness Guide
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-6 animate-fade-up text-balance">
            Understanding
            <span className="block mt-2">
              <span className="text-accent">NTA 2025</span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/85 mb-10 animate-fade-up leading-relaxed max-w-2xl mx-auto" style={{ animationDelay: "0.1s" }}>
            Clear, simple information every Nigerian needs to know about the new tax system. 
            New tax bands, ₦800,000 tax-free threshold, and more—explained simply.
          </p>

          <button
            onClick={scrollToContent}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-full gold-gradient text-accent-foreground font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            Learn What Changed
            <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute -bottom-px left-0 right-0 text-background">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto block">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
