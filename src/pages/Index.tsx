import HeroSection from "@/components/HeroSection";
import KeyFactsSection from "@/components/KeyFactsSection";
import MythsFactsSection from "@/components/MythsFactsSection";
import TaxCalculator from "@/components/TaxCalculator";
import TaxBandsComparison from "@/components/TaxBandsComparison";
import DevelopmentLevySection from "@/components/DevelopmentLevySection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <KeyFactsSection />
      <MythsFactsSection />
      <TaxCalculator />
      <TaxBandsComparison />
      <DevelopmentLevySection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
