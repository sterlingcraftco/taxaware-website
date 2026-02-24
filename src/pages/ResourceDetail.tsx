import { useParams, Link, Navigate } from "react-router-dom";
import { Download, ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const resourceData: Record<string, {
  title: string;
  description: string;
  pdfPath: string;
  sections: { heading: string; text: string }[];
}> = {
  "nta-2025": {
    title: "Nigeria Tax Act 2025",
    description:
      "The Nigeria Tax Act (NTA) 2025 is a landmark piece of legislation that consolidates Nigeria's tax laws into a single, unified framework. It replaces several legacy statutes — including the Personal Income Tax Act (PITA), Companies Income Tax Act (CITA), and Capital Gains Tax Act — streamlining tax obligations for individuals and businesses alike.",
    pdfPath: "/documents/nigeria-tax-act-2025.pdf",
    sections: [
      {
        heading: "What does it cover?",
        text: "The Act covers personal income tax (including revised tax bands and reliefs), corporate income tax, capital gains tax, and provisions for withholding tax. It introduces a consolidated gross relief of ₦1,200,000 or 20% of gross income (whichever is higher), plus a 20% consolidated relief allowance.",
      },
      {
        heading: "Who does it affect?",
        text: "Every individual earning income in Nigeria — whether employed, self-employed, or freelancing — is affected. Businesses are also covered, though TaxAware currently focuses on helping individuals understand their personal tax obligations.",
      },
      {
        heading: "Key changes from previous legislation",
        text: "The NTA 2025 revises personal income tax bands, updates the development levy, introduces clearer rules around tax residency, and consolidates multiple relief provisions. It aims to simplify compliance and broaden the tax base.",
      },
    ],
  },
  "ntaa-2025": {
    title: "Nigeria Tax Administration Act 2025",
    description:
      "The Nigeria Tax Administration Act (NTAA) 2025 establishes the legal framework for how taxes are assessed, collected, and enforced in Nigeria. It replaces the Federal Inland Revenue Service (Establishment) Act and creates the new Nigeria Revenue Service (NRS) as the primary federal tax authority.",
    pdfPath: "/documents/nigeria-tax-administration-act-2025.pdf",
    sections: [
      {
        heading: "What does it cover?",
        text: "The Act covers tax registration (including TIN requirements), assessment and collection procedures, taxpayer rights, dispute resolution mechanisms, and penalties for non-compliance. It also establishes the Tax Appeal Tribunal and Tax Ombud.",
      },
      {
        heading: "Who does it affect?",
        text: "All taxpayers in Nigeria — individuals and businesses — who are required to register, file returns, and pay taxes. It also sets out obligations for employers, agents, and financial institutions regarding tax withholding and reporting.",
      },
      {
        heading: "Key provisions",
        text: "The NTAA 2025 introduces a unified tax identification framework, strengthens enforcement powers, provides clearer dispute resolution pathways, and outlines specific penalties for late filing, underpayment, and tax evasion.",
      },
    ],
  },
};

export default function ResourceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const resource = slug ? resourceData[slug] : undefined;

  if (!resource) return <Navigate to="/resources" replace />;

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="hero-gradient py-12 md:py-20">
        <div className="container max-w-3xl">
          <Link
            to="/resources"
            className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Resources
          </Link>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0 mt-1">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-primary-foreground">
              {resource.title}
            </h1>
          </div>
          <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed max-w-2xl">
            {resource.description}
          </p>
        </div>
      </section>

      {/* Wave */}
      <div className="w-full overflow-hidden -mt-1">
        <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none">
          <path d="M0,60 L0,20 Q360,0 720,20 Q1080,40 1440,20 L1440,60 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* Content */}
      <section className="container max-w-3xl py-10">
        <div className="flex flex-wrap gap-3 mb-10">
          <Button asChild>
            <a href={resource.pdfPath} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" /> Download PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={resource.pdfPath} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" /> Open in New Tab
            </a>
          </Button>
        </div>

        <div className="space-y-8">
          {resource.sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-xl font-bold text-foreground mb-2">{s.heading}</h2>
              <p className="text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-xl border border-border bg-muted/50 p-6 md:p-8 text-center space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Need help understanding how this affects you?</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Use our free tax calculator to see your obligations under the new Act, or book a consultation with a tax professional.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link to="/">Try the Calculator</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/book-consultation">Book Consultation</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border text-center">
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all resources
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
