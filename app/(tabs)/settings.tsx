import Constants from "expo-constants";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useGithubUpdater } from "@/hooks/use-github-updater";
import { useAllergy } from "@/lib/allergy-store";
import { pickLocalBackup, shareLocalBackup } from "@/lib/device-backup";

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
  const version = Constants.expoConfig?.version ?? "غير معروف";

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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>نسخة احتياطية محلية</Text>
          <Pressable
            onPress={shareBackup}
            disabled={sharing}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              sharing && styles.buttonDisabled,
            ]}
          >
            {sharing ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>جاري تجهيز الملف…</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>
                إنشاء ومشاركة نسخة احتياطية
              </Text>
            )}
          </Pressable>
          <Text style={styles.autoBackupStatus}>
            {autoBackupSavedAt
              ? `تم الحفظ التلقائي محليًا: ${formatDate(autoBackupSavedAt)}`
              : "سيتم حفظ نسخة تلقائية محليًا كل 15 دقيقة أثناء استخدام التطبيق."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>استعادة نسخة من أي مكان</Text>
          <Text style={styles.cardText}>
            نزّل ملف ‎.agbackup من Drive أو WhatsApp أو أي مكان حفظته فيه، ثم
            اختره هنا. سيطلب التطبيق تأكيدًا قبل استبدال البيانات الحالية.
          </Text>
          <Pressable
            onPress={restoreBackup}
            disabled={restoring}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              restoring && styles.buttonDisabled,
            ]}
          >
            {restoring ? (
              <ActivityIndicator color={palette.teal} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                اختيار ملف واستعادة النسخة
              </Text>
            )}
          </Pressable>
        </View>

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
    color: palette.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
    marginTop: 10,
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
});
