import { describe, expect, it } from "vitest";
import { normalizePatientHealthData } from "../lib/health-types";

describe("patient health data schema v3", () => {
  it("adds empty health collections to legacy patient data", () => {
    const result = normalizePatientHealthData({ id: "patient-1", records: [] });
    expect(result).toEqual({
      medications: [],
      medicationSchedules: [],
      doseEvents: [],
      conditions: [],
      measurements: [],
      appointments: [],
      labResults: [],
    });
  });

  it("preserves valid medication, schedule, condition and measurement IDs", () => {
    const result = normalizePatientHealthData({
      medications: [{ id: "med-1", name: "دواء موصوف", status: "active" }],
      medicationSchedules: [{
        id: "schedule-1",
        medicationId: "med-1",
        times: ["08:00", "20:00", "25:99"],
        enabled: true,
        reminderEnabled: true,
      }],
      conditions: [{
        id: "condition-1",
        name: "حالة مزمنة",
        linkedMedicationIds: ["med-1", "missing"],
      }],
      measurements: [{
        id: "measurement-1",
        conditionId: "condition-1",
        type: "قراءة",
        value: 12.5,
        unit: "unit",
        measuredAt: "2026-11-22T08:00:00.000Z",
      }],
      doseEvents: [{
        id: "dose-1",
        medicationId: "med-1",
        scheduledAt: "2026-11-22T08:00:00.000Z",
        status: "taken",
      }],
    });

    expect(result.medications[0].id).toBe("med-1");
    expect(result.medicationSchedules[0].times).toEqual(["08:00", "20:00"]);
    expect(result.medicationSchedules[0].enabled).toBe(true);
    expect(result.conditions[0].linkedMedicationIds).toEqual(["med-1"]);
    expect(result.measurements[0].value).toBe(12.5);
    expect(result.doseEvents[0].status).toBe("taken");
  });

  it("disables orphan schedules and removes dose events for unknown medications", () => {
    const result = normalizePatientHealthData({
      medicationSchedules: [{
        id: "schedule-orphan",
        medicationId: "missing",
        times: ["09:00"],
        enabled: true,
        reminderEnabled: true,
      }],
      doseEvents: [{
        id: "dose-orphan",
        medicationId: "missing",
        scheduledAt: "2026-11-22T09:00:00.000Z",
        status: "taken",
      }],
    });

    expect(result.medicationSchedules).toHaveLength(0);
    expect(result.doseEvents).toHaveLength(0);
  });

  it("keeps appointment and lab attachment references", () => {
    const result = normalizePatientHealthData({
      appointments: [{
        id: "appointment-1",
        title: "موعد",
        startsAt: "2026-12-01T09:00:00.000Z",
        attachmentUris: ["file:///appointment.pdf"],
      }],
      labResults: [{
        id: "lab-1",
        testName: "فحص",
        value: "ضمن المجال",
        unit: "",
        resultedAt: "2026-11-22T09:00:00.000Z",
        attachmentUris: ["file:///lab.pdf"],
      }],
    });

    expect(result.appointments[0].attachmentUris).toEqual(["file:///appointment.pdf"]);
    expect(result.labResults[0].attachmentUris).toEqual(["file:///lab.pdf"]);
  });
});
