import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Token opaco aleatorio (256 bits) en base64url. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString("base64url");

/** Hash SHA-256 en hex: se usa para guardar tokens opacos sin poder reconstruirlos. */
export const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export const hmac = (key: string, value: string): string => createHmac("sha256", key).update(value).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Cifrado autenticado AES-256-GCM. Formato: "v1:" + base64(iv[12] | tag[16] | ciphertext). */
export class FieldCipher {
  private readonly key: Buffer;
  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, "base64");
    if (this.key.length !== 32) throw new Error("La clave de cifrado debe tener 32 bytes");
  }
  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return `v1:${Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64")}`;
  }
  decrypt(payload: string): string {
    if (!payload.startsWith("v1:")) throw new Error("Formato de cifrado desconocido");
    const buf = Buffer.from(payload.slice(3), "base64");
    const decipher = createDecipheriv("aes-256-gcm", this.key, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
  }
  encryptJson(value: unknown): string {
    return this.encrypt(JSON.stringify(value));
  }
  decryptJson<T>(payload: string): T {
    return JSON.parse(this.decrypt(payload)) as T;
  }
}
