import { describe, expect, it } from "vitest";
import {
  INTERNAL_MEDICINE_FILTER_ALL,
  INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS,
  classifyInternalMedicineJob,
  isInternalMedicineDepartmentLabel,
  matchesInternalMedicineFilter,
} from "@/lib/internal-medicine-taxonomy";

const kardiologieFilter = INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS.find(
  (entry) => entry.id === "kardiologie"
);
const nephrologieFilter = INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS.find(
  (entry) => entry.id === "nephrologie"
);

describe("internal-medicine-taxonomy", () => {
  it("classifies Kardiologie jobs as Innere Medizin and Kardiologie", () => {
    const job = {
      title: "Assistenzarzt Kardiologie (m/w/d)",
      department: "Kardiologie",
      tags: ["Herzkatheter"],
    };

    const classification = classifyInternalMedicineJob(job);

    expect(classification.isInternalMedicine).toBe(true);
    expect(classification.matchedSubspecialtyIds).toContain("kardiologie");
    expect(matchesInternalMedicineFilter(job, INTERNAL_MEDICINE_FILTER_ALL)).toBe(true);
    expect(matchesInternalMedicineFilter(job, kardiologieFilter?.value ?? "")).toBe(true);
  });

  it("classifies Nephrologie aliases as Innere Medizin subspecialty", () => {
    const job = {
      title: "Resident Nephrology",
      department: "Kidney Center",
      tags: ["Nephrology"],
    };

    const classification = classifyInternalMedicineJob(job);

    expect(classification.isInternalMedicine).toBe(true);
    expect(classification.matchedSubspecialtyIds).toContain("nephrologie");
    expect(matchesInternalMedicineFilter(job, nephrologieFilter?.value ?? "")).toBe(true);
  });

  it("does not classify non-internal specialties as Innere Medizin", () => {
    const job = {
      title: "Assistenzarzt Radiologie",
      department: "Radiologie",
      tags: ["MRT"],
    };

    const classification = classifyInternalMedicineJob(job);

    expect(classification.isInternalMedicine).toBe(false);
    expect(classification.matchedSubspecialtyIds).toHaveLength(0);
    expect(matchesInternalMedicineFilter(job, INTERNAL_MEDICINE_FILTER_ALL)).toBe(false);
    expect(isInternalMedicineDepartmentLabel("Radiologie")).toBe(false);
  });
});

