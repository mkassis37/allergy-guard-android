import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAllergy } from "@/lib/allergy-store";

const C = {
  navy: "#173B6C",
  navySoft: "#EAF1FC",
  blue: "#2C6EBD",
  blueSoft: "#EEF5FF",
  coral: "#D95368",
  coralSoft: "#FFF0F3",
  cyan: "#0F9FAE",
  cyanSoft: "#E9FAFB",
  green: "#21835B",
  greenSoft: "#EAF8F1",
  bg: "#F6F8FC",
  card: "#FFFFFF",
  line: "#E1E7F0",
  muted: "#66758A",
};

function Stat({
  value,
  label,
  tint,
  icon,
}: {
  value: number;
  label: string;
  tint: string;
  icon: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}>
        <Text style={{ color: tint, fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickTile({
  title,
  description,
  color,
  background,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  color: string;
  background: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickTile,
        { backgroundColor: background },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: color }]}>
        <Text style={styles.tileIconText}>{icon}</Text>
      </View>
      <Text style={[styles.tileTitle, { color }]}>{title}</Text>
      <Text style={styles.tileDescription}>{description}</Text>
      <Text style={[styles.tileArrow, { color }]}>‹</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { patients, activePatient, records } = useAllergy();
  const allergies = records.filter((r) =>
    ["medicine-allergy", "food-allergy", "other-allergy"].includes(r.kind),
  ).length;
  const medicines = records.filter((r) => r.kind === "medicine").length;
  const chronic = records.filter((r) => r.kind === "chronic-condition").length;
  const severeAllergies = records.filter(
    (r) =>
      ["medicine-allergy", "food-allergy", "other-allergy"].includes(r.kind) &&
      r.severity === "شديدة",
  );

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      style={{ backgroundColor: C.bg }}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {activePatient?.fullName?.slice(0, 1) || "؟"}
            </Text>
          </View>
          <View style={styles.topCopy}>
            <Text style={styles.eyebrow}>Allergy & Health Traker</Text>
            <Text style={styles.greeting}>مرحبًا بك في ملفك الصحي</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/settings" as any)}
            style={styles.topAction}
          >
            <Text style={styles.topActionText}>⚙</Text>
          </Pressable>
        </View>

        <View style={styles.patientCard}>
          <View style={styles.patientCardHead}>
            <View>
              <Text style={styles.patientLabel}>الملف النشط</Text>
              <Text style={styles.patientName}>
                {activePatient?.fullName || "لم يتم اختيار مريض"}
              </Text>
            </View>
            <View style={styles.patientBadge}>
              <Text style={styles.patientBadgeText}>الصحة</Text>
            </View>
          </View>
          <Text style={styles.patientMeta}>
            {activePatient
              ? `${records.length} سجل صحي${activePatient.bloodType ? `  ·  فصيلة الدم ${activePatient.bloodType}` : ""}`
              : "أضف ملفًا صحيًا للبدء"}
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/patients" as any)}
            style={styles.patientButton}
          >
            <Text style={styles.patientButtonText}>
              {activePatient ? "إدارة الملف" : "إضافة ملف صحي"}
            </Text>
            <Text style={styles.patientButtonArrow}>‹</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/emergency" as any)}
          style={({ pressed }) => [
            styles.emergencyCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.emergencyTop}>
            <View style={styles.emergencyIcon}>
              <Text style={styles.emergencyIconText}>✚</Text>
            </View>
            <View style={styles.emergencyCopy}>
              <Text style={styles.emergencyKicker}>
                وصول سريع للطبيب والمسعف
              </Text>
              <Text style={styles.emergencyTitle}>بطاقة الطوارئ الطبية</Text>
            </View>
            <Text style={styles.emergencyArrow}>‹</Text>
          </View>
          <View style={styles.emergencyStats}>
            <View>
              <Text style={styles.emergencyStatLabel}>فصيلة الدم</Text>
              <Text style={styles.emergencyStatValue}>
                {activePatient?.bloodType || "—"}
              </Text>
            </View>
            <View>
              <Text style={styles.emergencyStatLabel}>حساسيات شديدة</Text>
              <Text style={styles.emergencyStatValue}>
                {severeAllergies.length || "لا يوجد"}
              </Text>
            </View>
            <View>
              <Text style={styles.emergencyStatLabel}>جهة اتصال</Text>
              <Text style={styles.emergencyStatValue}>
                {activePatient?.emergencyContact ? "متاحة" : "—"}
              </Text>
            </View>
          </View>
          {severeAllergies.length > 0 ? (
            <Text style={styles.emergencyWarning}>
              تنبيه: {severeAllergies.map((item) => item.name).join("، ")}
            </Text>
          ) : (
            <Text style={styles.emergencyHint}>
              اضغط لعرض المعلومات الطبية الأساسية
            </Text>
          )}
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ملخص الملف الصحي</Text>
          <Text style={styles.sectionCaption}>محدّث الآن</Text>
        </View>
        <View style={styles.statsRow}>
          <Stat value={allergies} label="حساسيات" tint={C.coral} icon="!" />
          <Stat value={medicines} label="أدوية" tint={C.blue} icon="+" />
          <Stat value={chronic} label="أمراض مزمنة" tint={C.green} icon="♥" />
        </View>

        <Text style={styles.sectionTitle}>الوصول السريع</Text>
        <View style={styles.tilesGrid}>
          <QuickTile
            title="السجلات الصحية"
            description="إضافة وتصدير PDF"
            color={C.blue}
            background={C.blueSoft}
            icon="▣"
            onPress={() => router.push("/(tabs)/records" as any)}
          />
          <QuickTile
            title="الحساسيات"
            description="الأطعمة والأدوية"
            color={C.coral}
            background={C.coralSoft}
            icon="!"
            onPress={() => router.push("/(tabs)/records" as any)}
          />
          <QuickTile
            title="المرضى"
            description={`${patients.length} ملف محفوظ`}
            color={C.green}
            background={C.greenSoft}
            icon="●"
            onPress={() => router.push("/(tabs)/patients" as any)}
          />
          <QuickTile
            title="النسخ والحماية"
            description="حفظ واستعادة محلية"
            color={C.cyan}
            background={C.cyanSoft}
            icon="✓"
            onPress={() => router.push("/(tabs)/settings" as any)}
          />
        </View>

        <View style={styles.privacy}>
          <Text style={styles.privacyIcon}>✓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>خصوصيتك محفوظة</Text>
            <Text style={styles.privacyText}>
              بياناتك الطبية محفوظة محليًا على جهازك، ويمكنك إنشاء نسخة احتياطية
              متى شئت.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 38 },
  topRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  topCopy: { flex: 1, alignItems: "flex-end" },
  eyebrow: { color: C.cyan, fontSize: 12, fontWeight: "900" },
  greeting: { color: C.navy, fontSize: 20, fontWeight: "900", marginTop: 2 },
  topAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  topActionText: { color: C.navy, fontSize: 20 },
  patientCard: {
    backgroundColor: C.navy,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  patientCardHead: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  patientLabel: {
    color: "#B9D0F2",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  patientName: {
    color: "#FFF",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 3,
  },
  patientBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#2B568D",
  },
  patientBadgeText: { color: "#D9E9FF", fontSize: 12, fontWeight: "900" },
  patientMeta: {
    color: "#D4E2F5",
    fontSize: 14,
    textAlign: "right",
    marginTop: 8,
  },
  patientButton: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    marginTop: 15,
    borderRadius: 12,
    paddingHorizontal: 13,
    minHeight: 40,
    backgroundColor: "#FFF",
  },
  patientButtonText: { color: C.navy, fontSize: 14, fontWeight: "900" },
  patientButtonArrow: { color: C.navy, fontSize: 22 },
  emergencyCard: {
    backgroundColor: C.coralSoft,
    borderColor: "#F2B7C1",
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    marginBottom: 20,
  },
  emergencyTop: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  emergencyIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: C.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyIconText: { color: "#FFF", fontSize: 23, fontWeight: "900" },
  emergencyCopy: { flex: 1, alignItems: "flex-end" },
  emergencyKicker: { color: C.coral, fontSize: 12, fontWeight: "800" },
  emergencyTitle: {
    color: "#8F3043",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 2,
  },
  emergencyArrow: { color: C.coral, fontSize: 30 },
  emergencyStats: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F4CCD2",
  },
  emergencyStatLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  emergencyStatValue: {
    color: C.navy,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 3,
  },
  emergencyWarning: {
    color: C.coral,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 13,
  },
  emergencyHint: {
    color: C.muted,
    fontSize: 13,
    textAlign: "right",
    marginTop: 13,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    color: C.navy,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 10,
  },
  sectionCaption: { color: C.muted, fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row-reverse", gap: 9, marginBottom: 23 },
  stat: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  statValue: { fontSize: 25, fontWeight: "900" },
  statLabel: { color: C.muted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  tilesGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 11,
    marginBottom: 20,
  },
  quickTile: {
    width: "48.2%",
    minHeight: 144,
    borderRadius: 19,
    padding: 14,
    position: "relative",
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tileIconText: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  tileTitle: { fontSize: 16, fontWeight: "900", textAlign: "right" },
  tileDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    marginTop: 4,
  },
  tileArrow: { position: "absolute", left: 13, bottom: 10, fontSize: 25 },
  privacy: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.greenSoft,
    color: C.green,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 20,
    fontWeight: "900",
  },
  privacyTitle: {
    color: C.navy,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },
  privacyText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    marginTop: 3,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
