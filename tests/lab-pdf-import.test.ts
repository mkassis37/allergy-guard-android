import { describe, expect, it } from "vitest";
import { normalizeLabText, parseLabTextCandidates } from "../lib/lab-pdf-import";

describe("laboratory PDF text parsing", () => {
  it("normalizes Arabic digits and decimal separators", () => {
    expect(normalizeLabText("الهيموغلوبين ١٣٫٥ g/dL")).toBe("الهيموغلوبين 13.5 g/dL");
  });

  it("extracts clear English result rows without interpreting them", () => {
    const rows = parseLabTextCandidates("Hemoglobin 13.5 g/dL 12.0-16.0\nWBC 6.2 10^3/uL 4.0-11.0");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      testName: "Hemoglobin",
      value: "13.5",
      unit: "g/dL",
      referenceRange: "12.0-16.0",
    });
    expect(rows[0].confidence).toBe("high");
  });

  it("keeps Arabic labels and asks for review when unit or range is missing", () => {
    const rows = parseLabTextCandidates("سكر صائم ١٠٥");
    expect(rows).toHaveLength(1);
    expect(rows[0].testName).toBe("سكر صائم");
    expect(rows[0].value).toBe("105");
    expect(rows[0].confidence).toBe("review");
    expect(rows[0].warnings.length).toBeGreaterThan(0);
  });

  it("does not treat common report headers as results", () => {
    expect(parseLabTextCandidates("Test Name Result Unit Reference Range\nPatient Name")).toHaveLength(0);
  });

  it("preserves comparison operators for review", () => {
    const rows = parseLabTextCandidates("Vitamin D < 10 ng/mL");
    expect(rows[0].value).toBe("<10");
    expect(rows[0].warnings).toContain("النتيجة حدّية أو مقارنة؛ تأكد من نقل الرمز كما هو.");
  });
});
