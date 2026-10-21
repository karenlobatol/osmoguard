import { SignJWT, jwtVerify } from "jose";

const ISSUER = "osmoguard";
const AUDIENCE = "osmoguard-api";

export interface AccessClaims {
  sub: string;
  role: "USER" | "ADMIN";
  /** Familia de sesión: permite trazar el token hasta su refresh token. */
  fam: string;
}

export function createAccessTokens(secret: string, ttlSeconds: number) {
  const key = new TextEncoder().encode(secret);
  return {
    ttlSeconds,
    async sign(claims: AccessClaims): Promise<string> {
      return new SignJWT({ role: claims.role, fam: claims.fam })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(claims.sub)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${ttlSeconds}s`)
        .sign(key);
    },
    async verify(token: string): Promise<AccessClaims> {
      const { payload } = await jwtVerify(token, key, { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
      if (typeof payload.sub !== "string" || typeof payload.fam !== "string") throw new Error("claims inválidos");
      return { sub: payload.sub, role: payload.role === "ADMIN" ? "ADMIN" : "USER", fam: payload.fam };
    },
  };
}

export type AccessTokens = ReturnType<typeof createAccessTokens>;
