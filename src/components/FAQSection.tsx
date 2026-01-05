import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Who needs to pay tax in Nigeria?",
    answer:
      "Any individual or business earning income in Nigeria is required to pay tax. This includes employees, self-employed individuals, business owners, and companies. There's a tax-free threshold for low-income earners, but if you earn above ₦30,000 monthly, you likely have a tax obligation.",
  },
  {
    question: "How do I file my tax returns?",
    answer:
      "You can file your tax returns through the Federal Inland Revenue Service (FIRS) online portal or visit any FIRS office. You'll need to register for a Tax Identification Number (TIN), gather your income documents, calculate your tax liability, and submit your return before the March 31st deadline.",
  },
  {
    question: "What happens if I don't pay my taxes?",
    answer:
      "Non-payment or late payment of taxes can result in penalties including fines (typically 10% of the tax due plus interest), prosecution in severe cases, and restrictions on obtaining certain government services or contracts. It's always better to file and communicate with FIRS if you're facing difficulties.",
  },
  {
    question: "Are there any tax reliefs or deductions I can claim?",
    answer:
      "Yes! You can claim Personal Allowance, pension contributions (up to 8% of gross income), National Housing Fund contributions, National Health Insurance contributions, life assurance premiums, and gratuities. Keep receipts and documentation for all deductible expenses.",
  },
  {
    question: "How is my tax rate determined?",
    answer:
      "Nigeria uses a progressive tax system with bands: 7% on the first ₦300,000, 11% on the next ₦300,000, 15% on the next ₦500,000, 19% on the next ₦500,000, 21% on the next ₦1,600,000, and 24% on income above ₦3.2 million annually.",
  },
  {
    question: "What's the difference between PAYE and self-assessment?",
    answer:
      "PAYE (Pay As You Earn) applies to employees—your employer deducts tax from your salary and remits it to FIRS. Self-assessment is for self-employed individuals, business owners, and those with multiple income sources who must calculate and pay their own tax.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
            Common Questions
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Got questions? We've got answers. Here are the most common things Nigerians ask about the tax system.
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
