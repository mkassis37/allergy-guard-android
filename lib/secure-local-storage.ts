import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import nacl from "tweetnacl";
import { Platform } from "react-native";

const DEVICE_KEY_NAME = "allergy-guard-local-encryption-key-v1";
const ENVELOPE_MARKER = "allergy-guard-local-encrypted-v1";
const NONCE_BYTES = 24;
const KEY_BYTES = 32;

type LocalEnvelope = {
  app: typeof ENVELOPE_MARKER;
  version: 1;
  nonce: string;
  ciphertext: string;
};

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

export function encryptJsonWithKey(\n  value: unknown,\n  key: Uint8Array,\n  nonce = Crypto.getRandomBytes(NONCE_BYTES),\n) {
  if (key.length !== KEY_BYTES) throw new Error("Invalid local encryption key.");
  const nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = nacl.secretbox(plaintext, nonce, key);
  const envelope: LocalEnvelope = {
    app: ENVELOPE_MARKER,
    version: 1,
    nonce: toBase64(nonce),
    ciphertext: toBase64(ciphertext),
  };
  return JSON.stringify(envelope);
}

export function decryptJsonWithKey<T>(raw: string, key: Uint8Array): T {
  if (key.length !== KEY_BYTES) throw new Error("Invalid local encryption key.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("تعذر قراءة البيانات المحلية المشفرة.");
  }
  const envelope = parsed as Partial<LocalEnvelope> | null;
  if (
    !envelope ||
    envelope.app !== ENVELOPE_MARKER ||
    envelope.version !== 1 ||
    typeof envelope.nonce !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("صيغة البيانات المحلية المشفرة غير مدعومة.");
  }
  try {
    const nonce = fromBase64(envelope.nonce);
    const ciphertext = fromBase64(envelope.ciphertext);
    if (nonce.length !== NONCE_BYTES) throw new Error("Invalid nonce.");
    const plaintext = nacl.secretbox.open(ciphertext, nonce, key);
    if (!plaintext) throw new Error("Authentication failed.");
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new Error("تعذر فك تشفير البيانات المحلية. لم يتم استبدال بياناتك.");
  }
}

async function getDeviceKey(createIfMissing: boolean) {
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
    // Web fallback is compatibility-only; browser storage is not hardware-backed.
    await AsyncStorage.setItem(`${DEVICE_KEY_NAME}-web`, toBase64(key));
  } else {
    await SecureStore.setItemAsync(DEVICE_KEY_NAME, toBase64(key));
  }
  return key;
}

export async function readEncryptedJson<T>(storageKey: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return null;
  const key = await getDeviceKey(false);
  return decryptJsonWithKey<T>(raw, key);
}

export async function writeEncryptedJson(storageKey: string, value: unknown) {
  const key = await getDeviceKey(true);
  const encrypted = encryptJsonWithKey(value, key);
  await AsyncStorage.setItem(storageKey, encrypted);
}
