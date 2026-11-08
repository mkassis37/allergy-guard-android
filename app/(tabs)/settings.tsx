import Constants from "expo-constants";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useGithubUpdater } from "@/hooks/use-github-updater";
import { useAllergy } from "@/lib/allergy-store";
import { pickLocalBackup, shareLocalBackup } from "@/lib/device-backup";
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled,
} from "@/lib/biometric-lock";
import {
  DEFAULT_GOVERNMENT_EMERGENCY_NUMBER,
  getGovernmentEmergencyNumber,
  setGovernmentEmergencyNumber,
} from "@/lib/emergency-settings";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  tealSoft: "#EAF6F7",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  bg: "#F5F9FA",
  blue: "#2F67A8",
  blueSoft: "#EEF5FF",
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-JO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function SettingsScreen() {
  const { checkNow } = useGithubUpdater({ autoCheck: false });
  const { snapshot, restoreSnapshot, autoBackupSavedAt } = useAllergy();
  const [sharing, setSharing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [checking, setChecking] = useState(false);
  const [backupSheetVisible, setBackupSheetVisible] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [governmentNumber, setGovernmentNumber] = useState(
    DEFAULT_GOVERNMENT_EMERGENCY_NUMBER,
  );
  const [governmentNumberDraft, setGovernmentNumberDraft] = useState(
    DEFAULT_GOVERNMENT_EMERGENCY_NUMBER,
  );
  const [governmentNumberVisible, setGovernmentNumberVisible] = useState(false);
  const version = Constants.expoConfig?.version ?? "غير معروف";

  useEffect(() => {
    getBiometricLockEnabled()
      .then(setBiometricEnabled)
      .catch(() => setBiometricEnabled(false));
  }, []);

  useEffect(() => {
    getGovernmentEmergencyNumber()
      .then((value) => {
        setGovernmentNumber(value);
        setGovernmentNumberDraft(value);
      })
      .catch(() => undefined);
  }, []);

  const saveGovernmentNumber = async () => {
    await setGovernmentEmergencyNumber(governmentNumberDraft);
    const saved = await getGovernmentEmergencyNumber();
    setGovernmentNumber(saved);
    setGovernmentNumberDraft(saved);
    setGovernmentNumberVisible(false);
    Alert.alert("تم الحفظ", `رقم الطوارئ الحكومي: ${saved}`);
  };

  const toggleBiometricLock = async () => {
    const next = !biometricEnabled;
    await setBiometricLockEnabled(next);
    setBiometricEnabled(next);
    Alert.alert(
      next ? "تم تفعيل القفل" : "تم إيقاف القفل",
      next
        ? "سيطلب التطبيق البصمة أو التعرف على الوجه بعد خروجه للخلفية لمدة دقيقة."
        : "لن يطلب التطبيق مصادقة حيوية عند العودة إليه.",
    );
  };

  const shareBackup = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareLocalBackup(snapshot);
      Alert.alert(
        "تم تجهيز النسخة",
        `اختر Google Drive أو WhatsApp أو أي تطبيق آخر من نافذة المشاركة.\n\nاسم الملف: ${result.filename}`,
      );
    } catch (error) {
      Alert.alert(
        "تعذر مشاركة النسخة",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setSharing(false);
    }
  };

  const restoreBackup = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await pickLocalBackup();
      if (!result) return;
      const patientCount = result.data.patients.length;
      Alert.alert(
        "استرجاع النسخة؟",
        `تاريخ النسخة: ${formatDate(result.exportedAt)}\nعدد المرضى: ${patientCount}\n\nسيتم استبدال البيانات الحالية على هذا الجهاز.`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استرجاع الآن",
            style: "destructive",
            onPress: () => {
              setRestoring(true);
              try {
                restoreSnapshot(result.data);
                Alert.alert(
                  "تم الاسترجاع",
                  "تمت استعادة المرضى والسجلات بنجاح.",
                );
              } catch (error) {
                Alert.alert(
                  "تعذر الاسترجاع",
                  error instanceof Error
                    ? error.message
                    : "بيانات النسخة غير صالحة.",
                );
              } finally {
                setRestoring(false);
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "تعذر فتح النسخة",
        error instanceof Error ? error.message : "الملف غير صالح أو تالف.",
      );
    } finally {
      setRestoring(false);
    }
  };

  const checkManually = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await checkNow(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <ScreenContainer
      className="px-5"
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
      style={{ backgroundColor: palette.bg }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>التحكم بالتطبيق</Text>
        <Text style={styles.title}>الإعدادات</Text>

        <Pressable
          onPress={() => setBackupSheetVisible(true)}
          style={({ pressed }) => [
            styles.settingRow,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.rowChevron}>‹</Text>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>النسخ والحماية</Text>
            <Text style={styles.rowSubtitle}>نسخة محلية يدوية وحفظ تلقائي</Text>
          </View>
          <View style={styles.rowIcon}>
            <Text style={styles.rowIconText}>✓</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => void toggleBiometricLock()}
          style={({ pressed }) => [
            styles.settingRow,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.rowChevron}>‹</Text>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>القفل الحيوي</Text>
            <Text style={styles.rowSubtitle}>
              {biometricEnabled ? "مفعل — بصمة أو وجه" : "متوقف"}
            </Text>
          </View>
          <View
            style={[
              styles.rowIcon,
              biometricEnabled && { backgroundColor: palette.tealSoft },
            ]}
          >
            <Text style={styles.rowIconText}>
              {biometricEnabled ? "✓" : "•"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setGovernmentNumberVisible(true)}
          style={({ pressed }) => [
            styles.settingRow,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.rowChevron}>‹</Text>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>رقم الطوارئ الحكومي</Text>
            <Text style={styles.rowSubtitle}>
              {governmentNumber} — قابل للتعديل حسب الدولة
            </Text>
          </View>
          <View style={styles.rowIcon}>
            <Text style={styles.rowIconText}>☎</Text>
          </View>
        </Pressable>

        <Modal
          visible={governmentNumberVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGovernmentNumberVisible(false)}
        >
          <View style={styles.numberModalRoot}>
            <View style={styles.numberModalCard}>
              <Text style={styles.numberModalTitle}>رقم الطوارئ الحكومي</Text>
              <Text style={styles.numberModalHint}>
                مثال: 911 أو 112. سيظهر في بطاقة الطوارئ وشاشة القفل.
              </Text>
              <TextInput
                value={governmentNumberDraft}
                onChangeText={setGovernmentNumberDraft}
                keyboardType="phone-pad"
                textAlign="right"
                placeholder="911"
                placeholderTextColor="#98A7B1"
                style={styles.numberInput}
              />
              <View style={styles.numberModalActions}>
                <Pressable
                  onPress={() => setGovernmentNumberVisible(false)}
                  style={styles.numberCancel}
                >
                  <Text style={styles.numberCancelText}>إلغاء</Text>
                </Pressable>
                <Pressable
                  onPress={() => void saveGovernmentNumber()}
                  style={styles.numberSave}
                >
                  <Text style={styles.numberSaveText}>حفظ الرقم</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={backupSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBackupSheetVisible(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setBackupSheetVisible(false)}
            />
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setBackupSheetVisible(false)}>
                  <Text style={styles.closeText}>إغلاق</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>النسخ والحماية</Text>
              </View>
              <Text style={styles.sheetHint}>
                الحفظ التلقائي محلي على الجهاز، أما النسخة اليدوية فتُرسل عبر
                نافذة المشاركة.
              </Text>
              <Pressable
                onPress={shareBackup}
                disabled={sharing}
                style={({ pressed }) => [
                  styles.jsonCreateButton,
                  pressed && styles.buttonPressed,
                  sharing && styles.buttonDisabled,
                ]}
              >
                {sharing ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.jsonButtonText}>جاري تجهيز الملف…</Text>
                  </View>
                ) : (
                  <Text style={styles.jsonButtonText}>
                    إنشاء نسخة JSON ومشاركتها
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={restoreBackup}
                disabled={restoring}
                style={({ pressed }) => [
                  styles.jsonRestoreButton,
                  pressed && styles.buttonPressed,
                  restoring && styles.buttonDisabled,
                ]}
              >
                {restoring ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.jsonButtonText}>استعادة نسخة JSON</Text>
                )}
              </Pressable>
              <View style={styles.statusBadge}>
                <Text style={styles.autoBackupStatus}>
                  {autoBackupSavedAt
                    ? `تم الحفظ التلقائي محليًا: ${formatDate(autoBackupSavedAt)}`
                    : "سيتم حفظ نسخة تلقائية محليًا كل 15 دقيقة أثناء استخدام التطبيق."}
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تحديثات التطبيق</Text>
          <Text style={styles.cardText}>
            يتحقق التطبيق من أحدث إصدار مستقر على GitHub، ويمكنك إجراء فحص يدوي
            في أي وقت.
          </Text>
          <View style={styles.versionRow}>
            <Text style={styles.labelInline}>الإصدار الحالي</Text>
            <Text style={styles.version}>v{version}</Text>
          </View>
          <Pressable
            onPress={checkManually}
            disabled={checking}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              checking && styles.buttonDisabled,
            ]}
          >
            {checking ? (
              <ActivityIndicator color={palette.teal} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                التحقق من التحديثات الآن
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            النسخ الاحتياطي يحفظ بيانات التطبيق على شكل ملف محلي. لا يرفع
            التطبيق الملف إلى خادم خاص به، وأنت تختار الجهة التي ترسل الملف
            إليها.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 30 },
  kicker: {
    color: palette.teal,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  title: {
    color: palette.navy,
    fontSize: 30,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 18,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    color: palette.navy,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 8,
  },
  cardText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 23,
    textAlign: "right",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: palette.teal,
    borderRadius: 13,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  jsonCreateButton: {
    backgroundColor: "#DDF7F4",
    borderColor: palette.teal,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  jsonRestoreButton: {
    backgroundColor: "#EAF0FA",
    borderColor: "#7C9BC4",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 12,
  },
  jsonButtonText: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  secondaryButton: {
    backgroundColor: palette.tealSoft,
    borderColor: "#BBDDE0",
    borderRadius: 13,
    borderWidth: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: palette.teal,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  helper: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
    marginTop: 12,
  },
  autoBackupStatus: {
    color: palette.teal,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
    fontWeight: "700",
  },
  statusBadge: {
    alignSelf: "flex-end",
    backgroundColor: palette.tealSoft,
    borderColor: "#BBDDE0",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  versionRow: {
    backgroundColor: palette.blueSoft,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  labelInline: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  version: { color: palette.blue, fontSize: 17, fontWeight: "900" },
  note: {
    backgroundColor: "#FFF7E4",
    borderColor: "#F0D48B",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  noteText: {
    color: "#765500",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
  },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.55 },
  settingRow: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 14,
  },
  rowChevron: {
    color: palette.muted,
    fontSize: 30,
    lineHeight: 32,
    width: 28,
  },
  rowCopy: { flex: 1, alignItems: "flex-end", paddingHorizontal: 10 },
  rowTitle: { color: palette.navy, fontSize: 18, fontWeight: "900" },
  rowSubtitle: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 4,
    textAlign: "right",
  },
  rowIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.tealSoft,
  },
  rowIconText: { color: palette.teal, fontSize: 28, fontWeight: "900" },
  numberModalRoot: {
    flex: 1,
    backgroundColor: "rgba(23, 50, 77, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  numberModalCard: {
    width: "100%",
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 20,
  },
  numberModalTitle: {
    color: palette.navy,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "right",
  },
  numberModalHint: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
    marginTop: 8,
  },
  numberInput: {
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    color: palette.navy,
    fontSize: 18,
    marginTop: 14,
  },
  numberModalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  numberCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2F4",
    alignItems: "center",
    justifyContent: "center",
  },
  numberCancelText: { color: palette.muted, fontSize: 15, fontWeight: "900" },
  numberSave: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: palette.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  numberSaveText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(23, 50, 77, 0.38)",
  },
  bottomSheet: {
    backgroundColor: "#F8FAFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 32,
    marginBottom: 0,
    maxHeight: "84%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sheetTitle: { color: "#172033", fontSize: 25, fontWeight: "900" },
  closeText: { color: palette.teal, fontSize: 17, fontWeight: "900" },
  sheetHint: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
    marginBottom: 14,
  },
  restoreButton: {
    backgroundColor: "#12A39A",
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 12,
  },
  restoreButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
});
