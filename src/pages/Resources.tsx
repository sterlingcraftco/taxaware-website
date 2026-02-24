import { Link } from "react-router-dom";
import { FileText, Download, ExternalLink, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const resources = [
  {
    slug: "nta-2025",
    title: "Nigeria Tax Act 2025",
    shortTitle: "NTA 2025",
    description:
      "The Nigeria Tax Act 2025 consolidates and reforms the taxation of income, profits, and capital gains for individuals and businesses in Nigeria. It replaces several legacy tax laws and introduces updated tax bands, reliefs, and compliance requirements under a single unified framework.",
    pdfPath: "/documents/nigeria-tax-act-2025.pdf",
    highlights: [
      "Revised personal income tax bands",
      "Updated relief and exemption provisions",
      "Consolidated corporate and personal tax rules",
    ],
  },
  {
    slug: "ntaa-2025",
    title: "Nigeria Tax Administration Act 2025",
    shortTitle: "NTAA 2025",
    description:
      "The Nigeria Tax Administration Act 2025 governs the administration, assessment, collection, and enforcement of taxes in Nigeria. It establishes the Nigeria Revenue Service (NRS), outlines taxpayer rights and obligations, and sets out penalties for non-compliance.",
    pdfPath: "/documents/nigeria-tax-administration-act-2025.pdf",
    highlights: [
      "Establishment of the Nigeria Revenue Service",
      "Taxpayer rights and dispute resolution",
      "Penalties and enforcement mechanisms",
    ],
  },
];

export default function Resources() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="hero-gradient py-12 md:py-20">
        <div className="container max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6 transition-colors"
          >
            ← Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground mb-3">
            Resources & Guides
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl">
            Official documents, guides and reference material to help you understand Nigeria's 2025 tax reform.
          </p>
        </div>
      </section>

      {/* Wave */}
      <div className="w-full overflow-hidden -mt-1">
        <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none">
          <path d="M0,60 L0,20 Q360,0 720,20 Q1080,40 1440,20 L1440,60 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* Resource Cards */}
      <section className="container max-w-4xl py-10">
        <div className="grid gap-6 md:grid-cols-2">
          {resources.map((r) => (
            <Card key={r.slug} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{r.title}</CardTitle>
                    <CardDescription className="mt-1">Official legislation document</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                <ul className="space-y-1.5">
                  {r.highlights.map((h) => (
                    <li key={h} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 mt-auto pt-4">
                  <Button asChild variant="default" size="sm">
                    <Link to={`/resources/${r.slug}`}>
                      Read More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={r.pdfPath} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" /> Download PDF
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming soon teaser */}
        <div className="mt-12 rounded-xl border border-border bg-muted/50 p-6 text-center">
          <p className="text-muted-foreground text-sm">
            More resources, simplified guides, and how-to documents coming soon.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
