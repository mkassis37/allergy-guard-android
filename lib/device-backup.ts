import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { AllergySnapshot } from "./allergy-store";
import {
  validateDeviceBackup,
  type DeviceBackupAttachment,
  type DeviceBackupFile,
} from "./device-backup-format";
import {
  decryptJsonPayload,
  encryptJsonPayload,
  isEncryptedBackup,
} from "./backup-crypto";
import { decryptForDevice, encryptForDevice } from "./secure-local-storage";

const backupFilename = () =>
  `AllergyGuard-Backup-${new Date().toISOString().replace(/[:.]/g, "-")}.agbackup`;
const ATTACHMENT_DIRECTORY = "medical-attachments/";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 60 * 1024 * 1024;

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
    dialogTitle: "إرسال نسخة Allergy & Health Tracker المشفرة",
    UTI: "public.data",
  });
}

function fileNameFromUri(uri: string) {
  const last = uri.split("/").pop() || "medical-file";
  try {
    return decodeURIComponent(last).slice(-180);
  } catch {
    return last.slice(-180);
  }
}

function mimeTypeFromName(name: string) {
  const extension = name.split(".").pop()?.toLocaleLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (["jpg", "jpeg"].includes(extension ?? "")) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "application/octet-stream";
}

async function collectAttachments(snapshot: AllergySnapshot) {
  const uris = [
    ...new Set(
      snapshot.patients.flatMap((patient) =>
        patient.records.flatMap((record) => record.attachmentUris ?? []),
      ),
    ),
  ];
  const attachments: DeviceBackupAttachment[] = [];
  let totalBytes = 0;
  for (const uri of uris) {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    if (!info.exists || !("size" in info) || typeof info.size !== "number") {
      throw new Error(
        `تعذر العثور على المرفق «${fileNameFromUri(uri)}». افتح السجل وأعد إرفاق الملف قبل النسخ الاحتياطي.`,
      );
    }
    if (info.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `حجم المرفق «${fileNameFromUri(uri)}» يتجاوز 25 ميغابايت؛ لا يمكن تضمينه في النسخة.`,
      );
    }
    totalBytes += info.size;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error("إجمالي المرفقات يتجاوز 60 ميغابايت. أنشئ نسخًا أصغر على دفعات.");
    }
    let fileName = fileNameFromUri(uri);
    let mimeType = mimeTypeFromName(fileName);
    let base64: string;
    if (uri.endsWith(".agenc")) {
      const encryptedFile = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const payload = await decryptForDevice<{
        fileName: string;
        mimeType: string;
        base64: string;
      }>(encryptedFile);
      fileName = payload.fileName;
      mimeType = payload.mimeType;
      base64 = payload.base64;
    } else {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    attachments.push({ uri, fileName, mimeType, base64 });
  }
  return attachments;
}

export async function shareLocalBackup(
  snapshot: AllergySnapshot,
  password: string,
) {
  if (password.trim().length < 8) {
    throw new Error("استخدم كلمة مرور من 8 أحرف على الأقل.");
  }
  const payload: DeviceBackupFile = {
    app: "allergy-guard-local-backup",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    data: snapshot,
    attachments: await collectAttachments(snapshot),
  };
  const encrypted = await encryptJsonPayload(payload, password);
  const filename = backupFilename();
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDirectory) throw new Error("مساحة حفظ النسخة غير متاحة.");
  const uri = `${baseDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, encrypted, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(uri);
  return { uri, filename, attachmentCount: payload.attachments.length };
}

export type PickedDeviceBackup = {
  backup: DeviceBackupFile;
  encrypted: boolean;
};

export async function pickLocalBackup(
  password: string,
): Promise<PickedDeviceBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/octet-stream", "application/json", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("الملف ليس نسخة احتياطية صالحة.");
  }
  if (isEncryptedBackup(parsed)) {
    const decrypted = await decryptJsonPayload(raw, password);
    return { backup: validateDeviceBackup(decrypted), encrypted: true };
  }
  // Backward compatibility for older unencrypted .agbackup files.
  return { backup: validateDeviceBackup(parsed), encrypted: false };
}

export async function restoreLocalBackupAttachments(
  backup: DeviceBackupFile,
): Promise<AllergySnapshot> {
  const directory = FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}${ATTACHMENT_DIRECTORY}`
    : null;
  if (!directory && backup.attachments.length) {
    throw new Error("تعذر تحديد مجلد حفظ المرفقات على هذا الجهاز.");
  }
  if (directory) {
    const info = await FileSystem.getInfoAsync(directory);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
  }

  const restoredUris = new Map<string, string>();
  for (const [index, attachment] of backup.attachments.entries()) {
    const safeName = attachment.fileName
      .replace(/[^\w.\-\u0600-\u06FF]/g, "_")
      .slice(-100);
    const encrypted = await encryptForDevice({
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      base64: attachment.base64,
    });
    const destination = `${directory}${Date.now()}-${index}-${safeName}.agenc`;
    await FileSystem.writeAsStringAsync(destination, encrypted, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    restoredUris.set(attachment.uri, destination);
  }

  const patients = await Promise.all(
    backup.data.patients.map(async (patient) => ({
      ...patient,
      records: await Promise.all(
        patient.records.map(async (record) => {
          const uris: string[] = [];
          let missing = 0;
          for (const uri of record.attachmentUris ?? []) {
            const mapped = restoredUris.get(uri);
            if (mapped) {
              uris.push(mapped);
              continue;
            }
            try {
              const info = await FileSystem.getInfoAsync(uri);
              if (info.exists) uris.push(uri);
              else missing += 1;
            } catch {
              missing += 1;
            }
          }
          const notes = missing
            ? [record.notes, `ملاحظة استعادة: تعذر استعادة ${missing} مرفق(ات) لأن النسخة القديمة لا تحتوي على الملفات نفسها.`]
                .filter(Boolean)
                .join("\n")
            : record.notes;
          return { ...record, attachmentUris: uris, notes };
        }),
      ),
    })),
  );

  return { ...backup.data, patients };
}
