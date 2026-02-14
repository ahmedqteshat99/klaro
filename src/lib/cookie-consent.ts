import * as Klaro from "klaro";

// Klaro Cookie Consent Configuration
export const klaroConfig = {
  version: 1,
  elementID: "klaro",
  storageMethod: "localStorage",
  storageName: "klaro_consent",
  htmlTexts: true,
  embedded: false,
  groupByPurpose: true,
  purposeOrder: ["essential", "analytics", "marketing"],

  // German translations
  lang: "de",
  translations: {
    de: {
      consentModal: {
        title: "🍪 Ihre Privatsphäre ist uns wichtig",
        description:
          "Wir nutzen Cookies und vergleichbare Technologien, um Klaro sicher und funktional zu betreiben. " +
          "Einige Dienste sind technisch notwendig, andere helfen uns, die Plattform für Sie zu verbessern. " +
          "Sie haben die volle Kontrolle über Ihre Daten.",
        privacyPolicy: {
          name: "Datenschutzerklärung",
          text: "Details zu unserer Datenverarbeitung finden Sie in unserer {privacyPolicy}.",
        },
      },
      consentNotice: {
        changeDescription:
          "Unsere Datenschutzrichtlinien wurden aktualisiert. Bitte überprüfen Sie Ihre Einstellungen.",
        description:
          "Diese Website verwendet Cookies für eine optimale Nutzererfahrung. " +
          "Wählen Sie selbst, welche Dienste Sie zulassen möchten.",
        learnMore: "⚙️ Einstellungen",
        testing: "Test-Modus aktiv",
      },
      purposeItem: {
        service: "Dienst",
        services: "Dienste",
      },
      ok: "✓ Alle akzeptieren",
      save: "✓ Auswahl speichern",
      decline: "Nur Notwendige",
      close: "Schließen",
      acceptAll: "✓ Alle akzeptieren",
      acceptSelected: "✓ Auswahl speichern",
      service: {
        disableAll: {
          title: "Alle Dienste an-/ausschalten",
          description: "Schalten Sie alle Dienste an oder aus.",
        },
        optOut: {
          title: "(Opt-Out)",
          description: "Dieser Dienst wird standardmäßig geladen (Sie können ihn deaktivieren)",
        },
        required: {
          title: "(immer erforderlich)",
          description: "Dieser Dienst ist technisch notwendig und kann nicht deaktiviert werden.",
        },
        purposes: "Zwecke",
        purpose: "Zweck",
      },
      essential: "Technisch notwendig",
      analytics: "Analyse & Optimierung",
      marketing: "Marketing & Werbung",
    },
  },

  // Cookie services configuration
  services: [
    {
      name: "essential",
      title: "Technisch notwendige Dienste",
      description: "Diese Dienste sind für die grundlegende Funktionalität der Website erforderlich.",
      purposes: ["essential"],
      required: true,
      default: true,
      optOut: false,
      onlyOnce: true,
    },
    {
      name: "supabase-auth",
      title: "Supabase Authentication",
      description: "Ermöglicht die Anmeldung und Sitzungsverwaltung.",
      purposes: ["essential"],
      required: true,
      default: true,
      optOut: false,
      onlyOnce: true,
      cookies: [
        [/^sb-.*-auth-token$/, "/", "klaro.tools"],
      ],
    },
    {
      name: "attribution",
      title: "Marketing-Attribution",
      description:
        "Speichert Informationen darüber, wie Sie auf unsere Website gelangt sind (z.B. UTM-Parameter, Werbe-Klick-IDs). " +
        "Dies hilft uns, unsere Marketing-Maßnahmen zu verbessern.",
      purposes: ["marketing"],
      required: false,
      default: false,
      optOut: true,
      cookies: [
        ["klaro_attribution_v1", "/", "klaro.tools"],
      ],
      callback: function (consent: boolean, service: any) {
        // Block attribution tracking if consent is not given
        if (!consent) {
          try {
            localStorage.removeItem("klaro_attribution_v1");
          } catch (e) {
            console.warn("Could not remove attribution data:", e);
          }
        }
      },
    },
    {
      name: "onboarding-state",
      title: "Onboarding-Status",
      description:
        "Speichert, ob Sie das Onboarding bereits abgeschlossen haben, um Ihnen beim nächsten Besuch Zeit zu sparen.",
      purposes: ["essential"],
      required: true,
      default: true,
      optOut: false,
      cookies: [
        [/^onboarding_done_.*$/, "/", "klaro.tools"],
      ],
    },
  ],

  // Privacy policy link
  privacyPolicy: "/datenschutz",

  // Styling
  styling: {
    theme: ["light", "top", "wide"],
  },

  // Show notice immediately on first visit
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  hideLearnMore: false,
  noticeAsModal: false,

  // Callback when consent changes
  callback: function (consent: any, service: any) {
    console.log("Klaro consent changed:", service.name, consent);
  },
};

// Initialize Klaro
export function initializeKlaro() {
  try {
    // @ts-ignore - Klaro types not perfect
    window.klaro = Klaro;
    // @ts-ignore
    window.klaroConfig = klaroConfig;

    // Initialize Klaro
    Klaro.setup(klaroConfig);
  } catch (error) {
    console.error("Error initializing Klaro:", error);
  }
}

// Helper function to check if consent was given for a specific service
export function hasConsent(serviceName: string): boolean {
  try {
    const manager = Klaro.getManager();
    if (!manager) return false;
    return manager.getConsent(serviceName);
  } catch (error) {
    console.warn("Error checking consent:", error);
    return false;
  }
}

// Helper function to check if attribution tracking is allowed
export function canTrackAttribution(): boolean {
  return hasConsent("attribution");
}
