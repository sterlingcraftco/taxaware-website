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

export const trackPageView = (path: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "page_view", { page_path: path });
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

  clickCreateAccount: () =>
    trackEvent("click_cta", { cta_type: "create_account", location: "cta_section" }),

  // Hero events
  clickLearnMore: () =>
    trackEvent("click_cta", { cta_type: "learn_more", location: "hero" }),

  clickTryCalculator: () =>
    trackEvent("click_cta", { cta_type: "try_calculator", location: "hero" }),

  clickSignIn: () =>
    trackEvent("click_cta", { cta_type: "sign_in", location: "hero" }),

  clickDashboard: () =>
    trackEvent("click_cta", { cta_type: "dashboard", location: "hero" }),

  // Auth events
  signUp: () => trackEvent("sign_up"),
  signIn: () => trackEvent("login"),
  forgotPassword: () => trackEvent("forgot_password"),
  resetPassword: () => trackEvent("reset_password"),

  // FAQ events
  expandFAQ: (question: string) =>
    trackEvent("expand_faq", { question: question.slice(0, 50) }),

  // Blog events
  viewBlogPost: (slug: string, title: string) =>
    trackEvent("view_blog_post", { slug, title: title.slice(0, 50) }),

  clickBlogPost: (slug: string) =>
    trackEvent("click_blog_post", { slug }),

  blogPaginate: (page: number) =>
    trackEvent("blog_paginate", { page }),

  // Subscription events
  viewSubscription: () => trackEvent("view_subscription"),
  clickSubscribe: (plan: string, amount: number) =>
    trackEvent("click_subscribe", { plan, amount }),
  subscriptionVerified: () => trackEvent("subscription_verified"),

  // Consultation events
  clickBookConsultation: (location: string) =>
    trackEvent("click_cta", { cta_type: "book_consultation", location }),
  initiateConsultationPayment: () =>
    trackEvent("initiate_consultation_payment"),

  // Transaction events
  addTransaction: (type: string, amount: number) =>
    trackEvent("add_transaction", { type, amount }),
  editTransaction: (type: string) =>
    trackEvent("edit_transaction", { type }),

  // Savings events
  initiateDeposit: (amount: number) =>
    trackEvent("initiate_deposit", { amount }),
  requestWithdrawal: (amount: number) =>
    trackEvent("request_withdrawal", { amount }),

  // Footer events
  clickFooterLink: (link: string) =>
    trackEvent("click_footer_link", { link }),

  // Profile events
  updateProfile: () => trackEvent("update_profile"),
  changePassword: () => trackEvent("change_password"),
};
