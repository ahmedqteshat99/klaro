import {
  getRememberedExperimentVariant,
  rememberExperimentAssignment,
} from "@/lib/attribution";

export const LANDING_HERO_CTA_EXPERIMENT_ID = "landing_hero_cta_v1";

export type LandingHeroCtaVariant = "auth_first" | "jobs_first";

interface LandingHeroCtaConfig {
  variant: LandingHeroCtaVariant;
  heroTitlePrimary: string;
  heroTitleAccent: string;
  heroDescription: string;
  heroPrimaryLabel: string;
  heroPrimaryTo: string;
  heroSecondaryLabel: string;
  heroSecondaryTo: string;
  finalCtaTitle: string;
  finalCtaLabel: string;
  finalCtaTo: string;
}

const landingHeroVariantConfig: Record<LandingHeroCtaVariant, LandingHeroCtaConfig> = {
  auth_first: {
    variant: "auth_first",
    heroTitlePrimary: "Bewerben in Deutschland.",
    heroTitleAccent: "Klar. Professionell.",
    heroDescription:
      "Lebenslauf und Anschreiben im korrekten deutschen Aufbau – nur aus Ihren Daten.",
    heroPrimaryLabel: "Kostenlos starten",
    heroPrimaryTo: "/auth",
    heroSecondaryLabel: "So funktioniert's",
    heroSecondaryTo: "#so-funktionierts",
    finalCtaTitle: "Bereit für eine Bewerbung, die klar wirkt?",
    finalCtaLabel: "Kostenlos registrieren",
    finalCtaTo: "/auth",
  },
  jobs_first: {
    variant: "jobs_first",
    heroTitlePrimary: "Assistenzarzt-Jobs finden.",
    heroTitleAccent: "Dann mit Klaro bewerben.",
    heroDescription:
      "Öffentliche Jobbörse durchsuchen, passende Stelle wählen und Bewerbung strukturiert versenden.",
    heroPrimaryLabel: "Jobs entdecken",
    heroPrimaryTo: "/jobs",
    heroSecondaryLabel: "Kostenloses Konto",
    heroSecondaryTo: "/auth",
    finalCtaTitle: "Bereit für Ihren nächsten Schritt?",
    finalCtaLabel: "Jetzt Jobs ansehen",
    finalCtaTo: "/jobs",
  },
};

const landingVariants: LandingHeroCtaVariant[] = ["auth_first", "jobs_first"];

const randomVariant = (): LandingHeroCtaVariant =>
  landingVariants[Math.floor(Math.random() * landingVariants.length)];

export const getLandingHeroCtaVariant = (): LandingHeroCtaVariant => {
  const remembered = getRememberedExperimentVariant(LANDING_HERO_CTA_EXPERIMENT_ID);
  if (remembered === "auth_first" || remembered === "jobs_first") {
    return remembered;
  }

  const assigned = randomVariant();
  rememberExperimentAssignment(LANDING_HERO_CTA_EXPERIMENT_ID, assigned);
  return assigned;
};

export const getLandingHeroCtaConfig = (): LandingHeroCtaConfig =>
  landingHeroVariantConfig[getLandingHeroCtaVariant()];
