import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { AllergySnapshot } from "./allergy-store";
import {
  validateDeviceBackup,
  type DeviceBackupFile,
} from "./device-backup-format";

const backupFilename = () =>
  `AllergyGuard-Backup-${new Date().toISOString().replace(/[:.]/g, "-")}.agbackup`;

async function shareFile(uri: string) {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = uri.split("/").pop() ?? "AllergyGuard-Backup.agbackup";
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("المشاركة غير متاحة على هذا الجهاز.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/octet-stream",
    dialogTitle: "إرسال نسخة حارس الحساسية",
    UTI: "public.data",
  });
}

export async function shareLocalBackup(snapshot: AllergySnapshot) {
  const payload: DeviceBackupFile = {
    app: "allergy-guard-local-backup",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: snapshot,
  };
  const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${backupFilename()}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(uri);
  return { uri, filename: uri.split("/").pop() ?? backupFilename() };
}

export async function pickLocalBackup(): Promise<DeviceBackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/octet-stream", "application/json", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return validateDeviceBackup(JSON.parse(raw));
}
