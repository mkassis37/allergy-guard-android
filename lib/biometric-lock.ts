import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

export const BIOMETRIC_LOCK_KEY = "allergy-guard-biometric-lock-enabled";
const DEFAULT_TIMEOUT_MS = 60_000;

export async function getBiometricLockEnabled() {
  if (Platform.OS === "web") return false;
  const value = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
  return value !== "false";
}

export async function setBiometricLockEnabled(enabled: boolean) {
  await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, String(enabled));
}

export async function authenticateBiometric() {
  if (Platform.OS === "web") return true;
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "افتح Allergy & Health Traker",
    promptSubtitle: "المعلومات الطبية محمية على هذا الجهاز",
    cancelLabel: "إلغاء",
    fallbackLabel: "استخدام رمز الجهاز",
  });
  return result.success;
}

export function useBiometricLock(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const [locked, setLocked] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    getBiometricLockEnabled()
      .then((value) => mounted && setEnabled(value))
      .catch(() => mounted && setEnabled(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || !enabled) return;
    let backgroundAt: number | null = null;
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state === "background" || state === "inactive") {
        backgroundAt = Date.now();
        return;
      }
      if (state !== "active" || !backgroundAt) return;
      const elapsed = Date.now() - backgroundAt;
      backgroundAt = null;
      if (elapsed < timeoutMs) return;
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;
      setLocked(true);
      if (await authenticateBiometric()) setLocked(false);
    });
    return () => subscription.remove();
  }, [enabled, timeoutMs]);

  const unlock = useCallback(async () => {
    if (await authenticateBiometric()) {
      setLocked(false);
      return true;
    }
    return false;
  }, []);

  return { locked, enabled, setEnabled, unlock };
}
