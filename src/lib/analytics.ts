// Google Analytics event tracking utility

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
};

// Pre-defined events for consistency
export const analytics = {
  // Calculator events
  calculateTax: (income: number, taxAmount: number) =>
    trackEvent("calculate_tax", {
      income_amount: income,
      tax_amount: taxAmount,
      effective_rate: income > 0 ? ((taxAmount / income) * 100).toFixed(1) : "0",
    }),

  saveCalculation: (income: number) =>
    trackEvent("save_calculation", { income_amount: income }),

  downloadPDF: (income: number, taxAmount: number) =>
    trackEvent("download_pdf", {
      income_amount: income,
      tax_amount: taxAmount,
    }),

  // CTA events
  clickNRSPortal: () =>
    trackEvent("click_cta", { cta_type: "nrs_portal", location: "cta_section" }),

  clickNRSHelpline: () =>
    trackEvent("click_cta", { cta_type: "nrs_helpline", location: "cta_section" }),

  // Hero events
  clickLearnMore: () =>
    trackEvent("click_cta", { cta_type: "learn_more", location: "hero" }),

  clickSignIn: () =>
    trackEvent("click_cta", { cta_type: "sign_in", location: "hero" }),

  clickDashboard: () =>
    trackEvent("click_cta", { cta_type: "dashboard", location: "hero" }),

  // Auth events
  signUp: () => trackEvent("sign_up"),
  signIn: () => trackEvent("login"),

  // FAQ events
  expandFAQ: (question: string) =>
    trackEvent("expand_faq", { question: question.slice(0, 50) }),
};
