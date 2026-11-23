import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 7);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "900", marginTop: 2 },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 66 + bottomPadding,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#D5DFEA",
          borderTopWidth: 1,\n          elevation: 10,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="medications" options={{ title: "الأدوية", tabBarIcon: ({ color }) => <IconSymbol size={22} name="pills.fill" color={color} /> }} />
      <Tabs.Screen name="health" options={{ title: "الصحة", tabBarIcon: ({ color }) => <IconSymbol size={22} name="heart.text.square.fill" color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: "المواعيد", tabBarIcon: ({ color }) => <IconSymbol size={22} name="calendar" color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "المزيد", tabBarIcon: ({ color }) => <IconSymbol size={22} name="ellipsis.circle.fill" color={color} /> }} />
      <Tabs.Screen name="emergency" options={{ href: null }} />
      <Tabs.Screen name="patients" options={{ href: null }} />
      <Tabs.Screen name="records" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
