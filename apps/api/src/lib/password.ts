import argon2 from "argon2";

// Parámetros OWASP para Argon2id (m=19 MiB, t=2, p=1).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string): Promise<string> => argon2.hash(password, OPTIONS);

/** Hash fijo para igualar el tiempo de respuesta cuando el usuario no existe. */
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(hash: string | null, password: string): Promise<boolean> {
  if (!hash) {
    dummyHash ??= argon2.hash("osmoguard-timing-equalizer", OPTIONS);
    await argon2.verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
