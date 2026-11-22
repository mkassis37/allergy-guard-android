import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { decryptJsonWithKey, encryptJsonWithKey } from "./local-crypto";

const DEVICE_KEY_NAME = "allergy-guard-local-encryption-key-v1";
const KEY_BYTES = 32;
const NONCE_BYTES = 24;

function toBase64(bytes: Uint8Array) {
  const BufferImpl = (globalThis as { Buffer?: any }).Buffer;
  if (BufferImpl) return BufferImpl.from(bytes).toString("base64");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

function fromBase64(value: string) {
  const BufferImpl = (globalThis as { Buffer?: any }).Buffer;
  if (BufferImpl) return new Uint8Array(BufferImpl.from(value, "base64"));
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

let deviceKeyPromise: Promise<Uint8Array> | null = null;

async function getDeviceKey(createIfMissing: boolean) {
  if (!deviceKeyPromise) {
    deviceKeyPromise = (async () => {
      const existing =
        Platform.OS === "web"
          ? await AsyncStorage.getItem(`${DEVICE_KEY_NAME}-web`)
          : await SecureStore.getItemAsync(DEVICE_KEY_NAME);
      if (existing) {
        const key = fromBase64(existing);
        if (key.length !== KEY_BYTES) {
          throw new Error("مفتاح حماية البيانات المحلية غير صالح.");
        }
        return key;
      }
      if (!createIfMissing) {
        throw new Error("مفتاح تشفير البيانات غير موجود. لم يتم تعديل النسخة المحفوظة.");
      }
      const key = await Crypto.getRandomBytesAsync(KEY_BYTES);
      if (Platform.OS === "web") {
        // Compatibility fallback only; browser storage is not hardware-backed.
        await AsyncStorage.setItem(`${DEVICE_KEY_NAME}-web`, toBase64(key));
      } else {
        await SecureStore.setItemAsync(DEVICE_KEY_NAME, toBase64(key));
      }
      return key;
    })().catch((error) => {
      deviceKeyPromise = null;
      throw error;
    });
  }
  return deviceKeyPromise;
}

export async function readEncryptedJson<T>(storageKey: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return null;
  const key = await getDeviceKey(false);
  return decryptJsonWithKey<T>(raw, key);
}

export async function writeEncryptedJson(storageKey: string, value: unknown) {
  const key = await getDeviceKey(true);
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  const encrypted = encryptJsonWithKey(value, key, nonce);
  await AsyncStorage.setItem(storageKey, encrypted);
}

export async function encryptForDevice(value: unknown) {
  const key = await getDeviceKey(true);
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  return encryptJsonWithKey(value, key, nonce);
}

export async function decryptForDevice<T>(raw: string): Promise<T> {
  const key = await getDeviceKey(false);
  return decryptJsonWithKey<T>(raw, key);
}
