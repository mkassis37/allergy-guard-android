# Allergy & Health Tracker — Technical Modernization Plan

**Target branch:** `feature/health-tracker-modernization`  
**Baseline:** `main` at `26fd3dd623d3831c52942aabbd171b699d54207d`  
**Product scope:** Family profiles · Premium Arabic-first UI · Medication and appointment reminders · Chronic-condition tracking · Lab results · Daily Google Drive backup

## 1. Non-negotiable data-safety rules

1. Never modify or delete existing patient records as part of a feature migration.
2. Preserve patient IDs, record IDs, original dates, attachment references, and the currently selected patient.
3. Do not silently infer a medication schedule from legacy free-text dosage/frequency fields.
4. Keep legacy backup readers working. New backups must be readable by the new app, and old schema v1/v2 backups must remain importable.
5. Do not remove legacy storage keys until the new encrypted snapshot has been written, read back, validated, and a recovery copy is safely retained.
6. Never replace or regenerate the existing SecureStore encryption key during a schema migration.
7. Keep all medical data local and encrypted by default. Cloud backup is opt-in, encrypted before upload, and must not upload plaintext medical records or attachments.
8. No diagnostic, prescribing, dose-calculation, or medication-change behavior.

## 2. Verified baseline observations

- Expo SDK 54, React Native 0.81, Expo Router 6, TypeScript 5.9.
- Local persistence is implemented in `lib/allergy-store.tsx` using encrypted JSON storage through `secure-local-storage.ts`.
- The persisted storage key is named `allergy-guard-data-v3-encrypted`, while the snapshot type and payload currently declare `schemaVersion: 2`. The key suffix is therefore not a reliable schema-version indicator.
- Current snapshot shape: `{ schemaVersion: 2, patients, activePatientId }`.
- Each patient has a profile and one `records` array. Records are normalized through a fixed field list; newly introduced fields must be explicitly added to normalization or they can be lost during load/restore.
- Medication and chronic-condition entries are currently record kinds, not independent entities with schedules or measurement histories.
- The current local automatic backup is an encrypted snapshot stored under `allergy-guard-auto-backup-v1`. It is refreshed after persisted state changes and by a 15-minute interval while the provider is mounted. It is not a cloud upload and does not prove that a background task runs when the app is closed.
- Manual device backups use an encrypted `.agbackup` envelope with attachment payloads and currently accept device backup schema versions 1 and 2.
- Android config disables Android Auto Backup and uses SecureStore. Do not change these protections without a tested replacement.
- `expo-notifications` is already installed, but package presence is not proof that medication/appointment notification scheduling is implemented.
- Existing CI runs tests, TypeScript checking, Expo config validation, Android prebuild, and release APK/AAB builds.

## 3. Target domain model (schema v3 proposal)

Keep legacy `Patient.records` intact. Add optional collections to each patient so older data can be upgraded by additive defaults:

- `medications[]`: stable ID, display name, active ingredient, formulation, prescribed dose text, route/instructions, indication, prescriber, start/end dates, status, inventory metadata, created/updated timestamps.
- `medicationSchedules[]`: stable ID, medication ID, local clock times, weekdays or schedule pattern, start/end dates, enabled flag, timezone policy, notification preferences.
- `doseEvents[]`: stable ID, medication ID, schedule ID, scheduled local date/time, event status (taken/skipped/snoozed/not-recorded), actual recorded time, notes. This is a user log, not proof of ingestion.
- `conditions[]`: stable ID, name, diagnosis date (optional), clinician, notes, status, linked medication IDs.
- `measurements[]`: stable ID, optional condition ID, type, numeric or text value, unit, measured timestamp, reference range exactly as supplied by the lab/clinician, source and notes.
- `appointments[]`: stable ID, type, title, clinician/facility, start/end, reminder preferences, status, notes, attachment references.
- `labResults[]`: stable ID, test name, value, unit, reference range, lab, collection/result dates, attachment references and notes.

All IDs must be generated once and retained. All date/time values must distinguish an absolute timestamp from a local wall-clock schedule. Never compare numeric lab results across incompatible units.

## 4. Migration protocol

Implement a pure, versioned migration module with explicit input/output types:

- v1/v2 snapshots are accepted without mutation of their original record payloads.
- v2 -> v3 adds empty collections and preserves the entire original patient and record objects.
- Validate uniqueness of patient/entity IDs and all foreign-key references before commit.
- Create a pre-migration encrypted recovery snapshot.
- Write the v3 encrypted snapshot to a new versioned storage key; read it back and validate it.
- Only then update the active schema pointer/state. Keep the v2 key and recovery snapshot until a later successful launch and backup cycle.
- On any error, keep the old snapshot readable and show a recovery-safe error. Never clear legacy data in a catch/finally path.
- Add round-trip tests for v1, v2, v3, malformed data, duplicate IDs, orphan references, and attachment URI preservation.

Backup format versioning must be handled separately from the in-app snapshot version. Device backup v1/v2 readers remain; the new writer emits a new format version only after round-trip compatibility tests pass.

## 5. Google Drive backup design

The phrase “phone's Drive” is treated as Google Drive, subject to confirmation in product setup. A Google Drive folder is a cloud account destination, not a normal local Android folder.

