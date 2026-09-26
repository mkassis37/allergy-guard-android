import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nManager } from "react-native";
import { ThemeProvider } from "@/lib/theme-provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AllergyProvider } from "@/lib/allergy-store";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider>
      <AllergyProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </AllergyProvider>
    </ThemeProvider>
  );
}
