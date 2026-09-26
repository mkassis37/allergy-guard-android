import AsyncStorage from "@react-native-async-storage/async-storage";
import { startOAuthLogin } from "@/constants/oauth";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const palette = {
  navy: "#17324D",
  teal: "#087E8B",
  bg: "#F5FAFB",
  card: "#FFFFFF",
  line: "#D7E5E8",
  muted: "#637787",
  red: "#B23A48",
  paleRed: "#FFF1F2",
};

const SETTINGS_KEY = "allergy-guard-cloud-settings-v1";

type CloudSettings = {
  enabled: boolean;
  autoBackup: boolean;
  wifiOnly: boolean;
};

const defaultSettings: CloudSettings = {
  enabled: false,
  autoBackup: false,
  wifiOnly: true,
};

export default function SettingsScreen() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then(
        (raw) => raw && setSettings({ ...defaultSettings, ...JSON.parse(raw) }),
      )
      .catch(() => undefined);
  }, []);

  const updateSettings = (next: Partial<CloudSettings>) => {
    const value = { ...settings, ...next };
    setSettings(value);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(value)).catch(
      () => undefined,
    );
  };

  const login = async () => {
    try {
      await startOAuthLogin();
    } catch {
      Alert.alert("تعذر تسجيل الدخول", "يرجى المحاولة مرة أخرى.");
    }
  };

  const toggleCloud = (value: boolean) => {
    if (value && !isAuthenticated) {
      Alert.alert(
        "تسجيل الدخول مطلوب",
        "سجل الدخول أولاً لتفعيل النسخ السحابي.",
        [
          { text: "إلغاء", style: "cancel" },
          { text: "تسجيل الدخول", onPress: login },
        ],
      );
      return;
    }
    updateSettings({ enabled: value });
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
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>تحكم في حسابك ونسخك الاحتياطية</Text>
          <Text style={styles.title}>الإعدادات</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <IconSymbol name="icloud.fill" size={27} color="white" />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>نسخ سحابي اختياري</Text>
            <Text style={styles.heroText}>
              تبقى بياناتك محلية افتراضيًا. فعّل السحابة فقط إذا أردت استعادتها
              على جهاز آخر.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>الحساب</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={styles.accountIcon}>
              <IconSymbol name="person.fill" size={22} color={palette.teal} />
            </View>
            <View style={styles.accountBody}>
              <Text style={styles.label}>
                {loading
                  ? "جارٍ التحقق..."
                  : isAuthenticated
                    ? "الحساب متصل"
                    : "لا يوجد حساب متصل"}
              </Text>
              <Text style={styles.value}>
                {isAuthenticated
                  ? user?.email || user?.name || "حساب حارس الحساسية"
                  : "مطلوب لتفعيل النسخ السحابي"}
              </Text>
            </View>
          </View>
          {isAuthenticated ? (
            <Pressable onPress={logout} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>تسجيل الخروج</Text>
            </Pressable>
          ) : (
            <Pressable onPress={login} style={styles.primaryButton}>
              <Text style={styles.primaryText}>تسجيل الدخول</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>النسخ السحابي</Text>
        <View style={styles.card}>
          <SettingRow
            icon="icloud.fill"
            title="تفعيل النسخ السحابي"
            description="رفع نسخة مشفرة بعد تسجيل الدخول"
            value={settings.enabled}
            onValueChange={toggleCloud}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="arrow.triangle.2.circlepath"
            title="نسخ تلقائي"
            description="يحفظ نسخة عند تحديث السجلات"
            value={settings.autoBackup}
            onValueChange={(value) => updateSettings({ autoBackup: value })}
            disabled={!settings.enabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="wifi"
            title="عبر Wi‑Fi فقط"
            description="تجنب استهلاك بيانات الهاتف"
            value={settings.wifiOnly}
            onValueChange={(value) => updateSettings({ wifiOnly: value })}
            disabled={!settings.enabled}
          />
        </View>

        <View style={styles.syncCard}>
          <View style={styles.syncIcon}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={21}
              color={palette.teal}
            />
          </View>
          <View style={styles.syncBody}>
            <Text style={styles.syncTitle}>آخر مزامنة</Text>
            <Text style={styles.syncText}>
              {settings.enabled
                ? "لم تتم مزامنة بعد"
                : "النسخ المحلي نشط — لا توجد مزامنة سحابية"}
            </Text>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>الخصوصية أولاً</Text>
          <Text style={styles.privacyText}>
            لا تُرفع البيانات إلا بعد تفعيلك للخدمة. عند تنفيذ الربط السحابي،
            سيتم تشفير النسخة قبل مغادرة جهازك.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  icon: "icloud.fill" | "arrow.triangle.2.circlepath" | "wifi";
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.settingRow, disabled && styles.disabled]}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#D7E5E8", true: "#9FD4D8" }}
        thumbColor={value ? palette.teal : "#FFFFFF"}
      />
      <View style={styles.settingBody}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={styles.settingIcon}>
        <IconSymbol
          name={icon}
          size={19}
          color={disabled ? "#B7C7CD" : palette.teal}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 34 },
  header: { marginBottom: 18 },
  subtitle: {
    color: palette.muted,
    fontSize: 12,
    textAlign: "right",
    marginBottom: 4,
  },
  title: {
    color: palette.navy,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "right",
  },
  hero: {
    flexDirection: "row-reverse",
    gap: 12,
    backgroundColor: "#EAF5F6",
    borderRadius: 17,
    padding: 15,
    marginBottom: 20,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: palette.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBody: { flex: 1 },
  heroTitle: {
    color: palette.navy,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 4,
  },
  heroText: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "right",
  },
  sectionTitle: {
    color: palette.teal,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 8,
    marginTop: 5,
  },
  card: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 17,
    padding: 15,
    marginBottom: 16,
  },
  accountRow: {
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EAF5F6",
    alignItems: "center",
    justifyContent: "center",
  },
  accountBody: { flex: 1 },
  label: {
    color: palette.navy,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  value: {
    color: palette.muted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 3,
  },
  primaryButton: {
    backgroundColor: palette.teal,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: "white", fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: palette.teal,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryText: { color: palette.teal, fontSize: 13, fontWeight: "900" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 58,
  },
  settingBody: { flex: 1 },
  settingTitle: {
    color: palette.navy,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  settingDescription: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 3,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F5FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: "#F0F5F6", marginVertical: 4 },
  disabled: { opacity: 0.5 },
  syncCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
  },
  syncIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: "#EAF5F6",
    alignItems: "center",
    justifyContent: "center",
  },
  syncBody: { flex: 1 },
  syncTitle: {
    color: palette.navy,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  syncText: {
    color: palette.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 3,
  },
  privacyNote: {
    backgroundColor: palette.paleRed,
    borderRightWidth: 3,
    borderRightColor: palette.red,
    borderRadius: 12,
    padding: 12,
  },
  privacyTitle: {
    color: palette.red,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 4,
  },
  privacyText: {
    color: "#7F4B53",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "right",
  },
});
