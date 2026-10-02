import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nManager } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AllergyProvider } from "@/lib/allergy-store";
import { useGithubUpdater } from "@/hooks/use-github-updater";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useGithubUpdater();
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AllergyProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </AllergyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
