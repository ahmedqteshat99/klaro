import { describe, expect, it } from "vitest";

import {
  isLikelyInvalidLocation,
  normalizeJobLocation,
} from "../../supabase/functions/_shared/location-normalization.ts";

describe("location normalization", () => {
  it("keeps a valid raw city location and enriches it", () => {
    expect(
      normalizeJobLocation({
        rawLocation: "Hamburg",
        hospitalName: "Universitätsklinikum Hamburg-Eppendorf",
        title: "Assistenzarzt (m/w/d)",
      })
    ).toBe("Hamburg, Hamburg");
  });

  it("rejects Fachbereich strings as locations", () => {
    expect(
      normalizeJobLocation({
        rawLocation: "Innere Medizin",
        hospitalName: "Städtisches Klinikum Dresden",
        title: "Assistenzarzt Innere Medizin",
      })
    ).toBe("Dresden, Sachsen");
    expect(isLikelyInvalidLocation("Innere Medizin")).toBe(true);
  });

  it("extracts a location from PLZ plus city in free text", () => {
    expect(
      normalizeJobLocation({
        rawLocation: null,
        hospitalName: "MVZ Muster",
        title: "Assistenzarzt (m/w/d)",
        description: "Ihr Einsatzort ist 80331 München in einem modernen Zentrum.",
      })
    ).toBe("80331 München, Bayern");
  });

  it("infers a city from the hospital name when raw location is generic", () => {
    expect(
      normalizeJobLocation({
        rawLocation: "Klinik",
        hospitalName: "Klinikum Dortmund",
        title: "Assistenzarzt (m/w/d)",
      })
    ).toBe("Dortmund, Nordrhein-Westfalen");
  });

  it("marks compound hospital metadata as invalid until normalized", () => {
    expect(isLikelyInvalidLocation("Klinik für Innere Medizin")).toBe(true);
    expect(
      normalizeJobLocation({
        rawLocation: "Klinik für Innere Medizin",
        hospitalName: "Charité – Universitätsmedizin Berlin",
        title: "Assistenzarzt (m/w/d)",
      })
    ).toBe("Berlin, Berlin");
  });
});
