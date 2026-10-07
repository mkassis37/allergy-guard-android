import type { AllergySnapshot } from "./allergy-store";

export const AUTO_BACKUP_STORAGE_KEY = "allergy-guard-auto-backup-v1";
export const AUTO_BACKUP_INTERVAL_MS = 15 * 60 * 1000;

export type AutoBackupFile = {
  app: "allergy-guard-auto-backup";
  schemaVersion: 1;
  savedAt: string;
  data: AllergySnapshot;
};

export function createAutoBackupFile(
  snapshot: AllergySnapshot,
  savedAt = new Date().toISOString(),
): AutoBackupFile {
  return {
    app: "allergy-guard-auto-backup",
    schemaVersion: 1,
    savedAt,
    data: snapshot,
  };
}
