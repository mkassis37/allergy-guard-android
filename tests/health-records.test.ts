import { describe, expect, it } from "vitest";
import { buildEmergencyHealthSummary, buildPatientTimeline, removeById, upsertById } from "../lib/health-records";
import { EMPTY_PATIENT_HEALTH_DATA } from "../lib/health-types";

describe("health record helpers", () => {
  it("updates and removes records by stable id", () => {
    const original = [{ id: "a", value: 1 }, { id: "b", value: 2 }];
    expect(upsertById(original, { id: "a", value: 3 })).toEqual([{ id: "a", value: 3 }, { id: "b", value: 2 }]);
    expect(removeById(original, "b")).toEqual([{ id: "a", value: 1 }]);
  });

  it("combines legacy and structured data into a newest-first timeline", () => {
    const patient = {
      records: [{ id: "r1", kind: "surgery" as const, name: "عملية", date: "2020-01-01", eventDate: "2020-01-02" }],
      ...EMPTY_PATIENT_HEALTH_DATA,
      labResults: [{ id: "l1", testName: "CBC", value: "12", unit: "g/dL", resultedAt: "2024-01-01", attachmentUris: [] }],
    };
    const timeline = buildPatientTimeline(patient);
    expect(timeline.map((entry) => entry.id)).toEqual(["lab:l1", "legacy:r1"]);
    expect(timeline[1].category).toBe("surgery");
  });

  it("includes structured current medicines and conditions in emergency summary", () => {
    const patient = {
      records: [{ id: "a", kind: "medicine-allergy" as const, name: "Drug A", date: "2024-01-01", severity: "شديدة" as const }],
      ...EMPTY_PATIENT_HEALTH_DATA,
      medications: [{ id: "m", name: "Medicine B", status: "active" as const, prescribedDose: "5 mg", createdAt: "2024-01-01", updatedAt: "2024-01-01" }],
      conditions: [{ id: "c", name: "Condition C", status: "active" as const, linkedMedicationIds: [], createdAt: "2024-01-01", updatedAt: "2024-01-01" }],
    };
    const summary = buildEmergencyHealthSummary(patient);
    expect(summary.allergies[0].name).toBe("Drug A");
    expect(summary.medications).toContainEqual({ name: "Medicine B", dose: "5 mg" });
    expect(summary.conditions).toContain("Condition C");
  });
});
