import { describe, expect, it } from "vitest";
import type { JobData } from "@/lib/api/generation";
import { mapExtractedJobToAdminForm } from "@/lib/job-import";

const emptyForm = {
  title: "",
  hospital_name: "",
  department: "",
  location: "",
  description: "",
  requirements: "",
  contact_email: "",
  contact_name: "",
  apply_url: "",
  tags: "",
};

describe("mapExtractedJobToAdminForm", () => {
  it("maps legacy extraction keys into admin form fields", () => {
    const extracted: Partial<JobData> = {
      position: "Assistenzarzt (m/w/d) Innere Medizin",
      krankenhaus: "Universitaetsklinikum Teststadt",
      fachabteilung: "Innere Medizin",
      standort: "Teststadt",
      ansprechpartner: "Prof. Dr. Beispiel",
      anforderungen: "Approbation und Teamfaehigkeit.",
    };

    const result = mapExtractedJobToAdminForm({
      currentForm: emptyForm,
      extracted,
      sourceUrl: "https://jobs.example.com/stellen/123",
    });

    expect(result.nextForm.title).toBe("Assistenzarzt (m/w/d) Innere Medizin");
    expect(result.nextForm.hospital_name).toBe("Universitaetsklinikum Teststadt");
    expect(result.nextForm.department).toBe("Innere Medizin");
    expect(result.nextForm.location).toBe("Teststadt");
    expect(result.nextForm.contact_name).toBe("Prof. Dr. Beispiel");
    expect(result.nextForm.requirements).toBe("Approbation und Teamfaehigkeit.");
    expect(result.nextForm.apply_url).toBe("https://jobs.example.com/stellen/123");
    expect(result.importedFields).toContain("title");
    expect(result.importedFields).toContain("apply_url");
  });

  it("does not overwrite non-empty fields when overwriteExisting is false", () => {
    const extracted: Partial<JobData> = {
      title: "Neuer Titel",
      hospital_name: "Neue Klinik",
      requirements: "Neue Anforderungen",
    };

    const result = mapExtractedJobToAdminForm({
      currentForm: {
        ...emptyForm,
        title: "Bestehender Titel",
        hospital_name: "Bestehende Klinik",
        requirements: "Bestehende Anforderungen",
      },
      extracted,
      overwriteExisting: false,
    });

    expect(result.nextForm.title).toBe("Bestehender Titel");
    expect(result.nextForm.hospital_name).toBe("Bestehende Klinik");
    expect(result.nextForm.requirements).toBe("Bestehende Anforderungen");
    expect(result.importedFields).not.toContain("title");
  });

  it("overwrites non-empty fields when overwriteExisting is true", () => {
    const extracted: Partial<JobData> = {
      title: "Neuer Titel",
      hospital_name: "Neue Klinik",
      tags: ["Innere Medizin", "Vollzeit"],
    };

    const result = mapExtractedJobToAdminForm({
      currentForm: {
        ...emptyForm,
        title: "Bestehender Titel",
        hospital_name: "Bestehende Klinik",
      },
      extracted,
      overwriteExisting: true,
    });

    expect(result.nextForm.title).toBe("Neuer Titel");
    expect(result.nextForm.hospital_name).toBe("Neue Klinik");
    expect(result.nextForm.tags).toBe("Innere Medizin, Vollzeit");
    expect(result.importedFields).toContain("title");
    expect(result.importedFields).toContain("hospital_name");
    expect(result.importedFields).toContain("tags");
  });
});

