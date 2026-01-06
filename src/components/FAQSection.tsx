import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Who needs to pay tax in Nigeria under NTA 2025?",
    answer:
      "Under the new Nigeria Tax Act 2025, individuals earning ₦800,000 or less annually are completely exempt from personal income tax. If you earn above this threshold, you have a tax obligation. This includes employees, self-employed individuals, business owners, and companies. Small companies with turnover of ₦100 million or less are also exempt from Companies Income Tax.",
  },
  {
    question: "How do I file my tax returns?",
    answer:
      "You can file your tax returns through the Nigeria Revenue Service (NRS) online portal. You'll need to register for a Tax Identification Number (TIN), gather your income documents, calculate your tax liability using the new NTA 2025 bands, and submit your return before the deadline.",
  },
  {
    question: "What happens if I don't pay my taxes?",
    answer:
      "Non-payment or late payment of taxes can result in penalties including fines (typically 10% of the tax due plus interest), prosecution in severe cases, and restrictions on obtaining certain government services or contracts. It's always better to file and communicate with NRS if you're facing difficulties.",
  },
  {
    question: "Are there any tax reliefs or deductions I can claim?",
    answer:
      "Yes! You can claim Personal Allowance, pension contributions, National Housing Fund contributions, National Health Insurance contributions, life assurance premiums, and gratuities. The NTA 2025 also increased the tax exemption for compensation for loss of employment from ₦10 million to ₦50 million. Keep receipts and documentation for all deductible expenses.",
  },
  {
    question: "How is my tax rate determined under NTA 2025?",
    answer:
      "Nigeria now uses a more progressive tax system: 0% on the first ₦800,000 (tax-free!), 15% on the next ₦2.2 million, 18% on the next ₦9 million, 21% on the next ₦13 million, 23% on the next ₦25 million, and 25% on income above ₦50 million annually.",
  },
  {
    question: "What's the difference between PAYE and self-assessment?",
    answer:
      "PAYE (Pay As You Earn) applies to employees—your employer deducts tax from your salary and remits it to NRS. Self-assessment is for self-employed individuals, business owners, and those with multiple income sources who must calculate and pay their own tax.",
  },
  {
    question: "What changed from FIRS to NRS?",
    answer:
      "The Federal Inland Revenue Service (FIRS) has been transformed into the Nigeria Revenue Service (NRS) under the Nigeria Revenue Service Act 2025. The NRS now serves as the central tax authority responsible for collecting all federal tax and non-tax revenues, operating with enhanced digital infrastructure and autonomous structure.",
  },
  {
    question: "What is the Development Levy?",
    answer:
      "The NTA 2025 introduces a 4% Development Levy for companies (except small companies). This consolidates previous charges including the Tertiary Education Tax, IT Levy, NASENI levy, and Police Trust Fund levy into a single payment.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
            NTA 2025 Questions
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Got questions about the new tax system? Here are the most common things Nigerians ask about NTA 2025.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-6 card-shadow data-[state=open]:ring-2 data-[state=open]:ring-primary/20"
              >
                <AccordionTrigger className="text-left text-lg font-semibold py-6 hover:no-underline hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
