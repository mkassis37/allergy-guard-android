import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { FormActionBar } from "@/components/form-action-bar";
import { useAllergy } from "@/lib/allergy-store";
import { exportBackup, importJsonBackup } from "@/lib/backup";
import { getGovernmentEmergencyNumber } from "@/lib/emergency-settings";

const palette = {
  navy: "#17324D",
  teal: "#2C6EBD",
  bg: "#F6F8FC",
  card: "#FFFFFF",
  line: "#E1E7F0",
  muted: "#66758A",
  red: "#D95368",
  paleRed: "#FFF0F3",
};

export default function EmergencyScreen() {
  const { records, profile, saveProfile, replaceData } = useAllergy();
  const [editing, setEditing] = useState(false);
  const [doctorMode, setDoctorMode] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [governmentNumber, setGovernmentNumber] = useState("911");
  useEffect(() => {
    getGovernmentEmergencyNumber()
      .then(setGovernmentNumber)
      .catch(() => undefined);
  }, []);
  const allergies = records.filter(
    (item) =>
      item.kind === "medicine-allergy" ||
      item.kind === "food-allergy" ||
      item.kind === "other-allergy",
  );
  const medicines = records.filter((item) => item.kind === "medicine");
  const tolerated = records.filter(
    (item) => item.kind === "medicine-tolerated",
  );
  const severeAllergies = allergies.filter((item) => item.severity === "شديدة");
  const [draft, setDraft] = useState(profile);
  const shareCard = async () => {
    const lines = [
      "بطاقة الطوارئ الطبية — Allergy & Health Traker",
      `الاسم: ${profile.fullName || "غير مسجل"}`,
      `الأدوية المسببة: ${
        allergies
          .filter((r) => r.kind === "medicine-allergy")
          .map(
            (r) =>
              `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`,
          )
          .join("، ") || "لا يوجد"
      }`,
      `الأطعمة المسببة: ${
        allergies
          .filter((r) => r.kind === "food-allergy")
          .map((r) => r.name)
          .join("، ") || "لا يوجد"
      }`,
      `حساسيات أخرى: ${
        allergies
          .filter((r) => r.kind === "other-allergy")
          .map((r) => `${r.name}${r.severity ? ` (${r.severity})` : ""}`)
          .join("، ") || "لا يوجد"
      }`,
      `الأدوية / العلاجات المسجلة: ${medicines.map((r) => `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`).join("، ") || "لا يوجد"}`,
      `أدوية تم تحملها: ${tolerated.map((r) => `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`).join("، ") || "لا يوجد"}`,
      `جهة الطوارئ: ${profile.emergencyContact || "غير مسجل"}`,
      "هذه المعلومات سجل شخصي وليست تشخيصًا طبيًا.",
    ];
    await Share.share({ message: lines.join("\n") });
  };
  const save = () => {
    saveProfile(draft);
    setEditing(false);
    Alert.alert("تم الحفظ", "تم تحديث بيانات بطاقة الطوارئ.");
  };
  const exportFile = async (format: "json" | "csv") => {
    try {
      await exportBackup(profile, records, format);
    } catch (error) {
      Alert.alert(
        "تعذر التصدير",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    }
  };
  const importFile = async () => {
    try {
      const backup = await importJsonBackup();
      if (!backup) return;
      Alert.alert(
        "استبدال البيانات؟",
        `سيتم استيراد ${backup.records.length} سجلًا واستبدال البيانات الحالية.`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استيراد",
            onPress: () => {
              replaceData(backup.records, backup.profile);
              Alert.alert(
                "تم الاستيراد",
                "تمت استعادة النسخة الاحتياطية بنجاح.",
              );
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "تعذر الاستيراد",
        error instanceof Error ? error.message : "الملف غير صالح أو تالف.",
      );
    }
  };
  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            جاهزة للعرض أمام الطبيب أو الصيدلي
          </Text>
          <Text style={styles.title}>بطاقة الطوارئ</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>حساسية</Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>بطاقة الطوارئ الطبية</Text>
              <Text style={styles.cardSub}>
                ملخص الحساسية الدوائية والغذائية
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>تنبيه طبي مهم</Text>
            <Text style={styles.warningText}>
              يرجى التحقق من الاسم التجاري والمادة الفعالة قبل وصف أو صرف أي
              دواء.
            </Text>
          </View>
          <Text style={styles.fieldHeading}>بيانات الشخص</Text>
          <View style={styles.infoGrid}>
            <View style={styles.info}>
              <Text style={styles.infoLabel}>فصيلة الدم</Text>
              <Text style={styles.infoValue}>
                {profile.bloodType || "غير مسجلة"}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.infoLabel}>الاسم</Text>
              <Text style={styles.infoValue}>
                {profile.fullName || "غير مسجل"}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.infoLabel}>جهة الطوارئ</Text>
              <Text style={styles.infoValue}>
                {profile.emergencyContact || "غير مسجل"}
              </Text>
            </View>
          </View>
          {profile.emergencyContact ? (
            <Pressable
              onPress={() =>
                void Linking.openURL(`tel:${profile.emergencyContact}`)
              }
              style={({ pressed }) => [
                styles.callEmergency,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.callEmergencyText}>اتصال بجهة الطوارئ</Text>
            </Pressable>
          ) : null}
          <Text style={styles.governmentNumber}>
            الطوارئ الحكومية: {governmentNumber}
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(`tel:${governmentNumber}`)}
            style={({ pressed }) => [
              styles.governmentCall,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.governmentCallText}>
              اتصال بالطوارئ الحكومية
            </Text>
          </Pressable>
          <View style={styles.criticalBox}>
            <Text style={styles.criticalTitle}>الحساسيات الحرجة</Text>
            <Text style={styles.criticalText}>
              {allergies
                .filter((item) => item.severity === "شديدة")
                .map(
                  (item) =>
                    `${item.name}${item.activeIngredient ? ` (${item.activeIngredient})` : ""}`,
                )
                .join("، ") || "لا توجد حساسية مسجلة بدرجة شديدة"}
            </Text>
          </View>
          <Text style={styles.fieldHeading}>
            الأدوية أو المواد الفعالة المسببة
          </Text>
          {allergies.filter((r) => r.kind === "medicine-allergy").length ===
          0 ? (
            <Text style={styles.none}>لا توجد سجلات</Text>
          ) : (
            allergies
              .filter((r) => r.kind === "medicine-allergy")
              .map((r) => (
                <View style={styles.item} key={r.id}>
                  <Text style={styles.itemMain}>{r.name}</Text>
                  <Text style={styles.itemSub}>
                    {r.activeIngredient || "المادة الفعالة غير مسجلة"}
                    {r.symptoms ? ` — ${r.symptoms}` : ""}
                  </Text>
                </View>
              ))
          )}
          <Text style={styles.fieldHeading}>الأطعمة أو المكونات المسببة</Text>
          <Text style={styles.foodText}>
            {allergies
              .filter((r) => r.kind === "food-allergy")
              .map((r) => r.name)
              .join("، ") || "لا توجد سجلات"}
          </Text>
          <Text style={styles.fieldHeading}>حساسيات أخرى</Text>
          <Text style={styles.foodText}>
            {allergies
              .filter((r) => r.kind === "other-allergy")
              .map((r) => `${r.name}${r.severity ? ` (${r.severity})` : ""}`)
              .join("، ") || "لا توجد سجلات"}
          </Text>
          <Text style={styles.fieldHeading}>الأدوية / العلاجات المسجلة</Text>
          <Text style={styles.foodText}>
            {medicines
              .map(
                (r) =>
                  `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`,
              )
              .join("، ") || "لا توجد سجلات"}
          </Text>
          <Text style={styles.fieldHeading}>أدوية تم تحملها دون حساسية</Text>
          <Text style={styles.foodText}>
            {tolerated
              .map(
                (r) =>
                  `${r.name}${r.activeIngredient ? ` (${r.activeIngredient})` : ""}${r.dosage ? ` — ${r.dosage}` : ""}${r.frequency ? `، ${r.frequency}` : ""}`,
              )
              .join("، ") || "لا توجد سجلات"}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={shareCard}
            style={({ pressed }) => [styles.share, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.shareText}>مشاركة البطاقة</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setDraft(profile);
              setEditing(true);
            }}
            style={styles.edit}
          >
            <Text style={styles.editText}>تعديل البيانات</Text>
          </Pressable>
        </View>
        <View style={styles.backupSection}>
          <Text style={styles.backupTitle}>النسخ الاحتياطي</Text>
          <Text style={styles.backupHint}>
            أنشئ ملفًا محليًا وشاركه مباشرة إلى Drive أو WhatsApp أو أي مكان.
          </Text>
          <View style={styles.backupActions}>
            <Pressable
              onPress={() => exportFile("json")}
              style={styles.backupButton}
            >
              <Text style={styles.backupButtonText}>تصدير ومشاركة</Text>
            </Pressable>
            <Pressable
              onPress={() => exportFile("csv")}
              style={styles.backupButton}
            >
              <Text style={styles.backupButtonText}>تصدير Excel</Text>
            </Pressable>
            <Pressable onPress={importFile} style={styles.backupButton}>
              <Text style={styles.backupButtonText}>استيراد من ملف</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.note}>
          <Text style={styles.noteText}>
            هذه البطاقة سجل شخصي للمعلومات وليست تشخيصًا طبيًا. في حالة صعوبة
            التنفس أو تورم الوجه أو اللسان اتصل بالطوارئ فورًا.
          </Text>
        </View>
        <View style={styles.doctorPanel}>
          <View style={styles.doctorPanelCopy}>
            <Text style={styles.doctorPanelTitle}>وضع الطبيب المبسط</Text>
            <Text style={styles.doctorPanelHint}>
              عرض الاسم، فصيلة الدم، الحساسية الحرجة، الأدوية وجهة الاتصال فقط.
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: doctorMode }}
            onPress={() => {
              const next = !doctorMode;
              setDoctorMode(next);
              if (next) setPreviewVisible(true);
            }}
            style={[styles.modeToggle, doctorMode && styles.modeToggleActive]}
          >
            <Text style={styles.modeToggleText}>
              {doctorMode ? "مفعل" : "تشغيل"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => setPreviewVisible(true)}
          style={({ pressed }) => [
            styles.previewButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.previewButtonText}>
            معاينة بطاقة الطوارئ قبل المشاركة
          </Text>
        </Pressable>
        {editing && (
          <View style={styles.form}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={0}
            >
              <View style={styles.formHeaderRow}>
                <Text style={styles.formTitle}>تعديل بيانات البطاقة</Text>
              </View>
              <TextInput
                value={draft.fullName}
                onChangeText={(value) =>
                  setDraft({ ...draft, fullName: value })
                }
                placeholder="الاسم الكامل"
                placeholderTextColor="#9BAAB3"
                style={styles.input}
                textAlign="right"
              />
              <TextInput
                value={draft.phone}
                onChangeText={(value) => setDraft({ ...draft, phone: value })}
                placeholder="رقم الهاتف"
                placeholderTextColor="#9BAAB3"
                style={styles.input}
                textAlign="right"
                keyboardType="phone-pad"
              />
              <TextInput
                value={draft.emergencyContact}
                onChangeText={(value) =>
                  setDraft({ ...draft, emergencyContact: value })
                }
                placeholder="جهة اتصال للطوارئ + الهاتف"
                placeholderTextColor="#9BAAB3"
                style={styles.input}
                textAlign="right"
              />
              <TextInput
                value={draft.doctor}
                onChangeText={(value) => setDraft({ ...draft, doctor: value })}
                placeholder="اسم الطبيب / المنشأة"
                placeholderTextColor="#9BAAB3"
                style={styles.input}
                textAlign="right"
              />
            </KeyboardAvoidingView>
            <FormActionBar
              label="حفظ التعديلات"
              onPress={save}
              topBorder={false}
              bottomPadding={4}
            />
          </View>
        )}
      </ScrollView>
      <Modal
        visible={previewVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHeader}>
              <Pressable onPress={() => setPreviewVisible(false)}>
                <Text style={styles.previewClose}>إغلاق</Text>
              </Pressable>
              <Text style={styles.previewTitle}>
                {doctorMode ? "بطاقة الطبيب المختصرة" : "معاينة للطبيب"}
              </Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewContent}
            >
              <View style={styles.previewMedicalHeader}>
                <Text style={styles.previewMedicalKicker}>
                  MEDICAL ID · بطاقة طبية
                </Text>
                <Text style={styles.previewMedicalName}>
                  {profile.fullName || "الاسم غير مسجل"}
                </Text>
                <Text style={styles.previewMedicalMeta}>
                  فصيلة الدم: {profile.bloodType || "غير مسجلة"}
                </Text>
              </View>
              <View style={styles.previewCritical}>
                <Text style={styles.previewSectionRed}>الحساسيات الحرجة</Text>
                <Text style={styles.previewValue}>
                  {severeAllergies.map((item) => item.name).join("، ") ||
                    "لا توجد حساسية شديدة مسجلة"}
                </Text>
              </View>
              <Text style={styles.previewSection}>
                الأدوية أو المواد الفعالة المسببة
              </Text>
              <Text style={styles.previewValue}>
                {allergies
                  .filter((item) => item.kind === "medicine-allergy")
                  .map(
                    (item) =>
                      `${item.name}${item.activeIngredient ? ` — ${item.activeIngredient}` : ""}`,
                  )
                  .join("، ") || "لا توجد سجلات"}
              </Text>
              <Text style={styles.previewSection}>الأدوية الحالية</Text>
              <Text style={styles.previewValue}>
                {medicines
                  .map(
                    (item) =>
                      `${item.name}${item.activeIngredient ? ` — ${item.activeIngredient}` : ""}`,
                  )
                  .join("، ") || "لا توجد سجلات"}
              </Text>
              <Text style={styles.previewSection}>الاتصال</Text>
              <Text style={styles.previewValue}>
                {profile.emergencyContact || "جهة الاتصال غير مسجلة"}
              </Text>
              <Text style={styles.previewDisclaimer}>
                هذه معاينة للمعلومات المسجلة وليست تشخيصًا طبيًا.
              </Text>
            </ScrollView>
            <Pressable onPress={shareCard} style={styles.previewShare}>
              <Text style={styles.previewShareText}>مشاركة هذه البطاقة</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 28 },
  header: { marginBottom: 16 },
  subtitle: {
    color: palette.teal,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 3,
  },
  title: {
    color: palette.navy,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "right",
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E6C1C8",
    shadowColor: palette.navy,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  cardTitle: {
    color: palette.navy,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
  },
  cardSub: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 3,
  },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: 14 },
  warning: {
    backgroundColor: palette.paleRed,
    borderRadius: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F2CBD0",
  },
  warningTitle: {
    color: palette.red,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  warningText: {
    color: "#7D4B52",
    fontSize: 10,
    textAlign: "right",
    lineHeight: 16,
    marginTop: 2,
  },
  fieldHeading: {
    color: palette.navy,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 15,
    marginBottom: 6,
  },
  infoGrid: { flexDirection: "row-reverse", gap: 7 },
  info: { flex: 1, borderRadius: 9, backgroundColor: palette.bg, padding: 9 },
  infoLabel: { color: palette.muted, fontSize: 9, textAlign: "right" },
  infoValue: {
    color: palette.navy,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    marginTop: 4,
  },
  callEmergency: {
    backgroundColor: palette.red,
    borderRadius: 11,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  callEmergencyText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  governmentNumber: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 10,
  },
  governmentCall: {
    backgroundColor: palette.navy,
    borderRadius: 11,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  governmentCallText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  criticalBox: {
    backgroundColor: palette.paleRed,
    borderColor: "#E8AEB6",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  criticalTitle: {
    color: palette.red,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  criticalText: {
    color: palette.navy,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "right",
    marginTop: 4,
  },
  item: {
    borderRightWidth: 3,
    borderRightColor: palette.red,
    backgroundColor: "#FFF7F7",
    padding: 8,
    marginBottom: 5,
    borderRadius: 7,
  },
  itemMain: {
    color: palette.navy,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  itemSub: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 3,
  },
  foodText: {
    color: palette.navy,
    backgroundColor: palette.bg,
    borderRadius: 9,
    padding: 10,
    fontSize: 11,
    textAlign: "right",
    lineHeight: 18,
  },
  none: { color: palette.muted, fontSize: 11, textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 14 },
  share: {
    flex: 1,
    backgroundColor: palette.navy,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareText: { color: "white", fontSize: 14, fontWeight: "800" },
  edit: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.navy,
    backgroundColor: palette.card,
  },
  editText: { color: palette.navy, fontSize: 14, fontWeight: "800" },
  backupSection: {
    backgroundColor: palette.card,
    borderRadius: 15,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: palette.line,
  },
  backupTitle: {
    color: palette.navy,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  backupHint: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 4,
  },
  backupActions: {
    flexDirection: "row-reverse",
    gap: 6,
    marginTop: 10,
  },
  backupButton: {
    flex: 1,
    backgroundColor: "#EAF5F6",
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  backupButtonText: {
    color: palette.teal,
    fontSize: 10,
    fontWeight: "800",
  },
  note: {
    backgroundColor: "#EAF5F6",
    borderRadius: 13,
    padding: 12,
    marginTop: 12,
  },
  noteText: {
    color: palette.teal,
    fontSize: 10,
    textAlign: "right",
    lineHeight: 17,
  },
  form: {
    backgroundColor: palette.card,
    borderRadius: 17,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: palette.line,
  },
  formTitle: {
    color: palette.navy,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg,
    borderRadius: 10,
    padding: 11,
    color: palette.navy,
    fontSize: 12,
    marginBottom: 8,
  },
  formHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  formHeaderSave: {
    minWidth: 88,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: "#DDF7F4",
    borderWidth: 3,
    borderColor: "#087E8B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  formHeaderSaveText: { color: "#075D69", fontSize: 18, fontWeight: "900" },
  save: {
    backgroundColor: palette.navy,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  saveText: { color: "white", fontSize: 14, fontWeight: "800" },
  doctorPanel: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EEF5FF",
    borderColor: "#C8DCF7",
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 12,
  },
  doctorPanelCopy: { flex: 1 },
  doctorPanelTitle: {
    color: palette.navy,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  doctorPanelHint: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "right",
    marginTop: 3,
  },
  modeToggle: {
    minWidth: 58,
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: "#D9E4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  modeToggleActive: { backgroundColor: palette.navy },
  modeToggleText: { color: palette.navy, fontSize: 12, fontWeight: "900" },
  previewButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  previewButtonText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,28,45,0.5)",
    justifyContent: "flex-end",
  },
  previewSheet: {
    maxHeight: "92%",
    backgroundColor: palette.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
  },
  previewHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTitle: {
    color: palette.navy,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "right",
  },
  previewClose: { color: palette.teal, fontSize: 14, fontWeight: "900" },
  previewContent: { paddingBottom: 12 },
  previewMedicalHeader: {
    backgroundColor: palette.navy,
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
  },
  previewMedicalKicker: {
    color: "#BFD5F2",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  previewMedicalName: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 8,
  },
  previewMedicalMeta: {
    color: "#DCE9FA",
    fontSize: 14,
    textAlign: "right",
    marginTop: 4,
  },
  previewCritical: {
    backgroundColor: palette.paleRed,
    borderColor: "#EAB0BA",
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginBottom: 5,
  },
  previewSectionRed: {
    color: palette.red,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  previewSection: {
    color: palette.navy,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 13,
    marginBottom: 5,
  },
  previewValue: {
    color: palette.navy,
    backgroundColor: palette.card,
    borderRadius: 11,
    padding: 11,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
  },
  previewDisclaimer: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "right",
    marginTop: 14,
  },
  previewShare: {
    backgroundColor: palette.navy,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  previewShareText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23,50,77,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  passwordModal: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.line,
  },
  passwordHint: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "right",
    marginBottom: 12,
  },
  modalActions: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { color: palette.muted, fontSize: 13, fontWeight: "800" },
});
