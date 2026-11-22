import { describe, expect, it } from "vitest";
import { uploadEncryptedBackupToDrive } from "../lib/drive-backup";

describe("Google Drive backup safety", () => {
  it("rejects missing authorization before making a network request", async () => {
    await expect(
      uploadEncryptedBackupToDrive("", "backup.agbackup", "{}"),
    ).rejects.toThrow("غير مربوط");
  });

  it("rejects plaintext payloads before making a network request", async () => {
    await expect(
      uploadEncryptedBackupToDrive("test-token", "backup.agbackup", "{\"patients\":[]}"),
    ).rejects.toThrow("لن يتم رفع ملف غير مشفر");
  });

  it("rejects unexpected file extensions", async () => {
    const envelope = JSON.stringify({
      app: "allergy-guard-encrypted-backup",
      schemaVersion: 1,
      algorithm: "XSalsa20-Poly1305",
      kdf: "PBKDF2-SHA256",
      iterations: 210000,
      salt: "c2FsdA==",
      nonce: "bm9uY2U=",
      ciphertext: "Y2lwaGVydGV4dA==",
    });
    await expect(
      uploadEncryptedBackupToDrive("test-token", "backup.json", envelope),
    ).rejects.toThrow("غير مشفر أو غير متوافق");
  });
});
