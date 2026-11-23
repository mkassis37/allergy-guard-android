export type MedicationStatus = "active" | "paused" | "completed";

export type Medication = {
  id: string;
  name: string;
  activeIngredient?: string;
  formulation?: string;
  prescribedDose?: string;
  routeAndInstructions?: string;
  indication?: string;
  prescriber?: string;
  startDate?: string;
  endDate?: string;
  status: MedicationStatus;
  quantityRemaining?: number;
  quantityUnit?: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type MedicationSchedule = {
  id: string;
  medicationId: string;
  times: string[];
  weekdays?: number[];
  startDate: string;
  endDate?: string;
  enabled: boolean;
  timezone: string;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DoseEventStatus =
  | "taken"
  | "skipped"
  | "snoozed"
  | "not-recorded";

export type DoseEvent = {
  id: string;
  medicationId: string;
  scheduleId?: string;
  scheduledAt: string;
  status: DoseEventStatus;
  recordedAt?: string;
  notes?: string;
};

export type ChronicCondition = {
  id: string;
  name: string;
  diagnosedAt?: string;
  clinician?: string;
  status: "active" | "inactive";
  linkedMedicationIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthMeasurement = {
  id: string;
  conditionId?: string;
  type: string;
  value: number | string;
  unit: string;
  measuredAt: string;
  referenceRange?: string;
  source?: string;
  notes?: string;
};

export type MedicalAppointment = {
  id: string;
  type: "doctor" | "lab" | "imaging" | "refill" | "other";
  title: string;
  clinicianOrFacility?: string;
  startsAt: string;
  endsAt?: string;
  reminderMinutes?: number[];
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
  attachmentUris: string[];
  createdAt: string;
  updatedAt: string;
};

export type LabResult = {
  id: string;
  testName: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  laboratory?: string;
  collectedAt?: string;
  resultedAt: string;
  attachmentUris: string[];
  notes?: string;
};

export type PatientHealthData = {
  medications: Medication[];
  medicationSchedules: MedicationSchedule[];
  doseEvents: DoseEvent[];
  conditions: ChronicCondition[];
  measurements: HealthMeasurement[];
  appointments: MedicalAppointment[];
  labResults: LabResult[];
};

export const EMPTY_PATIENT_HEALTH_DATA: PatientHealthData = {
  medications: [],
  medicationSchedules: [],
  doseEvents: [],
  conditions: [],
  measurements: [],
  appointments: [],
  labResults: [],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeList<T>(
  value: unknown,
  normalize: (item: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isObject).map(normalize);
}

function stableId(value: unknown, prefix: string): string {
  return typeof value === "string" && value.length > 0
    ? value
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizePatientHealthData(
  source: Record<string, unknown>,
): PatientHealthData {
  const now = new Date().toISOString();
  const medications = normalizeList(source.medications, (item): Medication => ({
    id: stableId(item.id, "medication"),
    name: stringOr(item.name, "دواء بدون اسم"),
    activeIngredient: stringOr(item.activeIngredient),
    formulation: stringOr(item.formulation),
    prescribedDose: stringOr(item.prescribedDose),
    routeAndInstructions: stringOr(item.routeAndInstructions),
    indication: stringOr(item.indication),
    prescriber: stringOr(item.prescriber),
    startDate: stringOr(item.startDate),
    endDate: stringOr(item.endDate),
    status: item.status === "paused" || item.status === "completed" ? item.status : "active",
    quantityRemaining: typeof item.quantityRemaining === "number" && Number.isFinite(item.quantityRemaining) ? item.quantityRemaining : undefined,
    quantityUnit: stringOr(item.quantityUnit),
    expiryDate: stringOr(item.expiryDate),
    notes: stringOr(item.notes),
    createdAt: stringOr(item.createdAt, now),
    updatedAt: stringOr(item.updatedAt, now),
  }));
  const medicationIds = new Set(medications.map((item) => item.id));
  const medicationSchedules = normalizeList(source.medicationSchedules, (item): MedicationSchedule => ({
    id: stableId(item.id, "schedule"),
    medicationId: stringOr(item.medicationId),
    times: Array.isArray(item.times) ? item.times.filter((v): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)).slice(0, 12) : [],
    weekdays: Array.isArray(item.weekdays) ? item.weekdays.filter((v): v is number => Number.isInteger(v) && v >= 0 && v <= 6) : undefined,
    startDate: stringOr(item.startDate, now.slice(0, 10)),
    endDate: stringOr(item.endDate),
    enabled: item.enabled === true && medicationIds.has(stringOr(item.medicationId)),
    timezone: stringOr(item.timezone, "device-local"),
    reminderEnabled: item.reminderEnabled === true,
    createdAt: stringOr(item.createdAt, now),
    updatedAt: stringOr(item.updatedAt, now),
  })).filter((schedule) => medicationIds.has(schedule.medicationId));
  const conditions = normalizeList(source.conditions, (item): ChronicCondition => ({
    id: stableId(item.id, "condition"),
    name: stringOr(item.name, "حالة بدون اسم"),
    diagnosedAt: stringOr(item.diagnosedAt),
    clinician: stringOr(item.clinician),
    status: item.status === "inactive" ? "inactive" : "active",
    linkedMedicationIds: Array.isArray(item.linkedMedicationIds) ? item.linkedMedicationIds.filter((v): v is string => typeof v === "string" && medicationIds.has(v)) : [],
    notes: stringOr(item.notes),
    createdAt: stringOr(item.createdAt, now),
    updatedAt: stringOr(item.updatedAt, now),
  }));
  const conditionIds = new Set(conditions.map((item) => item.id));
  const measurements = normalizeList(source.measurements, (item): HealthMeasurement => ({
    id: stableId(item.id, "measurement"),
    conditionId: conditionIds.has(stringOr(item.conditionId)) ? stringOr(item.conditionId) : undefined,
    type: stringOr(item.type, "قياس"),
    value: typeof item.value === "number" || typeof item.value === "string" ? item.value : "",
    unit: stringOr(item.unit),
    measuredAt: stringOr(item.measuredAt, now),
    referenceRange: stringOr(item.referenceRange),
    source: stringOr(item.source),
    notes: stringOr(item.notes),
  }));
  const appointments = normalizeList(source.appointments, (item): MedicalAppointment => ({
    id: stableId(item.id, "appointment"),
    type: item.type === "lab" || item.type === "imaging" || item.type === "refill" || item.type === "other" ? item.type : "doctor",
    title: stringOr(item.title, "موعد طبي"),
    clinicianOrFacility: stringOr(item.clinicianOrFacility),
    startsAt: stringOr(item.startsAt, now),
    endsAt: stringOr(item.endsAt),
    reminderMinutes: Array.isArray(item.reminderMinutes) ? item.reminderMinutes.filter((v): v is number => Number.isInteger(v) && v >= 0 && v <= 10080) : [],
    status: item.status === "completed" || item.status === "cancelled" ? item.status : "scheduled",
    notes: stringOr(item.notes),
    attachmentUris: Array.isArray(item.attachmentUris) ? item.attachmentUris.filter((v): v is string => typeof v === "string") : [],
    createdAt: stringOr(item.createdAt, now),
    updatedAt: stringOr(item.updatedAt, now),
  }));
  const labResults = normalizeList(source.labResults, (item): LabResult => ({
    id: stableId(item.id, "lab"),
    testName: stringOr(item.testName, "فحص"),
    value: typeof item.value === "number" || typeof item.value === "string" ? item.value : "",
    unit: stringOr(item.unit),
    referenceRange: stringOr(item.referenceRange),
    laboratory: stringOr(item.laboratory),
    collectedAt: stringOr(item.collectedAt),
    resultedAt: stringOr(item.resultedAt, now),
    attachmentUris: Array.isArray(item.attachmentUris) ? item.attachmentUris.filter((v): v is string => typeof v === "string") : [],
    notes: stringOr(item.notes),
  }));
  const doseEvents = normalizeList(source.doseEvents, (item): DoseEvent => ({
    id: stableId(item.id, "dose"),
    medicationId: stringOr(item.medicationId),
    scheduleId: stringOr(item.scheduleId) || undefined,
    scheduledAt: stringOr(item.scheduledAt, now),
    status: item.status === "taken" || item.status === "skipped" || item.status === "snoozed" ? item.status : "not-recorded",
    recordedAt: stringOr(item.recordedAt) || undefined,
    notes: stringOr(item.notes),
  })).filter((event) => medicationIds.has(event.medicationId));
  return { medications, medicationSchedules, doseEvents, conditions, measurements, appointments, labResults };
}
