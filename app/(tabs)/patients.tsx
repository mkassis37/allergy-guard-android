import { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { DatePickerField } from "@/components/date-picker-field";
import { FormActionBar } from "@/components/form-action-bar";
import {
  emptyProfile,
  useAllergy,
  type Patient,
  type Profile,
} from "@/lib/allergy-store";

const C = {
  navy: "#173B6C",
  teal: "#2C6EBD",
  tealSoft: "#EEF5FF",
  bg: "#F6F8FC",
  card: "#FFFFFF",
  line: "#E1E7F0",
  muted: "#66758A",
  danger: "#D95368",
  dangerSoft: "#FFF0F3",
  green: "#21835B",
};

function Input({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#98A7B1"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlign="right"
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const systemBottomClearance =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 48)
      : Math.max(insets.bottom, 12);
  const {
    patients,
    activePatientId,
    addPatient,
    updatePatient,
    deletePatient,
    selectPatient,
  } = useAllergy();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Profile>({ ...emptyProfile });
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"name" | "updated">("updated");
  const [menuPatient, setMenuPatient] = useState<Patient | null>(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);

  const activeName = useMemo(
    () =>
      patients.find((p) => p.id === activePatientId)?.fullName ||
      "لا يوجد مريض محدد",
    [patients, activePatientId],
  );

  const visiblePatients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return patients
      .filter(
        (patient) =>
          !query || patient.fullName.toLocaleLowerCase().includes(query),
      )
      .sort((a, b) =>
        sortMode === "name"
          ? a.fullName.localeCompare(b.fullName, "ar")
          : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [patients, search, sortMode]);

  const ageOf = (birthDate: string) => {
    if (!birthDate) return "العمر غير مسجل";
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return "العمر غير مسجل";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const beforeBirthday =
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return `${Math.max(age, 0)} سنة`;
  };

  const summaryFor = (patient: Patient) => ({
    allergies: patient.records.filter((record) =>
      ["medicine-allergy", "food-allergy", "other-allergy"].includes(
        record.kind,
      ),
    ).length,
    medicines: patient.records.filter((record) =>
      ["medicine", "medicine-tolerated"].includes(record.kind),
    ).length,
    conditions: patient.records.filter(
      (record) => record.kind === "chronic-condition",
    ).length,
    surgeries: patient.records.filter((record) => record.kind === "surgery")
      .length,
  });

  const openAdd = () => {
    setEditingId(null);
    setDraft({ ...emptyProfile });
    setModalVisible(true);
  };

  const openEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setDraft({
      fullName: patient.fullName,
      birthDate: patient.birthDate,
      phone: patient.phone,
      emergencyContact: patient.emergencyContact,
      doctor: patient.doctor,
      gender: patient.gender ?? "",
      bloodType: patient.bloodType ?? "",
      notes: patient.notes ?? "",
    });
    setModalVisible(true);
  };

  const save = () => {
    if (!draft.fullName.trim()) {
      Alert.alert("الاسم مطلوب", "اكتب اسم المريض قبل الحفظ.");
      return;
    }
    const cleaned = { ...draft, fullName: draft.fullName.trim() };
    if (editingId) {
      updatePatient(editingId, cleaned);
      Alert.alert("تم الحفظ", "تم تحديث بيانات المريض.");
    } else {
      addPatient(cleaned);
      Alert.alert("تمت الإضافة", "تم إنشاء ملف المريض واختياره تلقائيًا.");
    }
    setModalVisible(false);
  };

  const remove = (patient: Patient) => {
    Alert.alert(
      "حذف المريض؟",
      `سيتم حذف ملف ${patient.fullName || "المريض"} وكل سجلاته الصحية من هذا الجهاز.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف نهائي",
          style: "destructive",
          onPress: () => deletePatient(patient.id),
        },
      ],
    );
  };

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      style={{ backgroundColor: C.bg }}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>＋ إضافة مريض</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>ملفات العائلة</Text>
            <Text style={styles.title}>المرضى</Text>
          </View>
        </View>

        <View style={styles.activeBanner}>
          <Text style={styles.activeLabel}>المريض الحالي</Text>
          <Text style={styles.activeName}>{activeName}</Text>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن مريض بالاسم"
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            textAlign="right"
            returnKeyType="search"
          />
        </View>
        <View style={styles.toolbar}>
          <Text style={styles.resultsCount}>{visiblePatients.length} ملف</Text>
          <View style={styles.sortGroup}>
            <Pressable
              onPress={() => setSortMode("updated")}
              style={[
                styles.sortButton,
                sortMode === "updated" && styles.sortButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.sortText,
                  sortMode === "updated" && styles.sortTextActive,
                ]}
              >
                آخر تحديث
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSortMode("name")}
              style={[
                styles.sortButton,
                sortMode === "name" && styles.sortButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.sortText,
                  sortMode === "name" && styles.sortTextActive,
                ]}
              >
                أبجدي
              </Text>
            </Pressable>
          </View>
        </View>

        {patients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>لا يوجد مرضى بعد</Text>
            <Text style={styles.emptyText}>
              أضف أول مريض، ثم ابدأ بإدخال الحساسية والأدوية والسجلات الصحية
              الخاصة به.
            </Text>
            <Pressable onPress={openAdd} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>إضافة أول مريض</Text>
            </Pressable>
          </View>
        ) : visiblePatients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
            <Text style={styles.emptyText}>
              جرّب البحث باسم مختلف أو امسح كلمة البحث.
            </Text>
          </View>
        ) : (
          visiblePatients.map((patient) => {
            const active = patient.id === activePatientId;
            const summary = summaryFor(patient);
            return (
              <View
                key={patient.id}
                style={[styles.patientCard, active && styles.patientCardActive]}
              >
                <Pressable
                  onPress={() => {
                    selectPatient(patient.id);
                    setDetailPatient(patient);
                  }}
                  style={styles.patientMain}
                >
                  <View style={[styles.avatar, active && styles.avatarActive]}>
                    <Text
                      style={[
                        styles.avatarText,
                        active && styles.avatarTextActive,
                      ]}
                    >
                      {(patient.fullName.trim()[0] || "م").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <View style={styles.nameLine}>
                      {active ? (
                        <Text style={styles.activeChip}>محدد</Text>
                      ) : null}
                      <Text style={styles.patientName}>
                        {patient.fullName || "بدون اسم"}
                      </Text>
                    </View>
                    <Text style={styles.patientMeta}>
                      {ageOf(patient.birthDate)} ·{" "}
                      {patient.bloodType
                        ? `فصيلة ${patient.bloodType}`
                        : "الفصيلة غير مسجلة"}
                    </Text>
                    <Text style={styles.recordCount}>
                      {patient.records.length} سجل صحي
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.cardBottom}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>
                      حساسيات {summary.allergies}
                    </Text>
                    <Text style={styles.summaryText}>
                      أدوية {summary.medicines}
                    </Text>
                    <Text style={styles.summaryText}>
                      أمراض {summary.conditions}
                    </Text>
                    <Text style={styles.summaryText}>
                      عمليات {summary.surgeries}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setMenuPatient(patient)}
                    style={styles.moreButton}
                    hitSlop={8}
                  >
                    <Text style={styles.moreText}>⋮</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={Boolean(detailPatient)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailPatient(null)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setDetailPatient(null)} hitSlop={12}>
                <Text style={styles.close}>×</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>الملف الصحي</Text>
            </View>
            {detailPatient ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailContent}
              >
                <View style={styles.detailHero}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>
                      {detailPatient.fullName.trim()[0] || "م"}
                    </Text>
                  </View>
                  <Text style={styles.detailName}>
                    {detailPatient.fullName}
                  </Text>
                  <Text style={styles.detailMeta}>
                    {ageOf(detailPatient.birthDate)} ·{" "}
                    {detailPatient.bloodType || "فصيلة غير مسجلة"}
                  </Text>
                  {detailPatient.id === activePatientId ? (
                    <Text style={styles.detailActive}>المريض النشط</Text>
                  ) : null}
                </View>
                <View style={styles.detailStats}>
                  {Object.entries(summaryFor(detailPatient)).map(
                    ([label, value]) => (
                      <View style={styles.detailStat} key={label}>
                        <Text style={styles.detailStatValue}>{value}</Text>
                        <Text style={styles.detailStatLabel}>
                          {
                            (
                              {
                                allergies: "حساسيات",
                                medicines: "أدوية",
                                conditions: "أمراض",
                                surgeries: "عمليات",
                              } as Record<string, string>
                            )[label]
                          }
                        </Text>
                      </View>
                    ),
                  )}
                </View>
                <Text style={styles.detailSection}>بيانات التواصل</Text>
                <Text style={styles.detailLine}>
                  الهاتف: {detailPatient.phone || "غير مسجل"}
                </Text>
                <Text style={styles.detailLine}>
                  جهة الطوارئ: {detailPatient.emergencyContact || "غير مسجلة"}
                </Text>
                <Text style={styles.detailLine}>
                  الطبيب / المنشأة: {detailPatient.doctor || "غير مسجل"}
                </Text>
                <Text style={styles.detailSection}>ملخص السجلات</Text>
                {detailPatient.records.length === 0 ? (
                  <Text style={styles.detailLine}>لا توجد سجلات صحية بعد.</Text>
                ) : (
                  detailPatient.records.slice(0, 8).map((record) => (
                    <View style={styles.detailRecord} key={record.id}>
                      <Text style={styles.detailRecordName}>{record.name}</Text>
                      <Text style={styles.detailRecordKind}>
                        {
                          (
                            {
                              "medicine-allergy": "حساسية دوائية",
                              "food-allergy": "حساسية غذائية",
                              "other-allergy": "حساسية أخرى",
                              "medicine-tolerated": "دواء متحمل",
                              medicine: "دواء حالي",
                              "chronic-condition": "مرض مزمن",
                              surgery: "عملية",
                              "medical-note": "ملاحظة",
                            } as Record<string, string>
                          )[record.kind]
                        }
                      </Text>
                    </View>
                  ))
                )}
                <Pressable
                  onPress={() => {
                    setDetailPatient(null);
                    setMenuPatient(detailPatient);
                  }}
                  style={styles.detailManage}
                >
                  <Text style={styles.detailManageText}>
                    إدارة بيانات المريض
                  </Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(menuPatient)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuPatient(null)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenuPatient(null)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>
              {menuPatient?.fullName || "خيارات المريض"}
            </Text>
            <Pressable
              onPress={() => {
                if (menuPatient) setDetailPatient(menuPatient);
                setMenuPatient(null);
              }}
              style={styles.menuItem}
            >
              <Text style={styles.menuItemText}>فتح الملف الصحي</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (menuPatient) openEdit(menuPatient);
                setMenuPatient(null);
              }}
              style={styles.menuItem}
            >
              <Text style={styles.menuItemText}>تعديل بيانات المريض</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (menuPatient) remove(menuPatient);
                setMenuPatient(null);
              }}
              style={[styles.menuItem, styles.menuDanger]}
            >
              <Text style={styles.deleteText}>حذف المريض وبياناته</Text>
            </Pressable>
            <Pressable
              onPress={() => setMenuPatient(null)}
              style={styles.menuCancel}
            >
              <Text style={styles.cancelText}>إلغاء</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.backdrop, { paddingBottom: systemBottomClearance }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingId ? "تعديل بيانات المريض" : "إضافة مريض جديد"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.form, { paddingBottom: 150 }]}
            >
              <Input
                label="الاسم الكامل *"
                value={draft.fullName}
                onChange={(v) => setDraft({ ...draft, fullName: v })}
                placeholder="مثال: أحمد محمد"
              />
              <View style={styles.twoColumns}>
                <View style={styles.half}>
                  <Input
                    label="فصيلة الدم"
                    value={draft.bloodType ?? ""}
                    onChange={(v) => setDraft({ ...draft, bloodType: v })}
                    placeholder="A+"
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>الجنس</Text>
                  <View style={styles.genderRow}>
                    {(["ذكر", "أنثى"] as const).map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => setDraft({ ...draft, gender: value })}
                        style={[
                          styles.genderButton,
                          draft.gender === value && styles.genderButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            draft.gender === value && styles.genderTextActive,
                          ]}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <DatePickerField
                label="تاريخ الميلاد"
                value={draft.birthDate}
                onChange={(v) => setDraft({ ...draft, birthDate: v })}
                placeholder="اختر تاريخ الميلاد"
                maximumDate={new Date()}
                helperText="لا يمكن اختيار تاريخ ميلاد في المستقبل."
              />
              <Input
                label="رقم الهاتف"
                value={draft.phone}
                onChange={(v) => setDraft({ ...draft, phone: v })}
                placeholder="07xxxxxxxx"
                keyboardType="phone-pad"
              />
              <Input
                label="جهة اتصال للطوارئ"
                value={draft.emergencyContact}
                onChange={(v) => setDraft({ ...draft, emergencyContact: v })}
                placeholder="الاسم + الهاتف"
              />
              <Input
                label="الطبيب / المنشأة"
                value={draft.doctor}
                onChange={(v) => setDraft({ ...draft, doctor: v })}
                placeholder="اختياري"
              />
              <Input
                label="ملاحظات"
                value={draft.notes ?? ""}
                onChange={(v) => setDraft({ ...draft, notes: v })}
                placeholder="أي معلومات إضافية"
                multiline
              />
            </ScrollView>
            <FormActionBar
              label={editingId ? "حفظ التعديلات" : "حفظ المريض"}
              onPress={save}
              bottomPadding={18}
              sticky
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
    marginBottom: 18,
  },
  headerText: { flex: 1 },
  kicker: {
    color: C.teal,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  title: { color: C.navy, fontSize: 32, fontWeight: "900", textAlign: "right" },
  primaryButton: {
    backgroundColor: C.teal,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  activeBanner: {
    backgroundColor: C.tealSoft,
    borderColor: "#C7E7EA",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  activeLabel: {
    color: C.teal,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  activeName: {
    color: C.navy,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 3,
  },
  searchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    minHeight: 52,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  searchIcon: { color: C.teal, fontSize: 25, marginLeft: 8 },
  searchInput: { flex: 1, color: C.navy, fontSize: 15, minHeight: 50 },
  toolbar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  resultsCount: { color: C.muted, fontSize: 13, fontWeight: "700" },
  sortGroup: { flexDirection: "row-reverse", gap: 6 },
  sortButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: C.card,
  },
  sortButtonActive: { backgroundColor: C.navy, borderColor: C.navy },
  sortText: { color: C.muted, fontSize: 12, fontWeight: "800" },
  sortTextActive: { color: "#FFF" },
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,28,45,0.5)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    height: "88%",
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  detailContent: { padding: 20, paddingBottom: 34 },
  detailHero: {
    backgroundColor: C.navy,
    borderRadius: 22,
    alignItems: "center",
    padding: 20,
  },
  detailAvatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "#2C5B92",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  detailAvatarText: { color: "#FFF", fontSize: 27, fontWeight: "900" },
  detailName: { color: "#FFF", fontSize: 24, fontWeight: "900" },
  detailMeta: { color: "#D5E5FA", fontSize: 14, marginTop: 5 },
  detailActive: {
    color: "#C7F0DA",
    backgroundColor: "#246D52",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 9,
  },
  detailStats: { flexDirection: "row-reverse", gap: 7, marginTop: 12 },
  detailStat: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    paddingVertical: 10,
  },
  detailStatValue: { color: C.navy, fontSize: 20, fontWeight: "900" },
  detailStatLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  detailSection: {
    color: C.navy,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 18,
    marginBottom: 7,
  },
  detailLine: {
    color: C.muted,
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 11,
    fontSize: 13,
    textAlign: "right",
    marginBottom: 6,
  },
  detailRecord: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 11,
    marginBottom: 6,
  },
  detailRecordName: { color: C.navy, fontSize: 13, fontWeight: "900" },
  detailRecordKind: { color: C.teal, fontSize: 11, fontWeight: "800" },
  detailManage: {
    backgroundColor: C.teal,
    borderRadius: 13,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  detailManageText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,28,45,0.42)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 28,
  },
  menuTitle: {
    color: C.navy,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 10,
  },
  menuItem: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: "#F3F6FA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  menuDanger: { backgroundColor: C.dangerSoft },
  menuItemText: { color: C.navy, fontSize: 14, fontWeight: "900" },
  menuCancel: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  cancelText: { color: C.muted, fontSize: 14, fontWeight: "800" },
  patientCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 14,
    padding: 15,
  },
  patientCardActive: { borderColor: C.teal, borderWidth: 2 },
  patientMain: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EEF3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: { backgroundColor: C.teal },
  avatarText: { color: C.navy, fontSize: 22, fontWeight: "900" },
  avatarTextActive: { color: "#FFF" },
  patientInfo: { flex: 1 },
  nameLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  patientName: {
    color: C.navy,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
  },
  activeChip: {
    color: C.green,
    backgroundColor: "#EAF7F1",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "900",
  },
  patientMeta: {
    color: C.muted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 5,
  },
  recordCount: {
    color: C.teal,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 5,
  },
  cardBottom: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
    paddingTop: 11,
    borderTopColor: C.line,
    borderTopWidth: 1,
  },
  summaryRow: {
    flex: 1,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 5,
  },
  summaryText: {
    color: C.muted,
    backgroundColor: "#F3F6FA",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "800",
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F6FA",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: { color: C.navy, fontSize: 25, fontWeight: "900", lineHeight: 28 },
  actions: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopColor: C.line,
    borderTopWidth: 1,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 76,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: "#F2F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: { backgroundColor: C.dangerSoft },
  selectText: { color: C.teal, fontSize: 15, fontWeight: "900" },
  editText: { color: C.navy, fontSize: 15, fontWeight: "900" },
  deleteText: { color: C.danger, fontSize: 15, fontWeight: "900" },
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    color: C.navy,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: C.muted,
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 18,
    backgroundColor: C.teal,
    minHeight: 52,
    borderRadius: 15,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 30, 45, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "92%",
    maxHeight: "92%",
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    overflow: "hidden",
    position: "relative",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  sheetTitle: {
    flex: 1,
    color: C.navy,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  headerSaveButton: {
    minWidth: 92,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#DDF7F4",
    borderWidth: 3,
    borderColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 30,
  },
  headerSaveButtonText: { color: "#075D69", fontSize: 19, fontWeight: "900" },
  alwaysVisibleSaveArea: {
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  alwaysVisibleSaveButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    elevation: 3,
  },
  alwaysVisibleSaveText: {
    color: "#FFF",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },
  close: { color: C.muted, fontSize: 34, fontWeight: "500", lineHeight: 38 },
  formScroll: { flex: 1 },
  form: { padding: 20, paddingBottom: 24 },
  field: { marginBottom: 14 },
  label: {
    color: C.navy,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 7,
  },
  input: {
    minHeight: 52,
    backgroundColor: "#F8FBFC",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: C.navy,
    fontSize: 17,
  },
  multiline: { minHeight: 96, paddingTop: 13, textAlignVertical: "top" },
  twoColumns: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  genderRow: { flexDirection: "row-reverse", gap: 7 },
  genderButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#F8FBFC",
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  genderButtonActive: { backgroundColor: C.teal, borderColor: C.teal },
  genderText: { color: C.navy, fontSize: 16, fontWeight: "800" },
  genderTextActive: { color: "#FFF" },
});
