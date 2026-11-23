import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";
import type { Medication, MedicationSchedule } from "@/lib/health-types";
import { requestHealthNotificationPermission } from "@/lib/notification-service";

const C = {
  navy: "#173B6C",
  teal: "#087E8B",
  muted: "#66758A",
  bg: "#F5F8FC",
  card: "#FFFFFF",
  line: "#E1E7F0",
  soft: "#EAF5F6",
  amber: "#FFF5E7",
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MedicationsScreen() {
  const { activePatient, updateActiveHealthData } = useAllergy();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [dose, setDose] = useState("");
  const [instructions, setInstructions] = useState("");
  const [firstTime, setFirstTime] = useState("");
  const [saving, setSaving] = useState(false);

  const medications = activePatient?.medications ?? [];
  const schedules = activePatient?.medicationSchedules ?? [];
  const doseEvents = activePatient?.doseEvents ?? [];
  const activeCount = useMemo(
    () => medications.filter((item) => item.status === "active").length,
    [medications],
  );

  const resetForm = () => {
    setName("");
    setIngredient("");
    setDose("");
    setInstructions("");
    setFirstTime("");
  };

  const addMedication = () => {
    if (saving) return;
    if (!name.trim()) {
      Alert.alert("اسم الدواء مطلوب", "أدخل اسم الدواء كما هو مكتوب على العبوة أو الوصفة.");
      return;
    }
    const times = firstTime.split(",").map((item) => item.trim()).filter(Boolean);
    if (times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
      Alert.alert("صيغة الوقت غير صحيحة", "اكتب الأوقات بصيغة 24 ساعة وافصل بينها بفاصلة، مثل 08:00, 20:00.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const medication: Medication = {
        id: newId("medication"),
        name: name.trim(),
        activeIngredient: ingredient.trim(),
        prescribedDose: dose.trim(),
        routeAndInstructions: instructions.trim(),
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      const nextSchedules: MedicationSchedule[] = times.length
        ? [{
            id: newId("schedule"),
            medicationId: medication.id,
            times,
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            startDate: now.slice(0, 10),
            enabled: true,
            timezone: "device-local",
            reminderEnabled: false,
            createdAt: now,
            updatedAt: now,
          }]
        : [];
      updateActiveHealthData({
        medications: [medication, ...medications],
        medicationSchedules: [...schedules, ...nextSchedules],
      });
      resetForm();
      setModalVisible(false);
      Alert.alert("تمت الإضافة", "تم حفظ الدواء. راجع الوصفة الطبية قبل إدخال أو تعديل أي جدول جرعات.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (medication: Medication) => {
    const nextStatus = medication.status === "active" ? "paused" : "active";
    const now = new Date().toISOString();
    updateActiveHealthData({
      medications: medications.map((item) =>
        item.id === medication.id
          ? { ...item, status: nextStatus, updatedAt: now }
          : item,
      ),
      medicationSchedules: schedules.map((schedule) =>
        schedule.medicationId === medication.id
          ? { ...schedule, enabled: nextStatus === "active", updatedAt: now }
          : schedule,
      ),
    });
  };

  const toggleReminder = async (schedule: MedicationSchedule) => {
    const next = !schedule.reminderEnabled;
    if (next) {
      const granted = await requestHealthNotificationPermission();
      if (!granted) {
        Alert.alert("الإشعارات غير مفعّلة", "يمكنك السماح بإشعارات التطبيق من إعدادات الهاتف.");
        return;
      }
    }
    updateActiveHealthData({
      medicationSchedules: schedules.map((item) =>
        item.id === schedule.id
          ? { ...item, reminderEnabled: next, updatedAt: new Date().toISOString() }
          : item,
      ),
    });
  };

  const recordTaken = (medication: Medication) => {
    const now = new Date().toISOString();
    updateActiveHealthData({
      doseEvents: [{
        id: newId("dose"),
        medicationId: medication.id,
        scheduledAt: now,
        status: "taken",
        recordedAt: now,
      }, ...doseEvents],
    });
    Alert.alert("تم تسجيل الحدث", "سُجلت الجرعة على أنها تم تناولها حسب إدخالك.");
  };

  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
      style={{ backgroundColor: C.bg }}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>ملف العائلة الصحي</Text>
        <Text style={styles.title}>الأدوية</Text>
        <Text style={styles.subtitle}>
          {activePatient?.fullName ? `ملف: ${activePatient.fullName}` : "اختر ملف المريض لإدارة أدويته"}
        </Text>

        <View style={styles.summary}>
          <View style={styles.summaryIcon}><Text style={styles.summaryIconText}>+</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{activeCount} دواء نشط</Text>
            <Text style={styles.summaryText}>تُحفظ الأدوية لكل فرد بصورة مستقلة</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Text style={styles.addButtonText}>＋ إضافة دواء</Text>
        </Pressable>

        {medications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>لا توجد أدوية مسجلة</Text>
            <Text style={styles.emptyText}>أضف الأدوية الموصوفة لهذا الملف للاحتفاظ بمعلوماتها ومتابعتها.</Text>
          </View>
        ) : medications.map((medication) => {
          const medicationSchedules = schedules.filter((item) => item.medicationId === medication.id);
          const lastEvents = doseEvents.filter((item) => item.medicationId === medication.id).slice(0, 3);
          return (
            <View key={medication.id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={[styles.status, medication.status === "active" ? styles.statusActive : styles.statusPaused]}>
                  <Text style={styles.statusText}>{medication.status === "active" ? "نشط" : medication.status === "paused" ? "متوقف مؤقتًا" : "مكتمل"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{medication.name}</Text>
                  {!!medication.activeIngredient && <Text style={styles.medSub}>{medication.activeIngredient}</Text>}
                </View>
              </View>
              {!!medication.prescribedDose && <Text style={styles.detail}>الجرعة الموصوفة: {medication.prescribedDose}</Text>}
              {!!medication.routeAndInstructions && <Text style={styles.detail}>{medication.routeAndInstructions}</Text>}
              {medicationSchedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleRow}>
                  <Text style={styles.schedule}>وقت مسجل: {schedule.times.join("، ")}</Text>
                  <Pressable onPress={() => void toggleReminder(schedule)} style={styles.reminderButton}>
                    <Text style={styles.reminderButtonText}>{schedule.reminderEnabled ? "إيقاف التذكير" : "تفعيل التذكير"}</Text>
                  </Pressable>
                </View>
              ))}
              {lastEvents.length > 0 && (
                <Text style={styles.detail}>آخر تسجيل: {lastEvents[0].status === "taken" ? "تم التناول" : lastEvents[0].status === "skipped" ? "تم التخطي" : "غير مسجل"} · {new Date(lastEvents[0].recordedAt ?? lastEvents[0].scheduledAt).toLocaleString("ar-JO")}</Text>
              )}
              <View style={styles.actions}>
                <Pressable onPress={() => recordTaken(medication)} style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>تسجيل تم التناول</Text>
                </Pressable>
                <Pressable onPress={() => toggleStatus(medication)} style={styles.tertiaryAction}>
                  <Text style={styles.tertiaryActionText}>{medication.status === "active" ? "إيقاف مؤقت" : "إعادة التفعيل"}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>ملاحظة طبية</Text>
          <Text style={styles.noticeText}>أدخل الجرعة ومواعيدها وفق وصفة الطبيب فقط. تسجيل الجرعة هنا هو سجل يدخله المستخدم، ولا يثبت تناول الدواء فعليًا. التنبيهات الدوائية ستُفعّل بعد استكمال خدمة الإشعارات واختبارها على Android.</Text>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>إضافة دواء</Text>
            <TextInput value={name} onChangeText={setName} placeholder="اسم الدواء *" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
            <TextInput value={ingredient} onChangeText={setIngredient} placeholder="المادة الفعالة (اختياري)" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
            <TextInput value={dose} onChangeText={setDose} placeholder="الجرعة كما وردت في الوصفة" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
            <TextInput value={instructions} onChangeText={setInstructions} placeholder="تعليمات الطبيب" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
            <TextInput value={firstTime} onChangeText={setFirstTime} placeholder="أوقات الجرعات (مثال 08:00, 20:00) — اختياري" placeholderTextColor={C.muted} style={styles.input} textAlign="right" />
            <Text style={styles.helper}>إدخال وقت هنا يحفظ جدولًا مبدئيًا فقط؛ لا يفعّل إشعارًا ولا يحدد جرعة طبية.</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => { resetForm(); setModalVisible(false); }} style={styles.cancelButton}><Text style={styles.cancelText}>إلغاء</Text></Pressable>
              <Pressable disabled={saving} onPress={addMedication} style={styles.saveButton}><Text style={styles.saveText}>حفظ الدواء</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 30 },
  kicker: { color: C.teal, fontSize: 13, fontWeight: "800", textAlign: "right" },
  title: { color: C.navy, fontSize: 30, fontWeight: "900", textAlign: "right" },
  subtitle: { color: C.muted, fontSize: 13, textAlign: "right", marginTop: 4, marginBottom: 16 },
  summary: { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 15, marginBottom: 12 },
  summaryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },
  summaryIconText: { color: C.teal, fontSize: 25, fontWeight: "900" },
  summaryTitle: { color: C.navy, fontSize: 17, fontWeight: "900", textAlign: "right" },
  summaryText: { color: C.muted, fontSize: 12, textAlign: "right", marginTop: 3 },
  addButton: { minHeight: 50, borderRadius: 14, backgroundColor: C.navy, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  addButtonText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  empty: { backgroundColor: C.card, borderRadius: 18, padding: 22, alignItems: "center", borderWidth: 1, borderColor: C.line },
  emptyTitle: { color: C.navy, fontSize: 17, fontWeight: "900" },
  emptyText: { color: C.muted, fontSize: 13, textAlign: "center", lineHeight: 21, marginTop: 7 },
  medCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 15, marginBottom: 12 },
  medHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 9 },
  medName: { color: C.navy, fontSize: 17, fontWeight: "900", textAlign: "right" },
  medSub: { color: C.muted, fontSize: 12, textAlign: "right", marginTop: 3 },
  status: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusActive: { backgroundColor: C.soft },
  statusPaused: { backgroundColor: C.amber },
  statusText: { color: C.navy, fontSize: 11, fontWeight: "800" },
  detail: { color: C.muted, fontSize: 12, textAlign: "right", lineHeight: 19, marginTop: 5 },
  schedule: { color: C.teal, fontSize: 12, textAlign: "right", marginTop: 7, fontWeight: "700", flex: 1 },
  scheduleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 5 },
  reminderButton: { backgroundColor: C.soft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  reminderButtonText: { color: C.teal, fontSize: 10, fontWeight: "900" },
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 13 },
  secondaryAction: { flex: 1, minHeight: 42, borderRadius: 11, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  secondaryActionText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  tertiaryAction: { flex: 1, minHeight: 42, borderRadius: 11, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },
  tertiaryActionText: { color: C.teal, fontSize: 12, fontWeight: "800" },
  notice: { backgroundColor: C.amber, borderRadius: 15, padding: 13, marginTop: 4 },
  noticeTitle: { color: C.navy, fontSize: 13, fontWeight: "900", textAlign: "right" },
  noticeText: { color: C.muted, fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 5 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,25,45,0.45)" },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 9 },
  sheetTitle: { color: C.navy, fontSize: 21, fontWeight: "900", textAlign: "right", marginBottom: 4 },
  input: { minHeight: 48, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, color: C.navy, fontSize: 13 },
  helper: { color: C.muted, fontSize: 11, lineHeight: 17, textAlign: "right" },
  modalActions: { flexDirection: "row-reverse", gap: 9, marginTop: 6 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: C.line, justifyContent: "center", alignItems: "center" },
  cancelText: { color: C.muted, fontWeight: "800" },
  saveButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: C.navy, justifyContent: "center", alignItems: "center" },
  saveText: { color: "#FFF", fontWeight: "900" },
  pressed: { opacity: 0.78 },
});
