// Feature flags based on environment
// Preview mode (lovableproject.com) = auth enabled
// Published mode (lovable.app or custom domain) = auth disabled

export const isPreviewMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('lovableproject.com') || hostname === 'localhost';
};

export const isAuthEnabled = (): boolean => {
  // Auth is enabled only in preview/development mode
  return isPreviewMode();
};
