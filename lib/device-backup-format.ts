import type { AllergySnapshot } from "./allergy-store";

export type DeviceBackupAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  base64: string;
};

export type DeviceBackupFile = {
  app: "allergy-guard-local-backup";
  schemaVersion: 2;
  exportedAt: string;
  data: AllergySnapshot;
  attachments: DeviceBackupAttachment[];
};

function validateSnapshot(value: unknown): AllergySnapshot {
  if (!value || typeof value !== "object") {
    throw new Error("ملف النسخة الاحتياطية غير صالح.");
  }
  const source = value as Partial<AllergySnapshot>;
  if (!Array.isArray(source.patients)) {
    throw new Error("النسخة الاحتياطية لا تحتوي على قائمة مرضى صالحة.");
  }
  if (source.schemaVersion !== 2 && source.schemaVersion !== 3) {
    throw new Error("إصدار بيانات النسخة غير مدعوم.");
  }
  return {
    schemaVersion: 3,
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
  const source = value as {
    app?: unknown;
    schemaVersion?: unknown;
    exportedAt?: unknown;
    data?: unknown;
    attachments?: unknown;
  };
  if (
    source.app !== "allergy-guard-local-backup" ||
    (source.schemaVersion !== 1 && source.schemaVersion !== 2) ||
    typeof source.exportedAt !== "string"
  ) {
    throw new Error("هذا الملف ليس نسخة حارس الحساسية.");
  }
  if (source.schemaVersion === 2 && !Array.isArray(source.attachments)) {
    throw new Error("النسخة لا تحتوي على قائمة مرفقات صالحة.");
  }
  const attachments =
    source.schemaVersion === 2 ? source.attachments as unknown[] : [];
  if (attachments.length > 200) {
    throw new Error("تحتوي النسخة على عدد مرفقات يتجاوز الحد المسموح.");
  }
  let totalEncodedBytes = 0;
  const normalizedAttachments = attachments.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("بيانات أحد المرفقات غير صالحة.");
    }
    const attachment = item as Partial<DeviceBackupAttachment>;
    if (
      typeof attachment.uri !== "string" ||
      typeof attachment.fileName !== "string" ||
      typeof attachment.mimeType !== "string" ||
      typeof attachment.base64 !== "string" ||
      attachment.base64.length === 0 ||
      attachment.base64.length > 36 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.base64)
    ) {
      throw new Error("تعذر التحقق من أحد المرفقات في النسخة.");
    }
    totalEncodedBytes += attachment.base64.length;
    if (totalEncodedBytes > 84 * 1024 * 1024) {
      throw new Error("حجم المرفقات في النسخة يتجاوز الحد الآمن للاستعادة.");
    }
    return {
      uri: attachment.uri,
      fileName: attachment.fileName.slice(0, 180),
      mimeType: attachment.mimeType.slice(0, 120),
      base64: attachment.base64,
    };
  });
  return {
    app: "allergy-guard-local-backup",
    schemaVersion: 2,
    exportedAt: source.exportedAt,
    data: validateSnapshot(source.data),
    attachments: normalizedAttachments,
  };
}
