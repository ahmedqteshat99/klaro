import { useState, useEffect } from "react";

const AI_CONSENT_KEY = "klaro_ai_consent_v1";

export function useAiConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if consent has been given
    const stored = localStorage.getItem(AI_CONSENT_KEY);
    setHasConsent(stored === "true");
    setIsLoading(false);
  }, []);

  const grantConsent = () => {
    localStorage.setItem(AI_CONSENT_KEY, "true");
    setHasConsent(true);
  };

  const revokeConsent = () => {
    localStorage.removeItem(AI_CONSENT_KEY);
    setHasConsent(false);
  };

  const resetConsent = () => {
    localStorage.removeItem(AI_CONSENT_KEY);
    setHasConsent(null);
  };

  return {
    hasConsent,
    isLoading,
    grantConsent,
    revokeConsent,
    resetConsent,
  };
}
