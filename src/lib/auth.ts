import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";

/**
 * Autenticacion: JWT de acceso (corto) + refresh token (largo, httpOnly).
 *
 * Se usa `jose` en vez de `jsonwebtoken` porque `jose` funciona tanto en el
 * runtime de Node.js (rutas API) como en el runtime Edge (middleware.ts),
 * evitando duplicar la logica de verificacion en dos librerias distintas.
 *
 * El access token se guarda en una cookie httpOnly para la web, pero
 * cualquier cliente (incluida la futura app movil) puede tambien enviarlo
 * como header `Authorization: Bearer <token>` — getTokenFromRequest()
 * revisa ambas fuentes.
 */

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // userId
  role: UserRole;
  clubId: number | null;
  email: string;
}

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

function getSecret(name: "access" | "refresh") {
  const raw =
    name === "access"
      ? process.env.JWT_ACCESS_SECRET
      : process.env.JWT_REFRESH_SECRET;
  if (!raw) {
    throw new Error(
      `Falta la variable de entorno JWT_${name.toUpperCase()}_SECRET. Revisa tu archivo .env`
    );
  }
  return new TextEncoder().encode(raw);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: {
  userId: number;
  role: UserRole;
  clubId: number | null;
  email: string;
}): Promise<string> {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
  return new SignJWT({
    role: payload.role,
    clubId: payload.clubId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret("access"));
}

export async function signRefreshToken(payload: {
  userId: number;
  tokenId: number;
}): Promise<string> {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  return new SignJWT({ tokenId: payload.tokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret("refresh"));
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret("access"));
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<{ userId: number; tokenId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret("refresh"));
    return {
      userId: Number(payload.sub),
      tokenId: Number((payload as JWTPayload & { tokenId: number }).tokenId),
    };
  } catch {
    return null;
  }
}

/** Guarda los tokens de sesion en cookies httpOnly (uso desde una Server Action o Route Handler). */
export async function setSessionCookies(
  accessToken: string,
  refreshToken: string
) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 min
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

/** Para Server Components / Server Actions: usuario autenticado o null. */
export async function getCurrentUser(): Promise<AccessTokenPayload & { userId: number } | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return { ...payload, userId: Number(payload.sub) };
}

/** Para Route Handlers: revisa header Authorization y, si no existe, la cookie. */
export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  return req.cookies.get(ACCESS_COOKIE)?.value ?? null;
}

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** Exige un usuario autenticado dentro de un Route Handler; lanza si no lo hay. */
export async function requireUser(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) throw new UnauthorizedError("Token no proporcionado");
  const payload = await verifyAccessToken(token);
  if (!payload) throw new UnauthorizedError("Token invalido o expirado");
  return { ...payload, userId: Number(payload.sub) };
}
