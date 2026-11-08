import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  I18nManager,
  Pressable,
  View,
  Text,
  useColorScheme as useSystemColorScheme,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { AllergyProvider } from "@/lib/allergy-store";
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
