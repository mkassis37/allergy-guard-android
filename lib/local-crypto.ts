import nacl from "tweetnacl";

const NONCE_BYTES = 24;
const KEY_BYTES = 32;
const ENVELOPE_MARKER = "allergy-guard-local-encrypted-v1";

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

export function encryptJsonWithKey(
  value: unknown,
  key: Uint8Array,
  nonce: Uint8Array,
) {
  if (key.length !== KEY_BYTES) throw new Error("Invalid local encryption key.");
  if (nonce.length !== NONCE_BYTES) throw new Error("Invalid nonce.");
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
