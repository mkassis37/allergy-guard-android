import AsyncStorage from "@react-native-async-storage/async-storage";

export const GOVERNMENT_EMERGENCY_NUMBER_KEY =
  "allergy-guard-government-emergency-number";
export const DEFAULT_GOVERNMENT_EMERGENCY_NUMBER = "911";

export async function getGovernmentEmergencyNumber(): Promise<string> {
  const value = await AsyncStorage.getItem(GOVERNMENT_EMERGENCY_NUMBER_KEY);
  return value?.trim() || DEFAULT_GOVERNMENT_EMERGENCY_NUMBER;
}

export async function setGovernmentEmergencyNumber(
  value: string,
): Promise<void> {
  const cleaned = value.trim();
  await AsyncStorage.setItem(
    GOVERNMENT_EMERGENCY_NUMBER_KEY,
    cleaned || DEFAULT_GOVERNMENT_EMERGENCY_NUMBER,
  );
}
