import type { AllergySnapshot } from "./allergy-store";

export type DeviceBackupFile = {
  app: "allergy-guard-local-backup";
  schemaVersion: 1;
  exportedAt: string;
  data: AllergySnapshot;
};

function validateSnapshot(value: unknown): AllergySnapshot {
  if (!value || typeof value !== "object") {
    throw new Error("ملف النسخة الاحتياطية غير صالح.");
  }
  const source = value as Partial<AllergySnapshot>;
  if (!Array.isArray(source.patients)) {
    throw new Error("النسخة الاحتياطية لا تحتوي على قائمة مرضى صالحة.");
  }
  return {
    schemaVersion: 2,
    patients: source.patients,
    activePatientId:
      typeof source.activePatientId === "string"
        ? source.activePatientId
        : null,
  };
}

export function validateDeviceBackup(value: unknown): DeviceBackupFile {
  if (!value || typeof value !== "object") {
    throw new Error("ملف النسخة الاحتياطية غير صالح.");
  }
  const source = value as Partial<DeviceBackupFile>;
  if (
    source.app !== "allergy-guard-local-backup" ||
    source.schemaVersion !== 1 ||
    typeof source.exportedAt !== "string"
  ) {
    throw new Error("هذا الملف ليس نسخة حارس الحساسية.");
  }
  return {
    app: "allergy-guard-local-backup",
    schemaVersion: 1,
    exportedAt: source.exportedAt,
    data: validateSnapshot(source.data),
  };
}
