import HeroSection from "@/components/HeroSection";
import KeyFactsSection from "@/components/KeyFactsSection";
import MythsFactsSection from "@/components/MythsFactsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <KeyFactsSection />
      <MythsFactsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
