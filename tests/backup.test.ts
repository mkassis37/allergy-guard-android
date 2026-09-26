import { describe, expect, it } from "vitest";
import { validateBackup } from "../lib/backup-format";

describe("backup validation", () => {
  it("accepts a version 1 allergy guard backup", () => {
    const backup = validateBackup({
      app: "allergy-guard",
      schemaVersion: 1,
      profile: {
        fullName: "أحمد",
        birthDate: "",
        phone: "",
        emergencyContact: "",
        doctor: "",
      },
      records: [
        {
          id: "1",
          kind: "medicine-allergy",
          name: "دواء",
          date: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(backup.records).toHaveLength(1);
    expect(backup.profile.fullName).toBe("أحمد");
  });

  it("rejects files from another app or schema", () => {
    expect(() =>
      validateBackup({ app: "other-app", schemaVersion: 1, records: [] }),
    ).toThrow("هذا الملف ليس نسخة احتياطية صالحة");
    expect(() =>
      validateBackup({ app: "allergy-guard", schemaVersion: 2, records: [] }),
    ).toThrow();
  });

  it("rejects malformed records", () => {
    expect(() =>
      validateBackup({
        app: "allergy-guard",
        schemaVersion: 1,
        records: [{ name: "بدون معرف" }],
      }),
    ).toThrow();
  });
});
