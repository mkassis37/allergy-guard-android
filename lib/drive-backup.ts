import { isEncryptedBackup } from "./backup-crypto";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const BACKUP_FOLDER_NAME = "Allergy & Health Tracker Backups";

type DriveFile = { id: string; name: string; webViewLink?: string };

async function driveRequest<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("انتهت صلاحية ربط Google Drive أو لا تسمح الصلاحيات بالرفع. أعد ربط الحساب.");
    }
    throw new Error(`تعذر إكمال عملية النسخ إلى Google Drive (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

async function findOrCreateBackupFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const found = await driveRequest<{ files?: DriveFile[] }>(
    `${DRIVE_API}/files?q=${query}&spaces=drive&fields=files(id,name)&pageSize=10`,
    accessToken,
  );
  if (found.files?.[0]?.id) return found.files[0].id;

  const folder = await driveRequest<DriveFile>(
    `${DRIVE_API}/files?fields=id,name`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    },
  );
  return folder.id;
}

/**
 * Uploads an already-encrypted .agbackup payload.
 * The access token must be obtained from an explicit user-approved Google OAuth flow
 * with the narrow drive.file scope. This function never receives plaintext medical data.
 */
export async function uploadEncryptedBackupToDrive(
  accessToken: string,
  filename: string,
  encryptedBackup: string,
): Promise<DriveFile> {
  if (!accessToken.trim()) throw new Error("حساب Google Drive غير مربوط.");
  let envelope: unknown;
  try {
    envelope = JSON.parse(encryptedBackup);
  } catch {
    throw new Error("ملف النسخة المشفرة غير صالح للرفع.");
  }
  if (!filename.endsWith(".agbackup") || !isEncryptedBackup(envelope)) {
    throw new Error("لن يتم رفع ملف غير مشفر أو غير متوافق مع صيغة النسخ الاحتياطي.");
  }

  const folderId = await findOrCreateBackupFolder(accessToken);
  const boundary = `allergy_guard_${Date.now()}_boundary`;
  const metadata = JSON.stringify({
    name: filename,
    mimeType: "application/octet-stream",
    parents: [folderId],
  });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n${encryptedBackup}\r\n` +
    `--${boundary}--`;

  return driveRequest<DriveFile>(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}
