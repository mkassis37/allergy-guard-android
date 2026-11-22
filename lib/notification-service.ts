import * as Notifications from "expo-notifications";
import type { Patient } from "./allergy-store";

const MAX_PENDING_HEALTH_NOTIFICATIONS = 180;
const MEDICATION_HORIZON_DAYS = 14;

export async function requestHealthNotificationPermission(): Promise<boolean> {
  if (process.env.EXPO_OS === "android") {
    await Notifications.setNotificationChannelAsync("health-reminders", {
      name: "التذكيرات الصحية",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: "#087E8B",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLocalDate(date: Date, time: string): Date | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const result = new Date(date);
  result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return result;
}

export async function syncPatientHealthNotifications(patient: Patient): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existing) {
    const data = notification.content.data as Record<string, unknown> | undefined;
    if (
      data?.patientId === patient.id &&
      (data.kind === "medication" || data.kind === "appointment")
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  let scheduledCount = 0;
  const now = new Date();

  for (const schedule of patient.medicationSchedules) {
    if (!schedule.enabled || !schedule.reminderEnabled) continue;
    const medication = patient.medications.find((item) => item.id === schedule.medicationId);
    if (!medication || medication.status !== "active") continue;

    const start = schedule.startDate || localDateKey(now);
    const end = schedule.endDate || medication.endDate || "";
    for (let offset = 0; offset < MEDICATION_HORIZON_DAYS; offset += 1) {
      if (scheduledCount >= MAX_PENDING_HEALTH_NOTIFICATIONS) break;
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const dayKey = localDateKey(day);
      if (dayKey < start || (end && dayKey > end)) continue;
      if (schedule.weekdays?.length && !schedule.weekdays.includes(day.getDay())) continue;

      for (const time of schedule.times) {
        if (scheduledCount >= MAX_PENDING_HEALTH_NOTIFICATIONS) break;
        const triggerDate = buildLocalDate(day, time);
        if (!triggerDate || triggerDate <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "تذكير صحي",
            body: "حان وقت التذكير الذي سجلته في التطبيق.",
            data: { kind: "medication", patientId: patient.id, medicationId: medication.id, scheduleId: schedule.id },
            sound: "default",
          },
          trigger: triggerDate,
        });
        scheduledCount += 1;
      }
    }
  }

  for (const appointment of patient.appointments) {
    if (scheduledCount >= MAX_PENDING_HEALTH_NOTIFICATIONS) break;
    if (appointment.status !== "scheduled") continue;
    for (const minutes of appointment.reminderMinutes) {
      if (scheduledCount >= MAX_PENDING_HEALTH_NOTIFICATIONS) break;
      const triggerDate = new Date(new Date(appointment.startsAt).getTime() - minutes * 60_000);
      if (Number.isNaN(triggerDate.getTime()) || triggerDate <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "تذكير بموعد طبي",
          body: "لديك موعد مسجل في التطبيق.",
          data: { kind: "appointment", patientId: patient.id, appointmentId: appointment.id },
          sound: "default",
        },
        trigger: triggerDate,
      });
      scheduledCount += 1;
    }
  }
}