- Add an explicit Connect Google Drive action using Google's supported OAuth flow and the narrowest viable Drive scope (prefer app-data storage if users do not need to browse the backup file; use a user-visible app folder only if required).
- Do not embed client secrets in the APK. Use a public-client OAuth configuration and secure token storage; refresh/revoke safely.
- Encrypt the complete backup locally before upload with a user-held backup passphrase/key. Never upload plaintext medical records, filenames, or attachment content.
- Store only the minimum metadata needed to identify the latest encrypted backup.
- Daily target: 07:00 device-local time. Android background execution is inexact under Doze/battery restrictions; schedule a one-time daily task and reconcile it on app launch, timezone change, and reboot where supported. Display “scheduled for 07:00; runs when Android permits” rather than promising exact execution.
- Use resumable upload for large backup files, bounded retries with exponential backoff, network constraints, and no busy polling.
- Show last successful backup time, next scheduled target, last error, account status, and a manual “Back up now” action.
- Keep the previous valid cloud backup until a new upload is complete and verified. Never delete the only known-good backup.
- Cloud backup is opt-in and can be disconnected; disconnect must revoke/remove local tokens without deleting local medical data.
- Acceptance tests: token expiry, offline mode, upload interruption, duplicate retry, large attachment, corrupted ciphertext, wrong passphrase, revoked access, and restore on a second device.

**Platform limitation:** Expo background tasks are opportunistic, not an exact alarm guarantee. If an exact 07:00 alarm is essential, evaluate a small native Android WorkManager/AlarmManager integration and its permission/power implications before choosing it. Do not claim zero battery impact or exact execution.

## 6. Notification and battery requirements

- Schedule local notifications only for enabled medication schedules and appointments.
- Reconcile scheduled notifications from persisted data; do not create duplicates on every render or app launch.
- Cancel obsolete notifications when a schedule or appointment changes.
- Respect Android notification permission and channel settings.
- Use bounded scheduling windows for long-running recurring schedules and replenish them when the app opens or a task runs.
- Do not run continuous location, network polling, foreground services, or frequent timers.
- Use OS-managed background work with network constraints for Drive uploads.
- Provide per-profile notification controls and privacy-safe lock-screen text.
- Test battery use with Android battery tools on physical devices; source review alone cannot prove zero battery impact.

## 7. Security review checklist

- Threat model: device loss, unauthorized local access, malicious/modified backup, token theft, unintended family-profile disclosure, log leakage, and compromised dependency/build pipeline.
- Preserve XSalsa20-Poly1305 authenticated local encryption and SecureStore key handling unless a reviewed migration is required.
- Validate every imported field, collection size, attachment size/type, URI, ID, and reference.
- Keep medical data out of console logs, analytics, crash reports, notification text by default, and GitHub artifacts.
- Enforce least-privilege OAuth scopes; no Google client secret or long-lived access token in source code.
- Audit deep links, exported Android components, cleartext traffic, Android backup flags, dependency vulnerabilities, and release signing.
- Add automated dependency/security checks and a manual release checklist.
- Do not describe the app as “vulnerability-free”; report the checks performed and residual risks.

## 8. UI information architecture

Bottom navigation target:
1. Home — active family member, today's reminders, next appointment, concise health summary, emergency shortcut.
2. Medications — active/paused/completed medicines, schedules, dose log, inventory and expiry.
3. Health — conditions, measurements, lab results and trends.
4. Appointments — calendar/list, clinician visits and test reminders.
5. More — family profiles, legacy records, emergency card, reports, backup, settings and about.

Use a consistent Arabic RTL design system, accessible contrast and touch targets, restrained status colors, clear empty states, and progressive disclosure. Do not bury emergency information.

## 9. Product attribution

Show in Settings > About and a discreet app information area:

**“فكرة وإعداد ميناس، بمساعدة ChatGPT.”**

This is product credit only; it must not imply clinical endorsement or responsibility for medical decisions.

## 10. Delivery gates

A feature is not ready to merge until:
- migration and backup round-trip tests pass;
- `pnpm test`, `pnpm check`, and `pnpm lint` pass;
- Expo config and Android prebuild pass;
- APK and AAB build successfully;
- signing continuity is verified before distributing an update over an installed release;
- notification, background upload, battery, restore, and privacy behavior are exercised on a physical Android device;
- the PR documents test results and known limitations.

No direct commits to `main`; merge only reviewed, green pull requests.

## 11. Current implementation status (2026-11-22)

Implemented on the feature branch:
- Additive patient schema v3 and normalization defaults for seven new collections.
- Encrypted pre-v3 recovery snapshot before upgrading existing encrypted or legacy plaintext snapshots.
- Device-backup validation upgrades embedded schema v2 snapshots to schema v3 while retaining the version-2 encrypted backup envelope.
- Medication, health tracking, appointment and consolidated More screens.
- Five-tab navigation: Home, Medications, Health, Appointments, More; legacy records, patients, emergency and settings routes remain reachable from More.
- Local notification reconciliation for enabled medication schedules and appointment reminders. The implementation uses generic lock-screen text and a capped rolling 14-day medication schedule window (maximum 180 pending health reminders across family profiles). It resynchronizes when the app loads or patient data changes. It does not guarantee exact delivery or background replenishment while the app is never opened.
- Device backup attachment collection/restoration includes legacy record attachments plus appointment and lab-result attachments.

Still pending:
- Google Drive OAuth connection and upload. A Google Cloud OAuth client ID and selected Drive storage scope must be configured before account linking can be completed. No credentials should be committed to source.
- Daily cloud upload scheduling at/after 07:00, retry/status UI, and encrypted cloud restore.
- Full charts, richer medical reports, and physical-device battery/security verification.
- Final Android build and full CI verification for the latest head commit.
