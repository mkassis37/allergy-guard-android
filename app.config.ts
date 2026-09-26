import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "حارس الحساسية",
  slug: "allergy-guard-android",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "allergyguard",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  android: {
    package: "com.mkassis37.allergyguard",
    adaptiveIcon: {
      backgroundColor: "#E8F4F5",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  ios: { supportsTablet: true, bundleIdentifier: "com.mkassis37.allergyguard" },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F5FAFB",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
