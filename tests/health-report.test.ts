import { describe, expect, it } from "vitest";
import { buildPatientHealthReportHtml } from "../lib/health-report";
import { EMPTY_PATIENT_HEALTH_DATA } from "../lib/health-types";

describe("patient health report", () => {
  it("includes structured data sections and escapes user-provided text", () => {
    const patient = {
      id: "p1", fullName: "<Patient>", birthDate: "", phone: "", emergencyContact: "", doctor: "",
      records: [], createdAt: "2024-01-01", updatedAt: "2024-01-01",
      ...EMPTY_PATIENT_HEALTH_DATA,
      labResults: [{ id: "l1", testName: "CBC", value: "5.2", unit: "g/L", resultedAt: "2024-01-01", attachmentUris: ["file://report.pdf"] }],
    };
    const html = buildPatientHealthReportHtml(patient);
    expect(html).toContain("الفحوصات المخبرية");
    expect(html).toContain("سجل جرعات الأدوية");
    expect(html).toContain("&lt;Patient&gt;");
    expect(html).not.toContain("<Patient>");
  });
});
