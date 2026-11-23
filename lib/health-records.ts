import type { Patient } from "./allergy-store";
import type { PatientHealthData } from "./health-types";

export type HealthTimelineEntry = {
  id: string;
  date: string;
  category: "allergy" | "medication" | "condition" | "measurement" | "appointment" | "lab" | "surgery" | "note";
  title: string;
  detail: string;
};

export function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((current) => current.id === item.id);
  if (index < 0) return [item, ...items];
  return items.map((current, currentIndex) => currentIndex === index ? item : current);
}

export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

function safeDate(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Combines legacy allergy records and structured health data without mutating either source. */
export function buildPatientTimeline(patient: Pick<Patient, "records"> & PatientHealthData): HealthTimelineEntry[] {
  const entries: HealthTimelineEntry[] = [];
  for (const item of patient.records) {
    const category = item.kind === "surgery" ? "surgery" : item.kind === "medical-note" ? "note" : item.kind.includes("allergy") ? "allergy" : "medication";
    entries.push({
      id: `legacy:${item.id}`,
      date: item.eventDate || item.date,
      category,
      title: item.name,
      detail: [item.activeIngredient, item.dosage, item.frequency, item.symptoms, item.notes].filter(Boolean).join(" · "),
    });
  }
  for (const item of patient.medications) entries.push({
    id: `medication:${item.id}`, date: item.startDate || item.createdAt, category: "medication",
    title: item.name, detail: [item.prescribedDose, item.indication, item.status].filter(Boolean).join(" · "),
  });
  for (const item of patient.conditions) entries.push({
    id: `condition:${item.id}`, date: item.diagnosedAt || item.createdAt, category: "condition",
    title: item.name, detail: [item.clinician, item.status, item.notes].filter(Boolean).join(" · "),
  });
  for (const item of patient.measurements) entries.push({
    id: `measurement:${item.id}`, date: item.measuredAt, category: "measurement",
    title: item.type, detail: `${item.value} ${item.unit}`.trim(),
  });
  for (const item of patient.appointments) entries.push({
    id: `appointment:${item.id}`, date: item.startsAt, category: "appointment",
    title: item.title, detail: [item.clinicianOrFacility, item.status, item.notes].filter(Boolean).join(" · "),
  });
  for (const item of patient.labResults) entries.push({
    id: `lab:${item.id}`, date: item.resultedAt, category: "lab",
    title: item.testName, detail: [String(item.value), item.unit, item.referenceRange].filter(Boolean).join(" · "),
  });
  return entries.sort((a, b) => safeDate(b.date) - safeDate(a.date));
}

export function buildEmergencyHealthSummary(patient: Pick<Patient, "records" | "medications" | "conditions">) {
  const legacyAllergies = patient.records.filter((item) =>
    item.kind === "medicine-allergy" || item.kind === "food-allergy" || item.kind === "other-allergy",
  );
  const activeMedications = patient.medications.filter((item) => item.status === "active");
  const activeConditions = patient.conditions.filter((item) => item.status === "active");
  const legacyMedicines = patient.records.filter((item) => item.kind === "medicine");
  return {
    allergies: legacyAllergies.map((item) => ({
      name: item.name, ingredient: item.activeIngredient || "", severity: item.severity || "",
    })),
    medications: [
      ...legacyMedicines.map((item) => ({ name: item.name, dose: item.dosage || "" })),
      ...activeMedications.map((item) => ({ name: item.name, dose: item.prescribedDose || "" })),
    ].filter((item, index, all) => all.findIndex((candidate) =>
      candidate.name.toLocaleLowerCase() === item.name.toLocaleLowerCase() && candidate.dose === item.dose,
    ) === index),
    conditions: activeConditions.map((item) => item.name),
  };
}
