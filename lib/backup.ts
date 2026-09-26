import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { AllergyRecord, Profile } from "./allergy-store";
import { validateBackup, type BackupPayload } from "./backup-format";

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvRows = (payload: BackupPayload) => {
  const header = [
    "النوع",
    "الاسم",
    "المادة الفعالة",
    "الاستخدام",
    "الأعراض",
    "الشدة",
    "التاريخ",
  ];
  const rows = payload.records.map((record) => [
    record.kind === "medicine-allergy"
      ? "دواء مسبب للحساسية"
      : record.kind === "food-allergy"
        ? "طعام أو مكوّن"
        : "دواء متحمّل",
    record.name,
    record.activeIngredient,
    record.purpose,
    record.symptoms,
    record.severity,
    record.date,
  ]);
  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n")
  );
};

const safeFilename = (extension: "json" | "csv") =>
  `allergy-guard-backup-${new Date().toISOString().slice(0, 10)}.${extension}`;

export function makeBackupPayload(
  profile: Profile,
  records: AllergyRecord[],
): BackupPayload {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: "allergy-guard",
    profile,
    records,
  };
}

async function shareFile(uri: string, mimeType: string) {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = uri.split("/").pop() ?? "allergy-guard-backup";
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("المشاركة غير متاحة على هذا الجهاز.");
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: "مشاركة نسخة حارس الحساسية",
  });
}

export async function exportBackup(
  profile: Profile,
  records: AllergyRecord[],
  format: "json" | "csv",
) {
  const payload = makeBackupPayload(profile, records);
  const content =
    format === "json" ? JSON.stringify(payload, null, 2) : csvRows(payload);
  const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${safeFilename(format)}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(uri, format === "json" ? "application/json" : "text/csv");
}

export async function importJsonBackup(): Promise<BackupPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return validateBackup(JSON.parse(raw));
}
