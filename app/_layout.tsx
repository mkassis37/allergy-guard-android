import "../global.css";
import { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  I18nManager,
  Linking,
  Pressable,
  ScrollView,
  View,
  Text,
  useColorScheme as useSystemColorScheme,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { AllergyProvider } from "@/lib/allergy-store";
import { useAllergy } from "@/lib/allergy-store";
import { useGithubUpdater } from "@/hooks/use-github-updater";
import { useBiometricLock } from "@/lib/biometric-lock";

try {
  I18nManager.allowRTL(true);
} catch {}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Application Error
        </Text>
        <Text style={{ marginTop: 10 }}>{error.message}</Text>
      </View>
    </SafeAreaProvider>
  );
}

function UpdateWatcher() {
  useGithubUpdater({ autoCheck: true });
  return null;
}

function BiometricGate() {
  const { locked, unlock } = useBiometricLock();
  const { profile, records } = useAllergy();
  const [showCard, setShowCard] = useState(false);
  const critical = records.filter(
    (record) =>
      ["medicine-allergy", "food-allergy", "other-allergy"].includes(
        record.kind,
      ) && record.severity === "شديدة",
  );
  if (!locked) return null;
  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        backgroundColor: "#F5FAFB",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <Text style={{ fontSize: 48 }}>🔒</Text>
      <Text
        style={{
          marginTop: 18,
          color: "#17324D",
          fontSize: 26,
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        التطبيق مقفل
      </Text>
      <Text
        style={{
          marginTop: 10,
          color: "#637787",
          fontSize: 16,
          lineHeight: 25,
          textAlign: "center",
        }}
      >
        استخدم بصمة الإصبع أو التعرف على الوجه لعرض بياناتك الطبية.
      </Text>
      <Pressable
        onPress={() => void unlock()}
        style={{
          marginTop: 24,
          minHeight: 54,
          minWidth: 220,
          borderRadius: 16,
          backgroundColor: "#087E8B",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ color: "#FFF", fontSize: 17, fontWeight: "900" }}>
          فتح التطبيق
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setShowCard((value) => !value)}
        style={{
          marginTop: 14,
          minHeight: 48,
          minWidth: 220,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: "#B23A48",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 18,
        }}
      >
        <Text style={{ color: "#B23A48", fontSize: 16, fontWeight: "900" }}>
          {showCard ? "إخفاء بطاقة الطوارئ" : "عرض بطاقة الطوارئ"}
        </Text>
      </Pressable>
      {showCard ? (
        <ScrollView
          style={{ width: "100%", marginTop: 18, maxHeight: 230 }}
          contentContainerStyle={{
            backgroundColor: "#FFF1F2",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: "#B23A48",
              fontSize: 19,
              fontWeight: "900",
              textAlign: "right",
            }}
          >
            بطاقة طوارئ مختصرة
          </Text>
          <Text
            style={{
              color: "#17324D",
              fontSize: 16,
              fontWeight: "800",
              textAlign: "right",
              marginTop: 8,
            }}
          >
            الاسم: {profile.fullName || "غير مسجل"}
          </Text>
          <Text
            style={{
              color: "#17324D",
              fontSize: 16,
              fontWeight: "800",
              textAlign: "right",
              marginTop: 5,
            }}
          >
            فصيلة الدم: {profile.bloodType || "غير مسجلة"}
          </Text>
          <Text
            style={{
              color: "#B23A48",
              fontSize: 16,
              fontWeight: "900",
              textAlign: "right",
              marginTop: 5,
            }}
          >
            الحساسيات الشديدة:{" "}
            {critical.map((item) => item.name).join("، ") || "لا توجد مسجلة"}
          </Text>
          <Text
            style={{
              color: "#637787",
              fontSize: 14,
              textAlign: "right",
              marginTop: 5,
            }}
          >
            جهة الطوارئ: {profile.emergencyContact || "غير مسجلة"}
          </Text>
          {profile.emergencyContact ? (
            <Pressable
              onPress={() =>
                void Linking.openURL(`tel:${profile.emergencyContact}`)
              }
              style={{
                marginTop: 10,
                backgroundColor: "#B23A48",
                borderRadius: 12,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "900" }}>
                اتصال بجهة الطوارئ
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const colorScheme = systemColorScheme ?? "light";

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AllergyProvider>
          <UpdateWatcher />
          <Stack screenOptions={{ headerShown: false }} />
          <BiometricGate />
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </AllergyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
